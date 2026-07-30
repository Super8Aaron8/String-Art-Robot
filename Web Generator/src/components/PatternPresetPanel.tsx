import { useMemo } from 'react'
import { PATTERN_PRESETS, presetLineCount, type PatternPreset } from '../lib/patterns'

interface Props {
  activePresetId: string | null
  onApply: (preset: PatternPreset) => void
}

export default function PatternPresetPanel({ activePresetId, onApply }: Props) {
  // build() walks the whole path, so cache the line counts rather than recomputing them on
  // every render of the panel.
  const lineCounts = useMemo(
    () => new Map(PATTERN_PRESETS.map((p) => [p.id, presetLineCount(p)])),
    [],
  )

  return (
    <div className="flex shrink-0 flex-col gap-4 rounded-[1px] border border-line bg-bg-1 p-5">
      <div className="section-label">
        <span className="font-mono text-[0.62rem] uppercase tracking-wide-3 text-red">07 — PATTERNS</span>
      </div>

      <div className="flex flex-col gap-2">
        {PATTERN_PRESETS.map((preset) => {
          const isActive = preset.id === activePresetId
          return (
            <button
              key={preset.id}
              onClick={() => onApply(preset)}
              className={`flex flex-col gap-1 rounded-[1px] border p-3 text-left transition-colors ${
                isActive ? 'border-red bg-bg-2' : 'border-line bg-bg-2 hover:border-red'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  className={`font-mono text-[0.65rem] uppercase tracking-wide-2 ${
                    isActive ? 'text-red' : 'text-text-1'
                  }`}
                >
                  {preset.name}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {preset.colors.map((hex, i) => (
                    <span
                      key={i}
                      className="h-2 w-2 rounded-full border border-line-2"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </span>
              </span>
              <span className="font-mono text-[0.55rem] leading-relaxed text-text-2">{preset.description}</span>
              <span className="font-mono text-[0.55rem] text-text-2 opacity-70">
                {preset.pegCount} pegs · {lineCounts.get(preset.id)} lines
              </span>
            </button>
          )
        })}
      </div>

      <p className="font-mono text-[0.58rem] leading-relaxed text-text-2 opacity-70">
        Presets are drawn from their own maths, not from the image — applying one replaces the preview and
        sets the peg count and thread colours to match. Export works exactly as it does for a photo. Line
        weight doesn't apply here; changing the peg count or the thread colours clears the pattern and hands
        the preview back to the image solver.
      </p>
    </div>
  )
}
