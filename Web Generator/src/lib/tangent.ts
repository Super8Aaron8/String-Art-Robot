import type { Peg } from '../types'

export type WrapSide = 1 | -1

export interface Point {
  x: number
  y: number
}

/**
 * A nail is a cylinder, not a point — thread wrapped around it leaves on one of two parallel
 * external-tangent lines depending on which side (CW/CCW) it wraps. Both tangent lines are
 * the center-to-center line offset perpendicular by the nail radius; `side` picks which one.
 */
export function tangentSegment(a: Peg, b: Peg, side: WrapSide, nailRadius: number): { p0: Point; p1: Point } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const ux = dx / dist
  const uy = dy / dist
  const nx = -uy * side
  const ny = ux * side

  return {
    p0: { x: a.x + nx * nailRadius, y: a.y + ny * nailRadius },
    p1: { x: b.x + nx * nailRadius, y: b.y + ny * nailRadius },
  }
}
