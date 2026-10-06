#!/usr/bin/env node
/**
 * scripts/v2-shot.mjs — reusable screenshot / smoke tool for /v2 (puppeteer-core + the local
 * chrome-headless-shell from ~/.cache/puppeteer; no browser download).
 *
 *   node scripts/v2-shot.mjs --url http://localhost:5180/v2 \
 *        --widths 360,390,768,1024,1440,1920 --out /tmp/v2-shots [--full] [--reduced-motion] \
 *        [--wait 1500] [--height 900] [--lang ru|lv|en] [--scroll] [--selector "#atlas"] [--consent]
 *
 * --full walks the page first (so reveal-once animations run) and renders the content-visibility:auto
 * sections for the capture (a plain full-page capture leaves every section below the first screen
 * blank, because Chrome skips rendering them outside the viewport).
 * --consent pre-sets the main site's `cookie-consent` key so its banner does not cover the shot.
 *
 * --lang sets localStorage.skinlab_lang AND clicks the page's `[data-v2-lang="<code>"]` toggle
 * (convention for the Masthead/Colophon language buttons). Check the printed <html lang>.
 *
 * Writes <out>/<width>.png (with --selector: <width>-<slug>.png, element shot) and prints per width:
 *   - console errors (and page errors), failed requests (network failures + HTTP ≥ 400)
 *   - every request host (so a stray fonts.googleapis.com / cdn.jsdelivr.net shows up)
 *   - document.scrollWidth vs innerWidth (horizontal overflow) — flags offenders' selectors
 * Exit code 1 if any width had console errors, failed requests or horizontal overflow
 * (use --no-fail to always exit 0).
 *
 * Browser: $CHROME_PATH, else the newest ~/.cache/puppeteer/chrome-headless-shell/*, else chrome/*.
 */
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// ── args ─────────────────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const has = (name) => argv.includes(`--${name}`);

const url = arg('url', 'http://localhost:5180/v2');
const widths = String(arg('widths', '360,390,768,1024,1440,1920'))
  .split(',')
  .map((w) => parseInt(w, 10))
  .filter(Boolean);
const outDir = path.resolve(String(arg('out', path.join(os.tmpdir(), 'v2-shots'))));
const full = has('full');
const reduced = has('reduced-motion');
const wait = parseInt(String(arg('wait', '1200')), 10);
const height = parseInt(String(arg('height', '900')), 10);
const lang = arg('lang', null);
const scroll = has('scroll');
const selector = arg('selector', null);
const noFail = has('no-fail');
const consent = has('consent');

if (has('help')) {
  console.log(
    'usage: node scripts/v2-shot.mjs --url <url> --widths 360,1440 --out <dir> [--full] [--reduced-motion] [--wait ms] [--height px] [--lang ru|lv|en] [--scroll] [--selector css] [--no-fail]',
  );
  process.exit(0);
}

/**
 * Full-page PNG. Chrome cannot rasterise one capture taller than its 16 384 px texture limit (the
 * rest comes out blank), so tall pages (phones ≈ 17 000 px) are captured in 8 000 px tiles and
 * stitched with sharp.
 */
async function fullPageShot(page, file) {
  const { w, h } = await page.evaluate(() => ({
    w: document.documentElement.clientWidth,
    h: Math.ceil(document.documentElement.scrollHeight),
  }));
  if (h <= 16000) return page.screenshot({ path: file, fullPage: true });
  const TILE = 8000;
  const tiles = [];
  for (let y = 0; y < h; y += TILE) {
    const height = Math.min(TILE, h - y);
    tiles.push({ input: await page.screenshot({ clip: { x: 0, y, width: w, height }, captureBeyondViewport: true }), top: y, left: 0 });
  }
  await sharp({ create: { width: w, height: h, channels: 4, background: '#ffffff' } }).composite(tiles).png().toFile(file);
}

