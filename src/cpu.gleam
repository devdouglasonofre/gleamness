import bus
import gleam/int
import gleam/list
import gleam/option.{None, Some}
import helpers/instruction_helpers
import helpers/list_helpers
import types.{
  type AddressingMode, type CPU, type CpuInstruction, Absolute, AbsoluteX,
  AbsoluteY, Accumulator, CPU, CpuInstruction, Immediate, Indirect, IndirectX,
  IndirectY, NoneAddressing, Relative, ZeroPage, ZeroPageX, ZeroPageY,
  flag_carry, flag_negative, flag_overflow, flag_unused, flag_zero, stack_base,
  stack_reset,
}

// ---------------

// Initialize memory with 0x0 until 0xFFFF (65535 bytes)
fn init_memory() -> List(Int) {
  init_memory_with_size(0xFFFF)
}

// Helper function to create a list of zeros with specified size
fn init_memory_with_size(size: Int) -> List(Int) {
  case size {
    0 -> []
    n -> [0, ..init_memory_with_size(n - 1)]
  }
}

pub fn get_new_cpu() {
  // Initialize CPU with all registers at 0, except:
  // - status has the unused flag set
  // - stack pointer is at the top of the stack (0xFF)
  // - initialize the bus
  CPU(
    register_a: 0,
    register_x: 0,
    register_y: 0,
    status: flag_unused,
    program_counter: 0,
    stack_pointer: stack_reset,
    memory: init_memory(),
    bus: bus.new(),
  )
}

// Load a program and run it
pub fn load_and_run(cpu: CPU, program: List(Int)) -> Result(CPU, Nil) {
  case load(cpu, program) {
    Ok(new_cpu) -> {
      case reset(new_cpu) {
        Ok(reset_cpu) -> Ok(run(reset_cpu, reset_cpu.memory))
        Error(Nil) -> Error(Nil)
      }
    }
    Error(Nil) -> Error(Nil)
  }
}

// Reset the CPU to initial state and set program counter to the address stored at 0xFFFC
pub fn reset(cpu: CPU) -> Result(CPU, Nil) {
  // Reset registers but keep memory intact
  // Set unused flag to 1, initialize stack pointer
  let cpu =
    CPU(
      ..cpu,
      register_a: 0,
      register_x: 0,
      register_y: 0,
      status: flag_unused,
      stack_pointer: stack_reset,
    )

  case memory_read_u16(cpu, 0xFFFC) {
    Ok(pc_address) -> Ok(CPU(..cpu, program_counter: pc_address))
    Error(Nil) -> Error(Nil)
  }
}

pub fn run(cpu: CPU, program: List(Int)) -> CPU {
  interpret_loop(cpu, program)
}

fn interpret_loop(cpu: CPU, program: List(Int)) -> CPU {
  case list_helpers.get_list_value_by_index(program, cpu.program_counter) {
    Error(Nil) -> cpu
    Ok(opcode) -> {
      // Get instruction metadata
      let instruction = find_instruction(opcode)

      // Advance program counter
      let cpu = CPU(..cpu, program_counter: cpu.program_counter + 1)

      // Handle opcode based on instruction metadata
      let cpu = case instruction {
        // BRK instruction - just return the current CPU state
        Some(instr) if instr.opcode == 0x00 -> cpu

        // Handle instruction with proper addressing mode
        Some(instr) -> {
          let #(cpu, operand_addr) =
            get_operand_address(cpu, program, instr.addressing_mode)
          execute_instruction(cpu, program, instr, operand_addr)
        }

        // Unknown opcode
        None -> cpu
      }

      interpret_loop(cpu, program)
    }
  }
}

// Find the instruction metadata for a given opcode
fn find_instruction(opcode: Int) {
  let instructions = instruction_helpers.get_all_instructions()
  find_matching_instruction(instructions, opcode)
}

// Helper to find the matching instruction from a list
fn find_matching_instruction(instructions: List(CpuInstruction), opcode: Int) {
  case instructions {
    [] -> None
    [instr, ..rest] ->
      case instr.opcode == opcode {
        True -> Some(instr)
        False -> find_matching_instruction(rest, opcode)
      }
  }
}

