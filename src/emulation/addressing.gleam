import emulation/helpers/list_helpers
import emulation/memory
import emulation/types.{
  type AddressingMode, type CPU, Absolute, AbsoluteX, AbsoluteY, Accumulator,
  Immediate, Indirect, IndirectX, IndirectY, NoneAddressing, Relative, ZeroPage,
  ZeroPageX, ZeroPageY,
}
import gleam/int

// Helper to fetch a byte from program memory at PC
fn fetch_byte(cpu: CPU, program: List(Int)) -> #(CPU, Int) {
  case list_helpers.get_list_value_by_index(program, cpu.program_counter) {
    Ok(byte) -> {
      let new_cpu = types.CPU(..cpu, program_counter: cpu.program_counter + 1)
      #(new_cpu, byte)
    }
    Error(Nil) -> #(cpu, 0)
  }
}

// Helper to fetch a 16-bit word from program memory at PC (little-endian)
fn fetch_word(cpu: CPU, program: List(Int)) -> #(CPU, Int) {
  case fetch_byte(cpu, program) {
    #(cpu_after_lo, lo) -> {
      case fetch_byte(cpu_after_lo, program) {
        #(cpu_after_hi, hi) -> {
          let word = int.bitwise_or(int.bitwise_shift_left(hi, 8), lo)
          #(cpu_after_hi, word)
        }
      }
    }
  }
}

// Get the operand address based on the addressing mode
pub fn get_operand_address(
  cpu: CPU,
  program: List(Int),
  mode: AddressingMode,
) -> #(CPU, Int) {
  case mode {
    Immediate -> {
      let addr = cpu.program_counter
      let new_cpu = types.CPU(..cpu, program_counter: cpu.program_counter + 1)
      #(new_cpu, addr)
    }

    ZeroPage -> {
      case fetch_byte(cpu, program) {
        #(new_cpu, addr) -> #(new_cpu, addr)
      }
    }

    ZeroPageX -> {
      case fetch_byte(cpu, program) {
        #(new_cpu, addr) -> {
          let wrapped_addr = int.bitwise_and(addr + cpu.register_x, 0xFF)
          #(new_cpu, wrapped_addr)
        }
      }
    }

    ZeroPageY -> {
      case fetch_byte(cpu, program) {
        #(new_cpu, addr) -> {
          let wrapped_addr = int.bitwise_and(addr + cpu.register_y, 0xFF)
          #(new_cpu, wrapped_addr)
        }
      }
    }

    Absolute -> {
      case fetch_word(cpu, program) {
        #(new_cpu, addr) -> #(new_cpu, addr)
      }
    }

    AbsoluteX -> {
      case fetch_word(cpu, program) {
        #(new_cpu, addr) -> #(new_cpu, addr + cpu.register_x)
      }
    }

    AbsoluteY -> {
      case fetch_word(cpu, program) {
        #(new_cpu, addr) -> #(new_cpu, addr + cpu.register_y)
      }
    }

    Indirect -> {
      case fetch_word(cpu, program) {
        #(new_cpu, addr) -> {
          // 6502 bug: indirect JMP doesn't correctly fetch across page boundary
          let lo_byte_addr = addr
          let hi_byte_addr = case int.bitwise_and(addr, 0xFF) == 0xFF {
            True -> addr - 0xFF
            // Same page wrap-around
            False -> addr + 1
          }

          case memory.read(new_cpu, lo_byte_addr) {
            Ok(lo) -> {
              case memory.read(new_cpu, hi_byte_addr) {
                Ok(hi) -> {
                  let final_addr =
                    int.bitwise_or(int.bitwise_shift_left(hi, 8), lo)
                  #(new_cpu, final_addr)
                }
                Error(Nil) -> #(new_cpu, 0)
              }
            }
            Error(Nil) -> #(new_cpu, 0)
          }
        }
      }
    }

    IndirectX -> {
      case fetch_byte(cpu, program) {
        #(new_cpu, addr) -> {
          let wrapped_addr = int.bitwise_and(addr + cpu.register_x, 0xFF)

          case memory.read(new_cpu, wrapped_addr) {
            Ok(lo) -> {
              case
                memory.read(new_cpu, int.bitwise_and(wrapped_addr + 1, 0xFF))
              {
                Ok(hi) -> {
                  let final_addr =
                    int.bitwise_or(int.bitwise_shift_left(hi, 8), lo)
                  #(new_cpu, final_addr)
                }
                Error(Nil) -> #(new_cpu, 0)
              }
            }
            Error(Nil) -> #(new_cpu, 0)
          }
        }
      }
    }

    IndirectY -> {
      case fetch_byte(cpu, program) {
        #(new_cpu, addr) -> {
          case memory.read(new_cpu, addr) {
            Ok(lo) -> {
              case memory.read(new_cpu, int.bitwise_and(addr + 1, 0xFF)) {
                Ok(hi) -> {
                  let base_addr =
                    int.bitwise_or(int.bitwise_shift_left(hi, 8), lo)
                  let final_addr = base_addr + cpu.register_y
                  #(new_cpu, final_addr)
                }
                Error(Nil) -> #(new_cpu, 0)
              }
            }
            Error(Nil) -> #(new_cpu, 0)
          }
        }
      }
    }

    Relative -> {
      case fetch_byte(cpu, program) {
        #(new_cpu, offset) -> {
          let signed_offset = case offset > 127 {
            True -> offset - 256
            // Convert to negative
            False -> offset
          }
          let target_addr = new_cpu.program_counter + signed_offset
          #(new_cpu, target_addr)
        }
      }
    }

    Accumulator -> #(cpu, 0)
    NoneAddressing -> #(cpu, 0)
  }
}

// Get operand value based on addressing mode and address
pub fn get_operand_value(
  cpu: CPU,
  program: List(Int),
  mode: AddressingMode,
  operand_addr: Int,
) -> Int {
  case mode {
    Immediate -> {
      case list_helpers.get_list_value_by_index(program, operand_addr) {
        Ok(value) -> value
        Error(Nil) -> 0
      }
    }

    Accumulator -> cpu.register_a

    NoneAddressing -> 0

    _ -> {
      // For memory addressing modes, read from memory
      case memory.read(cpu, operand_addr) {
        Ok(value) -> value
        Error(Nil) -> 0
      }
    }
  }
}
