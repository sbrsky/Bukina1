# /v2 — file ownership & conventions

Specs: [`DESIGN.md`](./DESIGN.md) (page) and [`MOTION.md`](./MOTION.md) (film). Owner overrides win over both:
don't touch the main site (`index.html`, `src/index.css`, `src/components/*`, other pages, admin); shared
edits are limited to `src/App.tsx` (done), `src/lib/translations.ts` (ADD `v2.*` keys only) and
`package.json`/lock. Never commit, push, deploy, run firebase or write to Firestore. Edit only files you own;
ignore tsc/vite errors in files you don't own (they may be mid-edit).

## Who owns what

| Owner | Files |
|---|---|
| **foundation** | `src/pages/v2/HomeV2.tsx`, `v2.css`, `lib/{organic,shapes,prices,copy,useRevealOnce}.ts`, `data/{heroChapters,faceZones}.ts`, `sections/{Seam,Pencil,Slip,Tape}.tsx`, `src/types/hyperframes-player.d.ts`, `public/fonts/v2/*`, `public/media/v2/*`, `videos/skinlab-hero/source/*`, `videos/skinlab-hero/assets/{face-clear.webp,forehead-acne.webp,grain-256.png}`, `scripts/{v2-images.ts,v2-fonts.mjs,v2-shot.mjs}`, the `v2.*` keys in `translations.ts`, `package.json` |
| **film** | `videos/skinlab-hero/**` (except the foundation files above), `scripts/hf-hero-build.ts`, `scripts/hf-hero-render.ts`, `public/hf/**` |
| **page-A** | `sections/{Masthead,Cover,HeroFilm,ChapterIndex,NextSlotChip,MobileBookBar,PriceList,FaceAtlas,MechanismArt}.tsx` (+ their `.css`), `lib/useHeroPlayer.ts`, `lib/useNextSlot.ts` |
| **page-B** | `sections/{Spread,Proof,Letter,FirstVisit,Questions,Booking,Colophon}.tsx` (+ their `.css`) |

Every page-A/B file starts as a STUB (`// STUB — owned by page-X`) that already exports its **final props
interface** and renders a placeholder with the right id. Replace the body; keep the props (or tell the
other page owner if you must change them — `MechanismArt` is page-A's and is used by page-B's `Spread`).
Need a new shared token/primitive/translation key? Ask foundation; meanwhile keep it local to your file.

## Conventions

- **CSS:** one file per component, `sections/<Name>.css`, imported by `<Name>.tsx`. Scope every selector
  under `.v2`, BEM-ish classes with a section prefix (`.v2 .v2-cover__h1`). Only tokens (`var(--v2-…)`), no
  raw hex, no Tailwind utilities, no new fonts. Read the header of `v2.css` for the primitive classes:
  type (`v2-h1 v2-dl v2-dm v2-quote v2-ghost v2-body v2-small v2-ui v2-mono v2-kicker v2-num v2-price v2-hand`),
  layout (`v2-section v2-pad-{3,4,5} v2-cv v2-wrap v2-grid v2-drift v2-stair v2-tilt v2-spine`), pieces
  (`v2-pill[--blush|--oat|--block] v2-iconbtn v2-link[--quiet] v2-slip v2-chip[--rouge] v2-print v2-tape
  v2-leader(__name|__dots|__price) v2-hairline v2-illu v2-shape v2-morph v2-on-ink v2-sr-only`).
  Category shapes: `data-shape="<categoryId|hero>"` + `.v2-shape` (+ `.v2-morph` for the hover morph), or
  `style={shapeStyle(id)}`.
- **Copy:** `useT()` with `v2.*` keys. Display headlines are ONE key with authored lines: `"Эстетическая /
  *косметология* / в Риге"` → `splitLines()` from `lib/copy.ts` → one block element per line; put a space
  text node between lines so the accessible name isn't run together. `fill()` for `{n}`/`{title}`,
  `pad2()` for «05», `shy()` for soft hyphens. Prices: `minPrice()`, `formatFrom(p, t)`, `formatPrice()`,
  `sanitizeName()`, `formatCount(n, lang, t)` (`lib/prices.ts`). Zone copy: `v2.atlas.zone.<id>`,
  `v2.atlas.concerns.<id>`. LV/EN copy needs native review.
- **Motion:** `lib/useRevealOnce.ts` (`useRevealOnce`, `useRevealOnMount`, `childReveal`, `usePencilDraw`,
  eases/durations). All reduced-motion safe. CSS transitions are killed under reduced motion by `v2.css`.
- **Section ids:** `cover`, `procedures`, `atlas`, `spread-a|b|c`, `works`, `letter`, `first-visit`, `faq`,
  `booking`, footer `colophon`, film figure `hero-film`, index `chapter-index`.
- **Seams** are rendered by the section owner as the sibling right before the incoming section:
  Proof `<Seam seed={11} fill="oat"/>` before and `<Seam seed={12} fill="paper"/>` after; Booking
  `<Seam seed={21} fill="ink"/>`; Colophon `<Seam seed={31} fill="oat"/>`.
