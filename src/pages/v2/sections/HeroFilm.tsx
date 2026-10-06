/**
 * HeroFilm — the frameless 4:5 film slot (DESIGN.md §5.2, §6). PAGE-A-owned.
 *
 *  - The slot reserves 4:5 in CSS (no CLS). Inside it, React renders the light-DOM poster
 *    <picture> (= film frame 0, the LCP image; the face-map frame in still mode) and useHeroPlayer
 *    appends <hyperframes-player> after load + idle, at opacity 0, crossfading in on `ready`.
 *  - If the poster files are missing (film not built yet) the slot shows a static fallback built
 *    from page assets — the film's rest state: blush `hero` blob + the cut-out face — never a
 *    broken-image icon.
 *  - Static edge feather (mask-image, 6 % / 4.8 % = the film's 64 px safe band) on the slot only;
 *    the controls sit outside the mask.
 *  - Controls: a 44 × 44 Пауза/Смотреть toggle (always present while the film can play, WCAG
 *    2.2.2); «Смотреть фильм ▶» in still mode or after a blocked autoplay.
 *  - a11y: the player is aria-hidden + inert inside a <figure>; the figure is described by the
 *    chapter index (the film's text alternative, §9).
 */
import { useState } from 'react';
import { useT } from '../../../hooks/useT';
import { useLang } from '../../../context/LangContext';
import { filmLang, type V2Lang } from '../lib/copy';
import { posterSrc, posterSrcSet, type HeroPlayer } from '../lib/useHeroPlayer';
import './HeroFilm.css';

export interface HeroFilmProps {
  player: HeroPlayer;
  /** id of the film element (the chapter index buttons use aria-controls={filmId}) */
  filmId: string;
  /** id of the chapter index list, for aria-describedby on the figure */
  indexId?: string;
  className?: string;
  /** film language (Cover passes the one useHeroPlayer plays); defaults to filmLang(LangContext) */
  lang?: V2Lang;
}

/** slot width per layout (Cover.css): ≥1600 ≤ 43vw/800 · 1280–1599 ≤ 46vw · 768–1279 ≈ 3/4 of the page · phone 100vw − 32 */
const POSTER_SIZES =
  '(min-width: 1600px) min(800px, 43vw), (min-width: 1280px) 46vw, (min-width: 768px) 74vw, calc(100vw - 32px)';

const FACE_SET = (ext: 'avif' | 'webp') =>
  [640, 960, 1280].map((w) => `/media/v2/face-clear-${w}.${ext} ${w}w`).join(', ');

function PauseIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M6.5 4.5v11M13.5 4.5v11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M6.6 4.4 15.6 10l-9 5.6Z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/** The film's rest state, from page assets — shown only when the poster files are missing. */
function FallbackArt() {
  return (
    <div className="v2-film__fallback" aria-hidden="true">
      <span className="v2-film__blob v2-shape" data-shape="hero" />
      <picture className="v2-film__face">
        <source type="image/avif" srcSet={FACE_SET('avif')} sizes={POSTER_SIZES} />
        <img
          src="/media/v2/face-clear-960.webp"
          srcSet={FACE_SET('webp')}
          sizes={POSTER_SIZES}
          alt=""
          width={1031}
          height={1280}
          decoding="async"
          fetchPriority="high"
        />
      </picture>
    </div>
  );
}

export default function HeroFilm({ player, filmId, indexId = 'chapter-index', className, lang: langProp }: HeroFilmProps) {
  const t = useT();
  const { lang } = useLang();
  const fl = langProp ?? filmLang(lang);
  const [posterFailed, setPosterFailed] = useState<string | null>(null);
  const posterKey = `${player.poster}-${fl}`;
  const showPoster = posterFailed !== posterKey;

  // still mode with no poster = the film is not deployed: offer nothing that cannot play
  const showWatch = (player.mode === 'still' && showPoster) || player.blocked;
  const showToggle = !player.failed && !showWatch && player.mode !== 'still';

  return (
    <figure
      id={filmId}
      className={['v2-film', className].filter(Boolean).join(' ')}
      aria-describedby={indexId}
      data-mode={player.mode}
    >
      <div
        ref={player.slotRef}
        className="v2-film__slot"
        data-ready={player.ready ? '' : undefined}
        data-fallback={showPoster ? undefined : ''}
      >
        {showPoster ? (
          <picture className="v2-film__poster" key={posterKey}>
            <source type="image/avif" srcSet={posterSrcSet(player.poster, fl, 'avif')} sizes={POSTER_SIZES} />
            <source type="image/webp" srcSet={posterSrcSet(player.poster, fl, 'webp')} sizes={POSTER_SIZES} />
            <img
              src={posterSrc(player.poster, fl, 810, 'webp')}
              alt=""
              width={1080}
              height={1350}
              fetchPriority="high"
              decoding="async"
              onError={() => setPosterFailed(posterKey)}
            />
          </picture>
        ) : (
          <FallbackArt />
        )}
      </div>

      {(showToggle || (showWatch && !player.failed)) && (
        <div className="v2-film__controls">
          {showWatch ? (
            <button type="button" className="v2-pill v2-pill--oat v2-film__watch" aria-controls={filmId} onClick={player.play}>
              {t('v2.film.watch')}
            </button>
          ) : (
            <button
              type="button"
              className="v2-iconbtn v2-film__toggle"
              aria-controls={filmId}
              aria-label={player.playing ? t('v2.film.pause') : t('v2.film.play')}
              title={player.playing ? t('v2.film.pause') : t('v2.film.play')}
              onClick={player.playing ? player.pause : player.play}
            >
              {player.playing ? <PauseIcon /> : <PlayIcon />}
            </button>
          )}
        </div>
      )}

      <figcaption className="v2-film__caption">{t('v2.cover.caption')}</figcaption>
    </figure>
  );
}
