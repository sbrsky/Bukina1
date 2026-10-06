#!/usr/bin/env tsx
/**
 * scripts/hf-hero-build.ts — SKINLAB hero film build (docs/v2/MOTION.md §1.1).
 *
 *   npx tsx scripts/hf-hero-build.ts [--offline]
 *
 * 1. Prices: Firestore `services` (READ-ONLY getDocs, app config from the VITE_FIREBASE_* env vars
 *    in .env / .env.local), falling back to src/data/servicesData.ts. Min prices use the page's own
 *    parser (src/pages/v2/lib/prices.ts → minPrice), so film and page always agree.
 * 2. Writes videos/skinlab-hero/vars/{site,ad}-{ru,lv,en}.json (CLI render variables).
 * 3. Regenerates videos/skinlab-hero/compositions/cut15.html from index.html (MOTION §12: id skinlab-hero-15,
 *    15 s, scene plan "cut15", ad-safe variable defaults). index.html is the single source.
 * 4. Copies public/fonts/v2/*.woff2 → videos/skinlab-hero/assets/fonts/ (CLI renders).
 * 5. Emits public/hf/skinlab-hero/index.{ru,lv,en}.html: `lang` + price defaults rewritten, site-cut
 *    defaults, @font-face URLs assets/fonts/ → /fonts/v2/ (shared cache with the page). The root
 *    data-duration is never touched.
 * 6. Copies scenes.js + assets/ (fonts excluded) → public/hf/skinlab-hero/, and the HyperFrames
 *    runtime IIFE → public/hf/vendor/hyperframe.runtime.iife.js (no CDN at runtime).
 * 7. Asserts CHAPTERS in scenes.js deep-equals src/pages/v2/data/heroChapters.ts (exit 1 if not).
 *
 * Never writes to Firestore, never deploys.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { isAmbiguousPrice, minPrice, minPriceAll, parsePrice, type PricedCategory } from '../src/pages/v2/lib/prices';
import { CHAPTERS as PAGE_CHAPTERS } from '../src/pages/v2/data/heroChapters';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILM = path.join(ROOT, 'videos/skinlab-hero');
const OUT = path.join(ROOT, 'public/hf/skinlab-hero');
const VENDOR = path.join(ROOT, 'public/hf/vendor');
const LANGS = ['ru', 'lv', 'en'] as const;
type Lang = (typeof LANGS)[number];
const offline = process.argv.includes('--offline');

const log = (...a: unknown[]) => console.log('[hf-hero-build]', ...a);
const rel = (p: string) => path.relative(ROOT, p);
const kb = (p: string) => `${(fs.statSync(p).size / 1024).toFixed(1)} KB`;

/* ── 1. prices ─────────────────────────────────────────────────────────────────────────── */

function loadDotEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const f of ['.env', '.env.local']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return { ...env, ...(process.env as Record<string, string>) };
}

async function fetchFirestoreServices(): Promise<PricedCategory[]> {
  const env = loadDotEnv();
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  if (!config.apiKey || !config.projectId) throw new Error('VITE_FIREBASE_* env vars not set');
  const { initializeApp, deleteApp } = await import('firebase/app');
  const { getFirestore, collection, getDocs, terminate } = await import('firebase/firestore');
  const app = initializeApp(config, 'hf-hero-build');
  const db = getFirestore(app);
  try {
    const snap = await Promise.race([
      getDocs(collection(db, 'services')), // read-only
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Firestore timeout (15 s)')), 15000)),
    ]);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as PricedCategory);
  } finally {
    await terminate(db).catch(() => {});
    await deleteApp(app).catch(() => {});
  }
}

async function loadServices(): Promise<{ source: string; cats: PricedCategory[] }> {
  if (!offline) {
    try {
      const cats = await fetchFirestoreServices();
      if (cats.length) return { source: 'firestore', cats };
      log('Firestore returned no services — falling back to servicesData.ts');
    } catch (e) {
      log(`Firestore read failed (${(e as Error).message}) — falling back to servicesData.ts`);
    }
  }
  const mod = await import('../src/data/servicesData');
  return { source: 'servicesData.ts', cats: mod.servicesData as unknown as PricedCategory[] };
}

const PRICE_VARS: Record<string, string> = {
  skincare: 'p_skincare',
  peels: 'p_peels',
  mesotherapy: 'p_meso',
  biorevitalization: 'p_biorev',
  biostimulation: 'p_biostim',
  complex: 'p_complex',
};

