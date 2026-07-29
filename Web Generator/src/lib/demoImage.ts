const DEMO_SIZE = 480
const DEMO_POINT_COUNT = 180
const DEMO_MULTIPLIER = 67

function drawDemoPattern(canvas: HTMLCanvasElement) {
  const size = canvas.width
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.44

  const points: { x: number; y: number }[] = []
  for (let i = 0; i < DEMO_POINT_COUNT; i++) {
    const angle = (i / DEMO_POINT_COUNT) * Math.PI * 2 - Math.PI / 2
    points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
  }

  ctx.strokeStyle = 'rgba(10, 13, 18, 0.55)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i < DEMO_POINT_COUNT; i++) {
    const a = points[i]
    const b = points[(i * DEMO_MULTIPLIER) % DEMO_POINT_COUNT]
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
  }
  ctx.stroke()

  ctx.strokeStyle = 'rgba(10, 13, 18, 0.7)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
}

export function generateDemoImageFile(): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = DEMO_SIZE
    canvas.height = DEMO_SIZE
    drawDemoPattern(canvas)
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to generate demo image'))
        return
      }
      resolve(new File([blob], 'demo-pattern.png', { type: 'image/png' }))
    }, 'image/png')
  })
}
