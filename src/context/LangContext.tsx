import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type LangCode = 'ru' | 'en' | 'lv' | 'uk' | 'lt' | 'et' | 'es';

/** Master list of all available languages in the system */
export const ALL_LANG_OPTIONS = [
  { code: 'ru' as LangCode, label: 'Русский',    flag: '🇷🇺' },
  { code: 'en' as LangCode, label: 'English',    flag: '🇬🇧' },
  { code: 'lv' as LangCode, label: 'Latviešu',   flag: '🇱🇻' },
  { code: 'uk' as LangCode, label: 'Українська', flag: '🇺🇦' },
  { code: 'lt' as LangCode, label: 'Lietuvių',   flag: '🇱🇹' },
  { code: 'et' as LangCode, label: 'Eesti',      flag: '🇪🇪' },
  { code: 'es' as LangCode, label: 'Español',    flag: '🇪🇸' },
] as const;

/** Default if Firestore hasn't loaded yet */
const DEFAULT_ENABLED: LangCode[] = ['ru', 'en', 'lv'];

interface LangContextValue {
  lang: LangCode;
  setLang: (lang: LangCode) => Promise<void>;
  /** Only the languages enabled in admin settings */
  languages: { code: LangCode; label: string; flag: string }[];
  isLoading: boolean;
}

const LangContext = createContext<LangContextValue | null>(null);

const STORAGE_KEY = 'skinlab_lang';

function getStoredLang(enabled: LangCode[]): LangCode {
  const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
  if (stored && enabled.includes(stored)) return stored;

  // Auto-detect from browser
  const browser = navigator.language.slice(0, 2).toLowerCase() as LangCode;
  if (enabled.includes(browser)) return browser;

  return enabled[0] ?? 'ru';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [enabledCodes, setEnabledCodes] = useState<LangCode[]>(DEFAULT_ENABLED);
  const [lang, setLangState] = useState<LangCode>('ru');
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to admin settings/site for enabledLanguages
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'site'),
      (snap) => {
        let enabled: LangCode[] = DEFAULT_ENABLED;
        if (snap.exists()) {
          const raw = snap.data()?.enabledLanguages;
          if (Array.isArray(raw) && raw.length > 0) {
            // Filter to only valid LangCodes
            const valid = raw.filter((c): c is LangCode =>
              ALL_LANG_OPTIONS.some((o) => o.code === c)
            );
            if (valid.length > 0) enabled = valid;
          }
        }
        setEnabledCodes(enabled);

        // If current lang is no longer enabled, switch to first available
        setLangState((prev) => {
          const next = enabled.includes(prev) ? prev : getStoredLang(enabled);
          document.documentElement.lang = next;
          return next;
        });

        setIsLoading(false);
      },
      (err) => {
        // Firestore error — fall back to defaults silently
        console.warn('[LangContext] settings load failed:', err);
        const fallback = getStoredLang(DEFAULT_ENABLED);
        setLangState(fallback);
        document.documentElement.lang = fallback;
        setIsLoading(false);
      }
    );
    return unsub;
  }, []);

  const setLang = async (newLang: LangCode) => {
    if (!enabledCodes.includes(newLang)) return;
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
    document.documentElement.lang = newLang;
  };

  // Build filtered language list in the same order as ALL_LANG_OPTIONS
  const languages = ALL_LANG_OPTIONS.filter((o) => enabledCodes.includes(o.code));

  return (
    <LangContext.Provider value={{ lang, setLang, languages, isLoading }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}

/** @deprecated use ALL_LANG_OPTIONS */
export const SUPPORTED_LANGUAGES = ALL_LANG_OPTIONS;
