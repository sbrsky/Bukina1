#!/usr/bin/env node
/**
 * scripts/v2-qa.mjs — end-to-end acceptance checks for /v2 against a running server (best: the
 * production build, `npx vite preview --port 5190 --strictPort`). puppeteer-core + the local
 * chrome-headless-shell (same lookup as v2-shot.mjs). Read-only: never writes to Firestore.
 *
 *   node scripts/v2-qa.mjs --url http://localhost:5190/v2 [--out docs/v2/shots/round1] [--only live,mp4,...]
 *
 * Scenarios (each prints PASS/FAIL lines; exit 1 if any FAIL):
 *   live      1440 fine pointer: live composition, ready, time advances, crossfade, chapter seek +
 *             aria-current, pause toggle, off-screen pause/resume, CTA pill pulse at 26.95 s
 *   reduced   prefers-reduced-motion at 390 + 1440: no player script, still mode, face-map poster,
 *             «Смотреть» button; a chapter click loads the film and plays from that chapter
 *   mp4       forced MP4 delivery: coarse pointer (1440 + touch), Save-Data (1440), phone (390),
 *             live entry missing (1440, 404 → MP4 fallback): ready, time advances, chapter seek
 *   bar       mobile booking bar at 360/390 (shown after the cover, hidden at #booking, never over
 *             colophon links) and absent at 768
 *   anchors   masthead nav (1440) / menu (390) links and the /v2#faq deep link land exactly on the
 *             section (content-visibility placeholders), instant under reduced motion
 *   lang      LV (live settings, via the page toggle) and EN (settings unreachable → default
 *             languages, via the toggle) at 390/1440: <html lang>, film/poster language, overflow,
 *             clipped glyph ink (diacritics) under overflow/clip-path ancestors, font coverage
 *   atf       above-the-fold shots at 390/1440 after ~8 s of film (consent pre-set) + first-visit
 *             variants with the cookie banner
 * Every scenario also checks: console errors, page errors, failed requests, horizontal overflow,
 * H1 text, and request hosts (no script CDNs; Google Fonts only the accepted Montserrat CSS).
 */
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const URL_V2 = String(arg('url', 'http://localhost:5190/v2'));
const OUT = path.resolve(String(arg('out', 'docs/v2/shots/round1')));
const ONLY = arg('only', null) ? String(arg('only')).split(',') : null;
const ORIGIN = new URL(URL_V2).origin;
const H1_RU = 'Эстетическая косметология в Риге';
const CHAPTER_STARTS = [3.9, 7.1, 10.3, 13.5, 16.7, 19.9, 25.6];

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const base = path.join(os.homedir(), '.cache/puppeteer');
  const kinds = [
    ['chrome-headless-shell', (p) => [`chrome-headless-shell-${p}`, 'chrome-headless-shell']],
    ['chrome', (p) => [`chrome-${p}`, 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing']],
  ];
  for (const [kind, rel] of kinds) {
    const dir = path.join(base, kind);
    if (!existsSync(dir)) continue;
    for (const b of readdirSync(dir).sort().reverse()) {
      const plat = { mac_arm: 'mac-arm64', mac: 'mac-x64', linux: 'linux64', win64: 'win64' }[b.split('-')[0]] ?? b;
      const p = path.join(dir, b, ...rel(plat));
      if (existsSync(p)) return p;
    }
  }
  throw new Error('No Chrome found');
}

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--font-render-hinting=none', '--force-color-profile=srgb', '--autoplay-policy=no-user-gesture-required'],
});
await mkdir(OUT, { recursive: true });

