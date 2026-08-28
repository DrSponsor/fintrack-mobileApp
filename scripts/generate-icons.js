#!/usr/bin/env node
'use strict';
/**
 * Generates the app icon set for the "Ledger" design language.
 *
 *   node scripts/generate-icons.js          # writes into ./assets
 *   node scripts/generate-icons.js --check  # verifies without writing
 *
 * ── The mark ──────────────────────────────────────────────────────────────
 * A ledger page. Ragged descriptions on the left at the weight the app gives
 * secondary text, a column rule, and amounts locked to a common right edge at
 * full paper. Amount lengths vary because real amounts do; identical bars read
 * as a wireframe rather than as money.
 *
 * No letterform, deliberately: the product name is still unsettled, and a mark
 * built from a letter would have to be redrawn the day it changes. No jade or
 * clay either — those two hues mean direction of money everywhere else in the
 * app, and an icon is brand, not a transaction.
 *
 * ── Why this is generated rather than drawn ───────────────────────────────
 * The mark is defined by the palette and by a handful of measurements, both of
 * which live in the design system. Generating it means a palette change is a
 * one-line edit and a re-run, not a round trip through a drawing tool — the
 * same reason scripts/download-fonts.js exists.
 *
 * There is no image dependency: the mark is axis-aligned rectangles, so pixel
 * coverage is computed as exact area overlap. That anti-aliases more cleanly
 * than supersampling and keeps this script runnable on a bare checkout.
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── Palette ───────────────────────────────────────────────────────────────
// Mirrors colors.action.base and colors.surface.base in src/design-system.
const PAPER = [240, 237, 230];   // #F0EDE6
const GROUND = [8, 11, 18];      // #080B12

// ── Geometry, in a nominal 1024 square centred on the origin ──────────────
const MARK = {
  thickness: 58,
  pitch: 160,
  ruleX: 74,
  ruleWidth: 18,
  ruleOverhang: 50,
  ruleAlpha: 0.6,
  /** Right end of each description bar — ragged, as names are. */
  descriptions: [-35, 15, -145],
  /** Left start of each amount bar; all end at `edge`, as amounts do. */
  amounts: [155, 125, 175],
  edge: 350,
  /** The secondary-text relationship, applied to the description column. */
  dim: 0.4,
};

const HALF_W = MARK.edge;
const HALF_H = MARK.pitch + MARK.thickness / 2 + MARK.ruleOverhang;

/** Android masks adaptive icons to a circle of ~66%, so the mark must fit a
 *  radius of 341 in the 1024 square. */
const ADAPTIVE_SCALE = Math.round((341 / Math.hypot(HALF_W, HALF_H)) * 100) / 100;

// ── PNG encoding ──────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing ───────────────────────────────────────────────────────────────
function createCanvas(size, background) {
  const buf = Buffer.alloc(size * size * 4);
  if (background) {
    for (let i = 0; i < size * size; i++) {
      buf[i * 4] = background[0];
      buf[i * 4 + 1] = background[1];
      buf[i * 4 + 2] = background[2];
      buf[i * 4 + 3] = 255;
    }
  }
  return { size, buf };
}

/** Source-over composite of an axis-aligned rect, with exact edge coverage. */
function rect(canvas, x0, y0, x1, y1, rgb, alpha) {
  const { size, buf } = canvas;
  const pxStart = Math.max(0, Math.floor(x0));
  const pxEnd = Math.min(size, Math.ceil(x1));
  const pyStart = Math.max(0, Math.floor(y0));
  const pyEnd = Math.min(size, Math.ceil(y1));
  for (let py = pyStart; py < pyEnd; py++) {
    const coverY = Math.max(0, Math.min(py + 1, y1) - Math.max(py, y0));
    if (coverY <= 0) continue;
    for (let px = pxStart; px < pxEnd; px++) {
      const coverX = Math.max(0, Math.min(px + 1, x1) - Math.max(px, x0));
      if (coverX <= 0) continue;
      const a = alpha * coverX * coverY;
      const i = (py * size + px) * 4;
      const dstA = buf[i + 3] / 255;
      const outA = a + dstA * (1 - a);
      if (outA <= 0) continue;
      for (let k = 0; k < 3; k++) {
        buf[i + k] = Math.round((rgb[k] * a + buf[i + k] * dstA * (1 - a)) / outA);
      }
      buf[i + 3] = Math.round(outA * 255);
    }
  }
}

function drawMark(canvas, scale, rgb) {
  const c = canvas.size / 2;
  const s = scale * (canvas.size / 1024);
  const S = (v) => v * s;
  const rows = MARK.descriptions.length;
  MARK.descriptions.forEach((end, i) => {
    const dy = (i - (rows - 1) / 2) * MARK.pitch;
    const y0 = c + S(dy - MARK.thickness / 2);
    const y1 = c + S(dy + MARK.thickness / 2);
    rect(canvas, c - S(MARK.edge), y0, c + S(end), y1, rgb, MARK.dim);
    rect(canvas, c + S(MARK.amounts[i]), y0, c + S(MARK.edge), y1, rgb, 1);
  });
  rect(
    canvas,
    c + S(MARK.ruleX), c - S(HALF_H),
    c + S(MARK.ruleX + MARK.ruleWidth), c + S(HALF_H),
    rgb, MARK.ruleAlpha,
  );
}

// ── Outputs ───────────────────────────────────────────────────────────────
const OUTPUTS = [
  // Full-bleed square; iOS and the stores apply their own rounding.
  { file: 'icon.png', size: 1024, background: GROUND, scale: 1, rgb: PAPER },
  // Foreground only — the ground comes from android.adaptiveIcon.backgroundColor.
  { file: 'adaptive-icon.png', size: 1024, background: null, scale: ADAPTIVE_SCALE, rgb: PAPER },
  // Transparent — the ground comes from splash.backgroundColor.
  { file: 'splash-icon.png', size: 1024, background: null, scale: 1, rgb: PAPER },
  // Android discards the colour and tints the alpha, so this MUST be white on
  // transparent. A full-colour image here renders as a solid white blob.
  { file: 'notification-icon.png', size: 96, background: null, scale: 0.92, rgb: [255, 255, 255] },
];

function main() {
  const check = process.argv.includes('--check');
  const dir = path.join(__dirname, '..', 'assets');
  let changed = 0;

  for (const out of OUTPUTS) {
    const canvas = createCanvas(out.size, out.background);
    drawMark(canvas, out.scale, out.rgb);
    const png = encodePNG(canvas.size, canvas.size, canvas.buf);
    const target = path.join(dir, out.file);
    const existing = fs.existsSync(target) ? fs.readFileSync(target) : null;
    const same = existing !== null && existing.equals(png);

    if (check) {
      if (!same) { console.error(`out of date: ${out.file}`); changed++; }
      continue;
    }
    if (same) { console.log(`unchanged  ${out.file}`); continue; }
    fs.writeFileSync(target, png);
    console.log(`wrote      ${out.file}  ${out.size}px  scale ${out.scale}`);
    changed++;
  }

  if (check && changed > 0) {
    console.error(`\n${changed} icon(s) differ from the generator. Run: node scripts/generate-icons.js`);
    process.exit(1);
  }
  if (check) console.log('icons match the generator');
}

main();
