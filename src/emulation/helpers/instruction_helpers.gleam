import emulation/types.{type CpuInstruction, CpuInstruction}

pub fn get_all_instructions() -> List(CpuInstruction) {
  [
    // ADC (Add with Carry)
    CpuInstruction(0x69, "ADC", 2, 2, types.Immediate),
    CpuInstruction(0x65, "ADC", 2, 3, types.ZeroPage),
    CpuInstruction(0x75, "ADC", 2, 4, types.ZeroPageX),
    CpuInstruction(0x6D, "ADC", 3, 4, types.Absolute),
    CpuInstruction(0x7D, "ADC", 3, 4, types.AbsoluteX),
    CpuInstruction(0x79, "ADC", 3, 4, types.AbsoluteY),
    CpuInstruction(0x61, "ADC", 2, 6, types.IndirectX),
    CpuInstruction(0x71, "ADC", 2, 5, types.IndirectY),
    // AND (Logical AND)
    CpuInstruction(0x29, "AND", 2, 2, types.Immediate),
    CpuInstruction(0x25, "AND", 2, 3, types.ZeroPage),
    CpuInstruction(0x35, "AND", 2, 4, types.ZeroPageX),
    CpuInstruction(0x2D, "AND", 3, 4, types.Absolute),
    CpuInstruction(0x3D, "AND", 3, 4, types.AbsoluteX),
    CpuInstruction(0x39, "AND", 3, 4, types.AbsoluteY),
    CpuInstruction(0x21, "AND", 2, 6, types.IndirectX),
    CpuInstruction(0x31, "AND", 2, 5, types.IndirectY),
    // ASL (Arithmetic Shift Left)
    CpuInstruction(0x0A, "ASL", 1, 2, types.Accumulator),
    CpuInstruction(0x06, "ASL", 2, 5, types.ZeroPage),
    CpuInstruction(0x16, "ASL", 2, 6, types.ZeroPageX),
    CpuInstruction(0x0E, "ASL", 3, 6, types.Absolute),
    CpuInstruction(0x1E, "ASL", 3, 7, types.AbsoluteX),
    // BCC (Branch if Carry Clear)
    CpuInstruction(0x90, "BCC", 2, 2, types.Relative),
    // BCS (Branch if Carry Set)
    CpuInstruction(0xB0, "BCS", 2, 2, types.Relative),
    // BEQ (Branch if Equal)
    CpuInstruction(0xF0, "BEQ", 2, 2, types.Relative),
    // BIT (Bit Test)
    CpuInstruction(0x24, "BIT", 2, 3, types.ZeroPage),
    CpuInstruction(0x2C, "BIT", 3, 4, types.Absolute),
    // BMI (Branch if Minus)
    CpuInstruction(0x30, "BMI", 2, 2, types.Relative),
    // BNE (Branch if Not Equal)
    CpuInstruction(0xD0, "BNE", 2, 2, types.Relative),
    // BPL (Branch if Positive)
    CpuInstruction(0x10, "BPL", 2, 2, types.Relative),
    // BRK (Force Interrupt)
    CpuInstruction(0x00, "BRK", 1, 7, types.NoneAddressing),
    // BVC (Branch if Overflow Clear)
    CpuInstruction(0x50, "BVC", 2, 2, types.Relative),
    // BVS (Branch if Overflow Set)
    CpuInstruction(0x70, "BVS", 2, 2, types.Relative),
    // CLC (Clear Carry Flag)
    CpuInstruction(0x18, "CLC", 1, 2, types.NoneAddressing),
    // CLD (Clear Decimal Mode)
    CpuInstruction(0xD8, "CLD", 1, 2, types.NoneAddressing),
    // CLI (Clear Interrupt Disable)
    CpuInstruction(0x58, "CLI", 1, 2, types.NoneAddressing),
    // CLV (Clear Overflow Flag)
    CpuInstruction(0xB8, "CLV", 1, 2, types.NoneAddressing),
    // CMP (Compare)
    CpuInstruction(0xC9, "CMP", 2, 2, types.Immediate),
    CpuInstruction(0xC5, "CMP", 2, 3, types.ZeroPage),
    CpuInstruction(0xD5, "CMP", 2, 4, types.ZeroPageX),
    CpuInstruction(0xCD, "CMP", 3, 4, types.Absolute),
    CpuInstruction(0xDD, "CMP", 3, 4, types.AbsoluteX),
    CpuInstruction(0xD9, "CMP", 3, 4, types.AbsoluteY),
    CpuInstruction(0xC1, "CMP", 2, 6, types.IndirectX),
    CpuInstruction(0xD1, "CMP", 2, 5, types.IndirectY),
    // CPX (Compare X Register)
    CpuInstruction(0xE0, "CPX", 2, 2, types.Immediate),
    CpuInstruction(0xE4, "CPX", 2, 3, types.ZeroPage),
    CpuInstruction(0xEC, "CPX", 3, 4, types.Absolute),
    // CPY (Compare Y Register)
    CpuInstruction(0xC0, "CPY", 2, 2, types.Immediate),
    CpuInstruction(0xC4, "CPY", 2, 3, types.ZeroPage),
    CpuInstruction(0xCC, "CPY", 3, 4, types.Absolute),
    // DEC (Decrement Memory)
    CpuInstruction(0xC6, "DEC", 2, 5, types.ZeroPage),
    CpuInstruction(0xD6, "DEC", 2, 6, types.ZeroPageX),
    CpuInstruction(0xCE, "DEC", 3, 6, types.Absolute),
    CpuInstruction(0xDE, "DEC", 3, 7, types.AbsoluteX),
    // DEX (Decrement X Register)
    CpuInstruction(0xCA, "DEX", 1, 2, types.NoneAddressing),
    // DEY (Decrement Y Register)
    CpuInstruction(0x88, "DEY", 1, 2, types.NoneAddressing),
    // EOR (Exclusive OR)
    CpuInstruction(0x49, "EOR", 2, 2, types.Immediate),
    CpuInstruction(0x45, "EOR", 2, 3, types.ZeroPage),
    CpuInstruction(0x55, "EOR", 2, 4, types.ZeroPageX),
    CpuInstruction(0x4D, "EOR", 3, 4, types.Absolute),
    CpuInstruction(0x5D, "EOR", 3, 4, types.AbsoluteX),
    CpuInstruction(0x59, "EOR", 3, 4, types.AbsoluteY),
    CpuInstruction(0x41, "EOR", 2, 6, types.IndirectX),
    CpuInstruction(0x51, "EOR", 2, 5, types.IndirectY),
    // INC (Increment Memory)
    CpuInstruction(0xE6, "INC", 2, 5, types.ZeroPage),
    CpuInstruction(0xF6, "INC", 2, 6, types.ZeroPageX),
    CpuInstruction(0xEE, "INC", 3, 6, types.Absolute),
    CpuInstruction(0xFE, "INC", 3, 7, types.AbsoluteX),
    // INX (Increment X Register)
    CpuInstruction(0xE8, "INX", 1, 2, types.NoneAddressing),
    // INY (Increment Y Register)
    CpuInstruction(0xC8, "INY", 1, 2, types.NoneAddressing),
    // JMP (Jump)
    CpuInstruction(0x4C, "JMP", 3, 3, types.Absolute),
    CpuInstruction(0x6C, "JMP", 3, 5, types.Indirect),
    // JSR (Jump to Subroutine)
    CpuInstruction(0x20, "JSR", 3, 6, types.Absolute),
    // LDA (Load Accumulator)
    CpuInstruction(0xA9, "LDA", 2, 2, types.Immediate),
    CpuInstruction(0xA5, "LDA", 2, 3, types.ZeroPage),
    CpuInstruction(0xB5, "LDA", 2, 4, types.ZeroPageX),
    CpuInstruction(0xAD, "LDA", 3, 4, types.Absolute),
    CpuInstruction(0xBD, "LDA", 3, 4, types.AbsoluteX),
    CpuInstruction(0xB9, "LDA", 3, 4, types.AbsoluteY),
    CpuInstruction(0xA1, "LDA", 2, 6, types.IndirectX),
    CpuInstruction(0xB1, "LDA", 2, 5, types.IndirectY),
    // LDX (Load X Register)
    CpuInstruction(0xA2, "LDX", 2, 2, types.Immediate),
    CpuInstruction(0xA6, "LDX", 2, 3, types.ZeroPage),
    CpuInstruction(0xB6, "LDX", 2, 4, types.ZeroPageY),
    CpuInstruction(0xAE, "LDX", 3, 4, types.Absolute),
    CpuInstruction(0xBE, "LDX", 3, 4, types.AbsoluteY),
    // LDY (Load Y Register)
    CpuInstruction(0xA0, "LDY", 2, 2, types.Immediate),
    CpuInstruction(0xA4, "LDY", 2, 3, types.ZeroPage),
    CpuInstruction(0xB4, "LDY", 2, 4, types.ZeroPageX),
    CpuInstruction(0xAC, "LDY", 3, 4, types.Absolute),
    CpuInstruction(0xBC, "LDY", 3, 4, types.AbsoluteX),
    // LSR (Logical Shift Right)
    CpuInstruction(0x4A, "LSR", 1, 2, types.Accumulator),
    CpuInstruction(0x46, "LSR", 2, 5, types.ZeroPage),
    CpuInstruction(0x56, "LSR", 2, 6, types.ZeroPageX),
    CpuInstruction(0x4E, "LSR", 3, 6, types.Absolute),
    CpuInstruction(0x5E, "LSR", 3, 7, types.AbsoluteX),
    // NOP (No Operation)
    CpuInstruction(0xEA, "NOP", 1, 2, types.NoneAddressing),
    // ORA (Logical Inclusive OR)
    CpuInstruction(0x09, "ORA", 2, 2, types.Immediate),
    CpuInstruction(0x05, "ORA", 2, 3, types.ZeroPage),
    CpuInstruction(0x15, "ORA", 2, 4, types.ZeroPageX),
    CpuInstruction(0x0D, "ORA", 3, 4, types.Absolute),
    CpuInstruction(0x1D, "ORA", 3, 4, types.AbsoluteX),
    CpuInstruction(0x19, "ORA", 3, 4, types.AbsoluteY),
    CpuInstruction(0x01, "ORA", 2, 6, types.IndirectX),
    CpuInstruction(0x11, "ORA", 2, 5, types.IndirectY),
    // PHA (Push Accumulator)
    CpuInstruction(0x48, "PHA", 1, 3, types.NoneAddressing),
    // PHP (Push Processor Status)
    CpuInstruction(0x08, "PHP", 1, 3, types.NoneAddressing),
    // PLA (Pull Accumulator)
    CpuInstruction(0x68, "PLA", 1, 4, types.NoneAddressing),
    // PLP (Pull Processor Status)
    CpuInstruction(0x28, "PLP", 1, 4, types.NoneAddressing),
    // ROL (Rotate Left)
    CpuInstruction(0x2A, "ROL", 1, 2, types.Accumulator),
    CpuInstruction(0x26, "ROL", 2, 5, types.ZeroPage),
    CpuInstruction(0x36, "ROL", 2, 6, types.ZeroPageX),
    CpuInstruction(0x2E, "ROL", 3, 6, types.Absolute),
    CpuInstruction(0x3E, "ROL", 3, 7, types.AbsoluteX),
    // ROR (Rotate Right)
    CpuInstruction(0x6A, "ROR", 1, 2, types.Accumulator),
    CpuInstruction(0x66, "ROR", 2, 5, types.ZeroPage),
    CpuInstruction(0x76, "ROR", 2, 6, types.ZeroPageX),
    CpuInstruction(0x6E, "ROR", 3, 6, types.Absolute),
    CpuInstruction(0x7E, "ROR", 3, 7, types.AbsoluteX),
    // RTI (Return from Interrupt)
    CpuInstruction(0x40, "RTI", 1, 6, types.NoneAddressing),
    // RTS (Return from Subroutine)
    CpuInstruction(0x60, "RTS", 1, 6, types.NoneAddressing),
    // SBC (Subtract with Carry)
    CpuInstruction(0xE9, "SBC", 2, 2, types.Immediate),
    CpuInstruction(0xE5, "SBC", 2, 3, types.ZeroPage),
    CpuInstruction(0xF5, "SBC", 2, 4, types.ZeroPageX),
    CpuInstruction(0xED, "SBC", 3, 4, types.Absolute),
    CpuInstruction(0xFD, "SBC", 3, 4, types.AbsoluteX),
    CpuInstruction(0xF9, "SBC", 3, 4, types.AbsoluteY),
    CpuInstruction(0xE1, "SBC", 2, 6, types.IndirectX),
    CpuInstruction(0xF1, "SBC", 2, 5, types.IndirectY),
    // SEC (Set Carry Flag)
    CpuInstruction(0x38, "SEC", 1, 2, types.NoneAddressing),
    // SED (Set Decimal Flag)
    CpuInstruction(0xF8, "SED", 1, 2, types.NoneAddressing),
    // SEI (Set Interrupt Disable)
    CpuInstruction(0x78, "SEI", 1, 2, types.NoneAddressing),
    // STA (Store Accumulator)
    CpuInstruction(0x85, "STA", 2, 3, types.ZeroPage),
    CpuInstruction(0x95, "STA", 2, 4, types.ZeroPageX),
    CpuInstruction(0x8D, "STA", 3, 4, types.Absolute),
    CpuInstruction(0x9D, "STA", 3, 5, types.AbsoluteX),
    CpuInstruction(0x99, "STA", 3, 5, types.AbsoluteY),
    CpuInstruction(0x81, "STA", 2, 6, types.IndirectX),
    CpuInstruction(0x91, "STA", 2, 6, types.IndirectY),
    // STX (Store X Register)
    CpuInstruction(0x86, "STX", 2, 3, types.ZeroPage),
    CpuInstruction(0x96, "STX", 2, 4, types.ZeroPageY),
    CpuInstruction(0x8E, "STX", 3, 4, types.Absolute),
    // STY (Store Y Register)
    CpuInstruction(0x84, "STY", 2, 3, types.ZeroPage),
    CpuInstruction(0x94, "STY", 2, 4, types.ZeroPageX),
    CpuInstruction(0x8C, "STY", 3, 4, types.Absolute),
    // TAX (Transfer Accumulator to X)
    CpuInstruction(0xAA, "TAX", 1, 2, types.NoneAddressing),
    // TAY (Transfer Accumulator to Y)
    CpuInstruction(0xA8, "TAY", 1, 2, types.NoneAddressing),
    // TSX (Transfer Stack Pointer to X)
    CpuInstruction(0xBA, "TSX", 1, 2, types.NoneAddressing),
    // TXA (Transfer X to Accumulator)
    CpuInstruction(0x8A, "TXA", 1, 2, types.NoneAddressing),
    // TXS (Transfer X to Stack Pointer)
    CpuInstruction(0x9A, "TXS", 1, 2, types.NoneAddressing),
    // TYA (Transfer Y to Accumulator)
    CpuInstruction(0x98, "TYA", 1, 2, types.NoneAddressing),
  ]
}
