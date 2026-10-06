/**
 * Pencil — the cosmetologist's rouge pencil stroke (DESIGN.md §1, §5). FOUNDATION-owned primitive.
 *
 * An inline SVG whose paths draw with `pathLength` 0 → 1 (motion/react), once, ease-out; pre-drawn
 * under reduced motion. Strokes frame care (zone maps, arrows, underlines) — never "flaws" (§11.10).
 *
 *   // drawn when scrolled into view
 *   <Pencil viewBox="0 0 1031 1280" d={zone.path} strokeWidth={4} />
 *   // controlled (e.g. the current chapter row, the selected atlas zone): draws when `active`
 *   <Pencil.Underline active={isCurrent} />
 *
 * Decorative by default (aria-hidden). Style via props or the CSS vars --v2-pencil-color / --v2-pencil-w.
 */
import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EASE_OUT, usePencilDraw } from '../lib/useRevealOnce';

export interface PencilProps {
  /** one path or several (drawn in order with `stagger`) */
  d: string | string[];
  viewBox?: string;
  width?: number | string;
  height?: number | string;
  /** 'inView' (default) draws on scroll into view; 'mount' on mount; 'none' = static, already drawn */
  draw?: 'inView' | 'mount' | 'none';
  /** controlled mode: when defined, the stroke draws in (true) / out (false) instead of `draw` */
  active?: boolean;
  duration?: number;
  delay?: number;
  stagger?: number;
  /** stroke width in viewBox units (default 2.5) */
  strokeWidth?: number;
  color?: string;
  dashed?: boolean | string;
  /** keep the stroke width constant when the SVG is scaled (vector-effect: non-scaling-stroke) */
  nonScaling?: boolean;
  preserveAspectRatio?: string;
  className?: string;
  style?: CSSProperties;
}

function PencilBase({
  d,
  viewBox = '0 0 100 100',
  width,
  height,
  draw = 'inView',
  active,
  duration = 0.9,
  delay = 0,
  stagger = 0.12,
  strokeWidth = 2.5,
  color,
  dashed,
  nonScaling,
  preserveAspectRatio,
  className,
  style,
}: PencilProps) {
  const reduce = useReducedMotion();
  const paths = Array.isArray(d) ? d : [d];
  const inView = usePencilDraw({ duration, delay, trigger: draw === 'mount' ? 'mount' : 'inView' });
  const dash = dashed === true ? '10 9' : dashed || undefined;

  const common = {
    fill: 'none',
    stroke: color ?? 'var(--v2-pencil-color, var(--v2-rouge))',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: nonScaling ? ('non-scaling-stroke' as const) : undefined,
    // pathLength drawing replaces the dash pattern while drawing; a dashed stroke is static-faded instead
    strokeDasharray: dash,
  };

  return (
    <svg
      className={className ? `v2-pencil ${className}` : 'v2-pencil'}
      viewBox={viewBox}
      width={width}
      height={height}
      preserveAspectRatio={preserveAspectRatio}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((p, i) => {
        if (draw === 'none' && active === undefined) return <path key={i} d={p} {...common} />;
        if (dash) {
          // dashed strokes fade in (pathLength would erase the dash pattern)
          const on = active ?? true;
          return (
            <motion.path
              key={i}
              d={p}
              {...common}
              initial={reduce || active !== undefined ? false : { opacity: 0 }}
              animate={active !== undefined ? { opacity: on ? 1 : 0 } : undefined}
              whileInView={active === undefined ? { opacity: 1 } : undefined}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: reduce ? 0 : 0.4, delay: delay + i * stagger }}
            />
          );
        }
        if (active !== undefined) {
          return (
            <motion.path
              key={i}
              d={p}
              {...common}
              initial={false}
              animate={active ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : {
                      pathLength: { duration, delay: delay + i * stagger, ease: EASE_OUT },
                      opacity: { duration: 0.01, delay: active ? delay + i * stagger : duration },
                    }
              }
            />
          );
        }
        const t = 'transition' in inView ? inView.transition : undefined;
        return (
          <motion.path
            key={i}
            d={p}
            {...common}
            {...inView}
            transition={
              t && i > 0
                ? {
                    pathLength: { duration, delay: delay + i * stagger, ease: EASE_OUT },
                    opacity: { duration: 0.01, delay: delay + i * stagger },
                  }
                : t
            }
          />
        );
      })}
    </svg>
  );
}

/** A slightly wobbly underline, viewBox 0 0 100 6, stretched to its container's width. */
export const UNDERLINE_D = 'M1 3.6 C18 2.4 34 4.6 52 3.4 S84 2.6 99 3.8';

export interface UnderlineProps extends Omit<PencilProps, 'd' | 'viewBox' | 'preserveAspectRatio'> {
  d?: string;
}

/** Pencil underline (current chapter row, current nav item, key-word underline). 2 px rouge. */
function Underline({ d = UNDERLINE_D, duration = 0.4, strokeWidth = 2, className, style, ...rest }: UnderlineProps) {
  return (
    <PencilBase
      d={d}
      viewBox="0 0 100 6"
      preserveAspectRatio="none"
      duration={duration}
      strokeWidth={strokeWidth}
      className={className ? `v2-pencil--underline ${className}` : 'v2-pencil--underline'}
      style={{ display: 'block', width: '100%', height: 6, ...style }}
      {...rest}
    />
  );
}

type PencilComponent = typeof PencilBase & { Underline: typeof Underline };
const Pencil = PencilBase as PencilComponent;
Pencil.Underline = Underline;

export default Pencil;
export { Underline as PencilUnderline };
