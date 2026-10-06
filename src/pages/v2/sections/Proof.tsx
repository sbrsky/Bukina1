/**
 * Proof «Работы» (#works) — DESIGN.md §5.6. PAGE-B-owned.
 * Oat band (Seam 11 on top, Seam 12 below), heavy right.
 *  • giant: a forehead-only before/after slider as a 3:2 print (12 px paper border, −1°, tape), labelled
 *    «иллюстрация» permanently (tiny element). The two source photos align only in the forehead band, so
 *    only forehead crops are compared (never the full face, §11.9).
 *  • left column: kicker, display headline, up to 3 real works from useWorks() as small tilted prints,
 *    then «Реальные работы →» → /works.
 * Slider = APG slider: role="slider", value 0–100 = the pencil line's position from the left; «до» is
 * LEFT of the line and «после» right of it (the left-to-right before → after reading order — review
 * round 2; it used to be reversed). It opens at 40 (60 % «после»); valuetext says how much «после» is
 * shown. Arrows ±5, Home/End; pointer drag anywhere on the print. The one-time hint nudge is skipped
 * under reduced motion and after any user interaction.
 * Real works: the client photos are heavy (≈ 720 KB) CMS files; they start loading when the section is
 * ≈ 1500 px away (eager, low priority) on an oat mat, fade in when decoded, and a work whose photo
 * fails is dropped — never an empty paper mat (review round 2).
 */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from 'motion/react';
import { useT } from '../../../hooks/useT';
import { useLang } from '../../../context/LangContext';
import { useWorks } from '../../../hooks/useWorks';
import { TILTS } from '../lib/organic';
import { fill, splitLines } from '../lib/copy';
import Seam from './Seam';
import Tape from './Tape';
import { DisplayLines, isHonest, pickText } from './pageBKit';
import './Proof.css';

export interface ProofProps {
  id?: string;
}

const clamp = (v: number) => Math.min(100, Math.max(0, v));
/** the pencil line opens at 40 % → 60 % of the print shows «после» */
const START = 40;

function Pic({ name, alt }: { name: 'before' | 'after'; alt: string }) {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`/media/v2/forehead-${name}-640.avif 640w, /media/v2/forehead-${name}-1200.avif 1200w`}
        sizes="(min-width: 1280px) min(800px, 38vw), (min-width: 1024px) 46vw, (min-width: 768px) 80vw, 94vw"
      />
      <source
        type="image/webp"
        srcSet={`/media/v2/forehead-${name}-640.webp 640w, /media/v2/forehead-${name}-1200.webp 1200w`}
        sizes="(min-width: 1280px) min(800px, 38vw), (min-width: 1024px) 46vw, (min-width: 768px) 80vw, 94vw"
      />
      <img
        src={`/media/v2/forehead-${name}-1200.webp`}
        width={1200}
        height={800}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}

function ArrowLabel({ text }: { text: string }) {
  const m = text.match(/^(.*?)\s*(→)\s*$/);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]}{' '}
      <span className="v2-arrow" aria-hidden="true">
        {m[2]}
      </span>
    </>
  );
}

