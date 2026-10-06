#!/usr/bin/env node
/**
 * scripts/v2-fonts.mjs — fetch the self-hosted /v2 font subsets (DESIGN.md §3.2).
 *
 *   node scripts/v2-fonts.mjs            # downloads into public/fonts/v2/, prints the @font-face CSS
 *
 * Source: the Google Fonts css2 API (fonts.gstatic.com), requested with a modern Chrome
 * User-Agent so it answers with VARIABLE woff2 files already trimmed to the axis ranges of
 * DESIGN.md §3.2. Each face is split into unicode-range files; a browser only downloads the
 * files whose range the page actually uses (RU page: latin + cyrillic; LV page: latin + latin-ext):
 *
 *   -latin.woff2      Google stock `latin` subset (U+0000-00FF, U+2000-206F, € …)
 *   -cyrillic.woff2   Google stock `cyrillic` subset (U+0400-045F, U+0490-0491, № …)
 *   -latin-ext.woff2  custom `&text=` subset, declared U+0100-017F only (Latvian ā č ē ģ ī ķ ļ ņ š ū ž).
 *                     Google's stock latin-ext is 320–390 KB for Noto Serif Display.
 *   -arrows.woff2     custom `&text=` subset U+2190, U+2192 (← →) where the family has them (Onest and
 *                     Martian Mono); Noto Serif Display / Bad Script have none and fall back.
 *
 * cyrillic-ext / greek / vietnamese / math / symbols are dropped.
 *
 * The emitted @font-face block is pasted into src/pages/v2/v2.css. The film's web entries
 * reference the same /fonts/v2/*.woff2 files so the cache is shared (MOTION.md §3).
 */
import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/fonts/v2');
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';

/** family query (css2 syntax) → [{ style, stem }] */
const FAMILIES = [
  {
    query: 'Noto+Serif+Display:ital,wdth,wght@0,62.5..100,300..900;1,62.5..100,300..400',
    family: 'Noto Serif Display',
    stems: { normal: 'NotoSerifDisplay-Roman', italic: 'NotoSerifDisplay-Italic' },
  },
  { query: 'Onest:wght@400..700', family: 'Onest', stems: { normal: 'Onest' } },
  { query: 'Martian+Mono:wdth,wght@75..100,400..600', family: 'Martian Mono', stems: { normal: 'MartianMono' } },
  { query: 'Bad+Script', family: 'Bad Script', stems: { normal: 'BadScript' } },
];

/**
 * Subsets per face. `stock` = Google's own pre-optimised subset file (smallest for these ranges);
 * `text` = a custom subset requested with `&text=` and declared with exactly these ranges.
 */
const SUBSETS = [
  { name: 'latin', stock: 'latin' }, // U+0000-00FF, U+2000-206F, U+20AC (€), …
  { name: 'cyrillic', stock: 'cyrillic' }, // U+0400-045F, U+0490-0491, U+2116 (№), …
  // Google's stock latin-ext is 320–390 KB for NSD (Vietnamese + U+1E00 block); Latvian needs only U+0100-017F.
  { name: 'latin-ext', text: [[0x100, 0x17f]] },
  // Arrows ← → are in no stock subset we keep (stock latin has only ↑ ↓).
  { name: 'arrows', text: [[0x2190, 0x2190], [0x2192, 0x2192]], only: ['NotoSerifDisplay-Roman', 'Onest', 'MartianMono'] }, // optional: skipped if absent
];
const STOCK_CSS_URL =
  'https://fonts.googleapis.com/css2?' + FAMILIES.map((f) => `family=${f.query}`).join('&') + '&display=swap';

const hex = (n) => n.toString(16).toUpperCase().padStart(4, '0');
const rangeCss = (ranges) => ranges.map(([a, b]) => (a === b ? `U+${hex(a)}` : `U+${hex(a)}-${hex(b)}`)).join(', ');
const textFor = (ranges) => {
  let s = '';
  for (const [a, b] of ranges) for (let c = a; c <= b; c++) s += String.fromCodePoint(c);
  return s;
};
const parseBlocks = (css) =>
  [...css.matchAll(/(?:\/\*\s*([\w-]+)\s*\*\/\s*)?@font-face\s*{([^}]*)}/g)].map((m) => {
    const get = (k) => (m[2].match(new RegExp(`${k}:\\s*([^;]+);`)) || [])[1]?.trim();
    return {
      subset: m[1],
      family: get('font-family').replace(/'/g, ''),
      style: get('font-style'),
      weight: get('font-weight'),
      stretch: get('font-stretch'),
      range: get('unicode-range'),
      src: (get('src').match(/url\(([^)]+)\)/) || [])[1],
    };
  });
const getCss = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`css2 ${res.status}: ${url.slice(0, 120)}`);
  return res.text();
};

await mkdir(OUT, { recursive: true });
for (const f of await readdir(OUT)) if (f.endsWith('.woff2')) await unlink(path.join(OUT, f));

const stockBlocks = parseBlocks(await getCss(STOCK_CSS_URL));
const faces = [];
let total = 0;
const save = async (block, file, range, optional = false) => {
  const r = await fetch(block.src, { headers: { 'User-Agent': UA } });
  if (!r.ok) {
    // gstatic answers 400 when the family has none of the requested glyphs (e.g. arrows).
    if (optional) return console.error(`${file.padEnd(42)}   none (family lacks these glyphs)`);
    throw new Error(`${block.src} ${r.status}`);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(path.join(OUT, file), buf);
  total += buf.length;
  faces.push({ ...block, range, file, bytes: buf.length });
  console.error(`${file.padEnd(42)} ${(buf.length / 1024).toFixed(1).padStart(6)} KB`);
};

for (const fam of FAMILIES) {
  for (const sub of SUBSETS) {
    if (sub.stock) {
      for (const b of stockBlocks.filter((b) => b.family === fam.family && b.subset === sub.stock)) {
        await save(b, `${fam.stems[b.style]}-${sub.name}.woff2`, b.range);
      }
    } else {
      const css = await getCss(
        `https://fonts.googleapis.com/css2?family=${fam.query}&display=swap&text=${encodeURIComponent(textFor(sub.text))}`,
      );
      for (const b of parseBlocks(css)) {
        const stem = fam.stems[b.style];
        if (sub.only && !sub.only.includes(stem)) continue;
        await save(b, `${stem}-${sub.name}.woff2`, rangeCss(sub.text), Boolean(sub.only));
      }
    }
  }
}
console.error(`total ${(total / 1024).toFixed(1)} KB in ${faces.length} files`);

const out = faces
  .map(
    (f) => `@font-face {
  font-family: '${f.family}';
  font-style: ${f.style};
  font-weight: ${f.weight};${f.stretch ? `\n  font-stretch: ${f.stretch};` : ''}
  font-display: swap;
  src: url('/fonts/v2/${f.file}') format('woff2');
  unicode-range: ${f.range};
}`,
  )
  .join('\n');
process.stdout.write(out + '\n');
