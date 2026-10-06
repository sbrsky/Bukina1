# SKINLAB /v2: page design spec ("Redline Folio, Riga Edition")

Status: final spec. Implement it as written. Where this document and an older proposal disagree, this document wins.
Companion: [`MOTION.md`](./MOTION.md) specifies the hero film (HyperFrames composition) that this page embeds.
Scope: a new standalone route `/v2`. It replaces `src/pages/HomeV2.tsx`. `/v3` and the main site are not touched, except for the Montserrat import move in §10.

---

## 0. Decisions at a glance

| Topic | Decision |
|---|---|
| Base concept | The editorial "Redline Folio": the site reads like an issue of a couture beauty magazine. The 7 service categories are 7 numbered chapters, marked on the face with the cosmetologist's red pencil. |
| Hero | The H1 states category and city: **«Эстетическая косметология в Риге»**. Next to it is the 31 s HyperFrames film in a frameless 4:5 slot, with a clickable chapter index that seeks the film. The emotional hook («Кожа, которую хочется трогать») lives inside the film only. |
| Organic layer | Grafted from the bio-organic proposal: 7 category shape tokens shared by page and film, seeded organic section seams, `shape-outside` text wrap around blob portraits, and one giant plus one tiny element per section. |
| Ad mechanics | Grafted from the soft-futurism proposal: benefit, offer and location within 2 s; a 7-pip progress rail; the consultation-first CTA; a mobile sticky bar «Записаться · от 40 €» with a phone button. |
| Conversion extras | A real "next free slot" chip from Firestore `slots`, and a first-visit section with real prices (40 / 50 / 80 €). |
| Fonts | Noto Serif Display, Onest, Martian Mono, Bad Script (accents only). All four are self-hosted subsets, and `/v2` makes no request to fonts.googleapis.com. |
| Film hosting | The film is built from `videos/skinlab-hero/` into `public/hf/skinlab-hero/`. Nothing goes under `public/v2/`, because a real folder there breaks the SPA rewrite for `/v2` on Firebase Hosting. |
| Honesty | The page shows no unverified stats (no «8+ лет», «5000+», «200+», «98%»). Every model or illustrative image is labelled «иллюстрация». `bef_after_video.mp4`, `after.jpeg` and the `hf_…jpeg` file are not used (§5.6). |

---

## 1. Concept

**Redline Folio, SKINLAB Riga Edition.** The page is structured like an issue of a print magazine: a cover (H1 and the film), a price contents list, a face atlas, three feature spreads, a works page, a letter from the author, a "how to start" page, reader questions, a booking page and a colophon.

The structure comes from the business: 7 categories = 7 chapters = 7 organic shape tokens = 7 film chapters. One visual language runs through the page and the film:

- the cosmetologist's **rouge pencil**: underlines, arcs, arrows and zone marks, always framed as care and never as correcting "flaws";
- **paper slips** that carry any text placed over a photo;
- **organic shapes**, each one standing for one service category.

The face is the cover model of every chapter. The mood is a warm, tactile white (paper and grain) with a single saturated signal colour, the rouge pencil.

### 1.1 Why this is a 2027 design (short)

1. **Print-issue structure on the web.** As AI-generated landing pages make the standard hero / features / testimonials stack look generic, editorial sites with a cover, contents, chapters and a colophon stand out. Here the structure is driven by the business, not added as decoration.
2. **Visible human mark-making as a trust signal.** Pencil strokes with a slight hand-drawn wobble are the visual voice of a solo practitioner. Real handwriting appears only as small accents.
3. **A condensed, high-contrast Cyrillic display serif with a live width axis** (Noto Serif Display, wdth 62.5–100). The Western serif revival (Fraunces, Instrument Serif and similar) barely reached Cyrillic, so this looks new in Riga's RU/LV market.
4. **Organic shapes with a job.** Each blob means one service category, on the page and in the film.
5. **Motion that informs.** The hero is a seekable, code-driven film whose chapters are real HTML links, not a decorative video.
6. **Warm tactile whites** (paper grain, multiply, coloured shadows) instead of 2023–25 beige minimalism or clinical white.

### 1.2 What was already tried and must not be repeated

- **Old `/v2`:** time-of-day aurora themes, glassmorphism and `backdrop-filter` pills, BreathButton, Montserrat.
- **`/v3`:** medical white with navy and gold, symmetric card grids, a stats row, a centred raw before/after video hero.

None of these appear in this design (see §11).

---

## 2. File map (what the engineer creates)

```
src/pages/v2/HomeV2.tsx              ← route component (lazy). App.tsx: lazy(() => import("./pages/v2/HomeV2"))
src/pages/v2/v2.css                  ← tokens + component classes, scoped under .v2
src/pages/v2/sections/
  Masthead.tsx  Cover.tsx  HeroFilm.tsx  ChapterIndex.tsx  NextSlotChip.tsx
  PriceList.tsx  FaceAtlas.tsx  Spread.tsx  Proof.tsx  Letter.tsx
  FirstVisit.tsx  Questions.tsx  Booking.tsx  Colophon.tsx  MobileBookBar.tsx
  Seam.tsx  Pencil.tsx  Slip.tsx  Tape.tsx  MechanismArt.tsx
src/pages/v2/lib/
  organic.ts          ← seeded PRNG + seam/torn-edge generators (§3.5)
  shapes.ts           ← 7 category radius tokens + helpers (§3.4)
  prices.ts           ← minPrice(), formatFrom(), sanitizeName() (§8)
  useHeroPlayer.ts    ← player mount, delivery mode, chapter sync (§6)
  useNextSlot.ts      ← next available slot (§8)
  useRevealOnce.ts    ← shared whileInView variants (§7)
src/pages/v2/data/
  heroChapters.ts     ← chapter table mirrored from MOTION.md §7 (single page-side source)
  faceZones.ts        ← atlas zones (§5.4)
src/types/hyperframes-player.d.ts    ← JSX typing for <hyperframes-player>
public/fonts/v2/*.woff2              ← self-hosted subsets (§3.2)
public/media/v2/*                    ← page images: cut-out face crops, grain tile, forehead pair (§5)
public/hf/skinlab-hero/*             ← built film: index.{ru,lv,en}.html, assets, posters, renders (MOTION.md §13)
public/hf/vendor/hyperframe.runtime.iife.js  ← copied from node_modules/@hyperframes/core/dist
videos/skinlab-hero/                 ← HyperFrames source project (MOTION.md)
scripts/hf-hero-build.ts  scripts/hf-hero-render.ts  scripts/v2-images.ts
```

- Delete `src/pages/HomeV2.tsx` (git history keeps it).
- Pin `@hyperframes/player` to exactly `0.8.134`, the same version as the CLI that renders the film. Remove the caret.
- Add devDependencies: `gsap@3.14.x` (copied into the composition, not imported by the page) and `sharp` (image derivatives).

---

## 3. Design tokens

All tokens live on `.v2` in `src/pages/v2/v2.css`. `.v2` sets `color-scheme: light`; the palette is brand-fixed, so there is no dark theme. `body` under `/v2` gets `background: var(--v2-paper)`.

### 3.1 Palette

| CSS variable | Hex | Role | Contrast (WCAG) |
|---|---|---|---|
| `--v2-paper` | `#F4EDE6` | Page background. **The film's background is exactly this value**, so the player has no visible frame. | ink on paper 15.3 |
| `--v2-oat` | `#E9DDD1` | Secondary paper: proof band, index cards, price-row hover, tape (70 %), colophon. | ink 13.3, ink-60 5.8, rouge 4.45 (rouge only at ≥ 24 px or ≥ 18.7 px bold) |
| `--v2-ink` | `#1E1618` | Text, primary pills, booking section background. | paper on ink 15.3 |
| `--v2-ink-60` | `#5E4F52` | Secondary text, captions, mono details, the «иллюстрация» label. | 6.66 on paper |
| `--v2-blush` | `#E3BBBC` | Existing brand colour (`--color-primary`): blobs, ghost numerals, highlight bars, the pill on ink. **Never text on paper** (1.5). | blush on ink 10.2 |
| `--v2-rouge` | `#B23A2E` | The red pencil: strokes, chapter numbers, prices, active states, focus ring, handwriting. The only saturated colour. | rouge on paper 5.12; glaze on rouge 5.64 |
| `--v2-plum` | `#3A2228` | Deep tone: coloured shadows, the colophon's dark text block. | paper on plum 12.6 |
| `--v2-glaze` | `#FFF8F2` | Highlight light: text on rouge chips, photo sheen, film light bands. | — |

Derived values:

- `--v2-hair: rgb(30 22 24 / .10)`: hairlines.
- `--v2-shadow-slip: 0 10px 30px rgb(30 22 24 / .14)`.
- `--v2-shadow-print: 0 18px 40px -12px rgb(58 34 40 / .28)`: plum-tinted. Shadows are never grey.
- `--v2-focus: 0 0 0 2px var(--v2-paper), 0 0 0 4px var(--v2-rouge)`: a 2 px rouge ring with a 2 px paper offset. On ink, swap to `0 0 0 2px var(--v2-ink), 0 0 0 4px var(--v2-blush)`.

Forbidden pairs:

- rouge on blush (3.4)
- ink-60 on blush below 24 px (4.45)
- any text on blush except ink

### 3.2 Typography

Four families. Each was verified against the live css2 API on 2026-10-05: every one serves the `cyrillic`, `cyrillic-ext`, `latin` and `latin-ext` subsets, which covers ā ē ī ū ļ ņ ķ ģ š ž č, € and №.