- **Language toggles** (Masthead, Colophon): buttons carry `data-v2-lang="ru|lv|en"` (the screenshot tool
  clicks them for `--lang`). Languages = `v2Languages(useLang().languages)`; film lang = `filmLang(lang)`.
- **Menu state** lives in `HomeV2` (`menuOpen`), passed to `Masthead` and `MobileBookBar`.
- **Next slot:** implement the Firestore query inside `useNextSlot` (read-only); do NOT add
  `getNextAvailableSlot()` to `src/lib/slots.ts` (frozen shared file).
- **Ink sections** add `.v2-on-ink` (grain switches to screen .08, focus ring to blush).
- `main` gets `padding-bottom: 88px` < 768 (`.v2-main`); Colophon must also keep its own links clear of
  the sticky bar.

## Assets (generated — re-run, don't hand-edit)

- `npm run v2:fonts` → `public/fonts/v2/<Face>-{latin,cyrillic,latin-ext[,arrows]}.woff2` + the
  `@font-face` block pasted into `v2.css`. Faces: `NotoSerifDisplay-Roman`, `NotoSerifDisplay-Italic`,
  `Onest` (+arrows), `MartianMono` (+arrows), `BadScript`. **Film:** reference these same `/fonts/v2/…`
  URLs (with the same unicode-ranges) in the web entries; there is no single `NotoSerifDisplay-Roman.woff2`
  — preload `NotoSerifDisplay-Roman-latin.woff2` + `-cyrillic.woff2` if you preload at all.
