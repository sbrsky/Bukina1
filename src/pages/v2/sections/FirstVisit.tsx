/**
 * FirstVisit «Как начать» (#first-visit) — DESIGN.md §5.8. PAGE-B-owned. Diagonal, 5 beats.
 * A diagonal staircase of 3 steps (step n starts at col 1 + 4n, margin-top n × 2 beats on desktop;
 * stacked with [0, 8 %, 4 %] indents on phones), joined by hand-drawn rouge arrows that draw once on
 * view (pre-drawn under reduced motion). Real prices from the `consultation` category matched by name
 * («Консультация ONLINE», «Первый визит без процедуры», «Первый визит с процедурой»), fallback servicesData.
 * Giant: the staircase diagonal. Tiny: the arrowheads.
 */
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../../hooks/useT';
import { servicesData } from '../../../data/servicesData';
import type { PricedCategory } from '../lib/prices';
import { pad2, splitLines, typograf } from '../lib/copy';
import Pencil from './Pencil';
import { DisplayLines, localPrice, useCatalog } from './pageBKit';
import { useLang } from '../../../context/LangContext';
import './FirstVisit.css';

export interface FirstVisitProps {
  id?: string;
}

/** Treatment match per step: the exact RU name from DESIGN.md §5.8 first, then a tolerant pattern, so a
 *  CMS rename does not silently drop the price. Prices always come from the data, never from here. */
const MATCH = {
  online: { name: 'Консультация ONLINE', re: /online|онлайн/i },
  studio: { name: 'Первый визит без процедуры', re: /без\s+процедур/i },
  withTreatment: { name: 'Первый визит с процедурой', re: /\sс\s+процедур/i },
} as const;

type Priced = { treatments?: { name?: string; price?: string }[] } | undefined;
function matchTreatment(cat: Priced, m: (typeof MATCH)[keyof typeof MATCH]) {
  const list = cat?.treatments ?? [];
  return list.find((t) => t?.name === m.name) ?? list.find((t) => typeof t?.name === 'string' && m.re.test(t.name));
}

const FALLBACK = servicesData.find((c) => c.id === 'consultation') as unknown as PricedCategory | undefined;

/** desktop: a long diagonal swoop from the previous step down-right into this step's numeral */
const ARROW_DIAG = ['M6 8 C46 2 98 10 132 40 S170 96 176 128', 'M160 118 L177 130 L181 109'];
/** < 1280: a short downward hook */
const ARROW_DOWN = ['M14 4 C6 18 8 34 22 50', 'M10 44 L23 52 L27 37'];

export default function FirstVisit({ id = 'first-visit' }: FirstVisitProps) {
  const t = useT();
  const { lang } = useLang();
  const { byId } = useCatalog();
  const live = byId.get('consultation');

  const price = (m: (typeof MATCH)[keyof typeof MATCH]) => {
    const tr = matchTreatment(live, m) ?? matchTreatment(FALLBACK, m);
    return localPrice(tr?.price, lang, t);
  };

  const steps = [
    {
      key: 's1',
      chips: [
        { label: t('v2.visit.online'), price: price(MATCH.online) },
        { label: t('v2.visit.studio'), price: price(MATCH.studio) },
      ],
    },
    { key: 's2', chips: [] as { label: string; price: string }[] },
    { key: 's3', chips: [{ label: '', price: price(MATCH.withTreatment) }] },
  ].map((s) => ({ ...s, chips: s.chips.filter((c) => c.price) }));

  const h2 = t('v2.visit.h2');
  const chars = Math.max(8, ...splitLines(h2).map((l) => l.text.length));
  const cta = t('v2.visit.cta');

  return (
    <section id={id} className="v2-section v2-cv v2-pad-5 v2-visit" aria-labelledby={`${id}-h`}>
      <div className="v2-grid v2-visit__grid">
        <header className="v2-visit__head">
          <p className="v2-kicker v2-visit__kicker">{t('v2.visit.kicker')}</p>
          <h2 id={`${id}-h`} className="v2-dl v2-visit__h" style={{ '--chars': chars } as CSSProperties}>
            <DisplayLines text={h2} />
          </h2>
        </header>

        <ol className="v2-visit__steps">
          {steps.map((s, i) => (
            <li key={s.key} className={`v2-visit__step v2-visit__step--${i + 1}`}>
              {i > 0 && (
                <>
                  <Pencil
                    className="v2-visit__arrow v2-visit__arrow--diag"
                    viewBox="0 0 190 140"
                    d={ARROW_DIAG}
                    strokeWidth={2.5}
                    duration={0.9}
                    delay={i * 0.2}
                    stagger={0.5}
                  />
                  <Pencil
                    className="v2-visit__arrow v2-visit__arrow--down"
                    viewBox="0 0 40 56"
                    d={ARROW_DOWN}
                    strokeWidth={2.5}
                    duration={0.9}
                    delay={0.1}
                    stagger={0.5}
                  />
                </>
              )}
              <p className="v2-visit__num" aria-hidden="true">
                {pad2(i + 1)}
              </p>
              <h3 className="v2-visit__t">
                <span className="v2-sr-only">{pad2(i + 1)}. </span>
                {t(`v2.visit.${s.key}.t`)}
              </h3>
              <p className="v2-visit__d">{typograf(t(`v2.visit.${s.key}.d`), lang)}</p>
              {s.chips.length > 0 && (
                <p className="v2-visit__chips">
                  {s.chips.map((c, j) => (
                    <span key={j} className="v2-chip v2-visit__chip">
                      {c.label && <span className="v2-visit__chiplabel">{c.label}</span>}
                      <span className="v2-visit__chipprice">{c.price}</span>
                    </span>
                  ))}
                </p>
              )}
            </li>
          ))}
        </ol>

        <p className="v2-visit__cta">
          <Link to="/booking" className="v2-pill">
            {cta}{' '}
            <span className="v2-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </p>
      </div>
    </section>
  );
}
