/**
 * useHeroPlayer — hero film player: delivery mode, lazy mount, playback rules, chapter sync
 * (DESIGN.md §6). PAGE-A-owned.
 *
 *  - mode (§6.2): 'still' (prefers-reduced-motion: the face-map poster + «Смотреть фильм ▶»; the
 *    player is only loaded on a user action) | 'mp4' (coarse pointer, Save-Data, slow network,
 *    deviceMemory ≤ 4, viewport < 768, or a live-player error) | 'live' (desktop, fine pointer).
 *  - Loading (§6.3): after window `load` + idle (requestIdleCallback, fallback setTimeout 200) →
 *    the @hyperframes/player 0.8.134 build (see the import note below) → the hook creates
 *    `<hyperframes-player>` IMPERATIVELY inside
 *    the slot (`slotRef`), under the React-rendered poster, at opacity 0. Imperative creation keeps
 *    exact attribute semantics (React 19 would set `loop=""` as a falsy *property*).
 *    A user action (chapter row, play) loads it immediately.
 *  - ready (§6.3.4): `painted` (live) / the first `timeupdate` after `play` (mp4) → the slot gets
 *    `data-ready` and the player crossfades over the poster (0.2 s, CSS).
 *  - Errors (§6.3.5): live `error` → switch to mp4; mp4 `error` → `failed` (poster stays, no
 *    controls); `playbackerror` → `blocked` (poster stays, the «Смотреть» button shows).
 *    Before mounting the live composition the entry HTML is probed once: a missing file must not
 *    load the SPA's own index.html (dev server / Firebase rewrite) into the iframe.
 *  - Playback (§6.4): paused when < 25 % of the slot is visible or the tab is hidden; resumes when
 *    both clear unless the user paused (`userPaused`). Seeks are seek → play → clear userPaused.
 *  - Chapter sync: React state changes only when chapterIndexAt(t) changes. `onCtaPill` fires once
 *    per pass when t crosses CTA_PILL_T (26.95 s).
 *
 * Never sets `sandbox-origin` (it blocks runtime injection and `__timelines`, §6.1).
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { HyperframesPlayer } from '@hyperframes/player';
// The player's self-registering IIFE build, emitted as a separate static asset (`?url`) and injected
// after load + idle. A plain `import('@hyperframes/player')` would be folded into the `vendor-misc`
// chunk by vite.config.ts `manualChunks` (every node_modules id → vendor-misc, a frozen shared file),
// and that chunk is loaded eagerly by the entry — i.e. ~100 KB of player on every page at startup.
import playerScriptUrl from '../../../../node_modules/@hyperframes/player/dist/hyperframes-player.global.js?url';
import { CHAPTERS, CTA_PILL_T, chapterIndexAt } from '../data/heroChapters';

export type DeliveryMode = 'still' | 'mp4' | 'live';
export type FilmLang = 'ru' | 'lv' | 'en';

// ── film files (DESIGN.md §6.5, MOTION.md §13) ──────────────────────────────────────────────
export const FILM_BASE = '/hf/skinlab-hero';
export const FILM_RUNTIME_SRC = '/hf/vendor/hyperframe.runtime.iife.js';
export const POSTER_WIDTHS = [540, 810, 1080] as const;
export type PosterKind = 'poster' | 'poster-map';

export const filmLiveSrc = (lang: FilmLang) => `${FILM_BASE}/index.${lang}.html`;
export const filmMp4Src = (lang: FilmLang) => `${FILM_BASE}/renders/hero-site-${lang}-720.mp4`;
export const posterSrc = (kind: PosterKind, lang: FilmLang, w: number, ext: 'avif' | 'webp') =>
  `${FILM_BASE}/posters/${kind}-${lang}-${w}.${ext}`;
export const posterSrcSet = (kind: PosterKind, lang: FilmLang, ext: 'avif' | 'webp') =>
  POSTER_WIDTHS.map((w) => `${posterSrc(kind, lang, w, ext)} ${w}w`).join(', ');

export interface UseHeroPlayerOptions {
  lang: FilmLang;
  /** called once when the film crosses CTA_PILL_T (the cover pill pulses if ≥50 % visible) */
  onCtaPill?: () => void;
}

