import emulation/cpu
import emulation/memory
import emulation/screen.{type ScreenState}
import emulation/types.{type CPU}
import gleam/dynamic/decode.{type Dynamic}
import gleam/int
import gleam/io
import gleam/list
import gleam/option.{type Option}
import iv
import lustre
import lustre/attribute
import lustre/effect.{type Effect}
import lustre/element.{type Element}
import lustre/element/html
import lustre/event

// FFI imports
@external(javascript, "./ffi.mjs", "every")
fn do_every(interval: Int, cb: fn() -> Nil) -> Nil

@external(javascript, "./ffi.mjs", "getCanvasContext")
fn do_get_canvas_context(selector: String) -> Dynamic

@external(javascript, "./ffi.mjs", "setCanvasScale")
fn do_set_canvas_scale(ctx: Dynamic, scale_x: Float, scale_y: Float) -> Nil

@external(javascript, "./ffi.mjs", "createTexture")
fn do_create_texture(width: Int, height: Int) -> Dynamic

@external(javascript, "./ffi.mjs", "drawTexture")
fn do_draw_texture(ctx: Dynamic, texture: Dynamic, x: Int, y: Int) -> Nil

@external(javascript, "./ffi.mjs", "set_timeout")
fn do_set_timeout(cb: fn() -> Nil, delay: Int) -> Nil

@external(javascript, "./ffi.mjs", "updateTextureWithFrame")
fn do_update_texture_with_frame(
  texture: Dynamic,
  frame_data: List(Int),
  width: Int,
  height: Int,
) -> Nil

fn every(interval: Int, tick: Msg) -> Effect(Msg) {
  effect.from(fn(dispatch) { do_every(interval, fn() { dispatch(tick) }) })
}

fn init_canvas() -> Effect(Msg) {
  effect.from(fn(dispatch) {
    let ctx = do_get_canvas_context("canvas")
    dispatch(ContextReady(ctx))
    Nil
  })
}

fn render_effect(msg: Msg) -> Effect(Msg) {
  effect.from(fn(dispatch) {
    do_set_timeout(fn() { dispatch(msg) }, 0)
    Nil
  })
}

// Model to hold our application state
pub type Model {
  Model(
    cpu: CPU,
    window_width: Int,
    window_height: Int,
    scale: Int,
    key_pressed: iv.Array(String),
    canvas_ctx: Option(Dynamic),
    texture: Option(Dynamic),
    screen_state: ScreenState,
  )
}

// Messages for our update function
pub type Msg {
  Tick
  KeyDown(String)
  KeyUp(String)
  ContextReady(Dynamic)
  Mounted
}

pub fn init(_flags: Nil) -> #(Model, effect.Effect(Msg)) {
  // Create an iv array for the game code instead of a list
  let game_code =
    iv.from_list([
      0x20, 0x06, 0x06, 0x20, 0x38, 0x06, 0x20, 0x0d, 0x06, 0x20, 0x2a, 0x06,
      0x60, 0xa9, 0x02, 0x85, 0x02, 0xa9, 0x04, 0x85, 0x03, 0xa9, 0x11, 0x85,
      0x10, 0xa9, 0x10, 0x85, 0x12, 0xa9, 0x0f, 0x85, 0x14, 0xa9, 0x04, 0x85,
      0x11, 0x85, 0x13, 0x85, 0x15, 0x60, 0xa5, 0xfe, 0x85, 0x00, 0xa5, 0xfe,
      0x29, 0x03, 0x18, 0x69, 0x02, 0x85, 0x01, 0x60, 0x20, 0x4d, 0x06, 0x20,
      0x8d, 0x06, 0x20, 0xc3, 0x06, 0x20, 0x19, 0x07, 0x20, 0x20, 0x07, 0x20,
      0x2d, 0x07, 0x4c, 0x38, 0x06, 0xa5, 0xff, 0xc9, 0x77, 0xf0, 0x0d, 0xc9,
      0x64, 0xf0, 0x14, 0xc9, 0x73, 0xf0, 0x1b, 0xc9, 0x61, 0xf0, 0x22, 0x60,
      0xa9, 0x04, 0x24, 0x02, 0xd0, 0x26, 0xa9, 0x01, 0x85, 0x02, 0x60, 0xa9,
      0x08, 0x24, 0x02, 0xd0, 0x1b, 0xa9, 0x02, 0x85, 0x02, 0x60, 0xa9, 0x01,
      0x24, 0x02, 0xd0, 0x10, 0xa9, 0x04, 0x85, 0x02, 0x60, 0xa9, 0x02, 0x24,
      0x02, 0xd0, 0x05, 0xa9, 0x08, 0x85, 0x02, 0x60, 0x60, 0x20, 0x94, 0x06,
      0x20, 0xa8, 0x06, 0x60, 0xa5, 0x00, 0xc5, 0x10, 0xd0, 0x0d, 0xa5, 0x01,
      0xc5, 0x11, 0xd0, 0x07, 0xe6, 0x03, 0xe6, 0x03, 0x20, 0x2a, 0x06, 0x60,
      0xa2, 0x02, 0xb5, 0x10, 0xc5, 0x10, 0xd0, 0x06, 0xb5, 0x11, 0xc5, 0x11,
      0xf0, 0x09, 0xe8, 0xe8, 0xe4, 0x03, 0xf0, 0x06, 0x4c, 0xaa, 0x06, 0x4c,
      0x35, 0x07, 0x60, 0xa6, 0x03, 0xca, 0x8a, 0xb5, 0x10, 0x95, 0x12, 0xca,
      0x10, 0xf9, 0xa5, 0x02, 0x4a, 0xb0, 0x09, 0x4a, 0xb0, 0x19, 0x4a, 0xb0,
      0x1f, 0x4a, 0xb0, 0x2f, 0xa5, 0x10, 0x38, 0xe9, 0x20, 0x85, 0x10, 0x90,
      0x01, 0x60, 0xc6, 0x11, 0xa9, 0x01, 0xc5, 0x11, 0xf0, 0x28, 0x60, 0xe6,
      0x10, 0xa9, 0x1f, 0x24, 0x10, 0xf0, 0x1f, 0x60, 0xa5, 0x10, 0x18, 0x69,
      0x20, 0x85, 0x10, 0xb0, 0x01, 0x60, 0xe6, 0x11, 0xa9, 0x06, 0xc5, 0x11,
      0xf0, 0x0c, 0x60, 0xc6, 0x10, 0xa5, 0x10, 0x29, 0x1f, 0xc9, 0x1f, 0xf0,
      0x01, 0x60, 0x4c, 0x35, 0x07, 0xa0, 0x00, 0xa5, 0xfe, 0x91, 0x00, 0x60,
      0xa6, 0x03, 0xa9, 0x00, 0x81, 0x10, 0xa2, 0x00, 0xa9, 0x01, 0x81, 0x10,
      0x60, 0xa2, 0x00, 0xea, 0xea, 0xca, 0xd0, 0xfb, 0x60,
    ])

  let new_cpu = cpu.get_new_cpu()
  let cpu_with_game = case
    cpu.load_and_run_with_callback(new_cpu, game_code, fn(cpu) { cpu })
  {
    Ok(loaded_cpu) -> loaded_cpu
    Error(_) -> new_cpu
  }

  #(
    Model(
      cpu: cpu_with_game,
      window_width: 32,
      window_height: 32,
      scale: 10,
      key_pressed: iv.from_list([]),
      // Empty iv array instead of empty list
      canvas_ctx: option.None,
      texture: option.None,
      screen_state: screen.new_screen_state(),
    ),
    effect.batch([every(1600, Tick), render_effect(Mounted)]),
  )
}

