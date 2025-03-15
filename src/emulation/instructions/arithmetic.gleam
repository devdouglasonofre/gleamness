import emulation/flags
import emulation/memory
import emulation/types.{type CPU, flag_carry, flag_negative, flag_zero}
import gleam/int
import iv

// Add with Carry
pub fn adc(cpu: CPU, value: Int) -> CPU {
  let carry = case flags.is_flag_set(cpu, flag_carry) {
    True -> 1
    False -> 0
  }

  let sum = cpu.register_a + value + carry
  let result = int.bitwise_and(sum, 0xFF)

  // Check if carry occurred (result > 255)
  let carry_set = sum > 0xFF

  // Check for overflow
  // Overflow occurs when both inputs have the same sign, but the result has a different sign
  // We can detect this by checking if (A ^ result) & (M ^ result) & 0x80 is set
  // where ^ is XOR
  let a_sign = int.bitwise_and(cpu.register_a, 0x80)
  let m_sign = int.bitwise_and(value, 0x80)
  let r_sign = int.bitwise_and(result, 0x80)
  let overflow_set = a_sign == m_sign && a_sign != r_sign

  // Update accumulator
  let cpu = types.CPU(..cpu, register_a: result)

  // Update flags
  let cpu = flags.update_overflow_and_carry_flags(cpu, overflow_set, carry_set)
  flags.update_flags(cpu, result, iv.from_list([flag_zero, flag_negative]))
}

// Subtract with Carry
pub fn sbc(cpu: CPU, value: Int) -> CPU {
  // SBC is implemented as ADC with the operand inverted
  // A - B - (1-C) = A + ~B + C
  let inverted_value = int.bitwise_exclusive_or(value, 0xFF)
  adc(cpu, inverted_value)
}

// Increment memory location
pub fn inc(cpu: CPU, addr: Int) -> CPU {
  case memory.read(cpu, addr) {
    Ok(value) -> {
      let new_value = int.bitwise_and(value + 1, 0xFF)
      case memory.write(cpu, addr, new_value) {
        Ok(new_cpu) ->
          flags.update_flags(
            new_cpu,
            new_value,
            iv.from_list([flag_zero, flag_negative]),
          )
        Error(Nil) -> cpu
      }
    }
    Error(Nil) -> cpu
  }
}

// Decrement memory location
pub fn dec(cpu: CPU, addr: Int) -> CPU {
  case memory.read(cpu, addr) {
    Ok(value) -> {
      let new_value = int.bitwise_and(value - 1, 0xFF)
      case memory.write(cpu, addr, new_value) {
        Ok(new_cpu) ->
          flags.update_flags(
            new_cpu,
            new_value,
            iv.from_list([flag_zero, flag_negative]),
          )
        Error(Nil) -> cpu
      }
    }
    Error(Nil) -> cpu
  }
}

// Increment X register
pub fn inx(cpu: CPU) -> CPU {
  let value = int.bitwise_and(cpu.register_x + 1, 0xFF)
  let cpu = types.CPU(..cpu, register_x: value)
  flags.update_flags(cpu, value, iv.from_list([flag_zero, flag_negative]))
}

// Increment Y register
pub fn iny(cpu: CPU) -> CPU {
  let value = int.bitwise_and(cpu.register_y + 1, 0xFF)
  let cpu = types.CPU(..cpu, register_y: value)
  flags.update_flags(cpu, value, iv.from_list([flag_zero, flag_negative]))
}

// Decrement X register
pub fn dex(cpu: CPU) -> CPU {
  let value = int.bitwise_and(cpu.register_x - 1, 0xFF)
  let cpu = types.CPU(..cpu, register_x: value)
  flags.update_flags(cpu, value, iv.from_list([flag_zero, flag_negative]))
}

// Decrement Y register
pub fn dey(cpu: CPU) -> CPU {
  let value = int.bitwise_and(cpu.register_y - 1, 0xFF)
  let cpu = types.CPU(..cpu, register_y: value)
  flags.update_flags(cpu, value, iv.from_list([flag_zero, flag_negative]))
}
