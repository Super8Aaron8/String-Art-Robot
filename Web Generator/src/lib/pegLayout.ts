import type { Peg } from '../types'

export function generateCircularPegs(count: number, size: number): { pegs: Peg[]; cx: number; cy: number; radius: number } {
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 2
  const pegs: Peg[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    pegs.push({
      index: i,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    })
  }
  return { pegs, cx, cy, radius }
}
