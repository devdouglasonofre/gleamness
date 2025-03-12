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
pub const flag_carry = 0b00000001

// Zero Flag (Z)
pub const flag_zero = 0b00000010

// Interrupt Disable (I)
pub const flag_interrupt_disable = 0b00000100

// Decimal Mode (D)
pub const flag_decimal_mode = 0b00001000

// Break Command (B)
pub const flag_break = 0b00010000

// Unused, always set to 1
pub const flag_unused = 0b00100000

// Overflow Flag (V)
pub const flag_overflow = 0b01000000

// Negative Flag (N)
pub const flag_negative = 0b10000000

// Stack constants

// Stack exists from $0100-$01FF
pub const stack_base = 0x0100

// Stack Pointer resets to $FF (top of stack)
pub const stack_reset = 0xFF
