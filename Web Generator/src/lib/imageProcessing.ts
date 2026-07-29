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

export const DEFAULT_TRANSFORM: CropTransform = { zoom: 1, offsetX: 0, offsetY: 0 }

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
) {
  const baseScale = Math.max(size / img.width, size / img.height)
  const scale = baseScale * transform.zoom
  const drawW = img.width * scale
  const drawH = img.height * scale
  const x = (size - drawW) / 2 + transform.offsetX
  const y = (size - drawH) / 2 + transform.offsetY

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(img, x, y, drawW, drawH)
}

export function applyContrastBrightness(ctx: CanvasRenderingContext2D, size: number, contrast: number, brightness: number) {
  if (contrast === 0 && brightness === 0) return

  const imageData = ctx.getImageData(0, 0, size, size)
  const { data } = imageData
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast))

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, contrastFactor * (data[i] - 128) + 128 + brightness))
    data[i + 1] = Math.min(255, Math.max(0, contrastFactor * (data[i + 1] - 128) + 128 + brightness))
    data[i + 2] = Math.min(255, Math.max(0, contrastFactor * (data[i + 2] - 128) + 128 + brightness))
  }

  ctx.putImageData(imageData, 0, 0)
}

export function drawAdjustedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  size: number,
  transform: CropTransform,
  contrast: number,
  brightness: number,
) {
  drawTransformedImage(ctx, img, size, transform)
  applyContrastBrightness(ctx, size, contrast, brightness)
}

export function processImage(
  img: HTMLImageElement,
  size: number,
  contrast: number,
  brightness: number,
  transform: CropTransform,
): ProcessedImage {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  drawAdjustedImage(ctx, img, size, transform, contrast, brightness)

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
