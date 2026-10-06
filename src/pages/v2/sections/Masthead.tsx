/**
 * Masthead — wordmark, nav, language toggles, «Записаться» pill, «Содержание» menu (DESIGN.md §5.1).
 * PAGE-A-owned. Menu state lives in HomeV2 (the mobile bar hides while the menu is open).
 *
 *  - ≥ 1280: 72 px bar on the 12-col grid — wordmark + micro-line (cols 1–3), mono nav (cols 5–9),
 *    RU · LV · EN + ink pill (cols 10–12). 768–1279: nav → «Содержание» menu button, pill stays.
 *    < 768: 56 px bar — wordmark, pill (40 px visual, 44 px hit) and the menu button.
 *  - Hairline after 24 px of scroll. Hides on scroll down / shows on scroll up (y transform only,
 *    0.3 s) — never while the menu is open or while the scroll position is within the cover; static
 *    under reduced motion. aria-current marks the nav link of the section in view.
 *  - Menu overlay: full-screen paper dialog (aria-modal, focus trap, Esc, focus returns to the
 *    button), serif links on staggered indents, language toggles, phone + address in mono.
 */
import { Fragment, useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { useCmsField, useT } from '../../../hooks/useT';
import { useLang } from '../../../context/LangContext';
import { useContent } from '../../../hooks/useContent';
import { v2Languages, pad2 } from '../lib/copy';
import { EASE_OUT } from '../lib/useRevealOnce';
import { primeSectionLayout, scrollToSection, settleOnSection } from '../lib/scrollToSection';
import { formatPhone, isPlaceholder, streetAddress } from './pageBKit';
import Pencil from './Pencil';
import './Masthead.css';

export interface MastheadProps {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
}

const NAV = [
  { id: 'procedures', key: 'v2.nav.procedures' },
  { id: 'atlas', key: 'v2.nav.atlas' },
  { id: 'works', key: 'v2.nav.works' },
  { id: 'letter', key: 'v2.nav.about' },
  { id: 'faq', key: 'v2.nav.faq' },
] as const;
const NAV_IDS = NAV.map((n) => n.id);

/** settings/site — same defaults as src/components/Footer.tsx */
export interface SiteSettings {
  phone: string;
  email?: string;
  address: string;
  address_lv?: string;
  socialLinks?: { instagram?: string; telegram?: string };
  [k: string]: unknown;
}
export const DEFAULT_SITE: SiteSettings = {
  phone: '+371 00 000 000',
  email: 'hello@estheticlab.ru',
  address: 'Рига, Латвия',
  socialLinks: {},
};
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

interface HeaderCms {
  bookingButtonText?: string;
  bookingButtonText_lv?: string;
  [k: string]: unknown;
}

/** RU · LV · EN — enabled languages ∩ ru/lv/en; current in rouge with a pencil underline. */
export function LangToggles({ className }: { className?: string }) {
  const t = useT();
  const { lang, setLang, languages } = useLang();
  const list = v2Languages(languages);
  if (list.length < 2) return null;
  return (
    <div className={['v2-langs', className].filter(Boolean).join(' ')} role="group" aria-label={t('v2.lang.label')}>
      {list.map((l, i) => {
        const on = l.code === lang;
        return (
          <Fragment key={l.code}>
            {i > 0 && (
              <span className="v2-langs__sep" aria-hidden="true">
                ·
              </span>
            )}
            <button
              type="button"
              className="v2-langs__btn"
              data-v2-lang={l.code}
              aria-pressed={on}
              onClick={() => void setLang(l.code)}
            >
              <span lang={l.code}>{l.code.toUpperCase()}</span>
              <span className="v2-sr-only" lang={l.code}>
                {' '}
                {l.label}
              </span>
              {on && <Pencil.Underline active className="v2-langs__ul" />}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

/** id of the nav section currently crossing the upper-middle of the viewport */
function useSectionInView(ids: readonly string[]): string | null {
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        setCurrent(ids.find((id) => seen.get(id)) ?? null);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    let observed = 0;
    const attach = () => {
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && !seen.has(id)) {
          seen.set(id, false);
          io.observe(el);
          observed++;
        }
      }
    };
    attach();
    // sections owned by others may mount a moment later
    const retry = observed < ids.length ? window.setTimeout(attach, 1200) : undefined;
    return () => {
      io.disconnect();
      if (retry) window.clearTimeout(retry);
    };
  }, [ids]);
  return current;
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      {open ? (
        <path d="M6 6.4 18 17.6M18 6.4 6 17.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path
          d="M3.5 8.2c5.6-.7 11.3-.5 17 .1M4.5 15.6c4.9.6 10.3.5 15.9-.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Masthead({ menuOpen, onMenuOpenChange }: MastheadProps) {
  const t = useT();
  const f = useCmsField();
  const reduce = useReducedMotion();
  const { data: headerCms } = useContent<HeaderCms>('content/header', {});
  const { data: site, loading: siteLoading } = useContent<SiteSettings>('settings/site', DEFAULT_SITE);
  const settings = site || DEFAULT_SITE;
  // never a working tel: link to the Footer.tsx placeholder (+371 00 000 000) — neither while
  // settings/site loads nor when Firestore is unreachable (review round 2)
  const phone = !siteLoading && !isPlaceholder('phone', settings.phone) ? settings.phone : '';
  // a bare «Riga, Latvia» is not an address: shown only when it names a street (pageBKit)
  const address = siteLoading ? '' : streetAddress(f<string>(settings, 'address', ''));
  const bookLabel = f<string>(headerCms || {}, 'bookingButtonText', t('v2.cta.book')) || t('v2.cta.book');

  const inView = useSectionInView(NAV_IDS);

  // ── hide on scroll down / show on scroll up (§5.1) ──────────────────────────────────────
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);
  useMotionValueEvent(scrollY, 'change', (y) => {
    setScrolled(y > 24);
    const prev = lastY.current;
    lastY.current = y;
    if (reduce || menuOpen) return setHidden(false);
    const cover = document.getElementById('cover');
    const coverEnd = cover ? cover.offsetTop + cover.offsetHeight : 0;
    if (y < coverEnd - 80) return setHidden(false);
    if (y > prev + 4) setHidden(true);
    else if (y < prev - 4) setHidden(false);
  });
  useEffect(() => {
    if (menuOpen || reduce) setHidden(false);
  }, [menuOpen, reduce]);

  // ── menu overlay: focus trap, Esc, scroll lock, focus return ────────────────────────────
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const wasOpen = useRef(false);
  /** false when the menu closes because a section link was chosen: focus goes to that section */
  const returnFocus = useRef(true);
  const close = useCallback(() => onMenuOpenChange(false), [onMenuOpenChange]);

  useEffect(() => {
    if (!menuOpen) {
      if (wasOpen.current && returnFocus.current) menuBtnRef.current?.focus({ preventScroll: true });
      wasOpen.current = false;
      returnFocus.current = true;
      return;
    }
    wasOpen.current = true;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('.v2-menu__link')?.focus({ preventScroll: true });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !menuRef.current) return;
      const items = (Array.from(menuRef.current.querySelectorAll(FOCUSABLE)) as HTMLElement[]).filter(
        (el) => el.offsetParent !== null,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!menuRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      root.style.overflow = prevOverflow;
    };
  }, [menuOpen, close]);

  // close on desktop resize (the nav is inline there)
  useEffect(() => {
    if (!menuOpen) return;
    const mql = window.matchMedia('(min-width: 1280px)');
    const onChange = () => mql.matches && close();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [menuOpen, close]);

  /**
   * menu links: close first, then scroll once the page is scrollable again, then move focus to the
   * chosen section (WCAG 2.4.3 — the next Tab continues from there, not from the top of the page).
   */
  const goTo = (e: ReactMouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return; // let the browser handle it
    e.preventDefault();
    returnFocus.current = false;
    close();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        try {
          window.history.replaceState(window.history.state, '', `#${id}`);
        } catch {
          /* ignore */
        }
        // exact landing despite content-visibility placeholders (lib/scrollToSection.ts)
        void scrollToSection(id, { smooth: !reduce }).then(() => {
          const el = document.getElementById(id);
          if (!el) return;
          if (!el.matches('a[href], button, input, select, textarea, [tabindex]')) el.setAttribute('tabindex', '-1');
          el.focus({ preventScroll: true });
        });
      }),
    );
  };

  /**
   * bar links + wordmark: keep the native fragment jump (history entry, focus starting point) but
   * give the skipped sections their real heights first, then correct any residual drift.
   */
  const jump = (e: ReactMouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    primeSectionLayout();
    void settleOnSection(target);
  };

  return (
    <>
      <motion.header
        className="v2-mast"
        data-scrolled={scrolled ? '' : undefined}
        initial={false}
        animate={{ y: hidden ? '-100%' : '0%' }}
        transition={{ duration: reduce ? 0 : 0.3, ease: EASE_OUT }}
        onFocusCapture={() => setHidden(false)}
      >
        <div className="v2-grid v2-mast__grid">
          <a href="#cover" className="v2-mast__brand" onClick={(e) => jump(e, 'cover')}>
            <span className="v2-mast__word">SKINLAB</span>
            <span className="v2-mast__tag">{t('v2.masthead.tagline')}</span>
          </a>

          <nav className="v2-mast__nav" aria-label={t('v2.nav.label')}>
            <ul>
              {NAV.map((n) => (
                <li key={n.id}>
                  <a
                    href={`#${n.id}`}
                    className="v2-mast__link"
                    aria-current={inView === n.id ? 'true' : undefined}
                    onClick={(e) => jump(e, n.id)}
                  >
                    {t(n.key)}
                    <Pencil.Underline active={inView === n.id} className="v2-mast__ul" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="v2-mast__actions">
            <LangToggles className="v2-mast__langs" />
            <Link to="/booking" className="v2-pill v2-mast__pill">
              {bookLabel}
            </Link>
            <button
              ref={menuBtnRef}
              type="button"
              className="v2-mast__menubtn"
              aria-expanded={menuOpen}
              aria-controls="v2-menu"
              aria-haspopup="dialog"
              onClick={() => onMenuOpenChange(!menuOpen)}
            >
              <span className="v2-mast__menulabel">{t('v2.nav.menu')}</span>
              <MenuIcon open={false} />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            id="v2-menu"
            className="v2-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t('v2.nav.menu')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: EASE_OUT }}
          >
            <div className="v2-menu__top">
              <span className="v2-mast__word" aria-hidden="true">
                SKINLAB
              </span>
              <button type="button" className="v2-mast__menubtn v2-menu__close" onClick={close}>
                <span className="v2-menu__closelabel">{t('v2.nav.close')}</span>
                <MenuIcon open />
              </button>
            </div>

            <nav className="v2-menu__nav" aria-label={t('v2.nav.label')}>
              <ol className="v2-menu__list">
                {NAV.map((n, i) => (
                  <motion.li
                    key={n.id}
                    initial={reduce ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.04 + i * 0.05, ease: EASE_OUT }}
                  >
                    <a
                      href={`#${n.id}`}
                      className="v2-menu__link"
                      aria-current={inView === n.id ? 'true' : undefined}
                      onClick={(e) => goTo(e, n.id)}
                    >
                      <span className="v2-menu__num" aria-hidden="true">
                        {pad2(i + 1)}
                      </span>
                      <span className="v2-menu__label">{t(n.key)}</span>
                    </a>
                  </motion.li>
                ))}
              </ol>
            </nav>

            <div className="v2-menu__foot">
              <LangToggles className="v2-menu__langs" />
              <Link to="/booking" className="v2-pill v2-menu__pill" onClick={close}>
                {bookLabel}
              </Link>
              {(phone || address) && (
                <address className="v2-menu__contacts">
                  {phone && (
                    <a href={telHref(phone)} className="v2-menu__phone">
                      {formatPhone(phone)}
                    </a>
                  )}
                  {address && <span>{address}</span>}
                </address>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
