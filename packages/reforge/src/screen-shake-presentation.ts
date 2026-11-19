/** 0x35 is a signed vertical offset on the presented frame. */
export class ScreenShakePresentation {
  private remainingFrames = 0
  private level = 0
  private offset = 0

  start(frames: number, level: number): void {
    this.remainingFrames = frames
    this.level = level || 4
    this.offset = 0
  }

  /** Advance by the number of world, cinematic or dither steps rendered. */
  advance(steps = 1): void {
    const displayed = this.remainingFrames - steps + 1
    this.offset = displayed > 0 ? (displayed % 2 === 1 ? -this.level : this.level) : 0
    this.remainingFrames = Math.max(0, displayed - 1)
  }

  clearOffset(): void {
    this.offset = 0
  }

  apply(context: CanvasRenderingContext2D, scale: number): void {
    const canvas = context.canvas
    const shift = this.offset * scale
    if (shift === 0 || Math.abs(shift) >= canvas.height) return
    context.save()
    context.drawImage(canvas, 0, shift)
    context.fillStyle = '#000'
    context.fillRect(0, shift > 0 ? 0 : canvas.height + shift, canvas.width, Math.abs(shift))
    context.restore()
  }
}
