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
 * Bounds of the Line Weight stepper in ConfigPanel. Exported so ConfigPanel doesn't hardcode a
 * second copy, and so presetPreviewOpacity below can remap the same range it drives.
 */
export const LINE_WEIGHT_MIN = 0.02
export const LINE_WEIGHT_MAX = 0.3

/**
 * Preview stroke opacity for presets, driven by the same Line Weight control the image solver
 * uses. Line Weight's raw range is tuned so several thousand overlapping image lines build up
 * tone gradually — at a few hundred deliberate chords that range would read as nearly blank, so
 * it's remapped onto [0.25, 1]: light still shows a visible pattern instead of going nearly
 * invisible, and heavy goes fully opaque instead of stopping partway.
 */
export function presetPreviewOpacity(lineWeight: number): number {
  const t = (lineWeight - LINE_WEIGHT_MIN) / (LINE_WEIGHT_MAX - LINE_WEIGHT_MIN)
  const clamped = Math.min(1, Math.max(0, t))
  return 0.25 + clamped * 0.75
}

export interface PatternParam {
  key: string
  label: string
  min: number
  max: number
  step: number
  default: number
}

export type PatternParams = Record<string, number>

export const PATTERN_CATEGORIES = [
  'Freeform',
  'Inscribed Polygons',
  'Star Polygons',
  'Cusp Curves',
  'Envelopes & Caustics',
  'Modular & Recursive',
  'Layered & Nested',
  'Weaves & Fringes',
  'Spirals & Waves',
] as const

export type PatternCategory = (typeof PATTERN_CATEGORIES)[number]

