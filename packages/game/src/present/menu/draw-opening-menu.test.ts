import { describe, expect, it } from 'vitest'
import { createOpeningMenu } from '../../core/menu/opening-menu.js'
import type { BattleBgAsset } from '../battle/draw-battle-bg.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawOpeningMenu, openingItemX } from './draw-opening-menu.js'

// ── A4:OpeningMenu 选项 x 坐标公式(sdlpal uigame.c:107-108)──
//   x = 125 - (w > 4 ? (w-4)*8 : 0),w = PAL_WordWidth(label)。
//   shipped 真值 label = getWord(7)='新的故事' / getWord(8)='旧的回忆'(words.json flat[7/8]),都是 4 字 → w=4 → x=125。
describe('openingItemX — 选项 x 公式(uigame.c:107-108)', () => {
  it("真 label('新的故事'/'旧的回忆',各 4 字)→ w=4 → x=125(回归钉死:对 shipped 数据零变化)", () => {
    expect(openingItemX('新的故事')).toBe(125) // flat[7] 新游戏
    expect(openingItemX('旧的回忆')).toBe(125) // flat[8] 读档(真 label,非"读取存档")
  })

  it('5 字 → w=5 → x=117;6 字 → w=6 → x=109(公式对长文案左移)', () => {
    expect(openingItemX('新新新新新')).toBe(117)
    expect(openingItemX('读取上次存档')).toBe(109)
  })

  it('w<=4 不左移(8 ASCII → w=4 → x=125,非 length 8)', () => {
    expect(openingItemX('NEWGAME!')).toBe(125)
  })
})

/** 全屏 320×200 mock bg,所有像素 = 0xAB(便于验证 bg blit)。 */
function mockBg(): BattleBgAsset {
  const w = 320
  const h = 200
  const indices = new Uint8Array(w * h).fill(0xab)
  return { width: w, height: h, indices }
}

describe('drawOpeningMenu — sdlpal uigame.c:42-167 PAL_OpeningMenu 渲染', () => {
  it('320×200 全屏背景 blit — center pixel = bg.indices[center]', () => {
    const fb = createFramebuffer()
    const state = createOpeningMenu()
    drawOpeningMenu({ fb, state, bg: mockBg() })
    // 中心 (160, 100) 应该被 bg blit 写成 0xAB(无字符覆盖)
    expect(fb.indices[100 * fb.width + 160]).toBe(0xab)
  })

  it('2 个 menu item 坐标 (125,95) (125,112) 字像素被写 — 覆盖 bg', () => {
    const fb = createFramebuffer()
    const state = createOpeningMenu()
    // glyphs undefined → 画 TOFU_GLYPH(16×16 空心框,只有顶/底行 + 左/右列亮 pixel)
    drawOpeningMenu({ fb, state, bg: mockBg() })
    // 第一行字 顶边 (130, 95):TOFU bitmap b[0]=0xFF 顶行 bit 5 = 1 → fgColor 写入,非 bg
    expect(fb.indices[95 * fb.width + 130]).not.toBe(0xab)
    // 第二行字 顶边 (130, 112)
    expect(fb.indices[112 * fb.width + 130]).not.toBe(0xab)
  })

  it('bg 缺失时保留既有像素，菜单文字仍画出', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x3f)
    const state = createOpeningMenu()
    drawOpeningMenu({ fb, state })
    expect(fb.indices[100 * fb.width + 160]).toBe(0x3f)
    expect(fb.indices[95 * fb.width + 125]).not.toBe(0x3f)
  })
})
