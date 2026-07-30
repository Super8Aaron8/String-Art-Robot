import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ImageCropper from './components/ImageCropper'
import ImageAdjustmentsPanel from './components/ImageAdjustmentsPanel'
import ConfigPanel from './components/ConfigPanel'
import StepperField from './components/StepperField'
import ScrewPanel from './components/ScrewPanel'
import ColorListEditor from './components/ColorListEditor'
import PatternPresetPanel from './components/PatternPresetPanel'
import PreviewCanvas from './components/PreviewCanvas'
import { generateCircularPegs } from './lib/pegLayout'
import {
  loadImageFile,
  processImage,
  DEFAULT_TRANSFORM,
  DEFAULT_ADJUSTMENTS,
  type ProcessedImage,
  type CropTransform,
  type ImageAdjustments,
} from './lib/imageProcessing'
import { LineCache } from './lib/lineCache'
import { generateColorSequences } from './lib/stringArt'
import { buildExportBinary, downloadBinaryFile } from './lib/exportPath'
import { loadStoredConfig, saveStoredConfig } from './lib/storage'
import { newId } from './lib/id'
import { buildPatternResults, PRESET_PREVIEW_OPACITY, type PatternPreset } from './lib/patterns'
import { DEFAULT_SCREW } from './config/screw'
import type { GenerationResult, ThreadColor } from './types'

const WORKING_SIZE = 400

interface Progress {
  lineIndex: number
  lineTotal: number
}

