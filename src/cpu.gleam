import gleam/int

pub type CPU {
  CPU(
    register_a: Int,
    register_x: Int,
    register_y: Int,
    status: Int,
    program_counter: Int,
  )
}

pub fn get_new_cpu() {
  CPU(0, 0, 0, 0, 0)
}

pub fn interpret(cpu: CPU, program: List(Int)) -> CPU {
  let cpu = CPU(..cpu, program_counter: 0)
  interpret_loop(cpu, program)
}

fn interpret_loop(cpu: CPU, program: List(Int)) -> CPU {
  case get_opcode(program, cpu.program_counter) {
    Error(Nil) -> cpu
    Ok(opcode) -> {
      // Advance program counter
      let cpu = CPU(..cpu, program_counter: cpu.program_counter + 1)

      // Handle opcode
      let cpu = case opcode {
        0xA9 -> lda |> fetch_param_and_execute(cpu, program)
        0xAA -> tax(cpu)
        0xE8 -> inx(cpu)
        // BRK instruction - just return the current CPU state
        0x00 -> cpu
        _ -> cpu
      }

      interpret_loop(cpu, program)
    }
  }
}

// Helper to fetch a parameter and execute a single-parameter instruction
fn fetch_param_and_execute(
  execute: fn(CPU, Int) -> CPU,
  cpu: CPU,
  program: List(Int),
) -> CPU {
  case get_opcode(program, cpu.program_counter) {
    Error(Nil) -> cpu
    // No parameter available
    Ok(param) -> {
      // Advance program counter past the parameter
      let cpu = CPU(..cpu, program_counter: cpu.program_counter + 1)
      // Execute the provided function with the parameter
      execute(cpu, param)
    }
  }
}

// Load Accumulator with a value
fn lda(cpu: CPU, value: Int) -> CPU {
  let cpu = CPU(..cpu, register_a: value)
  update_zero_and_negative_flags(cpu, value)
}

// Increment X register
fn inx(cpu: CPU) -> CPU {
  let cpu = CPU(..cpu, register_x: cpu.register_x + 1)
  update_zero_and_negative_flags(cpu, cpu.register_x)
}

// Transfer Accumulator to X
fn tax(cpu: CPU) -> CPU {
  let cpu = CPU(..cpu, register_x: cpu.register_a)
  update_zero_and_negative_flags(cpu, cpu.register_y)
}

fn update_zero_and_negative_flags(cpu: CPU, result: Int) -> CPU {
  // Update zero flag (bit 1)
  let status = case result == 0 {
    True -> int.bitwise_or(cpu.status, 0b0000_0010)
    False -> int.bitwise_and(cpu.status, 0b1111_1101)
  }

  // Update negative flag (bit 7)
  let status = case int.bitwise_and(result, 0b1000_0000) != 0 {
    True -> int.bitwise_or(status, 0b1000_0000)
    False -> int.bitwise_and(status, 0b0111_1111)
  }

  CPU(..cpu, status: status)
}

fn get_opcode(program: List(Int), index: Int) -> Result(Int, Nil) {
  case program, index {
    [], _ -> Error(Nil)
    [first, ..], 0 -> Ok(first)
    [_, ..rest], i if i > 0 -> get_opcode(rest, i - 1)
    _, _ -> Error(Nil)
  }
}