const results = [];
const allHosts = new Map();
const allUrls = new Set();
function check(scenario, name, pass, detail = '') {
  results.push({ scenario, name, pass: Boolean(pass), detail: String(detail) });
  console.log(`${pass ? 'PASS' : 'FAIL'}  [${scenario}] ${name}${detail ? `  — ${detail}` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Script/style CDNs that /v2 must never touch (DESIGN.md §11.15, OWNERSHIP.md). */
const CDN_RE = /(^|\.)(jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|esm\.sh|skypack\.dev|jspm\.io|ga\.jspm\.io|cdn\.tailwindcss\.com|code\.jquery\.com|ajax\.googleapis\.com|cdn\.hyperframes\.\w+|cdn\.heygen\.\w+)$/;
const ALLOWED_HOSTS = new Set([new URL(ORIGIN).host, 'firestore.googleapis.com', 'firebasestorage.googleapis.com', 'fonts.googleapis.com']);

async function openPage({ width, height = 900, reduced = false, touch = width < 768, mobile = width < 768, saveData = false, consent = true, blockFirestore = false, intercept = null } = {}) {
  // a fresh incognito context per page: localStorage (cookie-consent, skinlab_lang) never leaks between scenarios
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const closePage = page.close.bind(page);
  page.close = async () => {
    await closePage();
    await ctx.close();
  };
  const log = { consoleErrors: [], warnings: [], failed: [], hosts: new Map(), urls: [], ignored: 0, offline: blockFirestore };
  // errors that the scenario itself provokes (offline Firestore, the deliberate 404) are not page bugs
  const ignore = [
    ...(blockFirestore ? [/firestore|firebase|Could not reach|offline|ERR_INTERNET_DISCONNECTED/i] : []),
    ...(intercept ? [/status of 404/] : []),
  ];
  page.on('console', (m) => {
    if (m.type() === 'error' && ignore.some((re) => re.test(m.text()))) return void log.ignored++;
    if (m.type() === 'error') log.consoleErrors.push(m.text());
    if (m.type() === 'warn' || m.type() === 'warning') log.warnings.push(m.text());
  });
  page.on('pageerror', (e) => log.consoleErrors.push(`pageerror: ${e.message}`));
  page.on('request', (r) => {
    const u = r.url();
    log.urls.push(u);
    allUrls.add(u);
    try {
      const h = new URL(u).host;
      if (h) {
        log.hosts.set(h, (log.hosts.get(h) ?? 0) + 1);
        allHosts.set(h, (allHosts.get(h) ?? 0) + 1);
      }
    } catch {
      /* data: */
    }
  });
  page.on('requestfailed', (r) => {
    const reason = r.failure()?.errorText ?? 'failed';
    const u = r.url();
    if (reason === 'net::ERR_ABORTED' && (/\.(mp4|webm)(\?|$)/.test(u) || /firestore\.googleapis\.com/.test(u) || /\/hf\/skinlab-hero\/index\.\w+\.html$/.test(u))) return;
    if (blockFirestore && /firestore\.googleapis\.com/.test(u)) return;
    log.failed.push(`${reason}  ${u}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && !(intercept && intercept.expect404?.test(res.url()))) log.failed.push(`HTTP ${res.status()}  ${res.url()}`);
  });
  if (blockFirestore || intercept) {
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      if (r.isInterceptResolutionHandled()) return;
      if (blockFirestore && /firestore\.googleapis\.com/.test(r.url())) return r.abort('internetdisconnected');
      if (intercept?.notFound?.test(r.url())) return r.respond({ status: 404, contentType: 'text/plain', body: 'gone' });
      return r.continue();
    });
  }
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: mobile, hasTouch: touch });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }]);
  if (saveData) await page.setExtraHTTPHeaders({ 'Save-Data': 'on' });
  await page.evaluateOnNewDocument(
    ({ consent, saveData }) => {
      try {
        if (consent) localStorage.setItem('cookie-consent', 'accepted');
      } catch {
        /* ignore */
      }
      if (saveData) {
        Object.defineProperty(Navigator.prototype, 'connection', {
          configurable: true,
          get: () => ({ saveData: true, effectiveType: '4g', addEventListener() {}, removeEventListener() {} }),
        });
      }
      // record the cover pill pulse (Cover.tsx uses el.animate on .v2-cover__pill)
      window.__pulses = [];
      const orig = Element.prototype.animate;
      Element.prototype.animate = function (...a) {
        try {
          if (this.classList?.contains('v2-cover__pill')) window.__pulses.push(performance.now());
        } catch {
          /* ignore */
        }
        return orig.apply(this, a);
      };
    },
    { consent, saveData },
  );
  return { page, log };
}

async function common(scenario, page, log, { h1 = H1_RU } = {}) {
  const m = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: innerWidth,
    h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
    h1count: document.querySelectorAll('h1').length,
  }));
  check(scenario, 'no horizontal overflow', m.sw <= m.iw, `scrollWidth ${m.sw} / innerWidth ${m.iw}`);
  if (h1) check(scenario, `H1 = «${h1}»`, m.h1 === h1 && m.h1count === 1, `got «${m.h1}» (${m.h1count} h1)`);
  check(scenario, 'no console/page errors', log.consoleErrors.length === 0, log.consoleErrors.slice(0, 4).join(' | ').slice(0, 600));
  check(scenario, 'no failed requests', log.failed.length === 0, log.failed.slice(0, 4).join(' | ').slice(0, 600));
  // with Firestore cut off, its WebChannel probes www.google.com/images/cleardot.gif (SDK, not the page)
  const hosts = [...log.hosts.keys()].filter((h) => !(log.offline && h === 'www.google.com'));
  const cdn = hosts.filter((h) => CDN_RE.test(h));
  const unexpected = hosts.filter((h) => !ALLOWED_HOSTS.has(h));
  check(scenario, 'no script-CDN requests', cdn.length === 0 && unexpected.length === 0, `hosts: ${hosts.join(', ')}`);
  const gf = log.urls.filter((u) => /fonts\.(googleapis|gstatic)\.com/.test(u));
  check(scenario, 'Google Fonts = only the accepted Montserrat CSS', gf.every((u) => /css2?\?family=Montserrat/.test(u)), gf.join(' ').slice(0, 300));
}

