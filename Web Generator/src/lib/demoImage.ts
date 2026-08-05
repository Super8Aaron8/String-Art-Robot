const DEMO_SIZE = 480

function drawDemoFace(canvas: HTMLCanvasElement) {
  const size = canvas.width
  const ctx = canvas.getContext('2d')!
  const cx = size / 2

  const bg = ctx.createLinearGradient(0, 0, size, size)
  bg.addColorStop(0, '#f2f2f0')
  bg.addColorStop(1, '#dcdcd8')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)

  const headCy = size * 0.44
  const headRx = size * 0.24
  const headRy = size * 0.3

  ctx.fillStyle = '#33302c'
  ctx.beginPath()
  ctx.moveTo(cx - size * 0.32, size)
  ctx.quadraticCurveTo(cx - size * 0.28, size * 0.82, cx - headRx * 0.5, size * 0.72)
  ctx.lineTo(cx + headRx * 0.5, size * 0.72)
  ctx.quadraticCurveTo(cx + size * 0.28, size * 0.82, cx + size * 0.32, size)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#c9a98c'
  ctx.beginPath()
  ctx.moveTo(cx - headRx * 0.42, headCy + headRy * 0.55)
  ctx.lineTo(cx - headRx * 0.38, size * 0.78)
  ctx.lineTo(cx + headRx * 0.38, size * 0.78)
  ctx.lineTo(cx + headRx * 0.42, headCy + headRy * 0.55)
  ctx.closePath()
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, headCy, headRx, headRy, 0, 0, Math.PI * 2)
  ctx.clip()
  const skin = ctx.createRadialGradient(
    cx - headRx * 0.4,
    headCy - headRy * 0.5,
    headRx * 0.2,
    cx,
    headCy,
    headRx * 1.6,
  )
  skin.addColorStop(0, '#e8c9a8')
  skin.addColorStop(0.55, '#caa17d')
  skin.addColorStop(1, '#8f6b4d')
  ctx.fillStyle = skin
  ctx.fillRect(cx - headRx, headCy - headRy, headRx * 2, headRy * 2)
  ctx.restore()

  ctx.strokeStyle = 'rgba(40, 30, 20, 0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(cx, headCy, headRx, headRy, 0, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = '#2b2118'
  ctx.beginPath()
  ctx.moveTo(cx - headRx * 1.02, headCy - headRy * 0.1)
  ctx.quadraticCurveTo(cx - headRx * 1.1, headCy - headRy * 1.25, cx, headCy - headRy * 1.35)
  ctx.quadraticCurveTo(cx + headRx * 1.1, headCy - headRy * 1.25, cx + headRx * 1.02, headCy - headRy * 0.1)
  ctx.quadraticCurveTo(cx + headRx * 0.9, headCy - headRy * 0.55, cx + headRx * 0.55, headCy - headRy * 0.75)
  ctx.quadraticCurveTo(cx, headCy - headRy * 0.95, cx - headRx * 0.55, headCy - headRy * 0.75)
  ctx.quadraticCurveTo(cx - headRx * 0.9, headCy - headRy * 0.55, cx - headRx * 1.02, headCy - headRy * 0.1)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = '#2b2118'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  const browY = headCy - headRy * 0.12
  ;[-1, 1].forEach((side) => {
    ctx.beginPath()
    ctx.moveTo(cx + side * headRx * 0.16, browY + 4)
    ctx.quadraticCurveTo(cx + side * headRx * 0.35, browY - 10, cx + side * headRx * 0.52, browY + 2)
    ctx.stroke()
  })

  ;[-1, 1].forEach((side) => {
    const ex = cx + side * headRx * 0.36
    const ey = headCy + headRy * 0.02
    ctx.fillStyle = '#f5f0e8'
    ctx.beginPath()
    ctx.ellipse(ex, ey, headRx * 0.16, headRy * 0.09, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(40, 30, 20, 0.7)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#3d2a1a'
    ctx.beginPath()
    ctx.arc(ex, ey, headRy * 0.075, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(ex, ey, headRy * 0.035, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.beginPath()
    ctx.arc(ex - headRy * 0.02, ey - headRy * 0.02, headRy * 0.014, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.strokeStyle = 'rgba(90, 60, 35, 0.6)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - headRx * 0.05, headCy + headRy * 0.02)
  ctx.quadraticCurveTo(cx - headRx * 0.12, headCy + headRy * 0.32, cx - headRx * 0.09, headCy + headRy * 0.4)
  ctx.quadraticCurveTo(cx, headCy + headRy * 0.46, cx + headRx * 0.09, headCy + headRy * 0.4)
  ctx.stroke()

  ctx.strokeStyle = '#7a3b34'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - headRx * 0.22, headCy + headRy * 0.62)
  ctx.quadraticCurveTo(cx, headCy + headRy * 0.7, cx + headRx * 0.22, headCy + headRy * 0.62)
  ctx.stroke()
  ctx.fillStyle = 'rgba(122, 59, 52, 0.35)'
  ctx.beginPath()
  ctx.moveTo(cx - headRx * 0.2, headCy + headRy * 0.64)
  ctx.quadraticCurveTo(cx, headCy + headRy * 0.74, cx + headRx * 0.2, headCy + headRy * 0.64)
  ctx.quadraticCurveTo(cx, headCy + headRy * 0.68, cx - headRx * 0.2, headCy + headRy * 0.64)
  ctx.fill()
}

export function generateDemoImageFile(): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = DEMO_SIZE
    canvas.height = DEMO_SIZE
    drawDemoFace(canvas)
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to generate demo image'))
        return
      }
      resolve(new File([blob], 'demo-face.png', { type: 'image/png' }))
    }, 'image/png')
  })
}
