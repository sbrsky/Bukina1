/**
 * faceZones.ts — the face atlas zones (DESIGN.md §5.4).
 *
 * All geometry is in SOURCE px of the 1031 × 1280 portrait (public/before1.jpeg). The page shows the
 * cut-out public/media/v2/face-clear-*.{avif,webp}, which scripts/v2-images.ts makes from the SAME
 * full frame (2× master × alpha, resized as a whole — no crop, no offset), so source px map 1:1 onto
 * the displayed image box: render the overlay as `<svg viewBox="0 0 1031 1280">` over the image and
 * place hotspots with `left: x / 1031 * 100%`, `top: y / 1280 * 100%` (see `hotspotPct`).
 *
 * Numerals: zones are numbered in FILM chapter order (1 forehead, 2 tone, 3 eyes, 4 lips, 5 oval,
 * 6 whole face), as the film's face-map frame (MOTION.md §7.2 S8, poster-map at 24.50 s). Array
 * order = numeral order = tab order.
 *
 * Review round 2 — re-registered against the film. The pencil marks are the film's own zone marks
 * (videos/skinlab-hero/scenes.js: arc, hatches, under-eye arcs, droplet, jaw arrows, glabella star)
 * converted canvas → source with sx = (cx − 170) / 0.97, sy = (cy − 150) / 0.97 (MOTION.md §4.3),
 * and the hotspots sit where the film's markers M1–M6 sit, nudged only so a 44 px hotspot (≈ 103
 * source px across at 768, ≈ 72 at 1440) never covers an eye, the lips or its own mark — and so
 * every hotspot is ON its zone (the old 4 sat on the chin, 5 on the background, 6 on the hair):
 *   1 forehead  M1 (402, 330) → (402, 338)  under the arc's left end
 *   2 tone      M2 (268, 670) → (262, 640)  beside the hatches, at the cheek edge
 *   3 eyes      M3 (747, 603) → (757, 606)  at the outer end of the right under-eye arc
 *   4 lips      film M4 marks the cheek droplet (753, 732); the page's zone 4 is «Губы», so the
 *               hotspot sits at the right lip corner (658, 808), just below that same droplet
 *   5 oval      M5 (732, 887) sits beyond the jaw → (722, 896), straddling the right jawline
 *               beside the film's right jaw arrow
 *   6 face      M6 (510, 423) → (510, 398)  above the glabella star; the dashed whole-face
 *               ellipse of §5.4 stays as a second, dashed outline
 * Synced with scenes.js as of 2026-10-06 00:40 (the film's C1 arc, C2 hatches, C5 arrows and M5
 * had just moved). If the film's marks move again, re-convert them here.
 * Verified on an overlay of before1.jpeg and on the live page at 360/768/1440.
 */
import type { CategoryId } from '../lib/shapes';

export type ZoneId = 'forehead' | 'tone' | 'eyes' | 'lips' | 'oval' | 'face';

export interface FaceZone {
  id: ZoneId;
  /** hotspot / marker numeral 1–6 */
  n: number;
  labelKey: string;
  concernsKey: string;
  /** hotspot centre, source px */
  hotspot: { x: number; y: number };
  /** pencil mark(s), SVG path data in source px (stroke only, round caps) */
  path: string;
  /** an optional second, dashed outline (the whole-face ellipse) */
  outline?: string;
  /** treatments to list, joined by exact name */
  treatments: { categoryId: CategoryId; names: string[] }[];
}

export const FACE_VIEWBOX = { w: 1031, h: 1280 } as const;
export const DEFAULT_ZONE: ZoneId = 'eyes';

