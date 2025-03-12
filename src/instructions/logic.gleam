import flags
import gleam/int
import memory
import types.{
  type AddressingMode, type CPU, Accumulator, flag_carry, flag_negative,
  flag_overflow, flag_zero,
}

// Logical AND
pub fn and(cpu: CPU, value: Int) -> CPU {
  let result = int.bitwise_and(cpu.register_a, value)
  let cpu = types.CPU(..cpu, register_a: result)
  flags.update_flags(cpu, result, [flag_zero, flag_negative])
}

// Logical Exclusive OR
pub fn eor(cpu: CPU, value: Int) -> CPU {
  let result = int.bitwise_exclusive_or(cpu.register_a, value)
  let cpu = types.CPU(..cpu, register_a: result)
  flags.update_flags(cpu, result, [flag_zero, flag_negative])
}

// Logical Inclusive OR
pub fn ora(cpu: CPU, value: Int) -> CPU {
  let result = int.bitwise_or(cpu.register_a, value)
  let cpu = types.CPU(..cpu, register_a: result)
  flags.update_flags(cpu, result, [flag_zero, flag_negative])
}

// Bit Test
pub fn bit(cpu: CPU, value: Int) -> CPU {
  let result = int.bitwise_and(cpu.register_a, value)
  let zero_flag = result == 0

  // Bit 7 and 6 of the value are copied to the negative and overflow flags
  let negative_flag = int.bitwise_and(value, flag_negative)
  let overflow_flag = int.bitwise_and(value, flag_overflow)

  // Clear then set relevant flags
  let cpu = flags.clear_flag(cpu, flag_zero)
  let cpu = case zero_flag {
    True -> flags.set_flag(cpu, flag_zero)
    False -> cpu
  }

  let cpu = flags.clear_flag(cpu, flag_negative)
  let cpu = case negative_flag != 0 {
    True -> flags.set_flag(cpu, flag_negative)
    False -> cpu
  }

  let cpu = flags.clear_flag(cpu, flag_overflow)
  case overflow_flag != 0 {
    True -> flags.set_flag(cpu, flag_overflow)
    False -> cpu
  }
}

// Arithmetic Shift Left
pub fn asl(cpu: CPU, addr: Int, value: Int, mode: AddressingMode) -> CPU {
  // Extract the most significant bit (bit 7) for carry flag
  let carry = case int.bitwise_and(value, 0x80) != 0 {
    True -> flag_carry
    False -> 0
  }

  // Shift left and mask to 8 bits
  let result = int.bitwise_and(int.bitwise_shift_left(value, 1), 0xFF)

  // Update carry flag
  let cpu = flags.clear_flag(cpu, flag_carry)
  let cpu = case carry != 0 {
    True -> flags.set_flag(cpu, flag_carry)
    False -> cpu
  }

  // Apply the result based on addressing mode
  let cpu = case mode {
    Accumulator -> types.CPU(..cpu, register_a: result)
    _ -> {
      case memory.write(cpu, addr, result) {
        Ok(new_cpu) -> new_cpu
        Error(Nil) -> cpu
      }
    }
  }

  flags.update_flags(cpu, result, [flag_zero, flag_negative])
}

// Logical Shift Right
pub fn lsr(cpu: CPU, addr: Int, value: Int, mode: AddressingMode) -> CPU {
  // Extract the least significant bit (bit 0) for carry flag
  let carry = case int.bitwise_and(value, 0x01) != 0 {
    True -> flag_carry
    False -> 0
  }

  // Shift right
  let result = int.bitwise_shift_right(value, 1)

  // Update carry flag
  let cpu = flags.clear_flag(cpu, flag_carry)
  let cpu = case carry != 0 {
    True -> flags.set_flag(cpu, flag_carry)
    False -> cpu
  }

  // Apply the result based on addressing mode
  let cpu = case mode {
    Accumulator -> types.CPU(..cpu, register_a: result)
    _ -> {
      case memory.write(cpu, addr, result) {
        Ok(new_cpu) -> new_cpu
        Error(Nil) -> cpu
      }
    }
  }

  flags.update_flags(cpu, result, [flag_zero, flag_negative])
}

// Rotate Left
pub fn rol(cpu: CPU, addr: Int, value: Int, mode: AddressingMode) -> CPU {
  // Get current carry flag
  let current_carry = case flags.is_flag_set(cpu, flag_carry) {
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
  let cpu = flags.clear_flag(cpu, flag_carry)
  let cpu = case new_carry != 0 {
    True -> flags.set_flag(cpu, flag_carry)
    False -> cpu
  }

  // Apply the result based on addressing mode
  let cpu = case mode {
    Accumulator -> types.CPU(..cpu, register_a: result)
    _ -> {
      case memory.write(cpu, addr, result) {
        Ok(new_cpu) -> new_cpu
        Error(Nil) -> cpu
      }
    }
  }

  flags.update_flags(cpu, result, [flag_zero, flag_negative])
}

// Rotate Right
pub fn ror(cpu: CPU, addr: Int, value: Int, mode: AddressingMode) -> CPU {
  // Get current carry flag
  let current_carry = case flags.is_flag_set(cpu, flag_carry) {
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
  let cpu = flags.clear_flag(cpu, flag_carry)
  let cpu = case new_carry != 0 {
    True -> flags.set_flag(cpu, flag_carry)
    False -> cpu
  }

  // Apply the result based on addressing mode
  let cpu = case mode {
    Accumulator -> types.CPU(..cpu, register_a: result)
    _ -> {
      case memory.write(cpu, addr, result) {
        Ok(new_cpu) -> new_cpu
        Error(Nil) -> cpu
      }
    }
  }

  flags.update_flags(cpu, result, [flag_zero, flag_negative])
}
