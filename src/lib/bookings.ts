/**
 * bookings.ts — Firestore operations for the /bookings collection.
 * createBooking uses a transaction to atomically reserve a slot.
 * cancelBooking atomically frees the slot back.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { nanoid } from 'nanoid';
import type {
  Booking,
  BookingFormData,
  BookingStatus,
  SelectedService,
} from '../types/booking';
import { sendAllNotifications } from './notifications';

const BOOKINGS = 'bookings';
const SLOTS = 'slots';

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateBookingInput {
  slotId: string;
  date: string;
  time: string;
  service: SelectedService;
  client: BookingFormData;
  /** Telegram/Email notification settings from Firestore /settings. */
  notificationSettings?: {
    telegramBotToken?: string;
    telegramChatId?: string;
  };
}

/**
 * Atomically:
 * 1. Verify the slot is still available (race-condition safe)
 * 2. Create the booking document
 * 3. Mark the slot as unavailable with bookingId reference
 *
 * Throws if the slot was taken between UI display and submission.
 */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const slotRef = doc(db, SLOTS, input.slotId);
  const bookingRef = doc(collection(db, BOOKINGS));
  const cancelToken = nanoid(24); // unguessable client cancellation token
  const now = Timestamp.now();

  const newBooking: Omit<Booking, 'id'> = {
    slotId: input.slotId,
    date: input.date,
    time: input.time,
    serviceId: input.service.id,
    serviceName: input.service.name,
    serviceDuration: input.service.duration,
    servicePrice: input.service.price,
    client: {
      name: input.client.name,
      phone: input.client.phone,
      email: input.client.email,
      comment: input.client.comment,
    },
    status: 'pending',
    payment: {
      status: 'unpaid',
      amount: null,
      currency: 'eur',
      stripePaymentIntentId: null,
      paidAt: null,
    },
    notifications: {
      confirmationSentAt: null,
      reminderSentAt: null,
      cancellationSentAt: null,
    },
    cancellation: null,
    cancelToken,
    createdAt: now,
    updatedAt: now,
  };

  await runTransaction(db, async (tx) => {
    const slotSnap = await tx.get(slotRef);
    if (!slotSnap.exists()) throw new Error('Слот не найден.');
    if (!slotSnap.data().isAvailable) {
      throw new Error('Это время уже забронировано. Пожалуйста, выберите другое.');
    }

    tx.set(bookingRef, newBooking);
    tx.update(slotRef, {
      isAvailable: false,
      bookingId: bookingRef.id,
    });
  });

  const created: Booking = { id: bookingRef.id, ...newBooking };

  // Fire-and-forget notifications (don't block the booking on notification failure)
  sendAllNotifications(
    {
      name: input.client.name,
      phone: input.client.phone,
      email: input.client.email,
      service: input.service.name,
      treatment: `${input.service.duration} • ${input.service.price}`,
      date: input.date,
      time: input.time,
      message: input.client.comment,
      bookingId: bookingRef.id,
    },
    input.notificationSettings ?? {}
  ).catch(console.warn);

  return created;
}

// ─── Cancel by client (via cancelToken) ──────────────────────────────────────

/**
 * Used from the public /booking/cancel?token=xxx page.
 * Atomically frees the slot and marks booking as cancelled_by_client.
 */
export async function cancelBookingByToken(cancelToken: string): Promise<Booking> {
  // Find the booking by cancelToken
  const q = query(
    collection(db, BOOKINGS),
    where('cancelToken', '==', cancelToken)
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('Запись не найдена. Проверьте ссылку.');

  const bookingDoc = snap.docs[0];
  const booking = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;

  if (
    booking.status === 'cancelled_by_client' ||
    booking.status === 'cancelled_by_admin'
  ) {
    throw new Error('Эта запись уже была отменена.');
  }
  if (booking.status === 'completed') {
    throw new Error('Нельзя отменить завершённую процедуру.');
  }

  const bookingRef = doc(db, BOOKINGS, booking.id);
  const slotRef = doc(db, SLOTS, booking.slotId);
  const now = Timestamp.now();

  await runTransaction(db, async (tx) => {
    tx.update(bookingRef, {
      status: 'cancelled_by_client' as BookingStatus,
      cancellation: {
        reason: 'Отменено клиентом',
        cancelledBy: 'client',
        cancelledAt: now,
      },
      updatedAt: now,
    });
    tx.update(slotRef, {
      isAvailable: true,
      bookingId: null,
    });
  });

  return { ...booking, status: 'cancelled_by_client' };
}

// ─── Cancel by admin ──────────────────────────────────────────────────────────

/**
 * Used from the admin dashboard. Frees the slot back.
 */
export async function cancelBookingByAdmin(
  bookingId: string,
  reason = 'Отменено администратором'
): Promise<void> {
  const bookingRef = doc(db, BOOKINGS, bookingId);
  const bookingSnap = await getDoc(bookingRef);
  if (!bookingSnap.exists()) throw new Error('Запись не найдена.');

  const booking = bookingSnap.data() as Omit<Booking, 'id'>;
  const slotRef = doc(db, SLOTS, booking.slotId);
  const now = Timestamp.now();

  await runTransaction(db, async (tx) => {
    tx.update(bookingRef, {
      status: 'cancelled_by_admin' as BookingStatus,
      cancellation: {
        reason,
        cancelledBy: 'admin',
        cancelledAt: now,
      },
      updatedAt: now,
    });
    // Only free slot if it still references this booking
    const slotSnap = await tx.get(slotRef);
    if (slotSnap.exists() && slotSnap.data().bookingId === bookingId) {
      tx.update(slotRef, {
        isAvailable: true,
        bookingId: null,
      });
    }
  });
}

// ─── Admin status update (confirm / complete) ──────────────────────────────────

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<void> {
  await updateDoc(doc(db, BOOKINGS, bookingId), {
    status,
    updatedAt: Timestamp.now(),
  });
}

// ─── Read by cancelToken (public page) ────────────────────────────────────────

export async function getBookingByToken(cancelToken: string): Promise<Booking | null> {
  const q = query(
    collection(db, BOOKINGS),
    where('cancelToken', '==', cancelToken)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Booking;
}

// ─── Admin list ───────────────────────────────────────────────────────────────

export async function getAllBookings(): Promise<Booking[]> {
  const q = query(collection(db, BOOKINGS), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}