// Get the operand address based on the addressing mode
fn get_operand_address(
  cpu: CPU,
  program: List(Int),
  mode: AddressingMode,
) -> #(CPU, Int) {
  case mode {
    Immediate -> {
      let addr = cpu.program_counter
      let new_cpu = CPU(..cpu, program_counter: cpu.program_counter + 1)
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
          // Apply zero-page wrap-around (keep in 0x00-0xFF range)
          let wrapped_addr = int.bitwise_and(addr + cpu.register_x, 0xFF)
          #(new_cpu, wrapped_addr)
        }
      }
    }

    ZeroPageY -> {
      case fetch_byte(cpu, program) {
        #(new_cpu, addr) -> {
          // Apply zero-page wrap-around (keep in 0x00-0xFF range)
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

          case memory_read(new_cpu, lo_byte_addr) {
            Ok(lo) -> {
              case memory_read(new_cpu, hi_byte_addr) {
                Ok(hi) -> {
                  let final_addr =
                    int.bitwise_or(int.bitwise_shift_left(hi, 8), lo)
                  #(new_cpu, final_addr)
                }
                Error(Nil) -> #(new_cpu, 0)
                // Error case
              }
            }
            Error(Nil) -> #(new_cpu, 0)
            // Error case
          }
        }
      }
    }

    IndirectX -> {
      case fetch_byte(cpu, program) {
        #(new_cpu, addr) -> {
          // Add X with wrap-around
          let wrapped_addr = int.bitwise_and(addr + cpu.register_x, 0xFF)

          // Read pointer from zero page (two bytes)
          case memory_read(new_cpu, wrapped_addr) {
            Ok(lo) -> {
              case
                memory_read(new_cpu, int.bitwise_and(wrapped_addr + 1, 0xFF))
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
          // Read pointer from zero page (two bytes)
          case memory_read(new_cpu, addr) {
            Ok(lo) -> {
              case memory_read(new_cpu, int.bitwise_and(addr + 1, 0xFF)) {
                Ok(hi) -> {
                  let base_addr =
                    int.bitwise_or(int.bitwise_shift_left(hi, 8), lo)
                  // Add Y to form final address
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
          // Convert to signed offset
          let signed_offset = case offset > 127 {
            True -> offset - 256
            // Convert to negative
            False -> offset
          }
          // PC is already pointing to the next instruction
          let target_addr = new_cpu.program_counter + signed_offset
          #(new_cpu, target_addr)
        }
      }
    }

    Accumulator -> #(cpu, 0)

    // Special case - operation on accumulator
    NoneAddressing -> #(cpu, 0)
    // No operand needed
  }
}

// Helper to fetch a byte from program memory at PC
fn fetch_byte(cpu: CPU, program: List(Int)) -> #(CPU, Int) {
  case list_helpers.get_list_value_by_index(program, cpu.program_counter) {
    Ok(byte) -> {
      let new_cpu = CPU(..cpu, program_counter: cpu.program_counter + 1)
      #(new_cpu, byte)
    }
    Error(Nil) -> #(cpu, 0)
    // Error case
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

// Execute an instruction with the provided operand address
fn execute_instruction(
  cpu: CPU,
  program: List(Int),
  instruction: CpuInstruction,
  operand_addr: Int,
) -> CPU {
  // Get the operand value based on addressing mode
  let operand_value = case instruction.addressing_mode {
    Immediate -> {
      case list_helpers.get_list_value_by_index(program, operand_addr) {
        Ok(value) -> value
        Error(Nil) -> 0
      }
    }

    Accumulator -> cpu.register_a

    NoneAddressing -> 0

    // No operand needed
    _ -> {
      // For memory addressing modes, read from memory
      case memory_read(cpu, operand_addr) {
        Ok(value) -> value
        Error(Nil) -> 0
      }
    }
  }

  // Execute the appropriate instruction based on mnemonic
  case instruction.mnemonic {
    "LDA" -> lda(cpu, operand_value)
    "LDX" -> ldx(cpu, operand_value)
    "LDY" -> ldy(cpu, operand_value)
    "STA" -> sta(cpu, operand_addr)
    "STX" -> stx(cpu, operand_addr)
    "STY" -> sty(cpu, operand_addr)
    "TAX" -> tax(cpu)
    "TAY" -> tay(cpu)
    "TXA" -> txa(cpu)
    "TYA" -> tya(cpu)
    "TSX" -> tsx(cpu)
    "TXS" -> txs(cpu)
    "INX" -> inx(cpu)
    "INY" -> iny(cpu)
    "DEX" -> dex(cpu)
    "DEY" -> dey(cpu)
    "INC" -> inc(cpu, operand_addr)
    "DEC" -> dec(cpu, operand_addr)
    "ADC" -> adc(cpu, operand_value)
    "SBC" -> sbc(cpu, operand_value)
    "AND" -> and(cpu, operand_value)
    "EOR" -> eor(cpu, operand_value)
    "ORA" -> ora(cpu, operand_value)
    "CMP" -> cmp(cpu, operand_value)
    "CPX" -> cpx(cpu, operand_value)
    "CPY" -> cpy(cpu, operand_value)
    "BIT" -> bit(cpu, operand_value)
    "ASL" -> asl(cpu, operand_addr, operand_value, instruction.addressing_mode)
    "LSR" -> lsr(cpu, operand_addr, operand_value, instruction.addressing_mode)
    "ROL" -> rol(cpu, operand_addr, operand_value, instruction.addressing_mode)
    "ROR" -> ror(cpu, operand_addr, operand_value, instruction.addressing_mode)
    "JMP" -> jmp(cpu, operand_addr)
    "JSR" -> jsr(cpu, operand_addr)
    "RTS" -> rts(cpu)
    "RTI" -> rti(cpu)
    "BEQ" -> beq(cpu, operand_addr)
    "BNE" -> bne(cpu, operand_addr)
    "BCS" -> bcs(cpu, operand_addr)
    "BCC" -> bcc(cpu, operand_addr)
    "BMI" -> bmi(cpu, operand_addr)
    "BPL" -> bpl(cpu, operand_addr)
    "BVS" -> bvs(cpu, operand_addr)
    "BVC" -> bvc(cpu, operand_addr)
    "CLC" -> clc(cpu)
    "SEC" -> sec(cpu)
    "CLD" -> cld(cpu)
    "SED" -> sed(cpu)
    "CLI" -> cli(cpu)
    "SEI" -> sei(cpu)
    "CLV" -> clv(cpu)
    "PHA" -> pha(cpu)
    "PLA" -> pla(cpu)
    "PHP" -> php(cpu)
    "PLP" -> plp(cpu)
    "NOP" -> nop(cpu)
    "BRK" -> cpu
    _ -> cpu
  }
}

// Load Accumulator with a value
fn lda(cpu: CPU, value: Int) -> CPU {
  let cpu = CPU(..cpu, register_a: value)
  update_flags(cpu, value, [flag_zero, flag_negative])
}

// Load X Register with a value
fn ldx(cpu: CPU, value: Int) -> CPU {
  let cpu = CPU(..cpu, register_x: value)
  update_flags(cpu, value, [flag_zero, flag_negative])
}

// Load Y Register with a value
fn ldy(cpu: CPU, value: Int) -> CPU {
  let cpu = CPU(..cpu, register_y: value)
  update_flags(cpu, value, [flag_zero, flag_negative])
}

// Store Accumulator to memory
fn sta(cpu: CPU, addr: Int) -> CPU {
  case memory_write(cpu, addr, cpu.register_a) {
    Ok(new_cpu) -> new_cpu
    Error(Nil) -> cpu
  }
}

// Store X register to memory
fn stx(cpu: CPU, addr: Int) -> CPU {
  case memory_write(cpu, addr, cpu.register_x) {
    Ok(new_cpu) -> new_cpu
    Error(Nil) -> cpu
  }
}

// Store Y register to memory
fn sty(cpu: CPU, addr: Int) -> CPU {
  case memory_write(cpu, addr, cpu.register_y) {
    Ok(new_cpu) -> new_cpu
    Error(Nil) -> cpu
  }
}

// Increment X register
fn inx(cpu: CPU) -> CPU {
  let value = int.bitwise_and(cpu.register_x + 1, 0xFF)
  // Keep in 8-bit range
  let cpu = CPU(..cpu, register_x: value)
  update_flags(cpu, value, [flag_zero, flag_negative])
}

// Increment Y register
fn iny(cpu: CPU) -> CPU {
  let value = int.bitwise_and(cpu.register_y + 1, 0xFF)
  let cpu = CPU(..cpu, register_y: value)
  update_flags(cpu, value, [flag_zero, flag_negative])
}

// Decrement X register
fn dex(cpu: CPU) -> CPU {
  let value = int.bitwise_and(cpu.register_x - 1, 0xFF)
  let cpu = CPU(..cpu, register_x: value)
  update_flags(cpu, value, [flag_zero, flag_negative])
}

// Decrement Y register
fn dey(cpu: CPU) -> CPU {
  let value = int.bitwise_and(cpu.register_y - 1, 0xFF)
  let cpu = CPU(..cpu, register_y: value)
  update_flags(cpu, value, [flag_zero, flag_negative])
}

// Increment memory location
fn inc(cpu: CPU, addr: Int) -> CPU {
  case memory_read(cpu, addr) {
    Ok(value) -> {
      let new_value = int.bitwise_and(value + 1, 0xFF)
      case memory_write(cpu, addr, new_value) {
        Ok(new_cpu) ->
          update_flags(new_cpu, new_value, [flag_zero, flag_negative])
        Error(Nil) -> cpu
      }
    }
    Error(Nil) -> cpu
  }
}

// Decrement memory location
fn dec(cpu: CPU, addr: Int) -> CPU {
  case memory_read(cpu, addr) {
    Ok(value) -> {
      let new_value = int.bitwise_and(value - 1, 0xFF)
      case memory_write(cpu, addr, new_value) {
        Ok(new_cpu) ->
          update_flags(new_cpu, new_value, [flag_zero, flag_negative])
        Error(Nil) -> cpu
      }
    }
    Error(Nil) -> cpu
  }
}

// Transfer Accumulator to X
fn tax(cpu: CPU) -> CPU {
  let cpu = CPU(..cpu, register_x: cpu.register_a)
  update_flags(cpu, cpu.register_x, [flag_zero, flag_negative])
}

// Transfer Accumulator to Y
fn tay(cpu: CPU) -> CPU {
  let cpu = CPU(..cpu, register_y: cpu.register_a)
  update_flags(cpu, cpu.register_y, [flag_zero, flag_negative])
}

// Transfer X to Accumulator
fn txa(cpu: CPU) -> CPU {
  let cpu = CPU(..cpu, register_a: cpu.register_x)
  update_flags(cpu, cpu.register_a, [flag_zero, flag_negative])
}

// Transfer Y to Accumulator
fn tya(cpu: CPU) -> CPU {
  let cpu = CPU(..cpu, register_a: cpu.register_y)
  update_flags(cpu, cpu.register_a, [flag_zero, flag_negative])
}

// Transfer Stack Pointer to X
fn tsx(cpu: CPU) -> CPU {
  let cpu = CPU(..cpu, register_x: cpu.stack_pointer)
  update_flags(cpu, cpu.register_x, [flag_zero, flag_negative])
}

// Transfer X to Stack Pointer
fn txs(cpu: CPU) -> CPU {
  CPU(..cpu, stack_pointer: cpu.register_x)
}

// Add with Carry
fn adc(cpu: CPU, value: Int) -> CPU {
  let carry = case int.bitwise_and(cpu.status, flag_carry) != 0 {
    True -> 1
    False -> 0
  }

  let sum = cpu.register_a + value + carry
  let result = int.bitwise_and(sum, 0xFF)

  // Check if carry occurred (result > 255)
  let carry_flag = case sum > 0xFF {
    True -> flag_carry
    False -> 0
  }

  // Check for overflow
  // Overflow occurs when both inputs have the same sign, but the result has a different sign
  // We can detect this by checking if (A ^ result) & (M ^ result) & 0x80 is set
  // where ^ is XOR
  let a_sign = int.bitwise_and(cpu.register_a, 0x80)
  let m_sign = int.bitwise_and(value, 0x80)
  let r_sign = int.bitwise_and(result, 0x80)

  let overflow_flag = case a_sign == m_sign && a_sign != r_sign {
    True -> flag_overflow
    False -> 0
  }

  // Update flags and accumulator
  let cpu = CPU(..cpu, register_a: result)

  // Update carry, zero, negative, and overflow flags
  let combined_flags = int.bitwise_or(flag_carry, flag_overflow)
  let status =
    int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, combined_flags))
  let combined_new_flags = int.bitwise_or(carry_flag, overflow_flag)
  let status = int.bitwise_or(status, combined_new_flags)
  let cpu = CPU(..cpu, status: status)

  update_flags(cpu, result, [flag_zero, flag_negative])
}

// Subtract with Carry
fn sbc(cpu: CPU, value: Int) -> CPU {
  // SBC is implemented as ADC with the operand inverted
  // A - B - (1-C) = A + ~B + C
  let inverted_value = int.bitwise_exclusive_or(value, 0xFF)
  adc(cpu, inverted_value)
}

// Logical AND
fn and(cpu: CPU, value: Int) -> CPU {
  let result = int.bitwise_and(cpu.register_a, value)
  let cpu = CPU(..cpu, register_a: result)
  update_flags(cpu, result, [flag_zero, flag_negative])
}

// Logical Exclusive OR
fn eor(cpu: CPU, value: Int) -> CPU {
  let result = int.bitwise_exclusive_or(cpu.register_a, value)
  let cpu = CPU(..cpu, register_a: result)
  update_flags(cpu, result, [flag_zero, flag_negative])
}

// Logical Inclusive OR
fn ora(cpu: CPU, value: Int) -> CPU {
  let result = int.bitwise_or(cpu.register_a, value)
  let cpu = CPU(..cpu, register_a: result)
  update_flags(cpu, result, [flag_zero, flag_negative])
}

// Compare Accumulator
fn cmp(cpu: CPU, value: Int) -> CPU {
  let result = int.bitwise_and(cpu.register_a - value, 0xFF)
  let carry = case cpu.register_a >= value {
    True -> flag_carry
    False -> 0
  }

  let status = case carry {
    0 -> int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, flag_carry))
    _ -> int.bitwise_or(cpu.status, carry)
  }

  let cpu = CPU(..cpu, status: status)
  update_flags(cpu, result, [flag_zero, flag_negative])
}

