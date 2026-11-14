import { asyncIntentAbortError } from '../async-intent.js'
import { expectDefined } from '../defined.js'
import { scriptWorkWait } from '../script-work-queue.js'

// PAL_BattleMain waits 200ms, then VIDEO_SwitchScreen(5) replaces six pixel bands at 60ms each.
const SOURCE_HOLD_MS = 200
const BAND_MS = 60
const BAND_ORDER = [0, 3, 1, 5, 2, 4] as const

/** Owns the two canvas frames from battle launch through the final reveal band. */
export class BattleEntryPresentation {
  private readonly pixels: Uint32Array
  private reveal?: {
    drawTarget: () => void
    complete: () => void
    fail: (reason: unknown) => void
    startedAt?: number
    target?: Uint32Array
    bands: number
  }

  constructor(
    private readonly frame: ImageData,
    private readonly pixelScale: number,
    private readonly startedAt: number,
    private readonly signal: AbortSignal,
  ) {
    this.pixels = pixels32(frame)
  }

  show(drawTarget: () => void): Promise<void> {
    return scriptWorkWait<void>(this.signal, (resolve, reject) => {
      const finish = () => {
        this.reveal = undefined
        this.signal.removeEventListener('abort', abort)
      }
      const fail = (reason: unknown) => {
        finish()
        reject(reason)
      }
      const abort = () => fail(asyncIntentAbortError('战斗入场已取消'))
      this.reveal = {
        drawTarget,
        complete: () => {
          finish()
          resolve()
        },
        fail,
        bands: 0,
      }
      this.signal.addEventListener('abort', abort, { once: true })
      if (this.signal.aborted) abort()
    })
  }

  cancel(): void {
    this.reveal?.fail(asyncIntentAbortError('战斗入场已取消'))
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    const reveal = this.reveal
    if (reveal && now - this.startedAt >= SOURCE_HOLD_MS) {
      if (!reveal.target) {
        try {
          reveal.drawTarget()
          reveal.target = pixels32(ctx.getImageData(0, 0, this.frame.width, this.frame.height))
          reveal.startedAt = now
        } catch (error) {
          reveal.fail(error)
          ctx.putImageData(this.frame, 0, 0)
          return
        }
      }
      const elapsed = now - expectDefined(reveal.startedAt)
      const count = Math.min(BAND_ORDER.length, 1 + Math.floor(elapsed / BAND_MS))
      while (reveal.bands < count) {
        const band = expectDefined(BAND_ORDER[reveal.bands])
        this.replaceBand(reveal.target, band)
        reveal.bands++
      }
      ctx.putImageData(this.frame, 0, 0)
      if (elapsed >= BAND_ORDER.length * BAND_MS) reveal.complete()
      return
    }
    ctx.putImageData(this.frame, 0, 0)
  }

  private replaceBand(target: Uint32Array, band: number): void {
    const { width, height } = this.frame
    const scale = this.pixelScale
    const logicalWidth = Math.ceil(width / scale)
    for (let y = 0; y < height; y++) {
      // Replace whole logical pixels, including all their physical rows and columns.
      const rowPhase = (Math.floor(y / scale) * logicalWidth) % BAND_ORDER.length
      const first = (band - rowPhase + BAND_ORDER.length) % BAND_ORDER.length
      for (let x = first * scale; x < width; x += BAND_ORDER.length * scale) {
        const start = y * width + x
        const end = start + Math.min(scale, width - x)
        this.pixels.set(target.subarray(start, end), start)
      }
    }
  }
}

function pixels32(image: ImageData): Uint32Array {
  return new Uint32Array(image.data.buffer, image.data.byteOffset, image.data.length / 4)
}