- `npm run v2:images` (`--force-alpha` re-runs remove-background) →
  - `videos/skinlab-hero/source/before1@2x.webp`, `before@2x.webp` (2062×2560, lossless; sharp Lanczos3 2×
    + light unsharp — no Real-ESRGAN), `face-alpha@2x.png` (ONE u2net alpha for both), `acne-spots.json`
    (measured ACNE_SPOTS candidates, source px).
  - `videos/skinlab-hero/assets/face-clear.webp` (1560×1937, alpha, 120 KB), `forehead-acne.webp`
    (same geometry, ellipse (518,378) r (150,112), feather 36 centred on the edge, 39 KB),
    `grain-256.png` (7.5 KB, transparent tile with sparse dark + light specks; same bytes as the page's).
  - `public/media/v2/`: `face-clear-{640,960,1280}.{avif,webp}` (alpha), `zone-<categoryId>-{320,640}`
    (square, face over blush), `crop-{oval,cheek,glow}-{640,960}` (4:5, over blush),
    `forehead-{before,after}-{640,1200}` (3:2, original photos), `grain-256.png`.
  - Sharpness: at the film's max scale 1.5 one canvas px ≈ 1.04 master px; checked 1:1 — acceptable,
    no cap on punch-in scale needed.
- Face-atlas geometry is in `data/faceZones.ts` (source px, verified on an overlay; a few hotspots moved
  off the eyes/lips — see the file header).

## Tools

- `npm run v2:shot -- --url http://localhost:5180/v2 --widths 360,390,768,1024,1440,1920 --out /tmp/shots
  [--full] [--reduced-motion] [--wait 1200] [--lang lv] [--scroll] [--selector "#atlas"] [--no-fail]` —
  PNG per width + console errors, failed requests, request hosts, horizontal overflow (with offenders).
  Exits 1 on problems. Dev server: `npx vite --port 5180 --strictPort`.
- `node scripts/v2-qa.mjs --url http://localhost:5190/v2 [--out docs/v2/shots/roundN] [--only live,reduced,mp4,bar,anchors,lang,atf]`
  — end-to-end acceptance checks against `npx vite preview --port 5190 --strictPort` (film live/MP4/still
  modes, chapter seek + aria-current, pause rules, CTA pulse, mobile bar, anchor landing, LV/EN incl. a
  clipped-glyph-ink check, CDN hosts). Exits 1 on any FAIL. Each page runs in a fresh browser context.
- Integration conventions (round 1): in-page jumps go through `lib/scrollToSection.ts` (renders the
  `content-visibility` sections for a frame so jumps land exactly); `.v2-line-mask` carries .22em of
  descender room and `lineUp` starts at y 130 %; the main-site cookie banner is wrapped in `.v2-consent`
  (HomeV2) and restyled in v2.css; Seams tuck 1 px under the incoming section (no hairline gap).
- Expected host noise on /v2: `fonts.googleapis.com` (Montserrat from index.html/index.css — accepted by
  the owner) and `firestore.googleapis.com`. Anything else (e.g. `cdn.jsdelivr.net`) is a bug.

## Live data notes (from the main session — applies to ALL agents)

- Live Firestore `services` doc ids are slugs, not canonical ids: ukhodovye-protsedury=skincare, pilingi=peels, mezoterapiya=mesotherapy, biorevitalizatsiya=biorevitalization, biostimulyatsiya=biostimulation, kompleksnye-protsedury=complex, konsul-tatsiya=consultation. Use `src/pages/v2/lib/categories.ts` (`useV2Categories()`, `serviceHref()`) for every category lookup and `/service/...` link. `scripts/hf-hero-build.ts` must use the same mapping so its Firestore read does not silently fall back to servicesData.
- Live prices win over servicesData: «Консультация ONLINE» is **50 €** live (not 40 €). Nothing (page or film) may hardcode 40 € for the consultation; the film's CTA price and the hook's «от … €» come from price variables computed from live data. «Чистка лица» is «Чистка лица/спины» live.
- Earlier a duplicate film agent and a duplicate page-B agent ran by mistake (~22:19–22:27) and may have edited your files (e.g. dbg()/__SKDEBUG logging in videos/skinlab-hero). They are stopped. Re-read files before editing, remove any leftover debug logging, and keep the latest correct state.

## Bug report for the film agent (from page-A, relayed by the main session, 22:37)

`public/hf/skinlab-hero/index.ru.html` does not play live inside `<hyperframes-player>`: the player loads the entry via `src` (no srcdoc rewrite), so the runtime has not run when the inline script does `window.__timelines["skinlab-hero"] = film.tl` → "Cannot set properties of undefined", and the player reports `error: "Composition timeline not found after 8s"`. Fix in the emitted web entries (hf-hero-build.ts), keeping the source composition CLI-clean: guard with `window.__timelines = window.__timelines || {}` and/or load `/hf/vendor/hyperframe.runtime.iife.js` in `<head>` before the composition scripts — then prove live playback through the real player element exactly as the page embeds it. Paths the page expects (keep them): `index.{lang}.html`; `posters/poster{,-map}-{lang}-{540,810,1080}.{avif,webp}`; `renders/hero-site-{lang}-720.mp4`; `runtime-src=/hf/vendor/hyperframe.runtime.iife.js`. The page falls back live → MP4 → poster → static.

## Film embed contract (from the film agent — verified 22:4x in headless Chrome through the real player)

**Status of the bug report above: fixed.** The composition now does `window.__timelines =
window.__timelines || {}` before registering (in `<hyperframes-player>` the runtime is injected only
after a timeline exists). Proven with `@hyperframes/player` 0.8.134 (`dist/hyperframes-player.js`) on a
static server rooted at `public/`: `ready` in ~0.2 s, autoplay advances, `seek(12.2)` lands exactly,
`loop` wraps end→0, and **every request is same-origin** (no jsdelivr / CDN / Google Fonts).

```html
<hyperframes-player
  src="/hf/skinlab-hero/index.{ru|lv|en}.html"
  width="1080" height="1350"
  autoplay="" muted="" loop="" audio-locked="" low-power-idle=""
  assets-loading-ui="none" disable-click-to-play=""
  runtime-src="/hf/vendor/hyperframe.runtime.iife.js"
  aria-hidden="true"
></hyperframes-player>
<!-- CSS: display:block; width:100%; aspect-ratio:4/5. Never set sandbox-origin. -->
```

- **MP4 mode:** same element with `src="/hf/skinlab-hero/renders/hero-site-{lang}-720.mp4"` and
  `type="video/mp4"` (720×900, H.264, faststart, silent).
- **Posters:** `/hf/skinlab-hero/posters/poster-{lang}-{540,810,1080}.{avif,webp}` (frame 0 = the hook
  lockup) and `poster-map-{lang}-…` (24.50 s face map). They are cut from the delivery render, so frame 0
  of the MP4 equals the poster.
- **Events seen:** `ready` (detail `{duration, compositionWidth:1080, compositionHeight:1350}`),
  `assetsready`, `painted` (use it for the poster crossfade), `play`, `pause`, `timeupdate`
  (read `player.currentTime`), `error` (detail `{message}`; switch to MP4), `playbackerror`.
  API: `player.play()`, `player.pause()`, `player.seek(t)`, getters `currentTime`, `duration`,
  `paused`, `ready`.
- **Duration:** the live player reports `duration = 30.95` (the timeline's last tween); 30.95–31.00 is a
  static hold identical to frame 0, so the loop is seamless either way. Renders are 31.00 s / 930 frames.
  Use the constants in `data/heroChapters.ts` (CHAPTERS, RECAP, CTA_PILL_T 26.95, POSTER_MAP_T 24.50).
- **Benign noise:** the player first fetches `src` and aborts it (`net::ERR_ABORTED` on
  `index.{lang}.html`), and logs Chrome's "allow-scripts and allow-same-origin" sandbox warning itself.
- **Fonts:** the entries use the page's own `/fonts/v2/*.woff2` (same unicode-ranges) → shared cache.
- **Prices are baked at build time** from live Firestore (read-only; same slug→id mapping as
  `lib/categories.ts`): offer 40, skincare 60, peels 40, meso 65, biorev 120, biostim 120, complex 120,
  consultation online **50**. After a CMS price change re-run `npx tsx scripts/hf-hero-build.ts`, then
  `npx tsx scripts/hf-hero-render.ts` (posters/MP4 carry the prices too).
