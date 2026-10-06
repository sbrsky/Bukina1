/**
 * pageBKit.tsx — small helpers shared by the page-B sections (Spread, Proof, Letter, FirstVisit,
 * Questions, Booking, Colophon). PAGE-B-owned; nothing here is a foundation primitive.
 *
 * Why it exists:
 *  • Live Firestore `services` docs use transliterated ids (`biostimulyatsiya`, …) while the page speaks
 *    canonical CategoryIds. `useCatalog()` wraps page-A's `useV2Categories()` (lib/categories.ts) and
 *    `serviceHref()` uses its routeIds, so `/service/:id` always points at a live doc.
 *  • Honesty rules (DESIGN.md §11.8): `honest()` drops CMS sentences / list items that make absolute
 *    claims or mention botox before they reach the page.
 *  • Authored display lines (`DisplayLines`), Footer.tsx-compatible site/footer CMS hooks, a
 *    matchMedia hook, and phone/social normalisers.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Variants } from 'motion/react';
import type { FirestoreServiceCategory } from '../../../hooks/useServices';
import { useContent } from '../../../hooks/useContent';
import type { CategoryId } from '../lib/shapes';
import { serviceHref as categoryHref, useV2Categories, type V2Categories } from '../lib/categories';
import { splitLines, typograf, type AuthoredLine } from '../lib/copy';
import { useRevealOnce } from '../lib/useRevealOnce';
import { formatPrice } from '../lib/prices';

/* ── catalog: live services ↔ canonical category ids (page-A's resolver, lib/categories.ts) ─── */

export type Treatment = FirestoreServiceCategory['treatments'][number];
export type Cat = FirestoreServiceCategory & { cid: CategoryId };

export interface Catalog {
  /** page-A's resolver result (routeIds for /service links) */
  cats: V2Categories;
  byId: Map<CategoryId, Cat>;
  /** categories in FILM order (CATEGORY_ORDER) */
  list: Cat[];
  /** true once live Firestore data replaced the servicesData fallback */
  live: boolean;
}

/**
 * useV2Categories() (live Firestore `services`, keyed by canonical CategoryId; servicesData until
 * Firestore answers) adapted to the shape the page-B sections read. Never hardcode names/prices.
 */
export function useCatalog(): Catalog {
  const cats = useV2Categories();
  return useMemo(() => {
    const byId = new Map<CategoryId, Cat>();
    const list: Cat[] = [];
    for (const c of cats.list) {
      const cat = { ...(c.data as unknown as FirestoreServiceCategory), cid: c.id } as Cat;
      byId.set(c.id, cat);
      list.push(cat);
    }
    return { cats, byId, list, live: cats.list.some((c) => c.live) };
  }, [cats]);
}

/** `/service/<live doc id>` (+ `?treatment=<name>` like ServicesPage) via page-A's serviceHref. */
export function serviceHref(catalog: Catalog, cid: CategoryId, treatmentName?: string): string {
  const base = categoryHref(catalog.cats, cid);
  return treatmentName ? `${base}?treatment=${encodeURIComponent(treatmentName)}` : base;
}

/* ── CMS field resolution (same semantics as useCmsField: `<field>_<lang>` → base) ─────────── */

export function pickField<T = string>(obj: Record<string, any> | null | undefined, field: string, lang: string): T | undefined {
  if (!obj) return undefined;
  if (lang !== 'ru') {
    const v = obj[`${field}_${lang}`];
    if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) return v as T;
  }
  const b = obj[field];
  return b === undefined || b === null ? undefined : (b as T);
}

export const pickText = (obj: Record<string, any> | null | undefined, field: string, lang: string): string => {
  const v = pickField<unknown>(obj, field, lang);
  return typeof v === 'string' ? v : '';
};

export const pickList = (obj: Record<string, any> | null | undefined, field: string, lang: string): string[] => {
  const v = pickField<unknown>(obj, field, lang);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
};

/* ── honesty filter (DESIGN.md §11.8) ─────────────────────────────────────────────────────── */

const DISHONEST = new RegExp(
  [
    // absolute claims
    'мгновенн',
    'навсегда',
    'за\\s*(?:1|один|одну)\\s*(?:визит|процедур|сеанс)',
    'без\\s+реабилитац',
    'идеальн',
    'безупречн',
    'гарантир',
    'uzreiz',
    'momentān',
    'uz visiem laikiem',
    'mūžīg',
    'vienā vizītē',
    'bez rehabilitācij',
    'ideāl',
    'nevainojam',
    'garantē',
    'instant',
    'forever',
    'permanent',
    'in (?:one|a single) (?:visit|session)',
    'no downtime',
    'flawless',
    'perfect',
    'guarantee',
    '100\\s*%',
    // botox is never shown (§11.8)
    'ботокс',
    'botox',
    'botoks',
    // unverified stats (§11.8)
    '\\d+\\s*\\+\\s*(?:лет|клиент|gad|klient|years?|clients?)',
  ].join('|'),
  'iu',
);