// Compare X Register
fn cpx(cpu: CPU, value: Int) -> CPU {
  let result = int.bitwise_and(cpu.register_x - value, 0xFF)
  let carry = case cpu.register_x >= value {
    True -> flag_carry
    False -> 0
  }

  let status = case carry {
    0 -> int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, flag_carry))
    _ -> int.bitwise_or(cpu.status, carry)
  }

  let cpu = CPU(..cpu, status: status)
  update_flags(cpu, result, [flag_zero, flag_negative])
}

// Compare Y Register
fn cpy(cpu: CPU, value: Int) -> CPU {
  let result = int.bitwise_and(cpu.register_y - value, 0xFF)
  let carry = case cpu.register_y >= value {
    True -> flag_carry
    False -> 0
  }

  let status = case carry {
    0 -> int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, flag_carry))
    _ -> int.bitwise_or(cpu.status, carry)
  }

  let cpu = CPU(..cpu, status: status)
  update_flags(cpu, result, [flag_zero, flag_negative])
}

// Bit Test
fn bit(cpu: CPU, value: Int) -> CPU {
  let result = int.bitwise_and(cpu.register_a, value)

  // Zero flag is set based on the AND result
  let zero_flag = case result == 0 {
    True -> flag_zero
    False -> 0
  }

  // Bit 7 and 6 of the value are copied to the negative and overflow flags
  let negative_flag = int.bitwise_and(value, flag_negative)
  let overflow_flag = int.bitwise_and(value, flag_overflow)

  // Clear then set relevant flags
  let combined_flags =
    int.bitwise_or(flag_zero, int.bitwise_or(flag_negative, flag_overflow))
  let status =
    int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, combined_flags))
  let combined_new_flags =
    int.bitwise_or(zero_flag, int.bitwise_or(negative_flag, overflow_flag))
  let status = int.bitwise_or(status, combined_new_flags)

  CPU(..cpu, status: status)
}

