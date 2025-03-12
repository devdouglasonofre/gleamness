import emulation/flags
import emulation/memory
import emulation/types.{type CPU, flag_negative, flag_zero}

// Load Accumulator with a value
pub fn lda(cpu: CPU, value: Int) -> CPU {
  let cpu = types.CPU(..cpu, register_a: value)
  flags.update_flags(cpu, value, [flag_zero, flag_negative])
}

// Load X Register with a value
pub fn ldx(cpu: CPU, value: Int) -> CPU {
  let cpu = types.CPU(..cpu, register_x: value)
  flags.update_flags(cpu, value, [flag_zero, flag_negative])
}

// Load Y Register with a value
pub fn ldy(cpu: CPU, value: Int) -> CPU {
  let cpu = types.CPU(..cpu, register_y: value)
  flags.update_flags(cpu, value, [flag_zero, flag_negative])
}

// Store Accumulator to memory
pub fn sta(cpu: CPU, addr: Int) -> CPU {
  case memory.write(cpu, addr, cpu.register_a) {
    Ok(new_cpu) -> new_cpu
    Error(Nil) -> cpu
  }
}

// Store X register to memory
pub fn stx(cpu: CPU, addr: Int) -> CPU {
  case memory.write(cpu, addr, cpu.register_x) {
    Ok(new_cpu) -> new_cpu
    Error(Nil) -> cpu
  }
}

// Store Y register to memory
pub fn sty(cpu: CPU, addr: Int) -> CPU {
  case memory.write(cpu, addr, cpu.register_y) {
    Ok(new_cpu) -> new_cpu
    Error(Nil) -> cpu
  }
}
