import cpu
import gleeunit
import gleeunit/should

pub fn main() {
  gleeunit.main()
}

// gleeunit test functions end in `_test`
pub fn hello_world_test() {
  1
  |> should.equal(1)
}

pub fn test_5_ops_working_together_test() {
  let cpu = cpu.get_new_cpu()

  let result_cpu = cpu.interpret(cpu, [0xa9, 0xc0, 0xaa, 0xe8, 0x00])

  result_cpu.register_x
  |> should.equal(0xc1)
}
