/**
 * Cover — H1 «Эстетическая косметология в Риге», trust line, film, chapter index, CTAs, next-slot
 * chip (DESIGN.md §5.2). PAGE-A-owned. Composes HeroFilm + ChapterIndex + NextSlotChip around one
 * useHeroPlayer(). The H1 / poster is the LCP: nothing here waits on the network or on scroll.
 *
 * DOM order = reading order at every width (no CSS order):
 *    H1 → trust (phone copy) → film → trust (≥ 768 copy) → CTAs → chip → index.
 *  The trust block is rendered twice (static text, the inactive copy is display:none, so it is
 *  neither seen nor read) because phones read it before the film and tablets after it.
 *  - ≥ 1280: text column cols 1–6 (H1 lines at cols 1 / 2 / 1), the CTA pair + chip straight
 *    after the trust line (above the fold at 1440 × 900, so the 26.95 s pulse is seen), then the
 *    index; the film cols 7–12 flush with the right page edge. The film's copy starts at 10.2 % of
 *    its width: the H1's italic line is condensed (wdth 62.5) and sized so its right edge stays
 *    ≥ 1 column left of that copy (Cover.css) — the page title never runs into the film's title.
 *  - 768–1279: H1 across 8 cols; the film (cols 3–8) rises 1 beat into the H1's short last
 *    line; trust, CTAs, chip and the index (full width, one line per title) follow.
 *  - < 768: one column; H1 indents 0 / 10 % / 4 %; film full width; CTAs before the index.
 * Giant: the H1. Tiny: the Bad Script signature (aria-hidden).
 * Motion: H1 lines yPercent 105 → 0 (stagger .07, .8 s) on mount; trust + index fade up (delay
 * .25). The «Записаться» pill pulses once at film t = 26.95 s if ≥ 50 % visible. Nothing is
 * scroll-linked. Reduced motion: static, film still + «Смотреть фильм ▶».
 */
import { useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useT } from '../../../hooks/useT';
import { useLang } from '../../../context/LangContext';
import { useContent } from '../../../hooks/useContent';
import { splitLines, filmLang, typograf, type V2Lang } from '../lib/copy';
import { useHeroPlayer } from '../lib/useHeroPlayer';
import { serviceHref, useV2Categories } from '../lib/categories';
import { CHAPTERS } from '../data/heroChapters';
import { childReveal, EASE_OUT, useRevealOnMount } from '../lib/useRevealOnce';
import HeroFilm from './HeroFilm';
import ChapterIndex from './ChapterIndex';
import NextSlotChip from './NextSlotChip';
import './Cover.css';

export interface CoverProps {
  id?: string;
  /**
   * Film language for the first render while HomeV2 restores a stored language (LangContext still
   * says 'ru'): the poster <img> is created once, in the right language (no double LCP download).
   */
  filmLang?: V2Lang;
}

export const FILM_ID = 'hero-film';
export const INDEX_ID = 'chapter-index';
const DEFAULT_REG = '59850068090';

/** "Все процедуры →" → ["Все процедуры", "→"] so the arrow can nudge on hover. */
export function splitArrow(s: string): [string, string] {
  const m = s.match(/^(.*?)\s*([→←↗])\s*$/u);
  return m ? [m[1], m[2]] : [s, ''];
}

