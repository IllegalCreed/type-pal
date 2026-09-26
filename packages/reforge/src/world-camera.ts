import { type GridPos, gridToPixel } from '@type-pal/content'
import type { SceneViewBounds } from './active-scene.js'
import { asyncIntentAbortError } from './async-intent.js'

interface Pan {
  fromX: number
  fromY: number
  dx: number
  dy: number
  steps: number
  done: number
  resolve(): void
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)
const VIEW_W = 320
const VIEW_H = 200
const PARTY_OX = 160
const PARTY_OY = 112

/** Owns camera motion only. Read live player/bounds at each update, never capture a scene. */
export class WorldCamera {
  readonly position = { x: 0, y: 0 }
  private readonly displacement = { x: 0, y: 0 }
  private panFx: Pan | null = null

  constructor(
    private readonly playerPosition: () => GridPos,
    private readonly sceneBounds: () => SceneViewBounds,
  ) {}

  get offset(): Readonly<{ x: number; y: number }> {
    return this.displacement
  }

  update(): void {
    const pp = gridToPixel(this.playerPosition())
    const bounds = this.sceneBounds()
    this.position.x = clamp(
      pp.x - PARTY_OX + this.displacement.x,
      bounds.minX,
      Math.max(bounds.minX, bounds.maxX - VIEW_W),
    )
    this.position.y = clamp(
      pp.y - PARTY_OY + this.displacement.y,
      bounds.minY,
      Math.max(bounds.minY, bounds.maxY - VIEW_H),
    )
  }

  pan(dx: number, dy: number, frames: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) throw asyncIntentAbortError('相机移动所属 runner 已取消')
      let settled = false
      const entry: Pan = {
        fromX: this.displacement.x,
        fromY: this.displacement.y,
        dx,
        dy,
        steps: frames,
        done: 0,
        resolve: (): void => {
          if (settled) return
          settled = true
          signal.removeEventListener('abort', abort)
          if (this.panFx === entry) this.panFx = null
          resolve()
        },
      }
      const abort = (): void => {
        if (settled) return
        settled = true
        if (this.panFx === entry) this.panFx = null
        signal.removeEventListener('abort', abort)
        reject(asyncIntentAbortError('相机移动所属 runner 已取消'))
      }
      this.panFx?.resolve()
      this.panFx = entry
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) abort()
    })
  }

  snap(to?: GridPos): void {
    if (to) {
      const tp = gridToPixel(to),
        pp = gridToPixel(this.playerPosition())
      this.displacement.x = tp.x - pp.x
      this.displacement.y = tp.y - pp.y
    } else {
      this.displacement.x = 0
      this.displacement.y = 0
    }
    this.update()
  }

  advance(dt: number): void {
    if (!this.panFx) return
    const fx = this.panFx
    fx.done = Math.min(fx.steps, fx.done + Math.max(1, Math.round(dt / 16)))
    this.displacement.x = fx.fromX + fx.dx * fx.done
    this.displacement.y = fx.fromY + fx.dy * fx.done
    this.update()
    if (fx.done >= fx.steps) {
      this.panFx = null
      fx.resolve()
    }
  }

  /** Settlement and offset reset only; the host retains the original next-update timing. */
  reset(): void {
    this.panFx?.resolve()
    this.panFx = null
    this.displacement.x = 0
    this.displacement.y = 0
  }
}