// ── browser ──────────────────────────────────────────────────────────────────────────────────
function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const base = path.join(os.homedir(), '.cache/puppeteer');
  const candidates = [
    ['chrome-headless-shell', (v) => [`chrome-headless-shell-${v}`, 'chrome-headless-shell']],
    [
      'chrome',
      (v) => [`chrome-${v}`, 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'],
    ],
  ];
  for (const [kind, rel] of candidates) {
    const dir = path.join(base, kind);
    if (!existsSync(dir)) continue;
    const builds = readdirSync(dir).sort().reverse(); // e.g. mac_arm-148.0.7778.97
    for (const b of builds) {
      const platform = b.split('-')[0]; // mac_arm / mac / linux / win64
      const plat = { mac_arm: 'mac-arm64', mac: 'mac-x64', linux: 'linux64', win64: 'win64' }[platform] ?? platform;
      const p = path.join(dir, b, ...rel(plat));
      if (existsSync(p)) return p;
    }
  }
  throw new Error('No Chrome found: set CHROME_PATH or install chrome-headless-shell into ~/.cache/puppeteer');
}

const executablePath = findChrome();
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--font-render-hinting=none', '--force-color-profile=srgb'],
});

await mkdir(outDir, { recursive: true });
console.log(`browser  ${path.basename(executablePath)} (${await browser.version()})`);
console.log(`url      ${url}`);
console.log(`out      ${outDir}${reduced ? '  [prefers-reduced-motion: reduce]' : ''}${lang ? `  [lang ${lang}]` : ''}`);

let problems = 0;

