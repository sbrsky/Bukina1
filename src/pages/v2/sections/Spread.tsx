/**
 * Spread — one of three feature chapters (DESIGN.md §5.5). PAGE-B-owned.
 *  slot 0 = Spread A: heavy left. Ghost numeral bleeds off the left edge, portrait crop in the category
 *           token (cols 1–6), a lens print with the mechanism art overlapping it (cols 5–7, +1 beat, 3°, tape).
 *  slot 1 = Spread B: heavy right, mirrored. The mechanism print floats inside the text column with
 *           `shape-outside` (≥ 1024); the headline's italic line crosses the portrait edge on a paper slip.
 *  slot 2 = Spread C: the page's one centred type break; a strip of 2 prints (portrait + clippings).
 *
 * Category per slot: services with showInHero === true sorted by heroOrder, restricted to the categories
 * that have authored spread content (headline key, crop, mechanism art) — then filled from
 * SPREAD_FALLBACK. Art, crop, shape and ghost numeral travel with the CATEGORY; the layout with the SLOT.
 *
 * Review round 2:
 *  - Content: the lead treatment is chosen by explicit name (LEAD: the whole-face Neauvia Hydro Deluxe
 *    for biorevitalization, not the lips treatment that happened to come first), falling back to the
 *    first treatment with detailedDescription + indications + results. The pull quote and the body are
 *    authored v2 keys in Anastasia's voice (`v2.spread.<id>.quote|body`, credited «— Анастасия
 *    Букина») instead of a product sentence credited to a product and the category description that
 *    the price list already shows; the CMS text is only the fallback.
 *  - Art direction: one master, three treatments — a lips macro (biorevitalization), a jaw / contour
 *    crop (biostimulation), and in Spread C the clippings print is the hero with a small portrait.
 *    Portraits are capped at 1.35 source px per screen px (the crops are 440 source px wide → ≤ 594 px).
 *  - One print type everywhere: 12 px paper border, tape, the mechanism lens (category token) inside;
 *    the mechanism art is rouge/ink line work. The kicker sits on a paper slip, like the film's text.
 */
import { useMemo, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useT } from '../../../hooks/useT';
import { useLang } from '../../../context/LangContext';
import { CHAPTERS } from '../data/heroChapters';
import { fill, pad2, splitLines } from '../lib/copy';
import { sanitizeName } from '../lib/prices';
import type { CategoryId } from '../lib/shapes';
import MechanismArt, { type MechanismKind } from './MechanismArt';
import Pencil from './Pencil';
import Tape from './Tape';
import {
  DisplayLines,
  firstHonestSentence,
  honest,
  isHonest,
  localPrice,
  pickList,
  pickText,
  serviceHref,
  typo,
  useCatalog,
  useMedia,
  type Cat,
  type Catalog,
  type Treatment,
} from './pageBKit';
import './Spread.css';

export const SPREAD_FALLBACK: readonly CategoryId[] = ['biostimulation', 'biorevitalization', 'complex'];
export const SPREAD_IDS = ['spread-a', 'spread-b', 'spread-c'] as const;

export interface SpreadProps {
  slot: 0 | 1 | 2;
}

interface SpreadArt {
  /** public/media/v2/crop-<crop>-{640,960}.{avif,webp} (4:5, face over blush; scripts/v2-images.ts) */
  crop: 'lips' | 'jaw' | 'glow';
  mech: MechanismKind;
  /** the hydration «swell»: wdth 62.5 → 100 on the italic key word, once (DESIGN.md §5.5 Spread B) */
  swell?: boolean;
}

/** Categories with authored spread content (v2.spread.<id>.h, a crop and a mechanism illustration). */
const ART: Partial<Record<CategoryId, SpreadArt>> = {
  biostimulation: { crop: 'jaw', mech: 'pdrn-collagen' },
  biorevitalization: { crop: 'lips', mech: 'droplet-cells', swell: true },
  complex: { crop: 'glow', mech: 'clippings' },
};

/** the treatment each spread is about (exact CMS `name`); missing → the first complete treatment */
const LEAD: Partial<Record<CategoryId, string>> = {
  biorevitalization: 'Neauvia Hydro Deluxe',
  biostimulation: 'Plinest (ПДРН)',
  complex: 'GLOW EFFECT',
};

