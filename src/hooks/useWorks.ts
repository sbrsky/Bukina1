import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface FirestoreWork {
  id: string;
  title: string;
  title_lv?: string;
  tag?: string; // e.g. ИНЪЕКЦИИ
  tag_lv?: string;
  description: string;
  description_lv?: string;
  image?: string;
  order?: number;
  [key: string]: any; // allow dynamic lang fields
}

let worksCache: FirestoreWork[] | null = null;

export function useWorks() {
  const [works, setWorks] = useState<FirestoreWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (worksCache) {
        setWorks(worksCache);
        setLoading(false);
        return;
      }

      try {
        const snap = await getDocs(collection(db, 'works'));
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as FirestoreWork))
          .sort((a, b) => {
            const orderA = typeof a.order === 'number' ? a.order : 999;
            const orderB = typeof b.order === 'number' ? b.order : 999;
            return orderA - orderB;
          });
        worksCache = data;
        setWorks(data);
      } catch (e: any) {
        console.warn('useWorks error:', e.message);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const invalidateCache = () => {
    worksCache = null;
  };

  return { works, loading, error, invalidateCache };
}

export async function updateWork(work: FirestoreWork): Promise<void> {
  const { id, ...data } = work;
  await setDoc(doc(db, 'works', id), data);
  worksCache = null;
}

export async function deleteWork(id: string): Promise<void> {
  await deleteDoc(doc(db, 'works', id));
  worksCache = null;
}
