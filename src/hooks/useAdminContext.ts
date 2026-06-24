/**
 * useAdminContext.ts — Reads live admin data from Firestore
 * so the duck can give context-aware tips and feed the Gemini prompt.
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AdminSnapshot } from '../lib/gemini';

const PAGE_LABELS: Record<string, string> = {
  '/admin': 'Дашборд',
  '/admin/bookings': 'Бронирования',
  '/admin/slots': 'Управление слотами',
  '/admin/content': 'Редактор контента',
  '/admin/services': 'Услуги',
  '/admin/settings': 'Настройки',
};

export function useAdminContext(): AdminSnapshot {
  const location = useLocation();
  const [snapshot, setSnapshot] = useState<AdminSnapshot>({
    currentPage: 'Дашборд',
    pendingBookings: 0,
    todayBookings: 0,
    totalBookings: 0,
    todaySlotsAvailable: 0,
  });

  const currentPage =
    PAGE_LABELS[location.pathname] ||
    PAGE_LABELS[
      Object.keys(PAGE_LABELS)
        .reverse()
        .find((k) => location.pathname.startsWith(k)) || '/admin'
    ] ||
    'Admin';

  useEffect(() => {
    // --- Pending bookings (real-time) ---
    const pendingUnsub = onSnapshot(
      query(collection(db, 'bookings'), where('status', '==', 'pending')),
      (snap) => {
        setSnapshot((prev) => ({ ...prev, pendingBookings: snap.size }));
      },
      (err) => console.warn('[DuckCtx] pending:', err)
    );

    // --- Today's bookings (real-time) ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayUnsub = onSnapshot(
      query(
        collection(db, 'bookings'),
        where('createdAt', '>=', Timestamp.fromDate(todayStart)),
        where('createdAt', '<=', Timestamp.fromDate(todayEnd))
      ),
      (snap) => {
        setSnapshot((prev) => ({ ...prev, todayBookings: snap.size }));
      },
      (err) => console.warn('[DuckCtx] today:', err)
    );

    // --- Available slots today ---
    const todayStr = new Date().toISOString().split('T')[0];
    const slotsUnsub = onSnapshot(
      query(
        collection(db, 'slots'),
        where('date', '==', todayStr),
        where('isAvailable', '==', true)
      ),
      (snap) => {
        setSnapshot((prev) => ({ ...prev, todaySlotsAvailable: snap.size }));
      },
      (err) => console.warn('[DuckCtx] slots:', err)
    );

    // --- Total bookings (one-time) ---
    getDocs(collection(db, 'bookings'))
      .then((snap) => {
        setSnapshot((prev) => ({ ...prev, totalBookings: snap.size }));
      })
      .catch(() => {});

    return () => {
      pendingUnsub();
      todayUnsub();
      slotsUnsub();
    };
  }, []);

  return { ...snapshot, currentPage };
}