/** Restyled before/after comparison (BeforeAfterSlider rebuilt for /v2 — the shared component is frozen). */
function Compare() {
  const t = useT();
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const pos = useMotionValue(START);
  const [now, setNow] = useState(START);
  const touched = useRef(false);
  const dragging = useRef(false);
  const inView = useInView(stageRef, { once: true, amount: 0.7 });

  useMotionValueEvent(pos, 'change', (v) => {
    const r = Math.round(v);
    setNow((p) => (p === r ? p : r));
  });

  // «до» is LEFT of the line: the BEFORE layer is clipped to [0, pos] over the full AFTER layer
  const clip = useTransform(pos, (v) => `inset(0 ${100 - v}% 0 0)`);
  const x = useTransform(pos, (v) => `${v}%`);
  const beforeOpacity = useTransform(pos, [5, 14], [0, 1]);
  const afterOpacity = useTransform(pos, [86, 95], [1, 0]);

  // one gentle hint when the print first comes into view (never under reduced motion)
  useEffect(() => {
    if (!inView || reduce || touched.current) return;
    const ctrl = animate(pos, [START, START - 12, START + 11, START], { duration: 1.5, ease: [0.65, 0, 0.35, 1], delay: 0.3 });
    return () => ctrl.stop();
  }, [inView, reduce, pos]);

  const setFromX = (clientX: number) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    pos.stop();
    pos.set(clamp(((clientX - r.left) / r.width) * 100));
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    touched.current = true;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromX(e.clientX);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) setFromX(e.clientX);
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 5;
    const cur = Math.round(pos.get());
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = cur + step;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = cur - step;
    else if (e.key === 'PageUp') next = cur + 20;
    else if (e.key === 'PageDown') next = cur - 20;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 100;
    if (next === null) return;
    e.preventDefault();
    touched.current = true;
    pos.stop();
    pos.set(clamp(next));
  };

  return (
    <div
      ref={stageRef}
      className="v2-proof__stage"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="v2-proof__layer">
        <Pic name="after" alt={t('v2.proof.altAfter')} />
      </div>
      <motion.div className="v2-proof__layer v2-proof__layer--before" style={{ clipPath: clip }}>
        <Pic name="before" alt={t('v2.proof.altBefore')} />
      </motion.div>

      <motion.div className="v2-proof__handle" style={{ x }}>
        <svg className="v2-proof__line" viewBox="0 0 8 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M4.2 0 C3.4 34 4.9 62 3.9 98 S4.6 164 3.8 200" />
        </svg>
        <div
          className="v2-proof__knob"
          role="slider"
          tabIndex={0}
          aria-label={t('v2.proof.slider')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={now}
          aria-valuetext={fill(t('v2.proof.valuetext'), { n: 100 - now })}
          aria-orientation="horizontal"
          onKeyDown={onKey}
        >
          <motion.span className="v2-proof__lab v2-proof__lab--before" aria-hidden="true" style={{ opacity: beforeOpacity }}>
            {t('v2.proof.before')}
          </motion.span>
          <motion.span className="v2-proof__lab v2-proof__lab--after" aria-hidden="true" style={{ opacity: afterOpacity }}>
            {t('v2.proof.after')}
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Mat for a real work photo: starts at 4:5 on an oat ground (no CLS, never an empty paper mat),
 * then adopts the photo's own aspect (clamped to 3:4 … 16:10) and fades the photo in once decoded.
 * `near` flips the image from lazy to eager (low priority) when the section is ≈ 1500 px away.
 */
function WorkMat({ src, alt, near, onFail }: { src: string; alt: string; near: boolean; onFail: () => void }) {
  const [ratio, setRatio] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className="v2-proof__mat"
      data-loaded={loaded ? '' : undefined}
      style={ratio ? ({ aspectRatio: String(ratio) } as CSSProperties) : undefined}
    >
      <img
        src={src}
        width={480}
        height={600}
        alt={alt}
        loading={near ? 'eager' : 'lazy'}
        fetchPriority="low"
        decoding="async"
        onLoad={(e) => {
          const im = e.currentTarget;
          if (im.naturalWidth && im.naturalHeight) {
            setRatio(Math.min(1.6, Math.max(0.75, im.naturalWidth / im.naturalHeight)));
          }
          const done = () => setLoaded(true);
          if (typeof im.decode === 'function') im.decode().then(done, done);
          else done();
        }}
        onError={onFail}
      />
    </div>
  );
}

/** true once the element is within `margin` px of the viewport (once). */
function useNear<T extends Element>(margin = 1500): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') return setNear(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: `${margin}px 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin, near]);
  return [ref, near];
}

export default function Proof({ id = 'works' }: ProofProps) {
  const t = useT();
  const { lang } = useLang();
  const { works } = useWorks();
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [sectionRef, near] = useNear<HTMLElement>(1500);

  const shown = works
    .filter((w) => w.image && /^https:\/\//.test(w.image) && !failed.has(w.id))
    .map((w) => ({
      id: w.id,
      image: w.image as string,
      title: pickText(w, 'title', lang),
      tag: pickText(w, 'tag', lang),
    }))
    .filter((w) => w.title && isHonest(w.title))
    .slice(0, 3);

  const h2 = t('v2.proof.h2');
  const chars = Math.max(6, ...splitLines(h2).map((l) => l.text.length));

  return (
    <>
      <Seam seed={11} fill="oat" />
      <section ref={sectionRef} id={id} className="v2-section v2-cv v2-pad-5 v2-proof" aria-labelledby={`${id}-h`}>
        <div className="v2-grid v2-proof__grid">
          <header className="v2-proof__head">
            <p className="v2-kicker">{t('v2.proof.kicker')}</p>
            <h2 id={`${id}-h`} className="v2-dl v2-proof__h" style={{ '--chars': chars } as CSSProperties}>
              <DisplayLines text={h2} />
            </h2>
          </header>

          <figure className="v2-print v2-tilt v2-proof__print" style={{ '--tilt': -1 } as CSSProperties}>
            <Tape seed={17} top={-11} left="calc(50% - 32px)" tilt={2} />
            <Compare />
            <span className="v2-illu v2-proof__illu" aria-hidden="true">
              {t('v2.proof.label')}
            </span>
            <figcaption className="v2-slip v2-tilt v2-proof__caption" style={{ '--tilt': 1.5 } as CSSProperties}>
              {t('v2.proof.caption')}
            </figcaption>
          </figure>

          {shown.length > 0 && (
            <ul className="v2-proof__works">
              {shown.map((w, i) => (
                <li key={w.id} className="v2-proof__work">
                  {/* real client photos are before/after collages of any aspect → mounted (contain) on an
                      oat mat, never cropped (cropping would cut one half of the comparison) */}
                  <figure
                    className="v2-print v2-tilt v2-proof__workprint"
                    style={{ '--tilt': TILTS[(i + 1) % 4] } as CSSProperties}
                  >
                    <WorkMat
                      src={w.image}
                      alt={w.title}
                      near={near}
                      onFail={() => setFailed((prev) => new Set(prev).add(w.id))}
                    />
                  </figure>
                  <p className="v2-proof__wtitle">{w.title}</p>
                  {w.tag && <p className="v2-kicker v2-proof__wtag">{w.tag}</p>}
                </li>
              ))}
            </ul>
          )}

          <p className="v2-proof__more">
            <Link to="/works" className="v2-link">
              <ArrowLabel text={t('v2.proof.more')} />
            </Link>
          </p>
        </div>
      </section>
      <Seam seed={12} fill="paper" />
    </>
  );
}
