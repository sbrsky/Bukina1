/**
 * MechanismArt — static inline-SVG mechanism illustrations, the film's lenses as page prints
 * (DESIGN.md §5.5; MOTION.md §7.2 C4 / C5 / C6 final states). PAGE-A-owned, used by page-B's Spread.
 *
 *   kind 'pdrn-collagen' — Spread A: the PDRN double strand (plum + rouge, 6 ink-60 rungs) over
 *                          8 collagen fibres in their organised (straight) end state; oat interior.
 *   kind 'droplet-cells' — a pencil droplet landing on 7 plump cells (pebble outlines) with two
 *                          ripples — rouge + ink line work on oat (review round 2: the glossy blush
 *                          bubbles read as clip-art next to the page's fine pencil strokes).
 *   kind 'clippings'     — Spread C: three taped paper clippings «пилинг + мезо + маска» with rouge
 *                          «+» glyphs (labels follow the page language); reads on oat or paper.
 *
 * Contract for the consumer: the SVG fills its box (`width/height: 100%`). The two lens kinds use
 * `preserveAspectRatio="xMidYMid slice"` and paint their own interior, so any clip (category
 * token border-radius, a print) shows a full lens; 'clippings' uses `meet` (text is never cropped)
 * on a transparent ground. viewBox is 240 × 200 for all three. Decorative (aria-hidden) unless
 * `title` is given (then role="img" + <title>). Colours are tokens only (MechanismArt.css).
 */
import { useId } from 'react';
import { useLang } from '../../../context/LangContext';
import './MechanismArt.css';

export type MechanismKind = 'pdrn-collagen' | 'droplet-cells' | 'clippings';

