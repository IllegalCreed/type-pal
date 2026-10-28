/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G04-D。
 * 不重复 present.test 的 deathHold/gameOver/blackScreen/RNG/fade 快照，
 * 也不重复 P12 的 advanceEffects 波幅与偶数震屏。
 */
import type { PlayerRoles } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legalPalette, legalRole } from '../__tests__/grok-render-r1/legal-host.js'
import { createBattleState } from '../core/battle/battle-state.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../core/game-state.js'
import { buildFadeOut } from '../core/palette-fade.js'
import { createSeedableRng } from '../core/rng.js'
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
import { resetScreenWavePhase } from './screen-wave.js'

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
  const roles: PlayerRoles = { roles: Array.from({ length: 6 }, (_, id) => legalRole(id, 1)) }
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
  afterEach(() => {
    vi.restoreAllMocks()
    resetScreenWavePhase()
  })

  it('G04-D01 suspendRaf 先于 blackScreenHold 返回，哨兵像素不被清掉', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.suspendRaf = true
    gs.blackScreenHold = true
    const fb = createFramebuffer()
    fb.indices.fill(173)
    presentFrame(fb, gs, ctx())
    expect(fb.indices.every((pixel) => pixel === 173)).toBe(true)
  })

  it('G04-D02 sceneLoading 保留哨兵，且不把波幅 40 加上 progression', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.sceneLoading = true
    gs.wScreenWave = 40
    gs.sWaveProgression = -8
    const fb = createFramebuffer()
    fb.indices.fill(173)
    presentFrame(fb, gs, ctx())
    expect(fb.indices.every((pixel) => pixel === 173)).toBe(true)
    expect(gs.wScreenWave).toBe(40)
    expect(gs.sWaveProgression).toBe(-8)
  })

  it('G04-D03 paletteFade freeze 保留哨兵，且不递减 shakeTime', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    vi.spyOn(performance, 'now').mockReturnValue(100)
    const palette = legalPalette()
    gs.palette = palette
    gs.paletteFadeState = buildFadeOut(palette.colors, 600, 0)
    gs.shakeTime = 5
    gs.shakeLevel = 4
    const fb = createFramebuffer()
    fb.indices.fill(173)
    presentFrame(fb, gs, ctx())
    expect(fb.indices.every((pixel) => pixel === 173)).toBe(true)
    expect(gs.shakeTime).toBe(5)
    expect(gs.paletteFadeState?.freeze).toBe(true)
    expect(gs.palette.colors[100]).toEqual([78, 15, 31])
  })

  it('G04-D04 战中菜单持有 battleState 时返回 false 且不清除帧', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const battleAssets = assets()
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, battleAssets.playerRoles)
    gs.battleState = createBattleState({
      gs,
      playerRoles: battleAssets.playerRoles,
      enemies: [null],
      field: {
        id: 0,
        screenWave: 0,
        magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
      isBoss: false,
      rng: createSeedableRng(1),
    })
    const activeBattle = gs.battleState
    gs.mode = 'menu'
    const fb = createFramebuffer()
    fb.indices.fill(173)
    expect(presentBattleFrame(fb, gs, new BattlePresent(), battleAssets, [])).toBe(false)
    expect(fb.indices.every((pixel) => pixel === 173)).toBe(true)
    expect(gs.battleState).toBe(activeBattle)
  })

  it('G04-D05 mode=battle 但没有 battleState 时返回 false 且不清除哨兵', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'battle'
    const fb = createFramebuffer()
    fb.indices.fill(173)
    expect(presentBattleFrame(fb, gs, new BattlePresent(), assets(), [])).toBe(false)
    expect(fb.indices.every((pixel) => pixel === 173)).toBe(true)
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

  it('G04-D08 flushToCanvas 按原点写入完整异色 RGBA，保留边界和索引缓冲', () => {
    const fb = createFramebuffer(3, 2)
    fb.indices.set([0, 9, 2, 3, 0, 4])
    const palette = legalPalette((colors) => {
      colors[0] = [1, 2, 3]
      colors[9] = [10, 20, 30]
      colors[2] = [40, 50, 60]
      colors[3] = [70, 80, 90]
      colors[4] = [100, 110, 120]
    })
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 3
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) throw new Error('2d context unavailable')
    flushToCanvas(fb, ctx2d, palette)
    expect(Array.from(ctx2d.getImageData(0, 0, 3, 2).data)).toEqual([
      1, 2, 3, 255, 10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 1, 2, 3, 255, 100, 110, 120,
      255,
    ])
    expect(Array.from(ctx2d.getImageData(3, 0, 1, 1).data)).toEqual([0, 0, 0, 0])
    expect(Array.from(ctx2d.getImageData(0, 2, 1, 1).data)).toEqual([0, 0, 0, 0])
    expect(Array.from(fb.indices)).toEqual([0, 9, 2, 3, 0, 4])
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