export default function App() {
  const stored = useMemo(() => loadStoredConfig(), [])

  const [file, setFile] = useState<File | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [transform, setTransform] = useState<CropTransform>(DEFAULT_TRANSFORM)
  const [processed, setProcessed] = useState<ProcessedImage | null>(null)
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({ ...DEFAULT_ADJUSTMENTS, ...stored.adjustments })

  const [pegCount, setPegCount] = useState(stored.pegCount ?? 150)
  const [minPegDistance, setMinPegDistance] = useState(stored.minPegDistance ?? 15)
  const [lineWeight, setLineWeight] = useState(stored.lineWeight ?? 0.09)
  const [multiColor, setMultiColor] = useState(stored.multiColor ?? false)
  const [colors, setColors] = useState<ThreadColor[]>(stored.colors ?? [{ id: 'c0', hex: '#000000' }])
  const [totalLines, setTotalLines] = useState(stored.totalLines ?? 5000)
  const [screwDistance, setScrewDistance] = useState(stored.screwDistance ?? 10)
  const [screw, setScrew] = useState(stored.screw ?? DEFAULT_SCREW)
  const [slot, setSlot] = useState(stored.slot ?? 1)

  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [isStale, setIsStale] = useState(false)
  // Set while the preview holds a geometric preset rather than a solved image. Presets aren't
  // derived from any setting, so the staleness prompt and the Regenerate nudge don't apply —
  // and Regenerate would in fact throw the pattern away.
  const [activePresetId, setActivePresetId] = useState<string | null>(null)

  const generatingRef = useRef(false)
  const previewColumnRef = useRef<HTMLDivElement>(null)

  const { pegs, cx, cy, radius } = useMemo(() => generateCircularPegs(pegCount, WORKING_SIZE), [pegCount])

  const renderScrew = useMemo(() => {
    const physicalBoardRadiusMm = (pegCount * screwDistance) / (2 * Math.PI)
    const mmToPx = radius / physicalBoardRadiusMm
    return { ...screw, radius: screw.radius * mmToPx }
  }, [screw, pegCount, screwDistance, radius])

  useEffect(() => {
    if (!file) return
    loadImageFile(file).then((img) => {
      setImage(img)
      setTransform(DEFAULT_TRANSFORM)
    })
  }, [file])

  useEffect(() => {
    if (!image) return
    setProcessed(processImage(image, WORKING_SIZE, adjustments, transform))
  }, [image, adjustments, transform])

  useEffect(() => {
    saveStoredConfig({
      pegCount,
      minPegDistance,
      lineWeight,
      screwDistance,
      screw,
      adjustments,
      multiColor,
      colors,
      totalLines,
      slot,
    })
  }, [pegCount, minPegDistance, lineWeight, screwDistance, screw, adjustments, multiColor, colors, totalLines, slot])

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === previewColumnRef.current)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      previewColumnRef.current?.requestFullscreen()
    }
  }

  // Editing anything the solver consumes means the user is back to working on an image, so the
  // preset preview stops claiming ownership of the canvas. Presets change the same state, hence
  // these wrappers rather than clearing the flag inside a shared effect.
  // A preset's result is tied to its own peg ring and thread colours, so once the user edits
  // either it can't be shown or repainted — and keeping it would strand the UI on a blank
  // canvas asking for a Regenerate that's disabled whenever no image is loaded. Drop it.
  const leavePatternMode = () => {
    if (!activePresetId) return
    setActivePresetId(null)
    setResult(null)
  }

  const handlePegCountChange = (v: number) => {
    setPegCount(v)
    leavePatternMode()
  }

  const handleColorsChange = (next: ThreadColor[]) => {
    setColors(next)
    leavePatternMode()
  }

  const handleMultiColorChange = (v: boolean) => {
    leavePatternMode()
    setMultiColor(v)
    if (v && colors.length === 1) {
      setColors([colors[0], { id: newId('c'), hex: '#EF4444' }])
    } else if (!v && colors.length > 1) {
      setColors([{ ...colors[0], hex: '#000000' }])
    }
  }

  const runGenerate = useCallback(async () => {
    if (!processed || generatingRef.current) return
    generatingRef.current = true
    setGenerating(true)
    setProgress(null)
    try {
      const lineCache = new LineCache(pegs, WORKING_SIZE, renderScrew.radius)
      const results = await generateColorSequences({
        rgb: processed.rgb,
        pegs,
        lineCache,
        colors,
        totalLines,
        minPegDistance,
        lineWeight,
        onProgress: (lineIndex, lineTotal) => setProgress({ lineIndex, lineTotal }),
      })
      setResult({ pegCount, radius, results })
      setIsStale(false)
      setActivePresetId(null)
    } finally {
      generatingRef.current = false
      setGenerating(false)
      setProgress(null)
    }
  }, [processed, pegs, radius, pegCount, colors, totalLines, minPegDistance, lineWeight, renderScrew.radius])

  // Settings changes no longer trigger generation automatically — the user hits Regenerate.
  // This only flags the current preview as out of date so the button can prompt them.
  // lineWeight is intentionally excluded: it only affects preview stroke opacity live
  // (see PreviewCanvas) and the internal blend used mid-generation, neither of which
  // requires throwing away the current line sequence and re-running the solver.
  useEffect(() => {
    setIsStale(true)
  }, [processed, pegCount, minPegDistance, colors, totalLines, renderScrew.radius])

  const applyPreset = (preset: PatternPreset) => {
    const { colors: presetColors, results } = buildPatternResults(preset)
    // The preview only renders a result whose pegCount matches the board, so the board has to
    // move to the preset's ring size, not the other way round.
    setPegCount(preset.pegCount)
    setColors(presetColors)
    setMultiColor(presetColors.length > 1)
    setResult({ pegCount: preset.pegCount, radius, results })
    setActivePresetId(preset.id)
    setExportError(null)
  }

  const handleExport = () => {
    if (!result) return
    try {
      setExportError(null)
      downloadBinaryFile('string-art-path.txt', buildExportBinary(result, slot))
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err))
    }
  }

  const previewResults = result && result.pegCount === pegCount ? result.results : null
  // Applying a preset writes pegCount and colors, which trips the staleness effect above on the
  // very next render — so pattern mode suppresses the prompt outright rather than trying to
  // out-order it.
  const showStalePrompt = isStale && !!result && !generating && !activePresetId
  const generatedLineCount = result ? result.results.reduce((sum, r) => sum + r.pegs.length - 1, 0) : 0
  const progressPercent = progress ? (progress.lineIndex / progress.lineTotal) * 100 : 0

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden">
      <div className="grid-bg" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden px-5 py-4 md:grid-cols-[260px_300px_1fr] md:px-6">
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <ImageCropper
              image={image}
              size={WORKING_SIZE}
              transform={transform}
              adjustments={adjustments}
              onFile={setFile}
              onTransformChange={setTransform}
            />
            <ImageAdjustmentsPanel adjustments={adjustments} onAdjustmentsChange={setAdjustments} />
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <ConfigPanel
              pegCount={pegCount}
              minPegDistance={minPegDistance}
              lineWeight={lineWeight}
              onPegCountChange={handlePegCountChange}
              onMinPegDistanceChange={setMinPegDistance}
              onLineWeightChange={setLineWeight}
            />
            <ScrewPanel
              screw={screw}
              screwDistance={screwDistance}
              pegCount={pegCount}
              onScrewChange={setScrew}
              onScrewDistanceChange={setScrewDistance}
            />
            <ColorListEditor
              multiColor={multiColor}
              colors={colors}
              totalLines={totalLines}
              onMultiColorChange={handleMultiColorChange}
              onColorsChange={handleColorsChange}
              onTotalLinesChange={setTotalLines}
            />
            <PatternPresetPanel activePresetId={activePresetId} onApply={applyPreset} />
          </div>

          <div
            ref={previewColumnRef}
            className={`flex min-h-0 flex-col bg-bg-0 ${isFullscreen ? 'h-screen w-screen' : 'gap-3 p-0.5'}`}
          >
            <div
              className={`relative flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-1 ${
                isFullscreen ? '' : 'gap-3 rounded-[1px] border border-line p-5 shadow-panel'
              }`}
            >
              {!isFullscreen && (
                <>
                  <div className="corner-tick tl" />
                  <div className="corner-tick tr" />
                  <div className="corner-tick bl" />
                  <div className="corner-tick br" />

                  <div className="section-label shrink-0 justify-between">
                    <span className="font-mono text-[0.62rem] uppercase tracking-wide-3 text-red">06 — PREVIEW</span>
                    <button
                      onClick={toggleFullscreen}
                      className="shrink-0 rounded-[1px] border border-line-2 px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-wide-1 text-text-1 hover:border-red hover:text-red"
                    >
                      Fullscreen ⤢
                    </button>
                  </div>
                </>
              )}

              <div
                className={
                  isFullscreen
                    ? 'min-h-0 w-full flex-1 overflow-hidden'
                    : 'mx-auto aspect-square min-h-0 max-w-full flex-1 overflow-hidden rounded-[1px] border border-line-2'
                }
              >
                <PreviewCanvas
                  pegs={pegs}
                  size={WORKING_SIZE}
                  cx={cx}
                  cy={cy}
                  radius={radius}
                  results={previewResults}
                  screw={renderScrew}
                  lineWeight={activePresetId ? PRESET_PREVIEW_OPACITY : lineWeight}
                />
              </div>

              {isFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className="absolute right-4 top-4 z-10 shrink-0 rounded-[1px] border border-line-2 bg-bg-1/90 px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-wide-1 text-text-1 backdrop-blur-sm hover:border-red hover:text-red"
                >
                  Exit Fullscreen ⤡
                </button>
              )}

              {generating && (
                <div
                  className={`absolute flex flex-col items-center justify-center gap-3 bg-bg-0/75 backdrop-blur-[2px] ${
                    isFullscreen ? 'inset-0' : 'inset-5'
                  }`}
                >
                  <span className="font-mono text-[0.62rem] uppercase tracking-wide-2 text-red">Generating</span>
                  <div className="h-[2px] w-40 overflow-hidden bg-line-2">
                    <div className="h-full bg-red transition-[width]" style={{ width: `${progressPercent}%` }} />
                  </div>
                  {progress && (
                    <span className="font-mono text-[0.58rem] text-text-2">
                      line {progress.lineIndex}/{progress.lineTotal}
                    </span>
                  )}
                </div>
              )}
            </div>

            {!isFullscreen && (
              <>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => runGenerate()}
                    disabled={!processed || generating}
                    className={`flex-1 rounded-[1px] border border-red bg-red px-6 py-2.5 font-mono text-[0.72rem] uppercase tracking-wide-2 text-text-0 shadow-btn-cta transition-all hover:-translate-y-0.5 hover:bg-transparent hover:text-red hover:shadow-btn-cta-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${
                      showStalePrompt ? 'animate-pulse' : ''
                    }`}
                  >
                    {generating
                      ? 'Generating…'
                      : result && !activePresetId
                        ? isStale
                          ? 'Regenerate*'
                          : 'Regenerate'
                        : 'Generate'}
                  </button>
                  <div className="w-20 shrink-0">
                    <StepperField label="Slot" value={slot} min={1} max={8} step={1} onChange={setSlot} />
                  </div>
                  <button
                    onClick={handleExport}
                    disabled={!result}
                    className="rounded-[1px] border border-line-2 px-6 py-2.5 font-mono text-[0.72rem] uppercase tracking-wide-2 text-text-1 transition-colors hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Export .txt
                  </button>
                </div>

                {/* Fixed-height status slot: content swaps based on state, but the slot itself
                    is always rendered so toggling it doesn't reflow the flex-1 preview above. */}
                <p className={`shrink-0 font-mono text-[0.62rem] ${exportError ? 'text-red' : 'text-text-2'}`}>
                  {exportError ??
                    (showStalePrompt
                      ? 'Settings changed — preview is out of date. Click Regenerate to update it.'
                      : ' ')}
                </p>

                {result && (
                  <div className="flex shrink-0 flex-col gap-2 border-t border-line pt-3">
                    <div className="grid grid-cols-3 divide-x divide-line">
                      <Stat label="Pegs" value={result.pegCount} />
                      <Stat label="Total Lines" value={generatedLineCount} />
                      <Stat label="Colors" value={result.results.length} />
                    </div>
                    {result.results.length > 1 && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {result.results.map((r) => (
                          <span
                            key={r.color.id}
                            className="flex items-center gap-1.5 font-mono text-[0.6rem] text-text-2"
                          >
                            <span
                              className="h-2 w-2 shrink-0 rounded-full border border-line-2"
                              style={{ backgroundColor: r.color.hex }}
                            />
                            {r.pegs.length - 1} lines
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 px-4 first:pl-0">
      <span className="font-mono text-[0.58rem] uppercase tracking-wide-2 text-text-2">{label}</span>
      <span className="font-mono text-[1.1rem] text-text-0">{value}</span>
    </div>
  )
}
