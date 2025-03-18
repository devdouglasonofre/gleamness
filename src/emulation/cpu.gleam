import emulation/addressing
import emulation/bus
import emulation/helpers/instruction_helpers
import emulation/instructions/arithmetic
import emulation/instructions/branch
import emulation/instructions/comparison
import emulation/instructions/flag_ops
import emulation/instructions/jump
import emulation/instructions/load_store
import emulation/instructions/logic
import emulation/instructions/stack_ops
import emulation/instructions/transfer
import emulation/memory
import emulation/types.{
  type CPU, type CpuInstruction, Bus, flag_unused, stack_reset,
}
import gleam/io
import gleam/option.{None}
import iv

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
    bus: Bus(cpu_vram: iv.repeat(0, 0x2000), rom: None),
  )
}

// Initialize a new CPU with a ROM
pub fn get_new_cpu_with_rom(rom: types.Rom) -> CPU {
  // Initialize CPU with ROM
  types.CPU(
    register_a: 0,
    register_x: 0,
    register_y: 0,
    status: flag_unused,
    program_counter: 0,
    stack_pointer: stack_reset,
    memory: memory.init_memory(),
    bus: bus.new_with_rom(rom),
  )
}

// Load a program and run it
pub fn load_and_run(cpu: CPU, program: iv.Array(Int)) -> Result(CPU, Nil) {
  load_and_run_with_callback(cpu, program, fn(c) { c })
}

// Load a program and run it with a callback
pub fn load_and_run_with_callback(
  cpu: CPU,
  program: iv.Array(Int),
  callback: fn(CPU) -> CPU,
) -> Result(CPU, Nil) {
  case load(cpu, program) {
    Ok(new_cpu) -> {
      case reset(new_cpu) {
        Ok(reset_cpu) -> Ok(run(reset_cpu, callback))
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
pub fn load(cpu: CPU, program: iv.Array(Int)) -> Result(CPU, Nil) {
  // Load program directly into memory at PRG_ROM_START (0x8000)
  case load_at_address(cpu, program, bus.prg_rom_start) {
    Ok(cpu_with_program) -> {
      // Point reset vector to ROM start
      memory.write_u16(cpu_with_program, 0xFFFC, bus.prg_rom_start)
    }
    Error(Nil) -> {
      Error(Nil)
    }
  }
}

// Load a program into memory at a specified address
fn load_at_address(
  cpu: CPU,
  program: iv.Array(Int),
  start_address: Int,
) -> Result(CPU, Nil) {
  let length = iv.length(program)
  // Use iv.fold_until to iterate through indices
  iv.fold(iv.range(0, length - 1), Ok(cpu), fn(acc, index) {
    case acc {
      Error(_) -> acc
      Ok(current_cpu) -> {
        case iv.get(program, index) {
          Ok(byte) -> memory.write(current_cpu, start_address + index, byte)
          Error(_) -> Error(Nil)
        }
      }
    }
  })
}

// Main interpretation loop - now executes only one instruction
pub fn run(cpu: CPU, callback: fn(CPU) -> CPU) -> CPU {
  // Execute callback before processing the instruction
  let cpu = callback(cpu)

  // Read from bus memory instead of cpu_vram directly
  case bus.mem_read(cpu.bus, cpu.program_counter) {
    Error(_) -> cpu
    Ok(opcode) -> {
      // Get instruction metadata
      let instruction = find_instruction(opcode)

      // Handle opcode based on instruction metadata
      case instruction {
        // Handle instruction with proper addressing mode
        Ok(instr) -> {
          // Advance program counter for opcode byte
          let cpu = types.CPU(..cpu, program_counter: cpu.program_counter + 1)

          let #(cpu_after_fetch, operand_addr) =
            addressing.get_operand_address(cpu, instr.addressing_mode)
          let operand_value =
            addressing.get_operand_value(
              cpu_after_fetch,
              instr.addressing_mode,
              operand_addr,
            )

          execute_instruction(
            cpu_after_fetch,
            instr,
            operand_addr,
            operand_value,
          )
        }

        // Unknown opcode
        Error(_) -> {
          // Probably NOP. We won't handle unofficial OP codes for now
          types.CPU(..cpu, program_counter: cpu.program_counter + 1)
        }
      }
    }
  }
}

// Find the instruction metadata for a given opcode
fn find_instruction(opcode: Int) -> Result(CpuInstruction, Nil) {
  let instructions = instruction_helpers.get_all_instructions()
  // Convert to iv array for more efficient lookup

  // Find the instruction with matching opcode
  iv.find(instructions, fn(instr) { instr.opcode == opcode })
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
    "BRK" -> flag_ops.brk(cpu)

    // Comparison Instructions (missing)
    "CMP" -> comparison.cmp(cpu, operand_value)
    "CPX" -> comparison.cpx(cpu, operand_value)
    "CPY" -> comparison.cpy(cpu, operand_value)

    _ -> cpu
  }
}
