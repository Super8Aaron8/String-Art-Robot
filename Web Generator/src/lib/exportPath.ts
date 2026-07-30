import type { GenerationResult } from '../types'

const DIR_CW = 62 // '>'
const DIR_CCW = 60 // '<'
const COLOR_CW_BASE = 65 // 'A'
const COLOR_CCW_BASE = 97 // 'a'

const MIN_SLOT = 1
const MAX_SLOT = 8
const MAX_COLORS = 5 // hardware only has color-change bytes for A–E
const MAX_LINES = 9999 // LINES4..LINES1 is a 4-digit field
const MAX_PIN = 360 // 3 chunks of <=120 each

/** Splits a 0-360 pin target into 3 motor-command bytes, each <=120, never landing on 10 or 13 (LF/CR). */
function splitPin(total: number): [number, number, number] {
  const chunks: [number, number, number] = [0, 0, 0]
  let remaining = total
  for (let i = 0; i < 3; i++) {
    chunks[i] = Math.min(120, remaining)
    remaining -= chunks[i]
  }

  for (let i = 0; i < 3; i++) {
    if (chunks[i] !== 10 && chunks[i] !== 13) continue
    if (i === 0) {
      // no earlier chunk to borrow from — push the offending unit into the next chunk
      chunks[0] -= 1
      chunks[1] += 1
    } else {
      // borrow 1 unit from the previous chunk (always 120 here, so this can't itself go forbidden)
      chunks[i - 1] -= 1
      chunks[i] += 1
    }
  }

  const sumOk = chunks[0] + chunks[1] + chunks[2] === total
  const rangeOk = chunks.every((c) => c >= 0 && c <= 120)
  const forbiddenOk = chunks.every((c) => c !== 10 && c !== 13)
  if (!sumOk || !rangeOk || !forbiddenOk) {
    throw new Error(`Failed to encode pin ${total} as 3 motor chunks: got [${chunks.join(',')}]`)
  }
  return chunks
}

/**
 * Builds the binary robot path file: a 17-byte config header followed by one
 * 4-byte record per line — [dir/color byte, pin chunk 1, chunk 2, chunk 3].
 */
export function buildExportBinary(result: GenerationResult, slot: number): Uint8Array<ArrayBuffer> {
  if (!Number.isInteger(slot) || slot < MIN_SLOT || slot > MAX_SLOT) {
    throw new Error(`Slot must be an integer between ${MIN_SLOT} and ${MAX_SLOT} (got ${slot})`)
  }
  if (result.pegCount < 1 || result.pegCount > MAX_PIN) {
    throw new Error(`Peg count must be between 1 and ${MAX_PIN} to export (got ${result.pegCount})`)
  }

  // Colors that never won a single line (e.g. lost every step to other threads)
  // contribute no thread and must not consume a letter slot or a color-change byte.
  const activeResults = result.results.filter((r) => r.sides.length > 0)

  if (activeResults.length < 1 || activeResults.length > MAX_COLORS) {
    throw new Error(`Export supports 1-${MAX_COLORS} colors with at least one line (got ${activeResults.length})`)
  }

  const totalLines = activeResults.reduce((sum, r) => sum + r.sides.length, 0)
  if (totalLines > MAX_LINES) {
    throw new Error(`Total line count ${totalLines} exceeds the ${MAX_LINES} the file format can encode`)
  }

  const bytes: number[] = new Array(17).fill(0)
  bytes[0] = slot
  bytes[1] = Math.floor(totalLines / 1000) % 10
  bytes[2] = Math.floor(totalLines / 100) % 10
  bytes[3] = Math.floor(totalLines / 10) % 10
  bytes[4] = totalLines % 10
  bytes[5] = Math.floor(activeResults.length / 10) % 10
  bytes[6] = activeResults.length % 10
  // bytes[7..16] (LENGTHA2..LENGTHE1) are calibration lengths the device itself
  // writes after an on-device CALIBRATE pass — left at 0 here.

  activeResults.forEach((colorResult, colorIndex) => {
    colorResult.sides.forEach((side, lineIndex) => {
      const destPeg = colorResult.pegs[lineIndex + 1]
      if (destPeg < 0 || destPeg > MAX_PIN) {
        throw new Error(`Peg index ${destPeg} is out of the 0-${MAX_PIN} range the file format can encode`)
      }

      const isColorChange = lineIndex === 0 && colorIndex > 0
      const isCw = side === 1
      const dirByte = isColorChange
        ? (isCw ? COLOR_CW_BASE : COLOR_CCW_BASE) + colorIndex
        : isCw ? DIR_CW : DIR_CCW

      const [p1, p2, p3] = splitPin(destPeg)
      bytes.push(dirByte, p1, p2, p3)
    })
  })

  return Uint8Array.from(bytes)
}

export function downloadBinaryFile(filename: string, bytes: Uint8Array<ArrayBuffer>) {
  const blob = new Blob([bytes], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
