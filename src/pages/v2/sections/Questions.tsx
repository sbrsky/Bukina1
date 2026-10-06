/**
 * Questions «Частые вопросы» (#faq) — DESIGN.md §5.9. PAGE-B-owned. Offset right (cols 4–11), 4 beats.
 * Left rail (cols 1–2): a vertical «Q&A». Questions in NSD italic 300, answers in Onest body.
 * APG accordion: each question is `<h3><button aria-expanded aria-controls>` controlling a
 * `role="region"` labelled by the button; several items can be open; height animates with
 * `grid-template-rows: 0fr → 1fr` (0.35 s; instant under reduced motion via v2.css).
 * Data: Firestore content/faq with FAQ.tsx's language selection (items_<lang> → items_lv → items).
 * CMS `mainTitle` overrides the headline only when it carries authored lines («A / *B*»); a plain
 * string («FAQ») cannot be set as display type, so the authored v2.faq.h2 stays.
 */
import { useId, useState, type CSSProperties } from 'react';
import { useT } from '../../../hooks/useT';
import { useLang } from '../../../context/LangContext';
import { useContent } from '../../../hooks/useContent';
import { pad2, splitLines } from '../lib/copy';
import { DisplayLines, pickText, typo } from './pageBKit';
import './Questions.css';

export interface QuestionsProps {
  id?: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

function getItems(data: any, lang: string): FaqItem[] {
  if (!data) return [];
  const langKey = `items_${lang}`;
  let items: any[] = data.items;
  if (lang !== 'ru' && Array.isArray(data[langKey]) && data[langKey].length > 0) items = data[langKey];
  else if (lang === 'lv' && Array.isArray(data.items_lv) && data.items_lv.length > 0) items = data.items_lv;
  return (Array.isArray(items) ? items : []).filter(
    (it): it is FaqItem => it && typeof it.question === 'string' && it.question.trim() !== '',
  );
}

/** a break opportunity after «/» (long LV/RU compounds like «biorevitalizācijas/mezoterapijas») */
const breakSlashes = (s: string) => s.replace(/\/(?=\S)/g, '/\u200b');

/** hand-drawn plus (rotates 45° into a cross when open) */
function Plus() {
  return (
    <svg className="v2-faq__plus" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <path d="M14.3 4.2 C13.6 10.4 14.6 17.2 13.8 23.9" />
      <path d="M4.1 13.6 C10.6 14.5 17.3 13.4 23.8 14.2" />
    </svg>
  );
}

export default function Questions({ id = 'faq' }: QuestionsProps) {
  const t = useT();
  const { lang } = useLang();
  const { data, loading } = useContent<any>('content/faq');
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const uid = useId().replace(/:/g, '');

  const items = getItems(data, lang);
  const cmsTitle = pickText(data, 'mainTitle', lang);
  const h2 = cmsTitle && / \/ /.test(cmsTitle) ? cmsTitle : t('v2.faq.h2');
  const chars = Math.max(8, ...splitLines(h2).map((l) => l.text.length));

  if (!loading && items.length === 0) return null;

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section id={id} className="v2-section v2-cv v2-pad-4 v2-faq" aria-labelledby={`${id}-h`}>
      <div className="v2-grid v2-faq__grid">
        <p className="v2-spine v2-faq__rail" aria-hidden="true">
          {t('v2.faq.rail')}
        </p>
        <div className="v2-faq__col">
          <h2 id={`${id}-h`} className="v2-dl v2-faq__h" style={{ '--chars': chars } as CSSProperties}>
            <DisplayLines text={h2} />
          </h2>

          <div className="v2-faq__list" aria-busy={loading || undefined}>
            {items.map((it, i) => {
              const isOpen = open.has(i);
              const bid = `${uid}-q${i}`;
              const rid = `${uid}-a${i}`;
              return (
                <div key={i} className={`v2-faq__item${isOpen ? ' is-open' : ''}`}>
                  <h3 className="v2-faq__qh">
                    <button
                      type="button"
                      id={bid}
                      className="v2-faq__q"
                      aria-expanded={isOpen}
                      aria-controls={rid}
                      onClick={() => toggle(i)}
                    >
                      <span className="v2-num v2-faq__n" aria-hidden="true">
                        {pad2(i + 1)}
                      </span>
                      <span className="v2-faq__qt">{breakSlashes(typo(it.question.trim(), lang))}</span>
                      <Plus />
                    </button>
                  </h3>
                  <div id={rid} role="region" aria-labelledby={bid} className="v2-faq__a">
                    <div className="v2-faq__inner">
                      <p className="v2-body v2-faq__text">{breakSlashes(typo(String(it.answer ?? '').trim(), lang))}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
