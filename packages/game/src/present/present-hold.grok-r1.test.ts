/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G04-D。
 * 不重复 present.test 的 deathHold/gameOver/blackScreen/RNG/fade 快照，
 * 也不重复 P12 的 advanceEffects 波幅与偶数震屏。
 */
import type { PlayerRoles } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dumpFramebuffer } from '../__tests__/grok-render-r1/dump-evidence.js'
import { legalPalette, legalRole } from '../__tests__/grok-render-r1/legal-host.js'
import { createInitialGameState } from '../core/game-state.js'
import { buildFadeOut } from '../core/palette-fade.js'
import { type BattleAssets, BattlePresent } from './battle/present-battle.js'
import { setWaitingEndKey, startDialogLine } from './dialog-box.js'
import type { SpriteImage } from './draw-sprite.js'
import { createFramebuffer } from './framebuffer.js'
import {
  applyDialogIconPaletteShift,
  flushToCanvas,
  type PresentContext,
  presentBattleFrame,
  presentFrame,
} from './present.js'

function sprite(): SpriteImage {
  return {
    width: 1,
    height: 1,
    indices: Uint8Array.of(5),
    opaque: Uint8Array.of(1),
    anchorX: 0,
    anchorY: 1,
  }
}

function ctx(): PresentContext {
  return {
    tilemap: { width: 1, height: 1, cells: [[{ lower: 0, upper: 0 }]], tileset: 't' },
    tileImages: { get: () => undefined },
    partyFrames: [sprite()],
    partyWalkFrames: 3,
    npcSprites: new Map(),
  }
}

function assets(): BattleAssets {
  const roles: PlayerRoles = { roles: [legalRole(0, 1)] }
  return {
    battleSprites: new Map(),
    battleBgs: new Map(),
    playerRoles: roles,
    spells: [],
    items: [],
  }
}

function ramp(channel: 0 | 1): { colors: Array<[number, number, number]>; cycles: [] } {
  return {
    colors: Array.from({ length: 256 }, (_, index) => {
      const color: [number, number, number] = [0, 0, 0]
      color[channel] = index
      return color
    }),
    cycles: [],
  }
}

describe('G04-D present 冻屏归属与调色板', () => {
  afterEach(() => vi.restoreAllMocks())

  it('G04-D01 suspendRaf 先于 blackScreenHold 返回，哨兵像素不被清掉', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.suspendRaf = true
    gs.blackScreenHold = true
    const fb = createFramebuffer()
    fb.indices[0] = 173
    presentFrame(fb, gs, ctx())
    expect(fb.indices[0]).toBe(173)
  })

  it('G04-D02 sceneLoading 保留哨兵，且不把波幅 40 加上 progression', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.sceneLoading = true
    gs.wScreenWave = 40
    gs.sWaveProgression = -8
    const fb = createFramebuffer()
    fb.indices[0] = 173
    presentFrame(fb, gs, ctx())
    expect(fb.indices[0]).toBe(173)
    expect(gs.wScreenWave).toBe(40)
    expect(gs.sWaveProgression).toBe(-8)
  })

  it('G04-D03 paletteFade freeze 保留哨兵，且不递减 shakeTime', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const palette = legalPalette()
    gs.palette = palette
    gs.paletteFadeState = buildFadeOut(palette.colors, 10_000_000, performance.now())
    gs.shakeTime = 5
    gs.shakeLevel = 4
    const fb = createFramebuffer()
    fb.indices[0] = 173
    presentFrame(fb, gs, ctx())
    expect(fb.indices[0]).toBe(173)
    expect(gs.shakeTime).toBe(5)
    expect(gs.paletteFadeState?.freeze).toBe(true)
  })

  it('G04-D04 非战斗模式 presentBattleFrame 返回 false 且不清除哨兵', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const fb = createFramebuffer()
    fb.indices[0] = 173
    expect(presentBattleFrame(fb, gs, new BattlePresent(), assets(), [])).toBe(false)
    expect(fb.indices[0]).toBe(173)
  })

  it('G04-D05 mode=battle 但没有 battleState 时返回 false 且不清除哨兵', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'battle'
    const fb = createFramebuffer()
    fb.indices[0] = 173
    expect(presentBattleFrame(fb, gs, new BattlePresent(), assets(), [])).toBe(false)
    expect(fb.indices[0]).toBe(173)
  })

  it('G04-D06 center 等键在 step 1 仍返回同一调色板引用', () => {
    vi.spyOn(performance, 'now').mockReturnValue(100)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dialogBox = startDialogLine('A', { style: 'center' })
    setWaitingEndKey(gs.dialogBox)
    const base = legalPalette()
    expect(applyDialogIconPaletteShift(gs, base)).toBe(base)
  })

  it('G04-D07 黑屏 center 等键恢复文字色，但不轮转 0xF9', () => {
    vi.spyOn(performance, 'now').mockReturnValue(100)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.blackScreenHold = true
    gs.basePalette = ramp(0)
    gs.dialogBox = startDialogLine('A', { style: 'center' })
    setWaitingEndKey(gs.dialogBox)
    const out = applyDialogIconPaletteShift(gs, ramp(1))
    expect(out.colors[0x2d]).toEqual([0x2d, 0, 0])
    expect(out.colors[0xf9]).toEqual([0, 0xf9, 0])
    expect(out.colors[0xfe]).toEqual([0, 0xfe, 0])
  })

  it('G04-D08 flushToCanvas 把索引 9 写成画布上的 RGBA，索引缓冲仍保留 9', async () => {
    const fb = createFramebuffer()
    fb.writePixel(4, 6, 9)
    const palette = legalPalette((colors) => {
      colors[9] = [10, 20, 30]
    })
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 200
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) throw new Error('2d context unavailable')
    flushToCanvas(fb, ctx2d, palette)
    expect(Array.from(ctx2d.getImageData(4, 6, 1, 1).data)).toEqual([10, 20, 30, 255])
    expect(fb.indices[6 * 320 + 4]).toBe(9)
    const snap = ctx2d.getImageData(0, 0, 320, 200)
    await dumpFramebuffer('G04-D08', 320, 200, snap.data, [{ x: 4, y: 6, rgba: [10, 20, 30, 255] }])
  })

  it('G04-D09 writePixel(300) 截成 44，toImageData 读的是 44 号色', () => {
    const fb = createFramebuffer()
    fb.writePixel(2, 1, 300)
    expect(fb.indices[320 + 2]).toBe(44)
    const palette = legalPalette((colors) => {
      colors[44] = [7, 8, 9]
    })
    const image = fb.toImageData(palette)
    expect(Array.from(image.data.slice((320 + 2) * 4, (320 + 2) * 4 + 4))).toEqual([7, 8, 9, 255])
  })
})
