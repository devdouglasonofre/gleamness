import emulation/bus
import emulation/types.{type CPU}
import gleam/int
import gleam/io
import gleam/result
import iv

// Initialize memory with 0x0 until 0xFFFF (65535 bytes)
pub fn init_memory() -> iv.Array(Int) {
  // Much more efficient initialization using iv.repeat
  iv.repeat(0, 0xFFFF)
}

// Read a byte from memory
pub fn read(cpu: CPU, address: Int) -> Result(Int, Nil) {
  // Prefer using bus for memory operations when possible
  case address < 0x2000 {
    True -> bus.mem_read(cpu.bus, address)
    // Use iv.get for direct memory access
    False ->
      iv.get(cpu.memory, address)
      |> result.replace_error(Nil)
  }
}

// Write a byte to memory
pub fn write(cpu: CPU, address: Int, data: Int) -> Result(CPU, Nil) {
  // Prefer using bus for memory operations when possible
  case address < 0x2000 {
    True -> {
      case bus.mem_write(cpu.bus, address, data) {
        Ok(new_bus) -> Ok(types.CPU(..cpu, bus: new_bus))
        Error(Nil) -> Error(Nil)
      }
    }
    // Use iv.set for direct memory access
    False -> {
      let new_memory = iv.try_set(cpu.memory, address, data)
      Ok(types.CPU(..cpu, memory: new_memory))
    }
  }
}

// Read a 16-bit value from memory (little-endian format)
pub fn read_u16(cpu: CPU, address: Int) -> Result(Int, Nil) {
  // Prefer using bus for memory operations when possible
  case address < 0x2000 {
    True -> bus.mem_read_u16(cpu.bus, address)
    False -> {
      // Fall back to old implementation
      case read(cpu, address) {
        Ok(lo) -> {
          case read(cpu, address + 1) {
            Ok(hi) -> Ok(int.bitwise_or(int.bitwise_shift_left(hi, 8), lo))
            Error(Nil) -> Error(Nil)
          }
        }
        Error(Nil) -> Error(Nil)
      }
    }
  }
}

// Write a 16-bit value to memory (little-endian format)
pub fn write_u16(cpu: CPU, address: Int, data: Int) -> Result(CPU, Nil) {
  // Prefer using bus for memory operations when possible
  case address < 0x2000 {
    True -> {
      case bus.mem_write_u16(cpu.bus, address, data) {
        Ok(new_bus) -> Ok(types.CPU(..cpu, bus: new_bus))
        Error(Nil) -> Error(Nil)
      }
    }
    False -> {
      // Fall back to old implementation
      let lo = int.bitwise_and(data, 0xFF)
      let hi = int.bitwise_shift_right(data, 8)

      case write(cpu, address, lo) {
        Ok(new_cpu) -> write(new_cpu, address + 1, hi)
        Error(Nil) -> Error(Nil)
      }
    }
  }
}
