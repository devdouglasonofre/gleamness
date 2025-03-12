import emulation/flags
import emulation/types.{
  type CPU, flag_carry, flag_negative, flag_overflow, flag_zero,
}

// Branch if Equal (Zero set)
pub fn beq(cpu: CPU, addr: Int) -> CPU {
  case flags.is_flag_set(cpu, flag_zero) {
    True -> types.CPU(..cpu, program_counter: addr)
    False -> cpu
  }
}

// Branch if Not Equal (Zero clear)
pub fn bne(cpu: CPU, addr: Int) -> CPU {
  case flags.is_flag_set(cpu, flag_zero) {
    False -> types.CPU(..cpu, program_counter: addr)
    True -> cpu
  }
}

// Branch if Carry Set
pub fn bcs(cpu: CPU, addr: Int) -> CPU {
  case flags.is_flag_set(cpu, flag_carry) {
    True -> types.CPU(..cpu, program_counter: addr)
    False -> cpu
  }
}

// Branch if Carry Clear
pub fn bcc(cpu: CPU, addr: Int) -> CPU {
  case flags.is_flag_set(cpu, flag_carry) {
    False -> types.CPU(..cpu, program_counter: addr)
    True -> cpu
  }
}

// Branch if Minus (Negative set)
pub fn bmi(cpu: CPU, addr: Int) -> CPU {
  case flags.is_flag_set(cpu, flag_negative) {
    True -> types.CPU(..cpu, program_counter: addr)
    False -> cpu
  }
}

// Branch if Plus (Negative clear)
pub fn bpl(cpu: CPU, addr: Int) -> CPU {
  case flags.is_flag_set(cpu, flag_negative) {
    False -> types.CPU(..cpu, program_counter: addr)
    True -> cpu
  }
}

// Branch if Overflow Set
pub fn bvs(cpu: CPU, addr: Int) -> CPU {
  case flags.is_flag_set(cpu, flag_overflow) {
    True -> types.CPU(..cpu, program_counter: addr)
    False -> cpu
  }
}

// Branch if Overflow Clear
pub fn bvc(cpu: CPU, addr: Int) -> CPU {
  case flags.is_flag_set(cpu, flag_overflow) {
    False -> types.CPU(..cpu, program_counter: addr)
    True -> cpu
  }
}
