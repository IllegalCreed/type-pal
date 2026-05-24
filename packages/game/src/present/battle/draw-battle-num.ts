import type { Framebuffer } from '../framebuffer.js'
import { renderText, type GlyphTable } from '../font.js'

interface FloatingNum {
  x: number
  y: number
  value: number
  color: 'yellow' | 'blue'
  startFrame: number
  duration: number
}

/**
 * 数字弹幕层 —— from sdlpal `PAL_BattleUIShowNum`。
 * 受伤数字向上飘 15 帧(0.6s @ 25fps)然后消失。
 * yellow = 伤害,blue = 治疗(对照 sdlpal palette;真 palette idx 实施时 verify)。
 */
export class FloatingNumsLayer {
  private nums: FloatingNum[] = []

  emit(opts: {
    x: number
    y: number
    value: number
    color: 'yellow' | 'blue'
    currentFrame: number
  }): void {
    this.nums.push({
      x: opts.x,
      y: opts.y,
      value: opts.value,
      color: opts.color,
      startFrame: opts.currentFrame,
      duration: 15,
    })
  }

  draw(fb: Framebuffer, currentFrame: number, glyphs?: GlyphTable): void {
    // 清掉过期 nums
    this.nums = this.nums.filter((n) => currentFrame - n.startFrame < n.duration)
    for (const n of this.nums) {
      const age = currentFrame - n.startFrame
      const dy = -Math.floor(age * 1.5) // 每帧 up 1.5 px
      const text = n.value.toString()
      // M3 简版色板索引:yellow ≈ 0x0a,blue ≈ 0x10(占位 — sdlpal 真值实施时 verify by PAL_BattleUIShowNum)
      const colorIdx = n.color === 'yellow' ? 0x0a : 0x10
      renderText(fb, text, n.x, n.y + dy, colorIdx, glyphs)
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