// Arithmetic Shift Left
fn asl(cpu: CPU, addr: Int, value: Int, mode: AddressingMode) -> CPU {
  // Extract the most significant bit (bit 7) for carry flag
  let carry = case int.bitwise_and(value, 0x80) != 0 {
    True -> flag_carry
    False -> 0
  }

  // Shift left and mask to 8 bits
  let result = int.bitwise_and(int.bitwise_shift_left(value, 1), 0xFF)

  // Update carry flag
  let status =
    int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, flag_carry))
  let status = int.bitwise_or(status, carry)
  let cpu = CPU(..cpu, status: status)

  // Apply the result based on addressing mode
  let cpu = case mode {
    Accumulator -> CPU(..cpu, register_a: result)
    _ -> {
      case memory_write(cpu, addr, result) {
        Ok(new_cpu) -> new_cpu
        Error(Nil) -> cpu
      }
    }
  }

  update_flags(cpu, result, [flag_zero, flag_negative])
}

// Logical Shift Right
fn lsr(cpu: CPU, addr: Int, value: Int, mode: AddressingMode) -> CPU {
  // Extract the least significant bit (bit 0) for carry flag
  let carry = case int.bitwise_and(value, 0x01) != 0 {
    True -> flag_carry
    False -> 0
  }

  // Shift right
  let result = int.bitwise_shift_right(value, 1)

  // Update carry flag
  let status =
    int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, flag_carry))
  let status = int.bitwise_or(status, carry)
  let cpu = CPU(..cpu, status: status)

  // Apply the result based on addressing mode
  let cpu = case mode {
    Accumulator -> CPU(..cpu, register_a: result)
    _ -> {
      case memory_write(cpu, addr, result) {
        Ok(new_cpu) -> new_cpu
        Error(Nil) -> cpu
      }
    }
  }

  update_flags(cpu, result, [flag_zero, flag_negative])
}

