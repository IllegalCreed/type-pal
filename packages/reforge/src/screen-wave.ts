/**
 * 0x71 世界屏波(仙灵岛水面/蛤蟆谷水下氛围)—— 一阶段 present/screen-wave.ts 1:1 移植,
 * 索引帧缓冲版改 canvas 行卷版(reforge 无索引 fb):
 *   · 32 相位偏移表(scene.c:404-417):a/b 递推 a=0,b=68;16 次 b−=8,a+=b;
 *     wave[i] = trunc(a×W/256);wave[i+16] = 320 − wave[i](镜像凑满 32 相位)。
 *   · 逐逻辑行(200 行)左卷**环绕**(scene.c:423-449);每行相位 = (index+row)%32,index 每帧 +1。
 *   · 波幅每帧 += 推进量(SHORT 可负 = 渐弱);==0 或 ≥256 → 关闭并双清零(scene.c:391-398)。
 * 状态存 world.script.vars('sys:screenWave' / 'sys:waveProgression'):脚本 0x71 设,
 * 随存档;相位计数是纯视觉节拍,不入档(一阶段 s_waveIndex 同为模块态)。
 */

export const WAVE_SCREEN_W = 320
export const WAVE_SCREEN_H = 200

/** 32 相位偏移表(波幅 w 下每相位的左卷像素数)。 */
export function waveTable(w: number): number[] {
  const wave = new Array<number>(32)
  let a = 0
  let b = 60 + 8
  for (let i = 0; i < 16; i++) {
    b -= 8
    a += b
    wave[i] = Math.trunc((a * w) / 256)
    wave[i + 16] = WAVE_SCREEN_W - (wave[i] ?? 0)
  }
  return wave
}

/**
 * 每帧推进(scene.c:389-398):W += 推进量;==0 或 ≥256 → 双清零关闭。
 * 原地改 vars(随存档 = 存的是衰减后的当前值,一阶段 gs.wScreenWave 同语义)。
 * 返回推进后的波幅(0 = 本帧不卷)。
 */
export function advanceWave(vars: Record<string, number>): number {
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

  /** 把 src(已按 worldScale 合成的世界层)逐行左卷画到 ctx;每调一次相位 +1。 */
  apply(
    ctx: CanvasRenderingContext2D,
    src: HTMLCanvasElement,
    w: number,
    worldScale: number,
  ): void {
    const wave = waveTable(w)
    const devW = WAVE_SCREEN_W * worldScale
    let ai = this.waveIndex
    for (let y = 0; y < WAVE_SCREEN_H; y++) {
      const shift = wave[ai] ?? 0
      const sy = y * worldScale
      if (shift > 0 && shift < WAVE_SCREEN_W) {
        const sw = shift * worldScale
        // 左卷环绕:行右部(shift..320)画到行首,行左部(0..shift)卷到行尾
        ctx.drawImage(src, sw, sy, devW - sw, worldScale, 0, sy, devW - sw, worldScale)
        ctx.drawImage(src, 0, sy, sw, worldScale, devW - sw, sy, sw, worldScale)
      } else {
        ctx.drawImage(src, 0, sy, devW, worldScale, 0, sy, devW, worldScale)
      }
      ai = (ai + 1) % 32
    }
    this.waveIndex = (this.waveIndex + 1) % 32
  }
}
