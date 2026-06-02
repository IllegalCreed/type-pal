/**
 * sdlpal nibble-dither 淡变(VIDEO_FadeScreen video.c:1130-1280 / PAL_BattleFadeScene battle.c:609-680 同算法)。
 *
 * 72 step(12 outer × 6 inner),rgIndex={0,3,1,5,2,4} 决定每 inner 处理哪条 stride-6 像素组:
 *   每 step:对该组像素 k(stride 6),a=target[k] / b=backup[k];outer>0 时把 b 的低 nibble 朝 a ±1;
 *   backup[k] = (a 高 nibble) | (b 低 nibble)。高 nibble 立即取 target,低 nibble 逐 outer 趟渐变 →
 *   平滑 dither 淡入(主角等两 buffer 都有的像素全程可见)。
 *
 * 本 helper 是**纯 step 推进**:mutate `backup`(累积逼近 target),调用方管 backup 快照 + step 计数 + 显示 backup。
 * 复用于:scene fade(present.ts gs.fadeState)+ battle intro fade(D19,present-battle)。
 */

/** rgIndex(video.c:1178 / battle.c:630):6 个 stride-6 相位偏移的处理序。 */
const RG_INDEX = [0, 3, 1, 5, 2, 4] as const

/** 总 step 数 = 12 outer × 6 inner(video.c:1178 真值)。 */
export const DITHER_TOTAL_STEPS = 72

/**
 * 应用 dither 的 [fromStep, toStep) 步,把 `backup` 朝 `target` 渐变(就地 mutate backup)。
 * target/backup 长度需一致(= 像素数)。toStep 上限 DITHER_TOTAL_STEPS。
 */
export function applyDitherSteps(
  target: Uint8Array,
  backup: Uint8Array,
  fromStep: number,
  toStep: number,
): void {
  for (let stepIdx = fromStep; stepIdx < toStep; stepIdx++) {
    const outerI = Math.floor(stepIdx / 6)
    const phaseOffset = RG_INDEX[stepIdx % 6]!
    for (let k = phaseOffset; k < target.length; k += 6) {
      const a = target[k]!
      let b = backup[k]!
      if (outerI > 0) {
        const aLow = a & 0x0f
        const bLow = b & 0x0f
        if (aLow > bLow) b++
        else if (aLow < bLow) b--
      }
      backup[k] = ((a & 0xf0) | (b & 0x0f)) & 0xff
    }
  }
}