function describe(cats: PricedCategory[]): string {
  return cats
    .map((c) => `${c.id}: ${(c.treatments ?? []).map((t) => `${String(t?.name ?? '').slice(0, 28)}=${JSON.stringify(t?.price)}`).join(' | ')}`)
    .join('\n    ');
}

// Live Firestore docs use transliterated slugs as ids. Same resolution order as page-A's
// src/pages/v2/lib/categories.ts → canonicalCategoryId() (exact id, known slug, RU title of the
// servicesData entry, most shared treatment names) — mirrored here because that module pulls in
// React + the Vite-only firebase client and cannot be imported from Node.
const CANONICAL = ['skincare', 'peels', 'mesotherapy', 'biorevitalization', 'biostimulation', 'complex', 'consultation'];
const FIRESTORE_SLUGS: Record<string, string> = {
  skincare: 'ukhodovye-protsedury',
  peels: 'pilingi',
  mesotherapy: 'mezoterapiya',
  biorevitalization: 'biorevitalizatsiya',
  biostimulation: 'biostimulyatsiya',
  complex: 'kompleksnye-protsedury',
  consultation: 'konsul-tatsiya',
};
const norm = (x: unknown) => (typeof x === 'string' ? x.trim().toLowerCase().replace(/ё/g, 'е') : '');

async function canonicalize(cats: PricedCategory[]): Promise<Map<string, PricedCategory>> {
  const fallback = (await import('../src/data/servicesData')).servicesData as unknown as PricedCategory[];
  const out = new Map<string, PricedCategory>();
  for (const doc of cats) {
    let id: string | undefined = CANONICAL.includes(String(doc.id)) ? String(doc.id) : undefined;
    id ??= CANONICAL.find((k) => FIRESTORE_SLUGS[k] === doc.id);
    if (!id) {
      const t = norm((doc as { title?: string }).title);
      id = fallback.find((c) => norm((c as { title?: string }).title) === t)?.id as string | undefined;
    }
    if (!id) {
      const names = new Set((doc.treatments ?? []).map((t) => norm(t?.name)).filter(Boolean));
      let best = 0;
      for (const c of fallback) {
        const n = (c.treatments ?? []).filter((t) => names.has(norm(t?.name))).length;
        if (n > best) {
          best = n;
          id = c.id as string;
        }
      }
    }
    if (id && !out.has(id)) out.set(id, doc);
  }
  return out;
}

function computePrices(byId: Map<string, PricedCategory>, cats: PricedCategory[]) {
  if (process.argv.includes('--verbose')) log('services:\n    ' + describe(cats));
  // a price string with several numbers («3 процедуры — 300 €») is parsed by its € amount, but it
  // is baked into the film's MP4s/posters — make it visible (review round 2)
  for (const [id, c] of byId)
    for (const t of c.treatments ?? [])
      if (isAmbiguousPrice(t?.price as string | undefined))
        log(`⚠ ambiguous price in "${id}" → ${JSON.stringify(t?.name)}: ${JSON.stringify(t?.price)} → parsed as ${parsePrice(t?.price as string)} €`);
  const p: Record<string, number> = {};
  for (const [id, key] of Object.entries(PRICE_VARS)) {
    const v = minPrice(byId.get(id));
    if (v == null) throw new Error(`no parsable price for category "${id}"\n    ${describe(cats)}`);
    p[key] = v;
  }
  const all = minPriceAll([...byId.values()]);
  if (all == null) throw new Error('no parsable prices at all');
  p.p_offer = all;
  // the online consultation itself (MOTION §7.1 C7: «Консультация ONLINE 40 €»), else the category min
  const consult = byId.get('consultation');
  const online = consult?.treatments?.find((t) => /online|онлайн|tiešsaist/i.test(String(t?.name ?? '')));
  const onlineP = parsePrice(online?.price as string | undefined);
  const cMin = minPrice(consult);
  if (onlineP == null && cMin == null) throw new Error('no consultation price');
  p.p_consult_online = (onlineP ?? cMin) as number;
  return p;
}

/* ── 2–5. variables + HTML rewriting ───────────────────────────────────────────────────── */

type VarDecl = { id: string; default: unknown; [k: string]: unknown };
const VARS_RE = /data-composition-variables='([\s\S]*?)'/;

function rewriteVarDefaults(html: string, values: Record<string, unknown>): string {
  const m = VARS_RE.exec(html);
  if (!m) throw new Error('data-composition-variables not found');
  const decl = JSON.parse(m[1]) as VarDecl[];
  for (const d of decl) if (d.id in values) d.default = values[d.id];
  const body = '[\n' + decl.map((d) => '    ' + JSON.stringify(d)).join(',\n') + '\n  ]';
  if (body.includes("'")) throw new Error("variable JSON may not contain a single quote");
  return html.replace(VARS_RE, `data-composition-variables='${body}'`);
}

