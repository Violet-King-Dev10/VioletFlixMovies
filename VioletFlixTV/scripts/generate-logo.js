const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUTPUT_PATH = path.join(__dirname, '..', 'assets', 'generated', 'violetflixtv-logo.png');
const SIZE = 1024;

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function blend(base, overlay, alpha) {
  return Math.round(base * (1 - alpha) + overlay * alpha);
}

function setPixel(data, offset, color) {
  data[offset] = color[0];
  data[offset + 1] = color[1];
  data[offset + 2] = color[2];
  data[offset + 3] = color[3];
}

function roundedRect(x, y, w, h, r, px, py) {
  const cx = px < x + r ? x + r : px > x + w - r ? x + w - r : px;
  const cy = py < y + r ? y + r : py > y + h - r ? y + h - r : py;
  return (px - cx) ** 2 + (py - cy) ** 2 <= r ** 2;
}

function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const s = ((ay - cy) * (px - cx) + (cx - ax) * (py - cy)) / area;
  const t = ((cy - by) * (px - cx) + (bx - cx) * (py - cy)) / area;
  const u = 1 - s - t;
  return s >= 0 && t >= 0 && u >= 0;
}

function makePng() {
  const rowBytes = SIZE * 4 + 1;
  const raw = Buffer.alloc(rowBytes * SIZE);

  for (let y = 0; y < SIZE; y += 1) {
    raw[y * rowBytes] = 0;
    for (let x = 0; x < SIZE; x += 1) {
      const offset = y * rowBytes + 1 + x * 4;
      const nx = x / (SIZE - 1);
      const ny = y / (SIZE - 1);
      let r = blend(17, 45, nx * ny);
      let g = blend(24, 11, nx * ny);
      let b = blend(39, 19, nx * ny);

      const dx = x - SIZE / 2;
      const dy = y - SIZE / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 330) {
        r = blend(r, 255, 0.06);
        g = blend(g, 255, 0.06);
        b = blend(b, 255, 0.06);
      }

      const card = roundedRect(238, 239, 548, 546, 86, x, y);
      if (card) {
        r = blend(r, 15, 0.88);
        g = blend(g, 23, 0.88);
        b = blend(b, 42, 0.88);
      }

      if (card && ((x > 306 && x < 342) || (x > 682 && x < 718))) {
        r = blend(r, 255, 0.18);
        g = blend(g, 255, 0.18);
        b = blend(b, 255, 0.18);
      }

      const sprocketRows = [318, 476, 634];
      for (const sy of sprocketRows) {
        if (roundedRect(272, sy, 74, 74, 18, x, y) || roundedRect(678, sy, 74, 74, 18, x, y)) {
          r = blend(r, 255, 0.34);
          g = blend(g, 255, 0.34);
          b = blend(b, 255, 0.34);
        }
      }

      if (dist < 174) {
        const a = Math.min(1, dist / 174);
        r = blend(255, 229, a);
        g = blend(77, 9, a);
        b = blend(103, 20, a);
      }

      if (inTriangle(x, y, 466, 386, 658, 512, 466, 638)) {
        r = 255;
        g = 255;
        b = 255;
      }

      setPixel(raw, offset, [r, g, b, 255]);
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function ensureLogo() {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, makePng());
  return OUTPUT_PATH;
}

if (require.main === module) {
  const output = ensureLogo();
  console.log(`Generated ${path.relative(process.cwd(), output)}`);
}

module.exports = { ensureLogo, outputPath: OUTPUT_PATH };
