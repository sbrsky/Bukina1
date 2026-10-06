# SKINLAB /v2 hero film: HyperFrames composition spec

Status: final spec. Implement it as written.
Companion: [`DESIGN.md`](./DESIGN.md) covers the page this film sits in, the shared tokens, and the player integration (§6 there).
Grounded in the HyperFrames 0.8.134 contract: `hyperframes-core`, `hyperframes-animation` rules, `hyperframes-keyframes`, and `hyperframes-registry`. Every registry item named below exists in the 0.8.134 catalog.

---

## 0. Summary

| Property | Value |
|---|---|
| Composition id | `skinlab-hero` (30 s+ site/ad film). Paid cut: `skinlab-hero-15` (§12). |
| Canvas | **1080 × 1350** (4:5 portrait). Desktop hero beside the H1; full-width on mobile; Instagram/Meta feed creative. |
| fps / duration | **30 fps / 31.00 s = 930 frames.** Frame 930 is frame 0 of the next loop. |
| Loop | Seamless. The last rendered frame (t = 30.967) equals frame 0 (§10). |
| Audio | None. Silent by design; the player is `muted audio-locked`. |
| Language | RU primary. LV and EN come from the same file via the `lang` variable. |
| Cuts | **Site cut** (illustrative acne beat, product names) for the web. **Ad-safe cut** (`showBeforeAfter=false`, `showBrands=false`) for paid social. |
| Structure | Monolithic composition. The face/camera layer persists across all scenes, and a sub-composition timeline cannot animate host elements. Scenes are built by functions in `scenes.js`, which the 15 s cut reuses. |
| Outputs | Live web entries `index.{ru,lv,en}.html`; MP4s; posters (frame 0, and the face-map frame at 24.50 s). |

**One-line story.** The face is seen only through the word «КОЖА», with the benefit, the offer and the city on frame 0. The word opens onto the face. Six chapters each mark one facial zone in red pencil, show a visible positive change and give the price. The whole face map lights up («7 направлений. Один кабинет.»). The film closes on «Начните с консультации · онлайн — 40 €» → Анастасия Букина, косметолог в Риге → «Записаться онлайн →», with a pressed button. It then folds back into the word.

---

## 1. Project layout and pipeline

```
videos/skinlab-hero/                 ← HyperFrames project (never `hyperframes init` in the repo root)
  hyperframes.json
  index.html                         ← 31 s composition (root data-duration="31")
  cut15.html                         ← 15 s paid cut (root data-duration="15")
  scenes.js                          ← CHAPTERS, POSES, TOKENS, COPY, scene builder functions
  compositions/components/           ← registry installs (§11)
  assets/
    face-clear.webp                  ← master cut-out, 1560×1937, alpha (§2)
    forehead-acne.webp               ← forehead-only patch, same geometry (§2)
    grain-256.png
    fonts/*.woff2                    ← copied from public/fonts/v2 by the build
    vendor/gsap.min.js               ← gsap 3.14.x, self-hosted
  source/                            ← 2× upscaled masters + alpha (lossless WebP, committed)
  vars/site-{ru,lv,en}.json  vars/ad-{ru,lv,en}.json
  renders/                           ← delivery MP4s (ad renders stay here, not deployed)
scripts/hf-hero-build.ts             ← prices → vars, emits web entry files, copies to public/
scripts/hf-hero-render.ts            ← renders, transcodes, extracts posters
public/hf/skinlab-hero/              ← deployed: index.{lang}.html, assets/, posters/, renders/
public/hf/vendor/hyperframe.runtime.iife.js  ← from node_modules/@hyperframes/core/dist
```

**Why `public/hf/`, not `public/v2/`.** Firebase Hosting applies the `** → /index.html` rewrite only when no file or directory exists at the requested path. A `dist/v2/` folder would break direct loads of `/v2`.

### 1.1 What `hf-hero-build.ts` does (run with `tsx`)

1. **Read prices.** Source: the Firestore `services` collection, using the app's Firebase config from `VITE_*` env vars. If that fails, fall back to `src/data/servicesData.ts`. Compute each `minPrice` with the same parser as the page (DESIGN.md §8).
2. **Write variable files** `vars/{site,ad}-{lang}.json` (§5).
3. **Emit `public/hf/skinlab-hero/index.{lang}.html`.** Each one is a copy of `index.html` with:
   - the `default` values of `lang` and every price in `data-composition-variables` rewritten;
   - `@font-face` URLs rewritten from `assets/fonts/…` to `/fonts/v2/…`, so the cache is shared with the page;
   - the site-cut defaults.
   
   The root `data-duration` is never rewritten.
4. **Copy files:** `assets/` to `public/hf/skinlab-hero/assets/` (fonts excluded), and the runtime IIFE to `public/hf/vendor/`.
5. **Assert** that `CHAPTERS` in `scenes.js` equals `src/pages/v2/data/heroChapters.ts`. The build fails on any mismatch.

**Runtime and GSAP are never loaded from a CDN.**

- The composition loads `assets/vendor/gsap.min.js`.
- The page player sets `runtime-src="/hf/vendor/hyperframe.runtime.iife.js"`. Without it, the player would inject the runtime from jsdelivr.
- The composition HTML stays CLI-clean, with no runtime tag of its own.

---

## 2. Assets

| File | Derived from | Steps | Budget |
|---|---|---|---|
| `source/before1@2x.webp` | `public/before1.jpeg` (1031×1280, clean face) | 2× AI upscale (Real-ESRGAN `realesrgan-x4plus`, `-s 2`) → 2062×2560, lossless WebP | — |
| `source/before@2x.webp` | `public/before.jpeg` (same face with forehead acne) | Same model and settings | — |
| `source/face-alpha@2x.png` | `before1@2x` | `npx hyperframes remove-background source/before1@2x.png -o source/face-alpha@2x.png`. **One alpha for both layers**, so the edges match. | — |
| `assets/face-clear.webp` | `before1@2x` + alpha | Apply the alpha, Lanczos resize to **1560×1937**, WebP q84 with alpha. Displayed at 1000×1242 at rest (§4.3). At max camera scale 1.5 that is about 1.04 master px per canvas px, so it stays crisp. | ≤ 350 KB |
| `assets/forehead-acne.webp` | `before@2x` × face alpha × a feathered ellipse (source px centre (518, 378), radii (150, 112), feather 36) | Same 1560×1937 geometry; transparent outside the forehead. `before.jpeg` and `before1.jpeg` are pixel-aligned only in this band; they differ at the lips, jaw and under-eyes. | ≤ 60 KB |
| `assets/grain-256.png` | — | Pre-rendered 256 px noise tile, the same file as the page's | ≈ 6 KB |
| `assets/fonts/*.woff2` | `public/fonts/v2/` | The 5 subsets from DESIGN.md §3.2 | ≤ 320 KB total |
| `assets/vendor/gsap.min.js` | `node_modules/gsap/dist` | gsap 3.14.x. **No plugins**: no MorphSVG, DrawSVG or MotionPath. Path draw uses `strokeDashoffset`. | ≈ 72 KB |

**Acne spot list.** Measure the 11 most visible acne spots on `public/before.jpeg` in source px and store them as `ACNE_SPOTS` in `scenes.js`. The cluster lies inside x 400–650, y 280–470.

**Public assets deliberately NOT used:**

- `after.jpeg` and `hf_20260410_…jpeg`: English annotation labels and a cold clinic background.
- `image (1) — крупный размер.jpeg`: a byte-identical duplicate of `before1.jpeg`.
- `bef_after_video.mp4`: a full-face AI transformation that also changes the lips and jaw, so it would imply false contouring.

The cut-out removes the blue-white stock clinic background, which conflicts with the warm palette and echoes `/v3`.

---

## 3. Palette and fonts (identical to the page)

| Token | Hex | Film use |
|---|---|---|
| `--v2-paper` | `#F4EDE6` | Canvas background on a full-bleed **child** element, never on the root. Paper slips. Must equal the page background exactly. |
| `--v2-oat` | `#E9DDD1` | Clippings, tape (70 %), the loupe field |
| `--v2-ink` | `#1E1618` | All text on slips (15.3:1 on paper), CTA pill fill |
| `--v2-ink-60` | `#5E4F52` | «иллюстрация» label, empty rail pips |
| `--v2-blush` | `#E3BBBC` | The organic field/blob, cells, ghost fills |
| `--v2-rouge` | `#B23A2E` | Pencil strokes, numbers, counter, offer and price chips (glaze text 5.64:1), handwriting |
| `--v2-plum` | `#3A2228` | PDRN strand, coloured shadows |
| `--v2-glaze` | `#FFF8F2` | Light bands, glints, gloss, text on rouge and ink |

Fonts are declared in-file with `@font-face` pointing at `assets/fonts/*.woff2`, which satisfies lint `font_family_without_font_face`:

| Family | Settings in the film |
|---|---|
| **Noto Serif Display** | Hook word: wght 900, wdth 62.5. Titles: roman wght 380 / italic 340, wdth 72. Name: wght 400, wdth 80. |
| **Martian Mono** | Kickers, method lines, prices, counter: wdth 75, wght 500–600, `tabular-nums` |
| **Onest** | 600: CTA pill and clippings |
| **Bad Script** | 400: the single handwritten aside «жду вас». It overrides `--hw-font-print` and `--hw-font-script` of the hw-* components, which ship Latin-only Caveat. |

The timeline is built inside `document.fonts.ready.then(…)` **and** after `await img.decode()` for both face images. Register `window.__timelines["skinlab-hero"] = tl` as the **last** statement of that callback.

---

## 4. Canvas geometry

### 4.1 Layer stack (bottom → top)

| z | Id | Contents | Notes |
|---|---|---|---|
| 0 | `#paper` | full-bleed `--v2-paper` | child of root |
| 1 | `#field` | full-bleed `--v2-blush`, shaped only by `clip-path: inset(T R B L round h1 h2 h3 h4 / v1 v2 v3 v4)` in **px** | the organic frame; morphs per chapter (card-morph-anchor) |
| 2 | `#camera` | `transform-origin: 0 0`. Contains: `img#face` (face-clear.webp at left 170, top 150, 1000×1242); `img#acne` (same box, site cut only); `#glaze` (a face-masked soft-light layer, `mask-image: url(assets/face-clear.webp)` on the same box); the gloss and bloom ellipses; `svg#marks` (viewBox 0 0 1080 1350, rest canvas space: zone dots, pencil marks, arcs, arrows); the lenses for C2, C4, C5 | Everything here is authored in **rest coordinates** and moves with the camera |
| 3 | `#copy` | one `.clip` group per scene, with `data-start` / `data-duration` = the scene window: slips, chips, clippings, CTA | canvas space; text never scales with the camera |
| 4 | `#chrome` | folio slip «SKINLAB» at (110, 40); rail slip (7 shape pips plus the «0N / 07» counter), right-aligned to x 1008, y 40–92 | hidden during the hook and the return |
| 5 | `#hook` | inline `<svg viewBox="0 0 1080 1350">`: an opaque paper `<rect>`, plus `<g mask="url(#hookMask)">` holding a blush `<rect>`, an `<image href="assets/face-clear.webp" x=170 y=150 width=1000 height=1242>` and the light band. Above the SVG, HTML: kicker, rouge comma, italic benefit line, offer chip. | covers everything while visible |
| 6 | `#grain` | `grain-256.png` tile, opacity .04, `mix-blend-mode: multiply`, static | top-most; identical in every frame |

The `#hook` wrapper is shown and hidden by `tl.set(child, {opacity})` on an inner wrapper, never on a `.clip`. Persistent layers are not clips.

### 4.2 Safe areas

| Zone | Rule |
|---|---|
| **Left quiet gutter, x 0–110** | **Never contains copy.** On desktop the page's H1 may overhang it (DESIGN.md §5.2). Decorative strokes may enter it no closer than 72 px to the edge. |
| **Feather band** (outer 64 px; the page fades it) | No copy or critical marks. |
| **Copy area** | x 110–1008, y 40–1286 |
| **Text over the photo** | Only on an opaque paper slip (`--v2-paper`, padding 10 px 22 px, `box-shadow: 0 10px 30px rgb(30 22 24 / .14)`) or on a rouge/ink chip |
| **Exclusion boxes** | No copy, chip, lens or loupe may intersect the eye or lip boxes of the current pose (§4.4). |

### 4.3 Face placement and anchors

- The face image sits at **(170, 150)**, size **1000 × 1242**: 0.97 × the 1031 × 1280 source.
- Conversion: **canvas = (170 + 0.97·sx, 150 + 0.97·sy)**.
- Rest anchors (canvas px):

| Anchor | Canvas (rest) | Source px |
|---|---|---|
| Forehead centre | (670, 499) | (515, 360) |
| Eye L / R | (539, 677) / (781, 677) | (380, 543) / (630, 543) |
| Under-eye L / R | (539, 722) / (781, 722) | (380, 590) / (630, 590) |
| Cheekbone L / R | (519, 810) / (810, 810) | (360, 680) / (660, 680) |
| Nose tip | (665, 819) | (510, 690) |
| Lips centre | (663, 934) | (508, 808) |
| Jaw L / R | (466, 955) / (864, 955) | (305, 830) / (715, 830) |
| Chin | (665, 1072) | (510, 950) |

Verify every anchor on a `snapshot` with `debugBoxes=true` (§5) before building the marks.

### 4.4 Camera poses

A pose is `{ s, x, y }` applied to `#camera` (transform-origin 0 0). To land anchor (aₓ, a_y) on canvas target (tₓ, t_y): **x = tₓ − s·aₓ, y = t_y − s·a_y**. Maximum scale is **1.5** (the master is sized for it).

| Pose | Used in | s | x | y | Anchor → target | Eye L box | Eye R box | Lips box |
|---|---|---|---|---|---|---|---|---|
| **P0** rest | hook, S1, S8 | 1.00 | 0 | 0 | — | 459–619 × 639–715 | 701–861 × 639–715 | 553–773 × 884–984 |
| **P1** forehead | C1 | 1.45 | −271.5 | −253.6 | forehead → (700, 470) | 394–626 × 673–783 | 745–977 × 673–783 | 530–849 × 1028–1173 |
| **P2** peels | C2 | 1.00 → 1.04 push | 0 → −26.6 | 0 → −28.0 | push about the face centre (665, 700) | ≈ P0 | ≈ P0 | 549–777 × 891–995 (end) |
| **P3** eyes | C3 | 1.50 | −390 | −523 | under-eye mid (660, 722) → (600, 560) | 298–538 × 436–550 | 662–902 × 436–550 | 440–770 × 803–953 |
| **P4** cheek and lips | C4 | 1.30 | −315.5 | −491 | (735, 870) → (640, 640) | 281–489 × 340–438 | 596–804 × 340–438 | 403–689 × 658–788 |
| **P5** oval | C5 | 1.15 | −164.75 | −318.25 | jaw mid (665, 955) → (600, 780) | 363–547 × 417–504 | 641–825 × 417–504 | 471–724 × 698–813 |
| **P6** complex | C6 | 1.00 → 1.06 push | 0 → −39.9 | 0 → −45.6 | push about (665, 760) | ≈ P0 | ≈ P0 | 546–779 × 891–997 (end) |
| **P8** CTA | C7 | 0.86 | 188.1 | 106.4 | face centre (665, 760) → (760, 760) | 583–720 × 656–721 | 791–929 × 656–721 | 664–853 × 867–953 |

Box format is x-range × y-range in canvas px. Each eye box is centre ±(80, 38) and the lips box is centre ±(110, 50), at rest, transformed by the pose.

### 4.5 The organic field (`#field`)

- **Boxes** (inset T R B L, px):

| Box | Inset | Canvas extent | Used in |
|---|---|---|---|
| FULL | `0 0 0 0` | full canvas | hook swap |
| HERO | `240 10 50 230` | x 230–1070, y 240–1300 | S1–C4, C6, S8 |
| NARROW | `240 40 50 260` | — | C5 |
| CTA | `300 0 40 380` | x 380–1080, y 300–1310 | C7 |

- **Radii:** the category tokens from DESIGN.md §3.4, converted to px at setup with `radiiPx(token, boxW, boxH)`: horizontal % × box width, vertical % × box height.
  - Example: `hero` on 840 × 1060 → `453.6 386.4 352.8 487.2 / 508.8 593.6 466.4 551.2`.
  - FULL uses `0 0 0 0 / 0 0 0 0`.
- **Every `clip-path` string keeps the identical structure and px units**, so GSAP interpolates it.
- Tokens per scene:
  - hook = FULL
  - S1 = hero
  - C1 petal · C2 lens · C3 drop · C4 pebble · C5 cell (NARROW) · C6 cloud
  - S8 hero
  - C7 seed (CTA box)
  - S10 = FULL

---

## 5. Variables and copy

### 5.1 Variables

Declared on `<html data-composition-variables='…'>`, read once at init with `window.__hyperframes.getVariables()`:

```json
[
  {"id":"lang","type":"enum","label":"Language","default":"ru","options":[{"value":"ru","label":"RU"},{"value":"lv","label":"LV"},{"value":"en","label":"EN"}]},
  {"id":"showBeforeAfter","type":"boolean","label":"Site cut: forehead acne illustration","default":true},
  {"id":"showBrands","type":"boolean","label":"Show product brand names","default":true},
  {"id":"debugBoxes","type":"boolean","label":"Overlay eye/lip exclusion boxes","default":false},
  {"id":"p_offer","type":"number","label":"Lowest price €","default":40},
  {"id":"p_skincare","type":"number","label":"Уход от €","default":60},
  {"id":"p_peels","type":"number","label":"Пилинги от €","default":40},
  {"id":"p_meso","type":"number","label":"Мезотерапия от €","default":65},
  {"id":"p_biorev","type":"number","label":"Биоревитализация от €","default":120},
  {"id":"p_biostim","type":"number","label":"Биостимуляция от €","default":120},
  {"id":"p_complex","type":"number","label":"Комплексные от €","default":120},
  {"id":"p_consult_online","type":"number","label":"Консультация онлайн €","default":40}
]
```