export const FACE_ZONES: FaceZone[] = [
  {
    id: 'forehead',
    n: 1,
    labelKey: 'v2.atlas.zone.forehead',
    concernsKey: 'v2.atlas.concerns.forehead',
    hotspot: { x: 402, y: 338 },
    // film C1 arc «M560 425 Q670 392 780 425» (canvas)
    path: 'M402.1 283.5 Q515.5 249.5 628.9 283.5',
    treatments: [
      { categoryId: 'skincare', names: ['Anti Acne программа', 'Чистка лица', 'Микронидлинг (Dermapen)'] },
      { categoryId: 'peels', names: ['Пилинг для сияния'] },
    ],
  },
  {
    id: 'tone',
    n: 2,
    labelKey: 'v2.atlas.zone.tone',
    concernsKey: 'v2.atlas.concerns.tone',
    hotspot: { x: 262, y: 640 },
    // film C2: 3 hatches on the left cheekbone («M470 805 l40 -22» …)
    path: 'M309.3 675.3 L350.5 652.6 M325.8 695.9 L367 673.2 M342.3 716.5 L383.5 693.8',
    treatments: [
      { categoryId: 'peels', names: ['Anti pigment пилинг', 'BioRePeel Cl3'] },
      { categoryId: 'biostimulation', names: ['Meso-Xanthin F199'] },
    ],
  },
  {
    id: 'eyes',
    n: 3,
    labelKey: 'v2.atlas.zone.eyes',
    concernsKey: 'v2.atlas.concerns.eyes',
    hotspot: { x: 757, y: 606 },
    // film C3: two under-eye arcs
    path: 'M309.3 610.3 Q381.4 628.9 453.6 610.3 M558.8 610.3 Q631 628.9 703.1 610.3',
    treatments: [
      { categoryId: 'mesotherapy', names: ['RRS HA Eyes', 'Plinest Eye'] },
      { categoryId: 'biostimulation', names: ['Xela Rederm 1,1%'] },
    ],
  },
  {
    id: 'lips',
    n: 4,
    labelKey: 'v2.atlas.zone.lips',
    concernsKey: 'v2.atlas.concerns.lips',
    hotspot: { x: 658, y: 808 },
    // film C4: the pencil droplet outline on the right cheek, tip up
    path: 'M680.4 690.7 q-18.6 26.8 0 41.2 q18.6 -14.4 0 -41.2',
    treatments: [{ categoryId: 'biorevitalization', names: ['Биоревитализация губ'] }],
  },
  {
    id: 'oval',
    n: 5,
    labelKey: 'v2.atlas.zone.oval',
    concernsKey: 'v2.atlas.concerns.oval',
    hotspot: { x: 722, y: 896 },
    // film C5: two arrows swooping from the chin up along the jawlines (+ arrowheads)
    // («M540 1040 C505 1005 480 960 480 895» / «M790 1040 C825 1005 850 960 850 895»)
    path:
      'M381.4 917.5 C345.4 881.4 319.6 835.1 319.6 768 M306.7 791.5 L319.6 768 L332.5 791.5 ' +
      'M639.2 917.5 C675.3 881.4 701 835.1 701 768 M688.1 791.5 L701 768 L713.9 791.5',
    treatments: [
      { categoryId: 'biostimulation', names: ['Plinest (ПДРН)', 'RRS Long Lasting', 'Meso-Wharton P199'] },
      { categoryId: 'skincare', names: ['Безинъекционные жидкие нити'] },
    ],
  },
  {
    id: 'face',
    n: 6,
    labelKey: 'v2.atlas.zone.face',
    concernsKey: 'v2.atlas.concerns.face',
    hotspot: { x: 510, y: 398 },
    // film C6: the four-point pencil star at the glabella
    path: 'M510.3 447.4 L516.9 467.6 L537.1 474.2 L516.9 480.8 L510.3 501 L503.7 480.8 L483.5 474.2 L503.7 467.6 Z',
    // §5.4: a dashed ellipse around the face
    outline: 'M230 590 A285 410 0 1 0 800 590 A285 410 0 1 0 230 590',
    treatments: [
      { categoryId: 'complex', names: ['GLOW EFFECT', 'ANTI POSTACNE', 'ANTI POSTACNE 2.0'] },
      { categoryId: 'biorevitalization', names: ['Neauvia Hydro Deluxe', 'Stylage Hydro'] },
    ],
  },
];

/** Hotspot position as CSS percentages of the image box. */
export function hotspotPct(z: Pick<FaceZone, 'hotspot'>): { left: string; top: string } {
  return {
    left: `${((z.hotspot.x / FACE_VIEWBOX.w) * 100).toFixed(3)}%`,
    top: `${((z.hotspot.y / FACE_VIEWBOX.h) * 100).toFixed(3)}%`,
  };
}

export function zoneById(id: ZoneId): FaceZone {
  return FACE_ZONES.find((z) => z.id === id) ?? FACE_ZONES[0];
}
