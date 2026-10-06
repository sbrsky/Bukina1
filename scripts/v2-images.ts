/**
 * scripts/v2-images.ts — the shared /v2 image pipeline (DESIGN.md §8, MOTION.md §2).
 *
 *   npx tsx scripts/v2-images.ts                 # build everything (re-uses the cached face alpha)
 *   npx tsx scripts/v2-images.ts --force-alpha   # re-run `hyperframes remove-background`
 *   npx tsx scripts/v2-images.ts --film-only     # film masters + assets only (page derivatives untouched)
 *
 * Inputs : public/before1.jpeg (clean face, 1031×1280), public/before.jpeg (same face, forehead acne)
 *
 * Film masters / assets (videos/skinlab-hero/):
 *   source/before1@2x.webp, source/before@2x.webp   2× Lanczos3 upscale + light unsharp, lossless WebP
 *                                                   (owner override: sharp instead of Real-ESRGAN)
 *   source/face-alpha@2x.png                        ONE alpha for both layers (hyperframes remove-background
 *                                                   on before1@2x), stored as an 8-bit greyscale mask
 *   source/acne-spots.json                          measured acne spots (source px) for ACNE_SPOTS
 *   assets/face-clear.webp                          before1@2x × alpha → 1560×1937, WebP q84 + alpha
 *   assets/forehead-acne.webp                       before@2x × alpha × feathered ellipse → 1560×1937
 *   assets/grain-256.png                            static seeded noise tile (same bytes as the page's)
 *
 * Page derivatives (public/media/v2/):
 *   face-clear-{640,960,1280}.{avif,webp}           alpha cut-out (atlas portrait)
 *   zone-{categoryId}-{320,640}.{avif,webp}         square face-zone crops over blush (price-row thumbs)
 *   crop-{lips,jaw,glow}-{640,960}.{avif,webp}      4:5 portrait crops over blush (spreads; review round 2:
 *                                                   a lips macro, a jaw/contour crop, the whole face)
 *   forehead-{before,after}-{640,1200}.{avif,webp}  3:2 forehead crops, original photo (proof slider)
 *   grain-256.png
 *
 * Deterministic: no Math.random (grain uses mulberry32), stable encoder settings.
 */
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile, stat, copyFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const HERO = path.join(ROOT, 'videos/skinlab-hero');
const SRC_DIR = path.join(HERO, 'source');
const ASSETS = path.join(HERO, 'assets');
const MEDIA = path.join(PUB, 'media/v2');
const FORCE_ALPHA = process.argv.includes('--force-alpha');
/** --film-only: rebuild the film masters/assets only (no grain, no page derivatives, no QA images). */
const FILM_ONLY = process.argv.includes('--film-only');

// ── geometry ────────────────────────────────────────────────────────────────────
const SRC_W = 1031;
const SRC_H = 1280;
const K = 2; // upscale factor
const M_W = SRC_W * K; // 2062
const M_H = SRC_H * K; // 2560
const FILM_W = 1560;
const FILM_H = 1937;

const PAPER = '#F4EDE6';
const BLUSH = '#E3BBBC';

/** MOTION.md §2: forehead patch ellipse, source px. Feather is centred on the ellipse edge
 *  (alpha .5 on the edge, 1 at 18 px inside, 0 at 18 px outside). */
const FOREHEAD = { cx: 518, cy: 378, rx: 150, ry: 112, feather: 36 };

/**
 * Film-only soft edges (review fix "cut-out edges"): the remove-background alpha ends in straight
 * horizontal/vertical cuts where the bust meets the bottom and side edges of the photo, and several
 * camera poses bring those cuts into frame. The film assets get alpha × smoothstep fades over the
 * last 260 film px at the bottom and the outer 180 film px at the sides (only the shoulders reach
 * them). Page derivatives keep the plain alpha. `#glaze`/sweep masks use face-clear.webp itself,
 * so every film layer shares this one alpha.
 */
const FILM_FADE = { bottom: 260 / FILM_H, side: 180 / FILM_W };

/** DESIGN.md §5.6: proof slider forehead crop, source px (3:2). */
const FOREHEAD_CROP = { x: 286, y: 214, w: 460, h: 307 };

/**
 * Face-zone crops, source px of the 1031×1280 portrait: centre + side (square).
 * Zones follow the film chapters (MOTION.md §7) and the atlas (DESIGN.md §5.4).
 */
