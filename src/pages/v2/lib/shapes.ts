/**
 * shapes.ts — the 7 category shape tokens + the hero token (DESIGN.md §3.4).
 * One vocabulary for page and film: image masks, price-row thumbnails, atlas/spread prints,
 * rail pips and the film's #field blob keyframes (MOTION.md §4.5).
 *
 * CSS mirror: `[data-shape="<id>"]` in v2.css sets `--shape` / `--shape-alt`; `.v2-shape` applies
 * `border-radius: var(--shape)` and `.v2-morph` swaps to `--shape-alt` on hover/focus (pointer-fine).
 * Keep the two in sync — `SHAPES` here is the source of truth.
 */
import type { CSSProperties } from 'react';

export type CategoryId =
  | 'skincare'
  | 'peels'
  | 'mesotherapy'
  | 'biorevitalization'
  | 'biostimulation'
  | 'complex'
  | 'consultation';

export type ShapeId = CategoryId | 'hero';

/** Category ids in FILM order (chapters 01–07). Use this for every ordered list on the page. */
export const CATEGORY_ORDER: readonly CategoryId[] = [
  'skincare',
  'peels',
  'mesotherapy',
  'biorevitalization',
  'biostimulation',
  'complex',
  'consultation',
] as const;

/** 8-value percentage radii. */
export const SHAPES: Record<ShapeId, string> = {
  skincare: '70% 30% 52% 48% / 40% 62% 38% 60%', // petal
  peels: '50% 50% 50% 50% / 38% 38% 62% 62%', // lens
  mesotherapy: '58% 42% 50% 50% / 64% 64% 36% 36%', // drop
  biorevitalization: '62% 38% 54% 46% / 48% 58% 42% 52%', // pebble
  biostimulation: '46% 54% 38% 62% / 55% 41% 59% 45%', // cell
  complex: '40% 60% 60% 40% / 60% 40% 60% 40%', // cloud
  consultation: '52% 48% 66% 34% / 47% 66% 34% 53%', // seed
  hero: '54% 46% 42% 58% / 48% 56% 44% 52%', // atlas portrait, film rest blob
};

export const SHAPE_NAMES: Record<ShapeId, string> = {
  skincare: 'petal',
  peels: 'lens',
  mesotherapy: 'drop',
  biorevitalization: 'pebble',
  biostimulation: 'cell',
  complex: 'cloud',
  consultation: 'seed',
  hero: 'hero',
};

/** Film C4 "dehydrated cell" start state (MOTION.md §7.2 C4). */
export const CRINKLED = '38% 62% 30% 70% / 64% 30% 70% 36%';

export interface RadiusParts {
  h: [number, number, number, number];
  v: [number, number, number, number];
}

/** Parse an 8-value `a% b% c% d% / e% f% g% h%` token. */
export function parseRadius(token: string): RadiusParts {
  const [hs, vs] = token.split('/').map((s) =>
    s
      .trim()
      .split(/\s+/)
      .map((v) => parseFloat(v)),
  );
  return { h: hs as RadiusParts['h'], v: vs as RadiusParts['v'] };
}

const fmt = (parts: RadiusParts, unit = '%') =>
  `${parts.h.map((n) => `${n}${unit}`).join(' ')} / ${parts.v.map((n) => `${n}${unit}`).join(' ')}`;

/**
 * Rotate the 8 values by `steps` corner positions (TL→TR→BR→BL), i.e. the blob turns by 90° per
 * step. Used for the hover/focus morph (§3.4): `transition: border-radius 900ms var(--v2-ease-morph)`.
 */
export function rotateRadius(token: string, steps = 1): string {
  const { h, v } = parseRadius(token);
  const rot = <T,>(a: T[]) => {
    const n = a.length;
    const s = ((steps % n) + n) % n;
    return [...a.slice(n - s), ...a.slice(0, n - s)];
  };
  return fmt({ h: rot(h) as RadiusParts['h'], v: rot(v) as RadiusParts['v'] });
}

export const SHAPES_ALT: Record<ShapeId, string> = Object.fromEntries(
  (Object.keys(SHAPES) as ShapeId[]).map((k) => [k, rotateRadius(SHAPES[k])]),
) as Record<ShapeId, string>;

/**
 * Convert a token to px radii for a box (MOTION.md §4.5): horizontal % × width, vertical % × height.
 * e.g. radiiPx(SHAPES.hero, 840, 1060) → "453.6px 386.4px 352.8px 487.2px / 508.8px 593.6px 466.4px 551.2px"
 */
export function radiiPx(token: string, boxW: number, boxH: number, unit = 'px'): string {
  const { h, v } = parseRadius(token);
  const r = (n: number) => Math.round(n * 100) / 100;
  return fmt(
    {
      h: h.map((p) => r((p / 100) * boxW)) as RadiusParts['h'],
      v: v.map((p) => r((p / 100) * boxH)) as RadiusParts['v'],
    },
    unit,
  );
}

/** Inline style carrying the token as CSS custom properties (use with `.v2-shape` / `.v2-morph`). */
export function shapeStyle(id: ShapeId): CSSProperties {
  return { ['--shape' as string]: SHAPES[id], ['--shape-alt' as string]: SHAPES_ALT[id] } as CSSProperties;
}

export function isCategoryId(id: string): id is CategoryId {
  return (CATEGORY_ORDER as readonly string[]).includes(id);
}