for (const width of widths) {
  const ctx = await browser.createBrowserContext(); // isolated storage per width
  const page = await ctx.newPage();
  const consoleErrors = [];
  const failed = [];
  const hosts = new Map();

  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('request', (r) => {
    try {
      const h = new URL(r.url()).host || r.url().split(':')[0];
      hosts.set(h, (hosts.get(h) ?? 0) + 1);
    } catch {
      /* data: etc. */
    }
  });
  page.on('requestfailed', (r) => {
    const reason = r.failure()?.errorText ?? 'failed';
    // benign aborts: media range requests, Firestore long-poll/stream channels closed on navigation/close
    if (reason === 'net::ERR_ABORTED' && (/\.(mp4|webm)(\?|$)/.test(r.url()) || /firestore\.googleapis\.com\/.*\/(Listen|Write)\/channel/.test(r.url()))) return;
    failed.push(`${reason}  ${r.url()}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(`HTTP ${res.status()}  ${res.url()}`);
  });

  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }]);
  if (consent) {
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem('cookie-consent', 'accepted');
      } catch {
        /* ignore */
      }
    });
  }
  if (lang) {
    await page.evaluateOnNewDocument((l) => {
      try {
        localStorage.setItem('skinlab_lang', l);
      } catch {
        /* ignore */
      }
    }, lang);
  }

  const t0 = Date.now();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  } catch (e) {
    consoleErrors.push(`goto: ${e.message}`);
  }
  if (lang) {
    // LangContext does not restore localStorage on reload when 'ru' is enabled, so also click the
    // page's own toggle: convention — language toggles carry data-v2-lang="<code>" (Masthead/Colophon).
    const switched = await page.evaluate((l) => {
      const el = document.querySelector(`[data-v2-lang="${l}"]`);
      if (el instanceof HTMLElement) el.click();
      return Boolean(el);
    }, lang);
    if (!switched) console.log(`   (no [data-v2-lang="${lang}"] toggle on the page — language may not have switched)`);
    await new Promise((r) => setTimeout(r, 300));
  }
  await page.evaluate(() => document.fonts?.ready);
  if (scroll || full) {
    // walk the page so whileInView / lazy content renders, then return to top
    await page.evaluate(async () => {
      const step = Math.round(innerHeight * 0.8);
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 120));
      }
      // lazy images passed during the fast walk may not have loaded yet: load + decode them all
      const imgs = [...document.images];
      for (const i of imgs) if (i.loading === 'lazy') i.loading = 'eager';
      await Promise.all(
        imgs.map((i) =>
          i.complete && i.naturalWidth
            ? i.decode?.().catch(() => {})
            : new Promise((r) => {
                i.addEventListener('load', r, { once: true });
                i.addEventListener('error', r, { once: true });
                setTimeout(r, 8000);
              }),
        ),
      );
      scrollTo({ top: 0, behavior: 'instant' });
    });
  }
  await new Promise((r) => setTimeout(r, wait));

  const metrics = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    if (document.documentElement.scrollWidth > innerWidth) {
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > vw + 1 || r.left < -1)) {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed') continue;
          const id = el.id ? `#${el.id}` : '';
          const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
          offenders.push(`${el.tagName.toLowerCase()}${id}${cls} [${Math.round(r.left)}…${Math.round(r.right)}]`);
          if (offenders.length >= 8) break;
        }
      }
    }
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
      htmlLang: document.documentElement.lang,
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim().replace(/\s+/g, ' ') ?? null,
      fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.style} ${f.unicodeRange.slice(0, 14)}`),
      offenders,
    };
  });

  let file;
  if (selector) {
    const el = await page.$(selector);
    const slug = String(selector).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    file = path.join(outDir, `${width}-${slug}.png`);
    if (el) await el.screenshot({ path: file });
    else consoleErrors.push(`selector not found: ${selector}`);
  } else {
    file = path.join(outDir, `${width}.png`);
    if (full) {
      await page.evaluate(() => {
        const s = document.createElement('style');
        s.dataset.shot = 'cv';
        s.textContent = '*{content-visibility:visible!important}';
        document.head.appendChild(s);
      });
      await new Promise((r) => setTimeout(r, 700));
      // every image (incl. lazy CMS photos that the fast walk only started) loaded AND decoded, so a
      // capture never shows an empty mat that a real visitor would not see (review round 2)
      await page.evaluate(async () => {
        const imgs = [...document.images];
        for (const i of imgs) if (i.loading === 'lazy') i.loading = 'eager';
        await Promise.all(
          imgs.map((i) =>
            (i.complete
              ? Promise.resolve()
              : new Promise((r) => {
                  i.addEventListener('load', r, { once: true });
                  i.addEventListener('error', r, { once: true });
                  setTimeout(r, 10000);
                })
            ).then(() => (i.naturalWidth ? i.decode?.().catch(() => {}) : undefined)),
          ),
        );
      });
      await new Promise((r) => setTimeout(r, 400));
    }
    if (full) await fullPageShot(page, file);
    else await page.screenshot({ path: file });
  }

  const overflow = metrics.scrollWidth > metrics.innerWidth;
  const bad = consoleErrors.length > 0 || failed.length > 0 || overflow;
  if (bad) problems++;

  console.log(`\n── ${width}px ${bad ? '✗' : '✓'}  (${Date.now() - t0} ms)  → ${file}`);
  console.log(`   scrollWidth ${metrics.scrollWidth} vs innerWidth ${metrics.innerWidth}${overflow ? '  ⚠ HORIZONTAL OVERFLOW' : ''}  · height ${metrics.scrollHeight}`);
  if (metrics.offenders.length) console.log(`   overflowing: ${metrics.offenders.join(' | ')}`);
  console.log(`   <html lang="${metrics.htmlLang}">  title: ${metrics.title}`);
  console.log(`   h1: ${metrics.h1 ?? '—'}`);
  console.log(`   hosts: ${[...hosts].map(([h, n]) => `${h} (${n})`).join(', ')}`);
  console.log(`   fonts loaded: ${metrics.fonts.length ? metrics.fonts.join(' · ') : '—'}`);
  console.log(`   console errors: ${consoleErrors.length ? '' : 'none'}`);
  for (const e of consoleErrors) console.log(`     ! ${e.slice(0, 400)}`);
  console.log(`   failed requests: ${failed.length ? '' : 'none'}`);
  for (const f of failed) console.log(`     ! ${f.slice(0, 300)}`);

  await page.close();
  await ctx.close();
}

await browser.close();
console.log(`\n${problems ? `${problems} width(s) with problems` : 'all widths clean'}`);
process.exit(problems && !noFail ? 1 : 0);
