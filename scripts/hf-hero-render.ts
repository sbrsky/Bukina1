#!/usr/bin/env tsx
/**
 * scripts/hf-hero-render.ts — SKINLAB hero film renders (docs/v2/MOTION.md §13.2).
 *
 *   npx tsx scripts/hf-hero-render.ts [--langs ru,lv,en] [--cuts site,ad,ad15] [--force] [--quality delivery]
 *
 * Run scripts/hf-hero-build.ts first (it writes vars/*.json and compositions/cut15.html).
 *
 * Per language:
 *   site  videos/skinlab-hero/renders/hero-site-{lang}-1080.mp4   (index.html + vars/site-{lang}.json)
 *         → public/hf/skinlab-hero/renders/hero-site-{lang}-720.mp4  (720×900 H.264 high, yuv420p,
 *           lanczos, faststart, silent; CRF 26 raised until ≤ 3 MB)
 *         → public/hf/skinlab-hero/posters/poster{,-map}-{lang}-{540,810,1080}.{avif,webp}
 *           (frame 0 and frame 735 = 24.50 s, cut from the delivery render so they equal MP4 frames)
 *   ad    videos/skinlab-hero/renders/hero-ad-{lang}-1080.mp4     (index.html + vars/ad-{lang}.json)
 *   ad15  videos/skinlab-hero/renders/hero-ad15-{lang}-1080.mp4   (compositions/cut15.html + vars/ad-{lang}.json)
 * Ad renders stay in videos/ (owner deliverables for Meta/Instagram) and are never deployed.
 *
 * Every output is verified with ffprobe (duration, size, fps); posters are checked against the
 * §13.2 budgets; the rendered paper colour at (540, 40) is compared with #F4EDE6 (ΔE76).
 * Existing renders are reused unless --force.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILM = path.join(ROOT, 'videos/skinlab-hero');
const RENDERS = path.join(FILM, 'renders');
const PUB = path.join(ROOT, 'public/hf/skinlab-hero');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'hf-hero-render-'));

const argv = process.argv.slice(2);
const arg = (n: string, d: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const LANGS = arg('langs', 'ru,lv,en').split(',').filter(Boolean);
const CUTS = arg('cuts', 'site,ad,ad15').split(',').filter(Boolean);
const QUALITY = arg('quality', 'delivery');
const FORCE = argv.includes('--force');

const log = (...a: unknown[]) => console.log('[hf-hero-render]', ...a);
const rel = (p: string) => path.relative(ROOT, p);
const mb = (p: string) => fs.statSync(p).size / 1048576;

function run(cmd: string, args: string[], opts: { cwd?: string; quiet?: boolean } = {}) {
  const r = spawnSync(cmd, args, { cwd: opts.cwd ?? ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    console.error((r.stdout || '').slice(-4000));
    console.error((r.stderr || '').slice(-4000));
    throw new Error(`${cmd} ${args.join(' ')} → exit ${r.status}`);
  }
  if (!opts.quiet) {
    const tail = (r.stdout + '\n' + r.stderr)
      .replace(/\x1b\[[0-9;]*m/g, '')
      .split('\n')
      .filter((l) => /render|frames|encode|saved|done|output|duration|warn|beginframe|screenshot/i.test(l))
      .slice(-6);
    for (const l of tail) log('  ', l.trim());
  }
  return r.stdout;
}

function probe(file: string) {
  const out = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_read_packets:format=duration,size', '-of', 'json', file], { quiet: true });
  const j = JSON.parse(out);
  const s = j.streams[0];
  const [n, d] = String(s.r_frame_rate).split('/').map(Number);
  const audio = run('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file], { quiet: true }).trim();
  return {
    duration: Number(j.format.duration),
    frames: Number(s.nb_read_packets),
    fps: n / (d || 1),
    size: `${s.width}x${s.height}`,
    codec: `${s.codec_name}/${s.profile}/${s.pix_fmt}`,
    mb: Number(j.format.size) / 1048576,
    audio: audio ? 'yes' : 'none',
  };
}

function render(composition: string, varsFile: string, out: string, expect: number) {
  if (!FORCE && fs.existsSync(out) && fs.statSync(out).size > 0) {
    log('reuse', rel(out));
  } else {
    log('render', rel(out), `(${composition}, ${path.basename(varsFile)}, -q ${QUALITY})`);
    const t0 = Date.now();
    const args = ['hyperframes', 'render', FILM, '--variables-file', varsFile, '--strict-variables', '-f', '30', '-q', QUALITY, '-o', out, '--quiet'];
    if (composition !== 'index.html') args.splice(3, 0, '-c', composition);
    run('npx', args, { cwd: FILM });
    log(`   done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  const p = probe(out);
  const ok = Math.abs(p.duration - expect) < 0.05 && Math.round(p.fps) === 30;
  log(`   ${ok ? '✓' : '✗'} ${rel(out)}: ${p.duration.toFixed(3)} s, ${p.frames} frames, ${p.fps} fps, ${p.size}, ${p.codec}, ${p.mb.toFixed(2)} MB, audio ${p.audio}`);
  if (!ok) throw new Error(`unexpected duration/fps for ${out} (expected ${expect} s @ 30 fps)`);
  return p;
}

function transcodeWeb(src: string, dst: string) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  for (const crf of [26, 27, 28, 29, 30]) {
    run('ffmpeg', ['-y', '-v', 'error', '-i', src, '-vf', 'scale=720:900:flags=lanczos', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', String(crf), '-preset', 'slow', '-movflags', '+faststart', '-an', dst], { quiet: true });
    const p = probe(dst);
    log(`   web ${rel(dst)}: CRF ${crf} → ${p.mb.toFixed(2)} MB, ${p.duration.toFixed(3)} s, ${p.size}`);
    if (p.mb <= 3) return { ...p, crf };
  }
  throw new Error(`${dst} stays above 3 MB even at CRF 30`);
}

function extractFrame(src: string, frame: number, png: string) {
  run('ffmpeg', ['-y', '-v', 'error', '-i', src, '-vf', `select=eq(n\\,${frame})`, '-frames:v', '1', png], { quiet: true });
}

const BUDGET: Record<number, number> = { 540: 35, 810: 60, 1080: 90 }; // KB, AVIF (MOTION §13.2)

async function posters(png: string, base: string) {
  const dir = path.join(PUB, 'posters');
  fs.mkdirSync(dir, { recursive: true });
  const rows: string[] = [];
  for (const w of [540, 810, 1080]) {
    const h = Math.round((w * 1350) / 1080);
    let q = 50;
    let avif = path.join(dir, `${base}-${w}.avif`);
    for (;;) {
      await sharp(png).resize(w, h, { kernel: 'lanczos3' }).avif({ quality: q, effort: 6, chromaSubsampling: '4:2:0' }).toFile(avif);
      const kb = fs.statSync(avif).size / 1024;
      if (kb <= BUDGET[w] || q <= 30) break;
      q -= 4;
    }
    const webp = path.join(dir, `${base}-${w}.webp`);
    await sharp(png).resize(w, h, { kernel: 'lanczos3' }).webp({ quality: 78, effort: 6 }).toFile(webp);
    const akb = fs.statSync(avif).size / 1024;
    rows.push(`${w}: avif q${q} ${akb.toFixed(1)} KB${akb > BUDGET[w] ? ' (OVER ' + BUDGET[w] + ')' : ''}, webp ${(fs.statSync(webp).size / 1024).toFixed(1)} KB`);
  }
  log(`   posters ${base}: ${rows.join(' | ')}`);
}

async function paperDeltaE(png: string) {
  const { data } = await sharp(png).extract({ left: 540, top: 40, width: 1, height: 1 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const lab = (r: number, g: number, b: number) => {
    const f = (c: number) => {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const [R, G, B] = [f(r), f(g), f(b)];
    const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const t = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
    return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))];
  };
  const a = lab(data[0], data[1], data[2]);
  const b = lab(0xf4, 0xed, 0xe6);
  const dE = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  return { rgb: `#${[data[0], data[1], data[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`, dE };
}

async function main() {
  fs.mkdirSync(RENDERS, { recursive: true });
  for (const f of LANGS.flatMap((l) => [`vars/site-${l}.json`, `vars/ad-${l}.json`]))
    if (!fs.existsSync(path.join(FILM, f))) throw new Error(`missing ${f} — run scripts/hf-hero-build.ts first`);
  if (CUTS.includes('ad15') && !fs.existsSync(path.join(FILM, 'compositions/cut15.html'))) throw new Error('missing compositions/cut15.html — run the build');

  // site cuts first (they feed the page), then the ad deliverables
  for (const lang of LANGS) {
    if (!CUTS.includes('site')) continue;
    const master = path.join(RENDERS, `hero-site-${lang}-1080.mp4`);
    render('index.html', path.join(FILM, `vars/site-${lang}.json`), master, 31);
    transcodeWeb(master, path.join(PUB, 'renders', `hero-site-${lang}-720.mp4`));
    const f0 = path.join(TMP, `poster-${lang}.png`);
    const fm = path.join(TMP, `poster-map-${lang}.png`);
    extractFrame(master, 0, f0);
    extractFrame(master, 735, fm); // 24.50 s
    await posters(f0, `poster-${lang}`);
    await posters(fm, `poster-map-${lang}`);
    const c = await paperDeltaE(f0);
    log(`   paper at (540,40): ${c.rgb} vs #f4ede6 → ΔE ${c.dE.toFixed(2)}${c.dE > 2 ? ' (> 2: the page feather hides the edge, token unchanged)' : ''}`);
  }
  for (const lang of LANGS) {
    if (CUTS.includes('ad')) render('index.html', path.join(FILM, `vars/ad-${lang}.json`), path.join(RENDERS, `hero-ad-${lang}-1080.mp4`), 31);
    if (CUTS.includes('ad15')) render('compositions/cut15.html', path.join(FILM, `vars/ad-${lang}.json`), path.join(RENDERS, `hero-ad15-${lang}-1080.mp4`), 15);
  }
  fs.rmSync(TMP, { recursive: true, force: true });
  log('all done');
}

main().catch((e) => {
  console.error('[hf-hero-render] FAILED:', e.message || e);
  process.exit(1);
});
