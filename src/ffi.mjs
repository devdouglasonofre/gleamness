export function every(interval, cb) {
  window.setInterval(cb, interval);
}

export function set_timeout(cb, delay) {
  window.setTimeout(cb, delay);
}

export function getCanvasContext(canvasId) {
  const canvas = document.querySelector(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

export function setCanvasScale(ctx, scaleX, scaleY) {
  if (!ctx) return;
  ctx.scale(scaleX, scaleY);
}

export function createTexture(width, height) {
  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d');
  return { canvas: offscreen, ctx };
}

export function drawTexture(ctx, texture, x, y) {
  if (!ctx || !texture) return;
  ctx.drawImage(texture.canvas, x, y);
}

export function setPixel(texture, x, y, r, g, b) {
  if (!texture || !texture.ctx) return;
  texture.ctx.fillStyle = `rgb(${r},${g},${b})`;
  texture.ctx.fillRect(x, y, 1, 1);
}

export function updateTextureWithFrame(texture, frameData, width, height) {
  frameData = [...frameData]
  if (!texture || !texture.ctx) return;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const frameIdx = (y * width + x) * 3;
      const r = frameData[frameIdx];
      const g = frameData[frameIdx + 1];
      const b = frameData[frameIdx + 2];
      texture.ctx.fillStyle = `rgb(${r},${g},${b})`;
      texture.ctx.fillRect(x, y, 1, 1);
    }
  }
}

export function window_add_event_listener(name, handler) {
  window.addEventListener(name, handler);
}

export function setup_file_input_listener(inputId, handler) {
  setTimeout(() => {
    const fileInput = document.querySelector(inputId);
    if (!fileInput) return;
    
    fileInput.addEventListener("input", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        console
        e.target.files[0].arrayBuffer().then((fileBuffer) => {
          const fileData = new Uint8Array(fileBuffer);
          const dataArray = Array.from(fileData);
          handler(dataArray);
        });
      }
    });
  }, 0);
}