export interface PatternPreset {
  id: string
  name: string
  /** One line describing the maths, shown under the button. */
  description: string
  /** Groups presets in the gallery — purely a UI concern. */
  category: PatternCategory
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
 * A true {points/density} star polygon: picks `points` pegs evenly spaced around the ring and
 * connects every `density`-th one, so the shape reads as an actual small star (pentagram,
 * hexagram, ...) regardless of how many physical pegs the board has — unlike starPath, which
 * walks every peg and only approaches a star's silhouette as an envelope. Uses the same
 * component-hopping rule as starPath when gcd(points, density) > 1, e.g. a hexagram's two
 * overlapping triangles.
 */
function starPolygonPath(pegCount: number, points: number, density: number): number[] {
  const p = Math.max(3, Math.min(Math.round(points), Math.max(3, pegCount)))
  const d = Math.min(Math.max(1, Math.round(density)), Math.floor((p - 1) / 2))
  const vertex = (j: number) => Math.round((j * pegCount) / p) % pegCount

  const visited = new Array<boolean>(p).fill(false)
  const path = [vertex(0)]
  visited[0] = true
  let remaining = p - 1
  let current = 0

  while (true) {
    const next = (current + d) % p
    if (!visited[next]) {
      visited[next] = true
      remaining--
      path.push(vertex(next))
      current = next
      continue
    }

    path.push(vertex(next))
    if (remaining === 0) break
    const seed = visited.indexOf(false)
    visited[seed] = true
    remaining--
    path.push(vertex(seed))
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

/**
 * Step for a classic {points/density} star polygon. Density 1 is just the inscribed regular
 * polygon (stepForSides with an extra name); density ≥ 2 skips points to draw the star's points,
 * e.g. {5/2} is the pentagram, {7/3} a heptagram. Density is clamped below points/2 since beyond
 * that the same shape retraces itself the other way around the ring.
 */
function stepForPointsDensity(pegCount: number, points: number, density: number): number {
  const p = Math.max(3, Math.round(points))
  const d = Math.min(Math.max(1, Math.round(density)), Math.floor((p - 1) / 2))
  return Math.max(1, Math.round((pegCount * d) / p))
}

/**
 * The step grows by `growth` pegs on every leg while also beating sinusoidally around that
 * growing value — a spiral (chords sweeping from tight rim loops to wide near-diameter crossings)
 * wound through a wave's interference band. Setting `amplitude` to 0 collapses this to a pure
 * spiral; setting `growth` to 0 collapses it to a pure wave centred on `baseStep` — one walk
 * covers both special cases as well as the combination.
 */
function vortexPath(
  pegCount: number,
  baseStep: number,
  growth: number,
  amplitude: number,
  frequency: number,
): number[] {
  const path = [0]
  let current = 0
  for (let i = 0; i < pegCount; i++) {
    const step = Math.round(
      baseStep + growth * i + amplitude * Math.sin((2 * Math.PI * frequency * i) / pegCount),
    )
    current = ((current + step) % pegCount + pegCount) % pegCount
    path.push(current)
  }
  return path
}

/**
 * Like timesTablePath, but the multiplier itself ramps linearly from `kStart` to `kEnd` across
 * the walk instead of staying fixed. The times-table family passes through a cusp curve for
 * every integer k (cardioid at 2, nephroid at 3, ...), so sweeping k continuously threads through
 * that whole family on one strand instead of picking a single member of it.
 */
function chirpPath(pegCount: number, kStart: number, kEnd: number): number[] {
  const path = [0]
  const push = (peg: number) => {
    if (peg !== path[path.length - 1]) path.push(peg)
  }
  const last = Math.max(1, pegCount - 1)
  for (let i = 0; i < pegCount; i++) {
    const k = kStart + ((kEnd - kStart) * i) / last
    push(((Math.round(k * i) % pegCount) + pegCount) % pegCount)
    push((i + 1) % pegCount)
  }
  return path
}

/**
 * Alternates one leg of multiplier `multA`'s times-table with one leg of `multB`'s on the same
 * thread, so the two families interlace chord-by-chord into an actual woven texture — compare
 * spiro-weave, which overlays the same two families as separate colours instead.
 */
function interleavedTimesTablePath(pegCount: number, multA: number, multB: number): number[] {
  const kA = Math.round(multA)
  const kB = Math.round(multB)
  const path = [0]
  const push = (peg: number) => {
    if (peg !== path[path.length - 1]) path.push(peg)
  }
  for (let i = 0; i < pegCount; i++) {
    push(((kA * i) % pegCount + pegCount) % pegCount)
    push((i + 1) % pegCount)
    push(((kB * i) % pegCount + pegCount) % pegCount)
    push((i + 1) % pegCount)
  }
  return path
}

/**
 * Phyllotaxis web: peg i sits `i` golden-angle turns around the ring (φ ≈ 0.6180339887, the
 * irrational spacing sunflower seed heads use so no two seeds ever share a direction), and
 * consecutive pegs in *that* order — not rim order — are connected. No chord length repeats for
 * a long time, so the result is a dense self-similar web rather than a single closed star.
 */
function goldenAnglePath(pegCount: number, count: number): number[] {
  const phi = 0.6180339887498949
  const c = Math.max(2, Math.round(count))
  const path: number[] = [0]
  for (let i = 1; i < c; i++) {
    path.push(Math.round(i * pegCount * phi) % pegCount)
  }
  return path
}

/**
 * Nearest peg to an angle in radians, measured from peg 0 rather than from the x-axis. pegLayout
 * puts peg i at 2πi/n − π/2, so ignoring that −π/2 just lands the whole design rotated a quarter
 * turn — irrelevant for a ring of thread, and it keeps the angle-driven builders below readable.
 */
function pegAtAngle(pegCount: number, angle: number): number {
  const t = Math.round((angle * pegCount) / (2 * Math.PI))
  return ((t % pegCount) + pegCount) % pegCount
}

/**
 * Draws a shape by enveloping it with tangent chords, which inverts how every other builder here
 * works: the others fix a stepping rule and discover what curve falls out, this one names the
 * target curve and solves for the chords.
 *
 * The geometry: a chord between rim angles φ−h and φ+h is tangent to the concentric circle of
 * radius R·cos(h), touching it at angle φ. So a curve described by its *support function* p(φ) —
 * the distance from the centre to the curve's tangent line whose normal points at angle φ — is
 * enveloped by the chord family h(φ) = arccos(p(φ)/R). Sampling φ around the ring emits it.
 *
 * p is taken as `base + amp·cos(lobes·φ)` in units of R, which spans a lot of ground: amp 0 is a
 * plain circle, lobes 2 an oval, higher lobes a flower or gear. A support function is only a
 * convex curve while p + p'' > 0; past that the curve self-intersects into cusps, which is a
 * feature here rather than a failure, so p is only clamped to the physically drawable [0, 1).
 */
function envelopePath(
  pegCount: number,
  lobes: number,
  base: number,
  amp: number,
  samples: number,
): number[] {
  const m = Math.max(0, Math.round(lobes))
  const count = Math.max(3, Math.round(samples))
  const path = [0]
  const push = (peg: number) => {
    if (peg !== path[path.length - 1]) path.push(peg)
  }

  for (let t = 0; t < count; t++) {
    const phi = (2 * Math.PI * t) / count
    // Clamped just below 1: p = 1 is a tangent line touching the rim, i.e. a zero-length chord.
    const p = Math.min(0.999, Math.max(0, base + amp * Math.cos(m * phi)))
    const h = Math.acos(p)
    push(pegAtAngle(pegCount, phi - h))
    push(pegAtAngle(pegCount, phi + h))
  }

  return path
}

/**
 * Optical caustic: the bright cusped curve light forms when it reflects off the inside of a ring —
 * the shape in the bottom of a sunlit coffee cup. Unique here in being a simulation rather than a
 * construction; the curve is a by-product of the physics, not something the rule names.
 *
 * On a circle the reflection law is exactly integer arithmetic: a ray arriving at peg b from peg a
 * leaves along the chord to peg 2b − a, because the rim's normal at b bisects them. Iterating that
 * is a billiard, so `bounces` above 1 walks the ray on around the inside of the ring.
 *
 * Every ray is drawn from the source outward, and the walk back to the source for the next ray
 * lands as one more chord ending at the source — visually indistinguishable from an incident ray,
 * so the export's one-continuous-path rule costs nothing here but a slightly denser fan.
 */
function causticPath(pegCount: number, source: number, rays: number, bounces: number): number[] {
  const s = ((Math.round(source) % pegCount) + pegCount) % pegCount
  const r = Math.max(1, Math.round(rays))
  const b = Math.max(1, Math.round(bounces))
  const path = [0]
  const push = (peg: number) => {
    if (peg !== path[path.length - 1]) path.push(peg)
  }

  for (let i = 0; i < r; i++) {
    let prev = s
    // Spread over the rim skipping the source itself — a ray aimed at its own origin has no
    // direction to reflect in.
    let current = (s + Math.round(((i + 1) * pegCount) / (r + 1))) % pegCount
    push(prev)
    push(current)
    for (let k = 0; k < b; k++) {
      const next = ((2 * current - prev) % pegCount + pegCount) % pegCount
      push(next)
      prev = current
      current = next
    }
  }

  return path
}

/**
 * i → i^power mod n. The times-table family is linear in i and Comet Trail ramps that line's
 * slope; raising i to a power instead bends the map, so the chord envelope stops being a smooth
 * epicycloid and clumps into number-theoretic bands no stepping rule reaches.
 *
 * The far ends pile onto the set of power residues mod n, which is small and very sensitive to
 * how n factors — on the 288-pin board squaring reaches only 28 of the 288 pegs, so the chords
 * bundle hard onto those. It is not monotone in the power (mod 288: squares 28, cubes 57,
 * 4th powers 16), and a prime ring behaves completely differently (mod 251: squares 126, cubes
 * all 251), which is exactly why stepping the knob reshuffles the whole figure instead of just
 * adding lobes.
 */
function powerWebPath(pegCount: number, power: number, phase: number): number[] {
  const e = Math.max(2, Math.round(power))
  const ph = Math.round(phase)
  const path = [0]
  const push = (peg: number) => {
    if (peg !== path[path.length - 1]) path.push(peg)
  }

  for (let i = 0; i < pegCount; i++) {
    // Multiply under the modulus rather than computing i**e — n ≤ 360 keeps every partial product
    // under 130k, where i**8 would overflow past exact integers.
    let r = 1
    for (let k = 0; k < e; k++) r = (r * i) % pegCount
    push(((r + ph) % pegCount + pegCount) % pegCount)
    push((i + 1) % pegCount)
  }

  return path
}

/**
 * Self-similar walk: the step doubles according to the ruler sequence — leg i steps
 * `baseStep · 2^v`, where v is the number of trailing zero bits of i. So half the legs are the
 * base step, a quarter are double, an eighth quadruple, and so on, nested the way tick marks are
 * on a ruler.
 *
 * Every other builder here draws chords at one scale (or sweeps smoothly between scales); this is
 * the only one that interleaves several discrete scales at once, so short rim stitches and long
 * crossing chords sit inside each other rather than in separate bands. `depth` caps the doubling,
 * since past ~2^8 the step wraps the ring and the self-similarity stops reading.
 */
function fractalRulerPath(pegCount: number, baseStep: number, depth: number, lines: number): number[] {
  const b = Math.max(1, Math.round(baseStep))
  const d = Math.max(0, Math.round(depth))
  const count = Math.max(1, Math.round(lines))
  const path = [0]
  let current = 0

  for (let i = 1; i <= count; i++) {
    let v = 0
    let x = i
    while ((x & 1) === 0 && v < d) {
      x >>= 1
      v++
    }
    current = ((current + b * (1 << v)) % pegCount + pegCount) % pegCount
    path.push(current)
  }

  return path
}

/**
 * Families of *parallel* chords — hatching. Every other builder here is rotational: it steps
 * around the ring and the result is symmetric under turning. This one is translational, sweeping
 * a chord sideways across the disc at a fixed direction, which is the one thing peg arithmetic
 * can't express. Two families cross into a plaid, three into a triangular mesh.
 *
 * A chord at rim angles φ ± h is perpendicular to direction φ whatever h is, so holding φ and
 * sweeping h from 0 to π walks a chord from one rim point across to the other side. Chords
 * alternate direction as h advances (boustrophedon) so each one ends beside where the next
 * begins — otherwise every connector would be a full-width chord back across the disc, and the
 * hatching would be buried under its own joins.
 */
function hatchPath(pegCount: number, families: number, linesPerFamily: number): number[] {
  const f = Math.max(1, Math.round(families))
  const l = Math.max(1, Math.round(linesPerFamily))
  const path = [0]
  const push = (peg: number) => {
    if (peg !== path[path.length - 1]) path.push(peg)
  }

  for (let k = 0; k < f; k++) {
    // Directions span half a turn, not a full one: φ and φ + π are the same family of chords.
    const phi = (Math.PI * k) / f
    for (let j = 0; j < l; j++) {
      const h = (Math.PI * (j + 0.5)) / l
      const a = pegAtAngle(pegCount, phi - h)
      const b = pegAtAngle(pegCount, phi + h)
      if (j % 2 === 0) {
        push(a)
        push(b)
      } else {
        push(b)
        push(a)
      }
    }
  }

  return path
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
  max: 40,
  step: 1,
  default: def,
})

const phaseParam = (def = 0): PatternParam => ({
  key: 'phase',
  label: 'Phase',
  min: 0,
  max: BOARD_PEG_COUNT - 1,
  step: 1,
  default: def,
})

const pointsParam = (def: number): PatternParam => ({
  key: 'points',
  label: 'Points',
  min: 3,
  max: 40,
  step: 1,
  default: def,
})

const densityParam = (def: number): PatternParam => ({
  key: 'density',
  label: 'Density',
  min: 1,
  max: 19,
  step: 1,
  default: def,
})

/**
 * Shared by the Inscribed Polygons presets: walks every peg at a step derived from points/density,
 * so it envelopes a circle rather than tracing a small star (see starPolygonPath for that).
 */
const inscribedPolygonBuild = (n: number, p: PatternParams) => [
  starPath(n, stepForPointsDensity(n, p.points, p.density)),
]

export const PATTERN_PRESETS: PatternPreset[] = [
  {
    id: 'starburst',
    name: 'Starburst',
    description: 'A single {n/k} star polygon by raw step. Steps near n/2 crowd the centre; small steps hug the rim.',
    category: 'Freeform',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [stepParam('step', 'Step', 113)],
    build: (n, p) => [starPath(n, p.step)],
  },
  {
    id: 'phyllotaxis',
    name: 'Phyllotaxis',
    description: 'Pegs visited in golden-angle order, the spacing sunflower seed heads use — a dense web that never quite repeats a chord length.',
    category: 'Freeform',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [{ key: 'count', label: 'Lines', min: 20, max: 2000, step: 10, default: 500 }],
    build: (n, p) => [goldenAnglePath(n, p.count)],
  },

  // --- Inscribed Polygons: density 1 is the plain regular {points}-gon envelope; density ≥ 2
  // turns it into its own star-polygon variant. One knob-driven preset covers the whole family —
  // triangles through octagons and beyond are all just Points.
  {
    id: 'rotating-polygons',
    name: 'Rotating Polygons',
    description: 'Inscribed {points}-gons, each rotated one peg from the last, enveloping a core that rounds out as Points climbs — 3 for a wide triangular band, 8+ for a near-perfect inner circle.',
    category: 'Inscribed Polygons',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [pointsParam(6), densityParam(1)],
    build: inscribedPolygonBuild,
  },

  // --- Star Polygons: density ≥ 2 skips points to draw actual star points instead of a plain
  // envelope. Points/Density together cover the whole classic {p/d} family — pentagram at 5/2,
  // hexagram at 6/2, heptagram at 7/3, and so on — from one preset.
  {
    id: 'star-polygon',
    name: 'Star Polygon',
    description: 'A true {points/density} star — pentagram at 5/2, hexagram at 6/2 (Star of David, splits into two triangles), heptagram at 7/3, and sharper still as either climbs.',
    category: 'Star Polygons',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [pointsParam(5), densityParam(2)],
    build: (n, p) => [starPolygonPath(n, p.points, p.density)],
  },

  // --- Cusp Curves: i → k·i + phase mod n. Multiplier k gives k−1 cusps (cardioid at ×2, nephroid
  // at ×3, trefoil at ×4, ...) and phase spins the envelope without changing its shape — one
  // preset sweeps the whole family.
  {
    id: 'cusp-curve',
    name: 'Cusp Curve',
    description: 'i → k·i mod n. Multiplier gives k−1 cusps: ×2 is the cardioid heart, ×3 the kidney-shaped nephroid, ×4 a trefoil, climbing into denser gear-like lobes from there.',
    category: 'Cusp Curves',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [multiplierParam('multiplier', 'Multiplier', 2), phaseParam()],
    build: (n, p) => [timesTablePath(n, p.multiplier, [p.phase])],
  },
  {
    id: 'comet-trail',
    name: 'Comet Trail',
    description: 'The multiplier itself sweeps from K Start to K End across one pass, threading through the whole cusp-curve family on a single strand instead of settling on one.',
    category: 'Cusp Curves',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [multiplierParam('kStart', 'K Start', 2), multiplierParam('kEnd', 'K End', 15)],
    build: (n, p) => [chirpPath(n, p.kStart, p.kEnd)],
  },

  // --- Envelopes & Caustics: the curve is named up front and the chords are solved for, rather
  // than falling out of a stepping rule.
  {
    id: 'tangent-envelope',
    name: 'Tangent Envelope',
    description: 'Names a target curve and solves for the chords tangent to it. Depth 0 is a plain circle; 2 lobes an oval, higher lobes a flower or gear, and pushing Depth past what the radius supports breaks the curve into cusps.',
    category: 'Envelopes & Caustics',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [
      { key: 'lobes', label: 'Lobes', min: 0, max: 16, step: 1, default: 5 },
      { key: 'base', label: 'Radius', min: 0.02, max: 0.95, step: 0.01, default: 0.45 },
      { key: 'amp', label: 'Depth', min: 0, max: 0.5, step: 0.01, default: 0.25 },
      { key: 'samples', label: 'Samples', min: 24, max: 1200, step: 12, default: 288 },
    ],
    build: (n, p) => [envelopePath(n, p.lobes, p.base, p.amp, p.samples)],
  },
  {
    id: 'caustic',
    name: 'Caustic',
    description: 'Light from one peg reflecting off the inside of the ring — the cusped curve in the bottom of a sunlit cup. One bounce gives the classic cardioid; more turns each ray into a billiard.',
    category: 'Envelopes & Caustics',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [
      { key: 'source', label: 'Source', min: 0, max: BOARD_PEG_COUNT - 1, step: 1, default: 0 },
      { key: 'rays', label: 'Rays', min: 12, max: 600, step: 12, default: 144 },
      { key: 'bounces', label: 'Bounces', min: 1, max: 6, step: 1, default: 1 },
    ],
    build: (n, p) => [causticPath(n, p.source, p.rays, p.bounces)],
  },

  // --- Modular & Recursive: arithmetic on the peg index that isn't a linear step — nonlinear
  // maps and self-similar scales.
  {
    id: 'power-web',
    name: 'Power Web',
    description: 'i → i^power mod n. A nonlinear map, so chord ends pile onto a small set of power residues — only 28 of the 288 pegs when squaring — clumping into number-theoretic bands. Each power reaches a different set, so the knob reshuffles the figure rather than adding lobes.',
    category: 'Modular & Recursive',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [{ key: 'power', label: 'Power', min: 2, max: 8, step: 1, default: 2 }, phaseParam()],
    build: (n, p) => [powerWebPath(n, p.power, p.phase)],
  },
  {
    id: 'fractal-ruler',
    name: 'Fractal Ruler',
    description: 'The step doubles on the ruler sequence — half the legs short, a quarter double, an eighth quadruple — so several chord scales nest inside each other instead of sitting in separate bands.',
    category: 'Modular & Recursive',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [
      stepParam('baseStep', 'Base Step', 7),
      { key: 'depth', label: 'Depth', min: 0, max: 8, step: 1, default: 5 },
      { key: 'lines', label: 'Lines', min: 32, max: 3000, step: 32, default: 1024 },
    ],
    build: (n, p) => [fractalRulerPath(n, p.baseStep, p.depth, p.lines)],
  },

  // --- Layered & Nested: several stars stacked as separate threads, concentric rather than
  // interfering.
  {
    id: 'nested-burst',
    name: 'Nested Burst',
    description: 'Three stars at decreasing steps, stacked into concentric rings of thread.',
    category: 'Layered & Nested',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000', '#EF4444', '#3B82F6'],
    params: [stepParam('stepA', 'Step A', 113), stepParam('stepB', 'Step B', 71), stepParam('stepC', 'Step C', 41)],
    build: (n, p) => [starPath(n, p.stepA), starPath(n, p.stepB), starPath(n, p.stepC)],
  },
  {
    id: 'halo-rings',
    name: 'Halo Rings',
    description: 'Four stars at decreasing steps in four colours — a wider, more gradual nest than Nested Burst.',
    category: 'Layered & Nested',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000', '#EF4444', '#3B82F6', '#22C55E'],
    params: [
      stepParam('stepA', 'Step A', 121),
      stepParam('stepB', 'Step B', 97),
      stepParam('stepC', 'Step C', 63),
      stepParam('stepD', 'Step D', 29),
    ],
    build: (n, p) => [starPath(n, p.stepA), starPath(n, p.stepB), starPath(n, p.stepC), starPath(n, p.stepD)],
  },
  {
    id: 'polygon-bloom',
    name: 'Polygon Bloom',
    description: 'Three true {points/density} star polygons at different point counts, stacked as separate threads into a layered bloom rather than a plain envelope.',
    category: 'Layered & Nested',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000', '#EF4444', '#3B82F6'],
    params: [
      { key: 'pointsA', label: 'Points A', min: 3, max: 40, step: 1, default: 5 },
      { key: 'densityA', label: 'Density A', min: 1, max: 19, step: 1, default: 2 },
      { key: 'pointsB', label: 'Points B', min: 3, max: 40, step: 1, default: 8 },
      { key: 'densityB', label: 'Density B', min: 1, max: 19, step: 1, default: 3 },
      { key: 'pointsC', label: 'Points C', min: 3, max: 40, step: 1, default: 12 },
      { key: 'densityC', label: 'Density C', min: 1, max: 19, step: 1, default: 5 },
    ],
    build: (n, p) => [
      starPolygonPath(n, p.pointsA, p.densityA),
      starPolygonPath(n, p.pointsB, p.densityB),
      starPolygonPath(n, p.pointsC, p.densityC),
    ],
  },

  // --- Weaves & Fringes: two or more families deliberately overlapping, rather than nesting
  // cleanly.
  {
    id: 'moire',
    // Steps have to sit near n/2 for this to work: the envelope radius of {n/k} is R·cos(πk/n),
    // so near-diameter chords sweep the whole disc and the two families overlap everywhere.
    // Steps near n/5 (an earlier attempt) just stack two coincident rims.
    name: 'Moiré Fringe',
    description: 'Two near-diameter stars a couple of pegs apart, beating into interference fringes.',
    category: 'Weaves & Fringes',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000', '#EF4444'],
    params: [stepParam('stepA', 'Step A', 133), stepParam('stepB', 'Step B', 137)],
    build: (n, p) => [starPath(n, p.stepA), starPath(n, p.stepB)],
  },
  {
    id: 'spiro-weave',
    name: 'Spiro Weave',
    description: 'Two times-tables in different colours, laid over each other into a woven epicycloid.',
    category: 'Weaves & Fringes',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000', '#EF4444'],
    params: [multiplierParam('multA', 'Mult A', 2), multiplierParam('multB', 'Mult B', 5)],
    build: (n, p) => [timesTablePath(n, p.multA), timesTablePath(n, p.multB)],
  },
  {
    id: 'double-weave',
    name: 'Double Weave',
    description: 'Two times-tables interlaced leg by leg on a single thread — an actual woven texture rather than two overlaid colours.',
    category: 'Weaves & Fringes',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [multiplierParam('multA', 'Mult A', 2), multiplierParam('multB', 'Mult B', 9)],
    build: (n, p) => [interleavedTimesTablePath(n, p.multA, p.multB)],
  },
  {
    id: 'hatch-plaid',
    name: 'Hatch Plaid',
    description: 'Families of parallel chords sweeping across the disc instead of stepping around it — the one construction peg arithmetic can’t express. Two families cross into a plaid, three into a triangular mesh.',
    category: 'Weaves & Fringes',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [
      { key: 'families', label: 'Families', min: 1, max: 8, step: 1, default: 2 },
      { key: 'lines', label: 'Per Family', min: 8, max: 200, step: 4, default: 72 },
    ],
    build: (n, p) => [hatchPath(n, p.families, p.lines)],
  },
  {
    id: 'mandala',
    name: 'Mandala',
    description: 'One times-table fanned into evenly spaced rotated copies — a flower on a single thread.',
    category: 'Weaves & Fringes',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [
      multiplierParam('multiplier', 'Multiplier', 2),
      { key: 'petals', label: 'Petals', min: 1, max: 16, step: 1, default: 3 },
    ],
    build: (n, p) => [timesTablePath(n, p.multiplier, evenPhases(n, p.petals))],
  },

  // --- Spirals & Waves: the step itself varies over the walk instead of staying fixed. Vortex's
  // walk is spiralPath and wavePath added together, so it subsumes both as special cases —
  // Amplitude 0 is a pure spiral, Growth 0 is a pure wave — rather than needing three presets for
  // what's really one family.
  {
    id: 'vortex',
    name: 'Vortex',
    description: 'The step grows across the pass (spiral) while also beating sinusoidally (wave). Zero Amplitude for a pure spiral, zero Growth for a pure wave, or keep both for a spiral wound through an interference band.',
    category: 'Spirals & Waves',
    pegCount: BOARD_PEG_COUNT,
    colors: ['#000000'],
    params: [
      stepParam('baseStep', 'Base Step', 5),
      { key: 'growth', label: 'Growth', min: -3, max: 3, step: 0.05, default: 0.35 },
      { key: 'amplitude', label: 'Amplitude', min: 0, max: 150, step: 1, default: 40 },
      { key: 'frequency', label: 'Frequency', min: 1, max: 20, step: 1, default: 5 },
    ],
    build: (n, p) => [vortexPath(n, p.baseStep, p.growth, p.amplitude, p.frequency)],
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
