/**
 * MobileBookBar (< 768 only) — sticky paper slip: ink pill «Записаться · от {minAll} €» + a 44 × 44
 * oat phone button (DESIGN.md §5.12). PAGE-A-owned.
 *
 * Shown once the cover's bottom edge has left the viewport; hidden while the booking section is
 * ≥ 20 % visible or the menu is open. y 100 % → 0 in 0.35 s (opacity only under reduced motion).
 * While hidden it is unmounted (no focus, not in the a11y tree). `minAll` = the lowest price across
 * all categories, live from useServices() with the servicesData fallback.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useT } from '../../../hooks/useT';
import { useContent } from '../../../hooks/useContent';
import { minPriceAll, nbspPrice } from '../lib/prices';
import { useV2Categories } from '../lib/categories';
import { EASE_OUT } from '../lib/useRevealOnce';
import { DEFAULT_SITE, telHref, type SiteSettings } from './Masthead';
import { isPlaceholder } from './pageBKit';
import './MobileBookBar.css';

export interface MobileBookBarProps {
  menuOpen: boolean;
}

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

export default function MobileBookBar({ menuOpen }: MobileBookBarProps) {
  const t = useT();
  const reduce = useReducedMotion();
  const isPhone = useIsPhone();
  const minAll = minPriceAll(useV2Categories().all);
  const { data: site, loading: siteLoading } = useContent<SiteSettings>('settings/site', DEFAULT_SITE);
  // the call button only for a real number: never tel:+37100000000 (the Footer.tsx placeholder)
  // while settings/site loads or when Firestore is unreachable (review round 2)
  const phone = !siteLoading && site && !isPlaceholder('phone', site.phone) ? site.phone : '';

  const [pastCover, setPastCover] = useState(false);
  const [atBooking, setAtBooking] = useState(false);

  useEffect(() => {
    if (!isPhone) return;
    const observers: IntersectionObserver[] = [];
    let retry: number | undefined;
    const attach = () => {
      const cover = document.getElementById('cover');
      const booking = document.getElementById('booking');
      if (cover && !observers[0]) {
        const io = new IntersectionObserver(([e]) => {
          // the cover's bottom edge is above the viewport
          setPastCover(!e.isIntersecting && e.boundingClientRect.bottom <= 0);
        });
        io.observe(cover);
        observers[0] = io;
      }
      if (booking && !observers[1]) {
        const io = new IntersectionObserver(([e]) => setAtBooking(e.intersectionRatio >= 0.2), {
          threshold: [0, 0.2, 0.4],
        });
        io.observe(booking);
        observers[1] = io;
      }
      if (!cover || !booking) retry = window.setTimeout(attach, 1200);
    };
    attach();
    return () => {
      observers.forEach((o) => o?.disconnect());
      if (retry) window.clearTimeout(retry);
    };
  }, [isPhone]);

  const shown = isPhone && pastCover && !atBooking && !menuOpen;
  const label = minAll !== null ? nbspPrice(t('v2.mobileBar').replace('{p}', String(minAll))) : t('v2.cta.book');

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          className="v2-bar"
          role="region"
          aria-label={t('v2.cta.book')}
          initial={reduce ? { opacity: 0 } : { y: '130%' }}
          animate={reduce ? { opacity: 1 } : { y: '0%' }}
          exit={reduce ? { opacity: 0 } : { y: '130%' }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
        >
          <Link to="/booking" className="v2-pill v2-bar__pill">
            {label}
          </Link>
          {phone && (
            <a href={telHref(phone)} className="v2-iconbtn v2-bar__call" aria-label={t('v2.call')}>
              <Phone size={18} strokeWidth={1.8} aria-hidden="true" />
            </a>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
