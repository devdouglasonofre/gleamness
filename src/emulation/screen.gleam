import emulation/memory
import emulation/types.{type CPU}
import gleam/io
import iv

pub type Color {
  Black
  White
  Grey
  Red
  Green
  Blue
  Magenta
  Yellow
  Cyan
}

pub type ScreenState {
  ScreenState(frame: iv.Array(Int), changed: Bool)
}

pub fn new_screen_state() -> ScreenState {
  ScreenState(frame: iv.repeat(0, 32 * 32 * 3), changed: False)
}

pub fn get_color(byte: Int) -> Color {
  case byte {
    0 -> Black
    1 -> White
    2 | 9 -> Grey
    3 | 10 -> Red
    4 | 11 -> Green
    5 | 12 -> Blue
    6 | 13 -> Magenta
    7 | 14 -> Yellow
    _ -> Cyan
  }
}

fn color_to_rgb(color: Color) -> #(Int, Int, Int) {
  case color {
    Black -> #(0, 0, 0)
    White -> #(255, 255, 255)
    Grey -> #(128, 128, 128)
    Red -> #(255, 0, 0)
    Green -> #(0, 255, 0)
    Blue -> #(0, 0, 255)
    Magenta -> #(255, 0, 255)
    Yellow -> #(255, 255, 0)
    Cyan -> #(0, 255, 255)
  }
}

fn update_frame_slice(
  frame: iv.Array(Int),
  frame_idx: Int,
  color: Color,
) -> iv.Array(Int) {
  let #(r, g, b) = color_to_rgb(color)
  frame
  |> iv.try_set(frame_idx, r)
  |> iv.try_set(frame_idx + 1, g)
  |> iv.try_set(frame_idx + 2, b)
}

fn get_current_colors(frame: iv.Array(Int), idx: Int) -> #(Int, Int, Int) {
  let r = case iv.get(frame, idx) {
    Ok(v) -> v
    Error(_) -> 0
  }
  let g = case iv.get(frame, idx + 1) {
    Ok(v) -> v
    Error(_) -> 0
  }
  let b = case iv.get(frame, idx + 2) {
    Ok(v) -> v
    Error(_) -> 0
  }
  #(r, g, b)
}

pub fn read_screen_state(cpu: CPU, state: ScreenState) -> ScreenState {
  io.debug(iv.to_list(state.frame))

  let new_frame =
    iv.range(0x0200, 0x600)
    |> iv.fold(from: #(state.frame, False), with: fn(acc, addr) {
      let #(frame, _) = acc
      case memory.read(cpu, addr) {
        Ok(color_idx) -> {
          let color = get_color(color_idx)
          let frame_idx = { addr - 0x0200 } * 3

          let #(old_r, old_g, old_b) = get_current_colors(frame, frame_idx)
          let #(new_r, new_g, new_b) = color_to_rgb(color)

          case old_r == new_r && old_g == new_g && old_b == new_b {
            True -> acc
            False -> {
              let new_frame = update_frame_slice(frame, frame_idx, color)
              #(new_frame, True)
            }
          }
        }
        Error(_) -> acc
      }
    })

  let #(frame, changed) = new_frame
  ScreenState(frame: frame, changed: changed || state.changed)
}
