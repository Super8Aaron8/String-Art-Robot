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
 *
 * A preset is a named starting point, not a fixed drawing: every one exposes knobs, and the
 * peg count is itself a live input, so the same builder redraws at whatever ring the board is
 * set to.
 */

export const MAX_EXPORT_LINES = 9999
export const MAX_EXPORT_PEGS = 360

/**
 * Pins on the physical board. Every preset's defaults are tuned for this ring, and applying a
 * preset deliberately leaves the board's peg count alone — swapping between presets shouldn't
 * move a number that describes hardware. Patterns still redraw at whatever the board is set to,
 * so this is a tuning target, not a constraint.
 *
 * Steps are picked relative to it: gcd(288, k) = 1 gives one unbroken cycle, and since
 * 288 = 2^5·3^2 that means k odd and not a multiple of 3.
 */
export const BOARD_PEG_COUNT = 288

/**
 * Preview stroke opacity for presets. PreviewCanvas normally uses lineWeight, which is tuned so
 * that several thousand overlapping image lines build up tone gradually — at a few hundred
 * deliberate chords that reads as nearly blank. This is preview-only and doesn't touch the
 * user's lineWeight setting, which still belongs to the image solver.
 */
export const PRESET_PREVIEW_OPACITY = 0.55

export interface PatternParam {
  key: string
  label: string
  min: number
  max: number
  step: number
  default: number
}

export type PatternParams = Record<string, number>

export interface PatternPreset {
  id: string
  name: string
  /** One line describing the maths, shown under the button. */
  description: string
  /** Peg count this preset's defaults are tuned for — always the board. */
  pegCount: number
  /** Default thread colours; after the preset is applied the live colour list takes over. */
  colors: string[]
  params: PatternParam[]
  /** One peg path per thread, each starting at peg 0. Thread count must match `colors`. */
  build: (pegCount: number, params: PatternParams) => number[][]
}

/**
 * Walks `step` pegs at a time around the ring. When gcd(pegCount, step) is 1 this closes into a
 * single {n/k} star polygon; otherwise it closes into gcd() separate congruent polygons, and we
 * hop one peg along the rim to start the next one. Those hops are real lines the robot will
 * draw, but they sit on the rim where they read as part of the frame.
 */
