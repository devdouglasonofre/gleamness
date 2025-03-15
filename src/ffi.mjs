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
  console.log(frameData)
  frameData = [...frameData]
  console.log(frameData.filter(v => v !== 0));
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