/** The three spread categories in slot order (§5.5 «Which categories»). */
export function spreadCategories(catalog: Catalog): CategoryId[] {
  const flagged = catalog.list
    .filter((c) => c.showInHero === true && ART[c.cid])
    .map((c, i) => ({ cid: c.cid, order: typeof c.heroOrder === 'number' ? c.heroOrder : 1000 + i })) // ties → film order
    .sort((a, b) => a.order - b.order)
    .map((c) => c.cid);
  const out: CategoryId[] = [];
  for (const id of [...flagged, ...SPREAD_FALLBACK]) if (!out.includes(id)) out.push(id);
  return out.slice(0, 3);
}

function leadTreatment(cat: Cat | undefined, cid: CategoryId): Treatment | undefined {
  const named = LEAD[cid] ? cat?.treatments?.find((t) => t?.name === LEAD[cid]) : undefined;
  if (named && ((named.indications?.length ?? 0) > 0 || (named.results?.length ?? 0) > 0)) return named;
  return cat?.treatments?.find(
    (t) => t?.detailedDescription && (t.indications?.length ?? 0) > 0 && (t.results?.length ?? 0) > 0,
  );
}

/** an authored v2 key, or '' when the copy deck has none (useT returns the key itself) */
function authored(t: (k: string) => string, key: string): string {
  const v = t(key);
  return v && v !== key ? v : '';
}

const VARIANT = ['a', 'b', 'c'] as const;
const SIZES = {
  a: '(min-width: 1280px) min(594px, 44vw), (min-width: 1024px) 34vw, (min-width: 768px) 62vw, 88vw',
  b: '(min-width: 1280px) min(594px, 44vw), (min-width: 1024px) 34vw, (min-width: 768px) 62vw, 88vw',
  c: '(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 52vw',
} as const;

/** «Подробнее →» → label + an arrow span that nudges +4 px on hover (v2-link / v2-pill). */
function ArrowLabel({ text }: { text: string }) {
  const m = text.match(/^(.*?)\s*(→)\s*$/);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]}{' '}
      <span className="v2-arrow" aria-hidden="true">
        {m[2]}
      </span>
    </>
  );
}