const CUT15_CLIPS = `<!-- CLIPS:BEGIN -->
        <div id="sc-c3" class="clip scene" data-start="3.6" data-duration="3.2" data-track-index="1"></div>
        <div id="sc-c6" class="clip scene" data-start="6.8" data-duration="3.2" data-track-index="1"></div>
        <div id="sc-c7" class="clip scene" data-start="10" data-duration="4.25" data-track-index="2"></div>
        <!-- CLIPS:END -->`;

function makeCut15(indexHtml: string): string {
  const swaps: [RegExp | string, string][] = [
    ['data-composition-id="skinlab-hero"', 'data-composition-id="skinlab-hero-15"'],
    [/(data-composition-id="skinlab-hero-15"\s+data-start="0"\s+)data-duration="31"/, '$1data-duration="15"'],
    [/<!-- CLIPS:BEGIN -->[\s\S]*?<!-- CLIPS:END -->/, CUT15_CLIPS],
    ['plan: "full"', 'plan: "cut15"'],
    ['window.__timelines["skinlab-hero"]', 'window.__timelines["skinlab-hero-15"]'],
    ['<title>SKINLAB — hero film</title>', '<title>SKINLAB — hero film, 15 s paid cut</title>'],
  ];
  let out = indexHtml;
  for (const [a, b] of swaps) {
    const before = out;
    out = typeof a === 'string' ? out.split(a).join(b) : out.replace(a, b);
    if (out === before) throw new Error(`cut15: pattern not found: ${String(a)}`);
  }
  out = rewriteVarDefaults(out, { showBeforeAfter: false, showBrands: false });
  return withBanner(out, 'GENERATED by scripts/hf-hero-build.ts from index.html — edit index.html / scenes.js, then re-run the build.');
}

// banner comment goes AFTER the doctype (a leading comment makes HyperFrames treat the file as a fragment)
function withBanner(html: string, text: string): string {
  const m = /^\s*<!doctype html>\s*/i.exec(html);
  if (!m) throw new Error('expected <!doctype html> at the top of index.html');
  return m[0].trimEnd() + '\n<!-- ' + text + ' -->\n' + html.slice(m[0].length);
}

function copyFile(src: string, dst: string) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

/* ── 7. CHAPTERS assertion ─────────────────────────────────────────────────────────────── */

function filmTables(): { CHAPTERS: unknown; RECAP: unknown; CTA_PILL_T: unknown; DURATION: unknown; POSTER_MAP_T: unknown } {
  const sandbox: Record<string, unknown> = {};
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(FILM, 'scenes.js'), 'utf8'), sandbox, { filename: 'scenes.js' });
  const S = sandbox.SKINLAB as Record<string, unknown>;
  if (!S) throw new Error('scenes.js did not define window.SKINLAB');
  return S as never;
}

/* ── main ──────────────────────────────────────────────────────────────────────────────── */

