// Converts the interface font into compact glyph outlines for 3D lettering (research R19).
// Run with `npm run font` after changing the character set; the output is committed.
//
// Source: Fredoka SemiBold from @fontsource/fredoka (SIL Open Font License 1.1).
// Output: src/ui/fonts/fredoka.json — { unitsPerEm, ascender, descender, glyphs: { ch: [advance, path] } }
// where `path` uses font units (y up) and the commands M x y / L x y / Q cx cy x y / Z.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(root, 'node_modules/@fontsource/fredoka/files/fredoka-latin-600-normal.woff');
const LICENSE = resolve(root, 'node_modules/@fontsource/fredoka/LICENSE');
const OUT_DIR = resolve(root, 'src/ui/fonts');

// Printable ASCII plus the few typographic characters the interface uses.
let CHARSET = '';
for (let c = 32; c <= 126; c++) CHARSET += String.fromCharCode(c);
CHARSET += '×−…’·–—áéíóúñü¡¿';

const bytes = readFileSync(SOURCE);
const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));

const r = (v) => Math.round(v);

function encode(commands) {
  const out = [];
  let x = NaN;
  let y = NaN;
  for (const c of commands) {
    switch (c.type) {
      case 'M':
        out.push('M', r(c.x), r(c.y));
        break;
      case 'L':
        // Fonts often repeat the current point; skip zero-length lines.
        if (r(c.x) === x && r(c.y) === y) continue;
        out.push('L', r(c.x), r(c.y));
        break;
      case 'Q':
        out.push('Q', r(c.x1), r(c.y1), r(c.x), r(c.y));
        break;
      case 'C': {
        // Not expected in a TrueType-flavoured font; approximate with one quadratic.
        const cx = (3 * (c.x1 + c.x2) - (x + c.x)) / 4;
        const cy = (3 * (c.y1 + c.y2) - (y + c.y)) / 4;
        out.push('Q', r(cx), r(cy), r(c.x), r(c.y));
        break;
      }
      case 'Z':
        out.push('Z');
        break;
      default:
        throw new Error(`Unknown path command ${c.type}`);
    }
    if (c.type !== 'Z') {
      x = r(c.x);
      y = r(c.y);
    }
  }
  return out.join(' ');
}

const glyphs = {};
const missing = [];
for (const ch of CHARSET) {
  const glyph = font.charToGlyph(ch);
  if (!glyph || glyph.index === 0) {
    missing.push(ch);
    continue;
  }
  glyphs[ch] = [r(glyph.advanceWidth), encode(glyph.path.commands)];
}
if (missing.length) throw new Error(`Font lacks: ${missing.join('')}`);

mkdirSync(OUT_DIR, { recursive: true });
const data = {
  name: 'Fredoka SemiBold',
  license: 'SIL Open Font License 1.1 (see OFL.txt)',
  unitsPerEm: font.unitsPerEm,
  ascender: font.ascender,
  descender: font.descender,
  glyphs,
};
writeFileSync(resolve(OUT_DIR, 'fredoka.json'), JSON.stringify(data));
copyFileSync(LICENSE, resolve(OUT_DIR, 'OFL.txt'));
console.log(`fredoka.json: ${Object.keys(glyphs).length} glyphs, ${JSON.stringify(data).length} bytes`);
