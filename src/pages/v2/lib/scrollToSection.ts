/**
 * scrollToSection — exact in-page jumps on /v2 despite `content-visibility: auto` (INTEGRATION).
 *
 * Every section below the cover is `.v2-cv` (content-visibility: auto; contain-intrinsic-size:
 * auto 900px, DESIGN.md §10). Until a section has been rendered once it is laid out at the 900 px
 * placeholder, so a fragment jump / scrollIntoView computes its target from wrong heights and
 * lands short (measured on the build: #faq ≈ 670 px short at 1440, #booking off-screen at 390).
 *
 *  - primeSectionLayout(): renders every skipped section for two frames (`.v2-cv-measure` on the
 *    page root → content-visibility: visible). Synchronously the layout is exact, so a native
 *    `<a href="#id">` default action that runs right after a click handler calling this scrolls
 *    to the right place; and because `contain-intrinsic-size: auto` remembers the size of a
 *    rendered box, the sections keep their real heights after the class is removed (they are
 *    skipped again → the §10 rendering savings stay).
 *  - settleOnSection(): after the (smooth) scroll ends, nudges any residual drift (late images,
 *    fonts) instantly; abandoned if the user scrolls/types meanwhile.
 *  - scrollToSection(id): both, around `scrollIntoView` (menu links, deep links, chapter rows).
 *
 * Behaviour 'instant' (never 'auto'): index.css gives `html` scroll-behavior: smooth, which 'auto'
 * would inherit — and reduced motion must not smooth-scroll (§9).
 */

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

function pageRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.v2');
}

let primeTimer = 0;
/** Give every not-yet-rendered `.v2-cv` section its real height (sync for this task + 2 frames). */
export function primeSectionLayout(): void {
  const root = pageRoot();
  if (!root) return;
  root.classList.add('v2-cv-measure');
  void root.offsetHeight; // exact layout now, for a native fragment scroll that follows this handler
  cancelAnimationFrame(primeTimer);
  primeTimer = requestAnimationFrame(() => {
    // one rendered frame records each section's size; remove the override on the next one
    primeTimer = requestAnimationFrame(() => root.classList.remove('v2-cv-measure'));
  });
}

/** Wait until the scroll position has been still for a few frames (after it moved, or 350 ms). */
function scrollSettled(timeout = 3000): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    let last = window.scrollY;
    let moved = false;
    let still = 0;
    const tick = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) > 0.5) {
        moved = true;
        still = 0;
        last = y;
      } else {
        still++;
      }
      const elapsed = performance.now() - t0;
      if ((still >= 4 && (moved || elapsed > 350)) || elapsed > timeout) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** After a jump: correct residual drift so `target` sits at its scroll-margin-top. */
export async function settleOnSection(target: HTMLElement): Promise<void> {
  let interrupted = false;
  const stop = () => (interrupted = true);
  const opts = { passive: true, once: true } as const;
  window.addEventListener('wheel', stop, opts);
  window.addEventListener('touchstart', stop, opts);
  window.addEventListener('keydown', stop, opts);
  try {
    await scrollSettled();
    for (let i = 0; i < 3 && !interrupted; i++) {
      const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      const off = target.getBoundingClientRect().top - margin;
      if (Math.abs(off) <= 2) break;
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      if (off > 0 && Math.ceil(window.scrollY) >= maxY - 1) break; // page end: cannot go further
      window.scrollBy({ top: off, behavior: 'instant' as ScrollBehavior });
      await nextFrame();
      await nextFrame();
    }
  } finally {
    window.removeEventListener('wheel', stop);
    window.removeEventListener('touchstart', stop);
    window.removeEventListener('keydown', stop);
  }
}

/** Scroll the element with `id` to the top of the viewport (below the header), exactly. */
export async function scrollToSection(id: string, { smooth = true }: { smooth?: boolean } = {}): Promise<boolean> {
  const target = document.getElementById(id);
  if (!target) return false;
  primeSectionLayout();
  target.scrollIntoView({ behavior: (smooth ? 'smooth' : 'instant') as ScrollBehavior, block: 'start' });
  await settleOnSection(target);
  return true;
}
