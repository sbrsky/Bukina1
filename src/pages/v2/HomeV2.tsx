/**
 * /v2 — "Redline Folio, Riga Edition" page shell (DESIGN.md §5.0). FOUNDATION-owned.
 *
 * Root `.v2` → skip link → Masthead → <main id="main"> sections in page order → Colophon →
 * MobileBookBar → CookieConsent (App.tsx mounts CookieConsent only in the public layout).
 * Section components own their markup + CSS (sections/<Name>.tsx + <Name>.css); see
 * docs/v2/OWNERSHIP.md for who owns what.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { useLang, type LangCode } from '../../context/LangContext';
import { useT } from '../../hooks/useT';
import CookieConsent from '../../components/CookieConsent';

import './v2.css';

import Masthead from './sections/Masthead';
import Cover from './sections/Cover';
import PriceList from './sections/PriceList';
import FaceAtlas from './sections/FaceAtlas';
import Spread from './sections/Spread';
import Proof from './sections/Proof';
import Letter from './sections/Letter';
import FirstVisit from './sections/FirstVisit';
import Questions from './sections/Questions';
import Booking from './sections/Booking';
import Colophon from './sections/Colophon';
import MobileBookBar from './sections/MobileBookBar';
import { scrollToSection } from './lib/scrollToSection';
import { filmLang } from './lib/copy';

/** While /v2 is in review: noindex + canonical → "/" (DESIGN.md §5.0). Restored on unmount. */
function useReviewHead(title: string) {
  useEffect(() => {
    const head = document.head;
    const prevTitle = document.title;
    document.title = title;

    let robots = head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const prevRobots = robots?.getAttribute('content') ?? null;
    const createdRobots = !robots;
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      head.appendChild(robots);
    }
    robots.content = 'noindex, nofollow';

    let canonical = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prevCanonical = canonical?.getAttribute('href') ?? null;
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      head.appendChild(canonical);
    }
    canonical.href = '/';

    return () => {
      document.title = prevTitle;
      if (createdRobots) robots?.remove();
      else if (prevRobots !== null) robots?.setAttribute('content', prevRobots);
      if (createdCanonical) canonical?.remove();
      else if (prevCanonical !== null) canonical?.setAttribute('href', prevCanonical);
    };
  }, [title]);
}

/**
 * LangContext (main site, frozen) keeps 'ru' after a reload even when the visitor picked another
 * language (it reads `skinlab_lang` only when the current language is disabled). On /v2 the stored
 * choice is honoured once, before the first paint.
 *
 * The stored language is read SYNCHRONOUSLY in a state initializer and returned as `pending`, so the
 * very first render already uses it for the film (Cover → HeroFilm poster + useHeroPlayer): the RU
 * poster <img fetchpriority="high"> is never created for a returning LV/EN visitor (it used to be,
 * and kept downloading after being replaced — two high-priority posters, review round 2). The
 * layout effect then switches LangContext and clears `pending` in the same pre-paint re-render.
 * If settings/site later turns out not to enable that language, LangContext falls back as usual.
 */
function useRestoreStoredLang(): LangCode | null {
  const { lang, setLang, languages } = useLang();
  const [pending, setPending] = useState<LangCode | null>(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem('skinlab_lang');
    } catch {
      /* storage blocked */
    }
    return stored && stored !== lang && languages.some((l) => l.code === stored) ? (stored as LangCode) : null;
  });
  useLayoutEffect(() => {
    if (!pending) return;
    void setLang(pending);
    setPending(null);
    // once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return pending;
}

/**
 * Deep links (/v2#faq): the route chunk renders after the browser's own fragment scroll, and the
 * sections below the cover are content-visibility placeholders — jump once fonts are in.
 */
function useInitialHashScroll() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id || id === 'main') return;
    let alive = true;
    const go = () => alive && document.getElementById(id) && void scrollToSection(id, { smooth: false });
    const timer = window.setTimeout(() => {
      (document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(go));
    }, 60);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);
}

export default function HomeV2() {
  const { lang } = useLang();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const pendingLang = useRestoreStoredLang();
  useInitialHashScroll();

  // <html lang> follows LangContext on /v2 (Latvian `locl` forms depend on it). On unmount it is left
  // at the CURRENT LangContext language — not a value captured earlier: the previous version restored
  // a stale 'ru' captured by the last effect run, so /booking opened after an LV switch kept LV copy
  // under lang="ru" (review round 2). LangContext.setLang writes html.lang itself as well.
  const langRef = useRef(lang);
  langRef.current = lang;
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(
    () => () => {
      document.documentElement.lang = langRef.current;
    },
    [],
  );

  useReviewHead('SKINLAB — эстетическая косметология в Риге');

  return (
    <MotionConfig reducedMotion="user">
      <div className="v2" lang={lang}>
        <a href="#main" className="v2-skip v2-pill">
          {t('v2.skip')}
        </a>

        <Masthead menuOpen={menuOpen} onMenuOpenChange={setMenuOpen} />

        <main id="main" className="v2-main" tabIndex={-1}>
          <Cover filmLang={pendingLang ? filmLang(pendingLang) : undefined} />
          <PriceList />
          <FaceAtlas />
          <Spread slot={0} />
          <Spread slot={1} />
          <Spread slot={2} />
          <Proof />
          <Letter />
          <FirstVisit />
          <Questions />
          <Booking />
        </main>

        <Colophon />
        <MobileBookBar menuOpen={menuOpen} />
        {/* main-site banner, restyled for /v2 by `.v2-consent` in v2.css */}
        <div className="v2-consent">
          <CookieConsent />
        </div>
      </div>
    </MotionConfig>
  );
}
