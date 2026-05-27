import { describe, it, expect } from 'vitest'
import { createFramebuffer } from '../framebuffer.js'
import type { IndexedImage } from '../../assets/png.js'
import { createInitialGameState } from '../../core/game-state.js'
import { createInGameMenu, createSystemMenu } from '../../core/menu/in-game-menu.js'
import { openMenu } from '../../core/menu/menu-mode.js'
import { drawMenuStack } from './draw-menu.js'

function mockUiFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let k = 0; k < 18; k++) {
    const w = 8, h = 8
    const indices = new Uint8Array(w * h).fill(k + 1)
    const opaque = new Uint8Array(w * h).fill(1)
    frames.push({ width: w, height: h, indices, opaque })
  }
  return frames
}

describe('M5.6 W0.d drawMenuStack', () => {
  it('menuStack 空 → 不画(framebuffer 全 0)', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    drawMenuStack(fb, gs, mockUiFrames())
    // 全 0(framebuffer 默认全 0,clear 不调)
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })

  it('In-Game hub → 画 box 在 (57, 60),box 左上角 = frame 0 idx 1', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    drawMenuStack(fb, gs, mockUiFrames())
    // box 左上角 corner tile = frame 0 idx 1(uigame.c:953 pos = (57, 60))
    expect(fb.indices[60 * fb.width + 57]).toBe(1)
  })

  it('两层栈(in-game + system) → 都画', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'system', state: createSystemMenu() })
    drawMenuStack(fb, gs, mockUiFrames())
    // In-Game box 在 (57, 60)
    expect(fb.indices[60 * fb.width + 57]).toBe(1)
    // System box 在 (130, 60)
    expect(fb.indices[60 * fb.width + 130]).toBe(1)
  })

  it('uiSpriteFrames 不足 → drawBox 抛错(向调用者透传 — 缺资产应早期暴露)', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    expect(() => drawMenuStack(fb, gs, [])).toThrow(/uiSpriteFrames\[0\] missing/)
  })
})
