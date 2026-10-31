import type { PlayerRoles } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/asset-fixtures.js'
import { makeAssetRole } from '../__tests__/asset-load-scenario.js'
import { createBattleState } from '../core/battle/battle-state.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../core/game-state.js'
import { buildFadeOut } from '../core/palette-fade.js'
import { createSeedableRng } from '../core/rng.js'
import { sceneContext, sceneMap } from './__tests__/scene-render-fixtures.js'
import { type BattleAssets, BattlePresent } from './battle/present-battle.js'
import { FRAMES_PER_CHAR, startDialogLine, tickDialog } from './dialog-box.js'
import type { SpriteImage } from './draw-sprite.js'
import { createFramebuffer } from './framebuffer.js'
import { type PresentContext, presentBattleFrame, presentFrame } from './present.js'
import { resetScreenWavePhase } from './screen-wave.js'

function holdSprite(): SpriteImage {
  return {
    width: 1,
    height: 1,
    indices: Uint8Array.of(5),
    opaque: Uint8Array.of(1),
    anchorX: 0,
    anchorY: 1,
  }
}

function holdContext(): PresentContext {
  return {
    tilemap: { width: 1, height: 1, cells: [[{ lower: 0, upper: 0 }]], tileset: 't' },
    tileImages: { get: () => undefined },
    partyFrames: [holdSprite()],
    partyWalkFrames: 3,
    npcSprites: new Map(),
  }
}

function emptyBattleAssets(): BattleAssets {
  const roles: PlayerRoles = { roles: Array.from({ length: 6 }, (_, id) => makeAssetRole(id, 1)) }
  return {
    battleSprites: new Map(),
    battleBgs: new Map(),
    playerRoles: roles,
    spells: [],
    items: [],
  }
}

