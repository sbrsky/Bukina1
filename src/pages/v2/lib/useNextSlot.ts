/**
 * useNextSlot — the next free booking slot (DESIGN.md §8). PAGE-A-owned.
 *
 * One READ-ONLY Firestore query per page load (module-level promise cache, shared by every caller
 * and every language switch):
 *   getDocs(query(collection(db,'slots'), where('date','>=', todayRiga), orderBy('date'), limit(60)))
 * then, client-side: keep `isAvailable === true`, drop today's slots whose time has passed
 * (Europe/Riga), sort by date + time, take the first. Single-field index on `date` only (no new
 * composite index); slot reads are public per firestore.rules. Mirrors src/lib/slots.ts
 * (`Slot.date` "YYYY-MM-DD" in Riga time, `Slot.time` "HH:MM").
 *
 * Owner override: the query lives HERE — `getNextAvailableSlot()` is NOT added to src/lib/slots.ts
 * (shared files are frozen).
 */
import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface NextSlot {
  /** "YYYY-MM-DD" (Riga) */
  date: string;
  /** "HH:MM" */
  time: string;
  /** formatted date, e.g. «чт, 9 окт» via Intl.DateTimeFormat(lang, { weekday:'short', day:'numeric', month:'short', timeZone:'Europe/Riga' }) */
  dateLabel: string;
}

export type NextSlotStatus = 'loading' | 'ready' | 'none' | 'error';

export interface NextSlotState {
  status: NextSlotStatus;
  slot: NextSlot | null;
}

const TZ = 'Europe/Riga';

/** "now" in Riga as { date: "YYYY-MM-DD", time: "HH:MM" } (independent of the visitor's time zone). */
export function rigaNow(at: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

/** Intl locale per site language («Thu 9 Oct» rather than the US order for English). */
function intlLocale(lang: string): string {
  if (lang === 'en') return 'en-GB';
  return lang || 'ru';
}

/** «чт, 9 окт» — the trailing abbreviation dot of the month is dropped for the chip. */
export function formatSlotDate(date: string, lang: string): string {
  // noon UTC keeps the calendar day stable in every zone; format it in Riga time anyway (§8)
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  try {
    return new Intl.DateTimeFormat(intlLocale(lang), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: TZ,
    })
      .format(d)
      .replace(/\.$/, '');
  } catch {
    return date;
  }
}

type RawSlot = { date: string; time: string } | null;

let pending: Promise<RawSlot> | null = null;

async function fetchNextSlot(): Promise<RawSlot> {
  const now = rigaNow();
  const snap = await getDocs(
    query(collection(db, 'slots'), where('date', '>=', now.date), orderBy('date'), limit(60)),
  );
  const free = snap.docs
    .map((d) => d.data() as { date?: unknown; time?: unknown; isAvailable?: unknown })
    .filter(
      (s): s is { date: string; time: string; isAvailable: true } =>
        s.isAvailable === true && typeof s.date === 'string' && typeof s.time === 'string',
    )
    .filter((s) => s.date > now.date || (s.date === now.date && s.time > now.time))
    .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
  return free[0] ? { date: free[0].date, time: free[0].time } : null;
}

function loadNextSlot(): Promise<RawSlot> {
  if (!pending) {
    pending = fetchNextSlot().catch((e) => {
      pending = null; // allow a retry on the next mount
      throw e;
    });
  }
  return pending;
}

export function useNextSlot(lang: string): NextSlotState {
  const [raw, setRaw] = useState<{ status: NextSlotStatus; slot: RawSlot }>({ status: 'loading', slot: null });

  useEffect(() => {
    let alive = true;
    loadNextSlot()
      .then((slot) => {
        if (alive) setRaw({ status: slot ? 'ready' : 'none', slot });
      })
      .catch((e: unknown) => {
        if (!alive) return;
        console.warn('[v2] next slot unavailable:', e instanceof Error ? e.message : e);
        setRaw({ status: 'error', slot: null });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (raw.status !== 'ready' || !raw.slot) return { status: raw.status, slot: null };
  return {
    status: 'ready',
    slot: { ...raw.slot, dateLabel: formatSlotDate(raw.slot.date, lang) },
  };
}

export default useNextSlot;
