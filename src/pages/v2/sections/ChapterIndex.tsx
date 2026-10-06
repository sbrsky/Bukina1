/**
 * ChapterIndex — the film's text alternative (DESIGN.md §5.2.1). PAGE-A-owned.
 *
 * <ol aria-label="Содержание фильма"> of the 7 chapters in FILM order. Each row:
 *  - a <button> (aria-controls = the film figure, aria-current="true" while its chapter plays)
 *    showing «0N», the CMS category title, a dotted leader and «от X €»; click → seek + play;
 *  - a trailing 44 × 44 <Link> arrow → /service/{id} (aria-label «{title}: подробнее»).
 * No staircase: numbers and hairlines share one start x (a 12–24 px stair read as misalignment —
 * review round 2); hairline separators; the playing row gets a rouge
 * pencil underline drawn with pathLength in 0.4 s (instant under reduced motion).
 * Titles/prices: useV2Categories() (useServices() → servicesData fallback; live slug ids → links).
 */
import { Link } from 'react-router-dom';
import { useCmsField, useT } from '../../../hooks/useT';
import { CHAPTERS } from '../data/heroChapters';
import { fill, pad2, shy } from '../lib/copy';
import { formatFrom, minPrice } from '../lib/prices';
import { serviceHref, useV2Categories } from '../lib/categories';
import Pencil from './Pencil';
import './ChapterIndex.css';

export interface ChapterIndexProps {
  /** index into CHAPTERS of the playing chapter, -1 for none */
  current: number;
  /** called with the 0-based chapter index; seeks the film and plays */
  onSelect: (index: number) => void;
  /** id of the film element (aria-controls) */
  filmId: string;
  id?: string;
  className?: string;
}

export default function ChapterIndex({ current, onSelect, filmId, id = 'chapter-index', className }: ChapterIndexProps) {
  const t = useT();
  const f = useCmsField();
  const cats = useV2Categories();

  return (
    <ol id={id} className={['v2-index', className].filter(Boolean).join(' ')} aria-label={t('v2.cover.indexLabel')}>
      {CHAPTERS.map((ch, i) => {
        const cat = cats.byId[ch.id]?.data;
        const title = cat ? f<string>(cat, 'title', cat.title ?? ch.id) : ch.id;
        const price = formatFrom(minPrice(cat), t);
        const isCurrent = current === i;
        return (
          <li key={ch.id} className="v2-index__row">
            <button
              type="button"
              className="v2-index__seek"
              aria-controls={filmId}
              aria-current={isCurrent ? 'true' : undefined}
              onClick={() => onSelect(i)}
            >
              <span className="v2-index__num">{pad2(ch.n)}</span>{' '}
              <span className="v2-index__title">
                {/* soft hyphens: at 360 «Биоревитализация» otherwise breaks as «Биоревитализа|ция» */}
                {shy(title)}
                <Pencil.Underline active={isCurrent} className="v2-index__ul" />
              </span>
              <span className="v2-index__dots" aria-hidden="true" />{' '}
              {price && <span className="v2-index__price">{price}</span>}
            </button>
            <Link to={serviceHref(cats, ch.id)} className="v2-index__more" aria-label={fill(t('v2.index.more'), { title })}>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
