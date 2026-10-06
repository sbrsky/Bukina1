/**
 * JSX typing for the <hyperframes-player> custom element (@hyperframes/player 0.8.134).
 * DESIGN.md §6.1. The element class itself is typed by the package (`HyperframesPlayer`).
 *
 * React 19 passes unknown props on custom elements through as attributes (strings) or as
 * properties when the element defines them — boolean attributes are written as "" (present)
 * or omitted (absent): `<hyperframes-player autoplay="" muted="" … />`.
 *
 * Never set `sandbox-origin` on the /v2 hero (it blocks runtime injection, DESIGN.md §6.1).
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { HyperframesPlayer } from '@hyperframes/player';

type BoolAttr = '' | boolean | undefined;

export interface HyperframesPlayerAttributes extends HTMLAttributes<HyperframesPlayer> {
  /** composition HTML (live mode) or an MP4 (with type="video/mp4") */
  src?: string;
  srcdoc?: string;
  /** "video/mp4" for the MP4 delivery mode; omit for a composition */
  type?: string;
  width?: string | number;
  height?: string | number;
  /** poster image URL shown before the first paint */
  poster?: string;
  /** self-hosted runtime, e.g. "/hf/vendor/hyperframe.runtime.iife.js" (no CDN) */
  'runtime-src'?: string;
  autoplay?: BoolAttr;
  loop?: BoolAttr;
  muted?: BoolAttr;
  'audio-locked'?: BoolAttr;
  controls?: BoolAttr;
  'low-power-idle'?: BoolAttr;
  'disable-click-to-play'?: BoolAttr;
  /** "player" (default) | "none" */
  'assets-loading-ui'?: 'player' | 'none';
  'playback-rate'?: string | number;
  volume?: string | number;
  'audio-src'?: string;
  'range-start'?: string | number;
  'range-end'?: string | number;
  'shader-loading'?: 'composition' | 'player' | 'none';
  'shader-capture-scale'?: string | number;
  'speed-presets'?: string;
  /** do NOT use on /v2 */
  'sandbox-origin'?: string;
}

type PlayerJSX = DetailedHTMLProps<HyperframesPlayerAttributes, HyperframesPlayer>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'hyperframes-player': PlayerJSX;
    }
  }
}

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'hyperframes-player': PlayerJSX;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'hyperframes-player': HyperframesPlayer;
  }
  /** Player events the hero listens to (DESIGN.md §6.3–6.4). */
  interface HTMLElementEventMap {
    painted: Event;
    assetsready: Event;
    playbackerror: Event;
  }
}
