/**
 * slots.ts — Firestore CRUD for the /slots collection
 * Only admins create/delete slots. Clients only read available ones.
 */
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Slot } from '../types/booking';

const SLOTS = 'slots';

// ─── Read ─────────────────────────────────────────────────────────────────────

/** One-time fetch of all slots for a given date (admin use). */
export async function getSlotsByDate(date: string): Promise<Slot[]> {
  const q = query(
    collection(db, SLOTS),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  const slots = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Slot));
  return slots.sort((a, b) => a.time.localeCompare(b.time));
}

/** One-time fetch of slots for a whole month (YYYY-MM). */
export async function getSlotsByMonth(yearMonth: string): Promise<Slot[]> {
  const start = `${yearMonth}-01`;
  const end = `${yearMonth}-32`; // guaranteed past any valid date
  const q = query(
    collection(db, SLOTS),
    where('date', '>=', start),
    where('date', '<=', end)
  );
  const snap = await getDocs(q);
  const slots = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Slot));
  return slots.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
}

/** Real-time subscription to available slots for a given date. */
export function subscribeAvailableSlots(
  date: string,
  callback: (slots: Slot[]) => void
): Unsubscribe {
  const q = query(
    collection(db, SLOTS),
    where('date', '==', date),
    where('isAvailable', '==', true)
  );
  return onSnapshot(q, (snap) => {
    const slots = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Slot));
    slots.sort((a, b) => a.time.localeCompare(b.time));
    callback(slots);
  });
}

// ─── Write (admin only) ───────────────────────────────────────────────────────

/** Create a single slot. Returns the new slot ID. */
export async function createSlot(date: string, time: string): Promise<string> {
  const ref = await addDoc(collection(db, SLOTS), {
    date,
    time,
    isAvailable: true,
    bookingId: null,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

/** Batch-create multiple slots for a single date. Returns created IDs. */
export async function createSlotsBatch(
  date: string,
  times: string[]
): Promise<string[]> {
  const batch = writeBatch(db);
  const ids: string[] = [];
  for (const time of times) {
    const ref = doc(collection(db, SLOTS));
    batch.set(ref, {
      date,
      time,
      isAvailable: true,
      bookingId: null,
      createdAt: Timestamp.now(),
    });
    ids.push(ref.id);
  }
  await batch.commit();
  return ids;
}

/** Delete a slot — only allowed if isAvailable is true (no active booking). */
export async function deleteSlot(slotId: string): Promise<void> {
  await deleteDoc(doc(db, SLOTS, slotId));
}

// ─── Default time templates ────────────────────────────────────────────────────

export const DEFAULT_SLOT_TIMES = [
  '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00',
];

export const MORNING_SLOTS = ['09:00', '10:00', '11:00', '12:00'];
export const AFTERNOON_SLOTS = ['13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
