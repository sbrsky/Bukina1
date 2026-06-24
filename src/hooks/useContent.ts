import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// In-memory cache per session
const cache: Record<string, { data: any; ts: number }> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function useContent<T = any>(path: string, fallback?: T) {
  const [data, setData] = useState<T | null>(fallback ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Check cache
    const cached = cache[path];
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    try {
      const [collection, docId] = path.split('/');
      const snap = await getDoc(doc(db, collection, docId));
      if (snap.exists()) {
        const result = snap.data() as T;
        cache[path] = { data: result, ts: Date.now() };
        setData(result);
      } else {
        setData(fallback ?? null);
      }
    } catch (e: any) {
      console.warn(`useContent(${path}) error:`, e.message);
      setError(e.message);
      setData(fallback ?? null);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    delete cache[path];
    setLoading(true);
    load();
  };

  return { data, loading, error, refresh };
}

/** Utility to update content from admin panel */
export async function updateContent<T = any>(path: string, data: T): Promise<void> {
  const [collection, docId] = path.split('/');
  await setDoc(doc(db, collection, docId), data as any, { merge: true });
  // Invalidate cache
  delete cache[path];
}
