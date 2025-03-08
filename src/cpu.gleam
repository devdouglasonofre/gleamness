import gleam/int
import helpers/list_helpers

pub type CPU {
  CPU(
    register_a: Int,
    register_x: Int,
    register_y: Int,
    status: Int,
    program_counter: Int,
    memory: List(Int),
  )
}

pub fn get_new_cpu() {
  CPU(0, 0, 0, 0, 0, [])
}

// Load a program and run it
pub fn load_and_run(cpu: CPU, program: List(Int)) -> Result(CPU, Nil) {
  case load(cpu, program) {
    Ok(new_cpu) -> Ok(run(new_cpu, new_cpu.memory))
    Error(Nil) -> Error(Nil)
  }
}

pub fn run(cpu: CPU, program: List(Int)) -> CPU {
  let cpu = CPU(..cpu, program_counter: 0)
  interpret_loop(cpu, program)
}

fn interpret_loop(cpu: CPU, program: List(Int)) -> CPU {
  case list_helpers.get_list_value_by_index(program, cpu.program_counter) {
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
  case list_helpers.get_list_value_by_index(program, cpu.program_counter) {
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

pub fn memory_read(cpu: CPU, address: Int) -> Result(Int, Nil) {
  list_helpers.get_list_value_by_index(cpu.memory, address)
}

pub fn memory_write(cpu: CPU, address: Int, data: Int) -> Result(CPU, Nil) {
  case list_helpers.set_list_value_by_index(cpu.memory, address, data) {
    Ok(new_memory) -> Ok(CPU(..cpu, memory: new_memory))
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