const ZONES: Record<string, { cx: number; cy: number; size: number }> = {
  skincare: { cx: 515, cy: 360, size: 380 }, // forehead (C1)
  peels: { cx: 365, cy: 655, size: 340 }, // left cheekbone, tone (C2 hatches)
  mesotherapy: { cx: 630, cy: 575, size: 300 }, // right eye + under-eye (C3)
  biorevitalization: { cx: 560, cy: 790, size: 360 }, // lips + cheek (C4)
  biostimulation: { cx: 680, cy: 850, size: 400 }, // jawline / oval (C5)
  complex: { cx: 515, cy: 600, size: 720 }, // whole face (C6 glow)
  consultation: { cx: 512, cy: 640, size: 560 }, // eyes → lips, the "conversation" crop (C7)
};

/**
 * Spread portrait crops (4:5), source px: centre + width. Review round 2 (art direction): the same
 * frontal face filled the film, the atlas and all three spreads — each spread now gets its own
 * scale: a lips macro (from below the eyes to the neck), a jaw / contour crop (right cheek, ear,
 * jawline, half the lips) and the whole face (Spread C, shown small). The two macros are 440 source
 * px wide, so the page caps them at 594 px on screen (≤ 1.35 source px per screen px — owner
 * override: no AI upscaler; the 2× Lanczos master keeps them acceptable at that scale).
 * (crop-oval / crop-cheek of round 1 are no longer generated or used.)
 */
const CROPS: Record<string, { cx: number; cy: number; w: number }> = {
  lips: { cx: 508, cy: 850, w: 440 }, // biorevitalization: lips macro, y 575–1125 (eyes excluded)
  jaw: { cx: 720, cy: 860, w: 440 }, // biostimulation: jawline / contour, x 500–940, y 585–1135
  glow: { cx: 515, cy: 600, w: 760 }, // complex: the whole face (Spread C, small print)
};

// ── helpers ─────────────────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
const log: string[] = [];
async function report(file: string, budget?: number) {
  const { size } = await stat(file);
  const rel = path.relative(ROOT, file);
  const over = budget && size > budget ? `  ⚠ over budget ${kb(budget)}` : '';
  log.push(`${rel.padEnd(62)} ${kb(size).padStart(10)}${over}`);
}

/** Clamp a rect (in master px) to the master bounds. */
function rectM(x: number, y: number, w: number, h: number) {
  const left = Math.max(0, Math.round(x * K));
  const top = Math.max(0, Math.round(y * K));
  const width = Math.min(M_W - left, Math.round(w * K));
  const height = Math.min(M_H - top, Math.round(h * K));
  return { left, top, width, height };
}

async function writeAvifWebp(
  img: sharp.Sharp,
  base: string,
  opts: { avifQ?: number; webpQ?: number; budgetAvif?: number } = {},
) {
  const avif = `${base}.avif`;
  const webp = `${base}.webp`;
  await img.clone().avif({ quality: opts.avifQ ?? 52, effort: 6, chromaSubsampling: '4:2:0' }).toFile(avif);
  await img.clone().webp({ quality: opts.webpQ ?? 80, alphaQuality: 90, effort: 6, smartSubsample: true }).toFile(webp);
  await report(avif, opts.budgetAvif);
  await report(webp);
}

// ── 1. masters ──────────────────────────────────────────────────────────────────
async function upscale(input: string): Promise<Buffer> {
  // 2× Lanczos3, then a light unsharp mask (owner override #2: no Real-ESRGAN).
  return sharp(input)
    .removeAlpha()
    .toColourspace('srgb')
    .resize(M_W, M_H, { kernel: 'lanczos3' })
    .sharpen({ sigma: 0.8, m1: 0.6, m2: 1.4, x1: 2, y2: 10, y3: 18 })
    .raw()
    .toBuffer();
}