// Rotate Left
fn rol(cpu: CPU, addr: Int, value: Int, mode: AddressingMode) -> CPU {
  // Get current carry flag
  let current_carry = case int.bitwise_and(cpu.status, flag_carry) != 0 {
    True -> 1
    False -> 0
  }

  // Extract bit 7 for new carry flag
  let new_carry = case int.bitwise_and(value, 0x80) != 0 {
    True -> flag_carry
    False -> 0
  }

  // Rotate left (shift left and add carry to bit 0)
  let result =
    int.bitwise_or(
      int.bitwise_and(int.bitwise_shift_left(value, 1), 0xFF),
      current_carry,
    )

  // Update carry flag
  let status =
    int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, flag_carry))
  let status = int.bitwise_or(status, new_carry)
  let cpu = CPU(..cpu, status: status)

  // Apply the result based on addressing mode
  let cpu = case mode {
    Accumulator -> CPU(..cpu, register_a: result)
    _ -> {
      case memory_write(cpu, addr, result) {
        Ok(new_cpu) -> new_cpu
        Error(Nil) -> cpu
      }
    }
  }

  update_flags(cpu, result, [flag_zero, flag_negative])
}

// Rotate Right
fn ror(cpu: CPU, addr: Int, value: Int, mode: AddressingMode) -> CPU {
  // Get current carry flag
  let current_carry = case int.bitwise_and(cpu.status, flag_carry) != 0 {
    True -> 0x80
    False -> 0
  }

  // Extract bit 0 for new carry flag
  let new_carry = case int.bitwise_and(value, 0x01) != 0 {
    True -> flag_carry
    False -> 0
  }

  // Rotate right (shift right and add carry to bit 7)
  let result = int.bitwise_or(int.bitwise_shift_right(value, 1), current_carry)

  // Update carry flag
  let status =
    int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, flag_carry))
  let status = int.bitwise_or(status, new_carry)
  let cpu = CPU(..cpu, status: status)

  // Apply the result based on addressing mode
  let cpu = case mode {
    Accumulator -> CPU(..cpu, register_a: result)
    _ -> {
      case memory_write(cpu, addr, result) {
        Ok(new_cpu) -> new_cpu
        Error(Nil) -> cpu
      }
    }
  }

  update_flags(cpu, result, [flag_zero, flag_negative])
}

