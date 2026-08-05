import type { ColorResult, Peg, ThreadColor } from '../types'
import { LineCache } from './lineCache'
import type { WrapSide } from './tangent'

type Vec3 = [number, number, number]

function hexToRgb(hex: string): Vec3 {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255
  return [r, g, b]
}

// A plain `setTimeout(fn, 0)` gets clamped to a ~4ms minimum by browsers once a few are
// nested back to back (the HTML5 timer throttling rule), which is exactly the pattern an
// await-in-a-loop produces. A MessageChannel round-trip is a macrotask too (so it still lets
// paint/input run) but isn't subject to that clamp.
function makeYielder(): () => Promise<void> {
  const channel = new MessageChannel()
  let resolve: (() => void) | null = null
  channel.port1.onmessage = () => resolve?.()
  return () =>
    new Promise<void>((res) => {
      resolve = res
      channel.port2.postMessage(null)
    })
}

const SIDES: WrapSide[] = [1, -1]
const YIELD_INTERVAL_MS = 50

export interface GenerateOptions {
  rgb: Float32Array
  pegs: Peg[]
  lineCache: LineCache
  colors: ThreadColor[]
  totalLines: number
  minPegDistance: number
  lineWeight: number
  onProgress?: (lineIndex: number, lineTotal: number) => void
}

interface ThreadState {
  color: ThreadColor
  colorVec: Vec3
  pegs: number[]
  sides: WrapSide[]
  current: number
  previous: number
}

interface Move {
  score: number
  peg: number
  side: WrapSide
  pixels: Int32Array | null
}

export async function generateColorSequences(opts: GenerateOptions): Promise<ColorResult[]> {
  const { rgb, pegs, lineCache, colors, totalLines, minPegDistance, lineWeight, onProgress } = opts
  const pegCount = pegs.length
  const canvas = new Float32Array(rgb.length).fill(1)

  const threads: ThreadState[] = colors.map((color) => ({
    color,
    colorVec: hexToRgb(color.hex),
    pegs: [0],
    sides: [],
    current: 0,
    previous: -1,
  }))

  const bestMoveFor = (thread: ThreadState): Move => {
    let bestScore = -Infinity
    let bestPeg = -1
    let bestSide: WrapSide = 1
    let bestPixels: Int32Array | null = null

    // Hoisted once per thread rather than re-read from the array on every pixel of every
    // candidate line — this loop runs pegCount * 2 * lineLength times per step.
    const cr = thread.colorVec[0]
    const cg = thread.colorVec[1]
    const cb = thread.colorVec[2]
    const w = lineWeight
    const current = thread.current
    const previous = thread.previous

    for (let p = 0; p < pegCount; p++) {
      if (p === current || p === previous) continue
      const raw = p - current < 0 ? current - p : p - current
      const dist = raw < pegCount - raw ? raw : pegCount - raw
      if (dist < minPegDistance) continue

      for (const side of SIDES) {
        const pixels = lineCache.get(current, p, side)
        const len = pixels.length
        if (len === 0) continue

        // Score = total squared-error reduction this line would make (target vs. canvas),
        // simulated with the same lerp the commit step below actually applies. Pixels that
        // would get worse (overshoot past the target) contribute nothing rather than a
        // penalty, so a line that's net-good isn't scared off by a few bad pixels — those
        // can still be corrected by a later line.
        //
        // Per-channel improvement is algebraically reduced from the direct
        // errBefore - errAfter computation (with c = color - before, d = target - before,
        // cw = c * w): errBefore - errAfter = cw * (2d - cw). Same result, fewer ops.
        let sum = 0
        for (let i = 0; i < len; i++) {
          const o = pixels[i] * 3

          const b0 = canvas[o]
          const cw0 = (cr - b0) * w
          const imp0 = cw0 * (rgb[o] - b0 + rgb[o] - b0 - cw0)
          if (imp0 > 0) sum += imp0

          const b1 = canvas[o + 1]
          const cw1 = (cg - b1) * w
          const imp1 = cw1 * (rgb[o + 1] - b1 + rgb[o + 1] - b1 - cw1)
          if (imp1 > 0) sum += imp1

          const b2 = canvas[o + 2]
          const cw2 = (cb - b2) * w
          const imp2 = cw2 * (rgb[o + 2] - b2 + rgb[o + 2] - b2 - cw2)
          if (imp2 > 0) sum += imp2
        }
        if (sum > bestScore) {
          bestScore = sum
          bestPeg = p
          bestSide = side
          bestPixels = pixels
        }
      }
    }

    return { score: bestScore, peg: bestPeg, side: bestSide, pixels: bestPixels }
  }

  const yieldToUI = makeYielder()
  let lastYield = performance.now()

  for (let step = 0; step < totalLines; step++) {
    let winner: ThreadState | null = null
    let winnerMove: Move | null = null

    for (const thread of threads) {
      const move = bestMoveFor(thread)
      if (move.peg === -1) continue
      if (!winnerMove || move.score > winnerMove.score) {
        winner = thread
        winnerMove = move
      }
    }

    if (!winner || !winnerMove || !winnerMove.pixels) break

    const pixels = winnerMove.pixels
    for (let i = 0; i < pixels.length; i++) {
      const o = pixels[i] * 3
      canvas[o] += (winner.colorVec[0] - canvas[o]) * lineWeight
      canvas[o + 1] += (winner.colorVec[1] - canvas[o + 1]) * lineWeight
      canvas[o + 2] += (winner.colorVec[2] - canvas[o + 2]) * lineWeight
    }

    winner.pegs.push(winnerMove.peg)
    winner.sides.push(winnerMove.side)
    winner.previous = winner.current
    winner.current = winnerMove.peg

    // Reporting progress and yielding to the UI thread are both only needed often enough to
    // look responsive (~20fps), not on every line — each React state update has real cost.
    // lastYield is stamped after the await so the yield itself isn't charged against the
    // next interval's compute budget.
    if (performance.now() - lastYield >= YIELD_INTERVAL_MS || step === totalLines - 1) {
      onProgress?.(step + 1, totalLines)
      await yieldToUI()
      lastYield = performance.now()
    }
  }

  return threads.map((thread) => ({ color: thread.color, pegs: thread.pegs, sides: thread.sides }))
}
