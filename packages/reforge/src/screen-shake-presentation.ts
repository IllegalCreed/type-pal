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

  /** Called once per world tick or once per cinematic frame. Repaints hold the same offset. */
  advance(): void {
    if (this.remainingFrames <= 0) {
      this.offset = 0
      return
    }
    this.offset = this.remainingFrames % 2 === 1 ? -this.level : this.level
    this.remainingFrames--
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