// Jump
fn jmp(cpu: CPU, addr: Int) -> CPU {
  CPU(..cpu, program_counter: addr)
}

// Jump to Subroutine
fn jsr(cpu: CPU, addr: Int) -> CPU {
  // Push return address (PC - 1) to stack
  // The PC is already pointing to the next instruction
  let return_addr = cpu.program_counter - 1

  // Push high byte
  let hi = int.bitwise_shift_right(return_addr, 8)
  case stack_push(cpu, hi) {
    Ok(cpu1) -> {
      // Push low byte
      let lo = int.bitwise_and(return_addr, 0xFF)
      case stack_push(cpu1, lo) {
        Ok(cpu2) -> {
          // Jump to subroutine
          CPU(..cpu2, program_counter: addr)
        }
        Error(Nil) -> cpu
      }
    }
    Error(Nil) -> cpu
  }
}

// Return from Subroutine
fn rts(cpu: CPU) -> CPU {
  // Pull low byte from stack
  case stack_pull(cpu) {
    Ok(#(cpu1, lo)) -> {
      // Pull high byte from stack
      case stack_pull(cpu1) {
        Ok(#(cpu2, hi)) -> {
          // Reconstruct address and add 1
          let addr = int.bitwise_or(int.bitwise_shift_left(hi, 8), lo) + 1
          CPU(..cpu2, program_counter: addr)
        }
        Error(Nil) -> cpu1
      }
    }
    Error(Nil) -> cpu
  }
}

// Return from Interrupt
fn rti(cpu: CPU) -> CPU {
  // Pull processor status from stack
  case stack_pull(cpu) {
    Ok(#(cpu1, status)) -> {
      // The break flag should not be affected by the value pulled from stack
      let break_mask = int.bitwise_exclusive_or(0xFF, flag_unused)
      let status_with_break =
        int.bitwise_or(int.bitwise_and(status, break_mask), flag_unused)
      let cpu1 = CPU(..cpu1, status: status_with_break)

      // Pull program counter from stack (low byte first)
      case stack_pull(cpu1) {
        Ok(#(cpu2, lo)) -> {
          case stack_pull(cpu2) {
            Ok(#(cpu3, hi)) -> {
              let addr = int.bitwise_or(int.bitwise_shift_left(hi, 8), lo)
              CPU(..cpu3, program_counter: addr)
            }
            Error(Nil) -> cpu1
          }
        }
        Error(Nil) -> cpu1
      }
    }
    Error(Nil) -> cpu
  }
}

// Branch if Equal (Zero set)
fn beq(cpu: CPU, addr: Int) -> CPU {
  case int.bitwise_and(cpu.status, flag_zero) != 0 {
    True -> CPU(..cpu, program_counter: addr)
    False -> cpu
  }
}

// Branch if Not Equal (Zero clear)
fn bne(cpu: CPU, addr: Int) -> CPU {
  case int.bitwise_and(cpu.status, flag_zero) == 0 {
    True -> CPU(..cpu, program_counter: addr)
    False -> cpu
  }
}

// Branch if Carry Set
fn bcs(cpu: CPU, addr: Int) -> CPU {
  case int.bitwise_and(cpu.status, flag_carry) != 0 {
    True -> CPU(..cpu, program_counter: addr)
    False -> cpu
  }
}

// Branch if Carry Clear
fn bcc(cpu: CPU, addr: Int) -> CPU {
  case int.bitwise_and(cpu.status, flag_carry) == 0 {
    True -> CPU(..cpu, program_counter: addr)
    False -> cpu
  }
}

// Branch if Minus (Negative set)
fn bmi(cpu: CPU, addr: Int) -> CPU {
  case int.bitwise_and(cpu.status, flag_negative) != 0 {
    True -> CPU(..cpu, program_counter: addr)
    False -> cpu
  }
}

// Branch if Positive (Negative clear)
fn bpl(cpu: CPU, addr: Int) -> CPU {
  case int.bitwise_and(cpu.status, flag_negative) == 0 {
    True -> CPU(..cpu, program_counter: addr)
    False -> cpu
  }
}

// Branch if Overflow Set
fn bvs(cpu: CPU, addr: Int) -> CPU {
  case int.bitwise_and(cpu.status, flag_overflow) != 0 {
    True -> CPU(..cpu, program_counter: addr)
    False -> cpu
  }
}