| Role | Family | Axes used | Use |
|---|---|---|---|
| Display | **Noto Serif Display** | roman: wdth 62.5–100, wght 300–900; italic: wdth 62.5–100, wght 300–400 | H1/H2, chapter titles, pull quotes, ghost numerals, the film's titles and hook word |
| Text / UI | **Onest** | wght 400–700 | Body, buttons, forms, nav, treatment names |
| Data / marginalia | **Martian Mono** | wdth 75–100, wght 400–600 | Kickers, chapter numbers, prices (`tabular-nums`), folios, captions |
| Hand (accents only) | **Bad Script** | 400 | Signature and asides of ≤ 3 words. Never prices, procedure names or any essential information. Always `aria-hidden`, or duplicated in plain text. |

Rejected: Fraunces, Instrument Serif, Gloock, Young Serif (no Cyrillic); Playfair Display, Cormorant, EB Garamond, Inter (HyperFrames banned/generic list); Unbounded (dated on RU-language landing pages); Montserrat (the current site's font).

**Canonical Google Fonts URL.** Use it as the download source and as a dev-only fallback. It returns all four subsets for each family:

```
https://fonts.googleapis.com/css2?family=Noto+Serif+Display:ital,wdth,wght@0,62.5..100,300..900;1,62.5..100,300..400&family=Onest:wght@400..700&family=Martian+Mono:wdth,wght@75..100,400..600&family=Bad+Script&display=swap
```

**Production (required).**

1. **Self-host.** Download the variable TTFs from google/fonts, trim the axes with `fonttools varLib.instancer` to the ranges in the table above, and subset with `pyftsubset` to `U+0000-00FF, U+0100-017F, U+0400-045F, U+0490-0491, U+2010-2027, U+2030-203A, U+20AC, U+2116, U+2190-2193, U+00AD`. Output woff2 files:
   - `public/fonts/v2/NotoSerifDisplay-Roman.woff2` (target ≤ 140 KB)
   - `NotoSerifDisplay-Italic.woff2` (≤ 110 KB)
   - `Onest.woff2` (≤ 45 KB)
   - `MartianMono.woff2` (≤ 45 KB)
   - `BadScript.woff2` (≤ 40 KB)
2. **Declare** `@font-face` in `v2.css` with `font-display: swap`. Preload only `NotoSerifDisplay-Roman.woff2` (see §10 for early preload).
3. **Metric-matched fallbacks** keep CLS near 0. Tune the `size-adjust` and override values with a fallback-font generator:
   - `"NSD Fallback"` = Georgia, `size-adjust: 96%`, `ascent-override: 98%`, `descent-override: 26%`
   - `"Onest Fallback"` = system-ui
   - `"Mono Fallback"` = ui-monospace
4. **The film uses the same files.** Its web entry files reference `/fonts/v2/*.woff2`, so the browser cache is shared (MOTION.md §3).
5. **No request to fonts.googleapis.com from `/v2`** (GDPR in Latvia, and one fewer origin). See §10 for the Montserrat move.

**Web type scale** (fluid, 360 → 1920 px):

| Token | Family / settings | Size / line-height | Notes |
|---|---|---|---|
| `--v2-fs-h1` | NSD roman wght 380, **wdth 66**, tracking −0.03em; italic line wght 340 | `calc(clamp(3.25rem, 8.4vw, 9.5rem) * var(--v2-h1-k))` / 0.9 | `--v2-h1-k`: ru 1, lv .9, en 1.06 |
| `--v2-fs-dl` (display-l) | NSD wght 400, wdth 80, −0.025em | `clamp(2.4rem, 5.8vw, 6.5rem)` / 0.95 | Section headlines |
| `--v2-fs-dm` (display-m) | NSD wght 420, wdth 75 (→100 on hover/focus) | `clamp(2rem, 4.2vw, 4.5rem)` / 1.0 | Category titles in the price list |
| `--v2-fs-quote` | NSD italic wght 300, wdth 85 | `clamp(1.6rem, 2.8vw, 2.8rem)` / 1.12 | Pull quotes |
| `--v2-fs-ghost` | NSD italic wght 300, wdth 62.5, `--v2-blush` | `min(40vw, 38rem)` / 0.8; ≤ 60vw on mobile | Ghost numerals, aria-hidden |
| `--v2-fs-body` | Onest 400 | `clamp(1.0625rem, .35vw + .97rem, 1.1875rem)` / 1.55, max 62ch | |
| `--v2-fs-small` | Onest 400 | 15 px / 1.5 | Treatment descriptions, footnotes |
| `--v2-fs-ui` | Onest 600 | 16 px (15 px in dense rows), buttons ≥ 44 px tall | |
| `--v2-fs-mono` | Martian Mono wdth 87.5, wght 450, uppercase, +0.1em | **14 px** for labels that carry information; 13 px for decorative folios and spine labels | Never below 13 px |
| `--v2-fs-price` | Martian Mono wght 600, `tabular-nums` | 15–18 px | Never below 15 px |
| `--v2-fs-hand` | Bad Script 400, `--v2-rouge`, rotate −4°…+3° | 22–34 px | ≤ 1 per viewport |

Russian and Latvian typesetting rules:

- `<html lang>` is set from LangContext on `/v2`. Latvian `locl` forms (ķ ļ ņ ģ with comma below) depend on it.
- Display text is an array of **authored lines per language** in the translations. Never rely on automatic wrapping for display type.
- Use soft hyphens in long words: `Био&shy;ревита&shy;лизация`, `Био&shy;стимуляция`, `Мезо&shy;терапия`, `Bio&shy;revitalizā&shy;cija`. Body text gets `hyphens: auto`.
- `:lang(lv)` display text: `line-height ≥ 1.0` and `padding-block-start: .06em`, so macrons and cedillas on capitals never clip.
- Never set serif display type in all caps. Mono kickers are uppercase.

### 3.3 Grid and spacing tokens

| Token | Value |
|---|---|
| `--v2-edge` | `clamp(16px, 4vw, 72px)`: page side margin. It is 16 px at 360. |
| `--v2-gutter` | `clamp(16px, 2vw, 24px)` |
| `--v2-beat` | `clamp(24px, 3.5svh, 56px)`: the vertical unit. All vertical spacing is in beats. |
| `--v2-max` | `1600px`: content cap. Wider screens give the extra width to bleeding elements only, never to text. |
| `--v2-cols` | 4 (< 768) · 8 (768–1279) · 12 (≥ 1280) |
| `--v2-col-w` | `calc((100cqw - (var(--v2-cols) - 1) * var(--v2-gutter)) / var(--v2-cols))` on `.v2-grid` (`container-type: inline-size`) |
| `--v2-dx` | `calc(var(--v2-col-w) * var(--drift-x, 0))`, where `--drift-x ∈ {-0.5, 0, 0.5}` |

Section block padding takes values from {3, 4, 5} beats. Two consecutive sections never use the same value (sequence in §4.2).

Breakpoints:

| Name | Range |
|---|---|
| `xs` | < 480 |
| `sm` | 480–767 |
| `md` | 768–1023 (8 cols) |
| `lg` | 1024–1279 (8 cols; enables `shape-outside` and pointer-fine hovers) |
| `xl` | ≥ 1280 (12 cols, full desktop layouts) |
| `xxl` | ≥ 1920 (content capped) |

### 3.4 Radii and shape tokens (`shapes.ts` and CSS)

**Seven category tokens.** These are 8-value percentage radii, responsive with no JS. They are used for image masks, price-row thumbnails, atlas and spread prints, and as the film's blob keyframes, so page and film share one shape vocabulary.

| Category id | Name | `border-radius` |
|---|---|---|
| `skincare` | petal | `70% 30% 52% 48% / 40% 62% 38% 60%` |
| `peels` | lens | `50% 50% 50% 50% / 38% 38% 62% 62%` |
| `mesotherapy` | drop | `58% 42% 50% 50% / 64% 64% 36% 36%` |
| `biorevitalization` | pebble | `62% 38% 54% 46% / 48% 58% 42% 52%` |
| `biostimulation` | cell | `46% 54% 38% 62% / 55% 41% 59% 45%` |
| `complex` | cloud | `40% 60% 60% 40% / 60% 40% 60% 40%` |
| `consultation` | seed | `52% 48% 66% 34% / 47% 66% 34% 53%` |
| `hero` | (atlas portrait, film rest blob) | `54% 46% 42% 58% / 48% 56% 44% 52%` |

- **Hover / focus morph** (pointer-fine only): rotate the 8 values by one position, using `transition: border-radius 900ms cubic-bezier(.3,.7,.2,1)`. No idle or looping "breathing" on any page element.
- **Other radii:**
  - `--v2-r-pill: 999px` (buttons, chips)
  - `--v2-r-slip: 2px` (paper slips are rectangles)
  - `--v2-r-print: 4px` (photo prints with a 12 px paper border)
- **Tape strip:** 64 × 22 px, `--v2-oat` at 70 %, `clip-path: polygon(...)` from `organic.tornEdge(seed)`, rotated with the tilt token of its parent ±4°.

### 3.5 Organic generator (`organic.ts`): seeded, deterministic, never `Math.random`

```ts
export function mulberry32(seed: number): () => number      // standard mulberry32
export function seamPath(seed: number): string               // viewBox "0 0 1000 100", closed shape below the curve
export function tornEdge(seed: number, points = 14): string  // CSS polygon() for tape ends
export const TILTS = [-2.5, 1.5, -1, 3] as const             // degrees, index by i % 4
```

- **`seamPath`:** y(x) = 50 + Σₖ aₖ·sin(2π·fₖ·x/1000 + φₖ), with f = [1, 2.3, 4.1] × (0.9–1.1 seeded), a = [18, 9, 4] × (0.8–1.2 seeded) and φ seeded in [0, 2π). Sample every 20 units, smooth with Catmull-Rom (tension 0.5) to cubic Béziers, then close along y = 100.
- **Seams are static.** They are never animated or scroll-linked.
- **Seeds:** proof top 11, proof bottom 12, booking top 21, colophon top 31.

### 3.6 Texture, motion and z tokens

- **Grain:** `public/media/v2/grain-256.png`, a pre-rendered 256 px tile of about 6 KB.
  - Applied by `.v2::after` (fixed, `inset: 0`, `pointer-events: none`) at `opacity: .05; mix-blend-mode: multiply`.
  - Inside the ink booking section it is `.08` with `screen`.
  - **No live `feTurbulence` or SVG filters anywhere.**
- **Eases:**
  - `--v2-ease-out: cubic-bezier(.16, 1, .3, 1)` (expo-out)
  - `--v2-ease-out-soft: cubic-bezier(.22, 1, .36, 1)`
  - `--v2-ease-inout: cubic-bezier(.65, 0, .35, 1)`
  - `--v2-ease-morph: cubic-bezier(.3, .7, .2, 1)`
- **Durations:** `--v2-d1: .2s`, `--v2-d2: .35s`, `--v2-d3: .5s`, `--v2-d4: .8s`, `--v2-d5: .9s`.
- **z layers:** content 1, overlaps 2, sticky bar 40, header 50, menu overlay 60, cookie banner 70.

---

## 4. Organic and anti-grid composition rules

The principle is a precise hidden grid that is broken on purpose, using tokens. Nothing is random; every offset is a token.

### 4.1 Grid and drift

1. Every block declares `span`, `start` (grid-column), `--drift-x ∈ {-0.5, 0, 0.5}` (half-column translate) and `--drift-y ∈ {-2, -1, 0, +1, +2, +3}` beats (`margin-block-start`). A negative `--drift-y` creates an overlap.
2. **Sibling blocks never share a column start.** List items step through a staircase:
   - desktop: item *i* starts at column `base + (i mod 3)`
   - mobile: item *i* is indented `[0, 8%, 4%][i mod 3]`
3. **Mass:** the whitespace on the two sides of a section is always 1:2 or 2:1, never 1:1. The heavy side alternates by section (§4.2). There is exactly one centred moment on the page: the "Спред C" type break.

### 4.2 Section sequence: heavy side and padding

| # | Section | Heavy side | Block padding | Background |
|---|---|---|---|---|
| 1 | Cover | right (film) | 3 beats | paper |
| 2 | Price list | staircase L→R | 5 | paper |
| 3 | Face atlas | right | 4 | paper |
| 4 | Spread A | left | 5 | paper |
| 5 | Spread B | right | 3 | paper |
| 6 | Spread C | centred type break | 4 | paper |
| 7 | Proof | right | 5 | **oat band** (seams top 11, bottom 12) |
| 8 | Letter | left | 3 | paper |
| 9 | First visit | diagonal | 5 | paper |
| 10 | Questions | offset right (cols 4–11) | 4 | paper |
| 11 | Booking | left | 5 | **ink** (seam top 21) |
| 12 | Colophon | bleeds off the bottom | 3 | **oat** (seam top 31) |

### 4.3 Overlap, rotation and scale rules

- **One deliberate overlap per section**, and only one. It is one of:
  - type over the edge of an image, at most 1.5 columns;
  - image over image (collage, stacked by importance);
  - a slip or tape strip over an edge.
- **An overlap never covers** eyes, lips, body copy, prices or interactive controls.
- **Text over a photo** sits only on a paper slip (`--v2-paper`, padding `.35em .6em`, `--v2-shadow-slip`). Contrast stays at 15:1.
- **Rotation tokens** `TILTS[i % 4]` (−2.5°, 1.5°, −1°, 3°) apply only to photos, prints, slips, tape, cards and handwriting.
  - Serif headlines, body text, buttons, prices and form controls **never** rotate.
  - Any element carrying information is tilted at most ±3°.
  - Spine labels are exactly ±90° (`writing-mode: vertical-rl`).
- **Giant and tiny:** every section contains exactly one giant element (≥ 50vw on desktop, e.g. H1, ghost numeral, portrait print, the wordmark) and one tiny element (≤ 12vw, e.g. tape, spine label, a handwritten aside, a pencil mark).
- **Collage limits:** at most 3 pieces per spread on desktop, 2 on mobile. At most 1 handwritten note per viewport. One saturated colour (rouge).

### 4.4 Organic layer

- **Section seams:** wherever the background colour changes (proof band, booking, colophon), the boundary is a `<Seam seed>`:
  - an SVG with `viewBox 0 0 1000 100`, `preserveAspectRatio="none"`, height `clamp(32px, 6vw, 96px)`, filled with the incoming section's colour;
  - placed with `margin-top: calc(-1 * height + 1px)`;
  - `aria-hidden`.
  
  No section boundary is a straight, full-width colour change.
- **Text wrap around blobs (`shape-outside`)**, at ≥ 1024 px only, in the Letter (§5.7) and Spread B (§5.5):
  - the portrait or print floats inside the text column with its category `border-radius` token;
  - it uses `shape-outside: border-box; shape-margin: 1.5rem`, which respects the border-radius;
  - below 1024 px the float is removed and the image sits above the text.
- **Blob masks:** every photo is either a cut-out (alpha WebP/AVIF of the face) or a print (12 px paper border, `--v2-r-print`, tape) clipped by a category token. There are no rectangular photos without a border.

### 4.5 Marginalia, type breaks and spine labels

- **Marginalia rail** (≥ 1280): one column at the outer edge; the side alternates by section. It holds the mono chapter number in rouge, a vertical spine label (13 px mono, ink-60) and at most one handwritten aside of ≤ 3 words. Below 1280, rail content becomes an inline footnote after the paragraph, prefixed with «※».
- **Display headlines** are arrays of authored lines. Each line is placed by grid-column start; for example the cover H1 puts line 1 in cols 1–6, line 2 (italic) in cols 2–7 and line 3 in cols 1–4. On mobile the lines flow with indents [0, 10%, 4%].

### 4.6 Responsive degradation

| Range | Drift | Tilts | Overlaps | Other |
|---|---|---|---|---|
| ≥ 1280 | full | full | full | Marginalia rail active |
| 768–1279 (8 cols) | ±1 column, applied as grid-column start | full | full | Rail becomes footnotes |
| < 768 (4 cols) | ±0.5 column only, as a `translate` clamped with `min()`/`max()` so nothing crosses the 16 px edge | halved (max 1.5°) | ≤ 1 beat | 2 collage pieces; spine labels become horizontal kickers; ghost numerals ≤ 60vw; `shape-outside` off; price-row hover thumbnails hidden |
| < 480 | as < 768 | as < 768 | as < 768 | Decorative tape hidden except one per section |

Global rules:

- Every section gets `overflow-x: clip` (not `hidden`, so `position: sticky` keeps working). Zero horizontal scroll at 360, 390, 768, 1024, 1440 and 1920.
- **DOM order = reading order = focus order.** No CSS `order`, no reversed grids. All offsets are visual only.
- Tap targets are ≥ 44 × 44 px everywhere.

---

## 5. Sections, in page order

Shared data rules for every section:

- All Firestore reads go through the existing `useServices()`, `useContent()` and `useWorks()` hooks, falling back to `servicesData` or component defaults, so first paint never waits on the network and never shifts layout.
- CMS text is resolved with `useCmsField()` (`field_lv`, `field_en` …).
- Static copy comes from new `v2.*` keys in `src/lib/translations.ts`, read with `useT()` (copy deck in §7).

### 5.0 Page shell (`HomeV2.tsx`)

- Root: `<div class="v2">` containing the skip link «К содержанию» → `#main`, `<Masthead/>`, `<main id="main">…</main>`, `<Colophon/>`, `<MobileBookBar/>` and `<CookieConsent/>`. `App.tsx` mounts CookieConsent only in the public layout, so `/v2` must mount its own.
- Wrap everything in `<MotionConfig reducedMotion="user">`.
- Set `document.documentElement.lang = lang` on lang change and restore it on unmount.
- While `/v2` is in review: set `<meta name="robots" content="noindex">` and `<link rel="canonical" href="/">`.
- Language toggles show the intersection of the enabled languages from `useLang().languages` with `['ru','lv','en']`.

### 5.1 Masthead (header)

**Purpose:** brand plus navigation in a magazine-masthead voice, with booking always one tap away from the first paint.

**Layout, desktop (≥ 1280):** a 72 px bar on the 12-column grid, background paper.

- **Cols 1–3:** wordmark «SKINLAB» (NSD 600, wdth 100, 22 px, tracking .14em) with a mono 13 px micro-line beneath: «эстетическая косметология · Rīga».
- **Cols 5–9:** nav, mono 14 px uppercase:
  - «Процедуры» → `#procedures`
  - «Карта лица» → `#atlas`
  - «Работы» → `#works`
  - «Об Анастасии» → `#letter`
  - «Вопросы» → `#faq`
- **Cols 10–12:** language toggles «RU · LV · EN» (mono 14 px; the current one in rouge with a 2 px pencil underline) and the ink pill «Записаться» (Onest 600 16 px, 44 px tall, paper text) → `/booking`.
- A hairline `--v2-hair` appears after 24 px of scroll.

**Tablet (768–1279):** the nav collapses into a «Содержание» menu button; the pill stays.

**Mobile (< 768):** a 56 px bar with the wordmark on the left and, on the right, the pill «Записаться» (40 px visual, 44 px hit area) and a menu button.

**Menu overlay ("Содержание"):** full-screen paper.

- Serif links at 40 px (NSD wdth 75) on staggered indents (0 / 8% / 4%).
- Language toggles.
- Phone and address in mono at the bottom.
- `aria-modal`, focus trap, Esc closes it, focus returns to the button.

**Interactions:**

- Hide on scroll down, show on scroll up, using a `y` transform only (motion `useScroll` + `useMotionValueEvent`, 0.3 s `--v2-ease-out`).
- It never hides while the menu is open or while the scroll position is within the cover.
- `aria-current` marks the link of the section in view (IntersectionObserver).
- `setLang` comes from `useLang()`.

**Data:**

- `v2.nav.*` and `v2.cta.book`.
- Phone and address from `settings/site` (same defaults as `Footer.tsx`).
- The pill label may be overridden by CMS `content/header.bookingButtonText` via `useCmsField`.

**Reduced motion:** no hide/show transform; the header stays static at the top.

### 5.2 Cover: H1, film, chapter index, CTAs

**Purpose:** say what and where in one glance (SEO and clarity), run the hero film, turn the film into readable, clickable chapters, and convert. The poster or H1 is the LCP.

**Layout, desktop (≥ 1280).** `min-height: calc(100svh - 72px)`, 12-col grid.

- **Spine label** at the far-left edge, vertical, mono 13 px, ink-60, aria-hidden: «SKINLAB — РИГА — ЭСТЕТИЧЕСКАЯ КОСМЕТОЛОГИЯ» (LV/EN versions in §7).
- **Text block, cols 1–6:**
  - **H1**, 3 authored lines: «Эстетическая» (cols 1–6), italic «косметология» (cols 2–7), «в Риге» (cols 1–4). Size `--v2-fs-h1`. The longest line must fit its columns at every width ≥ 1280; if it does not, lower wdth to 62.5 before lowering the size.
  - **Trust line** (Onest 400 17 px, ink, max 46ch), +1 beat below the H1: «Анастасия Букина — косметолог с высшим медицинским образованием (Латвийский университет)», then a mono 14 px ink-60 line «рег. № {regNumber}». A Bad Script signature «А. Букина» (28 px, rouge, −3°, aria-hidden) sits after the trust line. This is the cover's tiny element.
  - **Chapter index**, +1 beat (§5.2.1).
  - **CTA row:** ink pill «Записаться» → `/booking`, and a text link «Все процедуры →» → `/services` with a pencil underline.
  - **Next-slot chip** below the CTAs (§5.2.2).
- **Film block, cols 7–12, bleeding to the right page edge:**
  - The film slot width is `min(100% + var(--v2-edge), calc((100svh - 72px - 2 * var(--v2-beat)) * .8), 880px)`, with `aspect-ratio: 4/5` reserved in CSS and `justify-self: end`. It is offset +1 beat from the top.
  - The slot is pulled left by `8%` of its own width (`margin-left: calc(var(--film-w) * -0.08)`) and sits under the text layer (z 1 vs 2). The H1's longest line can therefore end over the film's left quiet gutter, which is paper with no copy (MOTION.md §4.2). **This is the cover's one deliberate overlap.**
  - **Frameless:** the composition background equals `--v2-paper`. A static edge feather is applied as `mask-image: linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 4.8%, #000 95.2%, transparent 100%)` with `mask-composite: intersect` (`-webkit-mask-composite: source-in`). The feather only touches the film's 64 px safe band.
  - Container: `isolation: isolate` (fixes Safari iframe clipping).
  - Controls: a 44 × 44 Пауза/Смотреть toggle, bottom-left inside the frame (oat circle, ink icon). Below the frame, a mono 13 px ink-60 caption «Фильм-иллюстрация · модель».
- **Giant element:** the H1.

**Tablet (768–1279):** the H1 spans the full 8 columns. Below it, the film (cols 3–8, 4:5) overlaps the H1's last line by 1 beat. The trust line, index and CTAs follow, in cols 1–6.

**Mobile (< 768), in DOM order:**

1. H1 (indents 0 / 10% / 4%)
2. trust line and reg. number
3. film, full width `calc(100vw - 32px)`, 4:5
4. caption with the pause toggle
5. chapter index
6. CTA pair, stacked full width
7. next-slot chip

The header pill is visible from first paint, so there is always a booking action on the first screen.

**Data:**

- `v2.cover.*` translations.
- `regNumber` from Firestore `content/about` (default `59850068090`).
- Prices: `minPrice(category)` from `useServices()`, falling back to `servicesData`.
- Chapter order and times from `data/heroChapters.ts`.

#### 5.2.1 Chapter index: the film's text alternative

- An `<ol aria-label="Содержание фильма">` with 7 rows **in film order**:

  | # | Category id | Shown as |
  |---|---|---|
  | 01 | skincare | Уход и чистки |
  | 02 | peels | Пилинги |
  | 03 | mesotherapy | Мезотерапия |
  | 04 | biorevitalization | Биоревитализация |
  | 05 | biostimulation | Биостимуляция |
  | 06 | complex | Комплексные программы |
  | 07 | consultation | Консультация |

- Each row has two controls:
  - A `<button>` spanning the text. It shows mono rouge «0N», then the category title (Onest 600 17 px, from CMS `title` / `title_lv`), then a dotted leader, then «от X €» (mono 600 15 px). It has `aria-controls` pointing at the film and `aria-current="true"` when its chapter is playing. Clicking it calls `seekToChapter(n)` and plays.
  - A trailing `<Link>` arrow (44 × 44, `aria-label="{title}: подробнее"`) → `/service/{id}`.
- Staircase: row *i* is indented `[0, 1.5rem, .75rem][i % 3]`. Row min-height 44 px, hairline separators.
- **The current chapter** gets a rouge 2 px pencil underline under its title, drawn with `pathLength` 0→1 in 0.4 s, or set instantly under reduced motion.
- Times: `heroChapters.ts` (01 3.90 · 02 7.10 · 03 10.30 · 04 13.50 · 05 16.70 · 06 19.90 · 07 25.60). No row is current during the hook, the frame-forming beat or the recap.

#### 5.2.2 Next-slot chip (`NextSlotChip`)

- An oat slip, −1.5°, with mono 14 px text: «Ближайшее окно: {чт, 9 окт} · {14:00}». It is a link to `/booking`.
- A 40 px-tall box is always reserved (no CLS). Its content fades in (0.2 s).
- With no slot, or on fetch error, it shows «Онлайн-запись · выберите удобное время».
- Data: `useNextSlot()` (§8).

#### 5.2.3 Cover motion

- H1 lines: each line sits in an `overflow: clip` wrapper and moves `yPercent 105 → 0`, stagger 0.07 s, 0.8 s `--v2-ease-out`, on mount. The text is in the DOM and painted from first render (transform only), so LCP is not delayed.
- The trust line and index fade up (opacity, y 12 px, 0.5 s, delay 0.25 s).
- **No scroll-linked effects on the cover.**
- **Page–film sync** (§6): the cover's «Записаться» pill pulses once (`scale 1 → 1.04 → 1`, 0.5 s) when the film's CTA pill appears (film time 26.95 s), and only if the cover pill is ≥ 50 % visible.

**Reduced motion:** H1 is static. The film does not autoplay: it shows the still `poster-map-{lang}` (the face-map frame) and a «Смотреть фильм ▶» button. The chapter index still works: clicking a row loads the player and plays from that chapter, which counts as user-initiated motion.

### 5.3 Price list «Процедуры и цены» (`#procedures`)

**Purpose:** the full menu with prices. It is the main path to `/service/:id`, and the place where visitors learn the 7 category shapes.

**Layout, desktop (≥ 1280).**

- **Rail (col 1):** a vertical «ПРОЦЕДУРЫ И ЦЕНЫ» label and «07 разделов» in mono.
- **Headline (display-l, cols 2–9), authored lines:** «Всё, что я делаю» / italic «для вашей кожи». This is the giant element.
- **Seven rows in film order**, separated by full-bleed hairlines. Each row is at least 112 px tall:
  - number «0N»: mono 14 px rouge, col 2;
  - title: display-m, starting at col `3 + (i % 3)` (staircase);
  - description: Onest 15 px, cols 9–11, max 2 lines (`line-clamp: 2`);
  - meta: col 12, right-aligned, two mono lines, «от X €» (600, 16 px) above «N процедур» (14 px, ink-60);
  - the row title is a `<Link>` → `/service/{id}`;
  - below the meta, a disclosure button «Цены ▾» (`aria-expanded`, `aria-controls`). It opens a panel spanning cols 3–11 with every treatment: Onest 16 px name, a dotted leader, mono 600 15 px price. The panel ends with the link «Подробнее о направлении →».
- **Tiny element:** a tape strip on the first row's thumbnail.

**Tablet:** title cols 2–6 (staircase over 3 starts), meta cols 7–8, description below the title.

**Mobile:** a top line with the number on the left and the price on the right, then the title (indents [0, 8%, 4%]), a 2-line description, then the «Цены ▾» button. Panels open in place.

**Interactions** (pointer-fine and ≥ 1024 only):

- Hovering or focusing a row sets an oat background and indents the title by 12 px (transform).
- The title's width axis goes 75 → 100 over 400 ms (`font-variation-settings`; the only place the page animates wdth on hover).
- A static thumbnail appears at cols 10–12 inside the row: a 200 px crop of the face zone for that category, clipped by the category token, opacity 0 → 1 in 0.2 s. **It does not follow the cursor.**
- The disclosure panel animates via CSS `grid-template-rows: 0fr → 1fr` (0.35 s); instant under reduced motion.

**Data:**

- `useServices()`, ordered by `heroChapters` order.
- `title`, `description` and treatment `name` / `price` resolved with `useCmsField`; treatment names go through `sanitizeName()` (§8).
- Count = `treatments.length` (Russian and Latvian plurals via `Intl.PluralRules`, §7).
- Thumbnails: `public/media/v2/zone-{categoryId}-{320|640}.{avif,webp}`, generated by `scripts/v2-images.ts` from the face master.

**Reduced motion:** no indent or wdth transitions; colour and underline focus states only.

### 5.4 Face atlas «Карта лица» (`#atlas`)

**Purpose:** the interactive twin of the film. It answers "what is there for **my** concern?" by facial zone.

**Layout, desktop (≥ 1280).**

- **Portrait, cols 6–11 (heavy right; the giant element):**
  - the cut-out face `face-clear-{640|960|1280}.{avif,webp}` (alpha, no background), sitting on a blush blob in the `hero` token behind it;
  - over it, an SVG overlay in **source image space** (`viewBox 0 0 1031 1280`, matching `public/before1.jpeg`) with the zone pencil paths and 6 hotspot buttons (44 px circles, paper fill, 2 px rouge ring, mono 14 px numerals 1–6), positioned in % of the image box.
- **Index card, cols 1–5:** oat paper, tilt −1.5°, tape on top, offset +2 beats. Contents:
  - mono kicker «ЗОНА 0N»;
  - zone title (NSD 400 wdth 80, 40 px);
  - concerns line (Onest 17 px);
  - treatments as rows (Onest 16 px name, dotted leader, mono 600 15 px price), each a link to `/service/{categoryId}`.
- **Headline above the card:** «Что вас беспокоит?» / italic «Выберите зону» (display-l).
- **Tiny element:** the card's tape.

**Mobile:**

- portrait at full width;
- a zone chip row below it that **wraps onto 2 rows** (no horizontal scroller): chips are 44 px tall, mono 14 px, oat; the selected chip is ink with paper text;
- the card follows.

**Interactions:**

- A `role="tablist"`. Hotspots and chips are both tabs (`aria-controls` points at the card `tabpanel`) with roving tabindex: arrow keys move, Home/End jump, Enter/Space selects, and `aria-selected` is kept in sync.
- Selecting a zone draws its pencil path (`pathLength 0 → 1`, 0.9 s, ease-out, rouge 2.5 px, round caps) and crossfades the card (opacity, y 8 px, 0.35 s, `AnimatePresence mode="wait"`).
- The default zone is **eyes**.
- No hover-only information.

**Data:** `data/faceZones.ts`. Anchors are in source px of the 1031 × 1280 portrait; treatments are joined by exact `name` against live `useServices()`, and a missing name drops the row.

| id | Label RU | Hotspot (src px) | Concerns RU | Treatments (category → names) |
|---|---|---|---|---|
| `forehead` | Лоб | 515, 300 | воспаления, расширенные поры, неровный рельеф | skincare → Anti Acne программа, Чистка лица, Микронидлинг (Dermapen); peels → Пилинг для сияния |
| `eyes` | Глаза | 630, 600 | тёмные круги, отёки, мелкие морщины | mesotherapy → RRS HA Eyes, Plinest Eye; biostimulation → Xela Rederm 1,1% |
| `tone` | Скулы и тон | 330, 640 | пигментация, тусклость, неровный тон | peels → Anti pigment пилинг, BioRePeel Cl3; biostimulation → Meso-Xanthin F199 |
| `lips` | Губы | 508, 860 | сухость, мелкие морщинки | biorevitalization → Биоревитализация губ |
| `oval` | Овал лица | 715, 830 | потеря упругости, нечёткий контур | biostimulation → Plinest (ПДРН), RRS Long Lasting, Meso-Wharton P199; skincare → Безинъекционные жидкие нити |
| `face` | Всё лицо | 515, 180 | тусклость, постакне, подготовка к событию | complex → GLOW EFFECT, ANTI POSTACNE, ANTI POSTACNE 2.0; biorevitalization → Neauvia Hydro Deluxe, Stylage Hydro |

Pencil paths, in source px:

- **forehead:** an arc from (400, 330) through (515, 280) to (630, 330).
- **eyes:** two under-eye arcs, (320, 592)→(445, 592) and (568, 592)→(693, 592), each sagging 14 px.
- **tone:** three short diagonal hatches on the left cheekbone, x 300–390, y 620–660.
- **lips:** a droplet outline beside the lips at (600, 800).
- **oval:** two swoop arrows rising along the jawlines: (270, 900)→(330, 760) and (745, 900)→(690, 760).
- **face:** a dashed ellipse around the face.

All anchors must be verified on an overlay snapshot before shipping. LV and EN labels are in §7.

**Reduced motion:** paths are shown already drawn; the card swaps instantly.

### 5.5 Spreads A, B, C: three feature chapters

**Purpose:** sell three hero categories in depth: indications, results, the price list and the mechanism. Each spread reuses a mechanism illustration from the film, as a static inline SVG (`MechanismArt`) printed in a lens.

**Which categories:**

- Categories with `showInHero === true`, sorted by `heroOrder`, first three.
- Fallback: `['biostimulation', 'biorevitalization', 'complex']`.
- Ghost numerals use the film chapter numbers: biostimulation «05», biorevitalization «04», complex «06».

**Content per spread:**

- The **lead treatment** is the first treatment in the category that has `detailedDescription`, `indications` and `results`.
- Mono kicker «Глава 0N — {category title}».
- Display-l benefit headline, authored lines in §7.
- Pull quote: the first sentence of the lead treatment's `detailedDescription`.
- Two mono-headed lists, «Показания» and «Результат», with the top 3 of each (Onest 16 px).
- The **category price list**: all treatments, name ····· price.
- The link «Подробнее →» → `/service/{id}`.

**Spread A (biostimulation), heavy left, about 110svh on desktop:**

- **Giant element:** ghost numeral «05» bleeding off the left edge.
- **Collage, cols 1–6:**
  - the portrait crop `crop-oval-960` in the `cell` token;
  - overlapping it (cols 5–7, +1 beat, 3° tilt, tape) a small print lens with the static «PDRN strand → collagen» mechanism SVG.
  - **This is the spread's one overlap.**
- **Text, cols 8–12.**
- **Tiny element:** the tape.

**Spread B (biorevitalization), heavy right, mirrored:**

- Collage in cols 7–12 (the `crop-cheek-960` portrait in the `pebble` token).
- Text in cols 1–6. The «droplet + plumping cells» print floats left inside the text column with `shape-outside` (§4.4), and the body text wraps around it.
- The headline's key word «изнутри» gets the **only on-view width-axis animation on the page**: wdth 62.5 → 100 once, over 0.9 s, the hydration "swell". It runs only for pointer-fine users and not under reduced motion.
- **The overlap:** the headline's second line crosses the edge of the portrait print by at most 1.5 columns, on a paper slip.

**Spread C (complex), the page's centred type break:**

- The display-l headline «Сияние / к событию» is centred.
- Below it, a horizontal strip of 2 prints: `crop-glow-960` in the `cloud` token, and the three-clippings collage («пилинг + мезо + маска» on oat paper with tape) as an inline SVG/HTML print.
- Then the lists and the price list in 2 columns (cols 3–10).
- **The overlap:** a clipping over the edge of the portrait print.

**Mobile, all three spreads:**

- the image comes first, then the text;
- the ghost numeral sits behind the headline at ≤ 60vw;
- «Показания» and «Результат» collapse into `<details>`;
- no `shape-outside`.

**Motion:**

- Collage layers parallax `y ±40 px` (mobile ±16 px) using `useScroll({target})` + `useTransform`, transforms only.
- Ghost numerals drift `x ±3vw` against the scroll direction (pointer-fine only).
- The headline key word gets a pencil underline (`pathLength`) on view.
- The link arrow nudges +4 px on hover.

**Reduced motion:** static layout, underlines pre-drawn, no wdth swell.

### 5.6 Proof «Работы» (`#works`): oat band

**Purpose:** visual evidence, labelled honestly.

**Layout, heavy right:**

- **Cols 6–11 (giant element):** the restyled `BeforeAfterSlider` as a 3:2 print (12 px paper border, −1° tilt, tape).
  - It compares **forehead crops only**: `forehead-before-1200.webp` (from `public/before.jpeg`) and `forehead-after-1200.webp` (from `public/before1.jpeg`).
  - Crop rect in source px: x 286, y 214, w 460, h 307. The two source images are pixel-aligned only in the forehead band; they differ at the lips, the jaw and the under-eyes.
  - The handle is a vertical rouge pencil line with mono labels «до» / «после» (14 px). **No Bad Script on functional labels.**
  - A mono 14 px label «иллюстрация» sits on the print, permanently visible.
- **Cols 1–4:** kicker «РАБОТЫ», display-l headline «Как меняется / кожа», then up to 3 real works from `useWorks()` as small prints (`image`, `title`, `tag`, tilts from `TILTS`). With 0 works, this column shows only the headline and the link «Реальные работы →» → `/works`.
- **Tiny element:** the «иллюстрация» label.

**Mobile:** the slider at full width, then the works (2 per row), then the link.

**Interactions:**

- Slider: pointer drag, plus `role="slider"`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow`, `aria-valuetext="{n}% после"`. Arrow keys step 5 %, Home/End jump to the ends.
- Remove the component's auto "hint" animation under reduced motion.

**Not used on v2, and why:**

- `bef_after_video.mp4` is a full-face AI transformation that also changes the lips and jaw, with English labels and a cold clinic background. It would imply false contouring results.
- `after.jpeg` and the `hf_…jpeg` file carry English annotations and the cold background.
- `image (1)…jpeg` duplicates `before1.jpeg`.

### 5.7 Letter «От автора» (`#letter`)

**Purpose:** the personal brand and trust of a solo practitioner.

**Layout, heavy left, ≥ 1024:**

- One text column, cols 3–10 (the giant element is the floated portrait):
  - mono kicker «ОТ АВТОРА»;
  - display-l name in 2 lines, «Анастасия / Букина»;
  - pull quote (NSD italic) = CMS `subtitle`.
- The portrait (CMS `imageUrl`, `loading="lazy"`, width and height set) floats left inside the column at 42 % width, in the `consultation` («seed») token with `shape-outside: border-box`. The body text (`text`, then `text2`) wraps around the blob edge. **This is the section's one overlap/organic gesture.**
- Drop cap on the first paragraph: `initial-letter: 4` in NSD 400, falling back to a 4-line float.
- After the text:
  - credentials as marginalia (mono 14 px): «Высшее медицинское образование — Латвийский университет», «рег. № {regNumber}»;
  - the Bad Script signature «Анастасия Букина» (34 px, rouge, aria-hidden), with the plain-text name already above;
  - the link «Подробнее обо мне →» → `/about`.
- **Tiny element:** the signature.
- **No stats, counters or experience numbers** (§11).

**Mobile:** the portrait at 70vw aligned right with no float, then the text.

**Data:** Firestore `content/about` (`name`, `subtitle`, `text`, `text2`, `imageUrl`, `regNumber`, with `_lv`/`_en` variants), using the `About.tsx` defaults except `stats`, which are ignored.

**Motion:** the portrait fades and rises 24 px on view; the signature reveals left→right via `clip-path: inset(0 100% 0 0) → inset(0)` (0.9 s).

**Reduced motion:** static.

### 5.8 First visit «Как начать»

**Purpose:** remove first-booking risk with real prices.

**Layout, desktop:**

- Display-l headline «Первый визит — / без сюрпризов».
- A diagonal staircase of 3 steps: step *n* (0-based) starts at col `1 + 4n`, with `margin-top: n × 2 beats`. Each step has:
  - a big mono numeral (48 px, rouge);
  - a serif title (NSD 400 wdth 80, 32 px);
  - 2 lines of Onest 16 px;
  - price chip(s) in mono 600 16 px on oat.
- Hand-drawn connector arrows (inline SVG, rouge 2.5 px) join the steps.
- CTA: ink pill «Записаться на консультацию» → `/booking`.
- **Giant element:** the staircase diagonal. **Tiny element:** the arrowheads.

**The steps:**

| # | Title | Copy | Price |
|---|---|---|---|
| 01 | Консультация | Онлайн или в кабинете: смотрим кожу, обсуждаем цели. | «онлайн 40 €» · «в кабинете 50 €» |
| 02 | План процедур | Подбираю процедуры и домашний уход под вашу кожу и бюджет. | — |
| 03 | Первый визит с процедурой | Консультация и первая процедура в один день. | «80 €» |

**Mobile:** vertical, with indents [0, 8%, 4%] and downward arrows.

**Data:** prices from the `consultation` category in `useServices()`, matched by name: «Консультация ONLINE», «Первый визит без процедуры», «Первый визит с процедурой». The fallback is `servicesData`. Copy keys `v2.visit.*`.

**Motion:** arrows draw on view (`whileInView`, once, `pathLength` 0 → 1, 0.9 s, stagger 0.2). **Not scroll-scrubbed.**

**Reduced motion:** pre-drawn.

### 5.9 Questions «Частые вопросы» (`#faq`)

**Layout:**

- Cols 4–11 (offset right). The left rail, cols 1–2, holds a vertical «Q&A» in mono.
- Display-l headline «Частые / вопросы».
- Questions in NSD italic 300, `clamp(1.5rem, 2.4vw, 2.25rem)`; answers in Onest body.
- The plus icon is a hand-drawn SVG (rouge) that rotates 45° into a cross.

**Mobile:** full width.

**Interactions:**

- Each question is a `<button aria-expanded aria-controls>` controlling a `role="region"` labelled by the button.
- Several items can be open at once.
- Height animates via CSS `grid-template-rows: 0fr → 1fr` (0.35 s); instant under reduced motion.

**Data:** Firestore `content/faq`, using the same language selection as `FAQ.tsx` `getItems()` (`items_{lang}` → `items_lv` → `items`), with the CMS `mainTitle` as an optional override.

### 5.10 Booking «Запишитесь» (dark ink section)

**Purpose:** the final conversion block.

**Layout:**

- Full-bleed `--v2-ink` with `<Seam seed={21}>` on top, filled ink.
- **Cols 1–9 (heavy left; the giant element):** paper-coloured display lines «Запишитесь —» and italic «кабинет в Риге.» at `--v2-fs-h1 × .8`.
- **Cols 8–12:**
  - CMS `content/cta.subtitle` (Onest, paper at 80 %);
  - the blush pill «Записаться онлайн» (ink text, 10.2:1) → `/booking`;
  - phone (`tel:` link, mono 600 18 px);
  - address (`address` / `address_lv`);
  - Instagram and Telegram links when present;
  - schedule lines from `content/footer.scheduleWeekdays` / `scheduleWeekends`.
- **Tiny element:** a rouge pencil pin icon before the address.
- Grain at `.08` with `screen` blending.

**Mobile:** stacked, with the pill at full width.

**Interactions:**

- Pill hover: blush → glaze background, arrow +4 px.
- Links get a blush underline on hover and focus.
- Text slips reveal on view (`clip-path` L→R).

**Data:** `settings/site` (phone, email, address, address_lv, socialLinks) and `content/footer` schedule fields, both via `useContent` with the `Footer.tsx` defaults; `content/cta` (title, subtitle, buttonText) via `useCmsField`. The display lines are static `v2.booking.*` keys, because they need authored breaks.

### 5.11 Colophon (footer)

**Layout:**

- Oat background with `<Seam seed={31}>` on top.
- **Cols 1–5:** a huge wordmark «SKINLAB» (NSD 600 wdth 62.5, `clamp(4rem, 14vw, 13rem)`), cropped by the bottom edge via the section's `overflow: clip`. This is the giant element.
- **Cols 6–8:** mono label «Колофон», `brandDescription` (Onest 15 px, which contains the registration ID) and the schedule.
- **Cols 9–12:** legal and info links from `infoLinks` (mono 14 px).
- **Bottom row:** copyright (`{year}` replaced) and the language toggles.
- **Tiny element:** a 6 px rouge dot after «SKINLAB».

**Mobile:** stacked.

**Data:** `content/footer` (brandDescription, scheduleTitle/Weekdays/Weekends, copyright, infoLinks, all with `_lv`) and `settings/site`, using the `Footer.tsx` defaults.

**Interactions:** a pencil underline on link hover and focus.

### 5.12 Mobile booking bar (< 768 only)

- A sticky bottom bar, 16 px inset from the edges, 56 px tall, paper slip with `--v2-shadow-slip`.
  - Left: the ink pill «Записаться · от {minAll} €» → `/booking`, where `minAll` is the minimum price across all categories, computed live (currently 40).
  - Right: a 44 × 44 oat circle with a lucide `Phone` icon, `tel:{settings.phone}`, `aria-label="Позвонить"`.
- **Shown when** the cover's bottom edge leaves the viewport. **Hidden** while the booking section is ≥ 20 % visible, or while the menu is open.
- Motion: `y 100% → 0`, 0.35 s; opacity only under reduced motion.
- `padding-bottom: env(safe-area-inset-bottom)`.
- The page's `<main>` gets `padding-bottom: 88px` on mobile, so the bar never covers the colophon's links.

---

## 6. Hero film integration (`HeroFilm.tsx` + `useHeroPlayer.ts`)

### 6.1 Element

```tsx
<hyperframes-player
  ref={ref}
  src={mode === 'mp4' ? `/hf/skinlab-hero/renders/hero-site-${lang}-720.mp4` : `/hf/skinlab-hero/index.${lang}.html`}
  type={mode === 'mp4' ? 'video/mp4' : undefined}
  width="1080" height="1350"
  autoplay="" muted="" loop="" audio-locked="" low-power-idle="" assets-loading-ui="none"
  disable-click-to-play=""
  runtime-src="/hf/vendor/hyperframe.runtime.iife.js"
  aria-hidden="true"
/>
```

- CSS: `display: block; width: 100%; aspect-ratio: 4/5`. The player assumes 1920×1080 until ready, so the slot reserves 4:5 itself.
- **Never set `sandbox-origin`.** The opaque sandbox blocks runtime injection and `__timelines`.
- `lang ∈ {ru, lv, en}`. Any other language uses `ru`.

### 6.2 Delivery modes (`useDeliveryMode`)

| Mode | When | What renders |
|---|---|---|
| `still` | `prefers-reduced-motion: reduce` | `<picture>` with `poster-map-{lang}` (the film's face-map frame) and a «Смотреть фильм ▶» button. On click, the mode switches to `mp4` or `live` (rules below) and playback starts. |
| `mp4` | `matchMedia('(pointer: coarse)')`, OR `navigator.connection?.saveData`, OR `effectiveType ∈ {slow-2g, 2g, 3g}`, OR (`deviceMemory` defined AND ≤ 4), OR viewport width < 768, OR the live player fired `error` | The same `<hyperframes-player>` with `type="video/mp4"` and the 720×900 site-cut MP4. Seek, timeupdate and the chapter sync keep working. |
| `live` | otherwise (desktop with a fine pointer) | The live composition `index.{lang}.html` |

`pointer: coarse` must be part of the rule because `deviceMemory` is undefined in Safari.

### 6.3 LCP and loading sequence

1. React renders a light-DOM `<picture>` poster in the film slot:
   - AVIF/WebP `srcset` 540/810/1080, `sizes` matching the slot, width/height set, `fetchpriority="high"`, `decoding="async"`;
   - source `poster-{lang}-{w}` = **frame 0 of the film**, so there is no jump when playback starts.
2. `index.html` gets a tiny inline script: when `location.pathname === '/v2'`, inject `<link rel="preload" as="image" type="image/avif" imagesrcset=… imagesizes=… fetchpriority="high">` for the ru poster, plus `<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/v2/NotoSerifDisplay-Roman.woff2">`. This gets discovery ahead of the lazy route chunk.
3. After `window` `load`: `requestIdleCallback` (falling back to `setTimeout(…, 200)`) → `import('@hyperframes/player')` → mount the player under the poster at opacity 0.
4. Crossfade (0.2 s) once ready: the `painted` event in `live` mode, or the first `timeupdate` after `play` in `mp4` mode. Then remove the poster from the a11y tree (it was `alt=""`).
5. On `error` in live mode, switch to mp4. On `playbackerror`, stay on the poster and show the Смотреть button.

### 6.4 Playback rules

- **Pause** when less than 25 % of the slot is visible (IntersectionObserver, threshold `[0, .25]`) or when `document.visibilityState === 'hidden'`. Resume when both conditions clear, unless the user paused manually (`userPaused` flag).
- **The pause/play toggle** (44 × 44) is always present (WCAG 2.2.2). Labels «Пауза» / «Смотреть», with an `aria-pressed`-free label swap.
- **`seekToChapter(n)`:** `player.seek(CHAPTERS[n].start)`, then `play()`, then clear `userPaused`. In `still` mode it first switches mode, then seeks.
- **Chapter sync:** on `timeupdate`, compute the chapter where `start ≤ t < next.start`. React state updates only when the index changes. Windows with no active row: [0, 3.90), [23.10, 25.60).
- **CTA pulse:** on `timeupdate`, if `prev < 26.95 ≤ t` and the cover pill is ≥ 50 % visible, run one pulse.
- `useHeroPlayer` returns `{ slotRef, mode, ready, playing, chapter, play, pause, seekToChapter }`.

### 6.5 Files consumed

All under `public/hf/skinlab-hero/` (produced by MOTION.md §13):

- `index.{ru,lv,en}.html`
- `assets/…`
- `posters/poster-{lang}-{540,810,1080}.{avif,webp}`
- `posters/poster-map-{lang}-{540,810,1080}.{avif,webp}`
- `renders/hero-site-{lang}-720.mp4`

`heroChapters.ts` mirrors MOTION.md §7 exactly; `scripts/hf-hero-build.ts` asserts they are equal.

---

## 7. Copy deck: new `v2.*` translation keys (ru / lv / en)

LV and EN need a native-speaker review before launch. CMS-driven text is not listed here.

| Key | RU | LV | EN |
|---|---|---|---|
| `v2.skip` | К содержанию | Uz saturu | Skip to content |
| `v2.nav.procedures` | Процедуры | Procedūras | Treatments |
| `v2.nav.atlas` | Карта лица | Sejas karte | Face map |
| `v2.nav.works` | Работы | Darbi | Results |
| `v2.nav.about` | Об Анастасии | Par Anastasiju | About Anastasia |
| `v2.nav.faq` | Вопросы | Jautājumi | FAQ |
| `v2.nav.menu` | Содержание | Saturs | Contents |
| `v2.cta.book` | Записаться | Pierakstīties | Book |
| `v2.cta.bookOnline` | Записаться онлайн | Pierakstīties tiešsaistē | Book online |
| `v2.cta.all` | Все процедуры → | Visas procedūras → | All treatments → |
| `v2.cta.more` | Подробнее → | Uzzināt vairāk → | Learn more → |
| `v2.cover.spine` | SKINLAB — РИГА — ЭСТЕТИЧЕСКАЯ КОСМЕТОЛОГИЯ | SKINLAB — RĪGA — ESTĒTISKĀ KOSMETOLOĢIJA | SKINLAB — RIGA — AESTHETIC COSMETOLOGY |
| `v2.cover.h1` (3 lines) | Эстетическая / *косметология* / в Риге | Estētiskā / *kosmetoloģija* / Rīgā | Aesthetic / *cosmetology* / in Riga |
| `v2.cover.trust` | Анастасия Букина — косметолог с высшим медицинским образованием (Латвийский университет) | Anastasija Bukina — kosmetoloģe ar augstāko medicīnisko izglītību (Latvijas Universitāte) | Anastasia Bukina — cosmetologist with higher medical education (University of Latvia) |
| `v2.cover.reg` | рег. № | reģ. Nr. | Reg. No. |
| `v2.cover.indexLabel` | Содержание фильма | Filmas saturs | Film contents |
| `v2.cover.caption` | Фильм-иллюстрация · модель | Ilustratīva filma · modele | Illustrative film · model |
| `v2.cover.nextSlot` | Ближайшее окно: | Tuvākais brīvais laiks: | Next free slot: |
| `v2.cover.nextSlotNone` | Онлайн-запись · выберите удобное время | Pieraksts tiešsaistē · izvēlieties ērtu laiku | Online booking · pick a time that suits you |
| `v2.film.pause` / `.play` / `.watch` | Пауза / Смотреть / Смотреть фильм ▶ | Pauze / Skatīties / Skatīties filmu ▶ | Pause / Play / Watch the film ▶ |
| `v2.price.from` | от {p} € | no {p} € | from {p} € |
| `v2.prices.kicker` | Процедуры и цены | Procedūras un cenas | Treatments & prices |
| `v2.prices.h2` (2 lines) | Всё, что я делаю / *для вашей кожи* | Viss, ko daru / *jūsu ādai* | Everything I do / *for your skin* |
| `v2.prices.toggle` | Цены | Cenas | Prices |
| `v2.prices.more` | Подробнее о направлении → | Vairāk par šo virzienu → | More about this area → |
| `v2.prices.count` | one: {n} процедура · few: {n} процедуры · many: {n} процедур | zero/other: {n} procedūras · one: {n} procedūra | one: {n} treatment · other: {n} treatments |
| `v2.atlas.kicker` | Карта лица | Sejas karte | Face map |
| `v2.atlas.h2` (2 lines) | Что вас беспокоит? / *Выберите зону* | Kas jūs satrauc? / *Izvēlieties zonu* | What concerns you? / *Choose an area* |
| `v2.atlas.zone.*` | Лоб · Глаза · Скулы и тон · Губы · Овал лица · Всё лицо | Piere · Acis · Vaigu kauli un tonis · Lūpas · Sejas ovāls · Visa seja | Forehead · Eyes · Cheekbones & tone · Lips · Contour · Whole face |
| `v2.spread.biostimulation.h` | Упругий овал — / *свой коллаген* | Stingrs ovāls — / *savs kolagēns* | A firm contour — / *your own collagen* |
| `v2.spread.biorevitalization.h` | Увлажнение / *изнутри* | Mitrinājums / *no iekšpuses* | Hydration / *from within* |
| `v2.spread.complex.h` | Сияние / *к событию* | Mirdzums / *svētkiem* | Glow / *for the occasion* |
| `v2.spread.indications` / `.results` / `.prices` | Показания / Результат / Цены | Indikācijas / Rezultāts / Cenas | Indications / Results / Prices |
| `v2.proof.kicker` / `.h2` | Работы / Как меняется / *кожа* | Darbi / Kā mainās / *āda* | Results / How skin / *changes* |
| `v2.proof.label` / `.before` / `.after` | иллюстрация / до / после | ilustrācija / pirms / pēc | illustration / before / after |
| `v2.proof.more` | Реальные работы → | Īstie darbi → | Real client work → |
| `v2.letter.kicker` / `.cred` / `.more` | От автора / Высшее медицинское образование — Латвийский университет / Подробнее обо мне → | No autores / Augstākā medicīniskā izglītība — Latvijas Universitāte / Vairāk par mani → | From the author / Higher medical education — University of Latvia / More about me → |
| `v2.visit.kicker` / `.h2` | Как начать / Первый визит — / *без сюрпризов* | Kā sākt / Pirmā vizīte — / *bez pārsteigumiem* | How to start / Your first visit — / *no surprises* |
| `v2.visit.s1.t` / `.d` | Консультация / Онлайн или в кабинете: смотрим кожу, обсуждаем цели. | Konsultācija / Tiešsaistē vai kabinetā: apskatām ādu, pārrunājam mērķus. | Consultation / Online or in the studio: we look at your skin and talk through your goals. |
| `v2.visit.s2.t` / `.d` | План процедур / Подбираю процедуры и домашний уход под вашу кожу и бюджет. | Procedūru plāns / Izvēlos procedūras un mājas kopšanu jūsu ādai un budžetam. | Treatment plan / I put together treatments and home care for your skin and budget. |
| `v2.visit.s3.t` / `.d` | Первый визит с процедурой / Консультация и первая процедура в один день. | Pirmā vizīte ar procedūru / Konsultācija un pirmā procedūra vienā dienā. | First visit with a treatment / Consultation and your first treatment on the same day. |
| `v2.visit.online` / `.studio` | онлайн / в кабинете | tiešsaistē / kabinetā | online / in the studio |
| `v2.visit.cta` | Записаться на консультацию | Pierakstīties uz konsultāciju | Book a consultation |
| `v2.faq.h2` | Частые / *вопросы* | Biežākie / *jautājumi* | Frequently asked / *questions* |
| `v2.booking.h` (2 lines) | Запишитесь — / *кабинет в Риге.* | Piesakieties — / *kabinets Rīgā.* | Book your visit — / *a studio in Riga.* |
| `v2.mobileBar` | Записаться · от {p} € | Pierakstīties · no {p} € | Book · from {p} € |
| `v2.call` | Позвонить | Zvanīt | Call |
| `v2.colophon` | Колофон | Kolofons | Colophon |

In the table, `*…*` marks the italic line.

---

## 8. Data helpers

- **`minPrice(cat)`:** parse every `treatments[].price` with `/(\d+(?:[.,]\d+)?)/` (handles «от 110 €», «65 €») and return the minimum integer. If nothing parses, the row shows no price; it never shows «от 0 €».

  Current values:

  | Category | Min price |
  |---|---|
  | skincare | 60 |
  | peels | 40 |
  | mesotherapy | 65 |
  | biorevitalization | 120 |
  | biostimulation | 120 |
  | complex | 120 |
  | consultation | 40 |
  | all categories | 40 |

- **`formatFrom(p)`:** `t('v2.price.from').replace('{p}', p)` with a non-breaking space before «€».
- **`sanitizeName(name)`:** remove any parenthetical containing `ботокс|botox|botoks` (case-insensitive). Example: «RRS Skin Relax (аналог ботокса)» → «RRS Skin Relax». Ask the owner to rename it in the CMS as well.
- **`useNextSlot()`:**
  - one-time `getDocs(query(collection(db,'slots'), where('date','>=', todayRiga), orderBy('date'), limit(60)))`;
  - client-side filter `isAvailable === true`, drop today's slots whose `time` has passed (Europe/Riga), sort by `date + time`, take the first;
  - format the date with `Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Riga' })`.
  - It uses only single-field indexes (no new composite index). Reads are public per `firestore.rules`.
  - Add `getNextAvailableSlot()` to `src/lib/slots.ts`.
- **`heroChapters.ts`:** `[{ n: 1, id: 'skincare', start: 3.90 }, { n: 2, id: 'peels', start: 7.10 }, { n: 3, id: 'mesotherapy', start: 10.30 }, { n: 4, id: 'biorevitalization', start: 13.50 }, { n: 5, id: 'biostimulation', start: 16.70 }, { n: 6, id: 'complex', start: 19.90 }, { n: 7, id: 'consultation', start: 25.60 }]`, plus `RECAP = [23.10, 25.60]`, `CTA_PILL_T = 26.95` and `DURATION = 31`.
- **`scripts/v2-images.ts`** (sharp) generates `public/media/v2/`:
  - from the face master (MOTION.md §2): `face-clear-{640,960,1280}.{avif,webp}` (alpha);
  - `zone-{categoryId}-{320,640}` and `crop-{oval,cheek,glow}-960`;
  - `forehead-{before,after}-1200`;
  - `grain-256.png`.

---

## 9. Accessibility requirements

- **WCAG 2.2 AA.** Every text and background pair comes from §3.1. Text over a photo sits only on paper slips.
- **Landmarks:** `header`, `nav` (`aria-label` «Основное меню»), `main`, `footer`. One `h1`. Section headings are `h2` in order.
- **Moving content:** the film has a visible, keyboard-reachable pause toggle at all times (2.2.2). There are no marquees, no auto-rotating content and no infinite page animations.
- **Text alternative for the film:** the chapter index (§5.2.1). The player is `aria-hidden="true"` inside a `<figure>` whose `<figcaption>` (visually the caption line) references the index with `aria-describedby`.
- **Reduced motion:** honoured everywhere (§5 fallbacks). `MotionConfig reducedMotion="user"`, `useReducedMotion()` gates every custom JS effect, and `@media (prefers-reduced-motion: reduce)` turns off CSS transitions in `v2.css`.
- **Keyboard:** all controls are reachable and visible on focus (`--v2-focus`). Focus rings follow organic radii (the `border-radius` is inherited). Tablist, slider, accordion and menu follow the WAI-ARIA APG patterns.
- **Handwriting** (Bad Script) is always decorative (`aria-hidden`) or duplicated in plain text. It never carries a price, a name used as information or a procedure.
- **Language:** `html[lang]` is updated. `lang` attributes are set on any mixed-language fragment, such as Latin brand names inside Russian text where pronunciation matters (optional).
- **Images:**
  - The cut-out face has `alt="Модель — иллюстрация"`.
  - Zone thumbnails and decorative prints are `alt=""`.
  - Works use the CMS `title` as alt.
  - Slider images: «до (иллюстрация)» / «после (иллюстрация)».
- **Targets** are ≥ 44 × 44 px. Information is never available on hover only.
- **Zoom:** at 200 % zoom and at 360 px width the layout keeps a single column with no clipping or overlap of text.

---

## 10. Performance requirements

**Budgets** (p75, mid-range Android on 4G, measured on `/v2`):

| Metric | Budget |
|---|---|
| LCP | ≤ 2.5 s (target 2.0) |
| CLS | ≤ 0.02 |
| INP | ≤ 200 ms |
| Route chunk JS (v2 code, excluding the shared react, motion and firebase chunks) | ≤ 120 KB gz |
| Player library | loaded after `load` + idle only |
| Poster | AVIF 540 ≤ 35 KB, 810 ≤ 60 KB, 1080 ≤ 90 KB |
| Face cut-out | `face-clear-960.avif` ≤ 70 KB |
| Fonts total | ≤ 320 KB, with only the display roman (≤ 140 KB) preloaded |
| Web MP4 (720×900) | ≤ 3 MB |
| Live composition transfer | ≤ 1.3 MB |

Rules:

- **Animate only** `transform`, `opacity`, `clip-path` and CSS custom properties. The exceptions are the price-row `font-variation-settings` hover, the single Spread B wdth swell and the accordion `grid-template-rows`.
- **`will-change`** is set only while an interaction runs.
- **No** live SVG filters, `backdrop-filter`, scroll-linked `font-variation-settings`, scroll-linked SVG `d` animation, animated clip-path on the player container, or idle "breathing" border-radius loops.
- **`content-visibility: auto`** with `contain-intrinsic-size` on every section below the cover.
- **Images:** `<picture>` AVIF+WebP with `sizes`. Everything below the fold is `loading="lazy"` and `decoding="async"`, with width and height set.
- **Fonts:** self-hosted subsets only. **Move the Montserrat `@import` out of `src/index.css`** into a `<link rel="stylesheet">` that the public layout (`App.tsx` public route) injects once, so `/v2` makes no request to fonts.googleapis.com.
- **Film:** the player is paused off-screen and in hidden tabs, `low-power-idle` is on, and MP4 mode covers coarse pointers, Save-Data, slow networks and low memory (§6.2).
- **QA:** Lighthouse mobile ≥ 90 for Performance, ≥ 100 for Accessibility. Profile once on a real mid-range Android: no long task over 200 ms after load.

---

## 11. Do not

1. Do not use glassmorphism: no `backdrop-filter`, frosted pills, gel plates or a glass capsule header (old `/v2`).
2. Do not use aurora or time-of-day themes, BreathButton, or idle breathing or looping blob morphs on page chrome. Blobs morph only on hover or focus, and inside the film.
3. Do not use navy and gold, medical white, symmetric card grids, a stats row, or a centred video hero (`/v3`).
4. Do not dress card grids with blob radii and call them anti-grid. Use the staircase and drift rules.
5. Do not use cursor followers, magnetic buttons, marquee or ticker bands, orbiting sticker rings, liquid-fill CTAs, or a 300vh scrollytelling section.
6. Do not use Unbounded, Montserrat, Inter, Playfair, Cormorant, Fraunces or Instrument Serif, and make no Google Fonts requests from `/v2`.
7. Do not split Russian words into syllable chips with dashes (e.g. «БИО— / РЕВИТА— / ЛИЗАЦИЯ»). Use condensed widths, soft hyphens and authored lines.
8. Do not use unverified stats or claims: no «8+ лет», «5000+ клиентов», «200+», «98%» or «5 лет», and no absolute claims («мгновенно», «навсегда», «за 1 визит», «без реабилитации»). Never show the word «ботокс» or «аналог ботокса».
9. Do not use `bef_after_video.mp4`, `after.jpeg` or the `hf_…jpeg` annotated image. Do not wipe or crossfade the full face between `before.jpeg` and `before1.jpeg`; they differ at the lips and jaw. Forehead crops only, always labelled «иллюстрация».
10. Do not use red pencil to mark "flaws" on a face. Strokes are zone maps, arrows and underlines that frame care.
11. Do not let Bad Script carry prices, procedure names or essential information. At most 1 handwritten note per viewport, ≤ 3 words.
12. Do not rotate serif headlines, body text, buttons or prices. Do not tilt any information-bearing element more than ±3°.
13. Do not put mono labels that carry information below 14 px (decorative folios 13 px minimum), or prices below 15 px.
14. Do not change the DOM order to create layout. No CSS `order`, no reversed grids.
15. Do not put files under `public/v2/`. Do not set `sandbox-origin` on the player. Do not load the HyperFrames runtime or GSAP from a CDN.
16. Do not show a poster that differs from film frame 0. Do not autoplay under reduced motion. Do not ship the film without a visible pause control.
17. Do not leave the mobile first screen without a booking action. Do not let the sticky bar cover footer links.

---

## 12. Acceptance checklist

- [ ] `/v2` renders at 360, 390, 768, 1024, 1440 and 1920 with zero horizontal scroll, and the DOM order matches the visual reading order.
- [ ] H1 = «Эстетическая косметология в Риге». The trust line and reg. № come from the CMS. No stats anywhere.
- [ ] The poster equals film frame 0. LCP ≤ 2.5 s on throttled mobile. No CLS when the player, prices, slot chip or fonts load.
- [ ] The chapter index seeks the film in both live and MP4 modes. The current row is highlighted. The cover pill pulses once at 26.95 s when visible.
- [ ] Reduced motion: no autoplay, the face-map still, static reveals, and pencil paths pre-drawn.
- [ ] Prices everywhere come from `useServices()` with fallback. The film's baked prices match `minPrice()` (checked by the build script).
- [ ] The atlas tablist, slider, accordion and menu pass keyboard-only and screen-reader smoke tests (VoiceOver iOS, NVDA).
- [ ] Network panel on `/v2`: no requests to fonts.googleapis.com or cdn.jsdelivr.net.
- [ ] RU, LV and EN render without clipping diacritics (`Ķīpsalas ielā, Rīgā — ģimenes šūnu žāvēšana`).