export interface MechanismArtProps {
  kind: MechanismKind;
  className?: string;
  /** accessible name; omit for decorative use */
  title?: string;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** A sine strand across the lens: y = cy + amp·sin(2π(x − x0)/period + phase), sampled every 4 units. */
function strand(cy: number, amp: number, phase: number, x0 = 18, x1 = 222, period = 100): string {
  let d = '';
  for (let x = x0; x <= x1; x += 4) {
    const y = cy + amp * Math.sin((2 * Math.PI * (x - x0)) / period + phase);
    d += `${d ? 'L' : 'M'}${x} ${r1(y)}`;
  }
  return d;
}

const STRAND_A = strand(66, 15, 0);
const STRAND_B = strand(66, 15, Math.PI);
/** rungs between the strands, away from the crossings (x = 18, 68, 118, 168, 218) */
const RUNGS = [34, 52, 84, 102, 134, 152].map((x) => {
  const s = 15 * Math.sin((2 * Math.PI * (x - 18)) / 100);
  return `M${x} ${r1(66 + s * 0.82)}L${x} ${r1(66 - s * 0.82)}`;
});
/** organised collagen: 8 near-parallel fibres, lengths staggered (seeded by index, no randomness) */
const FIBRES = Array.from({ length: 8 }, (_, k) => {
  const y = 128 + k * 7.4;
  const xa = 30 + ((k * 37) % 23);
  const xb = 212 - ((k * 53) % 29);
  return `M${xa} ${r1(y)}C${r1(xa + 50)} ${r1(y - 1.6)} ${r1(xb - 50)} ${r1(y + 1.6)} ${xb} ${r1(y)}`;
});

/** 7 plump cells (pebble-ish blobs): [cx, cy, rx, ry, rotate°] */
const CELLS: [number, number, number, number, number][] = [
  [58, 150, 31, 25, -12],
  [118, 160, 28, 23, 8],
  [178, 148, 31, 25, -4],
  [72, 104, 22, 18, 14],
  [168, 106, 22, 18, -10],
  [216, 108, 19, 16, 6],
  [24, 108, 18, 15, -6],
];
/** pebble-like closed blob around an ellipse (4 cubic segments, slightly asymmetric) */
function blob(cx: number, cy: number, rx: number, ry: number): string {
  const k = 0.56;
  return (
    `M${cx} ${r1(cy - ry)}` +
    `C${r1(cx + rx * k * 1.1)} ${r1(cy - ry)} ${r1(cx + rx)} ${r1(cy - ry * k)} ${r1(cx + rx)} ${cy}` +
    `C${r1(cx + rx)} ${r1(cy + ry * k * 1.15)} ${r1(cx + rx * k)} ${r1(cy + ry)} ${cx} ${r1(cy + ry)}` +
    `C${r1(cx - rx * k * 1.2)} ${r1(cy + ry)} ${r1(cx - rx)} ${r1(cy + ry * k)} ${r1(cx - rx)} ${cy}` +
    `C${r1(cx - rx)} ${r1(cy - ry * k * 0.9)} ${r1(cx - rx * k)} ${r1(cy - ry)} ${cx} ${r1(cy - ry)}Z`
  );
}

const CLIP_LABELS: Record<string, [string, string, string]> = {
  ru: ['пилинг', 'мезо', 'маска'],
  lv: ['pīlings', 'mezo', 'maska'],
  en: ['peel', 'meso', 'mask'],
};

function Pdrn() {
  return (
    <>
      <rect className="v2-mech__oat" x="-40" y="-40" width="320" height="280" />
      {FIBRES.map((d, i) => (
        <path key={i} className="v2-mech__fibre" d={d} />
      ))}
      <path className="v2-mech__arrow" d="M120 92c-3 8-2 15 2 22m-6.5-5.5 6.5 6.5 4-8.2" />
      {RUNGS.map((d, i) => (
        <path key={i} className="v2-mech__rung" d={d} />
      ))}
      <path className="v2-mech__strand v2-mech__strand--plum" d={STRAND_A} />
      <path className="v2-mech__strand v2-mech__strand--rouge" d={STRAND_B} />
    </>
  );
}

function DropletCells() {
  return (
    <>
      <rect className="v2-mech__oat" x="-40" y="-40" width="320" height="280" />
      <ellipse className="v2-mech__ripple v2-mech__ripple--rouge" cx="120" cy="96" rx="62" ry="13" />
      <ellipse className="v2-mech__ripple v2-mech__ripple--ink" cx="120" cy="96" rx="36" ry="8" />
      {CELLS.map(([cx, cy, rx, ry, rot], i) => (
        <g key={i} transform={`rotate(${rot} ${cx} ${cy})`}>
          <path className="v2-mech__cell" d={blob(cx, cy, rx, ry)} />
          {/* a nucleus-like inner stroke: «plump», drawn, not shaded */}
          <path
            className="v2-mech__cellcore"
            d={`M${r1(cx - rx * 0.32)} ${r1(cy + ry * 0.12)}q${r1(rx * 0.3)} ${r1(-ry * 0.42)} ${r1(rx * 0.62)} ${r1(-ry * 0.06)}`}
          />
        </g>
      ))}
      <path className="v2-mech__droprim" d="M120 18c-9 15-17 26-17 39a17 17 0 0 0 34 0c0-13-8-24-17-39Z" />
      <path className="v2-mech__dropline" d="M112.5 55c0 5.5 3.4 9.4 8.6 10.4" />
    </>
  );
}

function Clippings({ lang }: { lang: string }) {
  const labels = CLIP_LABELS[lang] ?? CLIP_LABELS.ru;
  const rows: { y: number; tilt: number; x: number }[] = [
    { y: 18, tilt: -3, x: 34 },
    { y: 80, tilt: 2, x: 52 },
    { y: 142, tilt: -1.5, x: 40 },
  ];
  return (
    <>
      {rows.map((r, i) => (
        <g key={i} transform={`rotate(${r.tilt} ${r.x + 75} ${r.y + 20})`}>
          <rect className="v2-mech__clipshadow" x={r.x + 1} y={r.y + 2.5} width="150" height="40" rx="1.5" />
          <rect className="v2-mech__clip" x={r.x} y={r.y} width="150" height="40" rx="1.5" />
          <text className="v2-mech__cliptext" x={r.x + 16} y={r.y + 26.5}>
            {labels[i]}
          </text>
          <path
            className="v2-mech__tape"
            d={`M${r.x + 118} ${r.y - 7}l26 1.2-1 2.2 1.4 2.4-1.2 2.2 1 2.4-26-1.2 1-2.3-1.3-2.4 1.2-2.2Z`}
          />
        </g>
      ))}
      <text className="v2-mech__plus" x="14" y="84">
        +
      </text>
      <text className="v2-mech__plus" x="20" y="146">
        +
      </text>
    </>
  );
}

export default function MechanismArt({ kind, className, title }: MechanismArtProps) {
  const { lang } = useLang();
  const uid = useId().replace(/:/g, '');
  const cls = ['v2-mech', `v2-mech--${kind}`, className].filter(Boolean).join(' ');
  const a11y = title ? { role: 'img' as const, 'aria-labelledby': `${uid}-t` } : { 'aria-hidden': true as const };
  return (
    <svg
      className={cls}
      viewBox="0 0 240 200"
      preserveAspectRatio={kind === 'clippings' ? 'xMidYMid meet' : 'xMidYMid slice'}
      focusable="false"
      data-kind={kind}
      {...a11y}
    >
      {title && <title id={`${uid}-t`}>{title}</title>}
      {kind === 'pdrn-collagen' && <Pdrn />}
      {kind === 'droplet-cells' && <DropletCells />}
      {kind === 'clippings' && <Clippings lang={lang} />}
    </svg>
  );
}
