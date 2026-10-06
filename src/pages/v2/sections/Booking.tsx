/**
 * Booking «Запишитесь» (#booking) — DESIGN.md §5.10. PAGE-B-owned. Full-bleed ink (`.v2-on-ink`, grain
 * .08 screen) with <Seam seed={21} fill="ink"> on top, 5 beats.
 *  • cols 1–9 (giant): paper display lines «Запишитесь — / кабинет в Риге.» at --v2-fs-h1 × .8, revealed
 *    L→R (clip-path) on view.
 *  • cols 8–12: content/cta.subtitle, the blush pill → /booking, phone (tel:), e-mail, address (with the
 *    rouge pencil pin — tiny element), schedule, Instagram / Telegram when the CMS values are real links.
 * Keep id="booking": MobileBookBar hides while this section is ≥ 20 % visible.
 * Footer.tsx placeholder contacts («+371 00 000 000», hello@estheticlab.ru) are never rendered.
 */
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useT } from '../../../hooks/useT';
import { useLang } from '../../../context/LangContext';
import { useContent } from '../../../hooks/useContent';
import { splitLines } from '../lib/copy';
import { DUR, EASE_OUT_SOFT, useRevealOnce } from '../lib/useRevealOnce';
import Seam from './Seam';
import {
  CLIP_LR_LOOSE,
  formatPhone,
  honest,
  isPlaceholder,
  mapHref,
  streetAddress,
  typo,
  pickText,
  socialLabel,
  socialUrl,
  telHref,
  useFooterCms,
  useSite,
} from './pageBKit';
import './Booking.css';

export interface BookingProps {
  id?: string;
}

/** the rouge pencil pin (aria-hidden) */
function Pin() {
  return (
    <svg className="v2-booking__pin" viewBox="0 0 20 26" aria-hidden="true" focusable="false">
      <path d="M10.2 24.6 C7.4 19.9 3.1 15.2 2.9 9.8 C2.7 5.4 6 2.1 10 2 C14.3 1.9 17.4 5.3 17.2 9.7 C16.9 15 12.7 19.8 10.2 24.6 Z" />
      <path d="M10.1 7 C8.6 7.1 7.6 8.3 7.7 9.6 C7.8 11 9 11.9 10.3 11.8 C11.7 11.7 12.6 10.5 12.5 9.2 C12.4 7.9 11.3 6.9 10.1 7 Z" />
    </svg>
  );
}

export default function Booking({ id = 'booking' }: BookingProps) {
  const t = useT();
  const { lang } = useLang();
  const { site, loading: siteLoading } = useSite();
  const { footer, loading: footerLoading } = useFooterCms();
  const { data: cta } = useContent<any>('content/cta');

  const lines = splitLines(t('v2.booking.h'));
  const chars = Math.max(10, ...lines.map((l) => l.text.length));
  // the CMS subtitle («Запишитесь на первичную консультацию сегодня.») repeated the headline's
  // verb, and the pill says it a third time (review round 2): a subtitle that repeats the verb of
  // the headline is replaced by the authored v2.booking.sub line
  const verb = (lines[0]?.text.match(/\p{L}+/u)?.[0] ?? '').slice(0, 5).toLowerCase();
  const cmsSub = honest(pickText(cta, 'subtitle', lang));
  const subtitle = typo(cmsSub && !(verb.length >= 4 && cmsSub.toLowerCase().includes(verb)) ? cmsSub : t('v2.booking.sub'), lang);
  const pill = pickText(cta, 'buttonText', lang) || t('v2.cta.bookOnline');

  const phone = !siteLoading && !isPlaceholder('phone', site.phone) ? site.phone : '';
  const email = !siteLoading && !isPlaceholder('email', site.email) ? site.email : '';
  // only a real street address, with a map link; a bare «Riga, Latvia» (live today) is hidden —
  // the headline already says «кабинет в Риге»
  const address = siteLoading ? '' : streetAddress(pickText(site, 'address', lang));
  const weekdays = footerLoading ? '' : pickText(footer, 'scheduleWeekdays', lang);
  const weekends = footerLoading ? '' : pickText(footer, 'scheduleWeekends', lang);
  const socials = (['instagram', 'telegram'] as const)
    .map((k) => ({ k, url: socialUrl(k, site.socialLinks?.[k]) }))
    .filter((s): s is { k: 'instagram' | 'telegram'; url: string } => !!s.url);

  const stagger = useRevealOnce('stagger', { stagger: 0.12, amount: 0.5 });

  return (
    <>
      <Seam seed={21} fill="ink" />
      <section id={id} className="v2-section v2-cv v2-pad-5 v2-on-ink v2-booking" aria-labelledby={`${id}-h`}>
        <div className="v2-grid v2-booking__grid">
          <motion.h2
            id={`${id}-h`}
            className="v2-booking__h"
            style={{ '--chars': chars } as CSSProperties}
            {...stagger}
          >
            {lines.map((l, i) => (
              <motion.span
                key={i}
                className={l.italic ? 'v2-line v2-line--italic' : 'v2-line'}
                variants={CLIP_LR_LOOSE}
                transition={{ duration: DUR.d5, ease: EASE_OUT_SOFT }}
              >
                {i > 0 ? ' ' : ''}
                {l.text}
              </motion.span>
            ))}
          </motion.h2>

          <div className="v2-booking__info">
            {subtitle && <p className="v2-booking__sub">{subtitle}</p>}
            <p className="v2-booking__cta">
              <Link to="/booking" className="v2-pill v2-pill--blush v2-booking__pill">
                {pill.replace(/\s*→\s*$/, '')}{' '}
                <span className="v2-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </p>

            <dl className="v2-booking__facts">
              <div className="v2-booking__fact">
                <dt className="v2-booking__dt">{t('v2.booking.phone')}</dt>
                <dd className="v2-booking__dd">
                  {phone ? (
                    <a href={telHref(phone)} className="v2-link v2-link--quiet v2-booking__phone">
                      {formatPhone(phone)}
                    </a>
                  ) : (
                    <span className="v2-booking__ph" aria-hidden="true" />
                  )}
                  {email && (
                    <a href={`mailto:${email}`} className="v2-link v2-link--quiet v2-booking__mail">
                      {email}
                    </a>
                  )}
                </dd>
              </div>
              {address && (
                <div className="v2-booking__fact">
                  <dt className="v2-booking__dt">{t('v2.booking.address')}</dt>
                  <dd className="v2-booking__dd v2-booking__addr">
                    <Pin />
                    <a href={mapHref(address)} target="_blank" rel="noopener noreferrer" className="v2-link v2-link--quiet">
                      {address}
                    </a>
                  </dd>
                </div>
              )}
              {(weekdays || weekends || footerLoading) && (
                <div className="v2-booking__fact">
                  <dt className="v2-booking__dt">{t('v2.booking.schedule')}</dt>
                  <dd className="v2-booking__dd">
                    {weekdays && <span className="v2-booking__line">{weekdays}</span>}
                    {weekends && <span className="v2-booking__line">{weekends}</span>}
                  </dd>
                </div>
              )}
              {socials.length > 0 && (
                <div className="v2-booking__fact">
                  <dt className="v2-sr-only">Instagram · Telegram</dt>
                  <dd className="v2-booking__dd v2-booking__socials">
                    {socials.map((s) => (
                      <a
                        key={s.k}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="v2-link v2-link--quiet"
                      >
                        <span className="v2-booking__net">{s.k === 'instagram' ? 'Instagram' : 'Telegram'}</span>{' '}
                        {socialLabel(s.url)}
                      </a>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