const playerState = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('hyperframes-player');
    const fig = document.querySelector('#hero-film, figure.v2-film');
    const slot = document.querySelector('.v2-film__slot');
    const img = slot?.querySelector('.v2-film__poster img');
    return {
      exists: Boolean(el),
      src: el?.getAttribute('src') ?? null,
      type: el?.getAttribute('type') ?? null,
      sandboxOrigin: el?.hasAttribute('sandbox-origin') ?? false,
      ready: Boolean(el?.ready),
      t: el ? el.currentTime : null,
      paused: el ? el.paused : null,
      duration: el ? el.duration : null,
      mode: fig?.getAttribute('data-mode') ?? null,
      slotReady: slot?.hasAttribute('data-ready') ?? false,
      poster: img ? { src: img.currentSrc, complete: img.complete, nw: img.naturalWidth } : null,
      fallback: slot?.hasAttribute('data-fallback') ?? false,
      watch: Boolean(document.querySelector('.v2-film__watch')),
      toggle: document.querySelector('.v2-film__toggle')?.getAttribute('aria-label') ?? null,
      playerScript: Boolean(document.querySelector('script[data-v2="hyperframes-player"]')),
    };
  });

async function waitFor(page, fn, { timeout = 20000, every = 200 } = {}) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    last = await fn();
    if (last?.ok) return last;
    await sleep(every);
  }
  return last ?? { ok: false };
}

async function waitReady(page, timeout = 25000) {
  return waitFor(page, async () => {
    const s = await playerState(page);
    return { ok: s.exists && s.ready, s };
  }, { timeout });
}

async function rowState(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.v2-index__seek')].map((b) => b.getAttribute('aria-current') === 'true'),
  );
}

/** Click chapter row i (real mouse click, scrolled into view) → t lands at the chapter start, row current. */
async function chapterSeek(scenario, page, i, { label = '' } = {}) {
  const rows = await page.$$('.v2-index__seek');
  if (!rows[i]) return check(scenario, `chapter ${i + 1} row exists`, false);
  await rows[i].click();
  const start = CHAPTER_STARTS[i];
  const r = await waitFor(page, async () => {
    const s = await playerState(page);
    return { ok: s.ready && s.t >= start - 0.05 && s.t < start + 1.6, s };
  }, { timeout: 15000 });
  await sleep(250);
  const s = await playerState(page);
  const cur = await rowState(page);
  check(scenario, `chapter ${String(i + 1).padStart(2, '0')} click seeks to ${start}s${label}`, r.ok, `t=${r.s?.t?.toFixed?.(2)} paused=${r.s?.paused}`);
  check(scenario, `chapter ${String(i + 1).padStart(2, '0')} row highlighted (aria-current, only it)`, cur[i] && cur.filter(Boolean).length === 1, `current=${cur.map((c) => (c ? 1 : 0)).join('')}`);
  return s;
}

async function advances(page, ms = 1500) {
  const a = await playerState(page);
  await sleep(ms);
  const b = await playerState(page);
  return { ok: b.t > a.t + (ms / 1000) * 0.4 || (a.t > 29 && b.t < a.t), a: a.t, b: b.t };
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

async function fullShot(page, file) {
  // walk the page so reveal-once animations fire, then render content-visibility:auto sections
  await page.evaluate(async () => {
    const step = Math.round(innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 140));
    }
    await new Promise((r) => setTimeout(r, 600));
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
    const s = document.createElement('style');
    s.dataset.qa = 'cv';
    s.textContent = '*{content-visibility:visible!important}';
    document.head.appendChild(s);
  });
  await sleep(900);
  await fullPageShot(page, file);
  await page.evaluate(() => document.querySelector('style[data-qa="cv"]')?.remove());
}

