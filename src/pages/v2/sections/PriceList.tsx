/**
 * PriceList «Процедуры и цены» (#procedures) — DESIGN.md §5.3. PAGE-A-owned.
 *
 * The magazine's contents page: 7 rows in FILM order, full-bleed hairlines, staircase titles
 * (display-m, col 3 + i % 3), «от X €» + «N процедур», a «Цены» disclosure with every treatment
 * (name ····· price) and «Подробнее о направлении →».
 *  - ≥ 1280: rail col 1 (vertical kicker + «07 разделов»), headline cols 2–9 (the giant element),
 *    rows: number col 2 · title + description from col 3 + i % 3 to col 8 · a 3-col thumbnail lane
 *    (cols 9–11) · meta col 12. The first row's zone thumbnail is printed permanently with tape
 *    (the tiny element); the others appear on hover/focus (pointer-fine), statically placed.
 *  - 768–1279: number col 1, title cols 2–6 (staircase over 3 starts), meta cols 7–8.
 *  - < 768: number + count left, price right; title indents [0, 8 %, 4 %]; description; toggle.
 * Hover/focus (pointer-fine, ≥ 1024): oat band, title +12 px and wdth 75 → 100 (400 ms).
 * Panels: CSS grid-template-rows 0fr → 1fr (0.35 s), `inert` while closed.
 * Data: useServices() → servicesData; useCmsField for title/name; sanitizeName().
 * Descriptions (review round 2): the CMS paragraphs were clamped to 2 lines mid-word and repeated
 * by the spreads, so each row shows an authored ≤ 90-character line `v2.prices.desc.<categoryId>`
 * (falls back to the first honest sentence of the CMS description) — never clamped. ≥ 1280 it
 * sits in cols 9–11 (§5.3), so a row is ≈ one title tall. The hover thumbnails of §5.3 would sit
 * on that description (cols 10–12) — they are dropped; the first row's taped zone print (the
 * section's tiny element) moves up beside the headline, overlapping the list's top hairline.
 */
import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useCmsField, useT } from '../../../hooks/useT';
import { useLang } from '../../../context/LangContext';
import type { CategoryId } from '../lib/shapes';
import { serviceHref, useV2Categories } from '../lib/categories';
import { fill, pad2, shy, splitLines, typograf } from '../lib/copy';
import { firstHonestSentence } from './pageBKit';
import { formatCount, formatFrom, formatPrice, minPrice, sanitizeName } from '../lib/prices';
import { useRevealOnce } from '../lib/useRevealOnce';
import { motion } from 'motion/react';
import Tape from './Tape';
import { splitArrow } from './Cover';
import './PriceList.css';

export interface PriceListProps {
  id?: string;
}

const thumbSet = (id: CategoryId, ext: 'avif' | 'webp') =>
  `/media/v2/zone-${id}-320.${ext} 320w, /media/v2/zone-${id}-640.${ext} 640w`;