async function main() {
  // 7 first: fail fast on a chapter-table mismatch
  const S = filmTables();
  const film = JSON.parse(JSON.stringify(S.CHAPTERS));
  const page = JSON.parse(JSON.stringify(PAGE_CHAPTERS));
  if (!isDeepStrictEqual(film, page)) {
    console.error('[hf-hero-build] CHAPTERS mismatch between videos/skinlab-hero/scenes.js and src/pages/v2/data/heroChapters.ts');
    console.error('  film:', JSON.stringify(film));
    console.error('  page:', JSON.stringify(page));
    process.exit(1);
  }
  log('CHAPTERS match heroChapters.ts ✓', `(${film.length} chapters; CTA_PILL_T ${S.CTA_PILL_T}, POSTER_MAP_T ${S.POSTER_MAP_T}, DURATION ${S.DURATION})`);

  // 1
  const { source, cats } = await loadServices();
  const byId = await canonicalize(cats);
  const missing = CANONICAL.filter((k) => !byId.has(k));
  if (missing.length) throw new Error(`could not place categories: ${missing.join(', ')}`);
  const prices = computePrices(byId, cats);
  log(`prices from ${source}:`, JSON.stringify(prices));

  // 2
  const varsDir = path.join(FILM, 'vars');
  fs.mkdirSync(varsDir, { recursive: true });
  for (const lang of LANGS) {
    for (const cut of ['site', 'ad'] as const) {
      const v = { lang, showBeforeAfter: cut === 'site', showBrands: cut === 'site', ...prices };
      fs.writeFileSync(path.join(varsDir, `${cut}-${lang}.json`), JSON.stringify(v, null, 2) + '\n');
    }
  }
  log('wrote', rel(varsDir) + '/{site,ad}-{ru,lv,en}.json');

  // 3
  const indexHtml = fs.readFileSync(path.join(FILM, 'index.html'), 'utf8');
  // MOTION §1 lists cut15.html at the project root, but HyperFrames lint rejects two root
  // compositions (multiple_root_compositions), so the cut lives in compositions/ and is rendered
  // with `-c compositions/cut15.html` (asset paths stay project-root relative).
  const cutPath = path.join(FILM, 'compositions/cut15.html');
  fs.writeFileSync(cutPath, makeCut15(indexHtml));
  if (fs.existsSync(path.join(FILM, 'cut15.html'))) fs.unlinkSync(path.join(FILM, 'cut15.html'));
  log('wrote', rel(cutPath));

  // 4
  const fontSrc = path.join(ROOT, 'public/fonts/v2');
  const fontDst = path.join(FILM, 'assets/fonts');
  let nFonts = 0;
  for (const f of fs.readdirSync(fontSrc).filter((f) => f.endsWith('.woff2'))) {
    copyFile(path.join(fontSrc, f), path.join(fontDst, f));
    nFonts++;
  }
  log(`copied ${nFonts} fonts → ${rel(fontDst)}`);

  // 5
  fs.mkdirSync(OUT, { recursive: true });
  for (const lang of LANGS) {
    let html = rewriteVarDefaults(indexHtml, { lang, showBeforeAfter: true, showBrands: true, debugBoxes: false, ...prices });
    html = html.replace(/url\('assets\/fonts\//g, "url('/fonts/v2/");
    if (/url\(\s*['"]?assets\/fonts\//.test(html)) throw new Error('unrewritten font URL left in the web entry');
    html = html.replace('<html\n  lang="ru"', `<html\n  lang="${lang}"`);
    const dst = path.join(OUT, `index.${lang}.html`);
    fs.writeFileSync(dst, withBanner(html, 'GENERATED by scripts/hf-hero-build.ts — do not edit; source: videos/skinlab-hero/index.html'));
    log('wrote', rel(dst), kb(dst));
  }

  // 6
  copyFile(path.join(FILM, 'scenes.js'), path.join(OUT, 'scenes.js'));
  const copyDir = (src: string, dst: string, skip: (rel: string) => boolean) => {
    for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, ent.name);
      const r = path.relative(path.join(FILM, 'assets'), s);
      if (skip(r)) continue;
      if (ent.isDirectory()) copyDir(s, path.join(dst, ent.name), skip);
      else copyFile(s, path.join(dst, ent.name));
    }
  };
  copyDir(path.join(FILM, 'assets'), path.join(OUT, 'assets'), (r) => r === 'fonts' || r.startsWith('fonts' + path.sep) || r.startsWith('.'));
  const runtime = path.join(ROOT, 'node_modules/@hyperframes/core/dist/hyperframe.runtime.iife.js');
  copyFile(runtime, path.join(VENDOR, 'hyperframe.runtime.iife.js'));
  const coreVer = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/@hyperframes/core/package.json'), 'utf8')).version;
  const playerVer = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/@hyperframes/player/package.json'), 'utf8')).version;
  if (coreVer !== playerVer) log(`WARNING: @hyperframes/core ${coreVer} ≠ @hyperframes/player ${playerVer} (pin both to the same version)`);
  log('copied scenes.js + assets →', rel(OUT), '| runtime', coreVer, '→', rel(path.join(VENDOR, 'hyperframe.runtime.iife.js')), kb(path.join(VENDOR, 'hyperframe.runtime.iife.js')));

  // transfer budget (fonts are shared with the page and excluded)
  let total = 0;
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === 'renders' || e.name === 'posters') continue;
        walk(p);
      } else if (!/^index\.(lv|en)\.html$/.test(e.name)) total += fs.statSync(p).size;
    }
  };
  walk(OUT);
  total += fs.statSync(path.join(VENDOR, 'hyperframe.runtime.iife.js')).size;
  log(`live entry (ru) transfer, fonts excluded: ${(total / 1024).toFixed(0)} KB (budget 1.3 MB)`);
}

main().catch((e) => {
  console.error('[hf-hero-build] FAILED:', e);
  process.exit(1);
});
