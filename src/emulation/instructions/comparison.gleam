import emulation/flags
import emulation/types.{type CPU, flag_negative, flag_zero}
import gleam/int

// Compare Accumulator with memory (A - M)
pub fn cmp(cpu: CPU, value: Int) -> CPU {
  // Calculate result and mask to 8 bits
  let result = int.bitwise_and(cpu.register_a - value, 0xFF)

  // Update carry flag (set if A >= M)
  let cpu = flags.update_carry_flag(cpu, cpu.register_a >= value)

  // Update zero flag (set if A = M)
  let cpu = case cpu.register_a == value {
    True -> flags.set_flag(cpu, flag_zero)
    False -> flags.clear_flag(cpu, flag_zero)
  }

  // Update negative flag (set if bit 7 of result is set)
  case int.bitwise_and(result, 0x80) != 0 {
    True -> flags.set_flag(cpu, flag_negative)
    False -> flags.clear_flag(cpu, flag_negative)
  }
}

// Compare X Register with memory (X - M)
pub fn cpx(cpu: CPU, value: Int) -> CPU {
  // Calculate result and mask to 8 bits
  let result = int.bitwise_and(cpu.register_x - value, 0xFF)

  // Update carry flag (set if X >= M)
  let cpu = flags.update_carry_flag(cpu, cpu.register_x >= value)

  // Update zero flag (set if X = M)
  let cpu = case cpu.register_x == value {
    True -> flags.set_flag(cpu, flag_zero)
    False -> flags.clear_flag(cpu, flag_zero)
  }

  // Update negative flag (set if bit 7 of result is set)
  case int.bitwise_and(result, 0x80) != 0 {
    True -> flags.set_flag(cpu, flag_negative)
    False -> flags.clear_flag(cpu, flag_negative)
  }
}

// Compare Y Register with memory (Y - M)
pub fn cpy(cpu: CPU, value: Int) -> CPU {
  // Calculate result and mask to 8 bits
  let result = int.bitwise_and(cpu.register_y - value, 0xFF)

  // Update carry flag (set if Y >= M)
  let cpu = flags.update_carry_flag(cpu, cpu.register_y >= value)

  // Update zero flag (set if Y = M)
  let cpu = case cpu.register_y == value {
    True -> flags.set_flag(cpu, flag_zero)
    False -> flags.clear_flag(cpu, flag_zero)
  }

  // Update negative flag (set if bit 7 of result is set)
  case int.bitwise_and(result, 0x80) != 0 {
    True -> flags.set_flag(cpu, flag_negative)
    False -> flags.clear_flag(cpu, flag_negative)
  }
}
