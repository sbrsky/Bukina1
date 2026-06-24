import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ServiceCategory } from '../data/servicesData';

// Firestore-compatible service type (icon stored as string id)
export interface FirestoreServiceCategory {
  id: string;
  title: string;
  title_lv?: string;
  description: string;
  description_lv?: string;
  iconName: string;
  seoTitle: string;
  seoDescription: string;
  image: string;
  showInHero?: boolean;  // Whether to display in the Hero slider
  heroOrder?: number;    // Display order in the Hero slider
  treatments: {
    name: string;
    name_lv?: string;
    description: string;
    description_lv?: string;
    price: string;
    indications?: string[];
    results?: string[];
    detailedDescription?: string;
    image?: string;
  }[];
  [key: string]: any; // allow dynamic lang fields (title_en, etc.)
}

let servicesCache: FirestoreServiceCategory[] | null = null;

export function useServices() {
  const [services, setServices] = useState<FirestoreServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (servicesCache) {
        setServices(servicesCache);
        setLoading(false);
        return;
      }

      try {
        const snap = await getDocs(collection(db, 'services'));
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as FirestoreServiceCategory))
          .sort((a, b) => {
            const order = ['mesotherapy', 'biorevitalization', 'biostimulation', 'skincare', 'complex', 'peels', 'consultation'];
            return order.indexOf(a.id) - order.indexOf(b.id);
          });
        servicesCache = data;
        setServices(data);
      } catch (e: any) {
        console.warn('useServices error:', e.message);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const invalidateCache = () => {
    servicesCache = null;
  };

  return { services, loading, error, invalidateCache };
}

export async function updateService(service: FirestoreServiceCategory): Promise<void> {
  const { id, ...data } = service;
  await setDoc(doc(db, 'services', id), data);
  servicesCache = null;
}

export async function deleteService(id: string): Promise<void> {
  await deleteDoc(doc(db, 'services', id));
  servicesCache = null;
}
