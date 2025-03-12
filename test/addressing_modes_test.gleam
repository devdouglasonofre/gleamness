import cpu
import gleam/int
import gleeunit
import gleeunit/should
import memory
import types

pub fn main() {
  gleeunit.main()
}

// Test LDA with immediate addressing mode
pub fn lda_immediate_test() {
  let cpu = cpu.get_new_cpu()

  // LDA #$42 (Load immediate value $42 into accumulator)
  let result_cpu = cpu.run(cpu, [0xa9, 0x42, 0x00])
  // 0xA9 = LDA immediate, 0x00 = BRK

  result_cpu.register_a
  |> should.equal(0x42)
}

// Test LDA with zero page addressing mode
pub fn lda_zero_page_test() {
  let cpu = cpu.get_new_cpu()
  let memory_addr = 0x42
  let value = 0x84

  // First set up a value at zero page address $42
  let cpu_with_memory = case memory.write(cpu, memory_addr, value) {
    Ok(cpu) -> cpu
    Error(_) -> cpu
  }

  // LDA $42 (Load value at zero page address $42 into accumulator)
  let result_cpu = cpu.run(cpu_with_memory, [0xa5, memory_addr, 0x00])
  // 0xA5 = LDA zero page

  result_cpu.register_a
  |> should.equal(value)
}

// Test LDA with zero page X addressing mode
pub fn lda_zero_page_x_test() {
  let cpu = cpu.get_new_cpu()
  let base_addr = 0x40
  let offset = 0x02
  let value = 0x37
  let memory_addr = base_addr + offset

  // First set up X register with offset and a value at memory location
  let cpu_with_x = types.CPU(..cpu, register_x: offset)
  let cpu_with_memory = case memory.write(cpu_with_x, memory_addr, value) {
    Ok(cpu) -> cpu
    Error(_) -> cpu_with_x
  }

  // LDA $40,X (Load value at zero page address $40+X into accumulator)
  let result_cpu = cpu.run(cpu_with_memory, [0xb5, base_addr, 0x00])
  // 0xB5 = LDA zero page,X

  result_cpu.register_a
  |> should.equal(value)
}

// Test TAX and verify flags are set correctly
pub fn tax_updates_correct_flags_test() {
  let cpu = cpu.get_new_cpu()
  let cpu_with_a = types.CPU(..cpu, register_a: 0x80)
  // Negative value

  // TAX (Transfer A to X)
  let result_cpu = cpu.run(cpu_with_a, [0xaa, 0x00])
  // 0xAA = TAX

  // Check X has value from A
  result_cpu.register_x
  |> should.equal(0x80)

  // Negative flag should be set (bit 7)
  let negative_flag_set = int.bitwise_and(result_cpu.status, 0b10000000) != 0
  negative_flag_set
  |> should.equal(True)
}
