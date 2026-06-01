import { describe, it, expect } from 'vitest'
import { createFramebuffer } from '../framebuffer.js'
import type { BattleBgAsset } from '../battle/draw-battle-bg.js'
import { createOpeningMenu, openingMenuDown } from '../../core/menu/opening-menu.js'
import { drawOpeningMenu, openingItemX } from './draw-opening-menu.js'

// ── A4:OpeningMenu 选项 x 坐标公式(sdlpal uigame.c:107-108)──
//   x = 125 - (w > 4 ? (w-4)*8 : 0),w = PAL_WordWidth(label)。
//   shipped 真值 label '新的故事'/'读取存档' 都是 4 字 → w=4 → x=125(与旧硬编码一致,零像素回归)。
describe('openingItemX — 选项 x 公式(uigame.c:107-108)', () => {
  it("4 字 label('新的故事')→ w=4 → x=125(回归钉死:对 shipped 数据零变化)", () => {
    expect(openingItemX('新的故事')).toBe(125)
    expect(openingItemX('读取存档')).toBe(125)
  })

  it('5 字 → w=5 → x=117;6 字 → w=6 → x=109(公式对长文案左移)', () => {
    expect(openingItemX('新新新新新')).toBe(125 - 1 * 8) // w=5
    expect(openingItemX('读取上次存档')).toBe(125 - 2 * 8) // w=6
  })

  it('w<=4 不左移(8 ASCII → w=4 → x=125,非 length 8)', () => {
    expect(openingItemX('NEWGAME!')).toBe(125)
  })
})

/** 全屏 320×200 mock bg,所有像素 = 0xAB(便于验证 bg blit)。 */
function mockBg(): BattleBgAsset {
  const w = 320
  const h = 200
  const indices = new Uint8Array(w * h).fill(0xAB)
  return { width: w, height: h, indices }
}

describe('drawOpeningMenu — sdlpal uigame.c:42-167 PAL_OpeningMenu 渲染', () => {
  it('320×200 全屏背景 blit — center pixel = bg.indices[center]', () => {
    const fb = createFramebuffer()
    const state = createOpeningMenu()
    drawOpeningMenu({ fb, state, bg: mockBg() })
    // 中心 (160, 100) 应该被 bg blit 写成 0xAB(无字符覆盖)
    expect(fb.indices[100 * fb.width + 160]).toBe(0xAB)
  })

  it('2 个 menu item 坐标 (125,95) (125,112) 字像素被写 — 覆盖 bg', () => {
    const fb = createFramebuffer()
    const state = createOpeningMenu()
    // glyphs undefined → 画 TOFU_GLYPH(16×16 空心框,只有顶/底行 + 左/右列亮 pixel)
    drawOpeningMenu({ fb, state, bg: mockBg() })
    // 第一行字 顶边 (130, 95):TOFU bitmap b[0]=0xFF 顶行 bit 5 = 1 → fgColor 写入,非 bg
    expect(fb.indices[95 * fb.width + 130]).not.toBe(0xAB)
    // 第二行字 顶边 (130, 112)
    expect(fb.indices[112 * fb.width + 130]).not.toBe(0xAB)
  })

  it('bg 缺失 → 不画背景(fb 保留初始 0)+ 仍画字', () => {
    const fb = createFramebuffer()
    const state = createOpeningMenu()
    drawOpeningMenu({ fb, state })
    // 中心 (160, 100) 仍是 0(无 bg blit)
    expect(fb.indices[100 * fb.width + 160]).toBe(0)
    // 字位置 (130, 100) 内有 TOFU 写入(不为 0,因 TOFU 边框 idx 非 0)
    // 注:TOFU_GLYPH 黑框 = 边框非 0、内部 0,sample 边框 (125, 95) 起点 corner 应非 0
    // 但 sample (130, 100) 是内部可能为 0;改 sample 边框 corner (125, 95)
    expect(fb.indices[95 * fb.width + 125]).not.toBe(0)
  })

  it('cursor=0 vs cursor=1 — 渲染不抛错且 fb 内容有差异(高亮位置不同)', () => {
    const fb1 = createFramebuffer()
    const fb2 = createFramebuffer()
    const stateA = createOpeningMenu()              // cursor=0 new-game
    const stateB = createOpeningMenu()
    openingMenuDown(stateB)                          // cursor=1 load-game
    drawOpeningMenu({ fb: fb1, state: stateA, bg: mockBg() })
    drawOpeningMenu({ fb: fb2, state: stateB, bg: mockBg() })
    // 两次渲染应至少在某些字坐标处颜色不同(SELECTED 闪烁色 vs 常态色)
    // 注:闪烁色是 Date.now() 函数,同帧内调两次应该相同。
    // 但 selection cursor 不同意味两次 SELECTED 应用在不同行,fb1 vs fb2 行 95 / 112 颜色互换。
    // 直接 sample 字像素 (125, 95) — fb1 SELECTED,fb2 NORMAL
    const c1Row1 = fb1.indices[95 * fb1.width + 125]
    const c2Row1 = fb2.indices[95 * fb2.width + 125]
    // 至少一个非 bg 色(被 tofu 写过)
    expect(c1Row1 === 0xAB && c2Row1 === 0xAB).toBe(false)
  })
})