// ── scenario: live ───────────────────────────────────────────────────────────────────────────
async function scenarioLive() {
  const S = 'live@1440';
  const { page, log } = await openPage({ width: 1440, height: 900 });
  await page.goto(URL_V2, { waitUntil: 'networkidle2', timeout: 45000 });
  const r = await waitReady(page);
  const s = r.s ?? (await playerState(page));
  check(S, 'delivery mode = live (fine pointer, desktop)', s.mode === 'live' && /index\.ru\.html$/.test(s.src ?? ''), `mode=${s.mode} src=${s.src}`);
  check(S, 'player becomes ready', r.ok, `ready=${s.ready} duration=${s.duration}`);
  check(S, 'no sandbox-origin attribute', !s.sandboxOrigin);
  const adv = await advances(page, 1500);
  check(S, 'currentTime advances (autoplay)', adv.ok, `${adv.a?.toFixed(2)} → ${adv.b?.toFixed(2)}`);
  const s2 = await playerState(page);
  check(S, 'poster crossfaded (slot data-ready after painted)', s2.slotReady);
  check(S, 'poster = frame-0 poster (ru)', /poster-ru-\d+\.(avif|webp)$/.test(s2.poster?.src ?? ''), s2.poster?.src);

  for (const i of [3, 0, 6, 1]) await chapterSeek(S, page, i);

  // pause toggle
  await page.click('.v2-film__toggle');
  await sleep(400);
  let p = await playerState(page);
  const t1 = p.t;
  await sleep(800);
  p = await playerState(page);
  check(S, 'pause toggle pauses (label → «Смотреть»)', p.paused && Math.abs(p.t - t1) < 0.05, `paused=${p.paused} label=${p.toggle}`);
  // a paused film stays paused while scrolled away and back (userPaused)
  await page.evaluate(() => scrollTo({ top: 2600, behavior: 'instant' }));
  await sleep(500);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await sleep(600);
  p = await playerState(page);
  check(S, 'user pause survives scroll-away/back', p.paused);
  await page.click('.v2-film__toggle');
  await sleep(600);
  p = await playerState(page);
  check(S, 'toggle resumes (label → «Пауза»)', !p.paused, `paused=${p.paused} label=${p.toggle}`);

  // off-screen pause / resume
  await page.evaluate(() => scrollTo({ top: 2600, behavior: 'instant' }));
  await sleep(700);
  p = await playerState(page);
  check(S, 'pauses when < 25 % visible', p.paused === true);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await sleep(800);
  p = await playerState(page);
  check(S, 'resumes when back in view', p.paused === false);

  // CTA pill pulse at 26.95 s, when the pill is ≥ 50 % visible
  const pillVisible = await page.evaluate(() => {
    const el = document.querySelector('.v2-cover__pill');
    const r = el.getBoundingClientRect();
    if (r.bottom > innerHeight) scrollBy({ top: r.bottom - innerHeight + 40, behavior: 'instant' });
    return true;
  });
  await sleep(500);
  await page.evaluate(() => {
    window.__pulses = [];
    document.querySelector('hyperframes-player').seek(25.8);
  });
  await sleep(150);
  await page.evaluate(() => document.querySelector('hyperframes-player').play());
  await sleep(2200);
  const pulses = await page.evaluate(() => window.__pulses.length);
  const ps = await playerState(page);
  check(S, 'cover pill pulses once at 26.95 s', pillVisible && pulses === 1, `pulses=${pulses} t=${ps.t?.toFixed(2)}`);

  // loop wrap
  await page.evaluate(() => document.querySelector('hyperframes-player').seek(30.4));
  await sleep(150);
  await page.evaluate(() => document.querySelector('hyperframes-player').play());
  await sleep(1500);
  const lw = await playerState(page);
  check(S, 'loop wraps end → 0', lw.t < 2 && !lw.paused, `t=${lw.t?.toFixed(2)}`);
  const cur = await rowState(page);
  check(S, 'no row current during the hook', cur.every((c) => !c), cur.map((c) => (c ? 1 : 0)).join(''));

  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await common(S, page, log);
  await page.close();
}

