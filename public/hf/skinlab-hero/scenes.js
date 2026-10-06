/*
 * scenes.js — SKINLAB hero film (docs/v2/MOTION.md). Shared by index.html (31 s, `skinlab-hero`)
 * and cut15.html (15 s paid cut, `skinlab-hero-15`).
 *
 * Top-level evaluation is side-effect free apart from `window.SKINLAB = {...}` so that
 * scripts/hf-hero-build.ts can evaluate this file in a Node `vm` sandbox and assert that
 * CHAPTERS equals src/pages/v2/data/heroChapters.ts.
 *
 * Determinism (MOTION §10/§11): every tween is a fromTo with absolute values on ONE paused
 * timeline; pseudo-randomness is seeded (mulberry32 / hwHash); the pencil "boil" is baked into the
 * timeline as quantised tl.set() poses (every 3 frames) instead of an onUpdate callback; text
 * fitting and path lengths are measured once at setup. No Date / performance.now / Math.random.
 */
(function (global) {
  'use strict';

  /* ── 1. Shared tables ─────────────────────────────────────────────────────────────────── */

  // MOTION §7.3 — must equal src/pages/v2/data/heroChapters.ts (asserted by hf-hero-build.ts).
  var CHAPTERS = [
    { n: 1, id: 'skincare', start: 3.9 },
    { n: 2, id: 'peels', start: 7.1 },
    { n: 3, id: 'mesotherapy', start: 10.3 },
    { n: 4, id: 'biorevitalization', start: 13.5 },
    { n: 5, id: 'biostimulation', start: 16.7 },
    { n: 6, id: 'complex', start: 19.9 },
    { n: 7, id: 'consultation', start: 25.6 },
  ];
  var RECAP = [23.1, 25.6];
  var CTA_PILL_T = 26.95;
  var POSTER_MAP_T = 24.5;
  var DURATION = 31;

  var TOKENS = {
    paper: '#F4EDE6',
    oat: '#E9DDD1',
    ink: '#1E1618',
    ink60: '#5E4F52',
    blush: '#E3BBBC',
    rouge: '#B23A2E',
    plum: '#3A2228',
    glaze: '#FFF8F2',
  };

  // DESIGN §3.4 category tokens (same strings as src/pages/v2/lib/shapes.ts).
  var SHAPES = {
    skincare: '70% 30% 52% 48% / 40% 62% 38% 60%',
    peels: '50% 50% 50% 50% / 38% 38% 62% 62%',
    mesotherapy: '58% 42% 50% 50% / 64% 64% 36% 36%',
    biorevitalization: '62% 38% 54% 46% / 48% 58% 42% 52%',
    biostimulation: '46% 54% 38% 62% / 55% 41% 59% 45%',
    complex: '40% 60% 60% 40% / 60% 40% 60% 40%',
    consultation: '52% 48% 66% 34% / 47% 66% 34% 53%',
    hero: '54% 46% 42% 58% / 48% 56% 44% 52%',
  };
  var CRINKLED = '38% 62% 30% 70% / 64% 30% 70% 36%';

  // MOTION §4.5 field boxes: inset T R B L (px).
  var BOXES = {
    FULL: [0, 0, 0, 0],
    HERO: [240, 10, 50, 230],
    NARROW: [240, 40, 50, 260],
    CTA: [300, 0, 40, 380],
  };

  var W = 1080;
  var H = 1350;
  var FACE = { x: 170, y: 150, w: 1000, h: 1242, k: 0.97 }; // canvas = (170 + .97 sx, 150 + .97 sy)

  // MOTION §4.4 camera poses (transform-origin 0 0): canvas = s·rest + (x, y).
  // PH is the hook pose; it is derived at setup from the fitted hook word (see hookLayout()).
  var POSES = {
    P0: { s: 1, x: 0, y: 0 },
    P1: { s: 1.45, x: -271.5, y: -253.55 },
    P2: { s: 1.04, x: -26.6, y: -28 },
    P3: { s: 1.5, x: -390, y: -523 },
    P4: { s: 1.3, x: -315.5, y: -491 },
    P5: { s: 1.15, x: -164.75, y: -318.25 },
    P6: { s: 1.06, x: -39.9, y: -45.6 },
    // P8 (CTA): MOTION §4.4 puts the face centre (665, 760) at (760, 760), s 0.86. The face then
    // touches the name slips (its left edge lands at x ≈ 532), which made the model read as the
    // named cosmetologist. Smaller and further right: centre → (795, 760), s 0.84, left edge ≈ 572,
    // so the signature card (x 110–≤ 545) stands apart from the photo.
    P8: { s: 0.84, x: 236.4, y: 121.6 },
  };

  // Rest-space anchors used for exclusion boxes (MOTION §4.3/§4.4).
  var EXCL = { eyeL: [539, 677], eyeR: [781, 677], lips: [663, 934] };

  // Z5 sits on the jaw (MOTION's (880, 960) lands on the blob beside it).
  var ZONE_DOTS = [
    [670, 430],
    [500, 790],
    [800, 735],
    [830, 850],
    [850, 950],
    [665, 610],
  ];
  var MARKERS = [
    [560, 470],
    [430, 800],
    [895, 735],
    [900, 860],
    [880, 1010],
    [665, 560],
  ];
  // Recap marker 7 (the consultation): a paper pill «7 · консультация» under the chin, so the map
  // shows the seven directions the headline counts (rest canvas centre).
  var MARKER7 = [665, 1150];

  // MOTION §2: the 11 most visible acne spots on public/before.jpeg, SOURCE px (1031×1280),
  // measured by scripts/v2-images.ts (videos/skinlab-hero/source/acne-spots.json → top11).
  var ACNE_SPOTS = [
    [558, 380],
    [617, 338],
    [463, 355],
    [605, 418],
    [497, 474],
    [541, 466],
    [497, 434],
    [411, 427],
    [472, 413],
    [646, 418],
    [415, 338],
  ];

  // Hook word glyph geometry, measured once in headless Chrome on the shipped Noto Serif Display
  // subset at wght 900 / wdth 62.5 (em units; x relative to the text origin, y up from the
  // baseline). stemCx/stemW: the vertical stroke the push-through scales about — «Ж» (RU, its
  // centre stem), «D» (LV, its stem), «I» (EN). inkTop: highest ink (ĀDA: the macron).
  var HOOK_GLYPH = {
    ru: { stemCx: 1.768, stemW: 0.144, capH: 0.714, inkTop: 0.726 },
    lv: { stemCx: 0.834, stemW: 0.168, capH: 0.714, inkTop: 0.822 },
    en: { stemCx: 1.334, stemW: 0.168, capH: 0.714, inkTop: 0.724 },
  };
  // Hook lockup spacing (px): kicker height, kicker bottom → word ink top, word baseline → benefit
  // line baseline (MOTION 900 → 1010), word baseline → chip top (900 → 1120), chip height.
  // Hook light band x range: the start only has to clear the letters (the hook paper hides the
  // rest); the end must clear the whole canvas incl. the −25° skew (bottom edge −315 px).
  var HOOK_BAND = [-420, 1400];
  var HOOK_GAP = { kicker: 44, kickerToInk: 120, line: 110, chipTop: 220, chipH: 76 };
  // Hook face pose per language: s, canvas x of the nose (rest 665), canvas y of the eye line
  // measured down from the cap top of the word. See hookLayout(). Measured once in headless Chrome
  // on the shipped font: the pose (s 1.0–1.6, nose x, eye y) that puts the most of BOTH eyes inside
  // letter ink — RU: О bowl + Ж stem, LV: D bowl + A diagonal, EN: K stem + I.
  var FACE_ANCHOR = { nose: [665, 819], eyes: 677 };
  var HOOK_FACE = {
    ru: { s: 1, nx: 484, ey: 122 },
    lv: { s: 1, nx: 748, ey: 190 },
    en: { s: 1, nx: 516, ey: 146 },
  };

  /* ── 2. Copy (MOTION §5.2). RU final; LV/EN need native review. `/` = authored break,
          `*…*` not used: line 2 of every title is the italic line. ──────────────────────── */
  var COPY = {
    ru: {
      hook: {
        kicker: 'SKINLAB · КОСМЕТОЛОГ · РИГА',
        word: 'КОЖА',
        line: 'которую хочется трогать',
        chip: '7 направлений · от {p_offer} €',
      },
      folio: 'SKINLAB',
      c1: {
        kicker: '01 · УХОД И ЧИСТКИ',
        title: 'Чистая / кожа',
        method: ['Anti Acne · чистка · Dermapen', 'Anti Acne · чистка · микронидлинг'],
        price: 'от {p_skincare} €',
        label: 'иллюстрация',
      },
      c2: {
        kicker: '02 · ПИЛИНГИ',
        title: 'Ровный / тон',
        method: ['сияние · anti pigment · BioRePeel', 'сияние · anti age · anti pigment'],
        price: 'от {p_peels} €',
      },
      c3: {
        kicker: '03 · МЕЗОТЕРАПИЯ',
        title: 'Свежий / взгляд',
        method: ['RRS HA Eyes · волосы · тело', 'глаза · волосы · тело'],
        price: 'от {p_meso} €',
      },
      c4: {
        kicker: '04 · БИОРЕВИТАЛИЗАЦИЯ',
        title: 'Увлажнение / изнутри',
        method: ['Neauvia · Stylage · без объёма', 'лицо · губы · без объёма'],
        price: 'от {p_biorev} €',
      },
      c5: {
        kicker: '05 · БИОСТИМУЛЯЦИЯ',
        title: 'Упругий / овал',
        method: ['Plinest ПДРН · свой коллаген', 'полинуклеотиды · свой коллаген'],
        price: 'от {p_biostim} €',
      },
      c6: {
        kicker: '06 · КОМПЛЕКСНЫЕ ПРОГРАММЫ',
        title: 'Сияние / к событию',
        clippings: ['пилинг', 'мезо', 'маска'],
        price: 'от {p_complex} €',
      },
      recap: '7 направлений. / Один кабинет.',
      m7: '7 · консультация',
      c7: {
        title: 'Начните / с консультации',
        price: 'онлайн — {p_consult_online} €',
        name: 'Анастасия / Букина',
        role: 'косметолог в Риге',
        hand: 'жду вас',
        model: 'модель',
        pill: 'Записаться онлайн →',
      },
    },
    lv: {
      hook: {
        kicker: 'SKINLAB · KOSMETOLOĢE · RĪGA',
        word: 'ĀDA',
        line: 'kurai gribas pieskarties',
        chip: '7 virzieni · no {p_offer} €',
      },
      folio: 'SKINLAB',
      c1: {
        kicker: '01 · KOPŠANA UN TĪRĪŠANA',
        title: 'Tīra / āda',
        method: ['Anti Acne · tīrīšana · Dermapen', 'Anti Acne · tīrīšana · mikroadatošana'],
        price: 'no {p_skincare} €',
        label: 'ilustrācija',
      },
      c2: {
        kicker: '02 · PĪLINGI',
        title: 'Vienmērīgs / tonis',
        method: ['mirdzums · anti pigment · BioRePeel', 'mirdzums · anti age · anti pigment'],
        price: 'no {p_peels} €',
      },
      c3: {
        kicker: '03 · MEZOTERAPIJA',
        title: 'Svaigs / skatiens',
        method: ['RRS HA Eyes · mati · ķermenis', 'acis · mati · ķermenis'],
        price: 'no {p_meso} €',
      },
      c4: {
        kicker: '04 · BIOREVITALIZĀCIJA',
        title: 'Mitrinājums / no iekšpuses',
        method: ['Neauvia · Stylage · bez apjoma', 'seja · lūpas · bez apjoma'],
        price: 'no {p_biorev} €',
      },
      c5: {
        kicker: '05 · BIOSTIMULĀCIJA',
        title: 'Stingrs / ovāls',
        method: ['Plinest PDRN · savs kolagēns', 'polinukleotīdi · savs kolagēns'],
        price: 'no {p_biostim} €',
      },
      c6: {
        kicker: '06 · KOMPLEKSĀS PROGRAMMAS',
        title: 'Mirdzums / svētkiem',
        clippings: ['pīlings', 'mezo', 'maska'],
        price: 'no {p_complex} €',
      },
      recap: '7 virzieni. / Viens kabinets.',
      m7: '7 · konsultācija',
      c7: {
        title: 'Sāciet / ar konsultāciju',
        price: 'tiešsaistē — {p_consult_online} €',
        name: 'Anastasija / Bukina',
        role: 'kosmetoloģe Rīgā',
        hand: 'gaidu jūs',
        model: 'modelis',
        pill: 'Pierakstīties tiešsaistē →',
      },
    },
    en: {
      hook: {
        kicker: 'SKINLAB · COSMETOLOGIST · RIGA',
        word: 'SKIN',
        line: 'you want to touch',
        chip: '7 treatments · from {p_offer} €',
      },
      folio: 'SKINLAB',
      c1: {
        kicker: '01 · CARE & CLEANSING',
        title: 'Clear / skin',
        method: ['Anti Acne · cleansing · Dermapen', 'Anti Acne · cleansing · microneedling'],
        price: 'from {p_skincare} €',
        label: 'illustration',
      },
      c2: {
        kicker: '02 · PEELS',
        title: 'Even / tone',
        method: ['radiance · anti-pigment · BioRePeel', 'radiance · anti-age · anti-pigment'],
        price: 'from {p_peels} €',
      },
      c3: {
        kicker: '03 · MESOTHERAPY',
        title: 'Fresh / eyes',
        method: ['RRS HA Eyes · hair · body', 'eyes · hair · body'],
        price: 'from {p_meso} €',
      },
      c4: {
        kicker: '04 · BIOREVITALIZATION',
        title: 'Hydration / from within',
        method: ['Neauvia · Stylage · no added volume', 'face · lips · no added volume'],
        price: 'from {p_biorev} €',
      },
      c5: {
        kicker: '05 · BIOSTIMULATION',
        title: 'Firm / contour',
        method: ['Plinest PDRN · your own collagen', 'polynucleotides · your own collagen'],
        price: 'from {p_biostim} €',
      },
      c6: {
        kicker: '06 · SIGNATURE PROGRAMMES',
        title: 'Glow / for the occasion',
        clippings: ['peel', 'meso', 'mask'],
        price: 'from {p_complex} €',
      },
      recap: '7 treatments. / One studio.',
      m7: '7 · consultation',
      c7: {
        title: 'Start / with a consultation',
        price: 'online — {p_consult_online} €',
        name: 'Anastasia / Bukina',
        role: 'cosmetologist / in Riga',
        hand: 'see you soon',
        model: 'model',
        pill: 'Book online →',
      },
    },
  };

  var VAR_DEFAULTS = {
    lang: 'ru',
    showBeforeAfter: true,
    showBrands: true,
    debugBoxes: false,
    p_offer: 40,
    p_skincare: 60,
    p_peels: 40,
    p_meso: 65,
    p_biorev: 120,
    p_biostim: 120,
    p_complex: 120,
    p_consult_online: 40,
  };

  // Scene plans. `at` = absolute start (s). Chapter keys c1..c7 map to CHAPTERS[n-1].
  var PLANS = {
    full: {
      duration: 31,
      rail: true,
      dots: true,
      scenes: [
        { k: 'hook', at: 0 },
        { k: 'form', at: 3.0 },
        { k: 'c1', at: 3.9 },
        { k: 'c2', at: 7.1 },
        { k: 'c3', at: 10.3 },
        { k: 'c4', at: 13.5 },
        { k: 'c5', at: 16.7 },
        { k: 'c6', at: 19.9 },
        { k: 'recap', at: 23.1 },
        { k: 'c7', at: 25.6 },
        { k: 'ret', at: 29.95 },
      ],
    },
    // MOTION §12 — 15 s paid cut: hook, S1′ (blob + folio only), C3, C6, C7′, S10′.
    cut15: {
      duration: 15,
      rail: false,
      dots: false,
      scenes: [
        { k: 'hook', at: 0 },
        { k: 'form', at: 3.0 },
        { k: 'c3', at: 3.6 },
        { k: 'c6', at: 6.8 },
        { k: 'c7', at: 10.0 },
        { k: 'ret', at: 13.95 },
      ],
    },
  };

  /* ── 3. Small utilities ───────────────────────────────────────────────────────────────── */

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // hw-boil hash (registry hw-boil): pure function → [-1, 1].
  function hwHash(n, seed) {
    var x = Math.sin(n * 127.1 + (seed || 1) * 311.7) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  }
  function r2(n) {
    return Math.round(n * 100) / 100;
  }
  function fill(tpl, vars) {
    return String(tpl).replace(/\{(\w+)\}/g, function (_, k) {
      return vars[k] != null ? String(vars[k]) : '';
    });
  }
  function lines(s) {
    return String(s)
      .split('/')
      .map(function (x) {
        return x.trim();
      })
      .filter(Boolean);
  }
  function parseRadius(token) {
    var parts = token.split('/');
    var hs = parts[0].trim().split(/\s+/).map(parseFloat);
    var vs = parts[1].trim().split(/\s+/).map(parseFloat);
    return { h: hs, v: vs };
  }
  // radiiPx (MOTION §4.5): horizontal % × box width, vertical % × box height.
  function radiiPx(token, w, h) {
    if (!token) return '0px 0px 0px 0px / 0px 0px 0px 0px';
    var p = parseRadius(token);
    return (
      p.h
        .map(function (x) {
          return r2((x / 100) * w) + 'px';
        })
        .join(' ') +
      ' / ' +
      p.v
        .map(function (x) {
          return r2((x / 100) * h) + 'px';
        })
        .join(' ')
    );
  }
  function fieldClip(boxName, token) {
    var b = BOXES[boxName];
    var w = W - b[1] - b[3];
    var h = H - b[0] - b[2];
    return (
      'inset(' +
      b[0] +
      'px ' +
      b[1] +
      'px ' +
      b[2] +
      'px ' +
      b[3] +
      'px round ' +
      radiiPx(boxName === 'FULL' ? null : token, w, h) +
      ')'
    );
  }
  function poseVars(p) {
    return { x: p.x, y: p.y, scale: p.s };
  }
  function xf(p, pt) {
    return [p.s * pt[0] + p.x, p.s * pt[1] + p.y];
  }
  function exclBoxes(p) {
    function box(c, hw, hh) {
      var a = xf(p, [c[0] - hw, c[1] - hh]);
      var b = xf(p, [c[0] + hw, c[1] + hh]);
      return [a[0], a[1], b[0] - a[0], b[1] - a[1]];
    }
    return [box(EXCL.eyeL, 80, 38), box(EXCL.eyeR, 80, 38), box(EXCL.lips, 110, 50)];
  }

  var NS = 'http://www.w3.org/2000/svg';
  function h(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function s(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function css(e, o) {
    for (var k in o) e.style[k] = o[k];
    return e;
  }
  function px(n) {
    return r2(n) + 'px';
  }

  /* ── 4. Film builder ──────────────────────────────────────────────────────────────────── */

  function readVars() {
    var v = {};
    try {
      if (global.__hyperframes && typeof global.__hyperframes.getVariables === 'function') {
        v = global.__hyperframes.getVariables() || {};
      }
    } catch (e) {
      v = {};
    }
    // Fallback: the declared defaults on <html data-composition-variables> (plain browser).
    if (!v || !Object.keys(v).length) {
      try {
        var decl = JSON.parse(document.documentElement.getAttribute('data-composition-variables') || '[]');
        decl.forEach(function (d) {
          v[d.id] = d.default;
        });
      } catch (e) {
        /* keep defaults */
      }
    }
    var out = {};
    Object.keys(VAR_DEFAULTS).forEach(function (k) {
      out[k] = v[k] == null ? VAR_DEFAULTS[k] : v[k];
    });
    ['showBeforeAfter', 'showBrands', 'debugBoxes'].forEach(function (k) {
      out[k] = out[k] === true || out[k] === 'true';
    });
    Object.keys(out).forEach(function (k) {
      if (k.indexOf('p_') === 0) out[k] = Math.round(Number(out[k])) || VAR_DEFAULTS[k];
    });
    if (!COPY[out.lang]) out.lang = 'ru';
    return out;
  }

  function build(opts) {
    var plan = PLANS[opts.plan || 'full'];
    var V = readVars();
    var C = COPY[V.lang];
    var root = document.getElementById('root');
    root.setAttribute('data-lang', V.lang);
    document.documentElement.setAttribute('lang', V.lang);
    var $ = function (id) {
      return document.getElementById(id);
    };
    var L = {
      field: $('field'),
      camera: $('camera'),
      face: $('face'),
      acne: $('acne'),
      glaze: $('glaze'),
      sweepFace: $('sweep-face'),
      sweepBrow: $('sweep-forehead'),
      fx: $('fx'),
      marks: $('marks'),
      lenses: $('lenses'),
      markers: $('markers'),
      chrome: $('chrome'),
      hook: $('hook'),
      hookInner: $('hook-inner'),
      hookBand: $('hookband'),
      debug: $('debug'),
    };

    /* ---------- 4.1 DOM: hook ---------- */
    var hk = buildHookDom(L, C, V);
    /* ---------- 4.2 DOM: chrome (folio + rail) ---------- */
    var chrome = buildChromeDom(L, C, plan);
    /* ---------- 4.3 DOM: camera-space furniture (zone dots, acne mask, markers) ---------- */
    var dots = buildDots(L);
    var markers = buildMarkers(L);
    var marker7 = plan.scenes.some(function (sc) {
      return sc.k === 'recap';
    })
      ? buildMarker7(L, C)
      : null;
    setupAcneMask(L.acne);

    /* ---------- 4.4 DOM: scene copy (built per plan scene) ---------- */
    var scenes = {};
    plan.scenes.forEach(function (sc) {
      if (/^c[1-6]$/.test(sc.k)) scenes[sc.k] = buildChapterDom(sc.k, $('sc-' + sc.k), C, V, L);
      else if (sc.k === 'recap') scenes.recap = buildRecapDom($('sc-recap'), C);
      else if (sc.k === 'c7') scenes.c7 = buildCtaDom($('sc-c7'), C, V);
    });

    var fontsWanted = fontRequests(C, V);
    var imgs = [L.face, L.acne];

    return Promise.all(
      fontsWanted.map(function (f) {
        return document.fonts.load(f[0], f[1]).catch(function () {});
      }),
    )
      .then(function () {
        return document.fonts.ready;
      })
      .then(function () {
        return Promise.all(
          imgs.map(function (im) {
            return im.decode ? im.decode().catch(function () {}) : null;
          }),
        );
      })
      .then(function () {
        /* ---------- 5. Measure once (fonts loaded) ---------- */
        var geo = hookLayout(hk, V.lang);
        Object.keys(scenes).forEach(function (k) {
          if (scenes[k].fit) scenes[k].fit();
        });
        measurePaths(L.marks);
        if (marker7) marker7.style.left = px(MARKER7[0] - marker7.offsetWidth / 2);

        /* ---------- 6. Initial (frame-0) state ---------- */
        var PH = geo.PH;
        gsap.set(L.camera, poseVars(PH));
        gsap.set(L.field, { clipPath: fieldClip('FULL') });
        gsap.set(L.hookBand, { x: HOOK_BAND[0] });
        // sweep bands rest off-frame (left) until their pass
        gsap.set([L.sweepFace.querySelector('.band'), L.sweepBrow.querySelector('.band')], { x: -560 });

        var tl = gsap.timeline({ paused: true, defaults: { immediateRender: false } });
        var st = {
          pose: PH,
          field: { box: 'FULL', token: null },
          counter: 1,
          plan: plan,
          V: V,
          L: L,
          C: C,
          dots: dots,
          markers: markers,
          marker7: marker7,
          chrome: chrome,
          marks: {},
          markOrder: [],
          debugAt: [],
        };

        plan.scenes.forEach(function (sc, i) {
          var next = plan.scenes[i + 1];
          var T = sc.at;
          if (sc.k === 'hook') sceneHook(tl, st, hk, geo, T);
          else if (sc.k === 'form') sceneForm(tl, st, T);
          else if (/^c[1-6]$/.test(sc.k)) sceneChapter(tl, st, sc.k, scenes[sc.k], T, next);
          else if (sc.k === 'recap') sceneRecap(tl, st, scenes.recap, T);
          else if (sc.k === 'c7') sceneCta(tl, st, scenes.c7, T);
          else if (sc.k === 'ret') sceneReturn(tl, st, hk, geo, T, scenes.c7);
        });

        if (V.debugBoxes) buildDebug(tl, st);
        // NB: a GSAP timeline is a thenable — never resolve a promise with it directly (the paused
        // timeline would never "complete"); hand it over in a plain object.
        return { tl: tl, geo: geo, vars: V };
      });
  }

  /* ── 5. Fonts ──────────────────────────────────────────────────────────────────────────── */

  function fontRequests(C, V) {
    var all = JSON.stringify(C) + '0123456789€→·—+';
    return [
      ['900 100px "Noto Serif Display"', all],
      ['380 100px "Noto Serif Display"', all],
      ['italic 340 100px "Noto Serif Display"', all],
      ['italic 300 100px "Noto Serif Display"', all],
      ['500 100px "Martian Mono"', all],
      ['600 100px "Martian Mono"', all],
      ['600 100px "Onest"', all],
      ['400 100px "Bad Script"', all],
    ];
  }

  /* ── 6. Hook (S0 / S10) ───────────────────────────────────────────────────────────────── */

  function buildHookDom(L, C, V) {
    var inner = L.hookInner;
    var svg = s('svg', { id: 'hooksvg', viewBox: '0 0 1080 1350', width: 1080, height: 1350, 'aria-hidden': 'true' }, inner);
    var defs = s('defs', {}, svg);
    // Inverse word mask: paper everywhere EXCEPT inside the letters, so the live stage (blush field
    // + the face on #camera + the light band) shows through the word. When the scaled stem covers
    // the frame the paper is fully transparent, i.e. pixel-identical to the bare stage — the
    // swaps at 2.98 / 30.45 are invisible by construction.
    var mask = s(
      'mask',
      { id: 'hookMask', maskUnits: 'userSpaceOnUse', maskContentUnits: 'userSpaceOnUse', x: -200, y: -200, width: 1480, height: 1750 },
      defs,
    );
    s('rect', { x: -200, y: -200, width: 1480, height: 1750, fill: '#fff' }, mask);
    var word = s('g', { id: 'hookWord', transform: 'matrix(1 0 0 1 0 0)' }, mask);
    var wordText = s('text', { class: 'hk-word', x: 120, y: 900, fill: '#000' }, word, C.hook.word);
    s('rect', { id: 'hookPaper', x: 0, y: 0, width: 1080, height: 1350, fill: TOKENS.paper, mask: 'url(#hookMask)' }, svg);
    // measuring twin (never visible) + the rouge comma (outside the mask)
    var measure = s('text', { class: 'hk-word', x: 120, y: 900, opacity: 0 }, svg, C.hook.word);
    var comma = s('text', { class: 'hk-comma', x: 980, y: 900, id: 'hookComma' }, svg, ',');

    var kicker = h('div', 'hk-kicker', inner, C.hook.kicker);
    kicker.id = 'hookKicker';
    var line = h('div', 'hk-line', inner, C.hook.line);
    line.id = 'hookLine';
    var chipPos = h('div', 'hk-chip-pos', inner);
    var chip = h('div', 'hk-chip', chipPos, fill(C.hook.chip, V));
    chip.id = 'hookChip';
    // the 1.05 «tap» pulse at T+1.4 (MOTION §7.2) briefly grows the chip past its box — intentional
    chip.setAttribute('data-layout-allow-overflow', '');
    return { svg: svg, word: word, wordText: wordText, measure: measure, comma: comma, kicker: kicker, line: line, chip: chip, chipPos: chipPos };
  }

  function hookLayout(hk, lang) {
    var G = HOOK_GLYPH[lang] || HOOK_GLYPH.ru;
    // advance widths at 100 px
    hk.measure.setAttribute('font-size', '100');
    var adv = hk.measure.getComputedTextLength() / 100;
    hk.comma.setAttribute('font-size', '100');
    var cAdv = hk.comma.getComputedTextLength() / 100;
    // MOTION §7.2: word spans x 120–980; comma ends ≤ 1008. (Height cap: the ink stays ≤ 560 px.)
    var S = Math.floor(Math.min(860 / adv, (1008 - 120 - 4) / (adv + 0.6 * cAdv * 0.72), 560 / G.inkTop));
    // Review fix "thumb-stop": at wdth 62.5 the word is ≈ 2.9 em wide, so «КОЖА» fits at a cap
    // height of only ≈ 212 px (the spec expected ≈ 330). Pinning the baseline at y 900 left the top
    // 38 % of frame 0 as empty paper; the lockup (kicker → word → line → chip, MOTION's own
    // spacings) is now centred vertically and the face follows the letter band (PH below).
    var inkH = G.inkTop * S;
    var lockH = HOOK_GAP.kicker + HOOK_GAP.kickerToInk + inkH + HOOK_GAP.chipTop + HOOK_GAP.chipH;
    var top = Math.round((H - lockH) / 2);
    var B = Math.round(top + HOOK_GAP.kicker + HOOK_GAP.kickerToInk + inkH);
    [hk.wordText, hk.measure, hk.comma].forEach(function (t) {
      t.setAttribute('y', B);
    });
    hk.wordText.setAttribute('font-size', S);
    hk.measure.setAttribute('font-size', S);
    var wordEnd = 120 + hk.measure.getComputedTextLength();
    var cS = Math.round(S * 0.6);
    hk.comma.setAttribute('font-size', cS);
    hk.comma.setAttribute('x', r2(wordEnd - 0.04 * cS));

    // benefit line: NSD italic 300 wdth 80, fitted to max width 888 between 64 and 84 px,
    // baseline 110 px under the word's (MOTION: 900 → 1010)
    var lineSize = 84;
    hk.line.style.fontSize = '84px';
    while (hk.line.offsetWidth > 888 && lineSize > 64) {
      lineSize -= 1;
      hk.line.style.fontSize = lineSize + 'px';
    }
    var lb = baselineOffset(hk.line);
    hk.line.style.top = px(B + HOOK_GAP.line - lb);
    hk.chipPos.style.top = B + HOOK_GAP.chipTop + 'px';
    hk.kicker.style.top = top + 'px';
    // kicker must end ≤ x 1008: tighten the tracking (.12em → ≥ .03em) before touching the size
    // (≥ 40 px) — EN «SKINLAB · COSMETOLOGIST · RIGA» needs it.
    var ls = 0.12;
    while (hk.kicker.offsetWidth > 888 && ls > 0.035) {
      ls = r2(ls - 0.01);
      hk.kicker.style.letterSpacing = ls + 'em';
    }
    var ks = 44;
    while (hk.kicker.offsetWidth > 888 && ks > 40) {
      ks -= 1;
      hk.kicker.style.fontSize = ks + 'px';
    }

    // Mask origin/scale (MOTION §7.2): centre of the stem; smallest factor whose stem rectangle
    // covers 0–1080 × 0–1350, × 1.1, then lifted so the cover is already complete at t = 2.96
    // (expo.in has reached only 63 % there) — the swap frames 2.97/2.99 must be identical.
    var ox = 120 + G.stemCx * S;
    var oy = B - (G.capH * S) / 2;
    var hw = (G.stemW * S) / 2;
    var hh = (G.capH * S) / 2;
    var m = Math.max(Math.max(ox, W - ox) / hw, Math.max(oy, H - oy) / hh);
    var cover = 1.1 * m;
    var e296 = Math.pow(2, 10 * ((2.96 - 2.4) / 0.6 - 1));
    var MS = (cover - 1) / e296 + 1;

    // Hook pose PH (per language, HOOK_FACE): scale s, nose x, eye line y below the cap top. The
    // values put both eyes inside thick strokes of the letters (measured with the shipped font),
    // not in the gaps between letters or the hairline terminals.
    var F = HOOK_FACE[lang] || HOOK_FACE.ru;
    var capTop = B - G.capH * S;
    var PH = { s: F.s, x: r2(F.nx - FACE_ANCHOR.nose[0] * F.s), y: r2(capTop + F.ey - FACE_ANCHOR.eyes * F.s) };

    return {
      S: S,
      B: B,
      ox: r2(ox),
      oy: r2(oy),
      MS: r2(MS),
      PH: PH,
      wordTop: B - inkH,
      M1: 'matrix(1 0 0 1 0 0)',
      MK: 'matrix(' + r2(MS) + ' 0 0 ' + r2(MS) + ' ' + r2(ox * (1 - MS)) + ' ' + r2(oy * (1 - MS)) + ')',
    };
  }

  // distance from the element's top to its first baseline (measured once)
  function baselineOffset(el) {
    var probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;';
    el.appendChild(probe);
    var top = probe.offsetTop; // layout px (unaffected by any preview scaling transform)
    el.removeChild(probe);
    return top;
  }

  function sceneHook(tl, st, hk, geo, T) {
    // light band inside the letters (0.15–1.15) — 380 px wide, glaze 85 % (MOTION: 260 px, 55 %,
    // which changed ≈ 1 % of the frame and was invisible at phone width)
    // linear, so the sheen spends ≈ 0.75 s on the letters (sine.inOut crossed them in ≈ 0.5 s)
    tl.fromTo(st.L.hookBand, { x: HOOK_BAND[0] }, { x: HOOK_BAND[1], duration: 1, ease: 'none' }, T + 0.15);
    // chip pulse (press-release-spring)
    tl.fromTo(hk.chip, { scale: 1 }, { scale: 1.05, duration: 0.2, ease: 'power2.out' }, T + 1.4);
    tl.fromTo(hk.chip, { scale: 1.05 }, { scale: 1, duration: 0.2, ease: 'power2.in' }, T + 1.6);
    // text exit
    tl.fromTo(
      [hk.kicker, hk.comma, hk.line, hk.chip],
      { opacity: 1, y: 0 },
      { opacity: 0, y: -16, duration: 0.18, ease: 'power2.in', stagger: 0.04 },
      T + 2.3,
    );
    // push-through about the stem
    tl.fromTo(hk.word, { attr: { transform: geo.M1 } }, { attr: { transform: geo.MK }, duration: 0.6, ease: 'expo.in' }, T + 2.4);
    tl.set(st.L.hookInner, { opacity: 0 }, T + 2.98);
  }

  /* ── 7. Chrome: folio + rail (+ counter) ─────────────────────────────────────────────── */

  function buildChromeDom(L, C, plan) {
    var folioPos = h('div', 'pos', L.chrome);
    css(folioPos, { left: '110px', top: '40px', height: '52px' });
    var folio = h('div', 'slip folio', folioPos);
    h('span', 't', folio, C.folio);
    var out = { folio: folio, rail: null, pips: [], fills: [], strip: null };
    if (!plan.rail) return out;
    var railPos = h('div', 'pos', L.chrome);
    css(railPos, { right: '72px', top: '40px', height: '52px' });
    var rail = h('div', 'slip rail', railPos);
    var pipsBox = h('div', 'pips', rail);
    CHAPTERS.forEach(function (ch) {
      var p = h('span', 'pip', pipsBox);
      p.style.borderRadius = SHAPES[ch.id];
      var f = h('i', '', p);
      f.style.borderRadius = SHAPES[ch.id];
      gsap.set(p, { scale: 0 });
      gsap.set(f, { scale: 0 });
      out.pips.push(p);
      out.fills.push(f);
    });
    var ctr = h('span', 'counter', rail);
    var win = h('span', 'ctr-win', ctr);
    var strip = h('span', 'ctr-strip', win);
    for (var i = 1; i <= 7; i++) h('span', '', strip, String(i));
    h('span', 'ctr-zero', ctr, '0').style.order = '-1';
    h('span', 'ctr-of', ctr, ' / 07');
    out.rail = rail;
    out.strip = strip;
    return out;
  }

  function counterTo(tl, st, n, at) {
    if (!st.chrome.strip || st.counter === n) return;
    tl.fromTo(
      st.chrome.strip,
      { y: -(st.counter - 1) * 36 },
      { y: -(n - 1) * 36, duration: 0.45, ease: 'back.out(1.6)' },
      at,
    );
    st.counter = n;
  }

  function pipFill(tl, st, n, at) {
    var f = st.chrome.fills[n - 1];
    if (!f) return;
    tl.fromTo(f, { scale: 0 }, { scale: 1, duration: 0.35, ease: 'back.out(2)' }, at);
  }

  function clipReveal(tl, el, at, dur, ease) {
    var w = el.offsetWidth + 40;
    tl.fromTo(
      el,
      { clipPath: 'inset(-40px ' + w + 'px -40px 0px)', opacity: 1 },
      { clipPath: 'inset(-40px -40px -40px -40px)', opacity: 1, duration: dur, ease: ease || 'power3.out' },
      at,
    );
  }

  /* ── 8. S1: the frame forms ───────────────────────────────────────────────────────────── */

  function sceneForm(tl, st, T) {
    var L = st.L;
    tl.fromTo(L.field, { clipPath: fieldClip('FULL') }, { clipPath: fieldClip('HERO', SHAPES.hero), duration: 0.6, ease: 'expo.out' }, T);
    st.field = { box: 'HERO', token: SHAPES.hero };
    camMove(tl, st, POSES.P0, T, 0.6, 'expo.out');
    clipReveal(tl, st.chrome.folio, T + 0.1, 0.3);
    if (st.plan.rail && st.chrome.rail) {
      clipReveal(tl, st.chrome.rail, T + 0.15, 0.3);
      tl.fromTo(st.chrome.pips, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.03 }, T + 0.15);
    }
    if (st.plan.dots) {
      st.dots.forEach(function (d, i) {
        var t0 = T + 0.2 + i * 0.06;
        tl.fromTo(d, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: 'none' }, t0);
        tl.fromTo(d, { scale: 0, svgOrigin: d.__o }, { scale: 1, svgOrigin: d.__o, duration: 0.3, ease: 'back.out(2)' }, t0);
      });
      // Review fix: parked dots at 30 % read as red spots on clear skin — Z2–Z6 leave (MOTION: → .3);
      // each chapter shows only its own dot until its zone mark replaces it.
      tl.fromTo(st.dots.slice(1), { opacity: 1 }, { opacity: 0, duration: 0.15, ease: 'power1.out' }, T + 0.7);
      st.dotState = [1, 0, 0, 0, 0, 0];
    }
    debugPose(st, T, POSES.P0);
  }

  function camMove(tl, st, to, at, dur, ease) {
    var from = st.pose;
    if (from.s === to.s && from.x === to.x && from.y === to.y) return;
    tl.fromTo(st.L.camera, poseVars(from), Object.assign(poseVars(to), { duration: dur, ease: ease }), at);
    st.pose = to;
  }

  function fieldMove(tl, st, box, token, at, dur, ease) {
    var from = fieldClip(st.field.box, st.field.token);
    var to = fieldClip(box, token);
    if (from === to) return;
    tl.fromTo(st.L.field, { clipPath: from }, { clipPath: to, duration: dur, ease: ease }, at);
    st.field = { box: box, token: token };
  }

  function dotTo(tl, st, i, v, at, dur) {
    if (!st.plan.dots || !st.dotState) return;
    var from = st.dotState[i];
    if (from === v) return;
    tl.fromTo(st.dots[i], { opacity: from }, { opacity: v, duration: dur || 0.3, ease: 'power1.inOut' }, at);
    st.dotState[i] = v;
  }

  /* ── 9. Camera-space furniture ────────────────────────────────────────────────────────── */

  function buildDots(L) {
    var g = s('g', { id: 'zoneDots' }, L.marks);
    return ZONE_DOTS.map(function (p, i) {
      var c = s('g', { class: 'zdot', id: 'zdot' + (i + 1), opacity: 0 }, g);
      s('circle', { cx: p[0], cy: p[1], r: 7, class: 'zring' }, c);
      s('circle', { cx: p[0], cy: p[1], r: 2.6, class: 'zcore' }, c);
      c.__o = p[0] + ' ' + p[1];
      return c;
    });
  }

  function buildMarker7(L, C) {
    var m = h('div', 'marker marker7', L.markers, C.m7);
    css(m, { top: px(MARKER7[1] - 28), opacity: '0' });
    return m;
  }

  function buildMarkers(L) {
    return MARKERS.map(function (p, i) {
      var m = h('div', 'marker', L.markers, String(i + 1));
      css(m, { left: px(p[0] - 28), top: px(p[1] - 28), opacity: '0' });
      return m;
    });
  }

  function setupAcneMask(acne) {
    var layers = ACNE_SPOTS.map(function (p, i) {
      var x = r2(FACE.k * p[0]);
      var y = r2(FACE.k * p[1]);
      return 'radial-gradient(circle var(--h' + i + ') at ' + x + 'px ' + y + 'px, transparent 60%, #000 100%)';
    }).join(', ');
    acne.style.webkitMaskImage = layers;
    acne.style.maskImage = layers;
    for (var i = 0; i < ACNE_SPOTS.length; i++) acne.style.setProperty('--h' + i, '0.01px');
  }

  // pencil path helper (camera space, rest coords)
  function pencil(parent, d, extra) {
    var outer = s('g', {}, parent);
    var inner = s('g', {}, outer);
    var p = s('path', Object.assign({ d: d, class: 'pencil' }, extra || {}), inner);
    return { outer: outer, inner: inner, path: p };
  }
  function measurePaths(svgRoot) {
    var all = svgRoot.ownerDocument.querySelectorAll('path.pencil, path.draw');
    for (var i = 0; i < all.length; i++) {
      var p = all[i];
      var len = Math.ceil(p.getTotalLength() + 2);
      p.__len = len;
      p.style.strokeDasharray = len + ' ' + len;
      p.style.strokeDashoffset = String(len);
    }
  }
  function draw(tl, path, at, dur, ease) {
    var len = path.__len;
    tl.fromTo(path, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: dur, ease: ease || 'power2.out' }, at);
  }
  function undraw(tl, path, at, dur) {
    var len = path.__len;
    tl.fromTo(path, { strokeDashoffset: 0 }, { strokeDashoffset: len, duration: dur || 0.3, ease: 'power2.in' }, at);
  }

  // hw-boil (calm: amp 1.6 px, rot 0.5°, frameDrop 3) baked as quantised sets on the inner <g>.
  function boil(tl, g, t0, t1, seed, origin) {
    var fps = 30;
    var drop = 3;
    var k0 = Math.ceil((t0 * fps) / drop);
    var k1 = Math.floor((t1 * fps) / drop);
    var o = origin[0] + ' ' + origin[1];
    for (var k = k0; k <= k1; k++) {
      var t = (k * drop) / fps - 0.001;
      if (t < t0) continue;
      tl.set(
        g,
        {
          x: r2(hwHash(k * 3, seed) * 1.6),
          y: r2(hwHash(k * 3 + 1, seed) * 1.6),
          rotation: r2(hwHash(k * 3 + 2, seed) * 0.5),
          svgOrigin: o,
        },
        t,
      );
    }
    tl.set(g, { x: 0, y: 0, rotation: 0, svgOrigin: o }, t1 + 0.002);
  }

  function registerMark(st, n, group, origin, seed) {
    st.marks[n] = { g: group, origin: origin, seed: seed, opacity: 0 };
    st.markOrder.push(n);
  }
  function markOpacity(tl, st, n, v, at, dur, ease) {
    var m = st.marks[n];
    if (!m || m.opacity === v) return;
    tl.fromTo(m.g.outer, { opacity: m.opacity }, { opacity: v, duration: dur, ease: ease || 'power1.inOut' }, at);
    m.opacity = v;
  }

  /* ── 10. Slips / copy helpers (canvas space) ─────────────────────────────────────────── */

  function slip(parent, o) {
    var pos = h('div', 'pos', parent);
    pos.style.top = o.top + 'px';
    pos.style.height = o.h + 'px';
    if (o.right != null) {
      pos.style.right = W - o.right + 'px';
      pos.style.transformOrigin = '100% 50%';
    } else {
      pos.style.left = (o.left == null ? 110 : o.left) + 'px';
      pos.style.transformOrigin = '0% 50%';
    }
    if (o.tilt) pos.style.transform = 'rotate(' + o.tilt + 'deg)';
    var el = h('div', 'slip ' + (o.kind || ''), pos);
    var t = h('div', 't', el);
    if (o.text != null) t.textContent = o.text;
    return { pos: pos, slip: el, t: t };
  }

  function kickerHtml(t, text) {
    // «01 · УХОД И ЧИСТКИ» → chapter number in rouge
    var m = /^(\d\d)\s·\s(.*)$/.exec(text);
    if (!m) {
      t.textContent = text;
      return;
    }
    h('span', 'rg', t, m[1]);
    h('span', 'sep', t, ' · ');
    t.appendChild(document.createTextNode(m[2]));
  }

  function methodHtml(t, text) {
    text.split(' · ').forEach(function (part, i) {
      if (i) h('span', 'sep', t, ' · ');
      t.appendChild(document.createTextNode(part));
    });
  }

  // price with a number wheel per digit (registry number-wheel technique)
  function priceHtml(t, text, lineH) {
    var strips = [];
    var m = /^(.*?)(\d+)(.*)$/.exec(text);
    if (!m) {
      t.textContent = text;
      return strips;
    }
    if (m[1]) h('span', 'pfx', t, m[1]);
    var wheel = h('span', 'wheel', t);
    m[2].split('').forEach(function (ch) {
      var d = Number(ch);
      var col = h('span', 'wcol', wheel);
      var strip = h('span', 'wstrip', col);
      for (var i = 0; i <= d; i++) h('span', '', strip, String(i));
      strip.__d = d;
      strip.__lh = lineH;
      strips.push(strip);
    });
    if (m[3]) h('span', 'sfx', t, m[3]);
    return strips;
  }
  function rollDigits(tl, strips, at) {
    strips.forEach(function (sp, i) {
      if (!sp.__d) return;
      tl.fromTo(sp, { y: 0 }, { y: -sp.__d * sp.__lh, duration: 0.45 - 0.04 * i, ease: 'power3.out' }, at + 0.04 * i);
    });
  }

  function fitTitle(ts, maxW, hi, lo) {
    var size = hi;
    ts.forEach(function (t) {
      t.style.fontSize = hi + 'px';
    });
    var widest = Math.max.apply(
      null,
      ts.map(function (t) {
        return t.scrollWidth;
      }),
    );
    if (widest > maxW) size = Math.max(lo, Math.floor((hi * maxW) / widest));
    ts.forEach(function (t) {
      t.style.fontSize = size + 'px';
    });
    var fits = Math.max.apply(
      null,
      ts.map(function (t) {
        return t.scrollWidth;
      }),
    ) <= maxW + 1;
    if (!fits && global.console) console.warn('[skinlab] title does not fit at ' + lo + 'px:', ts.map(function (t) { return t.textContent; }).join(' / '));
    return size;
  }

  function splitChars(t) {
    var text = t.textContent;
    t.textContent = '';
    return text.split('').map(function (ch) {
      var sp = h('span', 'ch', t, ch === ' ' ? ' ' : ch);
      return sp;
    });
  }

  /* ── 11. Chapter DOM ──────────────────────────────────────────────────────────────────── */

  var CLUSTERS = {
    TOP: { kicker: 108, t1: 172, t2: 300, method: null },
    BOTTOM: { kicker: 910, t1: 976, t2: 1104, method: 1234 },
  };
  var CH_CFG = {
    c1: { cluster: 'BOTTOM', price: { right: 1008, top: 112 }, method: 1234, verb: 'axisY' },
    c2: { cluster: 'TOP', price: { left: 110, top: 850 }, method: 430, verb: 'track' },
    c3: { cluster: 'TOP', price: { left: 110, top: 1140 }, method: 1234, verb: 'slideR' },
    c4: { cluster: 'BOTTOM', price: { right: 1008, top: 112 }, method: 1234, verb: 'waterfall' },
    c5: { cluster: 'TOP', price: { left: 110, top: 1140 }, method: 1234, verb: 'depth' },
    c6: { cluster: 'TOP', price: { left: 110, top: 860 }, method: null, verb: 'slam' },
  };

  function buildTitleSlips(parent, text, top1, top2, tilts) {
    var ls = lines(text);
    var a = slip(parent, { top: top1, h: 122, tilt: tilts[0], kind: 'title' });
    a.t.className = 't title1';
    a.t.textContent = ls[0] || '';
    var b = slip(parent, { top: top2, h: 122, tilt: tilts[1], kind: 'title' });
    b.t.className = 't title2';
    b.t.textContent = ls[1] || '';
    return [a, b];
  }

  function buildChapterDom(k, host, C, V, L) {
    var cc = C[k];
    var cfg = CH_CFG[k];
    var cl = CLUSTERS[cfg.cluster];
    var d = { k: k, host: host, strips: [] };
    d.kicker = slip(host, { top: cl.kicker, h: 58, kind: 'kicker' });
    kickerHtml(d.kicker.t, cc.kicker);
    d.titles = buildTitleSlips(host, cc.title, cl.t1, cl.t2, [-1.2, 0.8]);
    if (cfg.method != null && cc.method) {
      d.method = slip(host, { top: cfg.method, h: 52, kind: 'method' });
      methodHtml(d.method.t, cc.method[V.showBrands ? 0 : 1]);
    }
    var pr = Object.assign({ h: 84, tilt: -1.5, kind: 'price' }, cfg.price);
    d.price = slip(host, pr);
    d.strips = priceHtml(d.price.t, fill(cc.price, V), 64);
    if (k === 'c1' && V.showBeforeAfter) {
      d.label = slip(host, { right: 1008, top: 208, h: 46, kind: 'label', text: cc.label });
    }
    if (k === 'c6') {
      d.clips = cc.clippings.map(function (word, i) {
        var pos = h('div', 'pos clipping-pos', host);
        css(pos, { left: '110px', top: 470 + i * 120 + 'px', transform: 'rotate(' + [-3, 2, -1.5][i] + 'deg)' });
        var cl2 = h('div', 'clipping', pos);
        h('span', 't', cl2, word);
        var tape = h('i', 'tape', cl2);
        tape.style.clipPath = tornEdge(31 + i);
        css(tape, { transform: 'rotate(' + [4, -3, 2][i] + 'deg)' });
        return cl2;
      });
      // MOTION puts the «+» at (250, 566)/(250, 686): there the disc overlaps the clipping words;
      // it sits at the right end of each seam instead, clear of the text.
      d.plus = [578, 698].map(function (y) {
        var p = h('div', 'plus', host, '+');
        css(p, { left: px(368 - 28), top: px(y - 28) });
        return p;
      });
    }
    d.fit = function () {
      fitTitle(
        d.titles.map(function (x) {
          return x.t;
        }),
        780,
        112,
        96,
      );
    };
    return d;
  }

  function tornEdge(seed, points) {
    var rnd = mulberry32(seed);
    var perEnd = Math.max(3, Math.floor((points || 14) / 2));
    var right = [];
    var left = [];
    for (var i = 0; i < perEnd; i++) right.push(r2(100 - (1 + rnd() * 6)) + '% ' + r2((i / (perEnd - 1)) * 100) + '%');
    for (var j = perEnd - 1; j >= 0; j--) left.push(r2(1 + rnd() * 6) + '% ' + r2((j / (perEnd - 1)) * 100) + '%');
    return 'polygon(' + right.concat(left).join(', ') + ')';
  }

  /* ── 12. Chapter timeline (MOTION §6 template + §7.2 beats) ───────────────────────────── */

  var CH_POSE = {
    c1: { pose: 'P1', ease: 'expo.inOut', dur: 0.7, box: 'HERO' },
    c2: { pose: 'P0', ease: 'expo.inOut', dur: 0.7, box: 'HERO', push: 'P2' },
    c3: { pose: 'P3', ease: 'power3.inOut', dur: 0.7, box: 'HERO' },
    c4: { pose: 'P4', ease: 'sine.inOut', dur: 0.8, box: 'HERO' },
    c5: { pose: 'P5', ease: 'expo.out', dur: 0.7, box: 'NARROW' },
    c6: { pose: 'P0', ease: 'expo.inOut', dur: 0.7, box: 'HERO', push: 'P6' },
  };

  function sceneChapter(tl, st, k, d, T) {
    var n = Number(k.slice(1));
    var id = CHAPTERS[n - 1].id;
    var cp = CH_POSE[k];
    var L = st.L;

    // T+0.00–0.70 camera, field, counter, pip, zone dot
    camMove(tl, st, POSES[cp.pose], T, cp.dur, cp.ease);
    if (cp.push) camMove(tl, st, POSES[cp.push], T + 0.7, 2.45, 'sine.inOut');
    fieldMove(tl, st, cp.box, SHAPES[id], T, 0.9, 'sine.inOut');
    counterTo(tl, st, n, T);
    pipFill(tl, st, n, T);
    dotTo(tl, st, n - 1, 1, T, 0.3);
    debugPose(st, T, POSES[cp.push || cp.pose]);

    // T+0.10–0.45 kicker
    clipReveal(tl, d.kicker.slip, T + 0.1, 0.35);
    // T+0.25–0.80 title (verb per chapter)
    titleVerb(tl, CH_CFG[k].verb, d, T + 0.25);
    // T+0.70–1.15 price slip + number wheel
    clipReveal(tl, d.price.slip, T + 0.7, 0.25);
    rollDigits(tl, d.strips, T + 0.95);
    // T+0.85–1.15 method
    if (d.method) tl.fromTo(d.method.slip, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, T + 0.85);

    // signature visual verb
    SIGNATURE[k](tl, st, d, T);
    // the zone dot hands over to the chapter's zone mark as soon as that starts drawing
    dotTo(tl, st, n - 1, 0, T + DOT_OFF[k], 0.25);

    // T+2.85–3.15 exit. Finished marks leave completely (MOTION: dim to .22 — together they read
    // as pink scratches on a clear-skin face); the recap re-lights all six.
    chapterExit(tl, st, k, d, T + 2.85);
    markOpacity(tl, st, n, 0, k === 'c4' ? T + 3.12 : T + 2.85, 0.3, 'power2.in');
    dotTo(tl, st, n - 1, 0, T + 2.85, 0.3);
  }

  // chapter-relative time at which the zone mark starts drawing (the lens covers Z4 in C4)
  var DOT_OFF = { c1: 1.45, c2: 0.6, c3: 0.45, c4: 0.9, c5: 1.1, c6: 1.95 };

  function slipsOf(d) {
    var list = [d.kicker.slip, d.titles[0].slip, d.titles[1].slip];
    if (d.method) list.push(d.method.slip);
    return list;
  }

  function titleVerb(tl, verb, d, at) {
    var A = d.titles[0];
    var B = d.titles[1];
    var both = [A, B];
    if (verb === 'axisY') {
      both.forEach(function (x, i) {
        tl.fromTo(x.slip, { clipPath: 'inset(100% -40px -40px -40px)', opacity: 1 }, { clipPath: 'inset(-40px -40px -40px -40px)', opacity: 1, duration: 0.4, ease: 'expo.out' }, at + i * 0.08);
        tl.fromTo(x.t, { yPercent: 105 }, { yPercent: 0, duration: 0.5, ease: 'expo.out' }, at + 0.03 + i * 0.08);
      });
    } else if (verb === 'track') {
      // tracking collapse .35em → −.02em, as per-glyph x (no letter-spacing reflow)
      both.forEach(function (x, i) {
        var fs = parseFloat(x.t.style.fontSize) || 112;
        var chars = splitChars(x.t);
        var delta = 0.37 * fs;
        tl.fromTo(x.slip, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' }, at + i * 0.08);
        chars.forEach(function (c, j) {
          tl.fromTo(c, { x: j * delta, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }, at + i * 0.08);
        });
      });
    } else if (verb === 'slideR') {
      both.forEach(function (x, i) {
        tl.fromTo(x.slip, { clipPath: 'inset(-40px -40px -40px 100%)', opacity: 1 }, { clipPath: 'inset(-40px -40px -40px -40px)', opacity: 1, duration: 0.45, ease: 'expo.out' }, at + i * 0.08);
        tl.fromTo(x.t, { x: 140 }, { x: 0, duration: 0.5, ease: 'expo.out' }, at + i * 0.08);
      });
    } else if (verb === 'waterfall') {
      var all = [];
      both.forEach(function (x) {
        all = all.concat(splitChars(x.t));
      });
      var stg = Math.min(0.022, (0.55 - 0.3) / Math.max(1, all.length - 1));
      both.forEach(function (x, i) {
        tl.fromTo(x.slip, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' }, at + i * 0.12);
      });
      tl.fromTo(all, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', stagger: stg }, at);
    } else if (verb === 'depth') {
      both.forEach(function (x, i) {
        var tilt = i ? 0.8 : -1.2;
        var r0 = (i ? 5 : -5) - tilt;
        tl.fromTo(x.slip, { scale: 1.12, rotation: r0, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' }, at + i * 0.08);
      });
    } else if (verb === 'slam') {
      both.forEach(function (x, i) {
        tl.fromTo(x.slip, { scale: 1.06, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'power3.out' }, at + i * 0.1);
      });
    }
  }

  function chapterExit(tl, st, k, d, at) {
    var list = slipsOf(d);
    if (k === 'c1' || k === 'c3') {
      tl.fromTo(list, { y: 0, opacity: 1 }, { y: 40, opacity: 0, duration: 0.25, ease: 'power2.in', stagger: 0.03 }, at);
      tl.fromTo(d.price.slip, { x: 0, opacity: 1 }, { x: 60, opacity: 0, duration: 0.25, ease: 'power2.in' }, at + 0.03);
      if (d.label) tl.fromTo(d.label.slip, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: 'power2.in' }, at);
    } else if (k === 'c2' || k === 'c5') {
      tl.fromTo(list.concat([d.price.slip]), { xPercent: 0 }, { xPercent: -110, duration: 0.3, ease: 'power3.in', stagger: 0.03 }, at);
      tl.fromTo(list.concat([d.price.slip]), { opacity: 1 }, { opacity: 0, duration: 0.3, ease: 'power3.in', stagger: 0.03 }, at);
    } else if (k === 'c4') {
      tl.fromTo(list.concat([d.price.slip]), { y: 0, opacity: 1 }, { y: -20, opacity: 0, duration: 0.25, ease: 'power2.in', stagger: 0.02 }, at);
    } else if (k === 'c6') {
      tl.fromTo(list.concat([d.price.slip]), { y: 0, opacity: 1 }, { y: -30, opacity: 0, duration: 0.25, ease: 'power2.in', stagger: 0.02 }, at);
    }
  }

  /* ── 13. Signature verbs ──────────────────────────────────────────────────────────────── */

  var SIGNATURE = {
    // C1 — forehead: illustrative acne clears hole by hole (site cut) / glaze sweep (ad cut);
    //      hairline arc = zone mark.
    c1: function (tl, st, d, T) {
      var L = st.L;
      var V = st.V;
      if (V.showBeforeAfter) {
        tl.set(L.acne, { opacity: 1 }, T);
        var rnd = mulberry32(2027);
        ACNE_SPOTS.forEach(function (p, i) {
          var r = 34 + Math.round(rnd() * 10);
          var o = {};
          o['--h' + i] = '0.01px';
          var e = { duration: 0.5, ease: 'power2.out' };
          e['--h' + i] = r + 'px';
          tl.fromTo(L.acne, o, e, T + 0.45 + i * 0.05);
        });
        // the residual patch (redness between spots) dissolves over the last 0.3 s instead of
        // popping off at 5.35
        tl.fromTo(L.acne, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: 'sine.inOut' }, T + 1.15);
        tl.fromTo(d.label.slip, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' }, T);
      } else {
        sweep(tl, L.sweepBrow, T + 0.45, 1.0);
        glazeTo(tl, st, 0.08, T + 0.45, 1.0);
      }
      // hairline arc on the skin just under the hairline (MOTION's M560 400 Q670 360 780 400 lies
      // on the hair, ≈ 25 px above the skin)
      var arc = pencil(L.marksGroup || L.marks, 'M560 425 Q670 392 780 425');
      arc.path.__len = null;
      measureOne(arc.path);
      draw(tl, arc.path, T + 1.45, 0.4);
      registerMark(st, 1, arc, [670, 410], 11);
      markOpacityInit(st, 1, 1);
      boil(tl, arc.inner, T + 1.85, T + 3.15, 11, [670, 410]);
      if (!V.showBeforeAfter) glazeTo(tl, st, 0, T + 2.85, 0.3);
    },

    // C2 — even tone: loupe with acid wave + lifting flakes, arrow to the cheekbone, 3 hatches
    //      (zone mark), glaze sweep across the face, price circled.
    c2: function (tl, st, d, T) {
      var L = st.L;
      var lp = buildLoupe(L);
      tl.fromTo(lp.wrap, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.4)' }, T + 0.45);
      // Review fix "C2 loupe": the «before» (matte film, warm pigment specks, oat flakes on the
      // magnified cheek) holds ≈ 0.4 s after the loupe lands; the acid wave then clears it left →
      // right and STOPS at 58 % of the loupe, so the hold shows a before | after split with the wave
      // front as the seam (MOTION: a full 0.9 s pass from T+0.55, while the loupe was still popping
      // in — the hold was a blank peach disc). Linear, so wave, film edge, specks and flakes agree.
      var LW = LOUPE_WAVE;
      var W0 = T + LW.start;
      var centreAt = function (x) {
        // time at which the wave centre reaches loupe x
        return W0 + (LW.dur * (x / lp.w - LW.from)) / (LW.to - LW.from);
      };
      // the wave element is LW.width × the loupe wide: centre = (xPercent / 100 + 0.5) · LW.width · w
      var xpOf = function (c) {
        return r2((c / LW.width - 0.5) * 100);
      };
      tl.fromTo(lp.wave, { xPercent: xpOf(LW.from) }, { xPercent: xpOf(LW.to), duration: LW.dur, ease: 'none' }, W0);
      tl.fromTo(
        lp.dull,
        { clipPath: 'inset(0px 0px 0px 0%)' },
        { clipPath: 'inset(0px 0px 0px ' + LW.to * 100 + '%)', duration: centreAt(LW.to * lp.w) - centreAt(0), ease: 'none' },
        centreAt(0),
      );
      lp.specks.forEach(function (sp) {
        if (sp.__d > LW.to * lp.w) return;
        tl.fromTo(sp, { opacity: 0.55 }, { opacity: 0, duration: 0.22, ease: 'power1.in' }, centreAt(sp.__d) - 0.08);
      });
      var rnd = mulberry32(2027);
      lp.flakes.forEach(function (f) {
        var dy = -(30 + rnd() * 50);
        var rot = (rnd() < 0.5 ? -1 : 1) * (20 + rnd() * 30);
        if (f.__d > LW.to * lp.w) return;
        tl.fromTo(f, { y: 0, rotation: f.__r0, opacity: 1 }, { y: dy, rotation: f.__r0 + rot, opacity: 0, duration: 0.45, ease: 'power2.out' }, centreAt(f.__d) - 0.05);
      });
      // arrow loupe → left cheekbone (hw-arrow gentle, plain)
      // ends just short of the hatches so the head never tangles with the zone mark
      var ar = arrow(L.marks, [440, 660], [476, 778], 'gentle', 21);
      arrowOn(tl, ar, T + 0.5, 0.4);
      // 3 hatches = zone mark, 35 px lower than MOTION's so they never cross the C3 under-eye arc
      // (in the recap they made a «#»)
      var hg = pencilGroup(L.marks, ['M470 805 l40 -22', 'M486 825 l40 -22', 'M502 845 l40 -22']);
      hg.paths.forEach(function (p, i) {
        draw(tl, p, T + 0.6 + i * 0.12, 0.28);
      });
      registerMark(st, 2, hg, [506, 814], 22);
      markOpacityInit(st, 2, 1);
      boil(tl, hg.inner, T + 1.0, T + 3.15, 22, [506, 814]);
      // light sweep across the face with the loupe's wave, glaze stays at .10
      sweep(tl, L.sweepFace, W0 + 0.1, 0.8);
      glazeTo(tl, st, 0.1, W0 + 0.1, 0.8);
      // price circled
      var circ = calloutCircle(d);
      draw(tl, circ, T + 1.15, 0.4);
      // exit
      tl.fromTo(lp.wrap, { scale: 1, opacity: 1 }, { scale: 0.6, opacity: 0, duration: 0.3, ease: 'power3.in' }, T + 2.85);
      undraw(tl, ar.curve, T + 2.85, 0.3);
      tl.fromTo(ar.head, { opacity: 1 }, { opacity: 0, duration: 0.15, ease: 'power2.in' }, T + 2.85);
      tl.fromTo(circ, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: 'power2.in' }, T + 2.85);
      glazeTo(tl, st, 0, T + 2.85, 0.3);
    },

    // C3 — fresh eyes: under-eye arcs + 5 micro-points each (zone mark), soft brightening bloom.
    c3: function (tl, st, d, T) {
      var L = st.L;
      var g = pencilGroup(L.marks, ['M470 742 Q540 760 610 742', 'M712 742 Q782 760 852 742']);
      draw(tl, g.paths[0], T + 0.45, 0.4);
      draw(tl, g.paths[1], T + 0.57, 0.4);
      var pts = [];
      g.paths.forEach(function (p) {
        var len = p.getTotalLength();
        for (var i = 0; i < 5; i++) {
          var q = p.getPointAtLength((len * (i + 0.5)) / 5);
          var c = s('circle', { cx: r2(q.x), cy: r2(q.y + 9), r: 3.5, class: 'mpoint' }, g.inner);
          c.__o = r2(q.x) + ' ' + r2(q.y + 9);
          gsap.set(c, { scale: 0, svgOrigin: c.__o });
          pts.push(c);
        }
      });
      pts.forEach(function (c, i) {
        tl.fromTo(c, { scale: 0, svgOrigin: c.__o }, { scale: 1, svgOrigin: c.__o, duration: 0.3, ease: 'back.out(2.2)' }, T + 0.9 + i * 0.035);
      });
      registerMark(st, 3, g, [661, 750], 33);
      markOpacityInit(st, 3, 1);
      boil(tl, g.inner, T + 1.3, T + 3.15, 33, [661, 750]);
      var bl = [bloom(L.fx, 540, 748, 190, 80), bloom(L.fx, 782, 748, 190, 80)];
      tl.fromTo(bl, { opacity: 0 }, { opacity: 0.5, duration: 0.8, ease: 'sine.inOut' }, T + 1.05);
      tl.fromTo(bl, { opacity: 0.5 }, { opacity: 0, duration: 0.3, ease: 'power2.in' }, T + 2.85);
    },

    // C4 — hydration: droplet falls, squashes, opens a pebble lens where 7 cells plump; ripples;
    //      lip gloss (lips never scaled); exit folds the lens into a pencil droplet (zone mark).
    c4: function (tl, st, d, T) {
      var L = st.L;
      var ln = buildHydraLens(L);
      tl.fromTo(ln.drop, { y: -700, opacity: 1 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power2.in' }, T + 0.45);
      tl.fromTo(ln.drop, { scaleX: 1, scaleY: 1 }, { scaleX: 1.3, scaleY: 0.6, duration: 0.1, ease: 'power2.out' }, T + 0.9);
      tl.fromTo(ln.drop, { opacity: 1 }, { opacity: 0, duration: 0.15, ease: 'power1.in' }, T + 0.9);
      tl.fromTo(ln.wrap, { scale: 0, opacity: 1, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, transformOrigin: '50% 50%', duration: 0.35, ease: 'back.out(1.5)' }, T + 0.9);
      tl.fromTo(ln.ripples, { scale: 0.4, opacity: 1 }, { scale: 1.6, opacity: 0, duration: 0.58, ease: 'sine.out', stagger: 0.12 }, T + 0.95);
      ln.cells.forEach(function (c, i) {
        tl.fromTo(
          c,
          { borderRadius: CRINKLED, scale: 0.82, backgroundColor: '#D9C3BD' },
          { borderRadius: SHAPES.biorevitalization, scale: 1, backgroundColor: TOKENS.blush, duration: 0.5, ease: 'back.out(1.4)' },
          T + 1.0 + i * 0.05,
        );
      });
      var gloss = bloom(L.fx, 663, 925, 200, 70, 'gloss');
      tl.fromTo(gloss, { opacity: 0 }, { opacity: 0.4, duration: 0.6, ease: 'sine.inOut' }, T + 1.2);
      // exit: lens folds toward the cheek, the droplet outline draws (zone mark)
      tl.fromTo(ln.wrap, { scale: 1, transformOrigin: ln.foldOrigin }, { scale: 0.15, transformOrigin: ln.foldOrigin, duration: 0.3, ease: 'power2.in' }, T + 2.85);
      tl.fromTo(ln.wrap, { opacity: 1 }, { opacity: 0, duration: 0.12, ease: 'none' }, T + 3.03);
      var dropMark = pencil(L.marks, 'M830 820 q-18 26 0 40 q18 -14 0 -40');
      measureOne(dropMark.path);
      draw(tl, dropMark.path, T + 2.85, 0.3);
      registerMark(st, 4, dropMark, [830, 840], 44);
      markOpacityInit(st, 4, 1);
      tl.fromTo(gloss, { opacity: 0.4 }, { opacity: 0, duration: 0.3, ease: 'power2.in' }, T + 2.85);
    },

    // C5 — firm contour: cell lens with PDRN double strand → collagen fibres straighten;
    //      two swoop arrows lift along the jawlines (zone mark).
    c5: function (tl, st, d, T) {
      var L = st.L;
      var ln = buildCollagenLens(L);
      tl.fromTo(ln.wrap, { scale: 0, opacity: 1 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.5)' }, T + 0.45);
      ln.strand.forEach(function (p) {
        drawLocal(tl, p, T + 0.55, 0.45, 'power2.out');
      });
      ln.rungs.forEach(function (r, i) {
        tl.fromTo(r, { scale: 0, svgOrigin: r.__o }, { scale: 1, svgOrigin: r.__o, duration: 0.2, ease: 'back.out(2)' }, T + 0.85 + i * 0.03);
      });
      ln.wavy.forEach(function (p, i) {
        drawLocal(tl, p, T + 0.95 + i * 0.05, 0.3, 'power2.out');
      });
      tl.fromTo(ln.wavyG, { opacity: 1, scaleY: 1, svgOrigin: ln.fo }, { opacity: 0, scaleY: 0.9, svgOrigin: ln.fo, duration: 0.4, ease: 'power3.inOut' }, T + 1.35);
      tl.fromTo(ln.straightG, { opacity: 0, scaleY: 1, svgOrigin: ln.fo }, { opacity: 1, scaleY: 0.9, svgOrigin: ln.fo, duration: 0.4, ease: 'power3.inOut' }, T + 1.35);
      // swoops start on the jaw next to the chin and lift along the jawline, ≈ 15–30 px inside the
      // face contour (MOTION's M430 1010… / M900 1010… start off the face, on the blob); they end
      // below the C2 hatches / C4 droplet so the recap never stacks marks
      var aL = arrowPath(L.marks, 'M540 1040 C505 1005 480 960 480 895', 51);
      var aR = arrowPath(L.marks, 'M790 1040 C825 1005 850 960 850 895', 52);
      arrowOn(tl, aL, T + 1.1, 0.45, 'power2.in');
      arrowOn(tl, aR, T + 1.25, 0.45, 'power2.in');
      var grp = { outer: s('g', {}, L.marks), inner: null };
      grp.outer.appendChild(aL.outer);
      grp.outer.appendChild(aR.outer);
      registerMark(st, 5, grp, [665, 965], 55);
      markOpacityInit(st, 5, 1);
      boil(tl, aL.inner, T + 1.7, T + 3.15, 55, [495, 965]);
      boil(tl, aR.inner, T + 1.7, T + 3.15, 56, [835, 965]);
      st.marks[5].boilParts = [
        [aL.inner, [495, 965], 55],
        [aR.inner, [835, 965], 56],
      ];
      tl.fromTo(ln.wrap, { scale: 1 }, { scale: 0, duration: 0.25, ease: 'power2.in' }, T + 2.85);
    },

    // C6 — glow for the occasion: taped clippings stack, bracket + arrow, glass-skin sweep,
    //      4 glints, pencil star at the glabella (zone mark).
    c6: function (tl, st, d, T) {
      var L = st.L;
      d.clips.forEach(function (c, i) {
        tl.fromTo(c, { x: -420, rotation: -12, opacity: 0 }, { x: 0, rotation: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' }, T + 0.45 + i * 0.18);
      });
      tl.fromTo(d.plus[0], { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' }, T + 0.45 + 0.18 + 0.3);
      tl.fromTo(d.plus[1], { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' }, T + 0.45 + 0.36 + 0.3);
      // bracket (hw-underline, vertical) + arrow to the left cheek — canvas space, in the clip
      var csvg = s('svg', { class: 'copysvg', viewBox: '0 0 1080 1350', width: 1080, height: 1350 }, d.host);
      var br = s('path', { d: 'M424 470 Q440 472 440 486 L440 790 Q440 805 424 806', class: 'draw pencil-c' }, csvg);
      var ar = arrow(csvg, [452, 640], [512, 813], 'gentle', 61, true);
      measureOne(br);
      measureOne(ar.curve);
      draw(tl, br, T + 1.05, 0.3);
      arrowOn(tl, ar, T + 1.1, 0.35);
      sweep(tl, L.sweepFace, T + 1.25, 0.8);
      glazeTo(tl, st, 0.12, T + 1.25, 0.8);
      var stars = [
        [520, 760, 34],
        [810, 760, 40],
        [665, 640, 28],
        [665, 820, 30],
      ].map(function (g) {
        return glint(L.fx, g[0], g[1], g[2]);
      });
      stars.forEach(function (g, i) {
        tl.fromTo(g, { scale: 0, opacity: 1 }, { scale: 1, duration: 0.25, ease: 'back.out(2)' }, T + 1.45 + i * 0.1);
        tl.fromTo(g, { scale: 1 }, { scale: 0, duration: 0.25, ease: 'power2.in' }, T + 1.7 + i * 0.1);
      });
      var star = pencil(L.marks, starPath(665, 610, 26, 9));
      measureOne(star.path);
      draw(tl, star.path, T + 1.95, 0.3);
      registerMark(st, 6, star, [665, 610], 66);
      markOpacityInit(st, 6, 1);
      boil(tl, star.inner, T + 2.25, T + 3.15, 66, [665, 610]);
      // exit
      d.clips.forEach(function (c, i) {
        var rot = i % 2 ? 12 : -12;
        tl.fromTo(c, { x: 0, rotation: 0, opacity: 1 }, { x: -200, rotation: rot, opacity: 0, duration: 0.3, ease: 'power3.in' }, T + 2.85 + i * 0.04);
      });
      tl.fromTo(d.plus, { opacity: 1 }, { opacity: 0, duration: 0.2, ease: 'power2.in' }, T + 2.85);
      undraw(tl, br, T + 2.85, 0.3);
      undraw(tl, ar.curve, T + 2.85, 0.3);
      tl.fromTo(ar.head, { opacity: 1 }, { opacity: 0, duration: 0.15, ease: 'power2.in' }, T + 2.85);
      glazeTo(tl, st, 0, T + 2.85, 0.3);
    },
  };

  function markOpacityInit(st, n, v) {
    st.marks[n].opacity = v;
  }
  function measureOne(p) {
    var len = Math.ceil(p.getTotalLength() + 2);
    p.__len = len;
    p.style.strokeDasharray = len + ' ' + len;
    p.style.strokeDashoffset = String(len);
  }
  function drawLocal(tl, p, at, dur, ease) {
    measureOne(p);
    draw(tl, p, at, dur, ease);
  }
  function pencilGroup(parent, ds) {
    var outer = s('g', {}, parent);
    var inner = s('g', {}, outer);
    var paths = ds.map(function (d) {
      var p = s('path', { d: d, class: 'pencil' }, inner);
      measureOne(p);
      return p;
    });
    return { outer: outer, inner: inner, paths: paths };
  }
  function starPath(cx, cy, R, r) {
    var d = '';
    for (var i = 0; i < 8; i++) {
      var a = -Math.PI / 2 + (i * Math.PI) / 4;
      var rad = i % 2 ? r : R;
      d += (i ? ' L' : 'M') + r2(cx + Math.cos(a) * rad) + ' ' + r2(cy + Math.sin(a) * rad);
    }
    return d + ' Z';
  }

  // hw-arrow technique: curve drawn with an accelerating pen (power2.in), head pops with a short
  // travel-aligned stretch (head-arrival), all plain strokes (no filters).
  function arrow(parent, a, b, style, seed, canvas) {
    var bend = style === 'swoop' ? 0.55 : style === 'gentle' ? 0.28 : 0.06;
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    var len = Math.hypot(dx, dy);
    var nx = -dy / len;
    var ny = dx / len;
    var w = function (n, r) {
      return hwHash(n, seed) * r;
    };
    var c1 = [a[0] + dx * 0.35 + nx * len * bend * 0.4 + w(1, 4), a[1] + dy * 0.35 + ny * len * bend * 0.4 + w(2, 4)];
    var c2 = [a[0] + dx * 0.7 + nx * len * bend * 0.25 + w(3, 4), a[1] + dy * 0.7 + ny * len * bend * 0.25 + w(4, 4)];
    var d = 'M' + a[0] + ' ' + a[1] + ' C' + r2(c1[0]) + ' ' + r2(c1[1]) + ' ' + r2(c2[0]) + ' ' + r2(c2[1]) + ' ' + b[0] + ' ' + b[1];
    return arrowFrom(parent, d, b, Math.atan2(b[1] - c2[1], b[0] - c2[0]), seed, canvas);
  }
  function arrowPath(parent, d, seed) {
    var nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
    var b = [nums[nums.length - 2], nums[nums.length - 1]];
    var c2 = [nums[nums.length - 4], nums[nums.length - 3]];
    return arrowFrom(parent, d, b, Math.atan2(b[1] - c2[1], b[0] - c2[0]), seed);
  }
  function arrowFrom(parent, d, tip, ang, seed, canvas) {
    var cls = canvas ? 'draw pencil-c' : 'pencil';
    var outer = s('g', {}, parent);
    var inner = s('g', {}, outer);
    var curve = s('path', { d: d, class: cls }, inner);
    measureOne(curve);
    var headG = s('g', { transform: 'translate(' + tip[0] + ' ' + tip[1] + ') rotate(' + r2((ang * 180) / Math.PI) + ')' }, inner);
    var head = s('g', { opacity: 0 }, headG);
    var hl = 22 + hwHash(9, seed) * 3;
    s('path', { d: 'M0 0 L' + r2(-hl) + ' ' + r2(-hl * 0.55) + ' M0 0 L' + r2(-hl) + ' ' + r2(hl * 0.55), class: cls.replace('draw ', '') }, head);
    return { outer: outer, inner: inner, curve: curve, head: head };
  }
  function arrowOn(tl, ar, at, dur, ease) {
    draw(tl, ar.curve, at, dur, ease || 'power2.in');
    tl.set(ar.head, { opacity: 1 }, at + dur);
    tl.fromTo(ar.head, { scaleX: 1.25, scaleY: 0.8, svgOrigin: '0 0' }, { scaleX: 1, scaleY: 1, svgOrigin: '0 0', duration: 0.3, ease: 'back.out(2.4)' }, at + dur);
  }

  function calloutCircle(d) {
    var host = d.host;
    var pos = d.price.pos;
    var x = parseFloat(pos.style.left);
    var y = parseFloat(pos.style.top);
    var w = d.price.slip.offsetWidth;
    var hgt = 84;
    var cx = x + w / 2;
    var cy = y + hgt / 2;
    var rx = w / 2 + 34;
    var ry = hgt / 2 + 26;
    var svg = s('svg', { class: 'copysvg', viewBox: '0 0 1080 1350', width: 1080, height: 1350 }, host);
    // hand-wobbled ellipse that overshoots its start a little (hw-callout-circle, plain)
    var pts = [];
    var N = 26;
    for (var i = 0; i <= N + 3; i++) {
      var a = -Math.PI * 0.62 + (i / N) * Math.PI * 2;
      var wob = 1 + hwHash(i * 13 + 5, 7) * 0.035 + (i > N ? 0.06 : 0);
      pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]);
    }
    var dd = 'M' + r2(pts[0][0]) + ' ' + r2(pts[0][1]);
    for (var j = 1; j < pts.length - 1; j++) {
      var mx = (pts[j][0] + pts[j + 1][0]) / 2;
      var my = (pts[j][1] + pts[j + 1][1]) / 2;
      dd += ' Q' + r2(pts[j][0]) + ' ' + r2(pts[j][1]) + ' ' + r2(mx) + ' ' + r2(my);
    }
    var p = s('path', { d: dd, class: 'draw pencil-c' }, svg);
    measureOne(p);
    return p;
  }

  function sweep(tl, layer, at, dur) {
    var band = layer.querySelector('.band');
    tl.fromTo(band, { x: -560 }, { x: 1100, duration: dur, ease: 'sine.inOut' }, at);
  }
  function glazeTo(tl, st, v, at, dur) {
    var from = st.glaze || 0;
    if (from === v) return;
    tl.fromTo(st.L.glaze, { opacity: from }, { opacity: v, duration: dur, ease: 'sine.inOut' }, at);
    st.glaze = v;
  }
  function bloom(parent, cx, cy, w, hh, cls) {
    var b = h('div', 'bloom ' + (cls || ''), parent);
    css(b, { left: px(cx - w / 2), top: px(cy - hh / 2), width: px(w), height: px(hh), opacity: '0' });
    return b;
  }
  function glint(parent, cx, cy, size) {
    var g = h('div', 'glint', parent);
    css(g, { left: px(cx - size / 2), top: px(cy - size / 2), width: px(size), height: px(size) });
    gsap.set(g, { scale: 0 });
    return g;
  }

  // C2 loupe acid wave: chapter-relative start + duration (s); wave-centre travel as fractions of
  // the loupe width (from just left of the loupe to the before | after seam)
  var LOUPE_WAVE = { start: 1.0, dur: 0.9, from: -0.2, to: 0.58, width: 0.36 };

  function buildLoupe(L) {
    var w = 310;
    var hh = 300;
    var wrap = h('div', 'loupe', L.lenses);
    css(wrap, { left: '130px', top: '510px', width: w + 'px', height: hh + 'px', borderRadius: SHAPES.peels, opacity: '0' });
    var inner = h('div', 'loupe-in', wrap);
    inner.style.borderRadius = SHAPES.peels;
    // Loupe = a 2.6× magnification of the left cheekbone (rest (505, 790)): the luminous layer is the
    // clean skin with a glaze glow; the dull layer is the same crop under a matte grey-beige film.
    var mag = 2.6;
    var bx = r2(w / 2 - 6 - (505 - FACE.x) * mag);
    var by = r2(hh / 2 - 6 - (790 - FACE.y) * mag);
    var bsz = r2(FACE.w * mag) + 'px ' + r2(FACE.h * mag) + 'px';
    var lum = h('div', 'lum', inner);
    css(lum, { backgroundSize: '100% 100%, ' + bsz, backgroundPosition: '0 0, ' + bx + 'px ' + by + 'px' });
    var dull = h('div', 'dull', inner);
    css(dull, { backgroundSize: '100% 100%, ' + bsz, backgroundPosition: '0 0, ' + bx + 'px ' + by + 'px' });
    var specksBox = h('div', 'specks', inner);
    var flakesBox = h('div', 'flakes', inner);
    var wave = h('div', 'wave', inner);
    wave.setAttribute('data-layout-allow-overflow', '');
    wave.style.width = LOUPE_WAVE.width * 100 + '%';
    gsap.set(wave, { xPercent: r2((LOUPE_WAVE.from / LOUPE_WAVE.width - 0.5) * 100) });
    // inside the lens token's inner ellipse (corners are clipped by the radius)
    var inLens = function (x, y, pad) {
      var ex = (x - w / 2) / (w / 2 - pad);
      var ey = (y - hh / 2) / (hh / 2 - pad);
      return ex * ex + ey * ey <= 1;
    };
    // 12 dead-skin flakes: solid oat hexes 30–44 px with a 2 px ink-60 edge (MOTION: 18 paper hexes
    // 18–30 px with a 1 px edge, illegible at phone width)
    var rnd = mulberry32(2027);
    var flakes = [];
    for (var tries = 0; flakes.length < 12 && tries < 400; tries++) {
      var sz = 30 + Math.round(rnd() * 14);
      var fx = 14 + rnd() * (w - 28 - sz);
      var fy = 14 + rnd() * (hh - 28 - sz);
      var r0 = Math.round(rnd() * 60);
      if (!inLens(fx + sz / 2, fy + sz / 2, 30)) continue;
      var f = h('i', 'flake', flakesBox);
      css(f, { left: px(fx), top: px(fy), width: px(sz), height: px(sz * 0.88) });
      f.__d = fx + sz / 2;
      f.__c = [fx + sz / 2, fy + sz * 0.44, sz / 2];
      f.__r0 = r0;
      gsap.set(f, { rotation: f.__r0 });
      flakes.push(f);
    }
    // 11 warm-brown pigment specks (seeded, never hidden under a flake)
    var rs = mulberry32(2028);
    var specks = [];
    for (var tj = 0; specks.length < 11 && tj < 600; tj++) {
      var ss = 9 + Math.round(rs() * 9);
      var sx = 20 + rs() * (w - 40 - ss);
      var sy = 20 + rs() * (hh - 40 - ss);
      var asp = 0.8 + rs() * 0.35;
      var cx = sx + ss / 2;
      var cy = sy + (ss * asp) / 2;
      if (!inLens(cx, cy, 34)) continue;
      var clear = flakes.every(function (fl) {
        return Math.hypot(cx - fl.__c[0], cy - fl.__c[1]) > fl.__c[2] + ss / 2 + 4;
      });
      if (!clear) continue;
      var sp = h('i', 'speck', specksBox);
      css(sp, { left: px(sx), top: px(sy), width: px(ss), height: px(ss * asp), opacity: '0.55' });
      sp.__d = cx;
      specks.push(sp);
    }
    var tapePos = h('div', 'loupe-tape-pos', wrap);
    var tape = h('i', 'tape', tapePos);
    tape.style.clipPath = tornEdge(27);
    return { wrap: wrap, wave: wave, dull: dull, flakes: flakes, specks: specks, w: w };
  }

  function buildHydraLens(L) {
    var w = 185;
    var hh = 154;
    var left = 827 - w / 2;
    var top = 799 - hh / 2;
    var wrap = h('div', 'lens hydra', L.lenses);
    css(wrap, { left: px(left), top: px(top), width: w + 'px', height: hh + 'px', borderRadius: SHAPES.biorevitalization });
    gsap.set(wrap, { scale: 0 });
    var rnd = mulberry32(2027 + 4);
    var spots = [
      [48, 46],
      [96, 36],
      [140, 54],
      [64, 94],
      [112, 86],
      [150, 104],
      [92, 124],
    ];
    var cells = spots.map(function (p) {
      var sz = 28 + Math.round(rnd() * 15);
      var c = h('i', 'cell', wrap);
      css(c, { left: px(p[0] - sz / 2), top: px(p[1] - sz / 2), width: px(sz), height: px(sz * 0.92), borderRadius: CRINKLED, backgroundColor: '#D9C3BD' });
      gsap.set(c, { scale: 0.82 });
      return c;
    });
    // order: stagger from the top-right
    cells.sort(function (a, b) {
      var pa = parseFloat(a.style.left) - parseFloat(a.style.top);
      var pb = parseFloat(b.style.left) - parseFloat(b.style.top);
      return pb - pa;
    });
    var ripples = [0, 1].map(function (i) {
      var r = h('i', 'ripple ' + (i ? 'r2' : 'r1'), L.fx);
      css(r, { left: px(827 - 110), top: px(799 - 92), width: '220px', height: '184px' });
      gsap.set(r, { scale: 0.4, opacity: 0 });
      return r;
    });
    var drop = h('div', 'droplet', L.fx);
    css(drop, { left: px(827 - 27), top: px(799 - 37 - 30), width: '54px', height: '74px' });
    drop.innerHTML =
      '<svg viewBox="0 0 54 74" width="54" height="74"><path d="M27 2 C27 2 4 34 4 49 a23 23 0 0 0 46 0 C50 34 27 2 27 2 Z" fill="#E3BBBC" stroke="rgba(178,58,46,.3)" stroke-width="2"/><path d="M15 46 q2 -10 9 -16" fill="none" stroke="#FFF8F2" stroke-width="5" stroke-linecap="round"/></svg>';
    gsap.set(drop, { y: -700, opacity: 0 });
    return { wrap: wrap, cells: cells, ripples: ripples, drop: drop, foldOrigin: px(830 - left) + ' ' + px(830 - top) };
  }

  function buildCollagenLens(L) {
    var w = 183;
    var hh = 148;
    var wrap = h('div', 'lens collagen', L.lenses);
    css(wrap, { left: px(852 - w / 2), top: px(803 - hh / 2), width: w + 'px', height: hh + 'px', borderRadius: SHAPES.biostimulation });
    gsap.set(wrap, { scale: 0 });
    var svg = s('svg', { viewBox: '0 0 ' + w + ' ' + hh, width: w, height: hh, class: 'lens-svg', 'data-layout-allow-overflow': '' }, wrap);
    // PDRN double strand: two phase-shifted sines across the upper half
    function sine(phase, amp, y0) {
      var d = '';
      for (var x = 14; x <= w - 14; x += 3) {
        var y = y0 + Math.sin(((x - 14) / 52) * Math.PI * 2 + phase) * amp;
        d += (d ? ' L' : 'M') + x + ' ' + r2(y);
      }
      return d;
    }
    var strandG = s('g', {}, svg);
    var rungsG = s('g', {}, svg);
    var strand = [s('path', { d: sine(0, 15, 50), class: 'strand plum' }, strandG), s('path', { d: sine(Math.PI, 15, 50), class: 'strand rouge' }, strandG)];
    var rungs = [];
    for (var i = 0; i < 6; i++) {
      var x = 14 + 13 + i * 26 + (i % 2 ? 0 : 0);
      var ya = 50 + Math.sin(((x - 14) / 52) * Math.PI * 2) * 15;
      var yb = 50 + Math.sin(((x - 14) / 52) * Math.PI * 2 + Math.PI) * 15;
      var r = s('line', { x1: x, y1: r2(ya), x2: x, y2: r2(yb), class: 'rung' }, rungsG);
      r.__o = x + ' 50';
      gsap.set(r, { scale: 0, svgOrigin: r.__o });
      rungs.push(r);
    }
    var wavyG = s('g', { class: 'fibres' }, svg);
    var straightG = s('g', { class: 'fibres', opacity: 0 }, svg);
    var fo = r2(w / 2) + ' 106';
    var wavy = [];
    for (var j = 0; j < 8; j++) {
      var y0 = 80 + j * 7.4;
      var dW = '';
      for (var xx = 22; xx <= w - 22; xx += 3) {
        var yy = y0 + Math.sin(xx / 9 + j * 1.3) * 2.6 + Math.sin(xx / 23 + j) * 1.6;
        dW += (dW ? ' L' : 'M') + xx + ' ' + r2(yy);
      }
      wavy.push(s('path', { d: dW, class: 'fibre' }, wavyG));
      s('path', { d: 'M22 ' + r2(y0) + ' L' + (w - 22) + ' ' + r2(y0), class: 'fibre' }, straightG);
    }
    return { wrap: wrap, strand: strand, rungs: rungs, wavy: wavy, wavyG: wavyG, straightG: straightG, fo: fo };
  }

  /* ── 14. Recap (S8) ───────────────────────────────────────────────────────────────────── */

  function buildRecapDom(host, C) {
    var d = { host: host };
    // TOP cluster shifted into the (unused) kicker slot: at 172/300 the second slip covered the
    // hairline arc (rest y 380–400), the first of the six marks the recap re-lights.
    d.titles = buildTitleSlips(host, C.recap, 108, 236, [-1.2, 0.8]);
    d.fit = function () {
      fitTitle(
        d.titles.map(function (x) {
          return x.t;
        }),
        780,
        112,
        96,
      );
    };
    return d;
  }

  function sceneRecap(tl, st, d, T) {
    camMove(tl, st, POSES.P0, T, 0.7, 'expo.inOut');
    fieldMove(tl, st, 'HERO', SHAPES.hero, T, 0.9, 'sine.inOut');
    debugPose(st, T, POSES.P0);
    d.titles.forEach(function (x, i) {
      tl.fromTo(x.slip, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'expo.out' }, T + 0.15 + i * 0.1);
    });
    var order = st.markOrder.slice().sort(function (a, b) {
      return a - b;
    });
    order.forEach(function (n, i) {
      markOpacity(tl, st, n, 1, T + 0.25 + i * 0.07, 0.2, 'power1.out');
      var m = st.marks[n];
      var parts = m.boilParts || [[m.g.inner, m.origin, m.seed]];
      parts.forEach(function (pp) {
        if (pp[0]) boil(tl, pp[0], T + 0.45 + i * 0.07, T + 2.5, pp[2] + 100, pp[1]);
      });
    });
    if (st.plan.dots) {
      for (var i = 0; i < 6; i++) dotTo(tl, st, i, 0, T + 0.4, 0.4);
    }
    st.markers.forEach(function (m, i) {
      if (!st.marks[i + 1]) return;
      tl.fromTo(m, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' }, T + 0.4 + i * 0.06);
    });
    // marker 7 — the consultation — so the map counts the seven directions the headline names
    if (st.marker7) tl.fromTo(st.marker7, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' }, T + 0.4 + 6 * 0.06);
    // exit
    tl.fromTo(
      d.titles.map(function (x) {
        return x.slip;
      }),
      { y: 0, opacity: 1 },
      { y: -20, opacity: 0, duration: 0.25, ease: 'power2.in', stagger: 0.03 },
      T + 2.25,
    );
    order.forEach(function (n) {
      markOpacity(tl, st, n, 0, T + 2.25, 0.25, 'power2.in');
    });
    tl.fromTo(
      st.markers
        .filter(function (m, i) {
          return !!st.marks[i + 1];
        })
        .concat(st.marker7 ? [st.marker7] : []),
      { opacity: 1 },
      { opacity: 0, duration: 0.25, ease: 'power2.in' },
      T + 2.25,
    );
    st.recapDone = true;
  }

  /* ── 15. C7 consultation + CTA ────────────────────────────────────────────────────────── */

  // signature card inner width (px): card x 110 + 26 padding … ≤ 545 with the padding
  var CARD_W = 380;

  function buildCtaDom(host, C, V) {
    var cc = C.c7;
    var d = { host: host };
    d.titles = buildTitleSlips(host, cc.title, 150, 278, [-1.2, 0.8]);
    var chipPos = h('div', 'pos', host);
    css(chipPos, { left: '110px', top: '420px', height: '80px', transform: 'rotate(-1.5deg)', transformOrigin: '0% 50%' });
    d.chip = h('div', 'chip c7chip', chipPos);
    var ct = h('div', 't', d.chip);
    d.strips = priceHtml(ct, fill(cc.price, V), 56);
    // Review fix "model vs specialist": name, role and «жду вас» sit on ONE taped signature card,
    // clear of the photo (x 110 – ≤ 545; the face starts at x ≈ 572 at P8), and the photo carries a
    // «модель» tag — the film never implies the stock model is the cosmetologist.
    var cardPos = h('div', 'pos', host);
    css(cardPos, { left: '110px', top: '540px', transform: 'rotate(-1deg)', transformOrigin: '0% 0%' });
    d.card = h('div', 'card', cardPos);
    var tapePos = h('div', 'card-tape-pos', d.card);
    h('i', 'tape', tapePos).style.clipPath = tornEdge(71);
    d.name = lines(cc.name).map(function (x) {
      var nm = h('div', 'nm', d.card, x);
      // tight display leading: the font's ascent/descent boxes overlap, the glyph ink does not
      nm.setAttribute('data-layout-allow-overlap', '');
      return nm;
    });
    d.role = lines(cc.role).map(function (x) {
      return h('div', 'rl', d.card, x);
    });
    // handwriting along an arc (hw-path-text technique, Bad Script), inside the card
    var hsvg = s('svg', { class: 'hand', width: CARD_W, height: 104, viewBox: '0 0 ' + CARD_W + ' 104', 'aria-hidden': 'true' }, d.card);
    var arcP = s('path', { id: 'handArc', d: 'M2 86 Q122 56 242 66', fill: 'none' }, hsvg);
    var txt = s('text', { class: 'hand-t' }, hsvg);
    var tp = s('textPath', { href: '#handArc', startOffset: '0' }, txt);
    d.handChars = cc.hand.split('').map(function (ch) {
      // script glyphs overlap their neighbours by design
      return s('tspan', { opacity: 0, 'data-layout-allow-overlap': '' }, tp, ch);
    });
    d.handSvg = hsvg;
    d.handText = txt;
    d.handArc = arcP;
    d.model = slip(host, { right: 1008, top: 1092, h: 46, kind: 'label', text: cc.model });
    var pillPos = h('div', 'pos', host);
    css(pillPos, { left: '110px', top: '1040px', height: '104px' });
    d.pill = h('div', 'pill', pillPos);
    h('span', 't', d.pill, cc.pill);
    var rp = [0, 1].map(function () {
      var r = h('i', 'pring', pillPos);
      return r;
    });
    d.pRings = rp;
    d.touch = h('div', 'touch', host);
    d.fit = function () {
      fitTitle(
        d.titles.map(function (x) {
          return x.t;
        }),
        780,
        112,
        96,
      );
      // card text fitted to the card's inner width: name 88 → ≥ 64 px, role 40 → ≥ 32 px
      fitTitle(d.name, CARD_W, 88, 64);
      fitTitle(d.role, CARD_W, 40, 32);
      var pw = d.pill.offsetWidth;
      var ph = d.pill.offsetHeight;
      rp.forEach(function (r) {
        css(r, { width: px(pw), height: px(ph) });
      });
      // the handwriting arc is stretched along the same −3° line when the phrase is longer than
      // 240 px (EN «see you soon»), so the textPath never truncates it
      var tlen = d.handText.getComputedTextLength();
      var span = Math.min(CARD_W - 4, Math.max(240, Math.ceil(tlen + 30)));
      d.handArc.setAttribute('d', 'M2 86 Q' + r2(2 + span / 2) + ' ' + r2(86 - (30 * span) / 240) + ' ' + (2 + span) + ' ' + r2(86 - (20 * span) / 240));
      // pill press point: 62 % along the pill, at its vertical centre
      d.pressX = 110 + pw * 0.62;
      d.pressY = 1040 + ph / 2;
      css(d.touch, { left: px(d.pressX - 36), top: px(d.pressY - 36) });
    };
    return d;
  }

  function sceneCta(tl, st, d, T) {
    var L = st.L;
    // marks that are still dimmed (cut15 has no recap) leave now
    if (!st.recapDone) {
      st.markOrder.forEach(function (n) {
        markOpacity(tl, st, n, 0, T, 0.3, 'power2.in');
      });
    }
    camMove(tl, st, POSES.P8, T, 0.7, 'power2.inOut');
    fieldMove(tl, st, 'CTA', SHAPES.consultation, T, 0.9, 'sine.inOut');
    counterTo(tl, st, 7, T);
    pipFill(tl, st, 7, T);
    debugPose(st, T, POSES.P8);
    // title — shared-axis-y (as C1)
    d.titles.forEach(function (x, i) {
      tl.fromTo(x.slip, { clipPath: 'inset(100% -40px -40px -40px)', opacity: 1 }, { clipPath: 'inset(-40px -40px -40px -40px)', opacity: 1, duration: 0.4, ease: 'expo.out' }, T + 0.15 + i * 0.08);
      tl.fromTo(x.t, { yPercent: 105 }, { yPercent: 0, duration: 0.5, ease: 'expo.out' }, T + 0.18 + i * 0.08);
    });
    // price chip
    clipReveal(tl, d.chip, T + 0.55, 0.25);
    rollDigits(tl, d.strips, T + 0.7);
    // signature card, then its lines; the «модель» tag on the photo
    tl.fromTo(d.card, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' }, T + 0.85);
    tl.fromTo(d.name.concat(d.role), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out', stagger: 0.07 }, T + 0.93);
    clipReveal(tl, d.model.slip, T + 1.0, 0.25);
    // handwriting «жду вас» — per-character along the arc
    var nC = d.handChars.length;
    d.handChars.forEach(function (c, i) {
      tl.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: 'none' }, T + 1.15 + (i * 0.54) / Math.max(1, nC - 1));
    });
    // CTA pill (CTA_PILL_T = T + 1.35)
    tl.fromTo(d.pill, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' }, T + 1.35);
    // touch dot decel-arrives, presses, releases (press-ripple with the cursor art replaced)
    tl.fromTo(
      d.touch,
      { x: 1150 - d.pressX, y: 1500 - d.pressY, opacity: 1 },
      { x: 0, y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' },
      T + 1.45,
    );
    tl.fromTo(d.pill, { scale: 1 }, { scale: 0.96, duration: 0.08, ease: 'power2.in' }, T + 1.75);
    tl.fromTo(d.touch, { scale: 1 }, { scale: 0.9, duration: 0.08, ease: 'power2.in' }, T + 1.75);
    tl.fromTo(d.pill, { scale: 0.96 }, { scale: 1, duration: 0.27, ease: 'back.out(2)' }, T + 1.83);
    tl.fromTo(d.pRings, { scale: 0.6, opacity: 0.5 }, { scale: 1.8, opacity: 0, duration: 0.35, ease: 'power2.out', stagger: 0.08 }, T + 1.83);
    tl.fromTo(d.touch, { y: 0, scale: 0.9, opacity: 1 }, { y: -120, scale: 1, opacity: 0, duration: 0.2, ease: 'power2.in' }, T + 1.85);
    // T+2.10 … exit (29.95): complete stillness
  }

  /* ── 16. S10 return ───────────────────────────────────────────────────────────────────── */

  function sceneReturn(tl, st, hk, geo, T, c7) {
    var L = st.L;
    var out = [];
    if (c7) {
      out = out.concat(
        c7.titles.map(function (x) {
          return x.slip;
        }),
        [c7.chip, c7.card, c7.model.slip, c7.pill],
      );
    }
    out.push(st.chrome.folio);
    if (st.chrome.rail) out.push(st.chrome.rail);
    // MOTION §7.2: 29.95–30.20, stagger .03 — with ~10 elements that would run past the 30.45 swap
    // (the chrome sits above the transparent hook paper), so the stagger is compressed to end by 30.26.
    var stg = Math.min(0.03, 0.09 / Math.max(1, out.length - 1));
    tl.fromTo(out, { opacity: 1, y: 0 }, { opacity: 0, y: -20, duration: 0.22, ease: 'power2.in', stagger: stg }, T);
    // settle by 30.42 (MOTION: 30.00–30.45) so the 30.44 frame already sits exactly at PH — with the
    // longer P8 → PH move the 0.1 % power2 residual left a sub-pixel shift across the 30.45 swap
    camMove(tl, st, geo.PH, T + 0.05, 0.42, 'power2.inOut');
    fieldMove(tl, st, 'FULL', null, T + 0.05, 0.42, 'expo.inOut');
    debugPose(st, T + 0.05, geo.PH);
    tl.set(L.hookInner, { opacity: 1 }, T + 0.5);
    tl.fromTo(hk.word, { attr: { transform: geo.MK } }, { attr: { transform: geo.M1 }, duration: 0.5, ease: 'expo.out' }, T + 0.5);
    tl.fromTo([hk.kicker, hk.comma, hk.line], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out', stagger: 0.05 }, T + 0.65);
    tl.fromTo(hk.chip, { scale: 0.7, opacity: 0, y: 0 }, { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.6)' }, T + 0.67);
    tl.set(L.hookBand, { x: HOOK_BAND[0] }, T + 1.0);
  }

  /* ── 17. Debug exclusion boxes (variable debugBoxes) ─────────────────────────────────── */

  function debugPose(st, at, pose) {
    st.debugAt.push([at, pose]);
  }
  function buildDebug(tl, st) {
    var boxes = [0, 1, 2].map(function (i) {
      return h('i', 'dbg', st.L.debug);
    });
    st.debugAt.forEach(function (e) {
      // during the move the boxes already show the destination pose (strictest reading)
      exclBoxes(e[1]).forEach(function (b, i) {
        tl.set(boxes[i], { left: b[0], top: b[1], width: b[2], height: b[3] }, e[0]);
      });
    });
    var first = st.debugAt[0];
    if (first)
      exclBoxes(st.pose).forEach(function (b, i) {
        css(boxes[i], { left: px(b[0]), top: px(b[1]), width: px(b[2]), height: px(b[3]) });
      });
  }

  global.SKINLAB = {
    CHAPTERS: CHAPTERS,
    RECAP: RECAP,
    CTA_PILL_T: CTA_PILL_T,
    POSTER_MAP_T: POSTER_MAP_T,
    DURATION: DURATION,
    TOKENS: TOKENS,
    SHAPES: SHAPES,
    BOXES: BOXES,
    POSES: POSES,
    COPY: COPY,
    ACNE_SPOTS: ACNE_SPOTS,
    HOOK_GLYPH: HOOK_GLYPH,
    PLANS: PLANS,
    VAR_DEFAULTS: VAR_DEFAULTS,
    build: build,
  };
})(typeof window !== 'undefined' ? window : globalThis);
