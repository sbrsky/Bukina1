/**
 * heroChapters.ts — the hero film's chapter table, page side (DESIGN.md §6, §8).
 *
 * Mirrors MOTION.md §7.3 `CHAPTERS` EXACTLY. scripts/hf-hero-build.ts asserts that `CHAPTERS` in
 * videos/skinlab-hero/scenes.js deep-equals this array and fails the build on any mismatch —
 * change both or neither.
 */
import type { CategoryId } from '../lib/shapes';

export interface HeroChapter {
  /** 1-based chapter number, shown as «0N» */
  n: number;
  id: CategoryId;
  /** film time in seconds where the chapter starts (seek target) */
  start: number;
}

export const CHAPTERS: HeroChapter[] = [
  { n: 1, id: 'skincare', start: 3.9 },
  { n: 2, id: 'peels', start: 7.1 },
  { n: 3, id: 'mesotherapy', start: 10.3 },
  { n: 4, id: 'biorevitalization', start: 13.5 },
  { n: 5, id: 'biostimulation', start: 16.7 },
  { n: 6, id: 'complex', start: 19.9 },
  { n: 7, id: 'consultation', start: 25.6 },
];

/** Recap window [start, end): no index row is current (MOTION.md §7.1 S8). */
export const RECAP = [23.1, 25.6] as const;
/** The film's CTA pill appears here → the cover «Записаться» pill pulses once (DESIGN.md §5.2.3). */
export const CTA_PILL_T = 26.95;
/** Face-map poster frame (still mode / reduced motion). */
export const POSTER_MAP_T = 24.5;
/** Film length in seconds (930 frames @ 30 fps). */
export const DURATION = 31;
export const FPS = 30;

/** Hook window [0, first chapter): no current row. */
export const HOOK_END = CHAPTERS[0].start;

/**
 * Index into CHAPTERS of the chapter playing at film time `t`, or -1 during the hook
 * [0, 3.90) and the recap [23.10, 25.60). Chapter 7 runs to the end of the film.
 */
export function chapterIndexAt(t: number): number {
  if (!Number.isFinite(t) || t < HOOK_END) return -1;
  if (t >= RECAP[0] && t < RECAP[1]) return -1;
  for (let i = CHAPTERS.length - 1; i >= 0; i--) {
    if (t >= CHAPTERS[i].start) return i;
  }
  return -1;
}

/** Seek target (seconds) for chapter number n (1-based); 0 for an unknown n. */
export function chapterStart(n: number): number {
  const c = CHAPTERS.find((ch) => ch.n === n);
  return c ? c.start : 0;
}
