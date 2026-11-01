// One-off: draws the PWA icons (a tree glyph on a teal tile) with no image library. `npx tsx scripts/make-icons.ts`
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

// Tree glyph in a 64-unit box: three nodes joined by a trunk and two branches (same artwork as public/favicon.svg).
const NODES: [number, number][] = [[32, 15], [15, 49], [49, 49]];
const NODE_R = 5.5 + 2.5; // node radius plus half the 5-unit stroke, so each ring is drawn as a filled-outline disc
const SEGS: [number, number, number, number][] = [[32, 20.5, 32, 31.5], [32, 31.5, 18, 44], [32, 31.5, 46, 44]];
const distSeg = (px: number, py: number, [ax, ay, bx, by]: [number, number, number, number]) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
/** 1 where the white glyph is drawn: a ring per node (outer radius 8, inner 3) and 5-unit lines. */
function glyph(u: number, v: number): boolean {
  for (const [cx, cy] of NODES) {
    const d = Math.hypot(u - cx, v - cy);
    if (d <= NODE_R && d >= 3) return true;
  }
  return SEGS.some((sg) => distSeg(u, v, sg) <= 2.5);
}

function png(size: number, inset: number, round: boolean): Buffer {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const SS = 3; // supersampling for smooth edges
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const fx = (x + (sx + 0.5) / SS) / size, fy = (y + (sy + 0.5) / SS) / size;
        if (round) { // rounded tile corners
          const rad = 0.22, qx = Math.max(Math.abs(fx - 0.5) - (0.5 - rad), 0), qy = Math.max(Math.abs(fy - 0.5) - (0.5 - rad), 0);
          if (Math.hypot(qx, qy) > rad) continue;
        }
        const t = (fx + fy) / 2;
        const white = glyph(((fx - 0.5) / (1 - 2 * inset) + 0.5) * 64, ((fy - 0.5) / (1 - 2 * inset) + 0.5) * 64);
        r += white ? 255 : 20 + (7 - 20) * t; g += white ? 255 : 163 + (84 - 163) * t; b += white ? 255 : 133 + (68 - 133) * t; a += 255;
      }
      const n = SS * SS, o = y * (size * 4 + 1) + 1 + x * 4;
      const cov = a / (255 * n) || 1;
      raw[o] = Math.round(r / (n * cov)); raw[o + 1] = Math.round(g / (n * cov)); raw[o + 2] = Math.round(b / (n * cov)); raw[o + 3] = Math.round(a / n);
    }
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4);
  head[8] = 8; head[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

writeFileSync('public/icon-192.png', png(192, 0.14, true));
writeFileSync('public/icon-512.png', png(512, 0.14, true));
writeFileSync('public/icon-maskable-512.png', png(512, 0.26, false)); // artwork inside the maskable safe zone
console.log('icons written');