export interface HeroPlayer {
  /** attach to the 4:5 film slot element (the player + poster mount inside it) */
  slotRef: RefObject<HTMLDivElement | null>;
  mode: DeliveryMode;
  /** player painted (live) / first timeupdate after play (mp4) → crossfade from the poster */
  ready: boolean;
  /** the film is (meant to be) playing — drives the Пауза/Смотреть toggle label */
  playing: boolean;
  /** index into CHAPTERS of the playing chapter, or -1 (hook, recap, not started) */
  chapter: number;
  play: () => void;
  /** user pause (sets userPaused) */
  pause: () => void;
  /** seek to CHAPTERS[i].start (0-based index) and play; in 'still' mode switches mode first */
  seekToChapter: (i: number) => void;
  /** which poster sits under the player: frame 0, or the face-map frame (still mode) */
  poster: PosterKind;
  /** the browser refused to start playback (`playbackerror`): show the «Смотреть» button */
  blocked: boolean;
  /** neither the live film nor the MP4 could load: keep the poster, hide the controls */
  failed: boolean;
}

// ── environment helpers ───────────────────────────────────────────────────────────────────

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

function mq(query: string): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return mq('(prefers-reduced-motion: reduce)');
}

/** The non-still mode for this device (§6.2). `pointer: coarse` matters: Safari has no deviceMemory. */
export function preferredPlayMode(): Exclude<DeliveryMode, 'still'> {
  if (typeof window === 'undefined') return 'mp4';
  if (mq('(pointer: coarse)')) return 'mp4';
  const nav = navigator as Navigator & { connection?: NetworkInformationLike; deviceMemory?: number };
  const c = nav.connection;
  if (c?.saveData) return 'mp4';
  if (c?.effectiveType && ['slow-2g', '2g', '3g'].includes(c.effectiveType)) return 'mp4';
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) return 'mp4';
  if (window.innerWidth < 768) return 'mp4';
  return 'live';
}

/** Run `cb` after window `load` + an idle slot. Returns a cancel function. */
function afterLoadIdle(cb: () => void): () => void {
  type IdleWindow = Window & {
    requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const w = window as IdleWindow;
  let cancelled = false;
  let idleId: number | undefined;
  let timer: number | undefined;
  const run = () => {
    if (!cancelled) cb();
  };
  const schedule = () => {
    if (cancelled) return;
    if (typeof w.requestIdleCallback === 'function') idleId = w.requestIdleCallback(run, { timeout: 2500 });
    else timer = window.setTimeout(run, 200);
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener('load', schedule);
    if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
    if (timer !== undefined) window.clearTimeout(timer);
  };
}

/** Load the player library once per page (a classic script; it defines <hyperframes-player>). */
let playerLib: Promise<void> | null = null;
function loadPlayerLib(): Promise<void> {
  if (customElements.get('hyperframes-player')) return Promise.resolve();
  if (!playerLib) {
    playerLib = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = playerScriptUrl;
      s.async = true;
      s.dataset.v2 = 'hyperframes-player';
      s.onload = () => {
        customElements.whenDefined('hyperframes-player').then(() => resolve(), reject);
      };
      s.onerror = () => {
        playerLib = null;
        s.remove();
        reject(new Error('hyperframes-player script failed to load'));
      };
      document.head.appendChild(s);
    });
  }
  return playerLib;
}

/**
 * Is `src` really a HyperFrames composition? A missing file comes back as the SPA's index.html
 * (Vite dev fallback / Firebase `** → /index.html`), which must never be loaded into the iframe.
 * The response stays in the HTTP cache, so the iframe's own request is not a second download.
 */
