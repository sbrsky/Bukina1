/**
 * useRevealOnce.ts — shared whileInView reveal presets (DESIGN.md §5 motion notes, §3.6 tokens).
 *
 * Every reveal on /v2 runs ONCE, animates only transform / opacity / clip-path / pathLength, and is
 * static under reduced motion (the hook returns `initial: false` so content is painted at rest).
 *
 *   const reveal = useRevealOnce('fadeUp', { delay: 0.25 });
 *   <motion.p {...reveal}>…</motion.p>
 *
 *   const draw = usePencilDraw({ duration: 0.9 });
 *   <motion.path d={…} {...draw} />
 *
 * For staggered children: `const parent = useRevealOnce('stagger', { stagger: 0.07 })` on the
 * container and `{...childReveal('lineUp')}` (no viewport) on each child.
 */
import { useReducedMotion, type Transition, type Variants } from 'motion/react';

// ── tokens (mirror of v2.css §3.6) ──────────────────────────────────────────────
export const EASE_OUT = [0.16, 1, 0.3, 1] as const; // --v2-ease-out (expo-out)
export const EASE_OUT_SOFT = [0.22, 1, 0.36, 1] as const; // --v2-ease-out-soft
export const EASE_INOUT = [0.65, 0, 0.35, 1] as const; // --v2-ease-inout
export const EASE_MORPH = [0.3, 0.7, 0.2, 1] as const; // --v2-ease-morph
export const DUR = { d1: 0.2, d2: 0.35, d3: 0.5, d4: 0.8, d5: 0.9 } as const;

export type RevealKind = 'fadeUp' | 'fade' | 'rise' | 'lineUp' | 'clipLR' | 'scaleIn' | 'stagger';

/** Variants use the labels `hidden` → `shown`. */
export const REVEAL_VARIANTS: Record<RevealKind, Variants> = {
  /** opacity + y 12 px (trust line, index, cards) */
  fadeUp: { hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0 } },
  fade: { hidden: { opacity: 0 }, shown: { opacity: 1 } },
  /** portrait prints: opacity + y 24 px (Letter §5.7) */
  rise: { hidden: { opacity: 0, y: 24 }, shown: { opacity: 1, y: 0 } },
  /** display lines inside an `overflow: clip` wrapper (.v2-line-mask): y 130 % → 0 (the mask keeps
   *  .22em of descender room below the line, so 105 % would leave the hidden line's caps peeking) */
  lineUp: { hidden: { y: '130%' }, shown: { y: '0%' } },
  /** slips / signature: clip-path L→R */
  clipLR: { hidden: { clipPath: 'inset(0 100% 0 0)' }, shown: { clipPath: 'inset(0 0% 0 0)' } },
  scaleIn: { hidden: { opacity: 0, scale: 0.6 }, shown: { opacity: 1, scale: 1 } },
  /** container that only orchestrates children */
  stagger: { hidden: {}, shown: {} },
};

const DEFAULT_TRANSITION: Record<RevealKind, Transition> = {
  fadeUp: { duration: DUR.d3, ease: EASE_OUT },
  fade: { duration: DUR.d2, ease: EASE_OUT_SOFT },
  rise: { duration: DUR.d4, ease: EASE_OUT },
  lineUp: { duration: DUR.d4, ease: EASE_OUT },
  clipLR: { duration: DUR.d5, ease: EASE_OUT_SOFT },
  scaleIn: { duration: DUR.d2, ease: [0.34, 1.56, 0.64, 1] },
  stagger: {},
};

export interface RevealOptions {
  delay?: number;
  duration?: number;
  /** Stagger children (only meaningful with kind 'stagger' or a parent of variant children). */
  stagger?: number;
  /** IntersectionObserver amount (0–1). Default .3 */
  amount?: number | 'some' | 'all';
  /** Root margin. Default triggers a little before the element is fully in view. */
  margin?: string;
}

export interface RevealProps {
  initial: false | 'hidden';
  whileInView?: 'shown';
  animate?: 'shown';
  viewport?: { once: true; amount?: number | 'some' | 'all'; margin?: string };
  variants: Variants;
  transition: Transition;
}

function build(kind: RevealKind, o: RevealOptions): Transition {
  const base = DEFAULT_TRANSITION[kind];
  const t: Transition = { ...base };
  if (o.duration !== undefined) t.duration = o.duration;
  if (o.delay !== undefined) t.delay = o.delay;
  if (o.stagger !== undefined) {
    t.staggerChildren = o.stagger;
    if (o.delay !== undefined) t.delayChildren = o.delay;
  }
  return t;
}

/** whileInView once. Static (no initial hidden state) under prefers-reduced-motion. */
export function useRevealOnce(kind: RevealKind = 'fadeUp', o: RevealOptions = {}): RevealProps {
  const reduce = useReducedMotion();
  const variants = REVEAL_VARIANTS[kind];
  if (reduce) return { initial: false, animate: 'shown', variants, transition: { duration: 0 } };
  return {
    initial: 'hidden',
    whileInView: 'shown',
    viewport: { once: true, amount: o.amount ?? 0.3, margin: o.margin ?? '0px 0px -8% 0px' },
    variants,
    transition: build(kind, o),
  };
}

/** Same presets, played on mount (cover H1 / trust line — never wait for scroll above the fold). */
export function useRevealOnMount(kind: RevealKind = 'fadeUp', o: RevealOptions = {}): RevealProps {
  const reduce = useReducedMotion();
  const variants = REVEAL_VARIANTS[kind];
  if (reduce) return { initial: false, animate: 'shown', variants, transition: { duration: 0 } };
  return { initial: 'hidden', animate: 'shown', variants, transition: build(kind, o) };
}

/** Child of a staggering parent: variants only (the parent drives `hidden` → `shown`). */
export function childReveal(kind: RevealKind = 'fadeUp', o: Omit<RevealOptions, 'stagger' | 'amount' | 'margin'> = {}) {
  return { variants: REVEAL_VARIANTS[kind], transition: build(kind, o) };
}

export interface PencilDrawOptions {
  duration?: number;
  delay?: number;
  /** Draw when scrolled into view (default) or immediately on mount. */
  trigger?: 'inView' | 'mount';
  amount?: number;
}

/**
 * Pencil stroke draw: `pathLength` 0 → 1 (ease-out), once. Pre-drawn under reduced motion.
 * Spread onto a `motion.path`.
 */
export function usePencilDraw(o: PencilDrawOptions = {}) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    shown: { pathLength: 1, opacity: 1 },
  };
  if (reduce) return { initial: false as const, animate: 'shown' as const, variants };
  const transition: Transition = {
    pathLength: { duration: o.duration ?? DUR.d5, delay: o.delay ?? 0, ease: EASE_OUT },
    opacity: { duration: 0.01, delay: o.delay ?? 0 },
  };
  if (o.trigger === 'mount') return { initial: 'hidden' as const, animate: 'shown' as const, variants, transition };
  return {
    initial: 'hidden' as const,
    whileInView: 'shown' as const,
    viewport: { once: true, amount: o.amount ?? 0.6 },
    variants,
    transition,
  };
}
