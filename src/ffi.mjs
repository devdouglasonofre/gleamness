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

export function clearTexture(texture, r, g, b) {
  if (!texture || !texture.ctx) return;
  texture.ctx.fillStyle = `rgb(${r},${g},${b})`;
  texture.ctx.fillRect(0, 0, texture.canvas.width, texture.canvas.height);
}

export function setPixel(texture, x, y, r, g, b) {
  if (!texture || !texture.ctx) return;
  texture.ctx.fillStyle = `rgb(${r},${g},${b})`;
  texture.ctx.fillRect(x, y, 1, 1);
}