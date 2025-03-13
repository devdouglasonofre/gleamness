import emulation/memory
import emulation/types.{type CPU}
import gleam/list

pub type Color {
  Color(r: Int, g: Int, b: Int)
}

pub type ScreenState {
  ScreenState(frame: List(Int), changed: Bool)
}

pub fn new_screen_state() -> ScreenState {
  ScreenState(frame: list.repeat(0, 32 * 32 * 3), changed: False)
}

pub fn get_color(byte: Int) -> Color {
  case byte {
    0 -> Color(r: 0, g: 0, b: 0)
    // BLACK
    1 -> Color(r: 255, g: 255, b: 255)
    // WHITE
    2 | 9 -> Color(r: 128, g: 128, b: 128)
    // GREY
    3 | 10 -> Color(r: 255, g: 0, b: 0)
    // RED
    4 | 11 -> Color(r: 0, g: 255, b: 0)
    // GREEN
    5 | 12 -> Color(r: 0, g: 0, b: 255)
    // BLUE
    6 | 13 -> Color(r: 255, g: 0, b: 255)
    // MAGENTA
    7 | 14 -> Color(r: 255, g: 255, b: 0)
    // YELLOW
    _ -> Color(r: 0, g: 255, b: 255)
    // CYAN
  }
}

fn update_frame_slice(frame: List(Int), idx: Int, value: Int) -> List(Int) {
  let before = list.take(frame, idx)
  let after = list.drop(frame, idx + 1)
  list.append(before, [value, ..after])
}

fn update_frame_with_color(
  frame: List(Int),
  frame_idx: Int,
  color: Color,
) -> List(Int) {
  frame
  |> fn(f) { update_frame_slice(f, frame_idx, color.r) }
  |> fn(f) { update_frame_slice(f, frame_idx + 1, color.g) }
  |> fn(f) { update_frame_slice(f, frame_idx + 2, color.b) }
}

fn get_current_colors(frame: List(Int), idx: Int) -> List(Int) {
  case list.drop(frame, idx) {
    [r, g, b, ..] -> [r, g, b]
    _ -> []
  }
}

pub fn read_screen_state(cpu: CPU, state: ScreenState) -> ScreenState {
  let new_frame =
    list.range(0x0200, 0x600)
    |> list.fold(from: #(state.frame, False), with: fn(acc, addr) {
      let #(frame, _) = acc
      case memory.read(cpu, addr) {
        Ok(color_idx) -> {
          let color = get_color(color_idx)
          let frame_idx = { addr - 0x0200 } * 3

          let current_colors = get_current_colors(frame, frame_idx)
          case current_colors {
            [old_r, old_g, old_b]
              if old_r == color.r && old_g == color.g && old_b == color.b
            -> acc
            _ -> {
              let new_frame = update_frame_with_color(frame, frame_idx, color)
              #(new_frame, True)
            }
          }
        }
        Error(_) -> acc
      }
    })

  let #(frame, changed) = new_frame
  ScreenState(frame: frame, changed: changed)
}