function starPath(pegCount: number, step: number): number[] {
  const s = ((Math.round(step) % pegCount) + pegCount) % pegCount
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
 *
 * A phase offset rotates the envelope: chord (i, k*i + phase) draws the same curve turned by
 * roughly phase/(k-1) pegs. Running several phases on one thread lays those rotated copies over
 * each other into a flower; the join between them costs one connector line.
 */
function timesTablePath(pegCount: number, multiplier: number, phases: number[] = [0]): number[] {
  const k = Math.round(multiplier)
  const path = [0]
  const push = (peg: number) => {
    if (peg !== path[path.length - 1]) path.push(peg)
  }

  for (const phase of phases) {
    for (let i = 0; i < pegCount; i++) {
      push(((k * i + Math.round(phase)) % pegCount + pegCount) % pegCount)
      push((i + 1) % pegCount)
    }
  }

  return path
}

/** Evenly spaced phase offsets, used to fan one times-table into `count` rotated copies. */
function evenPhases(pegCount: number, count: number): number[] {
  return Array.from({ length: Math.max(1, Math.round(count)) }, (_, i) =>
    Math.round((i * pegCount) / Math.max(1, Math.round(count))),
  )
}

/** Step expressed as "a polygon with this many sides", which is the way it reads on the board. */
function stepForSides(pegCount: number, sides: number): number {
  return Math.max(1, Math.round(pegCount / Math.max(2, Math.round(sides))))
}

const stepParam = (key: string, label: string, def: number): PatternParam => ({
  key,
  label,
  min: 1,
  max: MAX_EXPORT_PEGS - 1,
  step: 1,
  default: def,
})

const multiplierParam = (key: string, label: string, def: number): PatternParam => ({
  key,
  label,
  min: 2,
  max: 24,
  step: 1,
  default: def,
})

export const PATTERN_PRESETS: PatternPreset[] = [
  {
    id: 'starburst',
    name: 'Starburst',
    description: 'A single {n/k} star polygon. Steps near n/2 crowd the centre; small steps hug the rim.',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [stepParam('step', 'Step', 113)],
    build: (n, p) => [starPath(n, p.step)],
  },
  {
    id: 'rotating-squares',
    name: 'Rotating Squares',
    description: 'Inscribed polygons, each rotated one peg from the last — they envelope a crisp inner circle.',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [{ key: 'sides', label: 'Sides', min: 3, max: 16, step: 1, default: 4 }],
    build: (n, p) => [starPath(n, stepForSides(n, p.sides))],
  },
  {
    id: 'rotating-triangles',
    name: 'Rotating Triangles',
    description: 'The same sweep at three sides — a wider band around a half-radius core.',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [{ key: 'sides', label: 'Sides', min: 3, max: 16, step: 1, default: 3 }],
    build: (n, p) => [starPath(n, stepForSides(n, p.sides))],
  },
  {
    id: 'cardioid',
    name: 'Cardioid (×2)',
    description: 'i → k·i mod n. Multiplier k gives k−1 cusps, so ×2 is the classic single-cusp heart.',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [multiplierParam('multiplier', 'Multiplier', 2)],
    build: (n, p) => [timesTablePath(n, p.multiplier)],
  },
  {
    id: 'nephroid',
    name: 'Nephroid (×3)',
    description: 'The same family at ×3 — two cusps, the kidney curve.',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [multiplierParam('multiplier', 'Multiplier', 3)],
    build: (n, p) => [timesTablePath(n, p.multiplier)],
  },
  {
    id: 'trefoil',
    name: 'Trefoil (×4)',
    description: 'The same family at ×4 — three cusps. Each higher multiplier adds one lobe.',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [multiplierParam('multiplier', 'Multiplier', 4)],
    build: (n, p) => [timesTablePath(n, p.multiplier)],
  },
  {
    id: 'moire',
    // Steps have to sit near n/2 for this to work: the envelope radius of {n/k} is R·cos(πk/n),
    // so near-diameter chords sweep the whole disc and the two families overlap everywhere.
    // Steps near n/5 (an earlier attempt) just stack two coincident rims.
    name: 'Moiré Fringe',
    description: 'Two near-diameter stars a couple of pegs apart, beating into interference fringes.',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000', '#EF4444'],
    params: [stepParam('stepA', 'Step A', 133), stepParam('stepB', 'Step B', 137)],
    build: (n, p) => [starPath(n, p.stepA), starPath(n, p.stepB)],
  },
  {
    id: 'nested-burst',
    name: 'Nested Burst',
    description: 'Three stars at decreasing steps, stacked into concentric rings of thread.',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000', '#EF4444', '#3B82F6'],
    params: [stepParam('stepA', 'Step A', 113), stepParam('stepB', 'Step B', 71), stepParam('stepC', 'Step C', 41)],
    build: (n, p) => [starPath(n, p.stepA), starPath(n, p.stepB), starPath(n, p.stepC)],
  },
  {
    id: 'spiro-weave',
    name: 'Spiro Weave',
    description: 'Two times-tables in different colours, laid over each other into a woven epicycloid.',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000', '#EF4444'],
    params: [multiplierParam('multA', 'Mult A', 2), multiplierParam('multB', 'Mult B', 5)],
    build: (n, p) => [timesTablePath(n, p.multA), timesTablePath(n, p.multB)],
  },
  {
    id: 'rosette',
    name: 'Rosette',
    description: 'One times-table fanned into evenly spaced rotated copies — a flower on a single thread.',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [
      multiplierParam('multiplier', 'Multiplier', 2),
      { key: 'petals', label: 'Petals', min: 1, max: 8, step: 1, default: 3 },
    ],
    build: (n, p) => [timesTablePath(n, p.multiplier, evenPhases(n, p.petals))],
  },
]

export function defaultParams(preset: PatternPreset): PatternParams {
  return Object.fromEntries(preset.params.map((p) => [p.key, p.default]))
}

/**
 * Fills in anything the caller didn't supply. Builders do modular arithmetic on these, so a
 * missing or non-finite value would propagate NaN all the way into the exported peg indices —
 * cheaper to make each preset responsible for its own defaults than to trust every call site.
 */
function resolveParams(preset: PatternPreset, params: PatternParams): PatternParams {
  return Object.fromEntries(
    preset.params.map((p) => {
      const v = params[p.key]
      return [p.key, Number.isFinite(v) ? v : p.default]
    }),
  )
}

/**
 * Turns a preset's raw peg paths into the GenerationResult payload App renders and exports.
 *
 * `colors` is the live thread list rather than the preset's own, so recolouring a pattern in the
 * thread panel repaints it. A preset with more threads than colours reuses the last colour — the
 * geometry is what defines the thread count, not the palette.
 *
 * Wrap side is held constant. It only picks which of a nail's two tangent lines the thread
 * leaves on (tangent.ts), so a constant keeps every chord offset the same way and preserves the
 * pattern's rotational symmetry — a mixed set would jitter it by a nail radius. The image solver
 * chooses freely per line because it's chasing pixels, not symmetry.
 */
const PRESET_SIDE: WrapSide = 1

export function buildPatternResults(
  preset: PatternPreset,
  pegCount: number,
  params: PatternParams,
  colors: ThreadColor[],
): ColorResult[] {
  const paths = preset.build(pegCount, resolveParams(preset, params))

  return paths.map((pegs, i) => ({
    // Only the hex falls back — the id is always minted per thread. Reusing the last
    // ThreadColor object wholesale would hand several threads an identical id, and both the
    // preview groups and the legend key off it, so React would collapse them.
    color: {
      id: colors[i]?.id ?? `${preset.id}-${i}`,
      hex: colors[i]?.hex ?? colors[colors.length - 1]?.hex ?? '#000000',
    },
    pegs,
    sides: new Array<WrapSide>(Math.max(0, pegs.length - 1)).fill(PRESET_SIDE),
  }))
}

export function countLines(results: ColorResult[]): number {
  return results.reduce((sum, r) => sum + r.sides.length, 0)
}

/** Why this pattern can't be exported, or null if it can. Checked live as the knobs move. */
export function exportBlocker(pegCount: number, lineCount: number): string | null {
  // A step that lands on a multiple of the peg count walks nowhere, so the thread is empty.
  if (lineCount < 1) {
    return 'This combination draws no lines — try a step that isn’t a multiple of the peg count.'
  }
  if (pegCount > MAX_EXPORT_PEGS) {
    return `Export needs ${MAX_EXPORT_PEGS} pegs or fewer (board is at ${pegCount}).`
  }
  if (lineCount > MAX_EXPORT_LINES) {
    return `${lineCount} lines exceeds the ${MAX_EXPORT_LINES} the file format can encode.`
  }
  return null
}
