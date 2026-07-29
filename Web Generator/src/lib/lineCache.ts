import type { Peg } from '../types'

function traceLinePixels(p1: Peg, size: number, p2: Peg): Int32Array {
  const x0 = Math.round(p1.x)
  const y0 = Math.round(p1.y)
  const x1 = Math.round(p2.x)
  const y1 = Math.round(p2.y)

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
  private cache: Map<number, Int32Array> = new Map()

  constructor(pegs: Peg[], size: number) {
    this.pegs = pegs
    this.size = size
  }

  private key(a: number, b: number): number {
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    return lo * this.pegs.length + hi
  }

  get(a: number, b: number): Int32Array {
    const key = this.key(a, b)
    let pixels = this.cache.get(key)
    if (!pixels) {
      pixels = traceLinePixels(this.pegs[a], this.size, this.pegs[b])
      this.cache.set(key, pixels)
    }
    return pixels
  }
}
