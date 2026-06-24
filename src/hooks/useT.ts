/**
 * Translation hook that combines:
 * 1. Static UI translations (from translations.ts bundle)
 * 2. CMS Firestore field resolution with {field}_lv suffix pattern
 *
 * Usage:
 *   const t = useT();
 *   t('nav.home')           // → static translation
 *   t('Подробнее', 'Uzzināt vairāk')  // → inline fallback
 */

import { useCallback } from 'react';
import { useLang, LangCode } from '../context/LangContext';
import { staticTranslations } from '../lib/translations';

/**
 * Returns a translation function `t(key, lvOverride?)`.
 * - If `key` exists in staticTranslations for current lang, returns that.
 * - Otherwise falls back to `lvOverride` (if lang is 'lv') or `key` itself.
 */
export function useT() {
  const { lang } = useLang();

  const t = useCallback(
    (key: string, lvFallback?: string): string => {
      // 1 — Try static translations
      const bucket = staticTranslations[lang];
      if (bucket && bucket[key]) return bucket[key];

      // 2 — If lang is lv and we have an explicit lv fallback
      if (lang === 'lv' && lvFallback) return lvFallback;

      // 3 — Try Russian as ultimate fallback
      const ruBucket = staticTranslations['ru'];
      if (ruBucket && ruBucket[key]) return ruBucket[key];

      // 4 — Return key itself (it's likely already readable Russian text)
      return key;
    },
    [lang],
  );

  return t;
}

/**
 * Resolve a CMS field with language suffix.
 * E.g. for lang='lv', field='title':
 *   → data.title_lv if present, otherwise data.title
 *
 * For lang='ru' or default:
 *   → data.title (no suffix)
 */
export function useCmsField() {
  const { lang } = useLang();

  const resolve = useCallback(
    <T = string>(data: Record<string, any> | null | undefined, field: string, fallback?: T): T => {
      if (!data) return (fallback ?? '') as T;

      // For non-default languages, try suffixed field first
      if (lang !== 'ru') {
        const suffixed = `${field}_${lang}`;
        if (data[suffixed] !== undefined && data[suffixed] !== null && data[suffixed] !== '') {
          return data[suffixed] as T;
        }
        // Suffixed field missing — prefer language-aware fallback over Russian base field
        if (fallback !== undefined && fallback !== null && fallback !== ('' as T)) {
          return fallback as T;
        }
      }

      // Default: return base field (Russian)
      if (data[field] !== undefined && data[field] !== null) {
        return data[field] as T;
      }

      return (fallback ?? '') as T;
    },
    [lang],
  );

  return resolve;
}

/**
 * Convenience: get current active language code.
 */
export function useCurrentLang(): LangCode {
  const { lang } = useLang();
  return lang;
}
