/**
 * categories.ts — canonical category ids ↔ live Firestore `services` docs. PAGE-A-owned (new file,
 * shared helper; page-B may import it).
 *
 * WHY: the page speaks in canonical ids (`skincare`, `peels`, … — CATEGORY_ORDER, heroChapters,
 * faceZones, shapes), but the live Firestore `services` docs use transliterated slugs as ids
 * (`ukhodovye-protsedury`, `pilingi`, `mezoterapiya`, `biorevitalizatsiya`, `biostimulyatsiya`,
 * `kompleksnye-protsedury`, `konsul-tatsiya`; checked read-only 2026-10-05), and `/service/:id`
 * (src/pages/ServiceDetail.tsx) looks a category up by THAT doc id. So `services.find(c => c.id ===
 * 'skincare')` finds nothing live and `/service/skincare` is a dead link.
 *
 * `useV2Categories()` resolves every doc to its canonical id — exact id, known slug, RU title of the
 * servicesData entry, or (last resort) the most shared treatment names — and returns, per canonical
 * id, the CMS data to render (servicesData until Firestore answers) plus `routeId` for links.
 */
import { useMemo } from 'react';
import { useServices } from '../../../hooks/useServices';
import { servicesData } from '../../../data/servicesData';
import { CATEGORY_ORDER, isCategoryId, type CategoryId } from './shapes';

export type CategoryDoc = {
  id: string;
  title?: string;
  description?: string;
  showInHero?: boolean;
  heroOrder?: number;
  treatments?: ({ name?: string; price?: string } & Record<string, unknown>)[];
} & Record<string, unknown>;

/** Known Firestore doc ids per canonical id (used for links before/without Firestore). */
export const FIRESTORE_SLUGS: Record<CategoryId, string> = {
  skincare: 'ukhodovye-protsedury',
  peels: 'pilingi',
  mesotherapy: 'mezoterapiya',
  biorevitalization: 'biorevitalizatsiya',
  biostimulation: 'biostimulyatsiya',
  complex: 'kompleksnye-protsedury',
  consultation: 'konsul-tatsiya',
};

const FALLBACK = servicesData as unknown as CategoryDoc[];
const norm = (s: unknown) => (typeof s === 'string' ? s.trim().toLowerCase().replace(/ё/g, 'е') : '');

/** Canonical id of a services doc, or null if it cannot be placed. */
export function canonicalCategoryId(doc: CategoryDoc): CategoryId | null {
  if (isCategoryId(doc.id)) return doc.id;
  const bySlug = (Object.keys(FIRESTORE_SLUGS) as CategoryId[]).find((k) => FIRESTORE_SLUGS[k] === doc.id);
  if (bySlug) return bySlug;
  const title = norm(doc.title);
  const byTitle = FALLBACK.find((c) => norm(c.title) === title && isCategoryId(c.id));
  if (byTitle) return byTitle.id as CategoryId;
  // last resort: the fallback category sharing the most treatment names
  const names = new Set((doc.treatments ?? []).map((t) => norm(t?.name)).filter(Boolean));
  let best: CategoryId | null = null;
  let bestN = 0;
  for (const c of FALLBACK) {
    if (!isCategoryId(c.id)) continue;
    const n = (c.treatments ?? []).filter((t) => names.has(norm(t?.name))).length;
    if (n > bestN) {
      best = c.id;
      bestN = n;
    }
  }
  return best;
}

export interface V2Category {
  id: CategoryId;
  /** the id `/service/:id` understands (live Firestore doc id) */
  routeId: string;
  /** CMS doc (or the servicesData entry until Firestore answers) — read fields with useCmsField */
  data: CategoryDoc;
  /** true once the data comes from Firestore */
  live: boolean;
}

export interface V2Categories {
  /** in FILM order (CATEGORY_ORDER); categories missing everywhere are skipped */
  list: V2Category[];
  byId: Partial<Record<CategoryId, V2Category>>;
  /** every doc, for "lowest price overall" style aggregates */
  all: CategoryDoc[];
}

export function useV2Categories(): V2Categories {
  const { services } = useServices();
  return useMemo(() => {
    const live = (services ?? []) as CategoryDoc[];
    const byId: Partial<Record<CategoryId, V2Category>> = {};
    for (const doc of live) {
      const cid = canonicalCategoryId(doc);
      if (cid && !byId[cid]) byId[cid] = { id: cid, routeId: doc.id, data: doc, live: true };
    }
    if (!live.length) {
      for (const doc of FALLBACK) {
        if (isCategoryId(doc.id)) byId[doc.id] = { id: doc.id, routeId: FIRESTORE_SLUGS[doc.id], data: doc, live: false };
      }
    }
    const list = CATEGORY_ORDER.map((cid) => byId[cid]).filter((c): c is V2Category => Boolean(c));
    return { list, byId, all: live.length ? live : FALLBACK };
  }, [services]);
}

/** Link target for a canonical id (`/service/{routeId}`). */
export function serviceHref(cats: V2Categories, cid: CategoryId): string {
  return `/service/${cats.byId[cid]?.routeId ?? FIRESTORE_SLUGS[cid]}`;
}