async function main() {
  for (const d of [SRC_DIR, ASSETS, MEDIA]) await mkdir(d, { recursive: true });

  const clean = await upscale(path.join(PUB, 'before1.jpeg'));
  const acne = await upscale(path.join(PUB, 'before.jpeg'));
  const raw3 = { raw: { width: M_W, height: M_H, channels: 3 as const } };

  const cleanMaster = path.join(SRC_DIR, 'before1@2x.webp');
  const acneMaster = path.join(SRC_DIR, 'before@2x.webp');
  await sharp(clean, raw3).webp({ lossless: true, effort: 4 }).toFile(cleanMaster);
  await sharp(acne, raw3).webp({ lossless: true, effort: 4 }).toFile(acneMaster);
  await report(cleanMaster);
  await report(acneMaster);

  // ── 2. ONE face alpha (from the clean master) ───────────────────────────────
  const alphaPath = path.join(SRC_DIR, 'face-alpha@2x.png');
  if (FORCE_ALPHA || !existsSync(alphaPath)) {
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'v2-images-'));
    const inPng = path.join(tmp, 'before1@2x.png');
    const cutPng = path.join(tmp, 'cutout.png');
    await sharp(clean, raw3).png({ compressionLevel: 3 }).toFile(inPng);
    console.log('· hyperframes remove-background (u2net_human_seg) …');
    execFileSync('npx', ['--no-install', 'hyperframes', 'remove-background', inPng, '-o', cutPng], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    const cut = sharp(cutPng);
    const meta = await cut.metadata();
    if (meta.width !== M_W || meta.height !== M_H) throw new Error(`cutout is ${meta.width}×${meta.height}`);
    await cut.extractChannel('alpha').toColourspace('b-w').png({ compressionLevel: 9 }).toFile(alphaPath);
    await rm(tmp, { recursive: true, force: true });
  } else {
    console.log('· face alpha cached (use --force-alpha to recompute)');
  }
  await report(alphaPath);
  const alpha = await sharp(alphaPath).extractChannel(0).raw().toBuffer();
  if (alpha.length !== M_W * M_H) throw new Error('alpha size mismatch');

  // RGBA composites at master resolution
  const rgba = (rgb: Buffer, a: Buffer) => {
    const out = Buffer.alloc(M_W * M_H * 4);
    for (let i = 0, j = 0, k = 0; k < M_W * M_H; i += 3, j += 4, k++) {
      out[j] = rgb[i];
      out[j + 1] = rgb[i + 1];
      out[j + 2] = rgb[i + 2];
      out[j + 3] = a[k];
    }
    return out;
  };
  const raw4 = { raw: { width: M_W, height: M_H, channels: 4 as const } };
  const faceRGBA = rgba(clean, alpha);

  // film alpha = alpha × soft bottom/side edge fades (see FILM_FADE)
  const smooth01 = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const filmAlpha = Buffer.alloc(M_W * M_H);
  {
    const bandB = FILM_FADE.bottom * M_H;
    const bandS = FILM_FADE.side * M_W;
    const sideF = new Float32Array(M_W);
    for (let x = 0; x < M_W; x++) sideF[x] = smooth01((x + 0.5) / bandS) * smooth01((M_W - x - 0.5) / bandS);
    for (let y = 0; y < M_H; y++) {
      const fb = smooth01((M_H - y - 0.5) / bandB);
      for (let x = 0; x < M_W; x++) {
        const k = y * M_W + x;
        filmAlpha[k] = Math.round(alpha[k] * fb * sideF[x]);
      }
    }
  }
  const faceFilmRGBA = rgba(clean, filmAlpha);

  // forehead mask = film alpha × feathered ellipse (computed in master px)
  const fh = Buffer.alloc(M_W * M_H);
  {
    const cx = FOREHEAD.cx * K;
    const cy = FOREHEAD.cy * K;
    const rx = FOREHEAD.rx * K;
    const ry = FOREHEAD.ry * K;
    const half = (FOREHEAD.feather * K) / 2;
    const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
    for (let y = 0; y < M_H; y++) {
      for (let x = 0; x < M_W; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const rn = Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2);
        const dist = rn === 0 ? -Math.min(rx, ry) : Math.hypot(dx, dy) * (1 - 1 / rn); // ≈ signed px to edge
        const e = smooth((half - dist) / (2 * half));
        const k = y * M_W + x;
        fh[k] = Math.round(e * filmAlpha[k]);
      }
    }
  }
  const acneRGBA = rgba(acne, fh);

  // ── 3. film assets ──────────────────────────────────────────────────────────
  const faceClear = path.join(ASSETS, 'face-clear.webp');
  await sharp(faceFilmRGBA, raw4)
    .resize(FILM_W, FILM_H, { kernel: 'lanczos3' })
    .webp({ quality: 84, alphaQuality: 92, effort: 6, smartSubsample: true })
    .toFile(faceClear);
  await report(faceClear, 350 * 1024);

  const foreheadAcne = path.join(ASSETS, 'forehead-acne.webp');
  await sharp(acneRGBA, raw4)
    .resize(FILM_W, FILM_H, { kernel: 'lanczos3' })
    .webp({ quality: 84, alphaQuality: 90, effort: 6, smartSubsample: true })
    .toFile(foreheadAcne);
  await report(foreheadAcne, 60 * 1024);

  if (FILM_ONLY) {
    console.log(log.join('\n'));
    console.log('--film-only: skipped grain, acne spots, page derivatives and QA images');
    return;
  }

  // ── 4. grain tile (shared page + film) ───────────────────────────────────────
  // Transparent tile with sparse 1-px specks: dark specks read under `multiply` (page, film),
  // light specks under `screen` (ink booking section). Seeded → byte-stable.
  const grain = Buffer.alloc(256 * 256 * 4);
  {
    const rnd = mulberry32(2027);
    for (let k = 0; k < 256 * 256; k++) {
      const r = rnd();
      const j = k * 4;
      if (r < 0.075) {
        // dark speck (plum-tinted ink), 2 strengths
        grain[j] = 46;
        grain[j + 1] = 30;
        grain[j + 2] = 34;
        grain[j + 3] = r < 0.03 ? 255 : 150;
      } else if (r < 0.125) {
        // light speck (glaze)
        grain[j] = 255;
        grain[j + 1] = 248;
        grain[j + 2] = 242;
        grain[j + 3] = 220;
      }
    }
  }
  const grainAsset = path.join(ASSETS, 'grain-256.png');
  const grainPage = path.join(MEDIA, 'grain-256.png');
  await sharp(grain, { raw: { width: 256, height: 256, channels: 4 } })
    .png({ palette: true, colours: 4, dither: 0, compressionLevel: 9, effort: 10 })
    .toFile(grainAsset);
  await copyFile(grainAsset, grainPage);
  await report(grainAsset, 8 * 1024);
  await report(grainPage, 8 * 1024);

  // ── 5. measured acne spots (for ACNE_SPOTS in scenes.js) ─────────────────────
  await writeFile(path.join(SRC_DIR, 'acne-spots.json'), JSON.stringify(await measureAcne(), null, 2) + '\n');
  await report(path.join(SRC_DIR, 'acne-spots.json'));

  // ── 6. page derivatives ─────────────────────────────────────────────────────
  // 6a. cut-out face (alpha), full frame
  for (const w of [640, 960, 1280]) {
    const img = sharp(faceRGBA, raw4).resize(w, Math.round((w * M_H) / M_W), { kernel: 'lanczos3' });
    await writeAvifWebp(img, path.join(MEDIA, `face-clear-${w}`), {
      avifQ: 50,
      budgetAvif: w === 960 ? 70 * 1024 : undefined,
    });
  }

  // flattened face over blush (crops never show the cold clinic background)
  const onBlush = await sharp(faceRGBA, raw4).flatten({ background: BLUSH }).raw().toBuffer();

  // 6b. zone thumbnails (square)
  for (const [id, z] of Object.entries(ZONES)) {
    const r = rectM(z.cx - z.size / 2, z.cy - z.size / 2, z.size, z.size);
    for (const w of [320, 640]) {
      const img = sharp(onBlush, raw3).extract(r).resize(w, w, { kernel: 'lanczos3' });
      await writeAvifWebp(img, path.join(MEDIA, `zone-${id}-${w}`), { avifQ: 52 });
    }
  }

  // 6c. spread crops (4:5)
  for (const [id, c] of Object.entries(CROPS)) {
    const h = (c.w * 5) / 4;
    const r = rectM(c.cx - c.w / 2, c.cy - h / 2, c.w, h);
    for (const w of [640, 960]) {
      const img = sharp(onBlush, raw3).extract(r).resize(w, Math.round((w * 5) / 4), { kernel: 'lanczos3' });
      await writeAvifWebp(img, path.join(MEDIA, `crop-${id}-${w}`), { avifQ: 52 });
    }
  }

  // 6d. forehead pair (3:2), original photographs, pixel-aligned in this band
  {
    const r = rectM(FOREHEAD_CROP.x, FOREHEAD_CROP.y, FOREHEAD_CROP.w, FOREHEAD_CROP.h);
    for (const [name, buf] of [
      ['before', acne],
      ['after', clean],
    ] as const) {
      for (const w of [640, 1200]) {
        const img = sharp(buf, raw3).extract(r).resize(w, Math.round((w * 2) / 3), { kernel: 'lanczos3' });
        await writeAvifWebp(img, path.join(MEDIA, `forehead-${name}-${w}`), { avifQ: 56, webpQ: 82 });
      }
    }
  }

  // 6e. QA images (not deployed, not committed): alpha edges + forehead patch alignment
  const qa = process.env.V2_QA_DIR ?? path.join(os.tmpdir(), 'v2-images-qa');
  await mkdir(qa, { recursive: true });
  await sharp(faceRGBA, raw4).flatten({ background: PAPER }).resize(700).jpeg({ quality: 82 }).toFile(path.join(qa, 'face-on-paper.jpg'));
  await sharp(faceRGBA, raw4).flatten({ background: BLUSH }).resize(700).jpeg({ quality: 82 }).toFile(path.join(qa, 'face-on-blush.jpg'));
  {
    // acne patch composited over the clean face, forehead region, 2× zoom of source
    // left: clean face + acne patch (what the film shows at C1 start); right: the clean face alone
    const stacked = await sharp(onBlush, raw3)
      .composite([{ input: acneRGBA, raw: raw4.raw }])
      .removeAlpha()
      .raw()
      .toBuffer();
    const r = rectM(330, 230, 380, 300);
    const left = await sharp(stacked, raw3).extract(r).png().toBuffer();
    const right = await sharp(onBlush, raw3).extract(r).png().toBuffer();
    await sharp({ create: { width: r.width * 2 + 8, height: r.height, channels: 3, background: '#000' } })
      .composite([
        { input: left, left: 0, top: 0 },
        { input: right, left: r.width + 8, top: 0 },
      ])
      .jpeg({ quality: 85 })
      .toFile(path.join(qa, 'forehead-stack.jpg'));
    await sharp(fh, { raw: { width: M_W, height: M_H, channels: 1 } }).resize(700).png().toFile(path.join(qa, 'forehead-mask.png'));
  }

  console.log(log.join('\n'));
  console.log(`QA images: ${qa}`);
}