/** true if a string is fine to show (no absolute claim, botox or unverified stat). */
export const isHonest = (s: string | null | undefined) => !!s && !DISHONEST.test(s);

/** Split into sentences (keeps the terminal punctuation). */
export function sentences(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…])\s+(?=[«"„'(A-ZА-ЯЁĀČĒĢĪĶĻŅŠŪŽ0-9])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Drop dishonest sentences from a CMS paragraph. */
export function honest(text: string | null | undefined): string {
  return sentences(text).filter(isHonest).join(' ');
}

/** First honest sentence (spread pull quotes). */
export function firstHonestSentence(text: string | null | undefined): string {
  return sentences(text).find(isHonest) ?? '';
}

/**
 * Straight quotes → language quotes ('стеклянной' → «стеклянной»), then the light typograf
 * (lib/copy.ts: short words glued to the next word, no short widow at the end).
 */
export function typo(text: string, lang: string): string {
  const [o, c] = lang === 'lv' ? ['„', '”'] : lang === 'en' ? ['“', '”'] : ['«', '»'];
  return typograf(text.replace(/'([^']+)'/g, `${o}$1${c}`).replace(/"([^"]+)"/g, `${o}$1${c}`), lang);
}

/* ── authored display lines ──────────────────────────────────────────────────────────────── */

export interface DisplayLinesProps {
  text: string;
  /** extra class per line (receives the line + its index) */
  lineClass?: (line: AuthoredLine, i: number) => string | undefined;
  /** custom renderer for a line's content */
  render?: (line: AuthoredLine, i: number) => ReactNode;
}

/**
 * One block element per authored line (DESIGN.md §3.2), with a space text node between lines so the
 * accessible name is not run together. Put it inside the heading element.
 */
export function DisplayLines({ text, lineClass, render }: DisplayLinesProps) {
  const lines = splitLines(text);
  return (
    <>
      {lines.map((l, i) => (
        <span
          key={i}
          className={['v2-line', l.italic && 'v2-line--italic', lineClass?.(l, i)].filter(Boolean).join(' ')}
        >
          {i > 0 ? ' ' : ''}
          {render ? render(l, i) : l.text}
        </span>
      ))}
    </>
  );
}

/* ── media queries ───────────────────────────────────────────────────────────────────────── */

export function useMedia(query: string, ssrDefault = false): boolean {
  const [match, setMatch] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : ssrDefault,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/* ── site settings + footer CMS (Footer.tsx shapes and defaults) ───────────────────────────── */

export interface SiteSettings {
  phone: string;
  email: string;
  address: string;
  address_lv?: string;
  socialLinks: { instagram?: string; telegram?: string };
  [k: string]: any;
}

export interface FooterCms {
  brandDescription: string;
  brandDescription_lv?: string;
  scheduleTitle: string;
  scheduleTitle_lv?: string;
  scheduleWeekdays: string;
  scheduleWeekdays_lv?: string;
  scheduleWeekends: string;
  scheduleWeekends_lv?: string;
  copyright: string;
  copyright_lv?: string;
  infoLinks?: { name: string; name_lv?: string; href: string; [k: string]: any }[];
  [k: string]: any;
}

/** Footer.tsx defaults (the phone/email there are placeholders → never rendered, see isPlaceholder). */
export const DEFAULT_SITE: SiteSettings = {
  phone: '+371 00 000 000',
  email: 'hello@estheticlab.ru',
  address: 'Рига, Латвия',
  socialLinks: {},
};

export const DEFAULT_FOOTER: FooterCms = {
  brandDescription: 'Эстетическая косметология и профессиональный уход.\nАнастасия Букина, косметолог\n(ID: 59850068090)',
  scheduleTitle: 'График работы',
  scheduleWeekdays: 'Пн - Пт: 09:00 - 20:00',
  scheduleWeekends: 'Сб - Вс: по предварительной записи',
  copyright: '© {year} SKINLAB. Все права защищены.',
  infoLinks: [
    { name: 'Правовая информация', href: '/legal-notice' },
    { name: 'Политика конфиденциальности', href: '/privacy-policy' },
    { name: 'Политика предоставления услуг', href: '/terms-of-service' },
    { name: 'Политика Cookie', href: '/cookie-policy' },
  ],
};

export function useSite() {
  const { data, loading } = useContent<SiteSettings>('settings/site', DEFAULT_SITE);
  return { site: data || DEFAULT_SITE, loading };
}

export function useFooterCms() {
  const { data, loading } = useContent<FooterCms>('content/footer', DEFAULT_FOOTER);
  return { footer: data || DEFAULT_FOOTER, loading };
}

/** Footer.tsx placeholder values must never be shown as real contacts. */
export function isPlaceholder(kind: 'phone' | 'email', value: string | null | undefined): boolean {
  if (!value) return true;
  if (kind === 'phone') return value.replace(/\D/g, '').replace(/^371/, '').replace(/0/g, '') === '';
  return value.trim().toLowerCase() === DEFAULT_SITE.email;
}

/** «+37122158228» → «+371 22 158 228» (other formats pass through). */
export function formatPhone(raw: string): string {
  const s = (raw || '').trim();
  const m = s.replace(/[\s-]/g, '').match(/^\+371(\d{8})$/);
  if (!m) return s;
  const d = m[1];
  return `+371 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

export const telHref = (raw: string) => `tel:${(raw || '').replace(/[^0-9+]/g, '')}`;

/**
 * A CMS address that names a street (it has a house number), else '' — a bare «Riga, Latvia» /
 * «Рига, Латвия» is a city, not an address, and must not be presented as one (review round 2).
 */
export function streetAddress(raw: string | null | undefined): string {
  const s = (raw || '').trim();
  return /\d/.test(s) ? s : '';
}

/** Google Maps search link for a street address (opens the map app on phones). */
export const mapHref = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/** Normalise a CMS social value into a safe https URL, or null (e.g. an e-mail typed into «telegram»). */
export function socialUrl(kind: 'instagram' | 'telegram', raw: string | null | undefined): string | null {
  const v = (raw || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
    } catch {
      return null;
    }
  }
  const host = kind === 'instagram' ? 'instagram.com' : 't.me';
  if (/^(?:www\.)?(?:instagram\.com|t\.me|telegram\.me)\//i.test(v)) return `https://${v.replace(/^www\./i, '')}`;
  const handle = v.replace(/^@/, '');
  if (/^[A-Za-z0-9_.]{3,32}$/.test(handle)) return `https://${host}/${handle}`;
  return null;
}

/** «https://instagram.com/skinlab.lv» → «@skinlab.lv» */
export function socialLabel(url: string): string {
  try {
    const u = new URL(url);
    const h = u.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
    return h ? `@${h}` : u.host;
  } catch {
    return url;
  }
}

/* ── reveals ─────────────────────────────────────────────────────────────────────────────── */

/**
 * clip-path L→R with generous vertical / trailing slack, so display descenders, italic overhangs and
 * Bad Script flourishes are never cut by `inset(0)` once revealed.
 */
export const CLIP_LR_LOOSE: Variants = {
  hidden: { clipPath: 'inset(-35% 100% -35% -6%)' },
  shown: { clipPath: 'inset(-35% -6% -35% -6%)' },
};

/**
 * Clip-path L→R reveal, split in two because Chromium's IntersectionObserver measures the target's
 * own *clipped* rect: an element that starts at `inset(… 100% …)` never intersects, so a plain
 * `whileInView` + clipLR on the same node never fires. Spread `parent` on an unclipped wrapper (it
 * owns the viewport trigger) and `child` on the clipped element. Static under reduced motion.
 */
export function useClipReveal(amount = 0.6, delay?: number) {
  const parent = useRevealOnce('stagger', { amount, delay });
  const child = { variants: CLIP_LR_LOOSE, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const, delay } };
  return { parent, child };
}

/* ── prices ──────────────────────────────────────────────────────────────────────────────── */

/**
 * A treatment's CMS price string for display in the current language: the price field has no `_lv`
 * variant, so a Russian «от 120 €» becomes `v2.price.from` («no 120 €» / «from 120 €»). Other strings
 * pass through formatPrice(). Never invents a price.
 */
export function localPrice(price: string | null | undefined, lang: string, t: (k: string) => string): string {
  const raw = (price ?? '').trim();
  if (!raw) return '';
  const m = raw.match(/^(?:от|no|from)\s+(\d+(?:[.,]\d+)?)\s*€?$/i);
  if (m && lang !== 'ru') return formatPrice(t('v2.price.from').replace('{p}', m[1]));
  return formatPrice(raw);
}