function Caret() {
  return (
    <svg className="v2-prices__caret" viewBox="0 0 12 8" width="12" height="8" aria-hidden="true" focusable="false">
      <path d="M1.2 1.6 6 6.3l4.8-4.7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PriceList({ id = 'procedures' }: PriceListProps) {
  const t = useT();
  const f = useCmsField();
  const { lang } = useLang();
  const cats = useV2Categories();
  const rows = cats.list;

  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (cid: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });

  const head = splitLines(t('v2.prices.h2'));
  const reveal = useRevealOnce('fadeUp');
  const [moreLabel, moreArrow] = splitArrow(t('v2.prices.more'));

  return (
    <section id={id} className="v2-section v2-pad-5 v2-cv v2-prices" aria-labelledby="v2-prices-h">
      <div className="v2-grid v2-prices__grid">
        <div className="v2-prices__rail">
          <p className="v2-kicker v2-prices__kicker">{t('v2.prices.kicker')}</p>
          <p className="v2-prices__sections">{fill(t('v2.prices.rail'), { n: pad2(rows.length) })}</p>
        </div>

        <h2 id="v2-prices-h" className="v2-dl v2-prices__h">
          {head.map((l, i) => (
            <span key={i} className={`v2-line v2-prices__hline--${i + 1}${l.italic ? ' v2-line--italic' : ''}`}>
              {i > 0 ? ' ' : ''}
              {l.text}
            </span>
          ))}
        </h2>

        {rows[0] && (
          <span className="v2-prices__thumb" aria-hidden="true">
            <picture className="v2-shape" data-shape={rows[0].id}>
              <source type="image/avif" srcSet={thumbSet(rows[0].id, 'avif')} sizes="200px" />
              <img
                src={`/media/v2/zone-${rows[0].id}-320.webp`}
                srcSet={thumbSet(rows[0].id, 'webp')}
                sizes="200px"
                alt=""
                width={200}
                height={200}
                loading="lazy"
                decoding="async"
              />
            </picture>
            <Tape seed={5} top={-8} left="calc(50% - 32px)" tilt={-3} />
          </span>
        )}

        <motion.ol className="v2-prices__list" {...reveal}>
          {rows.map(({ id: cid, data: cat }, i) => {
            const href = serviceHref(cats, cid);
            const title = f<string>(cat, 'title', cat.title ?? cid);
            const descKey = `v2.prices.desc.${cid}`;
            const authored = t(descKey);
            const desc = typograf(
              authored && authored !== descKey
                ? authored
                : firstHonestSentence(f<string>(cat, 'description', cat.description ?? '')),
              lang,
            );
            const treatments = (cat.treatments ?? []).filter((tr) => tr && (tr.name || tr.price));
            const from = formatFrom(minPrice(cat), t);
            const isOpen = open.has(cid);
            const panelId = `v2-prices-panel-${cid}`;
            const titleId = `v2-prices-title-${cid}`;
            return (
              <li
                key={cid}
                className="v2-prices__row"
                data-open={isOpen ? '' : undefined}
                style={{ '--step': i % 3, '--stair': ['0%', '8%', '16%'][i % 3] } as CSSProperties}
              >
                <span className="v2-prices__num" aria-hidden="true">
                  {pad2(i + 1)}
                </span>

                <h3 className="v2-dm v2-prices__title" id={titleId}>
                  <Link to={href} className="v2-prices__tlink">
                    {shy(title)}
                  </Link>
                </h3>

                {desc && <p className="v2-prices__desc">{desc}</p>}

                <div className="v2-prices__meta">
                  {from && <span className="v2-price v2-prices__from">{from}</span>}
                  {treatments.length > 0 && (
                    <span className="v2-prices__count">{formatCount(treatments.length, lang, t)}</span>
                  )}
                  {treatments.length > 0 && (
                    <button
                      type="button"
                      className="v2-prices__toggle"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      aria-describedby={titleId}
                      onClick={() => toggle(cid)}
                    >
                      {t('v2.prices.toggle')}
                      <Caret />
                    </button>
                  )}
                </div>

                {treatments.length > 0 && (
                  <div
                    id={panelId}
                    className="v2-prices__panel"
                    role="region"
                    aria-labelledby={titleId}
                    inert={!isOpen}
                  >
                    <div className="v2-prices__panelclip">
                      <div className="v2-prices__panelbody">
                        <ul className="v2-prices__items">
                          {treatments.map((tr, k) => (
                            <li key={`${tr.name}-${k}`} className="v2-leader v2-prices__item">
                              <span className="v2-leader__name">{sanitizeName(f<string>(tr, 'name', tr.name ?? ''))}</span>
                              <span className="v2-leader__dots" aria-hidden="true" />{' '}
                              <span className="v2-leader__price v2-price">{formatPrice(tr.price)}</span>
                            </li>
                          ))}
                        </ul>
                        <Link to={href} className="v2-link v2-prices__more">
                          {moreLabel}
                          {moreArrow && (
                            <span className="v2-arrow" aria-hidden="true">
                              {moreArrow}
                            </span>
                          )}
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </motion.ol>
      </div>
    </section>
  );
}
