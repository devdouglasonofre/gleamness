import addressing
import gleam/option.{type Option, None, Some}
import helpers/instruction_helpers
import helpers/list_helpers
import instructions/arithmetic
import instructions/branch
import instructions/flag_ops
import instructions/jump
import instructions/load_store
import instructions/logic
import instructions/stack_ops
import instructions/transfer
import memory
import types.{type CPU, type CpuInstruction, Bus, flag_unused, stack_reset}

// Initialize a new CPU with default state
pub fn get_new_cpu() -> CPU {
  // Initialize CPU with all registers at 0, except:
  // - status has the unused flag set
  // - stack pointer is at the top of the stack (0xFF)
  // - initialize the bus
  types.CPU(
    register_a: 0,
    register_x: 0,
    register_y: 0,
    status: flag_unused,
    program_counter: 0,
    stack_pointer: stack_reset,
    memory: memory.init_memory(),
    bus: Bus(memory.init_memory()),
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
    types.CPU(
      ..cpu,
      register_a: 0,
      register_x: 0,
      register_y: 0,
      status: flag_unused,
      stack_pointer: stack_reset,
    )

  case memory.read_u16(cpu, 0xFFFC) {
    Ok(pc_address) -> Ok(types.CPU(..cpu, program_counter: pc_address))
    Error(Nil) -> Error(Nil)
  }
}

// Load a program into memory at the ROM address
pub fn load(cpu: CPU, program: List(Int)) -> Result(CPU, Nil) {
  load_at_address(cpu, program, 0x8000)
}

// Load a program into memory at a specified address
fn load_at_address(
  cpu: CPU,
  program: List(Int),
  start_address: Int,
) -> Result(CPU, Nil) {
  // Load the program and set the program counter
  case load_bytes(cpu, program, start_address) {
    Ok(new_cpu) -> Ok(types.CPU(..new_cpu, program_counter: start_address))
    Error(Nil) -> Error(Nil)
  }
}

// Helper function to load program bytes one by one
fn load_bytes(cpu: CPU, bytes: List(Int), address: Int) -> Result(CPU, Nil) {
  case bytes {
    [] -> Ok(cpu)
    [first, ..rest] -> {
      case memory.write(cpu, address, first) {
        Ok(new_cpu) -> load_bytes(new_cpu, rest, address + 1)
        Error(Nil) -> Error(Nil)
      }
    }
  }
}

// Run the program
pub fn run(cpu: CPU, program: List(Int)) -> CPU {
  interpret_loop(cpu, program)
}

// Main interpretation loop
fn interpret_loop(cpu: CPU, program: List(Int)) -> CPU {
  case list_helpers.get_list_value_by_index(program, cpu.program_counter) {
    Error(Nil) -> cpu
    Ok(opcode) -> {
      // Get instruction metadata
      let instruction = find_instruction(opcode)

      // Advance program counter
      let cpu = types.CPU(..cpu, program_counter: cpu.program_counter + 1)

      // Handle opcode based on instruction metadata
      let cpu = case instruction {
        // BRK instruction - just return the current CPU state
        Some(instr) if instr.opcode == 0x00 -> cpu

        // Handle instruction with proper addressing mode
        Some(instr) -> {
          let #(cpu, operand_addr) =
            addressing.get_operand_address(cpu, program, instr.addressing_mode)
          let operand_value =
            addressing.get_operand_value(
              cpu,
              program,
              instr.addressing_mode,
              operand_addr,
            )
          execute_instruction(cpu, instr, operand_addr, operand_value)
        }

        // Unknown opcode
        None -> cpu
      }

      interpret_loop(cpu, program)
    }
  }
}

// Find the instruction metadata for a given opcode
fn find_instruction(opcode: Int) -> Option(CpuInstruction) {
  let instructions = instruction_helpers.get_all_instructions()
  find_matching_instruction(instructions, opcode)
}

// Helper to find the matching instruction from a list
fn find_matching_instruction(
  instructions: List(CpuInstruction),
  opcode: Int,
) -> Option(CpuInstruction) {
  case instructions {
    [] -> None
    [instr, ..rest] ->
      case instr.opcode == opcode {
        True -> Some(instr)
        False -> find_matching_instruction(rest, opcode)
      }
  }
}

// Execute an instruction with the provided operand address and value
fn execute_instruction(
  cpu: CPU,
  instruction: CpuInstruction,
  operand_addr: Int,
  operand_value: Int,
) -> CPU {
  case instruction.mnemonic {
    // Load/Store Instructions
    "LDA" -> load_store.lda(cpu, operand_value)
    "LDX" -> load_store.ldx(cpu, operand_value)
    "LDY" -> load_store.ldy(cpu, operand_value)
    "STA" -> load_store.sta(cpu, operand_addr)
    "STX" -> load_store.stx(cpu, operand_addr)
    "STY" -> load_store.sty(cpu, operand_addr)

    // Transfer Instructions
    "TAX" -> transfer.tax(cpu)
    "TAY" -> transfer.tay(cpu)
    "TXA" -> transfer.txa(cpu)
    "TYA" -> transfer.tya(cpu)
    "TSX" -> transfer.tsx(cpu)
    "TXS" -> transfer.txs(cpu)

    // Stack Operations
    "PHA" -> stack_ops.pha(cpu)
    "PLA" -> stack_ops.pla(cpu)
    "PHP" -> stack_ops.php(cpu)
    "PLP" -> stack_ops.plp(cpu)

    // Arithmetic Instructions
    "ADC" -> arithmetic.adc(cpu, operand_value)
    "SBC" -> arithmetic.sbc(cpu, operand_value)
    "INC" -> arithmetic.inc(cpu, operand_addr)
    "INX" -> arithmetic.inx(cpu)
    "INY" -> arithmetic.iny(cpu)
    "DEC" -> arithmetic.dec(cpu, operand_addr)
    "DEX" -> arithmetic.dex(cpu)
    "DEY" -> arithmetic.dey(cpu)

    // Logical Instructions
    "AND" -> logic.and(cpu, operand_value)
    "EOR" -> logic.eor(cpu, operand_value)
    "ORA" -> logic.ora(cpu, operand_value)
    "BIT" -> logic.bit(cpu, operand_value)
    "ASL" ->
      logic.asl(cpu, operand_addr, operand_value, instruction.addressing_mode)
    "LSR" ->
      logic.lsr(cpu, operand_addr, operand_value, instruction.addressing_mode)
    "ROL" ->
      logic.rol(cpu, operand_addr, operand_value, instruction.addressing_mode)
    "ROR" ->
      logic.ror(cpu, operand_addr, operand_value, instruction.addressing_mode)

    // Jump & Branch Instructions
    "JMP" -> jump.jmp(cpu, operand_addr)
    "JSR" -> jump.jsr(cpu, operand_addr)
    "RTS" -> jump.rts(cpu)
    "RTI" -> jump.rti(cpu)

    // Branch Instructions
    "BEQ" -> branch.beq(cpu, operand_addr)
    "BNE" -> branch.bne(cpu, operand_addr)
    "BCS" -> branch.bcs(cpu, operand_addr)
    "BCC" -> branch.bcc(cpu, operand_addr)
    "BMI" -> branch.bmi(cpu, operand_addr)
    "BPL" -> branch.bpl(cpu, operand_addr)
    "BVS" -> branch.bvs(cpu, operand_addr)
    "BVC" -> branch.bvc(cpu, operand_addr)

    // Flag Operations
    "CLC" -> flag_ops.clc(cpu)
    "SEC" -> flag_ops.sec(cpu)
    "CLD" -> flag_ops.cld(cpu)
    "SED" -> flag_ops.sed(cpu)
    "CLI" -> flag_ops.cli(cpu)
    "SEI" -> flag_ops.sei(cpu)
    "CLV" -> flag_ops.clv(cpu)
    "NOP" -> flag_ops.nop(cpu)
    "BRK" -> cpu

    _ -> cpu
  }
}
