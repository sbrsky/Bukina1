/**
 * Colophon (footer, #colophon) — DESIGN.md §5.11. PAGE-B-owned. Oat, <Seam seed={31} fill="oat"> on top.
 *  • giant: the «SKINLAB» wordmark (NSD 600 wdth 62.5) cropped by the bottom edge (overflow: clip);
 *    tiny: the 6 px rouge dot after it.
 *  • «Колофон», brandDescription (contains the registration ID), schedule; info links; copyright with
 *    {year}; language toggles (`data-v2-lang`, current one rouge with a pencil underline).
 * Data: content/footer + settings/site via useContent with the Footer.tsx defaults.
 * Phones: the links / toggles stay clear of the 56 px sticky MobileBookBar (+ safe area).
 */
import { Link } from 'react-router-dom';
import { useT } from '../../../hooks/useT';
import { useLang, type LangCode } from '../../../context/LangContext';
import { v2Languages } from '../lib/copy';
import Seam from './Seam';
import Pencil from './Pencil';
import { DEFAULT_FOOTER, pickText, useFooterCms } from './pageBKit';
import './Colophon.css';

export interface ColophonProps {
  id?: string;
}

/** main-site footer keys for the known legal pages (used when the CMS link has no name_<lang>) */
const LINK_KEYS: Record<string, string> = {
  '/legal-notice': 'footer.legal',
  '/privacy-policy': 'footer.privacy',
  '/terms-of-service': 'footer.terms',
  '/cookie-policy': 'footer.cookies',
};

export default function Colophon({ id = 'colophon' }: ColophonProps) {
  const t = useT();
  const { lang, setLang, languages } = useLang();
  const { footer, loading } = useFooterCms();

  // the LV CMS text names the brand «LabSkin» (content/footer.brandDescription_lv) — the brand is
  // SKINLAB; corrected here until the owner fixes the field (review round 2)
  const desc = loading ? '' : pickText(footer, 'brandDescription', lang).replace(/\bLab\s?Skin\b/gi, 'SKINLAB');
  const schedTitle = pickText(footer, 'scheduleTitle', lang) || DEFAULT_FOOTER.scheduleTitle;
  const weekdays = loading ? '' : pickText(footer, 'scheduleWeekdays', lang);
  const weekends = loading ? '' : pickText(footer, 'scheduleWeekends', lang);
  const copyright = (pickText(footer, 'copyright', lang) || DEFAULT_FOOTER.copyright).replace(
    '{year}',
    String(new Date().getFullYear()),
  );
  const links = footer.infoLinks && footer.infoLinks.length > 0 ? footer.infoLinks : DEFAULT_FOOTER.infoLinks!;
  const langs = v2Languages(languages);
  const linkName = (l: { name: string; href: string; [k: string]: any }) => {
    const own = lang !== 'ru' ? l[`name_${lang}`] : l.name;
    if (typeof own === 'string' && own.trim()) return own;
    const key = LINK_KEYS[l.href];
    const tr = key ? t(key) : '';
    return tr && tr !== key ? tr : pickText(l, 'name', lang) || l.name;
  };

  return (
    <>
      <Seam seed={31} fill="oat" />
      <footer id={id} className="v2-colo" aria-labelledby={`${id}-h`}>
        <div className="v2-grid v2-colo__grid">
          <div className="v2-colo__about">
            <h2 id={`${id}-h`} className="v2-kicker v2-colo__label">
              {t('v2.colophon')}
            </h2>
            <p className="v2-small v2-colo__desc">{desc}</p>
            {(weekdays || weekends) && (
              <div className="v2-colo__sched">
                <p className="v2-kicker">{schedTitle}</p>
                {weekdays && <p className="v2-small">{weekdays}</p>}
                {weekends && <p className="v2-small">{weekends}</p>}
              </div>
            )}
          </div>

          <nav className="v2-colo__nav" aria-label={t('v2.colophon.links')}>
            <p className="v2-kicker v2-colo__label" aria-hidden="true">
              {t('v2.colophon.links')}
            </p>
            <ul>
              {links.map((l, i) => (
                <li key={i}>
                  <Link to={l.href} className="v2-link v2-link--quiet v2-colo__link">
                    {linkName(l)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="v2-colo__base">
            <p className="v2-colo__copy">{copyright}</p>
            {langs.length > 1 && (
              <div className="v2-colo__langs" role="group" aria-label={t('v2.lang.label')}>
                {langs.map((l, i) => {
                  const on = l.code === lang;
                  return (
                    <span key={l.code} className="v2-colo__langwrap">
                      {i > 0 && (
                        <span className="v2-colo__sep" aria-hidden="true">
                          ·
                        </span>
                      )}
                      <button
                        type="button"
                        className={`v2-colo__lang${on ? ' is-on' : ''}`}
                        data-v2-lang={l.code}
                        lang={l.code}
                        aria-label={l.label}
                        aria-pressed={on}
                        onClick={() => setLang(l.code as LangCode)}
                      >
                        {l.code.toUpperCase()}
                        {on && <Pencil.Underline className="v2-colo__under" draw="none" />}
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <p className="v2-colo__mark" aria-hidden="true">
            SKINLAB<span className="v2-colo__dot" />
          </p>
        </div>
      </footer>
    </>
  );
}
