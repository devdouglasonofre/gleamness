import gleam/int
import memory
import types.{type CPU, stack_base}

// Push a byte onto the stack
pub fn push(cpu: CPU, value: Int) -> Result(CPU, Nil) {
  let addr = stack_base + cpu.stack_pointer

  case memory.write(cpu, addr, value) {
    Ok(new_cpu) -> {
      // Decrement stack pointer (with wrap-around)
      let new_sp = int.bitwise_and(cpu.stack_pointer - 1, 0xFF)
      Ok(types.CPU(..new_cpu, stack_pointer: new_sp))
    }
    Error(Nil) -> Error(Nil)
  }
}

// Pull a byte from the stack
pub fn pull(cpu: CPU) -> Result(#(CPU, Int), Nil) {
  // Increment stack pointer first (with wrap-around)
  let new_sp = int.bitwise_and(cpu.stack_pointer + 1, 0xFF)
  let addr = stack_base + new_sp

  case memory.read(cpu, addr) {
    Ok(value) -> Ok(#(types.CPU(..cpu, stack_pointer: new_sp), value))
    Error(Nil) -> Error(Nil)
  }
}

// Push 16-bit value onto the stack (hi byte first, then lo byte)
pub fn push_u16(cpu: CPU, value: Int) -> Result(CPU, Nil) {
  let hi = int.bitwise_shift_right(value, 8)
  let lo = int.bitwise_and(value, 0xFF)

  // Push high byte first
  case push(cpu, hi) {
    Ok(cpu1) -> {
      // Then push low byte
      case push(cpu1, lo) {
        Ok(cpu2) -> Ok(cpu2)
        Error(Nil) -> Error(Nil)
      }
    }
    Error(Nil) -> Error(Nil)
  }
}

// Pull 16-bit value from the stack (lo byte first, then hi byte)
pub fn pull_u16(cpu: CPU) -> Result(#(CPU, Int), Nil) {
  // Pull low byte first
  case pull(cpu) {
    Ok(#(cpu1, lo)) -> {
      // Then pull high byte
      case pull(cpu1) {
        Ok(#(cpu2, hi)) -> {
          let value = int.bitwise_or(int.bitwise_shift_left(hi, 8), lo)
          Ok(#(cpu2, value))
        }
        Error(Nil) -> Error(Nil)
      }
    }
    Error(Nil) -> Error(Nil)
  }
}
