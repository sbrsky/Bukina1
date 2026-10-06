/**
 * FaceAtlas «Карта лица» (#atlas) — DESIGN.md §5.4. PAGE-A-owned.
 *
 * The interactive twin of the film: the cut-out face on a blush `hero` blob (the giant element),
 * an SVG overlay in SOURCE space (viewBox 0 0 1031 1280) with one rouge pencil mark per zone, and
 * an oat index card (−1.5°, taped — the tiny element) listing the zone's concerns and treatments.
 *
 * Tabs (WAI-ARIA APG, manual activation): ≥ 768 the 6 numbered hotspots ARE the tablist; on phones
 * a wrapping chip row is the tablist and the hotspots become small decorative markers (44 px
 * circles would collide on a 328 px face). Roving tabindex: arrows move, Home/End jump,
 * Enter/Space selects. Both stay in sync (aria-selected). Default zone: eyes.
 * Selecting draws the zone path (pathLength 0 → 1, 0.9 s) and crossfades the card
 * (AnimatePresence mode="wait", opacity + y 8 px, 0.35 s); pre-drawn / instant under reduced motion.
 * Data: data/faceZones.ts; treatments joined by EXACT name against useV2Categories() (useServices()
 * → servicesData); a missing name drops its row. Each row links to the category's /service/ page.
 *
 * Layout: ≥ 1280 headline cols 1–7 (its longest line crosses the blob edge by ≤ 1.5 cols — the
 * section's one overlap), card cols 1–5 at +2 beats, portrait cols 6–11 (heavy right).
 * 768–1279: headline across, card cols 1–4 beside the portrait cols 4–8. < 768: stacked.
 */
import { Fragment, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCmsField, useT } from '../../../hooks/useT';
import { DEFAULT_ZONE, FACE_VIEWBOX, FACE_ZONES, hotspotPct, zoneById, type ZoneId } from '../data/faceZones';
import { fill, pad2, splitLines } from '../lib/copy';
import { findTreatment, formatPrice, sanitizeName, type PricedTreatment } from '../lib/prices';
import { useRevealOnce } from '../lib/useRevealOnce';
import { serviceHref, useV2Categories } from '../lib/categories';
import Pencil from './Pencil';
import Tape from './Tape';
import './FaceAtlas.css';

export interface FaceAtlasProps {
  id?: string;
}

const FACE_SET = (ext: 'avif' | 'webp') =>
  [640, 960, 1280].map((w) => `/media/v2/face-clear-${w}.${ext} ${w}w`).join(', ');
const FACE_SIZES = '(min-width: 1280px) 46vw, (min-width: 768px) 60vw, calc(100vw - 32px)';
const PANEL_ID = 'v2-atlas-card';