export default function Spread({ slot }: SpreadProps) {
  const t = useT();
  const { lang } = useLang();
  const catalog = useCatalog();
  const reduce = useReducedMotion();
  const fine = useMedia('(hover: hover) and (pointer: fine)');
  const mobile = useMedia('(max-width: 767.98px)');
  const wide = useMedia('(min-width: 768px)', true);

  const cid = spreadCategories(catalog)[slot] ?? SPREAD_FALLBACK[slot];
  const art = ART[cid] ?? ART[SPREAD_FALLBACK[slot]]!;
  const cat = catalog.byId.get(cid);
  const v = VARIANT[slot];
  const sid = SPREAD_IDS[slot];
  const chapter = CHAPTERS.find((c) => c.id === cid);
  const num = pad2(chapter?.n ?? slot + 4);

  const content = useMemo(() => {
    const lead = leadTreatment(cat, cid);
    const title = pickText(cat, 'title', lang);
    const ownQuote = authored(t, `v2.spread.${cid}.quote`);
    const quote = typo(ownQuote || firstHonestSentence(pickText(lead, 'detailedDescription', lang)), lang);
    const body = typo(authored(t, `v2.spread.${cid}.body`) || honest(pickText(cat, 'description', lang)), lang);
    const top3 = (field: string) =>
      pickList(lead, field, lang)
        .filter(isHonest)
        .slice(0, 3)
        .map((s) => typo(s, lang));
    const rows = (cat?.treatments ?? [])
      .map((tr) => {
        const name = sanitizeName(pickText(tr, 'name', lang) || tr?.name);
        return name && isHonest(name)
          ? { key: tr.name, name, price: localPrice(tr.price, lang, t), href: serviceHref(catalog, cid, tr.name) }
          : null;
      })
      .filter(Boolean) as { key: string; name: string; price: string; href: string }[];
    return {
      title,
      cite: ownQuote ? authored(t, 'v2.spread.quoteBy') : lead ? sanitizeName(pickText(lead, 'name', lang) || lead.name) : '',
      quote,
      body,
      indications: top3('indications'),
      results: top3('results'),
      rows,
    };
  }, [cat, cid, lang, catalog, t]);

  const headline = t(`v2.spread.${cid}.h`);
  const chars = Math.max(8, ...splitLines(headline).map((l) => l.text.length));
  const moreHref = serviceHref(catalog, cid);

  // ── motion: collage parallax ±40 px (mobile ±16), ghost drift ±3vw (pointer-fine), wdth swell ──
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const amp = mobile ? 16 : 40;
  const yPortrait = useTransform(scrollYProgress, [0, 1], [amp * 0.4, -amp * 0.4]);
  const yPrint = useTransform(scrollYProgress, [0, 1], [amp, -amp]);
  const xGhost = useTransform(scrollYProgress, [0, 1], v === 'b' ? ['-3vw', '3vw'] : ['3vw', '-3vw']);
  const still = !!reduce;
  const keyRef = useRef<HTMLSpanElement>(null);
  const keyInView = useInView(keyRef, { once: true, amount: 0.9 });
  const swell = !!art.swell && fine && !reduce;

  const kicker = fill(t('v2.spread.kicker'), { n: num, title: content.title });
  const illu = t('v2.proof.label');

  const portrait = (
    <motion.figure className="v2-spread__portrait" style={still ? undefined : { y: yPortrait }}>
      <div className="v2-shape v2-morph v2-spread__mask" data-shape={cid}>
        <picture>
          <source
            type="image/avif"
            srcSet={`/media/v2/crop-${art.crop}-640.avif 640w, /media/v2/crop-${art.crop}-960.avif 960w`}
            sizes={SIZES[v]}
          />
          <source
            type="image/webp"
            srcSet={`/media/v2/crop-${art.crop}-640.webp 640w, /media/v2/crop-${art.crop}-960.webp 960w`}
            sizes={SIZES[v]}
          />
          <img
            src={`/media/v2/crop-${art.crop}-960.webp`}
            width={960}
            height={1200}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>
      <figcaption className="v2-illu v2-spread__illu">{illu}</figcaption>
    </motion.figure>
  );

  /** the mechanism print: a lens (A), the shape-outside float (B), the clippings on oat (C) */
  /** the mechanism print — ONE print type: paper border, tape, the lens (category token) inside;
   *  A overlaps the portrait, B floats in the text column, C is the clippings print (the C hero) */
  const mech =
    v === 'b' ? (
      <div className="v2-spread__float v2-print v2-tilt" style={{ '--tilt': -1.5 } as CSSProperties}>
        <Tape seed={52} top={-11} left="calc(50% - 32px)" tilt={2} />
        <div className="v2-spread__lens v2-shape" data-shape={cid}>
          <MechanismArt kind={art.mech} className="v2-spread__art" />
        </div>
      </div>
    ) : (
      <motion.div
        className={`v2-spread__print v2-print v2-tilt v2-spread__print--${v}`}
        style={{ '--tilt': v === 'a' ? 3 : -2.5, ...(still ? {} : { y: yPrint }) } as CSSProperties}
      >
        <Tape seed={v === 'a' ? 41 : 63} top={-11} left={v === 'a' ? 'calc(50% - 32px)' : 18} />
        {v === 'a' ? (
          <div className="v2-spread__lens v2-shape" data-shape={cid}>
            <MechanismArt kind={art.mech} className="v2-spread__art" />
          </div>
        ) : (
          <MechanismArt kind={art.mech} className="v2-spread__art v2-spread__art--clip" />
        )}
      </motion.div>
    );

  const headlineEl = (
    <h2
      id={`${sid}-h`}
      className={`v2-dl v2-spread__h${v === 'c' ? ' v2-spread__h--break' : ''}`}
      style={{ '--chars': chars } as CSSProperties}
    >
      <DisplayLines
        text={headline}
        render={(l) =>
          l.italic ? (
            <span
              ref={keyRef}
              className={[
                'v2-spread__key',
                v === 'b' && 'v2-slip v2-spread__slip',
                swell && 'is-swell',
                swell && keyInView && 'is-swollen',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {l.text}
              <Pencil.Underline className="v2-spread__under" duration={0.6} delay={0.2} />
            </span>
          ) : (
            l.text
          )
        }
      />
    </h2>
  );

  const ghost = (
    <motion.span
      className="v2-ghost v2-spread__ghost"
      aria-hidden="true"
      style={!still && fine ? { x: xGhost } : undefined}
    >
      {num}
    </motion.span>
  );

  const lists = (
    <div className="v2-spread__lists">
      {(
        [
          ['indications', content.indications],
          ['results', content.results],
        ] as const
      ).map(([k, items]) =>
        items.length === 0 ? null : wide ? (
          <div key={k} className="v2-spread__list">
            <h3 className="v2-kicker v2-spread__lh">{t(`v2.spread.${k}`)}</h3>
            <ul>
              {items.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        ) : (
          <details key={k} className="v2-spread__list v2-spread__details">
            <summary className="v2-kicker v2-spread__lh">
              <span>{t(`v2.spread.${k}`)}</span>
              <svg className="v2-spread__plus" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path d="M10 3.4 C10.3 7.6 9.7 12.1 10.1 16.6 M3.5 10.2 C7.8 9.8 12.4 10.3 16.6 9.9" />
              </svg>
            </summary>
            <ul>
              {items.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </details>
        ),
      )}
    </div>
  );

  const prices =
    content.rows.length > 0 ? (
      <div className="v2-spread__prices">
        <h3 className="v2-kicker v2-spread__lh">{t('v2.spread.prices')}</h3>
        <ul>
          {content.rows.map((r) => (
            <li key={r.key}>
              <Link to={r.href} className="v2-leader v2-spread__row">
                <span className="v2-leader__name">{r.name}</span>
                {r.price && (
                  <>
                    <span className="v2-leader__dots" aria-hidden="true" />
                    <span className="v2-leader__price v2-price">{r.price}</span>
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const more = (
    <Link to={moreHref} className="v2-link v2-spread__more">
      <ArrowLabel text={t('v2.cta.more')} />
      <span className="v2-sr-only">: {content.title}</span>
    </Link>
  );

  const quote = content.quote ? (
    <blockquote className="v2-quote v2-spread__quote">
      <p>{content.quote}</p>
      {content.cite && <footer className="v2-kicker v2-spread__cite">— {content.cite}</footer>}
    </blockquote>
  ) : null;

  const body = content.body ? <p className="v2-body v2-spread__body">{content.body}</p> : null;

  return (
    <section
      ref={ref}
      id={sid}
      className={`v2-section v2-cv v2-spread v2-spread--${v} ${['v2-pad-5', 'v2-pad-3', 'v2-pad-4'][slot]}`}
      aria-labelledby={`${sid}-h`}
      data-category={cid}
      data-crop={art.crop}
    >
      <div className="v2-grid v2-spread__grid">
        {v === 'c' ? (
          <>
            <header className="v2-spread__head">
              {ghost}
              <p className="v2-kicker v2-slip v2-spread__kicker">{kicker}</p>
              {headlineEl}
              {quote}
            </header>
            <div className="v2-spread__strip">
              {portrait}
              {mech}
            </div>
            <div className="v2-spread__text">
              <div className="v2-spread__colL">
                {body}
                {lists}
              </div>
              <div className="v2-spread__colR">
                {prices}
                {more}
              </div>
            </div>
          </>
        ) : (
          <>
            {v === 'a' ? (
              <div className="v2-spread__collage">
                {portrait}
                {mech}
              </div>
            ) : (
              portrait
            )}
            <div className="v2-spread__text">
              {ghost}
              <p className="v2-kicker v2-slip v2-tilt v2-spread__kicker" style={{ '--tilt': -1 } as CSSProperties}>
                {kicker}
              </p>
              {headlineEl}
              {quote}
              <div className="v2-spread__flow">
                {v === 'b' && mech}
                {body}
                {lists}
              </div>
              {prices}
              {more}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
