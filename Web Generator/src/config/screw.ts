export interface ScrewConfig {
  /** Screw radius in real-world mm. Scaled against Screw Distance to size it in the preview. */
  radius: number
  /** Screw color (metal tone). */
  color: string
}

export const DEFAULT_SCREW: ScrewConfig = {
  radius: 3,
  color: '#c3cad2',
}
