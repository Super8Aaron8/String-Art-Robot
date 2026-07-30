export interface ProcessedImage {
  size: number
  rgb: Float32Array
  previewUrl: string
}

export interface CropTransform {
  zoom: number
  offsetX: number
  offsetY: number
}

export interface ImageAdjustments {
  contrast: number
  brightness: number
  saturation: number
  gamma: number
  blur: number
  invert: boolean
  grayscale: boolean
}

export const DEFAULT_TRANSFORM: CropTransform = { zoom: 1, offsetX: 0, offsetY: 0 }

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  contrast: 20,
  brightness: 0,
  saturation: 0,
  gamma: 1,
  blur: 0,
  invert: false,
  grayscale: false,
}

export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export function drawTransformedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  size: number,
  transform: CropTransform,
  blur = 0,
) {
  const baseScale = Math.max(size / img.width, size / img.height)
  const scale = baseScale * transform.zoom
  const drawW = img.width * scale
  const drawH = img.height * scale
  const x = (size - drawW) / 2 + transform.offsetX
  const y = (size - drawH) / 2 + transform.offsetY

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  ctx.filter = blur > 0 ? `blur(${blur}px)` : 'none'
  ctx.drawImage(img, x, y, drawW, drawH)
  ctx.filter = 'none'
}

export function applyImageAdjustments(ctx: CanvasRenderingContext2D, size: number, adjustments: ImageAdjustments) {
  const { contrast, brightness, saturation, gamma, invert, grayscale } = adjustments
  if (contrast === 0 && brightness === 0 && saturation === 0 && gamma === 1 && !invert && !grayscale) return

  const imageData = ctx.getImageData(0, 0, size, size)
  const { data } = imageData
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  const satFactor = 1 + saturation / 100
  const gammaExp = 1 / Math.max(0.05, gamma)

  const apply = (v: number) => {
    let x = v
    if (gammaExp !== 1) x = 255 * Math.pow(x / 255, gammaExp)
    x = contrastFactor * (x - 128) + 128 + brightness
    if (invert) x = 255 - x
    return Math.min(255, Math.max(0, x))
  }

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    let rs = r
    let gs = g
    let bs = b
    if (grayscale) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      rs = gs = bs = lum
    } else if (satFactor !== 1) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      rs = lum + (r - lum) * satFactor
      gs = lum + (g - lum) * satFactor
      bs = lum + (b - lum) * satFactor
    }

    data[i] = apply(rs)
    data[i + 1] = apply(gs)
    data[i + 2] = apply(bs)
  }

  ctx.putImageData(imageData, 0, 0)
}

export function drawAdjustedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  size: number,
  transform: CropTransform,
  adjustments: ImageAdjustments,
) {
  drawTransformedImage(ctx, img, size, transform, adjustments.blur)
  applyImageAdjustments(ctx, size, adjustments)
}

export function processImage(
  img: HTMLImageElement,
  size: number,
  adjustments: ImageAdjustments,
  transform: CropTransform,
): ProcessedImage {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  drawAdjustedImage(ctx, img, size, transform, adjustments)

  const imageData = ctx.getImageData(0, 0, size, size)
  const { data } = imageData
  const rgb = new Float32Array(size * size * 3)

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    rgb[p * 3] = data[i] / 255
    rgb[p * 3 + 1] = data[i + 1] / 255
    rgb[p * 3 + 2] = data[i + 2] / 255
  }

  return { size, rgb, previewUrl: canvas.toDataURL() }
}
