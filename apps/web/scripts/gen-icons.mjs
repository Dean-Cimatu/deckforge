/**
 * Generates pwa-192.png and pwa-512.png in public/.
 * Draws a dark square with a white "D" glyph using pure Node — no native deps.
 */
import { createWriteStream } from 'fs';
import { createDeflate } from 'zlib';
import { Writable } from 'stream';

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  return Buffer.concat([u32(data.length), body, u32(crc32(body))]);
}

async function deflate(data) {
  return new Promise((res, rej) => {
    const bufs = [];
    const d = createDeflate({ level: 6 });
    d.on('data', (c) => bufs.push(c));
    d.on('end', () => res(Buffer.concat(bufs)));
    d.on('error', rej);
    d.end(data);
  });
}

// Draw a simple icon: dark bg (#1a1a1a), white rounded-ish "D"
async function buildPng(size) {
  const pixels = Buffer.alloc(size * size * 4);

  const bg = { r: 0x0f, g: 0x0f, b: 0x0f, a: 255 };
  const fg = { r: 0xff, g: 0xff, b: 0xff, a: 255 };
  const accent = { r: 0x7c, g: 0x3a, b: 0xed, a: 255 }; // purple accent

  function setPixel(x, y, c) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = c.r; pixels[i + 1] = c.g; pixels[i + 2] = c.b; pixels[i + 3] = c.a;
  }

  // Fill background
  for (let i = 0; i < size * size * 4; i += 4) {
    pixels[i] = bg.r; pixels[i + 1] = bg.g; pixels[i + 2] = bg.b; pixels[i + 3] = bg.a;
  }

  // Draw rounded rectangle for background card (accent color)
  const pad = Math.round(size * 0.12);
  const r = Math.round(size * 0.18);
  const x0 = pad, y0 = pad, x1 = size - pad - 1, y1 = size - pad - 1;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      // corner rounding: check distance to nearest corner center
      const inCornerTL = x < x0 + r && y < y0 + r;
      const inCornerTR = x > x1 - r && y < y0 + r;
      const inCornerBL = x < x0 + r && y > y1 - r;
      const inCornerBR = x > x1 - r && y > y1 - r;

      if (inCornerTL) {
        const dx = x - (x0 + r), dy = y - (y0 + r);
        if (dx * dx + dy * dy > r * r) continue;
      } else if (inCornerTR) {
        const dx = x - (x1 - r), dy = y - (y0 + r);
        if (dx * dx + dy * dy > r * r) continue;
      } else if (inCornerBL) {
        const dx = x - (x0 + r), dy = y - (y1 - r);
        if (dx * dx + dy * dy > r * r) continue;
      } else if (inCornerBR) {
        const dx = x - (x1 - r), dy = y - (y1 - r);
        if (dx * dx + dy * dy > r * r) continue;
      }
      setPixel(x, y, accent);
    }
  }

  // Draw "D" letterform (scaled to size)
  const cx = size / 2, cy = size / 2;
  const lh = size * 0.44; // letter height
  const lw = size * 0.28; // letter width
  const sw = Math.max(2, Math.round(size * 0.07)); // stroke width

  const lx = cx - lw * 0.45;
  const ly = cy - lh / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x - lx, ny = y - ly;
      // Vertical bar of D
      if (nx >= 0 && nx < sw && ny >= 0 && ny < lh) {
        setPixel(x, y, fg);
        continue;
      }
      // Top horizontal
      if (nx >= 0 && nx < lw * 0.75 && ny >= 0 && ny < sw) {
        setPixel(x, y, fg);
        continue;
      }
      // Bottom horizontal
      if (nx >= 0 && nx < lw * 0.75 && ny >= lh - sw && ny < lh) {
        setPixel(x, y, fg);
        continue;
      }
      // Curved right side: approximate with thick arc
      const arcCx = lx + sw / 2;
      const arcCy = ly + lh / 2;
      const outerR = lw * 0.82;
      const innerR = outerR - sw;
      const dx = x - arcCx, dy = y - arcCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= innerR && dist <= outerR && dx > 0 && Math.abs(dy) < lh / 2 - sw * 0.3) {
        setPixel(x, y, fg);
      }
    }
  }

  // Build PNG scanlines (filter byte 0 = None per row)
  const rowSize = size * 4;
  const raw = Buffer.alloc(size * (rowSize + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (rowSize + 1)] = 0; // filter none
    pixels.copy(raw, y * (rowSize + 1) + 1, y * rowSize, (y + 1) * rowSize);
  }

  const compressed = await deflate(raw);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB — wait, we have alpha, use 6
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const sizes = [192, 512];
for (const size of sizes) {
  const png = await buildPng(size);
  const dest = `public/pwa-${size}.png`;
  await new Promise((res, rej) => {
    const ws = createWriteStream(dest);
    ws.on('finish', res);
    ws.on('error', rej);
    ws.end(png);
  });
  console.log(`wrote ${dest} (${png.length} bytes)`);
}

// Also write a simple favicon.ico (16x16 BMP wrapped — just copy the 192 icon approach as 32px PNG renamed)
const favicon = await buildPng(32);
await new Promise((res, rej) => {
  const ws = createWriteStream('public/favicon.ico');
  ws.on('finish', res);
  ws.on('error', rej);
  ws.end(favicon);
});
console.log('wrote public/favicon.ico');