pub fn update(model: Model, msg: Msg) -> #(Model, effect.Effect(Msg)) {
  case msg {
    Mounted -> #(model, init_canvas())

    Tick -> {
      case model.canvas_ctx, model.texture {
        option.Some(ctx), option.Some(texture) -> {
          let new_screen_state =
            screen.read_screen_state(model.cpu, model.screen_state)

          case new_screen_state.changed {
            True -> {
              do_update_texture_with_frame(
                texture,
                // Use the CPU memory as an iv array instead of a list
                iv.to_list(new_screen_state.frame),
                model.window_width,
                model.window_height,
              )
              do_draw_texture(ctx, texture, 0, 0)
            }
            False -> Nil
          }

          #(Model(..model, screen_state: new_screen_state), effect.none())
        }
        _, _ -> #(model, effect.none())
      }
    }

    ContextReady(ctx) -> {
      do_set_canvas_scale(
        ctx,
        int.to_float(model.scale),
        int.to_float(model.scale),
      )
      let texture = do_create_texture(model.window_width, model.window_height)
      #(
        Model(
          ..model,
          canvas_ctx: option.Some(ctx),
          texture: option.Some(texture),
        ),
        effect.none(),
      )
    }

    KeyDown(key) -> {
      let cpu = case key {
        "w" -> {
          let assert Ok(new_cpu) = memory.write(model.cpu, 0xFF, 0x77)
          new_cpu
        }
        "s" -> {
          let assert Ok(new_cpu) = memory.write(model.cpu, 0xFF, 0x73)
          new_cpu
        }
        "a" -> {
          let assert Ok(new_cpu) = memory.write(model.cpu, 0xFF, 0x61)
          new_cpu
        }
        "d" -> {
          let assert Ok(new_cpu) = memory.write(model.cpu, 0xFF, 0x64)
          new_cpu
        }
        _ -> model.cpu
      }
      #(
        Model(
          ..model,
          cpu: cpu,
          key_pressed: iv.prepend(model.key_pressed, key),
        ),
        effect.none(),
      )
    }

    KeyUp(key) -> {
      // Filter using iv operations instead of list operations
      let updated_keys = iv.filter(model.key_pressed, fn(k) { k != key })
      #(Model(..model, key_pressed: updated_keys), effect.none())
    }
  }
}

pub fn view(model: Model) -> Element(Msg) {
  let width = model.window_width * model.scale
  let height = model.window_height * model.scale

  html.div(
    [
      event.on_keydown(KeyDown),
      event.on_keyup(KeyUp),
      attribute.style([#("outline", "none")]),
    ],
    [html.canvas([attribute.width(width), attribute.height(height)])],
  )
}

pub fn main() {
  let app = lustre.application(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)
  Nil
}
