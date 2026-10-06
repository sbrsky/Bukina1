/**
 * Slip — a paper slip that carries any text placed over a photo (DESIGN.md §1, §4.3).
 * FOUNDATION-owned primitive. Paper (or oat) rectangle, padding .35em .6em, --v2-shadow-slip,
 * 2 px radius, optional tilt (clamped to ±3° — information-bearing elements never tilt more;
 * halved automatically below 768 px via --v2-tilt-k).
 *
 *   <Slip tiltIndex={i}>Ближайшее окно: чт, 9 окт · 14:00</Slip>
 *   <Slip as="p" tone="oat" tilt={-1.5}>…</Slip>
 */
import type { CSSProperties, ElementType, ReactNode } from 'react';
import { TILTS } from '../lib/organic';

export interface SlipProps {
  children?: ReactNode;
  as?: ElementType;
  tone?: 'paper' | 'oat';
  /** degrees, clamped to ±3 */
  tilt?: number;
  /** alternatively an index into TILTS (−2.5, 1.5, −1, 3) */
  tiltIndex?: number;
  className?: string;
  style?: CSSProperties;
  id?: string;
  [attr: `aria-${string}`]: string | boolean | undefined;
  [data: `data-${string}`]: string | number | boolean | undefined;
}

export default function Slip({
  children,
  as: Tag = 'span',
  tone = 'paper',
  tilt,
  tiltIndex,
  className,
  style,
  ...rest
}: SlipProps) {
  const raw = tilt ?? (tiltIndex !== undefined ? TILTS[((tiltIndex % 4) + 4) % 4] : 0);
  const deg = Math.max(-3, Math.min(3, raw));
  const cls = ['v2-slip', tone === 'oat' && 'v2-slip--oat', deg !== 0 && 'v2-tilt', className].filter(Boolean).join(' ');
  return (
    <Tag className={cls} style={deg !== 0 ? ({ '--tilt': deg, ...style } as CSSProperties) : style} {...rest}>
      {children}
    </Tag>
  );
}