const probeCache = new Map<string, Promise<boolean>>();
function probeComposition(src: string): Promise<boolean> {
  let p = probeCache.get(src);
  if (!p) {
    p = fetch(src, { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) return false;
        const text = await res.text();
        return /data-composition-id/.test(text);
      })
      .catch(() => false);
    probeCache.set(src, p);
  }
  return p;
}

// ── the hook ──────────────────────────────────────────────────────────────────────────────

export function useHeroPlayer({ lang, onCtaPill }: UseHeroPlayerOptions): HeroPlayer {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<HyperframesPlayer | null>(null);

  const [mode, setMode] = useState<DeliveryMode>(() => (prefersReducedMotion() ? 'still' : preferredPlayMode()));
  const [poster] = useState<PosterKind>(() => (prefersReducedMotion() ? 'poster-map' : 'poster'));
  /** load the library now (user action) instead of waiting for load + idle */
  const [wantLib, setWantLib] = useState(false);
  const [libReady, setLibReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [chapter, setChapter] = useState(-1);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const userPausedRef = useRef(prefersReducedMotion()); // still mode: nothing plays until asked
  const inViewRef = useRef(true);
  const pageVisibleRef = useRef(typeof document === 'undefined' || document.visibilityState !== 'hidden');
  const pendingSeekRef = useRef<number | null>(null);
  const chapterRef = useRef(-1);
  const lastTRef = useRef(0);
  const readyRef = useRef(false);
  const seekGuardRef = useRef<{ index: number; until: number } | null>(null);
  const ctaRef = useRef(onCtaPill);
  ctaRef.current = onCtaPill;

  const wantPlay = () => !userPausedRef.current && inViewRef.current && pageVisibleRef.current;

  /** Make the element's paused state match the rules (§6.4). */
  const sync = useCallback(() => {
    const el = playerRef.current;
    if (!el || !el.ready) return;
    if (wantPlay()) {
      if (el.paused) el.play();
    } else if (!el.paused) {
      el.pause();
    }
  }, []);

  const setChapterIfChanged = (i: number) => {
    if (chapterRef.current === i) return;
    chapterRef.current = i;
    setChapter(i);
  };

  // 1 — schedule the library after load + idle (not in still mode: that waits for a user action)
  useEffect(() => {
    if (mode === 'still' || wantLib) return;
    return afterLoadIdle(() => setWantLib(true));
  }, [mode, wantLib]);

  // 2 — import the library
  useEffect(() => {
    if (!wantLib || libReady) return;
    let alive = true;
    loadPlayerLib()
      .then(() => alive && setLibReady(true))
      .catch((e) => {
        console.warn('[v2] hero player failed to load:', e);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [wantLib, libReady]);

  // 3 — mount <hyperframes-player> for the current mode + language
  useEffect(() => {
    const slot = slotRef.current;
    if (!libReady || mode === 'still' || failed || !slot) return;

    let disposed = false;
    let el: HyperframesPlayer | null = null;
    const off: (() => void)[] = [];
    readyRef.current = false;
    setReady(false);

    const on = (type: string, fn: (e: Event) => void) => {
      el!.addEventListener(type, fn);
      off.push(() => el?.removeEventListener(type, fn));
    };

    const markReady = () => {
      if (readyRef.current || disposed) return;
      readyRef.current = true;
      setReady(true);
    };

    const mount = async () => {
      const src = mode === 'mp4' ? filmMp4Src(lang) : filmLiveSrc(lang);
      if (mode === 'live' && !(await probeComposition(src))) {
        if (!disposed) setMode('mp4');
        return;
      }
      if (disposed) return;

      el = document.createElement('hyperframes-player');
      el.className = 'v2-film__player';
      // attribute order: type / size / runtime before src, so the first load is the right one
      if (mode === 'mp4') el.setAttribute('type', 'video/mp4');
      el.setAttribute('width', '1080');
      el.setAttribute('height', '1350');
      // attributes per the film embed contract (docs/v2/OWNERSHIP.md); autoplay is then policed by
      // the play listener below (off-screen / hidden tab / user pause → paused again at once)
      for (const a of ['autoplay', 'muted', 'loop', 'audio-locked', 'low-power-idle', 'disable-click-to-play'])
        el.setAttribute(a, '');
      el.setAttribute('assets-loading-ui', 'none');
      if (mode === 'live') el.setAttribute('runtime-src', FILM_RUNTIME_SRC);
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('inert', ''); // the inner iframe never takes focus; the page owns all controls

      on('ready', () => {
        const t = pendingSeekRef.current;
        if (t !== null) {
          pendingSeekRef.current = null;
          el!.seek(t);
        }
        sync();
      });
      on('painted', () => {
        if (modeRef.current === 'live') markReady();
      });
      on('play', () => {
        setBlocked(false);
        if (!wantPlay()) el!.pause();
      });
      on('timeupdate', (e) => {
        const t = el!.currentTime ?? (e as CustomEvent<{ currentTime?: number }>).detail?.currentTime;
        if (!Number.isFinite(t)) return;
        if (modeRef.current === 'mp4' && !el!.paused) markReady();

        const prev = lastTRef.current;
        lastTRef.current = t;
        if (prev < CTA_PILL_T && t >= CTA_PILL_T && t - prev < 1.5) ctaRef.current?.();

        const idx = chapterIndexAt(t);
        const guard = seekGuardRef.current;
        if (guard) {
          // ignore stale times between a chapter click and the seek landing
          if (idx !== guard.index && performance.now() < guard.until) return;
          seekGuardRef.current = null;
        }
        setChapterIfChanged(idx);
      });
      on('error', (e) => {
        console.warn('[v2] hero film error:', (e as CustomEvent).detail ?? e);
        if (modeRef.current === 'live') setMode('mp4');
        else setFailed(true);
      });
      on('playbackerror', () => {
        userPausedRef.current = true;
        setPlaying(false);
        setBlocked(true);
      });

      el.setAttribute('src', src);
      slot.appendChild(el);
      playerRef.current = el;
    };
    void mount();

    return () => {
      disposed = true;
      off.forEach((f) => f());
      if (el) {
        try {
          el.pause();
        } catch {
          /* not ready */
        }
        el.remove();
      }
      if (playerRef.current === el) playerRef.current = null;
    };
  }, [libReady, mode, lang, failed, sync]);

  // 4 — pause off-screen (< 25 % visible) and in hidden tabs
  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting && entry.intersectionRatio >= 0.249;
        sync();
      },
      { threshold: [0, 0.25] },
    );
    io.observe(slot);
    const onVis = () => {
      pageVisibleRef.current = document.visibilityState !== 'hidden';
      sync();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [sync]);

  /** Leave still mode / load early on a user action. */
  const activate = useCallback(() => {
    if (modeRef.current === 'still') setMode(preferredPlayMode());
    setWantLib(true);
  }, []);

  const play = useCallback(() => {
    userPausedRef.current = false;
    setPlaying(true);
    setBlocked(false);
    activate();
    const el = playerRef.current;
    if (el?.ready) el.play(); // a direct call inside the click keeps the user activation
  }, [activate]);

  const pause = useCallback(() => {
    userPausedRef.current = true;
    setPlaying(false);
    playerRef.current?.pause();
  }, []);

  const seekToChapter = useCallback(
    (i: number) => {
      const ch = CHAPTERS[i];
      if (!ch) return;
      userPausedRef.current = false;
      setPlaying(true);
      setBlocked(false);
      seekGuardRef.current = { index: i, until: performance.now() + 1500 };
      setChapterIfChanged(i);
      lastTRef.current = ch.start;
      const el = playerRef.current;
      if (el?.ready) {
        el.seek(ch.start);
        el.play();
      } else {
        pendingSeekRef.current = ch.start;
        activate();
      }
    },
    [activate],
  );

  return { slotRef, mode, ready, playing, chapter, play, pause, seekToChapter, poster, blocked, failed };
}

export default useHeroPlayer;
