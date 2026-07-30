import type { ColorResult, ThreadColor } from '../types'
import type { WrapSide } from './tangent'

/**
 * Geometric pattern presets.
 *
 * These bypass the image solver entirely. The greedy optimiser in stringArt.ts approximates a
 * photo and will always smear a crisp chord family, so a preset instead emits the peg path
 * directly and hands back the same ColorResult[] shape the solver produces — PreviewCanvas and
 * buildExportBinary then work unchanged.
 *
 * Two hard rules come from the export format (see exportPath.ts):
 *  - every path starts at peg 0, because the file encodes only the *destination* of each line
 *    and the robot is assumed to already be sitting on the first peg.
 *  - the file is one continuous path per colour, not a set of chords. Patterns that are
 *    naturally chord sets (the times-table family) are realised as a zig-zag that threads the
 *    chords together; patterns that fall into several disjoint cycles hop along the rim
 *    between components.
 */

const MAX_EXPORT_LINES = 9999

/**
 * Preview stroke opacity for presets. PreviewCanvas normally uses lineWeight, which is tuned so
 * that several thousand overlapping image lines build up tone gradually — at a few hundred
 * deliberate chords that reads as nearly blank. This is preview-only and doesn't touch the
 * user's lineWeight setting, which still belongs to the image solver.
 */
export const PRESET_PREVIEW_OPACITY = 0.55

export interface PatternPreset {
  id: string
  name: string
  /** One line describing the maths, shown under the button. */
  description: string
  pegCount: number
  /** One hex per thread; length must match what build() returns. */
  colors: string[]
  /** One peg path per thread, each starting at peg 0. */
  build: (pegCount: number) => number[][]
}

/**
 * Walks `step` pegs at a time around the ring. When gcd(pegCount, step) is 1 this closes into a
 * single {n/k} star polygon; otherwise it closes into gcd() separate congruent polygons, and we
 * hop one peg along the rim to start the next one. Those hops are real lines the robot will
 * draw, but they sit on the rim where they read as part of the frame.
 */
function starPath(pegCount: number, step: number): number[] {
  const s = ((step % pegCount) + pegCount) % pegCount
  if (s === 0 || pegCount < 3) return [0]

  const visited = new Array<boolean>(pegCount).fill(false)
  const path = [0]
  visited[0] = true
  let remaining = pegCount - 1
  let current = 0

  while (true) {
    const next = (current + s) % pegCount
    if (!visited[next]) {
      visited[next] = true
      remaining--
      path.push(next)
      current = next
      continue
    }

    // Back on a peg we've already used: close this component, then seed the next one.
    path.push(next)
    if (remaining === 0) break
    const seed = visited.indexOf(false)
    visited[seed] = true
    remaining--
    path.push(seed)
    current = seed
  }

  return path
}

/**
 * The times-table / cardioid family: the chord set { i -> k*i mod n }. Consecutive chords don't
 * share an endpoint, so the path zig-zags — chord (i, k*i), then a return leg (k*i, i+1) before
 * the next chord. The return legs are themselves a shifted copy of the same family, so they
 * thicken the envelope rather than muddying it, which is why this is how it's wound by hand.
 */
function timesTablePath(pegCount: number, multiplier: number, phases: number[] = [0]): number[] {
  const path = [0]
  const push = (peg: number) => {
    if (peg !== path[path.length - 1]) path.push(peg)
  }

  // A phase offset rotates the envelope: chord (i, k*i + phase) draws the same curve turned by
  // roughly phase/(k-1) pegs. Running several phases on one thread lays those rotated copies
  // over each other into a flower; the join between them costs one connector line.
  for (const phase of phases) {
    for (let i = 0; i < pegCount; i++) {
      push((multiplier * i + phase) % pegCount)
      push((i + 1) % pegCount)
    }
  }

  return path
}

