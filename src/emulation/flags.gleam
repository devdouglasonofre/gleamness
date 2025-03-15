import emulation/types.{
  type CPU, flag_carry, flag_negative, flag_overflow, flag_unused, flag_zero,
}
import gleam/int
import iv

// Update CPU flags based on the result of an operation
pub fn update_flags(
  cpu: CPU,
  result: Int,
  flags_to_update: iv.Array(Int),
) -> CPU {
  // Start with the current status
  let status = cpu.status

  // Always set the unused flag
  let status = int.bitwise_or(status, flag_unused)

  // Update specified flags
  let status =
    iv.fold(flags_to_update, status, fn(status, flag) {
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
          case int.bitwise_and(result, 0b10000000) != 0 {
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

  types.CPU(..cpu, status: status)
}

// Check if a specific flag is set
pub fn is_flag_set(cpu: CPU, flag: Int) -> Bool {
  int.bitwise_and(cpu.status, flag) != 0
}

// Set a specific flag
pub fn set_flag(cpu: CPU, flag: Int) -> CPU {
  let status = int.bitwise_or(cpu.status, flag)
  types.CPU(..cpu, status: status)
}

// Clear a specific flag
pub fn clear_flag(cpu: CPU, flag: Int) -> CPU {
  let status = int.bitwise_and(cpu.status, int.bitwise_exclusive_or(0xFF, flag))
  types.CPU(..cpu, status: status)
}

// Update carry flag
pub fn update_carry_flag(cpu: CPU, carry_set: Bool) -> CPU {
  case carry_set {
    True -> set_flag(cpu, flag_carry)
    False -> clear_flag(cpu, flag_carry)
  }
}

// Update both overflow and carry flags
pub fn update_overflow_and_carry_flags(
  cpu: CPU,
  overflow_set: Bool,
  carry_set: Bool,
) -> CPU {
  let cpu = case overflow_set {
    True -> set_flag(cpu, flag_overflow)
    False -> clear_flag(cpu, flag_overflow)
  }
  update_carry_flag(cpu, carry_set)
}
