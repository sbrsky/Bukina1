/**
 * Seam — organic section boundary (DESIGN.md §3.5, §4.4). FOUNDATION-owned primitive.
 *
 * Render it as the element IMMEDIATELY BEFORE the incoming section (a sibling), filled with the
 * incoming section's colour. It pulls itself up over the end of the previous section
 * (`margin-top: calc(-1 * height + 1px)`, height clamp(32px, 6vw, 96px)), so no boundary on /v2 is a
 * straight full-width colour change. Static: never animated or scroll-linked.
 *
 *   <Seam seed={11} fill="oat" />      // proof band top
 *   <section className="v2-section …" style={{ background: 'var(--v2-oat)' }}>…</section>
 *   <Seam seed={12} fill="paper" />    // proof band bottom (incoming = paper)
 *
 * Seeds (§3.5): proof top 11, proof bottom 12, booking top 21, colophon top 31.
 */
import { useMemo } from 'react';
import { seamPath } from '../lib/organic';

export type SeamFill = 'paper' | 'oat' | 'ink' | 'blush' | 'plum';

export interface SeamProps {
  seed: number;
  /** token name of the incoming section's background, or any CSS colour */
  fill: SeamFill | (string & {});
  className?: string;
}

const TOKENS: Record<SeamFill, string> = {
  paper: 'var(--v2-paper)',
  oat: 'var(--v2-oat)',
  ink: 'var(--v2-ink)',
  blush: 'var(--v2-blush)',
  plum: 'var(--v2-plum)',
};

export default function Seam({ seed, fill, className }: SeamProps) {
  const d = useMemo(() => seamPath(seed), [seed]);
  const color = (TOKENS as Record<string, string>)[fill] ?? fill;
  return (
    <svg
      className={className ? `v2-seam ${className}` : 'v2-seam'}
      viewBox="0 0 1000 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} fill={color} />
    </svg>
  );
}
