import { drawWaveRows, WAVE_PHASES } from './wave-distortion.js'

// The current amplitude and signed progression follow the saved script state.
// Only a world beat advances the amplitude and the renderer's unsaved phase.
/**
 * 逻辑拍推进(scene.c:389-398):W += 推进量;补帧传 advance=false 时只读当前值。
 * 原地改 vars(随存档 = 存的是衰减后的当前值,一阶段 gs.wScreenWave 同语义)。
 * 返回推进后的波幅(0 = 本帧不卷)。
 */
export function advanceWave(vars: Record<string, number>, advance = true): number {
  // 渲染补帧只重画当前波形，不推进逻辑状态；推进由世界拍门控。
  if (!advance) {
    const current = vars['sys:screenWave'] ?? 0
    return current > 0 && current < 256 ? current : 0
  }
  const w = (vars['sys:screenWave'] ?? 0) + (vars['sys:waveProgression'] ?? 0)
  if (w === 0 || w >= 256) {
    if (vars['sys:screenWave'] !== undefined || w !== 0) {
      vars['sys:screenWave'] = 0
      vars['sys:waveProgression'] = 0
    }
    return 0
  }
  vars['sys:screenWave'] = w
  return w
}

/** 行卷渲染器(持相位计数;世界层合成到离屏后按行搬到主 ctx)。 */
export class WorldWaveRenderer {
  private waveIndex = 0

  /** 把 src(已按 worldScale 合成的世界层)逐行左卷画到 ctx；逻辑拍才推进相位。 */
  apply(
    ctx: CanvasRenderingContext2D,
    src: HTMLCanvasElement,
    w: number,
    worldScale: number,
    advancePhase = true,
  ): void {
    ctx.save()
    ctx.imageSmoothingEnabled = false
    drawWaveRows(ctx, src, w, this.waveIndex, worldScale)
    if (advancePhase) this.waveIndex = (this.waveIndex + 1) % WAVE_PHASES
    ctx.restore()
  }
}
