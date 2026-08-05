export interface Peg {
  index: number
  x: number
  y: number
}

export interface ThreadColor {
  id: string
  hex: string
}

export interface ColorResult {
  color: ThreadColor
  /** Peg path this thread follows, in order. */
  pegs: number[]
  /** Wrap side (CW=1 / CCW=-1) used for the transition into pegs[i+1]; length = pegs.length - 1. */
  sides: (1 | -1)[]
}

export interface GenerationResult {
  pegCount: number
  radius: number
  results: ColorResult[]
}
