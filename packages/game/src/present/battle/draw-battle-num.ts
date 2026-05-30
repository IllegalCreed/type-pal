import type { IndexedImage } from '../../assets/png.js'
import type { Framebuffer } from '../framebuffer.js'
import { drawNumber, type NumColor } from '../draw-number.js'

interface FloatingNum {
  x: number
  y: number
  value: number
  color: NumColor
  startFrame: number
}

/**
 * 战斗数字弹幕层 —— 对照 sdlpal `PAL_BattleUIShowNum`(`uibattle.c:1769-1808`)+
 * `PAL_BattleUIUpdate` 的数字绘制段(`uibattle.c:1746-1764`)。
 *
 * 寿命 / 位移真值(`uibattle.c:1753-1761`,BATTLE_FRAME_TIME=40ms,`battle.h:28`):
 *   age = (now - dwTime) / BATTLE_FRAME_TIME  ∈ 每 40ms +1
 *   age > 10 → wNum=0(清除)→ **显示 age 0..10 共 11 帧**
 *   每帧绘制位置 y = pos.y - age(每帧上移 1px)
 *
 * 颜色 / 字形:`PAL_DrawNumber(wNum, 5, pos, color, kNumAlignRight)`
 *   —— UI sprite 数字帧(yellow 起 frame19 / blue 29 / cyan 56),5 位右对齐。
 *   本层走 ts 忠实 `drawNumber`(present/draw-number.ts,sdlpal `ui.c:640-732` 1:1)。
 *
 * 颜色语义(`fight.c:602-716`):blue=掉血 / yellow=回血 / cyan=回 MP。
 */
const LIFETIME_FRAMES = 11 // sdlpal:age 0..10 显示,age>10 清除 → 11 帧
const NLENGTH = 5 // sdlpal PAL_BattleUIUpdate:PAL_DrawNumber(wNum, 5, ...)

export class FloatingNumsLayer {
  private nums: FloatingNum[] = []

  emit(opts: {
    x: number
    y: number
    value: number
    color: NumColor
    currentFrame: number
  }): void {
    this.nums.push({
      x: opts.x,
      y: opts.y,
      value: opts.value,
      color: opts.color,
      startFrame: opts.currentFrame,
    })
  }

  /**
   * 画当前所有活的 floating nums(过期的先剔除)。
   *
   * @param fb             目标 framebuffer
   * @param currentFrame   当前 25fps tick 帧号(= gs.frameNum)
   * @param uiSpriteFrames SPRITEUI(DATA.MKF chunk 9)全 frame;缺则不画(防御)
   */
  draw(fb: Framebuffer, currentFrame: number, uiSpriteFrames?: IndexedImage[]): void {
    // sdlpal age>10 清除 → age ∈ [0,10] 显示;age = currentFrame - startFrame
    this.nums = this.nums.filter(n => currentFrame - n.startFrame < LIFETIME_FRAMES)
    if (!uiSpriteFrames)
      return
    for (const n of this.nums) {
      const age = currentFrame - n.startFrame
      // sdlpal `uibattle.c:1760`:y = pos.y - age(每帧上移 1px)
      drawNumber(fb, n.value, NLENGTH, { x: n.x, y: n.y - age }, n.color, 'right', uiSpriteFrames)
    }
  }

  /** 清空所有 floating nums(战斗结束时调) */
  clear(): void {
    this.nums = []
  }

  /** 测试用:看当前活的 nums 数量 */
  get count(): number {
    return this.nums.length
  }
}