/** Measure acne spots: redness/darkness gain of before.jpeg over before1.jpeg in the forehead band. */
async function measureAcne() {
  const A = await sharp(path.join(PUB, 'before.jpeg')).removeAlpha().blur(1.2).raw().toBuffer();
  const B = await sharp(path.join(PUB, 'before1.jpeg')).removeAlpha().blur(1.2).raw().toBuffer();
  const w = SRC_W;
  const [x0, x1, y0, y1] = [360, 700, 250, 500];
  const m = new Float32Array(w * SRC_H);
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 3;
      const redGain = A[i] - A[i + 1] - (B[i] - B[i + 1]);
      const darkGain = (B[i] + B[i + 1] + B[i + 2] - A[i] - A[i + 1] - A[i + 2]) / 3;
      m[y * w + x] = Math.max(0, redGain) + Math.max(0, darkGain) * 0.5;
    }
  const th = 18;
  const seen = new Uint8Array(w * SRC_H);
  const blobs: { x: number; y: number; r: number; score: number }[] = [];
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const k0 = y * w + x;
      if (seen[k0] || m[k0] < th) continue;
      const st = [k0];
      seen[k0] = 1;
      let n = 0,
        sx = 0,
        sy = 0,
        sw = 0;
      while (st.length) {
        const q = st.pop()!;
        const qx = q % w;
        const qy = (q - qx) / w;
        n++;
        sx += qx * m[q];
        sy += qy * m[q];
        sw += m[q];
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = qx + dx;
          const ny = qy + dy;
          if (nx < x0 || nx >= x1 || ny < y0 || ny >= y1) continue;
          const nk = ny * w + nx;
          if (!seen[nk] && m[nk] >= th) {
            seen[nk] = 1;
            st.push(nk);
          }
        }
      }
      if (n >= 40) blobs.push({ x: Math.round(sx / sw), y: Math.round(sy / sw), r: Math.round(Math.sqrt(n / Math.PI)), score: Math.round(sw) });
    }
  blobs.sort((a, b) => b.score - a.score);
  return {
    note: 'Acne spots on public/before.jpeg, source px (1031×1280), strongest first. `top11` = MOTION.md §2 ACNE_SPOTS candidates. r = approx. visible radius in source px. Measured by scripts/v2-images.ts (diff vs before1.jpeg).',
    top11: blobs.slice(0, 11).map(({ x, y, r }) => ({ x, y, r })),
    all: blobs,
  };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