export const PATTERN_PRESETS: PatternPreset[] = [
  {
    id: 'starburst',
    name: 'Starburst',
    description: '{120/47} star polygon — one unbroken 120-chord cycle, dense caustic core.',
    pegCount: 120,
    colors: ['#000000'],
    build: (n) => [starPath(n, 47)],
  },
  {
    id: 'rotating-squares',
    name: 'Rotating Squares',
    description: '30 inscribed squares, each rotated one peg — they envelope a crisp inner circle.',
    pegCount: 120,
    colors: ['#000000'],
    build: (n) => [starPath(n, Math.round(n / 4))],
  },
  {
    id: 'rotating-triangles',
    name: 'Rotating Triangles',
    description: '48 equilateral triangles sweeping a full turn — a wider band, half-radius core.',
    pegCount: 144,
    colors: ['#000000'],
    build: (n) => [starPath(n, Math.round(n / 3))],
  },
  {
    id: 'cardioid',
    name: 'Cardioid (×2)',
    description: 'i → 2i mod n. The classic single-cusp heart envelope.',
    pegCount: 180,
    colors: ['#000000'],
    build: (n) => [timesTablePath(n, 2)],
  },
  {
    id: 'nephroid',
    name: 'Nephroid (×3)',
    description: 'i → 3i mod n. Two cusps — the kidney curve.',
    pegCount: 180,
    colors: ['#000000'],
    build: (n) => [timesTablePath(n, 3)],
  },
  {
    id: 'trefoil',
    name: 'Trefoil (×4)',
    description: 'i → 4i mod n. Three cusps; each higher multiplier adds one lobe.',
    pegCount: 180,
    colors: ['#000000'],
    build: (n) => [timesTablePath(n, 4)],
  },
  {
    id: 'moire',
    name: 'Moiré Fringe',
    // Steps have to sit near n/2 for this to work: the envelope radius of {n/k} is
    // R·cos(πk/n), so near-diameter chords sweep the whole disc and the two families overlap
    // everywhere. Steps near n/5 (an earlier attempt) just stack two coincident rims.
    description: 'Two near-diameter stars ({150/71}, {150/73}) beating into interference fringes.',
    pegCount: 150,
    colors: ['#000000', '#EF4444'],
    build: (n) => [starPath(n, 71), starPath(n, 73)],
  },
  {
    id: 'nested-burst',
    name: 'Nested Burst',
    description: 'Three stars ({120/47}, {120/29}, {120/17}) stacked into concentric rings.',
    pegCount: 120,
    colors: ['#000000', '#EF4444', '#3B82F6'],
    build: (n) => [starPath(n, 47), starPath(n, 29), starPath(n, 17)],
  },
  {
    id: 'spiro-weave',
    name: 'Spiro Weave',
    description: 'Cardioid (×2) laid over a four-cusp epicycloid (×5) in a second colour.',
    pegCount: 150,
    colors: ['#000000', '#EF4444'],
    build: (n) => [timesTablePath(n, 2), timesTablePath(n, 5)],
  },
  {
    id: 'rosette',
    name: 'Rosette',
    description: 'Three ×2 cardioids at 120° to each other — a three-petal flower on one thread.',
    pegCount: 180,
    colors: ['#000000'],
    build: (n) => [timesTablePath(n, 2, [0, Math.round(n / 3), Math.round((2 * n) / 3)])],
  },
]

/**
 * Turns the raw peg paths of a preset into the GenerationResult payload App renders and exports.
 *
 * Wrap side is held constant. It only picks which of a nail's two tangent lines the thread
 * leaves on (tangent.ts), so a constant keeps every chord offset the same way and preserves the
 * pattern's rotational symmetry — a mixed set would jitter it by a nail radius. The image solver
 * chooses freely per line because it's chasing pixels, not symmetry.
 */
const PRESET_SIDE: WrapSide = 1

export function buildPatternResults(preset: PatternPreset): { colors: ThreadColor[]; results: ColorResult[] } {
  const paths = preset.build(preset.pegCount)
  const colors: ThreadColor[] = preset.colors.map((hex, i) => ({ id: `${preset.id}-${i}`, hex }))

  const results: ColorResult[] = paths.map((pegs, i) => ({
    color: colors[i],
    pegs,
    sides: new Array<WrapSide>(Math.max(0, pegs.length - 1)).fill(PRESET_SIDE),
  }))

  return { colors, results }
}

/** Total lines a preset will draw — shown on the button and checked against the export limit. */
export function presetLineCount(preset: PatternPreset): number {
  return preset.build(preset.pegCount).reduce((sum, path) => sum + Math.max(0, path.length - 1), 0)
}

export function presetExceedsExportLimit(preset: PatternPreset): boolean {
  return presetLineCount(preset) > MAX_EXPORT_LINES
}