// Branch if Overflow Clear
fn bvc(cpu: CPU, addr: Int) -> CPU {
  case int.bitwise_and(cpu.status, flag_overflow) == 0 {
    True -> CPU(..cpu, program_counter: addr)
    False -> cpu
  }
}

// Clear Carry Flag
fn clc(cpu: CPU) -> CPU {
  let status =
    int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, flag_carry))
  CPU(..cpu, status: status)
}

// Set Carry Flag
fn sec(cpu: CPU) -> CPU {
  let status = int.bitwise_or(cpu.status, flag_carry)
  CPU(..cpu, status: status)
}

// Clear Decimal Mode
fn cld(cpu: CPU) -> CPU {
  // The 6502 in the NES doesn't support decimal mode, but we'll implement this anyway
  let decimal_flag = 8
  // 0b0000_1000
  let status =
    int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, decimal_flag))
  CPU(..cpu, status: status)
}

// Set Decimal Mode
fn sed(cpu: CPU) -> CPU {
  // The 6502 in the NES doesn't support decimal mode, but we'll implement this anyway
  let decimal_flag = 8
  // 0b0000_1000
  let status = int.bitwise_or(cpu.status, decimal_flag)
  CPU(..cpu, status: status)
}

// Clear Interrupt Disable
fn cli(cpu: CPU) -> CPU {
  let interrupt_flag = 4
  // 0b0000_0100
  let status =
    int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, interrupt_flag))
  CPU(..cpu, status: status)
}

// Set Interrupt Disable
fn sei(cpu: CPU) -> CPU {
  let interrupt_flag = 4
  // 0b0000_0100
  let status = int.bitwise_or(cpu.status, interrupt_flag)
  CPU(..cpu, status: status)
}

// Clear Overflow Flag
fn clv(cpu: CPU) -> CPU {
  let status =
    int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, flag_overflow))
  CPU(..cpu, status: status)
}

// Push Accumulator to stack
fn pha(cpu: CPU) -> CPU {
  case stack_push(cpu, cpu.register_a) {
    Ok(new_cpu) -> new_cpu
    Error(Nil) -> cpu
  }
}

// Pull Accumulator from stack
fn pla(cpu: CPU) -> CPU {
  case stack_pull(cpu) {
    Ok(#(cpu1, value)) -> {
      let cpu2 = CPU(..cpu1, register_a: value)
      update_flags(cpu2, value, [flag_zero, flag_negative])
    }
    Error(Nil) -> cpu
  }
}

// Push Processor Status to stack
fn php(cpu: CPU) -> CPU {
  // When pushing status to stack, both B flags are set
  let break_flag = 0x30
  // Both B flags (bit 4 and 5)
  let status_with_break = int.bitwise_or(cpu.status, break_flag)

  case stack_push(cpu, status_with_break) {
    Ok(new_cpu) -> new_cpu
    Error(Nil) -> cpu
  }
}

// Pull Processor Status from stack
fn plp(cpu: CPU) -> CPU {
  case stack_pull(cpu) {
    Ok(#(cpu1, status)) -> {
      // The unused flag should always be set
      let status_with_unused = int.bitwise_or(status, flag_unused)
      // Break command flag should not be affected
      let break_mask = 0x10
      // 0b0001_0000
      let status_with_unused =
        int.bitwise_and(
          status_with_unused,
          int.bitwise_exclusive_or(0xFF, break_mask),
        )
      let status_with_unused =
        int.bitwise_or(
          status_with_unused,
          int.bitwise_and(cpu.status, break_mask),
        )

      CPU(..cpu1, status: status_with_unused)
    }
    Error(Nil) -> cpu
  }
}

// No Operation
fn nop(cpu: CPU) -> CPU {
  // Does nothing but consume a cycle
  cpu
}

// Update CPU flags based on the result of an operation
// The flags_to_update parameter specifies which flags should be updated
fn update_flags(cpu: CPU, result: Int, flags_to_update: List(Int)) -> CPU {
  // Start with the current status
  let status = cpu.status

  // Always set the unused flag
  let status = int.bitwise_or(status, flag_unused)

  // Update specified flags
  let status =
    list.fold(flags_to_update, status, fn(status, flag) {
      case flag {
        // Zero flag - set if result is zero
        f if f == flag_zero -> {
          case result == 0 {
            True -> int.bitwise_or(status, flag_zero)
            False ->
              int.bitwise_and(status, int.bitwise_exclusive_or(0xFF, flag_zero))
          }
        }

        // Negative flag - set if bit 7 is set
        f if f == flag_negative -> {
          case int.bitwise_and(result, 0b1000_0000) != 0 {
            True -> int.bitwise_or(status, flag_negative)
            False ->
              int.bitwise_and(
                status,
                int.bitwise_exclusive_or(0xFF, flag_negative),
              )
          }
        }

        // Carry flag - handled by specific instructions
        f if f == flag_carry -> status

        // Overflow flag - handled by specific instructions
        f if f == flag_overflow -> status

        // Other flags remain unchanged
        _ -> status
      }
    })

  CPU(..cpu, status: status)
}

