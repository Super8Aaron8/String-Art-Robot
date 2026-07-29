import { useEffect, useMemo, useRef, useState } from 'react'
import type { ColorResult, Peg } from '../types'
import type { ScrewConfig } from '../config/screw'
import { shadeHex } from '../lib/color'

interface Props {
  pegs: Peg[]
  size: number
  cx: number
  cy: number
  radius: number
  results: ColorResult[] | null
  screw: ScrewConfig
  lineWeight: number
}

interface View {
  x: number
  y: number
  w: number
  h: number
}

const MAX_ZOOM = 10

function contactPoint(from: Peg, to: Peg, screwRadius: number): { x: number; y: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  return { x: from.x + (dx / dist) * screwRadius, y: from.y + (dy / dist) * screwRadius }
}

interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
}

function buildSegments(pegs: Peg[], sequence: number[], screwRadius: number): Segment[] {
  if (sequence.length < 2 || sequence.some((idx) => idx >= pegs.length)) return []
  const segments: Segment[] = []
  for (let i = 0; i < sequence.length - 1; i++) {
    const a = pegs[sequence[i]]
    const b = pegs[sequence[i + 1]]
    const start = contactPoint(a, b, screwRadius)
    const end = contactPoint(b, a, screwRadius)
    segments.push({ x1: start.x, y1: start.y, x2: end.x, y2: end.y })
  }
  return segments
}

function Screw({ peg, radius }: { peg: Peg; radius: number }) {
  return (
    <circle
      cx={peg.x}
      cy={peg.y}
      r={radius}
      fill="url(#screwGradient)"
      stroke="rgba(0,0,0,0.4)"
      strokeWidth={0.25}
    />
  )
}

export default function PreviewCanvas({ pegs, size, cx, cy, radius, results, screw, lineWeight }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>({ x: 0, y: 0, w: size, h: size })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ x: number; y: number; viewX: number; viewY: number; ratio: number } | null>(null)

  useEffect(() => {
    setView({ x: 0, y: 0, w: size, h: size })
  }, [size])

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
  const isZoomed = view.w < size - 0.01

  const colorLines = useMemo(
    () =>
      results?.map((colorResult) => ({
        id: colorResult.color.id,
        hex: colorResult.color.hex,
        segments: buildSegments(pegs, colorResult.sequence, screw.radius),
      })) ?? [],
    [results, pegs, screw.radius],
  )

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    const my = clamp((e.clientY - rect.top) / rect.height, 0, 1)

    setView((v) => {
      const zoomFactor = Math.exp(-e.deltaY * 0.0015)
      const newW = clamp(v.w / zoomFactor, size / MAX_ZOOM, size)
      const pointX = v.x + mx * v.w
      const pointY = v.y + my * v.h
      const newX = clamp(pointX - mx * newW, 0, size - newW)
      const newY = clamp(pointY - my * newW, 0, size - newW)
      return { x: newX, y: newY, w: newW, h: newW }
    })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, viewX: view.x, viewY: view.y, ratio: view.w / rect.width }
  }

  useEffect(() => {
    if (!dragging) return
    let rafId: number | null = null
    let pending: { x: number; y: number } | null = null

    const applyPending = () => {
      rafId = null
      const start = dragStart.current
      if (!start || !pending) return
      const ev = pending
      setView((v) => ({
        ...v,
        x: clamp(start.viewX - (ev.x - start.x) * start.ratio, 0, size - v.w),
        y: clamp(start.viewY - (ev.y - start.y) * start.ratio, 0, size - v.h),
      }))
    }

    const handleMove = (e: MouseEvent) => {
      pending = { x: e.clientX, y: e.clientY }
      if (rafId === null) rafId = requestAnimationFrame(applyPending)
    }
    const handleUp = () => setDragging(false)

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [dragging, size])

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        width={size}
        height={size}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        className={`block h-full w-full ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <defs>
          <radialGradient id="screwGradient" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="40%" stopColor={screw.color} />
            <stop offset="100%" stopColor={shadeHex(screw.color, -0.32)} />
          </radialGradient>
        </defs>

        <rect x={0} y={0} width={size} height={size} fill="#ffffff" />

        {colorLines.map((c) => (
          <g key={c.id} stroke={c.hex} strokeWidth={0.3} strokeOpacity={lineWeight} strokeLinecap="round">
            {c.segments.map((s, i) => (
              <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
            ))}
          </g>
        ))}

        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={1} />
        {pegs.map((peg) => (
          <Screw key={peg.index} peg={peg} radius={screw.radius} />
        ))}
      </svg>

      {isZoomed && (
        <button
          onClick={() => setView({ x: 0, y: 0, w: size, h: size })}
          className="absolute bottom-2 right-2 rounded-[1px] border border-line-2 bg-bg-1/90 px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-wide-1 text-text-1 backdrop-blur-sm hover:border-red hover:text-red"
        >
          Reset View
        </button>
      )}
    </div>
  )
}
