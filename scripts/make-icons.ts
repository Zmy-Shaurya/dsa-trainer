// One-off: draws the PWA icons (three bars on a dark tile) with no image library. `npx tsx scripts/make-icons.ts`
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (b: Buffer) => {
  let c = 0xffffffff;
  for (const x of b) c = crcTable[(c ^ x) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};

function png(size: number, inset: number): Buffer {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const bars = [0.3, 0.55, 0.8]; // heights of the three bars
  const area = size * (1 - 2 * inset);
  const x0 = size * inset;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let rgb = [20, 20, 20];
      const u = (x - x0) / area;
      const v = (y - x0) / area;
      bars.forEach((h, i) => {
        const left = 0.1 + i * 0.3;
        if (u >= left && u < left + 0.2 && v >= 0.9 - h && v < 0.9) rgb = [108, 140, 255];
      });
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = rgb[0]!; raw[o + 1] = rgb[1]!; raw[o + 2] = rgb[2]!; raw[o + 3] = 255;
    }
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4);
  head[8] = 8; head[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

writeFileSync('public/icon-192.png', png(192, 0.1));
writeFileSync('public/icon-512.png', png(512, 0.1));
writeFileSync('public/icon-maskable-512.png', png(512, 0.2)); // artwork inside the maskable safe zone
console.log('icons written');
