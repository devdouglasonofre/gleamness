import emulation/stack
import emulation/types.{type CPU, flag_unused}
import gleam/int

// Jump
pub fn jmp(cpu: CPU, addr: Int) -> CPU {
  types.CPU(..cpu, program_counter: addr)
}

// Jump to Subroutine
pub fn jsr(cpu: CPU, addr: Int) -> CPU {
  // Return address should point to byte before the next instruction (PC - 1)
  // The 6502 pushes the address of the last byte of the JSR instruction (PC - 1)
  let return_addr = cpu.program_counter - 1

  // Push high byte
  let hi = int.bitwise_shift_right(return_addr, 8)
  case stack.push(cpu, hi) {
    Ok(cpu1) -> {
      // Then push low byte
      let lo = int.bitwise_and(return_addr, 0xFF)
      case stack.push(cpu1, lo) {
        Ok(cpu2) -> {
          // Jump to subroutine
          types.CPU(..cpu2, program_counter: addr)
        }
        Error(Nil) -> cpu
      }
    }
    Error(Nil) -> cpu
  }
}

// Return from Subroutine
pub fn rts(cpu: CPU) -> CPU {
  // Pull program counter from stack (low byte first)
  case stack.pull(cpu) {
    Ok(#(cpu1, lo)) -> {
      // Then pull high byte
      case stack.pull(cpu1) {
        Ok(#(cpu2, hi)) -> {
          let addr = int.bitwise_or(int.bitwise_shift_left(hi, 8), lo)
          // RTS increments PC by 1 after pulling from stack
          // This is because JSR stored PC-1, so we need to add 1 to get back to the next instruction
          types.CPU(..cpu2, program_counter: addr + 1)
        }
        Error(Nil) -> cpu1
      }
    }
    Error(Nil) -> cpu
  }
}

// Return from Interrupt
pub fn rti(cpu: CPU) -> CPU {
  // Pull processor status from stack
  case stack.pull(cpu) {
    Ok(#(cpu1, status)) -> {
      // The unused flag should always be set
      let status_with_unused = int.bitwise_or(status, flag_unused)
      let cpu1 = types.CPU(..cpu1, status: status_with_unused)

      // Pull program counter from stack (low byte first)
      case stack.pull(cpu1) {
        Ok(#(cpu2, lo)) -> {
          case stack.pull(cpu2) {
            Ok(#(cpu3, hi)) -> {
              let addr = int.bitwise_or(int.bitwise_shift_left(hi, 8), lo)
              // Unlike RTS, RTI does not need to add 1 to the address
              types.CPU(..cpu3, program_counter: addr)
            }
            Error(Nil) -> cpu2
          }
        }
        Error(Nil) -> cpu1
      }
    }
    Error(Nil) -> cpu
  }
}
