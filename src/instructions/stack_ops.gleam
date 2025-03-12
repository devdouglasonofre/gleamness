import flags
import gleam/int
import stack
import types.{type CPU, flag_negative, flag_unused, flag_zero}

// Push Accumulator to stack
pub fn pha(cpu: CPU) -> CPU {
  case stack.push(cpu, cpu.register_a) {
    Ok(new_cpu) -> new_cpu
    Error(Nil) -> cpu
  }
}

// Pull Accumulator from stack
pub fn pla(cpu: CPU) -> CPU {
  case stack.pull(cpu) {
    Ok(#(cpu1, value)) -> {
      let cpu2 = types.CPU(..cpu1, register_a: value)
      flags.update_flags(cpu2, value, [flag_zero, flag_negative])
    }
    Error(Nil) -> cpu
  }
}

// Push Processor Status to stack
pub fn php(cpu: CPU) -> CPU {
  // When pushing status to stack, both B flags are set
  let break_flag = 0x30
  // Both B flags (bit 4 and 5)
  let status_with_break = int.bitwise_or(cpu.status, break_flag)

  case stack.push(cpu, status_with_break) {
    Ok(new_cpu) -> new_cpu
    Error(Nil) -> cpu
  }
}

// Pull Processor Status from stack
pub fn plp(cpu: CPU) -> CPU {
  case stack.pull(cpu) {
    Ok(#(cpu1, status)) -> {
      // The unused flag should always be set
      let status_with_unused = int.bitwise_or(status, flag_unused)
      // Break command flag should not be affected
      let break_mask = 0x10
      // 0b0001_0000
      let status_with_break =
        int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, break_mask))
      let status_with_unused_and_break =
        int.bitwise_or(status_with_unused, status_with_break)
      types.CPU(..cpu1, status: status_with_unused_and_break)
    }
    Error(Nil) -> cpu
  }
}