// ── scenario: reduced motion ──────────────────────────────────────────────────────────────────
async function scenarioReduced(width) {
  const S = `reduced@${width}`;
  const { page, log } = await openPage({ width, height: width < 768 ? 844 : 900, reduced: true });
  await page.goto(URL_V2, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(3000);
  const s = await playerState(page);
  check(S, 'still mode, nothing autoplays (no player element)', s.mode === 'still' && !s.exists, `mode=${s.mode} player=${s.exists}`);
  check(S, 'player library not loaded', !s.playerScript && !log.urls.some((u) => /hyperframes-player\.global/.test(u)));
  check(S, 'face-map poster shows', /poster-map-ru-\d+\.(avif|webp)$/.test(s.poster?.src ?? '') && s.poster?.complete && s.poster?.nw > 0, s.poster?.src);
  check(S, '«Смотреть фильм» button present', s.watch);
  const vids = await page.evaluate(() => [...document.querySelectorAll('video')].filter((v) => !v.paused).length);
  check(S, 'no playing <video> anywhere', vids === 0);
  await page.screenshot({ path: path.join(OUT, 'reduced', `qa-still-${width}.png`) });
  // a chapter click = user-initiated motion: loads the film and plays from that chapter
  const rows = await page.$$('.v2-index__seek');
  await rows[4].click();
  const r = await waitReady(page, 25000);
  await sleep(600);
  const s2 = await playerState(page);
  const expectMode = width < 768 ? 'mp4' : 'live';
  check(S, `chapter click loads the film (${expectMode}) and plays from 05`, r.ok && s2.mode === expectMode && s2.t >= 16.6 && s2.t < 18.6 && !s2.paused, `mode=${s2.mode} t=${s2.t?.toFixed(2)} paused=${s2.paused}`);
  const cur = await rowState(page);
  check(S, 'row 05 highlighted', cur[4] && cur.filter(Boolean).length === 1, cur.map((c) => (c ? 1 : 0)).join(''));
  await common(S, page, log);
  await page.close();
}

// ── scenario: forced MP4 delivery ─────────────────────────────────────────────────────────────
async function scenarioMp4(label, opts) {
  const S = `mp4:${label}`;
  const { page, log } = await openPage(opts);
  await page.goto(URL_V2, { waitUntil: 'networkidle2', timeout: 45000 });
  const env = await page.evaluate(() => ({
    coarse: matchMedia('(pointer: coarse)').matches,
    saveData: navigator.connection?.saveData ?? null,
    mem: navigator.deviceMemory ?? null,
  }));
  const r = await waitReady(page, 25000);
  const s = r.s ?? (await playerState(page));
  check(S, 'delivery mode = mp4', s.mode === 'mp4' && /renders\/hero-site-ru-720\.mp4$/.test(s.src ?? '') && s.type === 'video/mp4', `mode=${s.mode} src=${s.src} type=${s.type} env=${JSON.stringify(env)}`);
  check(S, 'player becomes ready', r.ok, `duration=${s.duration}`);
  const adv = await advances(page, 1500);
  check(S, 'currentTime advances', adv.ok, `${adv.a?.toFixed(2)} → ${adv.b?.toFixed(2)}`);
  const s2 = await playerState(page);
  check(S, 'poster crossfaded after first timeupdate', s2.slotReady);
  await chapterSeek(S, page, 2);
  await chapterSeek(S, page, 5);
  await common(S, page, log);
  await page.close();
}

// ── scenario: mobile booking bar ──────────────────────────────────────────────────────────────
async function scenarioBar(width) {
  const S = `bar@${width}`;
  const { page, log } = await openPage({ width, height: 800 });
  await page.goto(URL_V2, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(800);
  const barRect = () =>
    page.evaluate(() => {
      const b = document.querySelector('.v2-bar');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      const cs = getComputedStyle(b);
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, display: cs.display, ih: innerHeight };
    });
  if (width >= 768) {
    await page.evaluate(() => scrollTo({ top: 3000, behavior: 'instant' }));
    await sleep(800);
    const b = await barRect();
    check(S, 'no booking bar ≥ 768', !b || b.display === 'none');
    await common(S, page, log);
    return page.close();
  }
  const atTop = await barRect();
  check(S, 'bar hidden while the cover is in view', !atTop);
  await page.evaluate(() => {
    const c = document.getElementById('cover');
    scrollTo({ top: c.offsetTop + c.offsetHeight + 200, behavior: 'instant' });
  });
  await sleep(900);
  const shown = await barRect();
  check(S, 'bar shown after the cover', shown && shown.bottom <= shown.ih && shown.top > shown.ih - 120, JSON.stringify(shown));
  const cta = await page.evaluate(() => {
    const a = document.querySelector('.v2-bar .v2-bar__pill');
    const c = document.querySelector('.v2-bar .v2-bar__call');
    const ra = a?.getBoundingClientRect();
    const rc = c?.getBoundingClientRect();
    return { text: a?.textContent, href: a?.getAttribute('href'), tel: c?.getAttribute('href'), ah: ra?.height, cw: rc?.width, ch: rc?.height, truncated: a ? a.scrollWidth > a.clientWidth + 1 : null };
  });
  check(S, 'bar = «Записаться · от N €» → /booking + tel: button (44 px targets)', cta.href === '/booking' && /^tel:/.test(cta.tel ?? '') && cta.ah >= 44 && cta.cw >= 44 && cta.ch >= 44, JSON.stringify(cta));
  check(S, 'bar pill text not truncated', cta.truncated === false, cta.text);
  await page.evaluate(settleInView, '#booking', 'center');
  await sleep(900);
  check(S, 'bar hidden while #booking ≥ 20 % visible', !(await barRect()));
  // walk the colophon: wherever the bar is visible, no colophon link/button may sit under it
  const overlap = await page.evaluate(async () => {
    const hits = [];
    const sh = document.documentElement.scrollHeight;
    const foot = document.getElementById('colophon') || document.querySelector('footer');
    const start = Math.max(0, foot.getBoundingClientRect().top + scrollY - innerHeight);
    let barSeen = false;
    for (let y = start; y <= sh; y += 60) {
      scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 30));
    }
    scrollTo({ top: sh, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 900));
    const bar = document.querySelector('.v2-bar');
    if (bar) {
      barSeen = true;
      const b = bar.getBoundingClientRect();
      for (const el of foot.querySelectorAll('a, button')) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.bottom > b.top && r.top < b.bottom && r.right > b.left && r.left < b.right) hits.push(`${el.textContent.trim().slice(0, 30)} [${Math.round(r.top)}–${Math.round(r.bottom)}] vs bar [${Math.round(b.top)}–${Math.round(b.bottom)}]`);
      }
    }
    const mainPad = getComputedStyle(document.querySelector('main')).paddingBottom;
    return { hits, barSeen, mainPad };
  });
  check(S, 'bar never covers colophon links at the page end', overlap.hits.length === 0, `barShownAtEnd=${overlap.barSeen} main padding-bottom=${overlap.mainPad} ${overlap.hits.join(' | ')}`);
  await page.screenshot({ path: path.join(OUT, `qa-bar-end-${width}.png`) });
  await common(S, page, log);
  await page.close();
}

/** scrollIntoView until the element's position is stable (content-visibility placeholders resize). */
async function settleInView(sel, block = 'start') {
  const el = document.querySelector(sel);
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  let prev = null;
  for (let i = 0; i < 8; i++) {
    el.scrollIntoView({ block, behavior: 'instant' });
    await frame();
    await frame();
    await new Promise((r) => setTimeout(r, 120));
    const top = Math.round(el.getBoundingClientRect().top);
    if (prev !== null && Math.abs(top - prev) <= 1) return top;
    prev = top;
  }
  return prev;
}