export default function Cover({ id = 'cover', filmLang: filmLangOverride }: CoverProps) {
  const t = useT();
  const { lang } = useLang();
  const fl = filmLangOverride ?? filmLang(lang);
  const reduce = useReducedMotion();

  const { data: about } = useContent<{ regNumber?: string }>('content/about', { regNumber: DEFAULT_REG });
  const reg = about?.regNumber || DEFAULT_REG;

  // CTA pulse (§5.2.3): only when the cover pill is ≥ 50 % visible
  const pillRef = useRef<HTMLAnchorElement | null>(null);
  const pillVisible = useRef(false);
  useEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (pillVisible.current = e.intersectionRatio >= 0.5), {
      threshold: [0, 0.5, 1],
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const onCtaPill = useCallback(() => {
    const el = pillRef.current;
    if (!el || !pillVisible.current || reduce || typeof el.animate !== 'function') return;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], {
      duration: 500,
      easing: `cubic-bezier(${EASE_OUT.join(',')})`,
    });
  }, [reduce]);

  const player = useHeroPlayer({ lang: fl, onCtaPill });
  const navigate = useNavigate();
  const cats = useV2Categories();
  // the film could not load (not deployed / both modes failed): a row then opens its category
  const onChapter = useCallback(
    (i: number) => {
      if (player.failed) return navigate(serviceHref(cats, CHAPTERS[i].id));
      player.seekToChapter(i);
      // < 1280 the index sits BELOW the film: a row tapped while the film is scrolled away would
      // seek a film that stays paused (< 25 % visible, §6.4) and unseen — bring the film back first.
      const slot = player.slotRef.current;
      const fig = document.getElementById(FILM_ID);
      if (!slot || !fig) return;
      const r = slot.getBoundingClientRect();
      const seen = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)) / (r.height || 1);
      if (seen < 0.6) fig.scrollIntoView({ behavior: (reduce ? 'instant' : 'smooth') as ScrollBehavior, block: 'nearest' });
    },
    [player, navigate, cats, reduce],
  );

  const h1 = useRevealOnMount('stagger', { stagger: 0.07 });
  const lineUp = childReveal('lineUp');
  const fadeUp = useRevealOnMount('fadeUp', { delay: 0.25 });
  const fadeUpLate = useRevealOnMount('fadeUp', { delay: 0.35 });
  const [allLabel, allArrow] = splitArrow(t('v2.cta.all'));

  const trust = (variant: string) => (
    <motion.div className={`v2-cover__trust ${variant}`} {...fadeUp}>
      <p className="v2-cover__trustline">{typograf(t('v2.cover.trust'), lang)}</p>
      <p className="v2-cover__reg">
        {t('v2.cover.reg')}&nbsp;{reg}
      </p>
      <span className="v2-hand v2-cover__sig" aria-hidden="true">
        {t('v2.cover.signature')}
      </span>
    </motion.div>
  );

  return (
    <section id={id} className="v2-section v2-cover" aria-labelledby="v2-h1">
      <p className="v2-spine v2-cover__spine" aria-hidden="true">
        {t('v2.cover.spine')}
      </p>

      <div className="v2-grid v2-cover__grid">
        <motion.h1 id="v2-h1" className="v2-h1 v2-cover__h1" {...h1}>
          {splitLines(t('v2.cover.h1')).map((l, i) => (
            <span key={i} className={`v2-line-mask v2-cover__line v2-cover__line--${i + 1}`}>
              {/* the space keeps the accessible name «Эстетическая косметология в Риге» */}
              {i > 0 ? ' ' : ''}
              <motion.span className={l.italic ? 'v2-line v2-line--italic' : 'v2-line'} {...lineUp}>
                {l.text}
              </motion.span>
            </span>
          ))}
        </motion.h1>

        {/* phones: trust before the film */}
        {trust('v2-cover__trust--phone')}

        <HeroFilm player={player} lang={fl} filmId={FILM_ID} indexId={INDEX_ID} className="v2-cover__film" />

        {/* ≥ 768: trust after the film (tablets stack the film under the H1) */}
        {trust('v2-cover__trust--wide')}

        <div className="v2-cover__cta">
          <Link ref={pillRef} to="/booking" className="v2-pill v2-cover__pill">
            {t('v2.cta.book')}
          </Link>
          <Link to="/services" className="v2-link v2-cover__all">
            {allLabel}
            {allArrow && (
              <span className="v2-arrow" aria-hidden="true">
                {allArrow}
              </span>
            )}
          </Link>
        </div>

        <NextSlotChip className="v2-cover__slot" />

        <motion.div className="v2-cover__index" {...fadeUpLate}>
          <ChapterIndex id={INDEX_ID} current={player.chapter} onSelect={onChapter} filmId={FILM_ID} />
        </motion.div>
      </div>
    </section>
  );
}
