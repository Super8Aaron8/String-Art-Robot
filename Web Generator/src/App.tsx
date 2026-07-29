import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ImageCropper from './components/ImageCropper'
import ConfigPanel, { type ImageAdjustments } from './components/ConfigPanel'
import ScrewPanel from './components/ScrewPanel'
import ColorListEditor from './components/ColorListEditor'
import PreviewCanvas from './components/PreviewCanvas'
import { generateCircularPegs } from './lib/pegLayout'
import {
  loadImageFile,
  processImage,
  DEFAULT_TRANSFORM,
  type ProcessedImage,
  type CropTransform,
} from './lib/imageProcessing'
import { LineCache } from './lib/lineCache'
import { generateColorSequences } from './lib/stringArt'
import { buildExportText, downloadTextFile } from './lib/exportPath'
import { loadStoredConfig, saveStoredConfig } from './lib/storage'
import { newId } from './lib/id'
import { DEFAULT_SCREW } from './config/screw'
import type { GenerationResult, ThreadColor } from './types'

const WORKING_SIZE = 400
const REGEN_DEBOUNCE_MS = 350

interface Progress {
  colorIndex: number
  colorTotal: number
  lineIndex: number
  lineTotal: number
}

export default function App() {
  const stored = useMemo(() => loadStoredConfig(), [])

  const [file, setFile] = useState<File | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [transform, setTransform] = useState<CropTransform>(DEFAULT_TRANSFORM)
  const [processed, setProcessed] = useState<ProcessedImage | null>(null)
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(stored.adjustments ?? { contrast: 20, brightness: 0 })

  const [pegCount, setPegCount] = useState(stored.pegCount ?? 150)
  const [minPegDistance, setMinPegDistance] = useState(stored.minPegDistance ?? 15)
  const [lineWeight, setLineWeight] = useState(stored.lineWeight ?? 0.09)
  const [multiColor, setMultiColor] = useState(stored.multiColor ?? false)
  const [colors, setColors] = useState<ThreadColor[]>(stored.colors ?? [{ id: 'c0', hex: '#000000', lineCount: 5000 }])
  const [screwDistance, setScrewDistance] = useState(stored.screwDistance ?? 10)
  const [screw, setScrew] = useState(stored.screw ?? DEFAULT_SCREW)

  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const generatingRef = useRef(false)
  const pendingRegenRef = useRef(false)
  const previewColumnRef = useRef<HTMLDivElement>(null)
  const runGenerateRef = useRef<() => void>(() => {})

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
    setProcessed(processImage(image, WORKING_SIZE, adjustments.contrast, adjustments.brightness, transform))
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
    })
  }, [pegCount, minPegDistance, lineWeight, screwDistance, screw, adjustments, multiColor, colors])

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

  const handleMultiColorChange = (v: boolean) => {
    setMultiColor(v)
    if (v && colors.length === 1) {
      setColors([
        { ...colors[0], lineCount: Math.round(colors[0].lineCount * 0.6) },
        { id: newId('c'), hex: '#EF4444', lineCount: Math.round(colors[0].lineCount * 0.4) },
      ])
    } else if (!v && colors.length > 1) {
      setColors([{ ...colors[0], hex: '#000000', lineCount: 5000 }])
    }
  }

  const runGenerate = useCallback(async () => {
    if (!processed) return
    if (generatingRef.current) {
      pendingRegenRef.current = true
      return
    }
    generatingRef.current = true
    setGenerating(true)
    setProgress(null)
    try {
      const lineCache = new LineCache(pegs, WORKING_SIZE)
      const results = await generateColorSequences({
        rgb: processed.rgb,
        pegs,
        lineCache,
        colors,
        minPegDistance,
        lineWeight,
        onProgress: (colorIndex, colorTotal, lineIndex, lineTotal) =>
          setProgress({ colorIndex, colorTotal, lineIndex, lineTotal }),
      })
      setResult({ pegCount, radius, results })
    } finally {
      generatingRef.current = false
      setGenerating(false)
      setProgress(null)
      if (pendingRegenRef.current) {
        pendingRegenRef.current = false
        runGenerateRef.current()
      }
    }
  }, [processed, pegs, radius, pegCount, colors, minPegDistance, lineWeight])

  useEffect(() => {
    runGenerateRef.current = runGenerate
  }, [runGenerate])

  useEffect(() => {
    if (!processed) return
    const timeout = setTimeout(() => {
      runGenerate()
    }, REGEN_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [processed, runGenerate])

  const handleExport = () => {
    if (!result) return
    downloadTextFile('string-art-path.txt', buildExportText(result, screwDistance))
  }

  const previewResults = result && result.pegCount === pegCount ? result.results : null
  const totalLines = result ? result.results.reduce((sum, r) => sum + r.sequence.length - 1, 0) : 0
  const progressPercent = progress
    ? ((progress.colorIndex + progress.lineIndex / progress.lineTotal) / progress.colorTotal) * 100
    : 0

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden">
      <div className="grid-bg" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden px-5 py-4 md:grid-cols-[260px_300px_1fr] md:px-6">
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <div className="section-label shrink-0">
              <span className="font-mono text-[0.62rem] uppercase tracking-wide-3 text-red">01 — INPUT</span>
            </div>
            <ImageCropper
              image={image}
              size={WORKING_SIZE}
              transform={transform}
              contrast={adjustments.contrast}
              brightness={adjustments.brightness}
              onFile={setFile}
              onTransformChange={setTransform}
            />
            <ScrewPanel
              screw={screw}
              screwDistance={screwDistance}
              pegCount={pegCount}
              onScrewChange={setScrew}
              onScrewDistanceChange={setScrewDistance}
            />
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <ConfigPanel
              pegCount={pegCount}
              minPegDistance={minPegDistance}
              lineWeight={lineWeight}
              adjustments={adjustments}
              onPegCountChange={setPegCount}
              onMinPegDistanceChange={setMinPegDistance}
              onLineWeightChange={setLineWeight}
              onAdjustmentsChange={setAdjustments}
            />
            <ColorListEditor
              multiColor={multiColor}
              colors={colors}
              onMultiColorChange={handleMultiColorChange}
              onColorsChange={setColors}
            />
          </div>

          <div ref={previewColumnRef} className="flex min-h-0 flex-col gap-3 bg-bg-0 p-0.5">
            <div className="section-label shrink-0 justify-between">
              <span className="font-mono text-[0.62rem] uppercase tracking-wide-3 text-red">06 — PREVIEW</span>
              <button
                onClick={toggleFullscreen}
                className="shrink-0 rounded-[1px] border border-line-2 px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-wide-1 text-text-1 hover:border-red hover:text-red"
              >
                {isFullscreen ? 'Exit Fullscreen ⤡' : 'Fullscreen ⤢'}
              </button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1px] border border-line bg-bg-1 p-5 shadow-panel">
              <div className="corner-tick tl" />
              <div className="corner-tick tr" />
              <div className="corner-tick bl" />
              <div className="corner-tick br" />

              <div className="mx-auto aspect-square h-full max-w-full overflow-hidden rounded-[1px] border border-line-2">
                <PreviewCanvas
                  pegs={pegs}
                  size={WORKING_SIZE}
                  cx={cx}
                  cy={cy}
                  radius={radius}
                  results={previewResults}
                  screw={renderScrew}
                />
              </div>

              {generating && (
                <div className="absolute inset-5 flex flex-col items-center justify-center gap-3 bg-bg-0/75 backdrop-blur-[2px]">
                  <span className="font-mono text-[0.62rem] uppercase tracking-wide-2 text-red">Generating</span>
                  <div className="h-[2px] w-40 overflow-hidden bg-line-2">
                    <div className="h-full bg-red transition-[width]" style={{ width: `${progressPercent}%` }} />
                  </div>
                  {progress && (
                    <span className="font-mono text-[0.58rem] text-text-2">
                      color {progress.colorIndex + 1}/{progress.colorTotal} · line {progress.lineIndex}/{progress.lineTotal}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={() => runGenerate()}
                disabled={!processed || generating}
                className="flex-1 rounded-[1px] border border-red bg-red px-6 py-2.5 font-mono text-[0.72rem] uppercase tracking-wide-2 text-text-0 shadow-btn-cta transition-all hover:-translate-y-0.5 hover:bg-transparent hover:text-red hover:shadow-btn-cta-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                {generating ? 'Generating…' : 'Regenerate'}
              </button>
              <button
                onClick={handleExport}
                disabled={!result}
                className="rounded-[1px] border border-line-2 px-6 py-2.5 font-mono text-[0.72rem] uppercase tracking-wide-2 text-text-1 transition-colors hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-40"
              >
                Export .txt
              </button>
            </div>

            {result && (
              <div className="grid shrink-0 grid-cols-3 divide-x divide-line border-t border-line pt-3">
                <Stat label="Pegs" value={result.pegCount} />
                <Stat label="Total Lines" value={totalLines} />
                <Stat label="Colors" value={result.results.length} />
              </div>
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