// Push a byte onto the stack
fn stack_push(cpu: CPU, value: Int) -> Result(CPU, Nil) {
  let addr = stack_base + cpu.stack_pointer

  case memory_write(cpu, addr, value) {
    Ok(new_cpu) -> {
      // Decrement stack pointer (with wrap-around)
      let new_sp = int.bitwise_and(cpu.stack_pointer - 1, 0xFF)
      Ok(CPU(..new_cpu, stack_pointer: new_sp))
    }
    Error(Nil) -> Error(Nil)
  }
}

// Pull a byte from the stack
fn stack_pull(cpu: CPU) -> Result(#(CPU, Int), Nil) {
  // Increment stack pointer first (with wrap-around)
  let new_sp = int.bitwise_and(cpu.stack_pointer + 1, 0xFF)
  let addr = stack_base + new_sp

  case memory_read(cpu, addr) {
    Ok(value) -> Ok(#(CPU(..cpu, stack_pointer: new_sp), value))
    Error(Nil) -> Error(Nil)
  }
}

// Memory access functions that now use the bus

pub fn memory_read(cpu: CPU, address: Int) -> Result(Int, Nil) {
  // Prefer using bus for memory operations when possible
  case address < 0x2000 {
    True -> bus.mem_read(cpu.bus, address)
    // For compatibility with existing code, still support direct memory access
    False -> list_helpers.get_list_value_by_index(cpu.memory, address)
  }
}

pub fn memory_write(cpu: CPU, address: Int, data: Int) -> Result(CPU, Nil) {
  // Prefer using bus for memory operations when possible
  case address < 0x2000 {
    True -> {
      case bus.mem_write(cpu.bus, address, data) {
        Ok(new_bus) -> Ok(CPU(..cpu, bus: new_bus))
        Error(Nil) -> Error(Nil)
      }
    }
    // For compatibility with existing code, still support direct memory access
    False -> {
      case list_helpers.set_list_value_by_index(cpu.memory, address, data) {
        Ok(new_memory) -> Ok(CPU(..cpu, memory: new_memory))
        Error(Nil) -> Error(Nil)
      }
    }
  }
}

// Read a 16-bit value from memory (little-endian format)
pub fn memory_read_u16(cpu: CPU, address: Int) -> Result(Int, Nil) {
  // Prefer using bus for memory operations when possible
  case address < 0x2000 {
    True -> bus.mem_read_u16(cpu.bus, address)
    False -> {
      // Fall back to old implementation
      case memory_read(cpu, address) {
        Ok(lo) -> {
          case memory_read(cpu, address + 1) {
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
pub fn memory_write_u16(cpu: CPU, address: Int, data: Int) -> Result(CPU, Nil) {
  // Prefer using bus for memory operations when possible
  case address < 0x2000 {
    True -> {
      case bus.mem_write_u16(cpu.bus, address, data) {
        Ok(new_bus) -> Ok(CPU(..cpu, bus: new_bus))
        Error(Nil) -> Error(Nil)
      }
    }
    False -> {
      // Fall back to old implementation
      let lo = int.bitwise_and(data, 0xFF)
      let hi = int.bitwise_shift_right(data, 8)

      case memory_write(cpu, address, lo) {
        Ok(new_cpu) -> memory_write(new_cpu, address + 1, hi)
        Error(Nil) -> Error(Nil)
      }
    }
  }
}

// Load a program into memory at the ROM address
pub fn load(cpu: CPU, program: List(Int)) -> Result(CPU, Nil) {
  case load_at_address(cpu, program, 0x8000) {
    Ok(new_cpu) -> memory_write_u16(new_cpu, 0xFFFC, 0x8000)
    Error(Nil) -> Error(Nil)
  }
}

// Load a program into memory at a specified address
fn load_at_address(
  cpu: CPU,
  program: List(Int),
  start_address: Int,
) -> Result(CPU, Nil) {
  // Load the program and set the program counter
  case load_bytes(cpu, program, start_address) {
    Ok(new_cpu) -> Ok(CPU(..new_cpu, program_counter: start_address))
    Error(Nil) -> Error(Nil)
  }
}

// Helper function to load program bytes one by one
fn load_bytes(cpu: CPU, bytes: List(Int), address: Int) -> Result(CPU, Nil) {
  case bytes {
    [] -> Ok(cpu)
    // All bytes loaded successfully
    [first, ..rest] -> {
      case memory_write(cpu, address, first) {
        Ok(new_cpu) -> load_bytes(new_cpu, rest, address + 1)
        Error(Nil) -> Error(Nil)
      }
    }
  }
}
