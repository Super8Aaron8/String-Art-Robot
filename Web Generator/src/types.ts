export interface Peg {
  index: number
  x: number
  y: number
}

export interface ThreadColor {
  id: string
  hex: string
  lineCount: number
}

export interface ColorResult {
  color: ThreadColor
  sequence: number[]
}

export interface GenerationResult {
  pegCount: number
  radius: number
  results: ColorResult[]
}
