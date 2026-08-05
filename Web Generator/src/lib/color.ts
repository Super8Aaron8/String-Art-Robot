export function shadeHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  const r = Math.min(255, Math.max(0, Math.round(((num >> 16) & 0xff) + 255 * amount)))
  const g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 0xff) + 255 * amount)))
  const b = Math.min(255, Math.max(0, Math.round((num & 0xff) + 255 * amount)))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}
