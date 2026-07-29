import { useEffect, useRef, useState } from 'react'
import { drawAdjustedImage, type CropTransform } from '../lib/imageProcessing'
import { generateDemoImageFile } from '../lib/demoImage'
import StepperField from './StepperField'

const ZOOM_MIN = 0.3
const ZOOM_MAX = 2.5

interface Props {
  image: HTMLImageElement | null
  size: number
  transform: CropTransform
  contrast: number
  brightness: number
  onFile: (file: File) => void
  onTransformChange: (t: CropTransform) => void
}

export default function ImageCropper({ image, size, transform, contrast, brightness, onFile, onTransformChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawAdjustedImage(ctx, image, size, transform, contrast, brightness)

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, size, size)
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fillStyle = 'rgba(10, 13, 18, 0.6)'
    ctx.fill('evenodd')
    ctx.restore()

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
    ctx.stroke()
  }, [image, size, transform, contrast, brightness])

  const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

  const handleWheel = (e: React.WheelEvent) => {
    if (!image) return
    e.preventDefault()
    onTransformChange({ ...transform, zoom: clampZoom(transform.zoom - e.deltaY * 0.0015) })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!image) return
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, offsetX: transform.offsetX, offsetY: transform.offsetY }
  }

  useEffect(() => {
    if (!dragging) return
    const canvas = canvasRef.current
    const ratio = canvas ? size / canvas.getBoundingClientRect().width : 1

    const handleMove = (e: MouseEvent) => {
      const start = dragStart.current
      if (!start) return
      onTransformChange({
        ...transform,
        offsetX: start.offsetX + (e.clientX - start.x) * ratio,
        offsetY: start.offsetY + (e.clientY - start.y) * ratio,
      })
    }
    const handleUp = () => setDragging(false)

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, size, transform])

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file && file.type.startsWith('image/')) onFile(file)
  }

  const openPicker = () => inputRef.current?.click()

  const loadDemo = (e: React.MouseEvent) => {
    e.stopPropagation()
    generateDemoImageFile().then(onFile)
  }

  const fileInput = (
    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
  )

  if (!image) {
    return (
      <div
        onClick={openPicker}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFiles(e.dataTransfer.files)
        }}
        className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-[1px] border border-line-2 bg-bg-1 transition-colors hover:border-red"
      >
        <div className="flex flex-col items-center gap-2 px-6 text-center">
          <span className="font-mono text-[0.7rem] uppercase tracking-wide-2 text-text-2">
            Drop image, or click to browse
          </span>
          <span className="font-mono text-[0.58rem] uppercase tracking-wide-1 text-text-2 opacity-60">
            PNG · JPG · WEBP
          </span>
          <button
            onClick={loadDemo}
            className="mt-1 font-mono text-[0.58rem] uppercase tracking-wide-1 text-text-2 underline decoration-dotted underline-offset-4 hover:text-red"
          >
            Try a demo pattern
          </button>
        </div>
        {fileInput}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-[1px] border border-line bg-bg-1 p-4">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        className={`w-full rounded-[1px] border border-line-2 bg-bg-2 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      />
      <span className="font-mono text-[0.56rem] uppercase tracking-wide-1 text-text-2 opacity-60">
        Drag to reposition · scroll to zoom · zoom below 1.00x extends past the image edge
      </span>
      <div className="flex items-end gap-3">
        <StepperField
          label="Zoom"
          value={transform.zoom}
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.05}
          format={(v) => `${v.toFixed(2)}x`}
          onChange={(v) => onTransformChange({ ...transform, zoom: clampZoom(v) })}
        />
        <button
          onClick={() => onTransformChange({ zoom: 1, offsetX: 0, offsetY: 0 })}
          className="h-[34px] shrink-0 rounded-[1px] border border-line-2 px-3 font-mono text-[0.6rem] uppercase tracking-wide-1 text-text-1 hover:border-red hover:text-red"
        >
          Reset
        </button>
        <button
          onClick={openPicker}
          className="h-[34px] shrink-0 rounded-[1px] border border-line-2 px-3 font-mono text-[0.6rem] uppercase tracking-wide-1 text-text-1 hover:border-red hover:text-red"
        >
          Change
        </button>
      </div>
      {fileInput}
    </div>
  )
}