function useIsPhone(): boolean {
  const q = '(max-width: 767.98px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mql = window.matchMedia(q);
    const on = () => setM(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return m;
}

export default function FaceAtlas({ id = 'atlas' }: FaceAtlasProps) {
  const t = useT();
  const f = useCmsField();
  const reduce = useReducedMotion();
  const isPhone = useIsPhone();
  const cats = useV2Categories();

  const [selected, setSelected] = useState<ZoneId>(DEFAULT_ZONE);
  const [focusId, setFocusId] = useState<ZoneId>(DEFAULT_ZONE);
  const tabRefs = useRef<Partial<Record<ZoneId, HTMLButtonElement | null>>>({});
  const zone = zoneById(selected);
  const tabKind = isPhone ? 'chip' : 'spot';
  const tabId = (zid: ZoneId, kind = tabKind) => `v2-atlas-${kind}-${zid}`;

  const select = (zid: ZoneId) => {
    setSelected(zid);
    setFocusId(zid);
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, zid: ZoneId) => {
    const i = FACE_ZONES.findIndex((z) => z.id === zid);
    const n = FACE_ZONES.length;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    const target = FACE_ZONES[next].id;
    setFocusId(target);
    tabRefs.current[target]?.focus();
  };

  const rows = zone.treatments.flatMap((group) => {
    const cat = cats.byId[group.categoryId]?.data;
    return group.names
      .map((name) => findTreatment(cat, name))
      .filter((tr): tr is PricedTreatment => Boolean(tr))
      .map((tr) => ({
        key: `${group.categoryId}-${tr.name}`,
        href: serviceHref(cats, group.categoryId),
        name: sanitizeName(f<string>(tr, 'name', tr.name ?? '')),
        price: formatPrice(tr.price),
      }));
  });

  const head = splitLines(t('v2.atlas.h2'));
  const reveal = useRevealOnce('fadeUp');
  const cardReveal = useRevealOnce('fadeUp', { delay: 0.1 });

  const tabProps = (zid: ZoneId, kind: 'spot' | 'chip') => {
    const active = kind === tabKind;
    if (!active) return null;
    return {
      role: 'tab' as const,
      id: tabId(zid, kind),
      'aria-selected': selected === zid,
      'aria-controls': PANEL_ID,
      tabIndex: focusId === zid ? 0 : -1,
      ref: (el: HTMLButtonElement | null) => {
        tabRefs.current[zid] = el;
      },
      onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => onTabKey(e, zid),
      onClick: () => select(zid),
    };
  };

  return (
    <section id={id} className="v2-section v2-pad-4 v2-cv v2-atlas" aria-labelledby="v2-atlas-h">
      <div className="v2-grid v2-atlas__grid">
        <motion.div className="v2-atlas__head" {...reveal}>
          <p className="v2-kicker v2-atlas__kicker">{t('v2.atlas.kicker')}</p>
          <h2 id="v2-atlas-h" className="v2-dl v2-atlas__h">
            {head.map((l, i) => (
              <span key={i} className={`v2-line v2-atlas__hline--${i + 1}${l.italic ? ' v2-line--italic' : ''}`}>
                {i > 0 ? ' ' : ''}
                {l.text}
              </span>
            ))}
          </h2>
        </motion.div>

        <div className="v2-atlas__portrait">
          <span className="v2-atlas__blob v2-shape" data-shape="hero" aria-hidden="true" />
          <div className="v2-atlas__face">
            <picture>
              <source type="image/avif" srcSet={FACE_SET('avif')} sizes={FACE_SIZES} />
              <img
                src="/media/v2/face-clear-960.webp"
                srcSet={FACE_SET('webp')}
                sizes={FACE_SIZES}
                alt={t('v2.alt.model')}
                width={FACE_VIEWBOX.w}
                height={FACE_VIEWBOX.h}
                loading="lazy"
                decoding="async"
              />
            </picture>

            {FACE_ZONES.map((z) => (
              <Fragment key={z.id}>
                <Pencil
                  className="v2-atlas__mark"
                  viewBox={`0 0 ${FACE_VIEWBOX.w} ${FACE_VIEWBOX.h}`}
                  d={z.path}
                  active={selected === z.id}
                  duration={0.9}
                  stagger={0.15}
                  strokeWidth={4}
                />
                {z.outline && (
                  <Pencil
                    className="v2-atlas__mark v2-atlas__mark--outline"
                    viewBox={`0 0 ${FACE_VIEWBOX.w} ${FACE_VIEWBOX.h}`}
                    d={z.outline}
                    dashed="14 12"
                    active={selected === z.id}
                    duration={0.9}
                    delay={0.2}
                    strokeWidth={4}
                  />
                )}
              </Fragment>
            ))}

            <div
              className="v2-atlas__spots"
              role={isPhone ? undefined : 'tablist'}
              aria-label={isPhone ? undefined : t('v2.atlas.tablist')}
              aria-hidden={isPhone ? true : undefined}
            >
              {FACE_ZONES.map((z) => {
                const style = hotspotPct(z) as CSSProperties;
                const label = t(z.labelKey);
                if (isPhone) {
                  return (
                    <span
                      key={z.id}
                      className="v2-atlas__spot v2-atlas__spot--marker"
                      data-selected={selected === z.id ? '' : undefined}
                      style={style}
                    >
                      {z.n}
                    </span>
                  );
                }
                return (
                  <button
                    key={z.id}
                    type="button"
                    className="v2-atlas__spot"
                    style={style}
                    aria-label={`${z.n}. ${label}`}
                    title={label}
                    {...tabProps(z.id, 'spot')}
                  >
                    {z.n}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {isPhone && (
          <div className="v2-atlas__chips" role="tablist" aria-label={t('v2.atlas.tablist')}>
            {FACE_ZONES.map((z) => (
              <button key={z.id} type="button" className="v2-atlas__chip" {...tabProps(z.id, 'chip')}>
                <span className="v2-atlas__chipn" aria-hidden="true">
                  {z.n}
                </span>
                {t(z.labelKey)}
              </button>
            ))}
          </div>
        )}

        <motion.div className="v2-atlas__cardwrap" {...cardReveal}>
          <div
            className="v2-atlas__card v2-tilt"
            style={{ '--tilt': -1.5 } as CSSProperties}
            id={PANEL_ID}
            role="tabpanel"
            aria-labelledby={tabId(selected)}
            tabIndex={0}
          >
            <Tape seed={9} top={-11} left="calc(50% - 32px)" tilt={2} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selected}
                className="v2-atlas__cardbody"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -8 }}
                transition={{ duration: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="v2-kicker v2-atlas__zone">{fill(t('v2.atlas.zoneKicker'), { n: pad2(zone.n) })}</p>
                <h3 className="v2-atlas__ztitle">{t(zone.labelKey)}</h3>
                <p className="v2-atlas__concerns">{t(zone.concernsKey)}</p>
                {rows.length > 0 && (
                  <ul className="v2-atlas__rows">
                    {rows.map((r) => (
                      <li key={r.key}>
                        <Link to={r.href} className="v2-leader v2-atlas__row">
                          <span className="v2-leader__name">{r.name}</span>
                          <span className="v2-leader__dots" aria-hidden="true" />{' '}
                          <span className="v2-leader__price v2-price">{r.price}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