- `vars/site-{lang}.json`: `{ lang, showBeforeAfter: true, showBrands: true, …prices }`.
- `vars/ad-{lang}.json`: `{ lang, showBeforeAfter: false, showBrands: false, …prices }`.

### 5.2 Copy dictionary (`COPY` in `scenes.js`)

- RU is final. LV and EN need native review before rendering.
- `/` marks an authored line break. Each line is its own slip.
- Titles are fitted once at setup with `window.__hyperframes.fitTextFontSize(line, { maxWidth: 780, fontFamily, fontWeight })`, clamped to **96–112 px**. If a line still does not fit at 96 px, the copy must be shortened; it is never wrapped automatically.

| Key | RU (exact) | LV | EN |
|---|---|---|---|
| hook.kicker | SKINLAB · КОСМЕТОЛОГ · РИГА | SKINLAB · KOSMETOLOĢE · RĪGA | SKINLAB · COSMETOLOGIST · RIGA |
| hook.word (mask) | КОЖА | ĀDA | SKIN |
| hook.line | которую хочется трогать | kurai gribas pieskarties | you want to touch |
| hook.chip | 7 направлений · от {p_offer} € | 7 virzieni · no {p_offer} € | 7 treatment areas · from {p_offer} € |
| folio | SKINLAB | SKINLAB | SKINLAB |
| c1.kicker | 01 · УХОД И ЧИСТКИ | 01 · KOPŠANA UN TĪRĪŠANA | 01 · CARE & CLEANSING |
| c1.title | Чистая / кожа | Tīra / āda | Clear / skin |
| c1.method (brands / generic) | Anti Acne · чистка · Dermapen / Anti Acne · чистка · микронидлинг | Anti Acne · tīrīšana · Dermapen / Anti Acne · tīrīšana · mikroadatošana | Anti Acne · cleansing · Dermapen / Anti Acne · cleansing · microneedling |
| c1.price | от {p_skincare} € | no {p_skincare} € | from {p_skincare} € |
| c1.label (site cut) | иллюстрация | ilustrācija | illustration |
| c2.kicker | 02 · ПИЛИНГИ | 02 · PĪLINGI | 02 · PEELS |
| c2.title | Ровный / тон | Vienmērīgs / tonis | Even / tone |
| c2.method | сияние · anti pigment · BioRePeel / сияние · anti age · anti pigment | mirdzums · anti pigment · BioRePeel / mirdzums · anti age · anti pigment | radiance · anti-pigment · BioRePeel / radiance · anti-age · anti-pigment |
| c2.price | от {p_peels} € | no {p_peels} € | from {p_peels} € |
| c3.kicker | 03 · МЕЗОТЕРАПИЯ | 03 · MEZOTERAPIJA | 03 · MESOTHERAPY |
| c3.title | Свежий / взгляд | Svaigs / skatiens | Fresh / eyes |
| c3.method | RRS HA Eyes · волосы · тело / глаза · волосы · тело | RRS HA Eyes · mati · ķermenis / acis · mati · ķermenis | RRS HA Eyes · hair · body / eyes · hair · body |
| c3.price | от {p_meso} € | no {p_meso} € | from {p_meso} € |
| c4.kicker | 04 · БИОРЕВИТАЛИЗАЦИЯ | 04 · BIOREVITALIZĀCIJA | 04 · BIOREVITALIZATION |
| c4.title | Увлажнение / изнутри | Mitrinājums / no iekšpuses | Hydration / from within |
| c4.method | Neauvia · Stylage · без объёма / лицо · губы · без объёма | Neauvia · Stylage · bez apjoma / seja · lūpas · bez apjoma | Neauvia · Stylage · no added volume / face · lips · no added volume |
| c4.price | от {p_biorev} € | no {p_biorev} € | from {p_biorev} € |
| c5.kicker | 05 · БИОСТИМУЛЯЦИЯ | 05 · BIOSTIMULĀCIJA | 05 · BIOSTIMULATION |
| c5.title | Упругий / овал | Stingrs / ovāls | Firm / contour |
| c5.method | Plinest ПДРН · свой коллаген / полинуклеотиды · свой коллаген | Plinest PDRN · savs kolagēns / polinukleotīdi · savs kolagēns | Plinest PDRN · your own collagen / polynucleotides · your own collagen |
| c5.price | от {p_biostim} € | no {p_biostim} € | from {p_biostim} € |
| c6.kicker | 06 · КОМПЛЕКСНЫЕ ПРОГРАММЫ | 06 · KOMPLEKSĀS PROGRAMMAS | 06 · SIGNATURE PROGRAMMES |
| c6.title | Сияние / к событию | Mirdzums / svētkiem | Glow / for the occasion |
| c6.clippings | пилинг · мезо · маска (joined by rouge «+») | pīlings · mezo · maska | peel · meso · mask |
| c6.price | от {p_complex} € | no {p_complex} € | from {p_complex} € |
| recap | 7 направлений. / Один кабинет. | 7 virzieni. / Viens kabinets. | 7 treatment areas. / One studio. |
| c7.title | Начните / с консультации | Sāciet / ar konsultāciju | Start / with a consultation |
| c7.price | онлайн — {p_consult_online} € | tiešsaistē — {p_consult_online} € | online — {p_consult_online} € |
| c7.name | Анастасия / Букина | Anastasija / Bukina | Anastasia / Bukina |
| c7.role | косметолог в Риге | kosmetoloģe Rīgā | cosmetologist in Riga |
| c7.hand | жду вас | gaidu jūs | see you soon |
| c7.pill | Записаться онлайн → | Pierakstīties tiešsaistē → | Book online → |

`showBrands=false` selects the second (generic) method line. Product brand names (Dermapen, BioRePeel, RRS, Neauvia, Stylage, Plinest) appear **only** in the site cut. «Anti Acne», «GLOW EFFECT» and «ANTI POSTACNE» are the owner's own programme names. The words «ботокс» and «аналог ботокса» never appear in any cut.

---

## 6. Chapter template

C1–C6 last **3.20 s** each. T is the chapter start.

| Window | What happens | Rule / registry |
|---|---|---|
| T+0.00–0.70 | Camera moves to the chapter pose (ease per chapter, §7). `#field` morphs to the category token (0.9 s `sine.inOut`). The counter rolls to «0N / 07» (0.45 s). Rail pip *n* fills rouge (0.35 s `back.out(2)`). Zone dot *n* → opacity 1. | coordinate-target-zoom, card-morph-anchor, vertical-spring-ticker, spring-pop-entrance |
| T+0.10–0.45 | Kicker slip reveal: `clipPath inset(0 100% 0 0) → inset(0 0% 0 0)`, `power3.out` | — |
| T+0.25–0.80 | Title entrance, a **different verb per chapter** (§7) | — |
| T+0.45–1.65 | The chapter's **signature visual verb** on the face | per chapter |
| T+0.70–1.15 | Price slip reveal (0.25 s), then digits roll 00 → value (0.45 s) | number-wheel |
| T+0.85–1.15 | Method slip: `opacity 0→1, y 12→0`, `power2.out` 0.3 s | — |
| T+1.15–2.85 | **Hold.** All text is static. Only one ambient motion runs (named per chapter). | — |
| T+2.85–3.15 | Exit, 0.30 s, `*.in` eases (always faster than the entrance). The chapter's pencil mark dims to 0.22. Zone dot → 0.3. | — |
| T+3.15–3.20 | Rest | — |

**Reading budget per chapter:** at most **4 readable items** (kicker, title, price, method line). Fully legible windows:

| Item | Legible from → to | Time |
|---|---|---|
| Kicker | T+0.45 → 2.85 | 2.4 s |
| Title | T+0.80 → 2.85 | 2.05 s |
| Price and method | T+1.15 → 2.85 | 1.7 s each |

Every window meets the rule in §9.

### 6.1 Copy clusters

Positions are canvas px (top-left of each slip, `x = 110`).

| Cluster | Kicker slip | Title slip 1 | Title slip 2 | Method slip | Price slip |
|---|---|---|---|---|---|
| **TOP** | y 108–166 | y 172–294 | y 300–422 | — | — |
| **BOTTOM** | y 910–968 | y 976–1098 | y 1104–1226 | y 1234–1286 | — |
| **PRICE-TR** | — | — | — | — | right-aligned to x 1008, y 112–196 |
| **PRICE-BL** | — | — | — | — | y 1140–1224 |
| **METHOD-B** | — | — | — | y 1234–1286 | — |

