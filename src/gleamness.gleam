import emulation/cpu
import emulation/types.{type CPU}
import gleam/dynamic/decode.{type Dynamic}
import gleam/int
import gleam/list
import gleam/option.{type Option}
import gleam/result
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

@external(javascript, "./ffi.mjs", "clearTexture")
fn do_clear_texture(texture: Dynamic, r: Int, g: Int, b: Int) -> Nil

@external(javascript, "./ffi.mjs", "set_timeout")
fn do_set_timeout(cb: fn() -> Nil, delay: Int) -> Nil

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
    key_pressed: List(String),
    canvas_ctx: Option(Dynamic),
    texture: Option(Dynamic),
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
  let game_code = [0x20, 0x06]
  let new_cpu = cpu.get_new_cpu()
  let cpu_with_game = case cpu.load(new_cpu, game_code) {
    Ok(loaded_cpu) -> loaded_cpu
    Error(_) -> new_cpu
  }

  #(
    Model(
      cpu: cpu_with_game,
      window_width: 32,
      window_height: 32,
      scale: 10,
      key_pressed: [],
      canvas_ctx: option.None,
      texture: option.None,
    ),
    effect.batch([every(16, Tick), render_effect(Mounted)]),
  )
}

pub fn update(model: Model, msg: Msg) -> #(Model, effect.Effect(Msg)) {
  case msg {
    Mounted -> #(model, init_canvas())

    Tick -> {
      case model.canvas_ctx, model.texture {
        option.Some(ctx), option.Some(texture) -> {
          do_clear_texture(texture, 0, 0, 0)
          do_draw_texture(ctx, texture, 0, 0)
        }
        _, _ -> Nil
      }
      #(model, effect.none())
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

    KeyDown(key) -> #(
      Model(..model, key_pressed: [key, ..model.key_pressed]),
      effect.none(),
    )

    KeyUp(key) -> {
      let updated_keys = list.filter(model.key_pressed, fn(k) { k != key })
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
