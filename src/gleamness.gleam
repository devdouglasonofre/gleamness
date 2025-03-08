import cpu
import gleam/io

pub fn main() {
  let cpu = cpu.get_new_cpu()

  let result_cpu = cpu.run(cpu, [0xa9, 0xc0, 0xaa, 0xe8, 0x00])

  io.debug(result_cpu)
}
