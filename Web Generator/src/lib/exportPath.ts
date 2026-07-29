import type { GenerationResult } from '../types'

export function buildExportText(result: GenerationResult, screwDistanceMm: number): string {
  const lines: string[] = []
  const boardDiameterMm = (result.pegCount * screwDistanceMm) / Math.PI

  lines.push('# String Art Path Export — DRAFT FORMAT, pending robot spec')
  lines.push(`# pegs=${result.pegCount}`)
  lines.push(`# colors=${result.results.length}`)
  lines.push(`# screw_distance_mm=${screwDistanceMm}`)
  lines.push(`# board_diameter_mm=${boardDiameterMm.toFixed(1)}`)
  lines.push('')

  for (const colorResult of result.results) {
    lines.push(`COLOR ${colorResult.color.hex} LINES=${colorResult.sequence.length - 1}`)
    lines.push(colorResult.sequence.join(','))
    lines.push('')
  }

  return lines.join('\n')
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
