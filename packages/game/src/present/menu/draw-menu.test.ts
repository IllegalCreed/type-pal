import { describe, expect, it } from 'vitest'
import type { IndexedImage } from '../../assets/png.js'
import { createInitialGameState } from '../../core/game-state.js'
import { createInGameMenu, createSystemMenu } from '../../core/menu/in-game-menu.js'
import { openMenu } from '../../core/menu/menu-mode.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawMenuStack } from './draw-menu.js'

/**
 * mockUiFrames:18 个 9-slice frame + frame 44/45/46(SingleLineBox left/mid/right)。
 * 每 tile 8×8 全 opaque,palette idx = k+1(避开 0)。
 */
function mockUiFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let k = 0; k < 47; k++) {
    const w = 8,
      h = 8
    const indices = new Uint8Array(w * h).fill((k % 250) + 1)
    const opaque = new Uint8Array(w * h).fill(1)
    frames.push({ width: w, height: h, indices, opaque })
  }
  return frames
}

describe('M5.6 v2 drawMenuStack(sdlpal 真值坐标)', () => {
  it('menuStack 空 → 不画', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    drawMenuStack(fb, gs, mockUiFrames())
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })

  it('In-Game hub → 主菜单 box 在 sdlpal 真值 (3, 37) + cash 框在 (0, 0)', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    drawMenuStack(fb, gs, mockUiFrames())
    // sdlpal uigame.c:990 PAL_CreateBox(PAL_XY(3, 37), 3, ...):box 左上角 = (3, 37) tile = 9-slice corner frame 0(idx 1)
    expect(fb.indices[37 * fb.width + 3]).toBe(1)
    // cash box (0,0):SingleLineBox frame 44 (idx 45) 左 corner
    expect(fb.indices[0 * fb.width + 0]).toBe(45)
  })

  it('System menu → box 在 sdlpal 真值 (40, 60)', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'system', state: createSystemMenu() })
    drawMenuStack(fb, gs, mockUiFrames())
    // sdlpal uigame.c:559 PAL_CreateBox(PAL_XY(40, 60), ...)
    expect(fb.indices[60 * fb.width + 40]).toBe(1)
  })

  it('C2-quit:system phase=confirm → 叠确认框(130,100)/(205,100);menu 阶段不画', () => {
    // menu 阶段:确认框位置无 SingleLineBox corner
    const fbMenu = createFramebuffer()
    const gsMenu = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gsMenu, { kind: 'system', state: createSystemMenu() })
    drawMenuStack(fbMenu, gsMenu, mockUiFrames())
    expect(fbMenu.indices[100 * fbMenu.width + 130]).not.toBe(45)

    // confirm 阶段:(130,100) 否框 + (205,100) 是框 corner = SingleLineBox frame 44(idx 45)
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const sys = createSystemMenu()
    sys.phase = 'confirm'
    openMenu(gs, { kind: 'system', state: sys })
    drawMenuStack(fb, gs, mockUiFrames())
    expect(fb.indices[100 * fb.width + 130]).toBe(45) // 否框左 corner
    expect(fb.indices[100 * fb.width + 205]).toBe(45) // 是框左 corner
  })

  it('两层栈(in-game + system) → 都画 + cash 框在 in-game 时画', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'system', state: createSystemMenu() })
    drawMenuStack(fb, gs, mockUiFrames())
    expect(fb.indices[37 * fb.width + 3]).toBe(1) // in-game box
    expect(fb.indices[60 * fb.width + 40]).toBe(1) // system box
    expect(fb.indices[0]).toBe(45) // cash box left corner
  })

  it('uiSpriteFrames 不足 → drawSingleLineBox 先抛 frame 44-46 missing', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    expect(() => drawMenuStack(fb, gs, [])).toThrow(/uiSpriteFrames\[44\.\.46\]/)
  })
})
