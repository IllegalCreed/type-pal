export function drawFootAlignedFrame(
  target: HTMLCanvasElement,
  source: HTMLCanvasElement | undefined,
  width: number,
  height: number,
  maxScale: number,
): void {
  const context = target.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, width, height)
  if (!source) return
  context.imageSmoothingEnabled = false
  const scale = Math.min((width - 8) / source.width, (height - 8) / source.height, maxScale)
  const drawWidth = source.width * scale
  const drawHeight = source.height * scale
  context.drawImage(source, (width - drawWidth) / 2, height - 4 - drawHeight, drawWidth, drawHeight)
}
