/**
 * Letter «От автора» (#letter) — DESIGN.md §5.7. PAGE-B-owned. Heavy left, 3 beats.
 * One text column (cols 3–10): kicker, the name in 2 authored lines, the CMS `subtitle` as a pull quote,
 * then the portrait floated left at 42 % in the `consultation` («seed») token with
 * `shape-outside: border-box` (≥ 1024) so `text` + `text2` wrap around the blob edge; drop cap
 * (`initial-letter: 4`, float fallback). Credentials as marginalia (rail ≥ 1280, «※» footnotes below),
 * the Bad Script signature (aria-hidden; the plain name is the heading) and «Подробнее обо мне →».
 * No stats, counters or experience numbers (§11) — `stats` from content/about are ignored.
 * Data: Firestore content/about (About.tsx field names and defaults).
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useT } from '../../../hooks/useT';
import { useLang } from '../../../context/LangContext';
import { useRevealOnce } from '../lib/useRevealOnce';
import { DisplayLines, honest, isHonest, pickText, typo, useClipReveal, useMedia } from './pageBKit';
import './Letter.css';

export interface LetterProps {
  id?: string;
}

interface AboutDoc {
  name?: string;
  subtitle?: string;
  text?: string;
  text2?: string;
  imageUrl?: string;
  image?: string;
  regNumber?: string;
  [k: string]: any;
}

/** About.tsx defaults (stats deliberately absent). */
const DEFAULTS: AboutDoc = {
  name: 'Анастасия Букина',
  regNumber: '59850068090',
  subtitle: 'Комплексный подход к молодости и здоровью вашей кожи',
  text: 'Я — Анастасия Букина, косметолог с высшим медицинским образованием Латвийского Университета по специальности медицинская сестра.',
  text2:
    'В моей практике косметология — это не просто процедуры, а глубокий медицинский анализ. Я убеждена, что истинный результат достижим лишь тогда, когда мы смотрим на проблему комплексно, учитывая внутренние и внешние факторы.',
  // About.tsx's default portrait (storage.googleapis.com/aida-uploads/…) answers 403 — no default image;
  // without a CMS portrait the seed blob stays empty instead of showing a broken image.
  imageUrl: '',
};

/** LV / EN for the default subtitle (About.tsx would show the Russian one) — needs native review. */
const SUBTITLE_I18N: Record<string, string> = {
  lv: 'Kompleksa pieeja jūsu ādas jaunībai un veselībai',
  en: 'A comprehensive approach to the youth and health of your skin',
};

let aboutCache: AboutDoc | null = null;

function useAbout() {
  const [data, setData] = useState<AboutDoc | null>(aboutCache);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (aboutCache) return;
    let live = true;
    getDoc(doc(db, 'content', 'about'))
      .then((snap) => {
        const d = (snap.exists() ? snap.data() : {}) as AboutDoc;
        aboutCache = d;
        if (live) setData(d);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  return { data, ready: data !== null || failed };
}

export default function Letter({ id = 'letter' }: LetterProps) {
  const t = useT();
  const { lang } = useLang();
  const { data, ready } = useAbout();
  const d = data ?? {};

  const name = pickText(d, 'name', lang) || (lang === 'ru' ? DEFAULTS.name : '') || t('v2.letter.signature');
  const [first, ...rest] = name.trim().split(/\s+/);
  const nameLines = rest.length ? `${first} / ${rest.join(' ')}` : first;

  const subtitleRaw = pickText(d, 'subtitle', lang);
  const subtitle = subtitleRaw || (lang === 'ru' ? DEFAULTS.subtitle : SUBTITLE_I18N[lang] ?? DEFAULTS.subtitle);
  const paras = [pickText(d, 'text', lang) || DEFAULTS.text, pickText(d, 'text2', lang) || DEFAULTS.text2]
    .map((p) => typo(honest(p), lang))
    .filter(Boolean);
  const reg = (typeof d.regNumber === 'string' && d.regNumber.trim()) || DEFAULTS.regNumber;
  const imgSrc = (ready && (d.imageUrl || d.image || DEFAULTS.imageUrl)) || '';
  const [badImg, setBadImg] = useState<string | null>(null);
  const img = imgSrc && imgSrc !== badImg ? imgSrc : '';

  const xl = useMedia('(min-width: 1280px)');
  const rise = useRevealOnce('rise');
  const sign = useClipReveal(0.5);

  const creds = (
    <ul className={xl ? 'v2-letter__creds' : 'v2-letter__creds v2-letter__creds--foot'}>
      <li className="v2-mono v2-mono--plain">{t('v2.letter.cred')}</li>
      <li className="v2-mono v2-mono--plain">
        {t('v2.cover.reg')}&nbsp;{reg}
      </li>
    </ul>
  );

  return (
    <section id={id} className="v2-section v2-cv v2-pad-3 v2-letter" aria-labelledby={`${id}-h`}>
      <div className="v2-grid v2-letter__grid">
        <div className="v2-letter__col">
          <p className="v2-kicker v2-letter__kicker">{t('v2.letter.kicker')}</p>
          <h2
            id={`${id}-h`}
            className="v2-dl v2-letter__name"
            style={{ '--chars': Math.max(7, first.length, rest.join(' ').length) } as CSSProperties}
          >
            <DisplayLines text={nameLines} />
          </h2>
          {subtitle && isHonest(subtitle) && (
            <blockquote className="v2-quote v2-letter__quote">
              <p>{typo(subtitle, lang)}</p>
            </blockquote>
          )}

          <div className="v2-letter__flow">
            <motion.figure className="v2-letter__portrait" data-shape="consultation" {...rise}>
              <div className="v2-shape v2-letter__mask">
                {img && (
                  <img
                    src={img}
                    width={723}
                    height={1280}
                    alt={name}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => setBadImg(img)}
                  />
                )}
              </div>
            </motion.figure>
            <div className="v2-letter__body">
              {paras.map((p, i) => (
                <p key={i} className="v2-body">
                  {p}
                </p>
              ))}
            </div>
            <div className="v2-letter__foot">
              {!xl && creds}
              <motion.p className="v2-letter__signwrap" aria-hidden="true" {...sign.parent}>
                <motion.span className="v2-hand v2-letter__sign" {...sign.child}>
                  {t('v2.letter.signature')}
                </motion.span>
              </motion.p>
              <p>
                <Link to="/about" className="v2-link">
                  {t('v2.letter.more').replace(/\s*→\s*$/, '')}{' '}
                  <span className="v2-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </p>
            </div>
          </div>
        </div>

        {xl && <aside className="v2-letter__rail">{creds}</aside>}
      </div>
    </section>
  );
}
