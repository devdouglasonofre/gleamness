import emulation/cpu
import lustre
import lustre/element

pub fn main() {
  cpu.get_new_cpu()
  let app = lustre.element(element.text("Hello, world!"))
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}
