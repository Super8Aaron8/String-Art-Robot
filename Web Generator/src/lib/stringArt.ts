import type { ColorResult, Peg, ThreadColor } from '../types'
import { LineCache } from './lineCache'

type Vec3 = [number, number, number]

function hexToRgb(hex: string): Vec3 {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255
  return [r, g, b]
}

function normalize3(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1
  return [v[0] / len, v[1] / len, v[2] / len]
}

async function yieldToUI() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

export interface GenerateOptions {
  rgb: Float32Array
  pegs: Peg[]
  lineCache: LineCache
  colors: ThreadColor[]
  minPegDistance: number
  lineWeight: number
  onProgress?: (colorIndex: number, colorTotal: number, lineIndex: number, lineTotal: number) => void
}

export async function generateColorSequences(opts: GenerateOptions): Promise<ColorResult[]> {
  const { rgb, pegs, lineCache, colors, minPegDistance, lineWeight, onProgress } = opts
  const pegCount = pegs.length
  const canvas = new Float32Array(rgb.length).fill(1)
  const results: ColorResult[] = []

  for (let ci = 0; ci < colors.length; ci++) {
    const color = colors[ci]
    const colorVec = hexToRgb(color.hex)
    const dir = normalize3([colorVec[0] - 1, colorVec[1] - 1, colorVec[2] - 1])
    const sequence: number[] = [0]
    let current = 0
    let previous = -1

    for (let step = 0; step < color.lineCount; step++) {
      let bestScore = -Infinity
      let bestPeg = -1
      let bestPixels: Int32Array | null = null

      for (let p = 0; p < pegCount; p++) {
        if (p === current || p === previous) continue
        const raw = Math.abs(p - current)
        const dist = Math.min(raw, pegCount - raw)
        if (dist < minPegDistance) continue

        const pixels = lineCache.get(current, p)
        if (pixels.length === 0) continue

        let sum = 0
        for (let i = 0; i < pixels.length; i++) {
          const o = pixels[i] * 3
          const dr = rgb[o] - canvas[o]
          const dg = rgb[o + 1] - canvas[o + 1]
          const db = rgb[o + 2] - canvas[o + 2]
          const proj = dr * dir[0] + dg * dir[1] + db * dir[2]
          if (proj > 0) sum += proj
        }
        if (sum > bestScore) {
          bestScore = sum
          bestPeg = p
          bestPixels = pixels
        }
      }

      if (bestPeg === -1 || !bestPixels) break

      for (let i = 0; i < bestPixels.length; i++) {
        const o = bestPixels[i] * 3
        canvas[o] += (colorVec[0] - canvas[o]) * lineWeight
        canvas[o + 1] += (colorVec[1] - canvas[o + 1]) * lineWeight
        canvas[o + 2] += (colorVec[2] - canvas[o + 2]) * lineWeight
      }

      sequence.push(bestPeg)
      previous = current
      current = bestPeg

      onProgress?.(ci, colors.length, step + 1, color.lineCount)
      if (step % 40 === 0) await yieldToUI()
    }

    results.push({ color, sequence })
  }

  return results
}
