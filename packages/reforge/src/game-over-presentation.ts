import { expectDefined } from './defined.js'

const RED_STEP_MS = 75
const RED_STEPS = 32
export const GAME_OVER_FADE_MS = RED_STEP_MS * RED_STEPS

function tintFrame(source: ImageData, output: ImageData, step: number): void {
  const original = source.data
  const tinted = output.data
  const change = step * 8
  for (let i = 0; i < original.length; i += 4) {
    const r = original[i] ?? 0
    const g = original[i + 1] ?? 0
    const b = original[i + 2] ?? 0
    const red = Math.trunc((r + g + b) / 4) + 64
    tinted[i] = r > red ? Math.max(red, r - change) : Math.min(red, r + change)
    tinted[i + 1] = Math.max(0, g - change)
    tinted[i + 2] = Math.max(0, b - change)
    tinted[i + 3] = original[i + 3] ?? 0
  }
}

/** Keep the last presented frame and tint only when a CLASSIC palette step changes. */
export class GameOverPresentation {
  private frame?: {
    owner: AbortSignal
    source: ImageData
    output: ImageData
    layer: CanvasRenderingContext2D
    startedAtMs?: number
    step: number
  }

  hold(ctx: CanvasRenderingContext2D, owner: AbortSignal): void {
    const { width, height, ownerDocument } = ctx.canvas
    const source = ctx.getImageData(0, 0, width, height)
    const canvas = ownerDocument.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const layer = expectDefined(canvas.getContext('2d'))
    layer.putImageData(source, 0, 0)
    this.frame = { owner, source, output: layer.createImageData(width, height), layer, step: 0 }
  }

  begin(ctx: CanvasRenderingContext2D, owner: AbortSignal, nowMs: number): void {
    if (this.frame?.owner !== owner) this.hold(ctx, owner)
    expectDefined(this.frame).startedAtMs = nowMs
  }

  draw(ctx: CanvasRenderingContext2D, nowMs: number): boolean {
    const frame = this.frame
    if (!frame) return false
    if (frame.startedAtMs !== undefined) {
      // palette.c:623–665: apply the first of 32 steps before the first 75ms wait.
      const step = Math.min(
        RED_STEPS,
        1 + Math.trunc(Math.max(0, nowMs - frame.startedAtMs) / RED_STEP_MS),
      )
      if (step !== frame.step) {
        tintFrame(frame.source, frame.output, step)
        frame.layer.putImageData(frame.output, 0, 0)
        frame.step = step
      }
    }
    ctx.save()
    ctx.globalCompositeOperation = 'copy'
    ctx.drawImage(frame.layer.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.restore()
    return true
  }

  release(owner: AbortSignal): void {
    if (this.frame?.owner === owner) this.frame = undefined
  }
}