// ── scenario: in-page anchors (masthead nav, menu, deep link) ────────────────────────────────
async function scenarioAnchors(width, { reduced = false } = {}) {
  const S = `anchors@${width}${reduced ? '-reduced' : ''}`;
  const { page, log } = await openPage({ width, height: width < 768 ? 844 : 900, reduced });
  await page.goto(URL_V2, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(1200);
  const ids = ['works', 'faq', 'procedures', 'letter', 'atlas'];
  const landing = (id) =>
    page.evaluate((id) => {
      const el = document.getElementById(id);
      const m = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      const top = el.getBoundingClientRect().top;
      const atEnd = Math.ceil(scrollY) >= document.documentElement.scrollHeight - innerHeight - 1;
      return { top: Math.round(top), margin: m, atEnd, hash: location.hash, smooth: getComputedStyle(document.documentElement).scrollBehavior };
    }, id);
  for (const id of ids) {
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.style.scrollBehavior = '';
    });
    await sleep(500);
    if (width >= 1280) {
      const a = await page.$(`.v2-mast__nav a[href="#${id}"]`);
      await a.click();
    } else {
      await page.click('.v2-mast__menubtn');
      await sleep(700);
      const a = await page.$(`.v2-menu__link[href="#${id}"]`);
      await a.click();
    }
    await sleep(reduced ? 1200 : 3200);
    const l = await landing(id);
    const ok = Math.abs(l.top - l.margin) <= 4 || (l.atEnd && l.top >= l.margin - 4 && l.top < 900);
    check(S, `${width >= 1280 ? 'nav' : 'menu'} link #${id} lands at the section top`, ok, `top=${l.top} want=${l.margin}${l.atEnd ? ' (page end)' : ''} hash=${l.hash}`);
    if (reduced && id === 'works') check(S, 'root scroll-behavior is auto under reduced motion', l.smooth === 'auto', l.smooth);
  }
  await common(S, page, log);
  await page.close();
  // deep link
  const d = await openPage({ width, height: width < 768 ? 844 : 900, reduced });
  await d.page.goto(`${URL_V2}#faq`, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(2500);
  const l = await d.page.evaluate(() => {
    const el = document.getElementById('faq');
    return { top: Math.round(el.getBoundingClientRect().top), margin: parseFloat(getComputedStyle(el).scrollMarginTop) || 0 };
  });
  check(S, 'deep link /v2#faq lands at #faq', Math.abs(l.top - l.margin) <= 4, `top=${l.top} want=${l.margin}`);
  await common(S, d.page, d.log);
  await d.page.close();
}

// ── scenario: languages ───────────────────────────────────────────────────────────────────────
const CLIP_CHECK = () => {
  const root = document.querySelector('.v2');
  const out = { clipped: [], decorative: [], clamped: 0, checked: 0 };
  /** the clip rect of `a`: border box, grown by negative clip-path insets / overflow-clip-margin */
  const clipBox = (a, s) => {
    const b = a.getBoundingClientRect();
    const box = { top: b.top, bottom: b.bottom, left: b.left, right: b.right, w: b.width, h: b.height };
    const m = /^inset\(([^)]*)\)/.exec(s.clipPath || '');
    if (m) {
      const parts = m[1].split(/\s+round\s+/)[0].trim().split(/\s+/);
      const [t, r = t, bo = t, l = r] = parts;
      const len = (v, ref) => (v.endsWith('%') ? (parseFloat(v) / 100) * ref : parseFloat(v) || 0);
      box.top += len(t, b.height);
      box.right -= len(r, b.width);
      box.bottom -= len(bo, b.height);
      box.left += len(l, b.width);
    }
    const ocm = parseFloat(s.overflowClipMargin) || 0;
    const clipX = s.overflowX === 'clip', clipY = s.overflowY === 'clip';
    // Chromium honours overflow-clip-margin only when BOTH axes are `clip`
    if (ocm && clipX && clipY) {
      box.top -= ocm;
      box.bottom += ocm;
      box.left -= ocm;
      box.right += ocm;
    }
    return box;
  };
  const cv = document.createElement('canvas').getContext('2d');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent;
    if (!text.trim()) continue;
    const el = node.parentElement;
    if (!el || el.closest('.v2-sr-only, script, style, noscript')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) continue;
    // clipping ancestors (overflow hidden/clip or clip-path), excluding scroll containers
    const clips = [];
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      const ox = s.overflowX, oy = s.overflowY;
      const hard = (v) => v === 'hidden' || v === 'clip';
      if (hard(ox) || hard(oy) || (s.clipPath && s.clipPath !== 'none' && !/^inset\(0(px)?( 0(px)?)*\)$/.test(s.clipPath))) {
        if (s.webkitLineClamp && s.webkitLineClamp !== 'none') {
          clips.length = 0;
          clips.push('clamp');
          break;
        }
        if (/^(auto|scroll)$/.test(ox) || /^(auto|scroll)$/.test(oy)) continue;
        clips.push({ a, s, x: hard(ox) || s.clipPath !== 'none', y: hard(oy) || s.clipPath !== 'none', cp: s.clipPath !== 'none' ? s.clipPath : null });
      }
    }
    if (clips[0] === 'clamp') {
      out.clamped++;
      continue;
    }
    if (!clips.length) continue;
    // visually-hidden text (1 px clip box) is meant to be clipped
    if (clips.some((c) => { const r = c.a.getBoundingClientRect(); return r.width < 2 || r.height < 2; })) continue;
    const decorative = Boolean(el.closest('[aria-hidden="true"]'));
    out.checked++;
    cv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    try {
      if ('fontStretch' in cv) {
        const st = parseFloat(cs.fontStretch);
        cv.fontStretch = st <= 62.5 ? 'extra-condensed' : st <= 75 ? 'condensed' : st <= 87.5 ? 'semi-condensed' : 'normal';
      }
    } catch {
      /* ignore */
    }
    const m = cv.measureText(text.trim());
    const fA = m.fontBoundingBoxAscent, fD = m.fontBoundingBoxDescent;
    for (const r of rects) {
      const baseline = r.top + (r.height - (fA + fD)) / 2 + fA;
      const ink = { top: baseline - m.actualBoundingBoxAscent, bottom: baseline + m.actualBoundingBoxDescent, left: r.left, right: r.right };
      for (const c of clips) {
        const b = clipBox(c.a, c.s);
        const over = {
          top: c.y ? b.top - ink.top : 0,
          bottom: c.y ? ink.bottom - b.bottom : 0,
          left: c.x ? b.left - ink.left : 0,
          right: c.x ? ink.right - b.right : 0,
        };
        const worst = Math.max(over.top, over.bottom, over.left, over.right);
        // a text box fully outside its clip is a hidden/scrolled item, not a clipped glyph
        const outside = ink.bottom < b.top || ink.top > b.bottom || ink.right < b.left || ink.left > b.right;
        if (worst > 1.5 && !outside) {
          const id = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
          (decorative ? out.decorative : out.clipped).push(`«${text.trim().slice(0, 28)}» in ${id(el)} clipped by ${id(c.a)}${c.cp ? ' (clip-path)' : ''} by ${worst.toFixed(1)}px ${Object.entries(over).filter(([, v]) => v > 1.5).map(([k]) => k).join('/')}`);
          break;
        }
      }
    }
  }
  return out;
};

