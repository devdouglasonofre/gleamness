import emulation/bus
import emulation/types.{type CPU, CPU}
import iv

// Initialize memory with 0x0 until 0xFFFF (65535 bytes)
pub fn init_memory() -> iv.Array(Int) {
  // Much more efficient initialization using iv.repeat
  iv.repeat(0, 0xFFFF)
}

// Read a byte from memory
pub fn read(cpu: CPU, addr: Int) -> Result(Int, Nil) {
  // Delegate all memory reads to the bus
  bus.mem_read(cpu.bus, addr)
}

// Write a byte to memory
pub fn write(cpu: CPU, addr: Int, data: Int) -> Result(CPU, Nil) {
  // Write through the bus and update CPU state with new bus state
  case bus.mem_write(cpu.bus, addr, data) {
    Ok(new_bus) -> Ok(CPU(..cpu, bus: new_bus))
    Error(Nil) -> Error(Nil)
  }
}

// Read a 16-bit word from memory (little-endian)
pub fn read_u16(cpu: CPU, addr: Int) -> Result(Int, Nil) {
  bus.mem_read_u16(cpu.bus, addr)
}

// Write a 16-bit word to memory (little-endian)
pub fn write_u16(cpu: CPU, addr: Int, data: Int) -> Result(CPU, Nil) {
  case bus.mem_write_u16(cpu.bus, addr, data) {
    Ok(new_bus) -> Ok(CPU(..cpu, bus: new_bus))
    Error(Nil) -> Error(Nil)
  }
}
