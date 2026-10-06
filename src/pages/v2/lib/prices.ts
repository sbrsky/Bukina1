/**
 * prices.ts — price & name helpers (DESIGN.md §8). Pure functions, no React.
 *
 * The SAME parser is used by scripts/hf-hero-build.ts to bake the film's prices, so the film
 * and the page always agree (MOTION.md §1.1). Keep it dependency-free.
 * Note: `PRICE_RE` of §8 (/(\d+(?:[.,]\d+)?)/, first number anywhere) was replaced by an
 * €-anchored parser — see parsePrice().
 */
import type { CategoryId } from './shapes';

export interface PricedTreatment {
  name?: string;
  price?: string;
  [key: string]: unknown;
}
export interface PricedCategory {
  id?: string;
  treatments?: PricedTreatment[];
  [key: string]: unknown;
}

/** a number group: digits with thousands separators (space, nbsp, narrow nbsp, ., ', ,) */
const NUM = "\\d(?:[\\d.,'\\u00a0\\u202f ]*\\d)?";
/** «40–60 €», «от 40 до 60 €» → the lower bound is the price */
const RANGE_RE = new RegExp(`(${NUM})\\s*(?:[–—-]|до|līdz|to)\\s*(?:${NUM})\\s*€`, 'iu');
/** the amount right before «€» («1 200 €», «3 процедуры — 300 €» → 300) */
const EURO_AFTER_RE = new RegExp(`(${NUM})\\s*€`, 'u');
/** the amount right after «€» («€1,200») */
const EURO_BEFORE_RE = new RegExp(`€\\s*(${NUM})`, 'u');
/** no € sign at all: the first number («100») */
const FIRST_RE = new RegExp(`(${NUM})`, 'u');
const ALL_NUMS_RE = /\d+(?:[.,]\d+)?/g;

/**
 * «1 200» / «1.200» / «1,200» → 1200; «39,90» / «39.9» → 39.9. A trailing [.,] + 1–2 digits is a
 * decimal part; every other separator is a thousands separator.
 */
function toNumber(raw: string): number | null {
  const t = raw.replace(/[\s\u00a0\u202f']/g, '');
  const m = t.match(/^(.*?)[.,](\d{1,2})$/);
  const int = (m ? m[1] : t).replace(/[.,]/g, '');
  if (!/^\d+$/.test(int)) return null;
  const n = parseFloat(m ? `${int}.${m[2]}` : int);
  return Number.isFinite(n) ? n : null;
}

/**
 * The euro amount of a CMS price string (DESIGN.md §8), rounded to an integer, or null.
 * The number ADJACENT to «€» wins — never just the first digits in the string (review round 2:
 * «3 процедуры — 300 €» used to give 3, «1 200 €» gave 1). Ranges give their lower bound.
 * Without a «€» the first number is used. «от 110 €» → 110, «65 €» → 65, «39,90 €» → 40,
 * «€1,200» → 1200, «курс 5 × 60 €» → 60, «по запросу» → null.
 */
export function parsePrice(price: string | number | null | undefined): number | null {
  if (typeof price === 'number') return Number.isFinite(price) ? Math.round(price) : null;
  if (!price) return null;
  const s = String(price);
  const m = s.match(RANGE_RE) ?? s.match(EURO_AFTER_RE) ?? s.match(EURO_BEFORE_RE) ?? (s.includes('€') ? null : s.match(FIRST_RE));
  if (!m) return null;
  const n = toNumber(m[1]);
  return n === null ? null : Math.round(n);
}

/**
 * true when a price string holds more than one number group («3 процедуры — 300 €», «40–60 €»):
 * parsePrice() still picks the € amount, but such strings deserve a human look before they are
 * baked into the film (scripts/hf-hero-build.ts warns on them).
 */
export function isAmbiguousPrice(price: string | null | undefined): boolean {
  if (!price) return false;
  const groups = String(price).replace(/(\d)[\s\u00a0\u202f'.,](?=\d{3}\b)/g, '$1').match(ALL_NUMS_RE);
  return (groups?.length ?? 0) > 1;
}

/** Minimum parsed price of a category's treatments, or null if nothing parses (never 0). */
export function minPrice(cat: PricedCategory | null | undefined): number | null {
  let min: number | null = null;
  for (const t of cat?.treatments ?? []) {
    const p = parsePrice(t?.price);
    if (p !== null && p > 0 && (min === null || p < min)) min = p;
  }
  return min;
}

/** Minimum across several categories (mobile bar «от {minAll} €»). */
export function minPriceAll(cats: readonly (PricedCategory | null | undefined)[]): number | null {
  let min: number | null = null;
  for (const c of cats) {
    const p = minPrice(c);
    if (p !== null && (min === null || p < min)) min = p;
  }
  return min;
}

/** Map of category id → min price. */
export function minPriceMap(cats: readonly PricedCategory[]): Partial<Record<CategoryId, number>> {
  const out: Partial<Record<CategoryId, number>> = {};
  for (const c of cats) {
    const p = minPrice(c);
    if (c.id && p !== null) out[c.id as CategoryId] = p;
  }
  return out;
}

const NBSP = ' ';

/** Put a non-breaking space before «€» and after a short leading word («от», «no», «from»). */
export function nbspPrice(s: string): string {
  return s.replace(/\s+€/g, `${NBSP}€`).replace(/^(\S{1,4})\s+(?=\d)/, `$1${NBSP}`);
}

/**
 * «от 40 €» — `t('v2.price.from').replace('{p}', p)` with non-breaking spaces.
 * Pass the `t` from `useT()`. Returns '' for null so callers never print «от 0 €».
 */
export function formatFrom(p: number | null | undefined, t: (key: string) => string): string {
  if (p === null || p === undefined) return '';
  return nbspPrice(t('v2.price.from').replace('{p}', String(p)));
}

/** A treatment's own price string, normalised for display («от 110 €», «65 €»). */
export function formatPrice(price: string | null | undefined): string {
  return price ? nbspPrice(price.trim()) : '';
}

/**
 * Remove any parenthetical that mentions botox (DESIGN.md §8, §11.8).
 * «RRS Skin Relax (аналог ботокса)» → «RRS Skin Relax».
 */
export function sanitizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .replace(/\s*[(（][^()（）]*(?:ботокс|botox|botoks)[^()（）]*[)）]/giu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * «7 процедур» with real plural rules (Intl.PluralRules). Uses keys
 * `v2.prices.count.{zero|one|two|few|many|other}` (falls back to `.other`).
 */
export function formatCount(n: number, lang: string, t: (key: string) => string): string {
  let cat: Intl.LDMLPluralRule = 'other';
  try {
    cat = new Intl.PluralRules(lang).select(n);
  } catch {
    /* unknown locale → other */
  }
  const key = `v2.prices.count.${cat}`;
  let tpl = t(key);
  if (!tpl || tpl === key) tpl = t('v2.prices.count.other');
  return tpl.replace('{n}', String(n));
}

/** Find a treatment in a category by exact name (atlas/visit joins; a missing name → undefined). */
export function findTreatment<T extends PricedTreatment>(
  cat: { treatments?: T[] } | null | undefined,
  name: string,
): T | undefined {
  return cat?.treatments?.find((t) => t?.name === name);
}