async function scenarioLang(code, width) {
  const S = `lang-${code}@${width}`;
  const blockFirestore = code === 'en';
  const { page, log } = await openPage({ width, height: width < 768 ? 844 : 900, blockFirestore });
  await page.goto(URL_V2, { waitUntil: 'networkidle2', timeout: 45000 });
  const toggle = await waitFor(page, async () => ({ ok: await page.evaluate((c) => Boolean(document.querySelector(`[data-v2-lang="${c}"]`)), code) }), { timeout: 15000 });
  const available = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-v2-lang]')].map((b) => b.getAttribute('data-v2-lang')))].join(','));
  check(S, `language toggle [data-v2-lang=${code}] present`, toggle.ok, `toggles: ${available}${blockFirestore ? ' (settings/site unreachable → default languages)' : ''}`);
  if (!toggle.ok) return page.close();
  await page.evaluate((c) => {
    const el = [...document.querySelectorAll(`[data-v2-lang="${c}"]`)].find((e) => e.offsetParent !== null) ?? document.querySelector(`[data-v2-lang="${c}"]`);
    el.click();
  }, code);
  await sleep(1500);
  await page.evaluate(() => document.fonts.ready);
  const st = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    v2lang: document.querySelector('.v2')?.getAttribute('lang'),
    h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim(),
    stored: localStorage.getItem('skinlab_lang'),
  }));
  check(S, `<html lang="${code}">`, st.lang === code && st.v2lang === code, JSON.stringify(st));
  // film / poster follow the language
  const r = await waitReady(page, 25000);
  const ps = r.s ?? (await playerState(page));
  check(S, `film + poster in ${code}`, new RegExp(`(index\\.${code}\\.html|hero-site-${code}-720\\.mp4)$`).test(ps.src ?? '') && new RegExp(`poster-${code}-`).test(ps.poster?.src ?? ''), `src=${ps.src} poster=${ps.poster?.src}`);
  // fonts cover the Latvian diacritics in every v2 face
  const fonts = await page.evaluate(async () => {
    const sample = 'Ķīpsalas ielā, Rīgā — ģimenes šūnu žāvēšana ĀČĒĢĪĶĻŅŠŪŽ';
    const faces = ['400 20px "Noto Serif Display"', 'italic 400 20px "Noto Serif Display"', '400 20px Onest', '400 20px "Martian Mono"'];
    await Promise.all(faces.map((f) => document.fonts.load(f, sample)));
    return faces.map((f) => `${f}: ${document.fonts.check(f, sample)}`);
  });
  check(S, 'v2 faces cover Latvian diacritics', fonts.every((f) => f.endsWith('true')), fonts.join(' · '));
  const file = path.join(OUT, 'lang', `${code}-${width}.png`);
  await fullShot(page, file);
  await page.screenshot({ path: path.join(OUT, 'lang', `${code}-${width}-atf.png`) });
  // clipped glyphs (after the walk: every reveal has run; content-visibility forced on for the check)
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.dataset.qa = 'cv';
    s.textContent = '*{content-visibility:visible!important}';
    document.head.appendChild(s);
  });
  await sleep(500);
  const clip = await page.evaluate(CLIP_CHECK);
  check(S, 'no clipped glyph ink (diacritics) under overflow/clip-path', clip.clipped.length === 0, `${clip.checked} clipped-context text nodes checked, ${clip.clamped} line-clamped skipped${clip.clipped.length ? ': ' + clip.clipped.slice(0, 6).join(' | ') : ''}${clip.decorative.length ? ` · intentional aria-hidden crops: ${clip.decorative.join(' | ')}` : ''}`);
  await page.evaluate(() => document.querySelector('style[data-qa="cv"]')?.remove());
  await common(S, page, log, { h1: null });
  if (blockFirestore) {
    // settings unreachable: the SDK logs its offline warning as an error; count only foreign errors
  }
  await page.close();
}