describe('Frame ownership', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetScreenWavePhase()
  })
  describe('presentFrame', () => {
    // ── C3(gameOverActive 重构):死亡 hold 双分支 ──
    // deathHoldActive(T0 过渡帧):纯保持上一帧(战斗倒地帧),不画 dialog、不 fb.clear。
    // gameOverActive(0x4F 后):保持帧 + 画死亡 dialog。两者都跳过 fb.clear()+世界重绘。
    const minimalCtx = (): PresentContext => ({ ...sceneContext(sceneMap(3, 3)), partyFrames: [] })

    it('有 dialogBox → 文本绘到 fb(sdlpal upper/center/lower 无 box bg,文本即唯一证据)', () => {
      const fb = createFramebuffer()
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      // Sync.2:已 typing 完成 + fontColor=200(全屏其他像素无此色),验文本像素存在
      gs.dialogBox = startDialogLine('你好', { style: 'center', fontColor: 200 })
      // typing 完整段(2 字 × FRAMES_PER_CHAR)
      for (let i = 0; i < FRAMES_PER_CHAR * 2; i++) tickDialog(gs.dialogBox)
      const ctx: PresentContext = {
        tilemap: sceneMap(3, 3),
        tileImages: { get: () => undefined },
        partyFrames: [
          {
            width: 1,
            height: 1,
            indices: new Uint8Array([0]),
            opaque: new Uint8Array([0]),
            anchorX: 0,
            anchorY: 0,
          },
        ],
        partyWalkFrames: 3,
        npcSprites: new Map(),
      }
      presentFrame(fb, gs, ctx)
      const hasTextPx = Array.from(fb.indices).some((i) => i === 200)
      expect(hasTextPx).toBe(true)
    })

    it('dialogBoxKept + dialogBox → 上下两侧对话同屏绘制', () => {
      const fb = createFramebuffer()
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.dialogBoxKept = startDialogLine('A', { style: 'bottom', fontColor: 200 })
      gs.dialogBox = startDialogLine('B', { style: 'top', fontColor: 201 })
      for (let i = 0; i < FRAMES_PER_CHAR * 2; i++) {
        tickDialog(gs.dialogBoxKept)
        tickDialog(gs.dialogBox)
      }
      const ctx: PresentContext = {
        tilemap: sceneMap(3, 3),
        tileImages: { get: () => undefined },
        partyFrames: [
          {
            width: 1,
            height: 1,
            indices: new Uint8Array([0]),
            opaque: new Uint8Array([0]),
            anchorX: 0,
            anchorY: 0,
          },
        ],
        partyWalkFrames: 3,
        npcSprites: new Map(),
      }

      presentFrame(fb, gs, ctx)

      // The two lines must stay on their configured sides, not merely both appear somewhere.
      const top = fb.indices.subarray(0, fb.width * 100)
      const bottom = fb.indices.subarray(fb.width * 100)
      expect(top.includes(201)).toBe(true)
      expect(top.includes(200)).toBe(false)
      expect(bottom.includes(200)).toBe(true)
      expect(bottom.includes(201)).toBe(false)
    })

    it('deathHoldActive=true → 保持上一帧(不 fb.clear、不重绘世界):预写哨兵像素存活', () => {
      const fb = createFramebuffer()
      fb.indices.fill(173) // 哨兵:模拟战斗倒地帧像素(世界重绘会清成 0/tilemap)
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.deathHoldActive = true
      presentFrame(fb, gs, minimalCtx())
      expect(fb.indices).toEqual(new Uint8Array(320 * 200).fill(173)) // 哨兵存活 = 没 fb.clear()+重绘 = hold 住战斗帧
    })

    it('gameOverActive=true + dialogBox → 保持上一帧 + 画死亡对话', () => {
      const fb = createFramebuffer()
      fb.indices[0] = 173 // 战斗帧哨兵
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.gameOverActive = true
      gs.dialogBox = startDialogLine('大侠请重新来过吧', { style: 'center', fontColor: 200 })
      for (let i = 0; i < FRAMES_PER_CHAR * 8; i++) tickDialog(gs.dialogBox)
      presentFrame(fb, gs, minimalCtx())
      expect(fb.indices[0]).toBe(173) // 战斗帧 hold(未被世界重绘)
      expect(Array.from(fb.indices).some((i) => i === 200)).toBe(true) // 死亡对话画上去了
    })

    it('两者都 false(普通 explore)→ fb.clear()+正常重绘世界:哨兵被清', () => {
      const fb = createFramebuffer()
      fb.indices[0] = 173
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      // deathHoldActive/gameOverActive 都未置 → 正常重绘
      presentFrame(fb, gs, minimalCtx())
      expect(fb.indices.every((pixel) => pixel === 0)).toBe(true)
    })

    it('blackScreenHold=true → 保持全黑背景,但仍叠加居中文字', () => {
      const fb = createFramebuffer()
      fb.indices.fill(173)
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.blackScreenHold = true
      gs.dialogBox = startDialogLine('"一夜过去．．"~40', { style: 'center' })
      for (let i = 0; i < FRAMES_PER_CHAR * 6; i++) tickDialog(gs.dialogBox)

      presentFrame(fb, gs, minimalCtx())

      const pixels = Array.from(fb.indices)
      expect(fb.indices[0]).toBe(0)
      expect(pixels.includes(173)).toBe(false)
      expect(pixels.some((i) => i === 0x2d)).toBe(true)
    })

    // ── 结局 RNG 演出对话(sdlpal fPlayingRNG / op5 VIDEO_RestoreScreen):保留 RNG 动画画面,不重绘大世界 ──
    it('dialogPlayingRNG=true + rngDialogBackup → 恢复 RNG 动画画面(不重绘世界)+ 叠对话', () => {
      const fb = createFramebuffer()
      fb.indices.fill(99) // 当前帧污染:若走世界重绘会 fb.clear()→0(minimalCtx 无 tile 图)
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.dialogPlayingRNG = true
      gs.rngDialogBackup = new Uint8Array(fb.indices.length).fill(173) // 备份的 RNG 画面(哨兵 173)
      gs.dialogBox = startDialogLine('终于恢复和平的日子', { style: 'bottom', fontColor: 200 })
      for (let i = 0; i < FRAMES_PER_CHAR * 9; i++) tickDialog(gs.dialogBox)
      presentFrame(fb, gs, minimalCtx())
      const pixels = Array.from(fb.indices)
      expect(fb.indices[0]).toBe(173) // 左上角背景 = 恢复的 RNG 画面(非世界重绘成 0)
      expect(pixels.includes(99)).toBe(false) // 旧污染被 RNG backup 整幅覆盖
      expect(pixels.some((i) => i === 200)).toBe(true) // 对话文本叠加上去
    })

    it('dialogPlayingRNG=true 但无 rngDialogBackup → 退化为正常重绘(防御,不抛错)', () => {
      const fb = createFramebuffer()
      fb.indices[0] = 173
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.dialogPlayingRNG = true // 无 rngDialogBackup
      presentFrame(fb, gs, minimalCtx())
      expect(fb.indices[0]).not.toBe(173) // 无 backup → 正常重绘(哨兵被清),不卡死
    })
  })

  describe('G04-D present 冻屏归属与调色板', () => {
    it('G04-D01 suspendRaf 先于 blackScreenHold 返回，哨兵像素不被清掉', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.suspendRaf = true
      gs.blackScreenHold = true
      const fb = createFramebuffer()
      fb.indices.fill(173)
      presentFrame(fb, gs, holdContext())
      expect(fb.indices.every((pixel) => pixel === 173)).toBe(true)
    })

    it('G04-D02 sceneLoading 保留哨兵，且不把波幅 40 加上 progression', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.sceneLoading = true
      gs.wScreenWave = 40
      gs.sWaveProgression = -8
      const fb = createFramebuffer()
      fb.indices.fill(173)
      presentFrame(fb, gs, holdContext())
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
      presentFrame(fb, gs, holdContext())
      expect(fb.indices.every((pixel) => pixel === 173)).toBe(true)
      expect(gs.shakeTime).toBe(5)
      expect(gs.paletteFadeState?.freeze).toBe(true)
      expect(gs.palette.colors[100]).toEqual([78, 15, 31])
    })

    it('G04-D04 战中菜单持有 battleState 时返回 false 且不清除帧', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const battleAssets = emptyBattleAssets()
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
      expect(presentBattleFrame(fb, gs, new BattlePresent(), emptyBattleAssets(), [])).toBe(false)
      expect(fb.indices.every((pixel) => pixel === 173)).toBe(true)
    })
  })
})
