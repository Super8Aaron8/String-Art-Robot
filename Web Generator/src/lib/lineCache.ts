import type { Peg } from '../types'
import { tangentSegment, type WrapSide } from './tangent'

function traceLinePixels(x0f: number, y0f: number, x1f: number, y1f: number, size: number): Int32Array {
  const x0 = Math.round(x0f)
  const y0 = Math.round(y0f)
  const x1 = Math.round(x1f)
  const y1 = Math.round(y1f)

  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  let x = x0
  let y = y0

  const out: number[] = []
  while (true) {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      out.push(y * size + x)
    }
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return Int32Array.from(out)
}

export class LineCache {
  private size: number
  private pegs: Peg[]
  private nailRadius: number
  private cache: Map<number, Int32Array> = new Map()

  constructor(pegs: Peg[], size: number, nailRadius: number) {
    this.pegs = pegs
    this.size = size
    this.nailRadius = nailRadius
  }

  private key(lo: number, hi: number, side: WrapSide): number {
    return (lo * this.pegs.length + hi) * 2 + (side === 1 ? 1 : 0)
  }

  /** side is relative to the a->b direction as given; the same physical tangent line is
   * returned regardless of call order as long as side is flipped along with a/b. */
  get(a: number, b: number, side: WrapSide): Int32Array {
    const flip = a > b
    const lo = flip ? b : a
    const hi = flip ? a : b
    const canonSide: WrapSide = flip ? (side === 1 ? -1 : 1) : side

    const key = this.key(lo, hi, canonSide)
    let pixels = this.cache.get(key)
    if (!pixels) {
      const { p0, p1 } = tangentSegment(this.pegs[lo], this.pegs[hi], canonSide, this.nailRadius)
      pixels = traceLinePixels(p0.x, p0.y, p1.x, p1.y, this.size)
      this.cache.set(key, pixels)
    }
    return pixels
  }
}