// ── scenario: returning visitor — stored language (skinlab_lang) is honoured on /v2 ──────────
async function scenarioStoredLang() {
  const S = 'lang-stored@390';
  const { page, log } = await openPage({ width: 390, height: 844 });
  await page.evaluateOnNewDocument(() => {
    try {
      if (!sessionStorage.getItem('qa-seeded')) {
        localStorage.setItem('skinlab_lang', 'lv');
        sessionStorage.setItem('qa-seeded', '1');
      }
    } catch {
      /* ignore */
    }
  });
  await page.goto(URL_V2, { waitUntil: 'networkidle2', timeout: 45000 });
  const r = await waitFor(page, async () => {
    const l = await page.evaluate(() => document.documentElement.lang);
    return { ok: l === 'lv', l };
  }, { timeout: 10000 });
  check(S, 'stored skinlab_lang=lv → /v2 renders in LV after load', r.ok, `html lang=${r.l}`);
  await page.reload({ waitUntil: 'networkidle2' });
  const r2 = await waitFor(page, async () => {
    const l = await page.evaluate(() => document.documentElement.lang);
    return { ok: l === 'lv', l };
  }, { timeout: 10000 });
  check(S, '… and again after a reload', r2.ok, `html lang=${r2.l}`);
  await common(S, page, log, { h1: 'Estētiskā kosmetoloģija Rīgā' });
  await page.close();
}

// ── scenario: above-the-fold shots ────────────────────────────────────────────────────────────
async function scenarioAtf(width) {
  const S = `atf@${width}`;
  for (const consent of [true, false]) {
    const { page, log } = await openPage({ width, height: width < 768 ? 844 : 900, consent });
    await page.goto(URL_V2, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(8000);
    const s = await playerState(page);
    const file = path.join(OUT, `atf-${width}${consent ? '' : '-first-visit'}.png`);
    await page.screenshot({ path: file });
    if (consent) {
      check(S, 'film visibly playing after ~8 s', s.ready && s.slotReady && !s.paused && s.t > 3, `mode=${s.mode} t=${s.t?.toFixed(2)}`);
      await common(S, page, log);
    }
    await page.close();
  }
}

const want = (k) => !ONLY || ONLY.includes(k);
await mkdir(path.join(OUT, 'reduced'), { recursive: true });
await mkdir(path.join(OUT, 'lang'), { recursive: true });
const t0 = Date.now();
if (want('live')) await scenarioLive();
if (want('reduced')) for (const w of [390, 1440]) await scenarioReduced(w);
if (want('mp4')) {
  await scenarioMp4('coarse-pointer@1440', { width: 1440, height: 900, touch: true, mobile: false });
  await scenarioMp4('save-data@1440', { width: 1440, height: 900, saveData: true });
  await scenarioMp4('phone@390', { width: 390, height: 844 });
  await scenarioMp4('live-404→mp4@1440', { width: 1440, height: 900, intercept: { notFound: /\/hf\/skinlab-hero\/index\.ru\.html/, expect404: /\/hf\/skinlab-hero\/index\.ru\.html/ } });
}
if (want('bar')) for (const w of [360, 390, 768]) await scenarioBar(w);
if (want('anchors')) {
  await scenarioAnchors(1440);
  await scenarioAnchors(390);
  await scenarioAnchors(1440, { reduced: true });
}
if (want('lang')) {
  for (const code of ['lv', 'en']) for (const w of [390, 1440]) await scenarioLang(code, w);
  await scenarioStoredLang();
}
if (want('atf')) for (const w of [390, 1440]) await scenarioAtf(w);

await browser.close();
const fails = results.filter((r) => !r.pass);
console.log(`\n${results.length - fails.length}/${results.length} checks passed in ${Math.round((Date.now() - t0) / 1000)} s`);
console.log(`all request hosts: ${[...allHosts].map(([h, n]) => `${h} (${n})`).join(', ')}`);
if (fails.length) {
  console.log('\nFAILURES:');
  for (const f of fails) console.log(`  [${f.scenario}] ${f.name} — ${f.detail}`);
}
process.exit(fails.length ? 1 : 0);
