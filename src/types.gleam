pub type CPU {
  CPU(
    register_a: Int,
    register_x: Int,
    register_y: Int,
    status: Int,
    program_counter: Int,
    stack_pointer: Int,
    memory: List(Int),
    bus: Bus,
  )
}

pub type Bus {
  Bus(cpu_vram: List(Int))
}

pub type CpuInstruction {
  CpuInstruction(
    opcode: Int,
    mnemonic: String,
    bytes: Int,
    cycles: Int,
    addressing_mode: AddressingMode,
  )
}

pub type AddressingMode {
  Accumulator
  Immediate
  ZeroPage
  ZeroPageX
  ZeroPageY
  Absolute
  AbsoluteX
  AbsoluteY
  Indirect
  IndirectX
  IndirectY
  Relative
  NoneAddressing
}

// CPU status register flags (each bit in the status register)
// Carry Flag (C)
pub const flag_carry = 0b0000_0001

// Zero Flag (Z)
pub const flag_zero = 0b0000_0010

// Interrupt Disable (I)
pub const flag_interrupt_disable = 0b0000_0100

// Decimal Mode (D)
pub const flag_decimal_mode = 0b0000_1000

// Break Command (B)
pub const flag_break = 0b0001_0000

// Unused, always set to 1
pub const flag_unused = 0b0010_0000

// Overflow Flag (V)
pub const flag_overflow = 0b0100_0000

// Negative Flag (N)
pub const flag_negative = 0b1000_0000

// Stack constants

// Stack exists from $0100-$01FF
pub const stack_base = 0x0100

// Stack Pointer resets to $FF (top of stack)
pub const stack_reset = 0xFF
