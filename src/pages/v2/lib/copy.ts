/**
 * copy.ts — small helpers for the v2.* copy deck (DESIGN.md §3.2 typesetting rules, §7).
 *
 * Display headlines are AUTHORED lines per language, stored in one key with " / " breaks and the
 * italic line wrapped in *…*:  "Эстетическая / *косметология* / в Риге".
 * Never rely on automatic wrapping for display type — render one block element per line.
 */

export interface AuthoredLine {
  text: string;
  italic: boolean;
}

/** "A / *B* / C" → [{A}, {B, italic}, {C}] */
export function splitLines(s: string | null | undefined): AuthoredLine[] {
  if (!s) return [];
  return s
    .split(/\s+\/\s+/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const m = raw.match(/^\*(.+)\*$/);
      return m ? { text: m[1], italic: true } : { text: raw, italic: false };
    });
}

/** Replace `{name}` placeholders: fill('Глава {n} — {title}', { n: '05', title: 'Биостимуляция' }). */
export function fill(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** "5" → "05" (chapter numbers, zone kickers). */
export const pad2 = (n: number) => String(n).padStart(2, '0');

const SHY = '­';
/** Soft-hyphen break points for long display words (DESIGN.md §3.2). Extend as needed. */
const SOFT_HYPHENS: Record<string, string> = {
  Биоревитализация: `Био${SHY}ревита${SHY}лизация`,
  Биостимуляция: `Био${SHY}стимуляция`,
  Мезотерапия: `Мезо${SHY}терапия`,
  Biorevitalizācija: `Bio${SHY}revitalizā${SHY}cija`,
  Biostimulācija: `Bio${SHY}stimulā${SHY}cija`,
  Mezoterapija: `Mezo${SHY}terapija`,
  Biorevitalization: `Bio${SHY}revitali${SHY}zation`,
  Biostimulation: `Bio${SHY}stimu${SHY}lation`,
  Mesotherapy: `Meso${SHY}therapy`,
};

/** Insert soft hyphens into the known long words of a string (case-sensitive, whole words). */
export function shy(text: string): string {
  let out = text;
  for (const [word, hyph] of Object.entries(SOFT_HYPHENS)) {
    out = out.replace(new RegExp(`(^|[^\\p{L}])${word}(?=$|[^\\p{L}])`, 'gu'), `$1${hyph}`);
  }
  return out;
}

const NBSP = '\u00a0';
/** 1–2 letter word (в, к, с, и, а, о, у, я, не, на, по, un, ar, a, to …) followed by spaces */
const SHORT_WORD = /(^|[\s(«„"“'])([\p{L}]{1,2})[ \t]+(?=[\p{L}\p{N}«„"“(])/gu;
/** the last word of a paragraph when it is short («день.», «нас.») */
const LAST_SHORT = /[ \t]+([\p{L}\p{N}]{1,5}[.!?…:;,»”)]*)[ \t]*$/u;

/**
 * Light typograf for body copy (RU / LV / EN), DESIGN.md §3.2 + review round 2:
 *  - 1–2 letter words are glued to the next word with a no-break space (never «подход к / …»,
 *    «косметолог с / …», «анализ. Я / …» at a line end);
 *  - a dash is glued to the word before it;
 *  - a short last word is glued to the one before it (no «день.» widow).
 * Line breaks inside the text (CMS pre-line copy) are kept. Pure; safe on any string.
 */
export function typograf(text: string | null | undefined, _lang?: string): string {
  if (!text) return '';
  let s = text.replace(/[ \t]+([—–])(?=[ \t])/g, `${NBSP}$1`);
  // twice: chains like «и в лицо» / «а я»
  for (let i = 0; i < 2; i++) s = s.replace(SHORT_WORD, (_m, pre: string, w: string) => `${pre}${w}${NBSP}`);
  return s
    .split('\n')
    .map((line) => line.replace(LAST_SHORT, `${NBSP}$1`))
    .join('\n');
}

/** Languages /v2 offers (intersected with useLang().languages for the toggles, DESIGN.md §5.0). */
export const V2_LANGS = ['ru', 'lv', 'en'] as const;
export type V2Lang = (typeof V2_LANGS)[number];

/** Enabled languages ∩ ['ru','lv','en'], in V2 order. */
export function v2Languages<T extends { code: string }>(enabled: readonly T[]): T[] {
  return V2_LANGS.map((c) => enabled.find((l) => l.code === c)).filter((l): l is T => Boolean(l));
}

/** The film exists in ru / lv / en only; anything else plays the ru cut (DESIGN.md §6.1). */
export function filmLang(lang: string): V2Lang {
  return (V2_LANGS as readonly string[]).includes(lang) ? (lang as V2Lang) : 'ru';
}
