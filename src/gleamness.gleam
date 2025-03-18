import emulation/cpu
import emulation/memory
import emulation/rom
import emulation/screen.{type ScreenState}
import emulation/types.{type CPU}
import gleam/dict
import gleam/dynamic
import gleam/dynamic/decode.{type Dynamic}
import gleam/int
import gleam/io
import gleam/javascript/array
import gleam/option.{type Option}
import iv
import lustre
import lustre/attribute
import lustre/effect.{type Effect}
import lustre/element.{type Element}
import lustre/element/html

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

@external(javascript, "./ffi.mjs", "window_add_event_listener")
fn window_add_event_listener(name: String, handler: fn(Dynamic) -> a) -> Nil

@external(javascript, "./ffi.mjs", "setup_file_input_listener")
fn do_setup_file_input_listener(
  selector: String,
  handler: fn(array.Array(Int)) -> Nil,
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
  CpuTick
  ScreenTick
  KeyDown(String)
  KeyUp(String)
  ContextReady(Dynamic)
  Mounted
  LoadRom(List(Int))
}

pub fn init(_flags: Nil) -> #(Model, effect.Effect(Msg)) {
  let new_cpu = cpu.get_new_cpu()

  #(
    Model(
      cpu: new_cpu,
      window_width: 32,
      window_height: 32,
      scale: 10,
      key_pressed: iv.from_list([]),
      canvas_ctx: option.None,
      texture: option.None,
      screen_state: screen.new_screen_state(),
    ),
    // Run CPU instructions every 1ms, and update screen every 16ms (60fps)
    effect.none(),
  )
}

pub fn update(model: Model, msg: Msg) -> #(Model, effect.Effect(Msg)) {
  case msg {
    Mounted -> #(model, init_canvas())

    CpuTick -> {
      // Execute multiple CPU instructions per tick
      // First write a random number to memory location 0xFE
      // The snake game expects a number between 1 and 16
      let random_value = int.bitwise_and(int.random(20), 0x0F) + 1
      let new_cpu = case memory.write(model.cpu, 0xFE, random_value) {
        Ok(cpu) -> cpu
        Error(_) -> model.cpu
      }

      // Run multiple CPU cycles (e.g., 100 instructions per tick)
      let new_cpu = do_cpu_cycles(new_cpu, 100)
      #(Model(..model, cpu: new_cpu), effect.none())
    }

    ScreenTick -> {
      // Handle screen refresh separately from CPU execution
      case model.canvas_ctx, model.texture {
        option.Some(ctx), option.Some(texture) -> {
          let new_screen_state =
            screen.read_screen_state(model.cpu, model.screen_state)

          case new_screen_state.changed {
            True -> {
              do_update_texture_with_frame(
                texture,
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

    LoadRom(rom_data) -> {
      // Parse the ROM data using the rom module
      case rom.new(iv.from_list(rom_data)) {
        Ok(parsed_rom) -> {
          // Create a new CPU with the parsed ROM
          let new_cpu = cpu.get_new_cpu_with_rom(parsed_rom)

          // Reset the CPU to start program execution
          let reset_cpu = case cpu.reset(new_cpu) {
            Ok(reset) -> reset
            Error(_) -> new_cpu
          }

          #(
            Model(..model, cpu: reset_cpu),
            effect.batch([
              every(1, CpuTick),
              every(16, ScreenTick),
              render_effect(Mounted),
            ]),
          )
        }
        Error(_) -> {
          // If ROM parsing fails, keep the current CPU
          // In a real app, you might want to display the error to the user
          #(model, effect.none())
        }
      }
    }
  }
}

// Helper function to run multiple CPU cycles
fn do_cpu_cycles(initial_cpu: CPU, count: Int) -> CPU {
  case count {
    0 -> initial_cpu
    n -> {
      let next_cpu = cpu.run(initial_cpu, fn(cur_cpu) { cur_cpu })
      do_cpu_cycles(next_cpu, n - 1)
    }
  }
}

pub fn handle_key_event(event: Dynamic, dispatch: fn(Msg) -> Nil) -> Nil {
  let key_result = dynamic.field("key", dynamic.string)(event)
  case key_result {
    Ok(key) -> {
      case dynamic.field("type", dynamic.string)(event) {
        Ok("keydown") -> dispatch(KeyDown(key))
        Ok("keyup") -> dispatch(KeyUp(key))
        _ -> Nil
      }
      Nil
    }
    _ -> Nil
  }
}

pub fn view(model: Model) -> Element(Msg) {
  let width = model.window_width * model.scale
  let height = model.window_height * model.scale

  html.div([attribute.style([#("outline", "none")])], [
    html.canvas([
      attribute.id("canvas"),
      attribute.width(width),
      attribute.height(height),
    ]),
    html.input([
      attribute.id("input_file"),
      attribute.type_("file"),
      attribute.title("Load ROM"),
    ]),
  ])
}

pub fn main() {
  let app = lustre.application(init, update, view)
  let assert Ok(to_runtime) = lustre.start(app, "#app", Nil)

  // Add window-level keyboard event listeners
  window_add_event_listener("keydown", fn(event) {
    handle_key_event(event, fn(msg) { lustre.dispatch(msg) |> to_runtime })
  })

  window_add_event_listener("keyup", fn(event) {
    handle_key_event(event, fn(msg) { lustre.dispatch(msg) |> to_runtime })
  })

  // Setup file input listener for ROM loading
  do_setup_file_input_listener("#input_file", fn(rom_data) {
    let msg = LoadRom(array.to_list(rom_data))
    lustre.dispatch(msg) |> to_runtime
  })

  Nil
}
