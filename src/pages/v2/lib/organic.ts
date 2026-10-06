/**
 * organic.ts — seeded, deterministic organic generators (DESIGN.md §3.5).
 * Never Math.random: every shape is a pure function of its seed, so SSR/CSR, reloads and
 * screenshots always draw the same seam, tape edge and tilt.
 *
 * Seeds in use (§3.5): proof top 11, proof bottom 12, booking top 21, colophon top 31.
 * Tape seeds: any small integer; keep one seed per tape so it never "jumps" between renders.
 */

/** Standard mulberry32 PRNG → floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rotation tokens in degrees, index with `i % 4` (DESIGN.md §4.3). */
export const TILTS = [-2.5, 1.5, -1, 3] as const;

/**
 * Tilt for item `i`. Below 768 px tilts are halved (max 1.5°, DESIGN.md §4.6) — in CSS this is
 * already done by `--v2-tilt-k` (see `.v2-tilt` in v2.css), so prefer passing `--tilt` and let
 * CSS scale it; use `mobile: true` only for JS-driven transforms.
 */
export function tilt(i: number, mobile = false): number {
  const deg = TILTS[((i % TILTS.length) + TILTS.length) % TILTS.length];
  return mobile ? deg / 2 : deg;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Section seam: a closed SVG path for `viewBox="0 0 1000 100"` — the area BELOW an organic
 * curve, filled with the incoming section's colour (DESIGN.md §3.5 / §4.4).
 *
 * y(x) = 50 + Σ aₖ·sin(2π·fₖ·x/1000 + φₖ), f = [1, 2.3, 4.1]×(0.9–1.1), a = [18, 9, 4]×(0.8–1.2),
 * φ ∈ [0, 2π), sampled every 20 units, smoothed with Catmull-Rom (tension 0.5) into cubic
 * Béziers, closed along y = 100. Static: never animate or scroll-link it.
 */
export function seamPath(seed: number): string {
  const rnd = mulberry32(seed);
  const F = [1, 2.3, 4.1];
  const A = [18, 9, 4];
  const waves = F.map((f, k) => ({
    f: f * (0.9 + 0.2 * rnd()),
    a: A[k] * (0.8 + 0.4 * rnd()),
    p: rnd() * Math.PI * 2,
  }));
  const y = (x: number) => 50 + waves.reduce((s, w) => s + w.a * Math.sin((2 * Math.PI * w.f * x) / 1000 + w.p), 0);

  const pts: [number, number][] = [];
  for (let x = 0; x <= 1000; x += 20) pts.push([x, y(x)]);

  // Catmull-Rom → cubic Bézier (tension 0.5 ⇒ control offset = (p[i+1] − p[i−1]) / 6)
  let d = `M${pts[0][0]} ${r2(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${p2[0]} ${r2(p2[1])}`;
  }
  return `${d}L1000 100L0 100Z`;
}

/**
 * Torn tape ends: a CSS `polygon(...)` for `clip-path` (DESIGN.md §3.4). Top and bottom edges stay
 * straight; both short ends get a seeded zig-zag that bites up to ~7 % into the strip.
 * `points` is the total number of vertices on the two torn ends (min 6, split evenly).
 */
export function tornEdge(seed: number, points = 14): string {
  const rnd = mulberry32(seed);
  const perEnd = Math.max(3, Math.floor(points / 2));
  const right: string[] = [];
  const left: string[] = [];
  for (let i = 0; i < perEnd; i++) {
    const yPct = (i / (perEnd - 1)) * 100;
    right.push(`${r2(100 - (1 + rnd() * 6))}% ${r2(yPct)}%`);
  }
  for (let i = perEnd - 1; i >= 0; i--) {
    const yPct = (i / (perEnd - 1)) * 100;
    left.push(`${r2(1 + rnd() * 6)}% ${r2(yPct)}%`);
  }
  return `polygon(${[...right, ...left].join(', ')})`;
}

/** Deterministic pick from a list by seed. */
export function pick<T>(seed: number, list: readonly T[]): T {
  return list[Math.floor(mulberry32(seed)() * list.length)];
}
