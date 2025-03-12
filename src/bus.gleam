import gleam/int
import helpers/list_helpers
import types.{type Bus, Bus}

// Memory map constants
pub const ram_start = 0x0000

pub const ram_mirrors_end = 0x1FFF

pub const ppu_registers = 0x2000

pub const ppu_registers_mirrors_end = 0x3FFF

// Initialize a new Bus with zeroed memory
pub fn new() -> Bus {
  Bus(init_memory())
}

// Initialize memory with 0x0 until 0x0800 (2KB RAM)
fn init_memory() -> List(Int) {
  init_memory_with_size(0x0800)
}

// Helper function to create a list of zeros with specified size
fn init_memory_with_size(size: Int) -> List(Int) {
  case size {
    0 -> []
    n -> [0, ..init_memory_with_size(n - 1)]
  }
}

// Read a byte from the bus
pub fn mem_read(bus: Bus, addr: Int) -> Result(Int, Nil) {
  case addr {
    addr if addr >= ram_start && addr <= ram_mirrors_end -> {
      // Mirror down RAM address
      let mirror_down_addr = int.bitwise_and(addr, 0b00000111_11111111)
      list_helpers.get_list_value_by_index(bus.cpu_vram, mirror_down_addr)
    }

    addr if addr >= ppu_registers && addr <= ppu_registers_mirrors_end -> {
      // Mirror down PPU registers
      let _mirror_down_addr = int.bitwise_and(addr, 0b00100000_00000111)
      // PPU not implemented yet
      Ok(0)
    }

    _ -> {
      // Ignore mem access at other addresses
      Ok(0)
    }
  }
}

// Write a byte to the bus
pub fn mem_write(bus: Bus, addr: Int, data: Int) -> Result(Bus, Nil) {
  case addr {
    addr if addr >= ram_start && addr <= ram_mirrors_end -> {
      // Mirror down RAM address
      let mirror_down_addr = int.bitwise_and(addr, 0b00000111_11111111)
      case
        list_helpers.set_list_value_by_index(
          bus.cpu_vram,
          mirror_down_addr,
          data,
        )
      {
        Ok(new_vram) -> Ok(Bus(cpu_vram: new_vram))
        Error(Nil) -> Error(Nil)
      }
    }

    addr if addr >= ppu_registers && addr <= ppu_registers_mirrors_end -> {
      // Mirror down PPU registers
      let _mirror_down_addr = int.bitwise_and(addr, 0b00100000_00000111)
      // PPU not implemented yet
      Ok(bus)
    }

    _ -> {
      // Ignore mem write-access at other addresses
      Ok(bus)
    }
  }
}

// Read a 16-bit value from the bus (little-endian)
pub fn mem_read_u16(bus: Bus, addr: Int) -> Result(Int, Nil) {
  case mem_read(bus, addr) {
    Ok(lo) -> {
      case mem_read(bus, addr + 1) {
        Ok(hi) -> Ok(int.bitwise_or(int.bitwise_shift_left(hi, 8), lo))
        Error(Nil) -> Error(Nil)
      }
    }
    Error(Nil) -> Error(Nil)
  }
}

// Write a 16-bit value to the bus (little-endian)
pub fn mem_write_u16(bus: Bus, addr: Int, data: Int) -> Result(Bus, Nil) {
  let lo = int.bitwise_and(data, 0xFF)
  let hi = int.bitwise_shift_right(data, 8)

  case mem_write(bus, addr, lo) {
    Ok(new_bus) -> mem_write(new_bus, addr + 1, hi)
    Error(Nil) -> Error(Nil)
  }
}
