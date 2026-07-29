import type { ThreadColor } from '../types'
import type { ScrewConfig } from '../config/screw'

const STORAGE_KEY = 'string-art-config-v1'

export interface StoredConfig {
  pegCount: number
  minPegDistance: number
  lineWeight: number
  screwDistance: number
  screw: ScrewConfig
  adjustments: { contrast: number; brightness: number }
  multiColor: boolean
  colors: ThreadColor[]
}

export function loadStoredConfig(): Partial<StoredConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<StoredConfig>
  } catch {
    return {}
  }
}

export function saveStoredConfig(config: StoredConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // localStorage unavailable (private browsing, quota) — persistence is best-effort
  }
}
