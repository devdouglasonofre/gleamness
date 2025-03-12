import emulation/flags
import emulation/types.{
  type CPU, flag_carry, flag_decimal_mode, flag_interrupt_disable, flag_overflow,
}

// Clear Carry Flag
pub fn clc(cpu: CPU) -> CPU {
  flags.clear_flag(cpu, flag_carry)
}

// Set Carry Flag
pub fn sec(cpu: CPU) -> CPU {
  flags.set_flag(cpu, flag_carry)
}

// Clear Decimal Mode
pub fn cld(cpu: CPU) -> CPU {
  flags.clear_flag(cpu, flag_decimal_mode)
}

// Set Decimal Mode
pub fn sed(cpu: CPU) -> CPU {
  flags.set_flag(cpu, flag_decimal_mode)
}

// Clear Interrupt Disable
pub fn cli(cpu: CPU) -> CPU {
  flags.clear_flag(cpu, flag_interrupt_disable)
}

// Set Interrupt Disable
pub fn sei(cpu: CPU) -> CPU {
  flags.set_flag(cpu, flag_interrupt_disable)
}

// Clear Overflow Flag
pub fn clv(cpu: CPU) -> CPU {
  flags.clear_flag(cpu, flag_overflow)
}

// No Operation
pub fn nop(cpu: CPU) -> CPU {
  // Does nothing but consume a cycle
  cpu
}
