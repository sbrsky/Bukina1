/**
 * Tape — a 64 × 22 strip of matte tape with seeded torn ends (DESIGN.md §3.4; review round 2:
 * darker translucent fill, hair edge, multiply, a drop shadow that follows the torn shape — the
 * torn clip sits on the inner strip so the outer span can carry the shadow).
 * FOUNDATION-owned primitive. Absolutely positioned: place it with top/left/right/bottom (or style)
 * inside a `position: relative` parent (a print, a card). Decorative → aria-hidden.
 * Tilt = the parent's tilt token ± 4° (default: derived from the seed in −4…+4).
 * `decor` marks tape that is hidden below 480 px (keep exactly one non-decor tape per section, §4.6).
 *
 *   <div className="v2-print v2-tilt" style={{ '--tilt': 3 }}>
 *     <Tape seed={5} top={-11} left="calc(50% - 32px)" />
 *     <picture>…</picture>
 *   </div>
 */
import { useMemo, type CSSProperties } from 'react';
import { mulberry32, tornEdge } from '../lib/organic';

export interface TapeProps {
  seed: number;
  /** degrees; default seeded in −4…+4 */
  tilt?: number;
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  width?: number;
  height?: number;
  decor?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function Tape({ seed, tilt, top, left, right, bottom, width, height, decor, className, style }: TapeProps) {
  const clipPath = useMemo(() => tornEdge(seed), [seed]);
  const deg = tilt ?? Math.round((mulberry32(seed * 7 + 3)() * 8 - 4) * 10) / 10;
  const cls = ['v2-tape', decor && 'v2-tape--decor', className].filter(Boolean).join(' ');
  return (
    <span
      className={cls}
      aria-hidden="true"
      style={{ top, left, right, bottom, width, height, '--tilt': deg, ...style } as CSSProperties}
    >
      <span className="v2-tape__strip" style={{ clipPath }} />
    </span>
  );
}