Sizes:

| Element | Font | Size |
|---|---|---|
| Kicker | Martian Mono 500, wdth 75, uppercase, tracking .1em | 44 px |
| Title line 1 | NSD roman 380, wdth 72 | 96–112 px |
| Title line 2 | NSD italic 340, wdth 72 | 96–112 px |
| Price | Martian Mono 600 | 64 px |
| Method | Martian Mono 500, wdth 75 | 38 px |

Slip tilts: kicker 0°, title slips −1.2° / +0.8°, price −1.5°. All tilts are ≤ ±3°.

---

## 7. Scene-by-scene

### 7.1 Master table

| # | Time (s) | Scene | Visuals | On-screen copy (RU, exact) | Procedures shown | Motion technique |
|---|---|---|---|---|---|---|
| S0 | **0.00–3.00** | **Hook: «КОЖА»** | **Frame 0 is a finished cover:** paper, the face visible only through the giant word, the rouge kicker above, the italic benefit line below, the rouge offer chip. A glaze light band passes inside the letters (0.15–1.15). The chip pulses (1.40–1.80). Text exits (2.30–2.50). Push-through: the word scales about a stroke of «Ж» until it covers the frame (2.40–3.00). Invisible layer swap at 2.98. | SKINLAB · КОСМЕТОЛОГ · РИГА / КОЖА, / которую хочется трогать / 7 направлений · от 40 € | Brand, category, city; all 7 directions and the entry price | svg-mask-reveal (text as mask), light-sweep-pass inside the mask, press-release-spring pulse, `expo.in` scale with `svgOrigin`, `tl.set` swap |
| S1 | **3.00–3.90** | **The frame forms** | The full-bleed blush field contracts into the organic hero blob around the face (3.00–3.60). Folio «SKINLAB» and the 7-pip rail with «01 / 07» slip in. Six rouge zone dots pop on the face (forehead, left cheekbone, under-eye, right cheek, jaw, glabella), then 5 of them dim. | SKINLAB · 01 / 07 | All 6 facial zones previewed | card-morph-anchor (`clip-path` inset string), spring-pop-entrance, vertical-spring-ticker |
| C1 | **3.90–7.10** | **01 Уход и чистки: forehead** | P1 punch-in on the forehead. **Site cut:** the illustrative acne patch is visible; 11 feathered "clearing" holes open, one per spot, revealing clean skin (the healing reveal is confined to the forehead), with the «иллюстрация» label. **Ad cut:** no acne; a glaze light band sweeps the forehead. A rouge pencil arc is drawn along the hairline (the zone mark). | 01 · УХОД И ЧИСТКИ / Чистая / кожа / от 60 € / Anti Acne · чистка · Dermapen / иллюстрация | Anti Acne программа 60 €, Чистка лица 80 €, Микронидлинг Dermapen 90 € (Чистка спины, жидкие нити are in the category) | coordinate-target-zoom, CSS-var mask holes, svg-path-draw + hw-boil (calm), shared-axis-y title, number-wheel |
| C2 | **7.10–10.30** | **02 Пилинги: even tone** | Pull back to the full face with a slow push (1.00→1.04). A paper-bordered loupe (lens token) opens on the left: inside, an "acid wave" passes and 18 dull flakes lift away to a luminous layer. A pencil arrow links it to the left cheekbone, where 3 hatch strokes are drawn. A glaze band crosses the whole face and leaves it visibly brighter. The price is circled in pencil. | 02 · ПИЛИНГИ / Ровный / тон / сияние · anti pigment · BioRePeel / от 40 € | Пилинг для сияния 40 €, Anti age 50 €, Anti pigment 60 €, BioRePeel Cl3 70 € | multi-phase camera, letter-spacing collapse title, spring-pop loupe, particle-burst rule (seeded fixed pool), hw-arrow (gentle), light-sweep-pass, hw-callout-circle, number-wheel |
| C3 | **10.30–13.50** | **03 Мезотерапия: fresh eyes** | P3 punch-in on the eyes (s 1.5). Pencil arcs are drawn under both eyes; 5 micro-points pop along each arc (no needles). Then a soft brightening bloom lifts the under-eye area. | 03 · МЕЗОТЕРАПИЯ / Свежий / взгляд / от 65 € / RRS HA Eyes · волосы · тело | RRS HA Eyes 65 €, Plinest Eye 180 €; hair and body (RRS XL Hair, Apriline Cellbooster Hair, RRS HA Cellutrix) flagged | coordinate-target-zoom, masked slide-from-right title, svg-path-draw, spring-pop-entrance, ambient-glow-bloom, hw-boil |
| C4 | **13.50–16.70** | **04 Биоревитализация: hydration** | P4 glide to the cheek and lips. A blush droplet falls onto the right cheek, squashes, and opens a small organic lens (pebble token) where 7 dehydrated cells plump and round out; two ripple rings spread. A gloss highlight appears on the lips. **No scaling or magnifying of the lips.** At exit the lens folds into a pencil droplet outline. | 04 · БИОРЕВИТАЛИЗАЦИЯ / Увлажнение / изнутри / от 120 € / Neauvia · Stylage · без объёма | Биоревитализация губ 120 €, Stylage Hydro 150 €, Neauvia Hydro Deluxe 180 € | sine glide, per-letter waterfall title, physics-press-reaction (squash), ripple rings, border-radius token tween (crinkled → round), soft-light gloss, svg-path-draw |
| C5 | **16.70–19.90** | **05 Биостимуляция: firm contour** | P5 on the oval; the blush field narrows behind the head. A lens (cell token) on the right cheek: a PDRN double strand draws, then 8 wavy collagen fibres draw and straighten. Two pencil swoop arrows rise along both jawlines (lift). | 05 · БИОСТИМУЛЯЦИЯ / Упругий / овал / от 120 € / Plinest ПДРН · свой коллаген | Plinest (ПДРН) 190 €, RRS Long Lasting 200 €, RRS HA Hyalift 75 от 120 €, Xela Rederm 190 €, Meso-Wharton P199 / Meso-Xanthin F199 220 € | `expo.out` camera, depth-scatter-assemble title, svg-path-draw strands, wavy→straight crossfade, hw-arrow swoop (head-arrival stretch), card-morph-anchor |
| C6 | **19.90–23.10** | **06 Комплексные: glow for the occasion** | Back to the full face with a slow push (1.00→1.06). Three taped oat clippings fly in and stack («пилинг + мезо + маска»), a pencil bracket groups them, and an arrow points to the face. A glass-skin light sweep crosses the face; four glints pop on the cheekbones, nose bridge and nose tip. | 06 · КОМПЛЕКСНЫЕ ПРОГРАММЫ / Сияние / к событию / пилинг + мезо + маска / от 120 € | GLOW EFFECT 140 €, ANTI POSTACNE 120 €, ANTI POSTACNE 2.0 210 € | kinetic-beat-slam (soft), spring entrance with tape (freeze-frame-dressing look), hw-underline (bracket), hw-arrow, light-sweep-pass, spring-pop glints |
| S8 | **23.10–25.60** | **Recap: the face, fully mapped** | Camera back to P0; field back to the hero token. All six pencil marks re-light from 0.22 to 1 in chapter order. Numbered markers 1–6 pop beside each zone. Headline on slips. **Hold 23.90–25.35 (poster-map frame = 24.50).** | 7 направлений. / Один кабинет. | Recap of all categories on the face map | coordinate-target-zoom, staggered opacity re-light (pure function of t), spring-pop-entrance, waterfall-entry |
| C7 | **25.60–29.95** | **07 Консультация + CTA** | The face steps back and right (P8); the field becomes the seed token at the CTA box; the counter shows «07 / 07» and the rail is complete. Title, then the rouge price chip, then the name and role, then the handwritten «жду вас», then the ink CTA pill. A touch dot arrives and **presses** the pill (ripples). **Still hold 27.70–29.95 (2.25 s).** | Начните / с консультации / онлайн — 40 € / Анастасия / Букина / косметолог в Риге / жду вас / Записаться онлайн → | Консультация ONLINE 40 € (Первый визит без процедуры 50 € and с процедурой 80 € are on the page) | power2 camera, shared-axis-y title, number-wheel, hw-path-text technique (Bad Script override), spring-pop pill, press-ripple (touch dot instead of cursor) + cursor-click-ripple + press-release-spring |
| S10 | **29.95–31.00** | **Return to the cover word** | All copy and chrome exit; the camera returns to P0 and the field expands to full-bleed blush; invisible swap to the hook at 30.45; the «КОЖА» mask contracts from full coverage to its rest size (`expo.out`), so paper reappears outside the letters; the kicker, line and chip return. Frame 30.967 = frame 0. | SKINLAB · КОСМЕТОЛОГ · РИГА / КОЖА, / которую хочется трогать / 7 направлений · от 40 € | — | mirrored push-through (`expo.out` vs the hook's `expo.in`), card-morph-anchor to FULL, `tl.set` swap |

### 7.2 Detailed beats

All times are absolute seconds. All tweens are `fromTo` with absolute values.

#### S0 Hook (0.00–3.00)

**Static layout at frame 0:**

- **Kicker:** Martian Mono 500 wdth 75, 44 px, rouge, tracking .12em, at x 120, y 296–340, directly on paper.
- **Word «КОЖА»:** an SVG `<text>` inside `<mask id="hookMask">`, white on a black mask rect. NSD wght 900, wdth 62.5, baseline **y 900**, x 120. Font size fitted once so the word spans **x 120–980** (expected ≈ 470–520 px). The highest glyph extent must stay ≥ 28 px below the kicker; for LV «ĀDA», check the macron.
- **Comma:** an HTML glyph «,» in NSD 900 rouge at 0.6 × the word size, sitting on the baseline right after «А», ending ≤ x 1008.
- **Benefit line:** NSD italic wght 300, wdth 80, ink, x 120, baseline y 1010. Size fitted to max width 888, between 64 and 84 px.
- **Offer chip:** a rouge pill with glaze text, Martian Mono 600 wdth 75, 44 px, padding 16 px 28 px, at x 120, y 1120–1196, −2° tilt.
- **Inside the mask:** blush rect, face image, and the light band (a 260 px wide `<rect>`, linear gradient glaze 0 → 55 % → 0, `skewX(-25)`).
- **What the mask shows:** the letter band y ≈ 570–900 reveals the eyes and nose. Outside the letters the canvas is paper.

**Motion:**

| Time | Element | Tween |
|---|---|---|
| 0.15–1.15 | Light band | `x −300 → 1400`, `sine.inOut` |
| 1.40–1.60, 1.60–1.80 | Chip | `scale 1 → 1.05`, `power2.out`; then `1.05 → 1`, `power2.in` (two explicit fromTo) |
| 2.30–2.50 | Kicker, comma, line, chip | `opacity 1 → 0`, `y 0 → −16`, `power2.in`, stagger 0.04 |
| 2.40–3.00 | `#hookWord` group | `scale 1 → MASK_SCALE`, `expo.in`, `svgOrigin: MASK_ORIGIN` |
| 2.98 | Hook inner wrapper | `tl.set(..., {opacity: 0})` |

- **`MASK_ORIGIN`** is the centre of the vertical stroke of «Ж» (RU), the stem of «D» (LV) or of «I» (EN). Measure it once and hardcode it per language.
- **`MASK_SCALE`** is the smallest factor at which that stroke covers 0–1080 × 0–1350, × 1.1 (expected ≈ 16 for RU). Hardcode it per language.
- **At the swap** the stage underneath is FULL blush field + camera P0 + chrome hidden + no marks, which is pixel-identical to the fully covered mask. **Never place the origin in a letter counter** (the inside of «О»); that fills the frame with paper.

#### S1 The frame forms (3.00–3.90)

| Time | Element | Tween |
|---|---|---|
| 3.00–3.60 | `#field` | FULL → HERO box + hero radii, `expo.out` |
| 3.10–3.40 | Folio slip | clip reveal L→R, `power3.out` |
| 3.15–3.45 | Rail slip | revealed; the 7 pips spring-pop `scale 0 → 1`, `back.out(2)`, stagger 0.03 |
| 3.15–3.45 | Counter | shows «01 / 07» (Martian Mono 600, 36 px, rouge) |
| 3.20–3.60 | Zone dots | spring-pop, rest coordinates (below), 14 px rouge circles, `back.out(2)` 0.3 s, stagger 0.06 |
| 3.70–3.85 | Dots Z2–Z6 | `opacity → 0.3`; Z1 stays at 1 |

- **Pips:** 22 × 18 px. Each pip is shaped by its category token. Empty = 2 px ink-60 outline; filled = rouge.
- **Zone dots (rest canvas):** Z1 (670, 430) · Z2 (500, 790) · Z3 (800, 735) · Z4 (830, 850) · Z5 (880, 960) · Z6 (665, 610).

#### C1 Уход и чистки (3.90–7.10)

**Camera and field:** P0 → P1, `expo.inOut` 0.7; field → petal.

**Layout:** BOTTOM cluster (kicker, title «Чистая / кожа», method) and PRICE-TR. **Site cut only:** the label «иллюстрация» (Martian Mono 500, 36 px, ink-60, on a slip) right-aligned to x 1008, y 1240–1286, visible 3.90–7.05.

**Site cut beats:**

- 3.90: `tl.set(#acne, {opacity: 1})`.
- 4.35–5.35: on `#acne`, `mask-image` is the intersection of 11 `radial-gradient(circle var(--hK) at Xk Yk, transparent 60%, #000 100%)` layers (`mask-composite: intersect`). GSAP tweens `--h0…--h10` from 0 → 34–44 px (seeded), `power2.out` 0.5 s, stagger 0.06. Each acne spot becomes a hole that shows the clean face beneath.
- 5.35: `tl.set(#acne, {opacity: 0})`.

**Ad cut beat:** 4.35–5.35, a glaze band crosses a forehead-only masked region (`light-sweep-pass`), leaving `#glaze` at 0.08.

**Both cuts:**

- 5.35–5.75: hairline arc drawn: rest path `M560 400 Q670 360 780 400`, 4 px rouge, round caps, `strokeDashoffset`, `power2.out`. Then hw-boil calm (frameDrop 3, seeded).
- Title verb: shared-axis-y. Each line's text rises `yPercent 105 → 0` inside its slip's `overflow: clip`, `expo.out` 0.5 s, stagger 0.08.
- Ambient: hw-boil on the arc.

**Exit (6.75–7.05):** slips `y 0 → 40`, `opacity → 0`, `power2.in` 0.25 s, stagger 0.03; price slip `x 0 → 60` + fade; label fades; arc → 0.22; `#glaze` → 0.

#### C2 Пилинги (7.10–10.30)

**Camera and field:** P1 → P0, `expo.inOut` 0.7 (7.10–7.80); then P0 → P2 end (s 1.04), `sine.inOut` 7.80–10.25. This push is the ambient motion. Field → lens.

**Layout:** TOP cluster (kicker, title «Ровный / тон»); method slip at y 430–482 (brands or generic); price slip «от 40 €» at x 110, y 850–934.

**The loupe:** `#camera` child at rest box **x 130–440, y 510–810**, lens token. 6 px paper border, oat interior with a blush → glaze gradient "new layer". Tape strip on top, −1.5°.

**Beats:**

| Time | Beat |
|---|---|
| 7.55–7.95 | Loupe `scale 0.6 → 1` + opacity, `back.out(1.4)` |
| 7.65–8.55 | Acid wave: a glaze gradient band `xPercent −120 → 120` inside the loupe, `sine.inOut` |
| from 7.65 | 18 flakes (paper hexes 18–30 px, 1 px ink-60 edge; seeded positions and rotations, `mulberry32(2027)`). Each flake gets a `fromTo` of `y 0 → −(30–80)`, `rotation 0 → ±(20–50)°`, `opacity 1 → 0`, `power2.out` 0.45 s, starting at `7.65 + 0.9·(dᵢ / loupeW)`, where dᵢ is the flake's distance from the wave's start edge. Each flake's state is a pure function of time. |
| 7.60–8.00 | hw-arrow (gentle, plain stroke) from the loupe's right edge (440, 660) to the left cheekbone (505, 785) |
| 7.70–8.10 | 3 hatch strokes on the left cheekbone, rest `M470 770 l40 -22`, `M486 790 l40 -22`, `M502 810 l40 -22`, stagger 0.12. This is the zone mark. |
| 7.80–8.60 | light-sweep-pass across the face; `#glaze` → 0.10 (`sine.inOut`) |
| 8.25–8.65 | hw-callout-circle (plain, 4 px rouge) around the price |
| — | Title verb: tracking collapse, `letterSpacing .35em → −.02em` + opacity, `power3.out` 0.55 s |

**Exit (9.95–10.25):** slips `xPercent 0 → −110`, `power3.in` 0.3 s, stagger 0.03; loupe `scale → 0.6` + `opacity → 0`; arrow undraws; hatches → 0.22; `#glaze` → 0.

#### C3 Мезотерапия (10.30–13.50)

**Camera and field:** P0/P2 → P3, `power3.inOut` 0.7; field → drop.

**Layout:** TOP cluster (title «Свежий / взгляд»), PRICE-BL, METHOD-B.

**Beats:**

| Time | Beat |
|---|---|
| 10.75–11.35 | Under-eye arcs (rest) `M470 742 Q540 760 610 742` and `M712 742 Q782 760 852 742`, 4 px rouge, 0.4 s each, second starts 0.12 s after the first, `power2.out` |
| 11.20–11.60 | 5 micro-points per arc (7 px rouge dots at evenly spaced path lengths), `back.out(2.2)`, stagger 0.035 |
| 11.35–12.15 | Two soft-light glaze ellipses (rest 190 × 80, centred (540, 748) and (782, 748)), `opacity 0 → 0.5`, `sine.inOut`. A visible brightening. |
| — | Title verb: masked slide from the right, `x 140 → 0` inside the slip's clip, `expo.out` 0.5 s, stagger 0.08 |
| — | Ambient: hw-boil on the arcs |

**Exit (13.15–13.45):** slips drop (as C1); arcs and points → 0.22; blooms → 0.

#### C4 Биоревитализация (13.50–16.70)

**Camera and field:** P3 → P4, `sine.inOut` 0.8; field → pebble.

**Layout:** BOTTOM cluster (title «Увлажнение / изнутри»), method slip; PRICE-TR.

**The lens:** `#camera` child, rest centre **(827, 799)**, rest size **185 × 154**, which lands at canvas (760, 548), 240 × 200 at P4. Pebble token, 5 px paper border, blush interior. It holds 7 cells (rest 28–43 px, seeded layout), each starting in the crinkled token `38% 62% 30% 70% / 64% 30% 70% 36%` at colour `#D9C3BD` and `scale 0.82`.

**Beats:**

| Time | Beat |
|---|---|
| 13.95–14.40 | A droplet (SVG teardrop, rest 54 × 74, blush fill, glaze crescent, 2 px rouge rim at 30 %) falls `y −700 → 0` onto the lens centre, `power2.in` |
| 14.40–14.50 | Droplet squash `scaleX 1 → 1.3`, `scaleY 1 → 0.6`, `power2.out`, then opacity → 0 by 14.55 |
| 14.40–14.75 | Lens `scale 0 → 1`, `back.out(1.5)` |
| 14.45–15.15 | Two ripple ellipses (glaze 3 px, rouge 2 px), `scale 0.4 → 1.6`, `opacity 1 → 0`, `sine.out`, stagger 0.12 |
| 14.50–15.20 | Cells: `borderRadius` crinkled → pebble token, `scale 0.82 → 1`, `backgroundColor #D9C3BD → #E3BBBC`, `back.out(1.4)` 0.5 s, stagger 0.05 from the top-right |
| 14.70–15.30 | Lip gloss: a soft-light glaze ellipse (rest 200 × 70 at (663, 925)), `opacity 0 → 0.4`, `sine.inOut`. The lips are never scaled. |
| — | Title verb: per-letter waterfall, `opacity 0 → 1`, `y 14 → 0`, `power2.out` 0.3 s per letter, stagger 0.022 |
| — | Ambient: none besides hw-boil on the strokes |

**Exit (16.35–16.65):** slips `y 0 → −20` + fade, `power2.in` 0.25 s. The lens `scale 1 → 0.15` toward the cheek, `power2.in` 0.3 s, while the pencil droplet outline at the zone draws (rest `M830 820 q-18 26 0 40 q18 -14 0 -40`, 4 px rouge, 0.3 s). The outline is the zone mark (→ 0.22 at the end of the chapter). Gloss → 0.

#### C5 Биостимуляция (16.70–19.90)

**Camera and field:** P4 → P5, `expo.out` 0.7; field → cell + NARROW box.

**Layout:** TOP cluster (title «Упругий / овал»), PRICE-BL, METHOD-B.

**The lens:** `#camera` child, rest centre **(852, 803)**, rest size **183 × 148**, which lands at canvas (815, 605), 210 × 170 at P5. Cell token, 5 px paper border, oat interior.

**Beats:**

| Time | Beat |
|---|---|
| 17.15–17.50 | Lens `scale 0 → 1`, `back.out(1.5)` |
| 17.25–17.70 | PDRN double strand: two phase-shifted sine paths (plum 3 px, rouge 3 px) drawn `power2.out`; 6 rungs (ink-60 2 px) pop, stagger 0.03 |
| 17.65–18.05 | 8 wavy collagen fibres (`#C9989A`, 3 px) drawn, 0.3 s each, stagger 0.05 |
| 18.05–18.45 | Wavy fibre group `opacity 1 → 0` while the pre-drawn straight group goes `0 → 1`; both groups `scaleY 1 → 0.9`, `power3.inOut`. **No path morphing.** |
| 17.80–18.40 | hw-arrow swoop, plain 4 px rouge, rest L `M430 1010 C440 940 470 880 495 840` and R `M900 1010 C890 940 860 880 835 840`, 0.45 s each, stagger 0.15, with the head-arrival stretch pulse. These arrows are the zone mark. |
| — | Title verb: depth assemble. Each slip goes `scale 1.12 → 1`, `rotation ±5° → token tilt`, `opacity 0 → 1`, `back.out(1.4)` 0.5 s, stagger 0.08. |
| — | Ambient: hw-boil on the arrows |

**Exit (19.55–19.85):** slips slide left (as C2); lens `scale → 0`, `power2.in` 0.25 s; arrows → 0.22.

#### C6 Комплексные (19.90–23.10)

**Camera and field:** P5 → P0, `expo.inOut` 0.7; then P0 → P6 end, `sine.inOut` 20.60–23.05 (the ambient motion). Field → cloud + HERO box.

**Layout:** TOP cluster (title «Сияние / к событию»). Clippings in canvas space: three oat clippings, 300 × 96 each, at x 110 and y 470 / 590 / 710. Onest 600, 44 px, ink. Tape strips on each. Tilts −3° / +2° / −1.5°. Rouge «+» glyphs (NSD 400, 52 px) at (250, 566) and (250, 686). Price slip at x 110, y 860–944.

**Beats:**

| Time | Beat |
|---|---|
| 20.35–20.95 | Clippings `x −420 → 0`, `rotation −12° → token`, `back.out(1.6)` 0.45 s, stagger 0.18; the «+» glyphs spring-pop after each pair lands |
| 20.95–21.25 | hw-underline bracket mark (rouge), vertical at x 440, y 470–806 |
| 21.00–21.35 | hw-arrow (gentle) from (452, 640) to the left cheek, canvas ≈ (512, 813) |
| 21.15–21.95 | Glass-skin sweep: light-sweep-pass at 115°, glaze 55 %, across the face; `#glaze` → 0.12 |
| 21.35–21.85 | 4 four-point glint stars (glaze, 28–40 px) at rest (520, 760), (810, 760), (665, 640), (665, 820): `scale 0 → 1 → 0`, 0.5 s, stagger 0.1 |
| 21.85–22.15 | Pencil star outline at the glabella, rest (665, 610). This is the zone mark. |
| — | Title verb: soft kinetic slam, each line `scale 1.06 → 1` + `opacity 0 → 1`, `power3.out` 0.35 s, stagger 0.1 |

**Exit (22.75–23.05):** clippings scatter `x 0 → −200`, `rotation → ±12°`, `opacity → 0`, `power3.in` 0.3 s, stagger 0.04; slips `y → −30` + fade; bracket and arrow undraw; `#glaze` → 0; star → 0.22.

#### S8 Recap (23.10–25.60)

| Time | Beat |
|---|---|
| 23.10–23.80 | Camera P6 end → P0, `expo.inOut`; field → hero (0.9 s `sine.inOut`) |
| 23.25–23.65 | Headline slips, waterfall-entry (lines rise `y 30 → 0` + opacity, `expo.out` 0.4 s, stagger 0.1). TOP cluster positions; no kicker. Line 1 «7 направлений.», line 2 italic «Один кабинет.», 96–112 px. |
| 23.35–23.80 | The six marks (arc, hatches, arcs + points, droplet outline, jaw arrows, star) re-light `opacity 0.22 → 1`, 0.2 s each, stagger 0.07 |
| 23.50–23.90 | Zone dots → 0. Markers 1–6 spring-pop (`back.out(2)`, stagger 0.06): 56 px circles, paper fill, 3 px rouge ring, Martian Mono 600 34 px numerals |
| 23.90–25.35 | **Hold.** Poster-map frame at 24.50. |
| 25.35–25.60 | Headline `y → −20` + fade, `power2.in` 0.25 s; marks and markers → 0 |

Marker positions (rest canvas):

| Marker | Zone | Position |
|---|---|---|
| M1 | forehead | (560, 470) |
| M2 | tone | (430, 800) |
| M3 | eyes | (895, 735) |
| M4 | hydration | (900, 860) |
| M5 | oval | (935, 990) |
| M6 | whole face | (665, 560) |

#### C7 Консультация + CTA (25.60–29.95)

**Camera, field and chrome (25.60–26.30):** camera P0 → P8, `power2.inOut`; field → seed token + CTA box (0.9 s `sine.inOut`); counter → «07 / 07», pip 7 fills.

**Layout (canvas, x 110):**

| Element | Position | Style |
|---|---|---|
| Title slip «Начните» | y 150–272 | as §6.1 |
| Title slip, italic «с консультации» | y 278–400 | as §6.1 |
| Price chip «онлайн — 40 €» | y 420–500 | rouge, glaze text, Martian Mono 600 56 px |
| Name slips «Анастасия» / «Букина» | y 560–660, 666–766 | NSD 400 wdth 80, 88 px |
| Role slip «косметолог в Риге» | y 776–834 | Martian Mono 500, 44 px |
| Handwriting «жду вас» | arc from (130, 925) to (370, 905), −3° | Bad Script 64 px rouge |
| CTA pill «Записаться онлайн →» | y 1040–1144, x 110–≈700 | ink fill, glaze text, Onest 600 48 px, radius 999 px |

All of these clear the P8 eye and lip boxes.

**Beats:**

| Time | Beat |
|---|---|
| 25.75–26.25 | Title, shared-axis-y (as C1) |
| 26.15–26.60 | Price chip clip reveal + number-wheel 00 → 40 |
| 26.50–26.85 | Name and role slips `y 16 → 0` + opacity, `power3.out` 0.35 s, stagger 0.08 |
| 26.75–27.35 | Handwriting, per-character reveal along the arc path (hw-path-text technique with `--hw-font-print: "Bad Script"`) |
| **26.95**–27.30 | CTA pill `scale 0.6 → 1` + opacity, `back.out(1.7)`. **26.95 is the page sync time (`CTA_PILL_T`).** |
| 27.05–27.35 | Touch dot (72 px glaze circle, 2 px rouge ring, plum shadow) decel-arrives from (1150, 1500) to (560, 1100), `power3.out` (press-ripple component with the cursor art replaced) |
| 27.35–27.43 | Pill `scale 1 → 0.96`, `power2.in` |
| 27.43–27.70 | Pill `scale 0.96 → 1`, `back.out(2)`; two ripple rings `scale 0.6 → 1.8`, `opacity .5 → 0`, 0.35 s, stagger 0.08; the dot `y → −120` + fade, 0.2 s |
| 27.70–29.95 | **Complete stillness.** No tween active on any element. |

#### S10 Return (29.95–31.00)

| Time | Beat |
|---|---|
| 29.95–30.20 | All C7 copy plus folio, rail and counter `opacity → 0`, `y → −20`, `power2.in` 0.25 s, stagger 0.03 |
| 30.00–30.45 | Camera P8 → P0, `power2.inOut`; field CTA box → FULL (radii → 0), `expo.inOut` |
| 30.45 | `tl.set`: hook inner wrapper `opacity 1`, `#hookWord` scale = `MASK_SCALE` (fully covering, identical to the stage) |
| 30.45–30.95 | `#hookWord` `scale MASK_SCALE → 1`, `expo.out`, same `svgOrigin` |
| 30.60–30.90 | Kicker, comma, line `opacity 0 → 1`, `y 12 → 0`, `power2.out` 0.3 s, stagger 0.05 |
| 30.62–30.92 | Chip `scale 0.7 → 1` + opacity, `back.out(1.6)` |
| 30.95–31.00 | Static; equals frame 0 |

### 7.3 `CHAPTERS` (exported to the page; must equal `heroChapters.ts`)

```js
export const CHAPTERS = [
  { n: 1, id: 'skincare',          start: 3.90 },
  { n: 2, id: 'peels',             start: 7.10 },
  { n: 3, id: 'mesotherapy',       start: 10.30 },
  { n: 4, id: 'biorevitalization', start: 13.50 },
  { n: 5, id: 'biostimulation',    start: 16.70 },
  { n: 6, id: 'complex',           start: 19.90 },
  { n: 7, id: 'consultation',      start: 25.60 },
];
export const RECAP = [23.10, 25.60];
export const CTA_PILL_T = 26.95;
export const POSTER_MAP_T = 24.50;
export const DURATION = 31;
```

---

## 8. Advertising beats

| Beat | Time | What does the work |
|---|---|---|
| **Hook** | 0.00–3.00 | **Frame 0 already carries category and city** (kicker «SKINLAB · КОСМЕТОЛОГ · РИГА»), **benefit** («КОЖА, которую хочется трогать») and **offer** («7 направлений · от 40 €»), so a 1-second scroll-past still registers who, where and how much. The pattern interrupt is a face visible only through a couture word. The light sheen and the chip pulse pull the eye from the word to the offer before 2 s. |
| **Inform** | 3.90–23.10 | Six stations with one learnable formula: **category** (kicker) → **zone** (camera + pencil mark on the face) → **benefit** (serif title) → **visible positive change** (clearing, brightening, plumping cells, lift arrows, glow) → **method** (mono line) → **price** («от X €»). The 01/07 counter and the 7-pip rail create a pull to the end. |
| **Proof** | C1, C2/C4/C5, 23.10–25.60 | The site-cut forehead clearing (labelled «иллюстрация»). The mechanism lenses show *how* (acid wave and flakes, hydration cells, PDRN strand to collagen) as clinical literacy, not hype. The recap lights the whole face map in one frame: «7 направлений. Один кабинет.» = systematic expertise in one place. |
| **Offer** | 0.00 and 25.60–27.70 | The lowest real entry price twice: «от 40 €» in the hook, then the low-risk first step «Начните с консультации · онлайн — 40 €», which removes the "which procedure do I need?" barrier the film itself raised. |
| **CTA** | 25.60–29.95 | A named specialist (Анастасия Букина · косметолог в Риге), a personal «жду вас», and one ink pill «Записаться онлайн →» that is visibly **pressed**, then a 2.25 s still hold for reading and for thumb-stop. On the website, the real «Записаться» pill beside the film pulses at 26.95, and every chapter line is a seek + `/service/:id` link, so interest converts on the same screen. |
| **Rewatch** | loop | Titles and prices read on the first pass; method lines, lenses and marks reward later loops. The loop seam is invisible, so the film reads as a living cover. |

---

## 9. Legibility rules for text in motion

1. **Minimum sizes on the 1080-wide canvas**, which shows at about 0.30× on a 360 px phone:

   | Element | Size |
   |---|---|
   | Category/benefit titles | ≥ 96 px (we use 96–112) |
   | Prices | ≥ 56 px (64; consult chip 56) |
   | Any copy meant to be read (kickers, role, hook line, chip, pill) | ≥ 44 px (≈ 13 px on the phone) |
   | Secondary/rewatch detail (method lines 38, folio 36, counter 36, «иллюстрация» 36, marker numerals 34) | ≥ 34 px |
   | Anything else | Nothing below 34 px |

2. **Hold time ≥ reading time.** Fully legible time (entrance complete → exit start) must be **≥ 0.5 s + 0.3 s per word**. Prices count as 3 tokens, and «·»-separated items count as words.
   - The hook and C7 title hold far longer.
   - Chapter items get 1.7–2.4 s for ≤ 4 words.
   - The recap headline gets 1.7 s for 4 words.
   - The CTA pill gets 2.65 s.
3. **At most 4 readable items per chapter**, and at most 3 words per title line. **No text moves while it is meant to be read:** no ambient motion on text during holds, only entrance and exit.
4. **Entrances are ≤ 0.6 s. Exits are 0.25–0.3 s with `*.in` eases**, always faster than entrances.
5. **Text over the photo sits only on opaque paper slips or ink/rouge chips.**

   | Pair | Contrast |
   |---|---|
   | Ink on paper | 15.3 |
   | Glaze on rouge | 5.64 |
   | Glaze on ink | 16.9 |

   No text on blush except ink. `hyperframes check` must report 0 contrast findings.
6. **No copy inside the left gutter (x < 110), the feather band (outer 64 px) or any pose's eye/lip exclusion box** (§4.4). Verify with `debugBoxes=true` snapshots.
7. **Tilts:** information-bearing slips and chips are within ±3° (we use −2°…+1.5°). Handwriting is −3° and decorative only (≤ 3 words, never a price, name or procedure).
8. **No motion blur, no animated `filter: blur` on text, no letter-by-letter scrambles.**
9. **Latvian:** slip line-height is ≥ 1.0 for any line with capital diacritics. Fitted sizes are checked in LV snapshots («BIOREVITALIZĀCIJA», «Mitrinājums», «ĀDA»). Titles that don't fit at 96 px get shorter copy, never a smaller size.
10. **Phone proof:** every hold frame (§13.2 list) is downscaled to 328 px wide and read without zoom before sign-off.

---

## 10. Loop strategy

**Frame 0 and the last frame are the same designed state.** That state is the hook lockup:

- paper outside the letters;
- face and blush inside «КОЖА» at scale 1;
- the light band off-frame (x −300);
- kicker, comma, line and chip at rest;
- `#chrome` hidden; all marks, dots, markers, lenses, glaze and copy at opacity 0;
- `#field` = FULL; camera = P0.

**Mirrored velocity across the seam:**

- 30.45–30.95: the mask contracts with `expo.out` and decelerates to ≈ 0.
- 30.95–31.00 and 0.00–0.15: nothing moves.
- 0.15: the light band starts.
- 2.40–3.00: the mask expands with `expo.in`.

The face never moves during the hook or the return; the camera settles before the swap (30.00–30.45). The chip's `back.out` settles at 30.92.

**Determinism.** Every state is a pure function of `t`:

- `fromTo` with absolute values only;
- explicit dim, kill and reset states at every boundary;
- seeded pseudo-randomness (`mulberry32(2027)`);
- hw-boil is time-quantized and seeded;
- **no `repeat: -1`**, no `Date`, `performance.now` or `Math.random`;
- no ambient periodic functions cross the seam.

As a result, `<hyperframes-player loop>` wrapping to 0, the page's `player.seek(chapter.start)`, the MP4 loop and Instagram autoplay all show identical frames.

**Swap invariants:**

- 2.97 vs 2.99 and 30.44 vs 30.46 must pixel-compare equal (fuzz 2 %).
- 0.000 vs 30.967 must compare equal.

**Off-screen and reduced motion** are handled by the page (DESIGN.md §6). The film never needs a restart: resume continues from the current time.

---

## 11. Determinism and live-performance rules

**Timeline:** one `gsap.timeline({ paused: true })`, registered as `window.__timelines["skinlab-hero"]` (`"skinlab-hero-15"` in the cut) at the end of the async build.

**Lint pitfalls to avoid:**

- Do not use CSS `transform` on any GSAP target. Centre with `inset` or flex; use `xPercent`/`yPercent`.
- Never tween `visibility`, `display` or `autoAlpha` on `.clip` elements.
- No `<br>` in text; every line is its own element.

**Live budget** (the composition runs live in an iframe on desktop):

- No SVG filters at all: no gooey, no `feTurbulence`, no ink-bleed. hw-* strokes use `strokeType` `plain` or `sharp` only, because `soft` uses a blur filter.
- No `backdrop-filter`, no animated blur, no Canvas2D particle fields, no MorphSVG.
- ≤ 40 simultaneously animated nodes. Flakes are capped at 18, cells at 7, glints at 4.
- `mix-blend-mode` only on the static grain tile and on the face-masked soft-light glaze/gloss/bloom layers.
- Layout constants are precomputed. Text fitting and `getTotalLength()` run once at setup, never at tween time.

**Registry items** (install with `npx hyperframes add <name>` inside `videos/skinlab-hero`):

| Item | Use |
|---|---|
| `svg-mask-reveal` | hook text mask |
| `light-sweep-pass` | sheens |
| `hw-boil` | pencil wobble, `calm` |
| `hw-arrow` | C2, C5, C6 |
| `hw-underline` | C6 bracket |
| `hw-callout-circle` | C2 price |
| `number-wheel` | prices |
| `press-ripple` | C7 press; replace the cursor art with the touch dot |
| `hw-path-text` | technique reference for the handwriting; its Caveat-latin font is replaced by Bad Script |

Rules (from `hyperframes-animation`), not installs: coordinate-target-zoom, card-morph-anchor, spring-pop-entrance, waterfall-entry, vertical-spring-ticker, particle-burst, ambient-glow-bloom, physics-press-reaction, press-release-spring, cursor-click-ripple, kinetic-beat-slam, depth-scatter-assemble, svg-path-draw.

`grain-overlay` is **not** used. Its animated grain would break frame identity at the seam, so a static tile is used instead. Registry liquid-glass blocks are not used (they need WebGPU/WebGL).

---

## 12. 15 s paid-social cut (`cut15.html`, id `skinlab-hero-15`, 450 frames)

Built from the same `scenes.js` builders with new start times. Ad-safe variable defaults (`showBeforeAfter=false`, `showBrands=false`). Rail and counter hidden.

| Time | Scene |
|---|---|
| 0.00–3.00 | S0 hook (identical) |
| 3.00–3.60 | S1′: the field forms the blob; folio only; no dots |
| 3.60–6.80 | C3 Мезотерапия «Свежий взгляд» |
| 6.80–10.00 | C6 Комплексные «Сияние к событию» |
| 10.00–13.95 | C7′ CTA. Same relative timings as C7; still hold 12.10–13.95 (1.85 s) |
| 13.95–15.00 | S10′ return (same relative timings as S10) |

The last frame equals frame 0. The 9:16 Reels version is a separate re-layout, not a crop, and is out of scope.

---

## 13. Verification, renders and outputs

### 13.1 Gates (all must pass before any render)

```bash
cd videos/skinlab-hero
npx hyperframes lint && npx hyperframes check          # 0 findings incl. layout + contrast audits
npx hyperframes snapshot . --at 0,1.4,2.97,2.99,3.6,5.6,8.8,12.0,15.2,18.4,21.6,24.5,27.0,29.0,30.44,30.46,30.967 --no-end
```

1. **Seam and swaps:** pixel-compare `0` vs `30.967`, `2.97` vs `2.99`, and `30.44` vs `30.46` with `magick compare -metric AE -fuzz 2%`. Expect ≈ 0 differing pixels.
2. **Exclusion boxes:** re-run the snapshot set with `debugBoxes=true`. No copy, chip, lens or loupe intersects a red box.
3. **Every language:** run the snapshot set for LV and EN (`--variables-file vars/site-lv.json` etc. in preview, or render the variant entry files) and check fitted sizes and diacritics.
4. **Phone legibility:** downscale every hold frame to 328 px wide and read it without zoom.
5. **Live playback:** open `public/hf/skinlab-hero/index.ru.html` in `<hyperframes-player loop>` on desktop Chrome and Safari for 3 loops. There must be no hitch at the seam and the performance panel must show no long frames over 50 ms in steady state.

### 13.2 Renders (`scripts/hf-hero-render.ts`)

```bash
# per lang ∈ {ru, lv, en}
npx hyperframes render videos/skinlab-hero -c index.html --variables-file vars/site-$lang.json -f 30 -q delivery -o renders/hero-site-$lang-1080.mp4
npx hyperframes render videos/skinlab-hero -c index.html --variables-file vars/ad-$lang.json   -f 30 -q delivery -o renders/hero-ad-$lang-1080.mp4
npx hyperframes render videos/skinlab-hero -c cut15.html --variables-file vars/ad-$lang.json   -f 30 -q delivery -o renders/hero-ad15-$lang-1080.mp4

# web fallback (site cut), copied to public/hf/skinlab-hero/renders/
ffmpeg -i renders/hero-site-$lang-1080.mp4 -vf scale=720:900:flags=lanczos -c:v libx264 -profile:v high \
  -pix_fmt yuv420p -crf 26 -preset slow -movflags +faststart -an public/hf/skinlab-hero/renders/hero-site-$lang-720.mp4

# posters, from the delivery render so they equal the MP4 frames exactly
ffmpeg -i renders/hero-site-$lang-1080.mp4 -vf "select=eq(n\,0)"   -frames:v 1 tmp/poster-$lang.png
ffmpeg -i renders/hero-site-$lang-1080.mp4 -vf "select=eq(n\,735)" -frames:v 1 tmp/poster-map-$lang.png   # 24.50 s
# sharp → public/hf/skinlab-hero/posters/poster{,-map}-$lang-{540,810,1080}.{avif (q50), webp (q78)}
```

| Output | Size target | Deployed? |
|---|---|---|
| `hero-site-{lang}-720.mp4` | ≤ 3 MB | yes (`public/hf/skinlab-hero/renders/`) |
| `poster-{lang}-*` (frame 0) | 540 ≤ 35 KB, 810 ≤ 60 KB, 1080 ≤ 90 KB (AVIF) | yes |
| `poster-map-{lang}-*` (24.50 s) | same | yes |
| `index.{lang}.html` + `assets/` | ≤ 1.3 MB transfer (fonts shared with the page) | yes |
| `hero-site-{lang}-1080.mp4`, `hero-ad-{lang}-1080.mp4`, `hero-ad15-{lang}-1080.mp4` | `-q delivery` | no: owner deliverables for Instagram/Meta |

**Colour:** sample the rendered paper colour at (540, 40). If it drifts more than ΔE 2 from `#F4EDE6` in the BT.709 MP4, the page's edge feather still hides the boundary. Do not change the token.

### 13.3 Re-render triggers

Any CMS price change (`minPrice` differs from the vars), any copy change, or a player/CLI version bump (pin both to the same exact version) means re-running `hf-hero-build.ts`, then `hf-hero-render.ts`, then the gates.

### 13.4 Compliance before paid use (owner action)

- The face is a model or illustration; every acne/clearing use is labelled.
- Run the ad cut (no acne frame, no flaw marking, no needles, no device brand names, no «ботокс», no absolute claims) past Meta's health and cosmetic-procedure ad policy and Latvian PTAC guidance on before/after imagery and health claims before boosting it.
- Replace the model with consented real client imagery when available.
