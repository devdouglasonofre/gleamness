import flags
import types.{type CPU, flag_negative, flag_zero}

// Transfer Accumulator to X
pub fn tax(cpu: CPU) -> CPU {
  let cpu = types.CPU(..cpu, register_x: cpu.register_a)
  flags.update_flags(cpu, cpu.register_x, [flag_zero, flag_negative])
}

// Transfer Accumulator to Y
pub fn tay(cpu: CPU) -> CPU {
  let cpu = types.CPU(..cpu, register_y: cpu.register_a)
  flags.update_flags(cpu, cpu.register_y, [flag_zero, flag_negative])
}

// Transfer X to Accumulator
pub fn txa(cpu: CPU) -> CPU {
  let cpu = types.CPU(..cpu, register_a: cpu.register_x)
  flags.update_flags(cpu, cpu.register_a, [flag_zero, flag_negative])
}

// Transfer Y to Accumulator
pub fn tya(cpu: CPU) -> CPU {
  let cpu = types.CPU(..cpu, register_a: cpu.register_y)
  flags.update_flags(cpu, cpu.register_a, [flag_zero, flag_negative])
}

// Transfer Stack Pointer to X
pub fn tsx(cpu: CPU) -> CPU {
  let cpu = types.CPU(..cpu, register_x: cpu.stack_pointer)
  flags.update_flags(cpu, cpu.register_x, [flag_zero, flag_negative])
}

// Transfer X to Stack Pointer
pub fn txs(cpu: CPU) -> CPU {
  types.CPU(..cpu, stack_pointer: cpu.register_x)
}
