import emulation/flags
import emulation/memory
import emulation/stack
import emulation/types.{
  type CPU, flag_carry, flag_decimal_mode, flag_interrupt_disable, flag_overflow,
}
import gleam/int

// Clear Carry Flag
pub fn clc(cpu: CPU) -> CPU {
  flags.clear_flag(cpu, flag_carry)
}

// Set Carry Flag
pub fn sec(cpu: CPU) -> CPU {
  flags.set_flag(cpu, flag_carry)
}

// Clear Decimal Mode
pub fn cld(cpu: CPU) -> CPU {
  flags.clear_flag(cpu, flag_decimal_mode)
}

// Set Decimal Mode
pub fn sed(cpu: CPU) -> CPU {
  flags.set_flag(cpu, flag_decimal_mode)
}

// Clear Interrupt Disable
pub fn cli(cpu: CPU) -> CPU {
  flags.clear_flag(cpu, flag_interrupt_disable)
}

// Set Interrupt Disable
pub fn sei(cpu: CPU) -> CPU {
  flags.set_flag(cpu, flag_interrupt_disable)
}

// Clear Overflow Flag
pub fn clv(cpu: CPU) -> CPU {
  flags.clear_flag(cpu, flag_overflow)
}

// No Operation
pub fn nop(cpu: CPU) -> CPU {
  // Does nothing but consume a cycle
  cpu
}

// Break Instruction 
pub fn brk(cpu: CPU) -> CPU {
  // Push program counter + 2 (PC points after BRK opcode)
  let return_addr = cpu.program_counter + 1
  let hi = int.bitwise_shift_right(return_addr, 8)
  let lo = int.bitwise_and(return_addr, 0xFF)

  case stack.push(cpu, hi) {
    Ok(cpu1) -> {
      case stack.push(cpu1, lo) {
        Ok(cpu2) -> {
          // Push status with B flag set
          let status_with_b = int.bitwise_or(cpu2.status, 0x10)
          case stack.push(cpu2, status_with_b) {
            Ok(cpu3) -> {
              // Set interrupt disable flag
              let cpu4 = flags.set_flag(cpu3, flag_interrupt_disable)
              // Load interrupt vector from $FFFE-$FFFF
              case memory.read_u16(cpu4, 0xFFFE) {
                Ok(vector) -> types.CPU(..cpu4, program_counter: vector)
                Error(Nil) -> cpu4
              }
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
