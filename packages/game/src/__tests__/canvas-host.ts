/** Fresh real Canvas host for pixel tests; the caller owns the canvas through its context. */
export function realCanvasContext(width = 320, height = 200): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Pixel test requires a real 2D Canvas context')
  return context
}
