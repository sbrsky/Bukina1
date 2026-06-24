import { useState, useEffect } from 'react';
import { subscribeAvailableSlots } from '../lib/slots';
import type { Slot } from '../types/booking';

/**
 * Real-time hook that subscribes to available slots for a given date.
 * Automatically resubscribes when date changes.
 */
export function useAvailableSlots(date: string | null) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSlots([]);

    const unsubscribe = subscribeAvailableSlots(date, (incoming) => {
      setSlots(incoming);
      setLoading(false);
    });

    return unsubscribe;
  }, [date]);

  return { slots, loading };
}
