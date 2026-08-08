import { useState } from 'react'
import StepperField from './StepperField'
import { BOARD_PEG_COUNT, PATTERN_CATEGORIES, PATTERN_PRESETS, type PatternParams, type PatternPreset } from '../lib/patterns'

interface Props {
  activePreset: PatternPreset | null
  params: PatternParams
  pegCount: number
  lineCount: number
  blocker: string | null
  onApply: (preset: PatternPreset) => void
  onParamChange: (key: string, value: number) => void
  onClear: () => void
}

export default function PatternPresetPanel({
  activePreset,
  params,
  pegCount,
  lineCount,
  blocker,
  onApply,
  onParamChange,
  onClear,
}: Props) {
  // Each category is a collapsible folder — with ~30 presets across seven categories, an
  // all-expanded list buries the panel. Starts with just the active preset's folder open (or
  // none, if the preview isn't holding a preset yet) rather than tracking activePreset changes
  // live, so opening a different folder to browse doesn't get yanked shut mid-browse.
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() =>
    activePreset ? { [activePreset.category]: true } : {},
  )
  const toggleCategory = (category: string) =>
    setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-[1px] border border-line bg-bg-1 p-5">
      <div className="section-label shrink-0">
        <span className="font-mono text-[0.62rem] uppercase tracking-wide-3 text-red">07 — PATTERNS</span>
      </div>

      <div className="flex flex-col gap-3">
        {PATTERN_CATEGORIES.map((category) => {
          const presets = PATTERN_PRESETS.filter((preset) => preset.category === category)
          if (presets.length === 0) return null
          const isOpen = openCategories[category] ?? false
          const hasActive = presets.some((p) => p.id === activePreset?.id)
          return (
            <div key={category} className="flex flex-col gap-2">
              <button
                onClick={() => toggleCategory(category)}
                className={`flex items-center justify-between gap-2 rounded-[1px] border px-3 py-2 text-left transition-colors ${
                  hasActive ? 'border-red/50 bg-bg-2' : 'border-line bg-bg-2 hover:border-red'
                }`}
              >
                <span
                  className={`font-mono text-[0.58rem] uppercase tracking-wide-2 ${
                    hasActive ? 'text-red' : 'text-text-1'
                  }`}
                >
                  {category}
                </span>
                <span className="flex shrink-0 items-center gap-2 font-mono text-[0.55rem] text-text-2 opacity-70">
                  {presets.length}
                  <span className="text-text-2">{isOpen ? '−' : '+'}</span>
                </span>
              </button>
              {isOpen &&
                presets.map((preset) => {
                  const isActive = preset.id === activePreset?.id
                  return (
                    <div key={preset.id} className="flex flex-col">
                      <button
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
                        <span className="font-mono text-[0.55rem] leading-relaxed text-text-2">
                          {preset.description}
                        </span>
                      </button>

                      {/* Knobs live under the active preset so the numbers sit next to the thing they
                          change — the pattern redraws on every edit. */}
                      {isActive && (
                        <div className="flex flex-col gap-3 border border-t-0 border-red bg-bg-2/50 p-3">
                          <div className="grid grid-cols-2 gap-3">
                            {preset.params.map((param) => (
                              <StepperField
                                key={param.key}
                                label={param.label}
                                value={params[param.key] ?? param.default}
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                onChange={(v) => onParamChange(param.key, v)}
                              />
                            ))}
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[0.55rem] text-text-2 opacity-70">
                              {pegCount} pegs · {lineCount} lines
                            </span>
                            <button
                              onClick={onClear}
                              className="shrink-0 rounded-[1px] border border-line-2 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-wide-1 text-text-1 hover:border-red hover:text-red"
                            >
                              Clear
                            </button>
                          </div>

                          {blocker && (
                            <span className="font-mono text-[0.55rem] leading-relaxed text-red">{blocker}</span>
                          )}

                          {/* The pattern still draws at any ring, but the defaults were chosen against
                              the board — worth saying so rather than letting it just look off. */}
                          {pegCount !== BOARD_PEG_COUNT && (
                            <span className="font-mono text-[0.55rem] leading-relaxed text-text-2">
                              Defaults are tuned for the {BOARD_PEG_COUNT}-pin board; the board is at {pegCount}.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )
        })}
      </div>

      <p className="font-mono text-[0.58rem] leading-relaxed text-text-2 opacity-70">
        Presets are drawn from their own maths, not from the image, and are tuned for the {BOARD_PEG_COUNT}-pin
        board. Applying one leaves the peg count alone; while one is active the board's peg count, the thread
        colours, and Line Weight all drive it live — move any of them and the pattern redraws. Clear, or
        generate from an image, to hand the preview back to the solver.
      </p>
    </div>
  )
}
