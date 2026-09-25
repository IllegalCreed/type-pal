import { describe, expect, it } from 'vitest'
import type { BattleAnimState } from '../../../core/battle/battle-state.js'
import { BattlePresent } from '../../battle/present-battle.js'
import { createFramebuffer } from '../../framebuffer.js'
import { resetScreenWavePhase } from '../../screen-wave.js'
import {
  battleEnemy,
  battleGs,
  battlePlayer,
  battleState,
  battleView,
  enemy,
  role,
  rolesOf,
  solidBg,
} from './fixtures/battle.js'
import {
  at,
  BG,
  digitFrames,
  image,
  SPRITE,
  SUMMON_TO,
  TILE,
  WORLD,
  yellowDigit,
} from './fixtures/images.js'
import { bitmapView } from './fixtures/world.js'

function summonAnim(step: number | undefined): BattleAnimState {
  return {
    frames: [],
    idx: 0,
    frameElapsedMs: 0,
    hasSummonFade: true,
    summon: {
      spriteKey: 'god',
      frame: 0,
      pos: { x: 300, y: 190 },
      bgColorShift: 0,
      fadeDir: 'in',
      ...(step === undefined ? {} : { fadeStep: step }),
    },
  }
}

describe('P14 战斗画面渐变与补帧', () => {
  it('P14 入场切换起点中段终点可区分，重复中段不变且伤害数字在切换之后', () => {
    const bg = solidBg(BG)
    const frames = digitFrames()
    const present = new BattlePresent()
    const gs = battleGs()
    const state = battleState([], [battleEnemy(enemy(3))])
    state.introFade = { step: 0, total: 6 }
    const pack = {
      battleSprites: new Map(),
      battleBgs: new Map([[0, bg]]),
      playerRoles: { roles: [] },
      spells: [],
      items: [],
      uiSpriteFrames: frames,
    }
    const fb = createFramebuffer()
    const commands = [
      {
        cmdId: 1,
        cmd: {
          op: 'showDamageNum' as const,
          target: { kind: 'enemy' as const, idx: 0 },
          value: 7,
          color: 'yellow' as const,
        },
      },
    ]

    const draw = (passCommands: boolean) => {
      const beforeBg = bitmapView(bg)
      const beforeFade = battleView(state)
      present.draw(fb, gs, state, passCommands ? commands : [], pack, 0)
      expect(bitmapView(bg)).toEqual(beforeBg)
      expect(battleView(state)).toEqual(beforeFade)
    }

    fb.indices.fill(WORLD)
    draw(true)
    // step 0：完成轮数 0，场景像素仍是入场前的世界色。伤害在切换之后，个位仍是黄 7。
    expect(at(fb, 0, 0)).toBe(WORLD)
    expect(at(fb, 162, 10)).toBe(WORLD)
    expect(at(fb, 160, 10)).toBe(yellowDigit(7))

    state.introFade = { step: 3, total: 6 }
    const mid = battleView(state)
    draw(false)
    expect(battleView(state)).toEqual(mid)
    // completedRounds=3。k%6=0 已换入背景，k%6=2 仍是世界色。
    expect(at(fb, 0, 0)).toBe(BG)
    expect(at(fb, 162, 10)).toBe(WORLD)
    expect(at(fb, 160, 10)).toBe(yellowDigit(7))
    const midPixel = at(fb, 162, 10)

    draw(false)
    expect(at(fb, 162, 10)).toBe(midPixel)
    expect(at(fb, 0, 0)).toBe(BG)
    expect(battleView(state).introFade).toEqual({ step: 3, total: 6 })

    state.introFade = { step: 6, total: 6 }
    draw(false)
    expect(at(fb, 0, 0)).toBe(BG)
    expect(at(fb, 162, 10)).toBe(BG)
    expect(at(fb, 160, 10)).toBe(yellowDigit(7))
  })

  it('P14 召唤crossfade高位立即换低位逐步逼近，重复终点不重开', () => {
    const bg = solidBg(WORLD)
    const god = image(1, 1, 0x77)
    const present = new BattlePresent()
    const gs = battleGs()
    const state = battleState([], [])
    state.battleAnim = summonAnim(undefined)
    const pack = {
      battleSprites: new Map([
        ['god', { frames: [{ width: 1, height: 1, indices: god.indices, opaque: god.opaque }] }],
      ]),
      battleBgs: new Map([[0, bg]]),
      playerRoles: { roles: [] },
      spells: [],
      items: [],
    }
    const fb = createFramebuffer()

    const draw = () => {
      const beforeBg = bitmapView(bg)
      const beforeGod = bitmapView(god)
      const before = battleView(state)
      present.draw(fb, gs, state, [], pack, 0)
      expect(bitmapView(bg)).toEqual(beforeBg)
      expect(bitmapView(god)).toEqual(beforeGod)
      expect(battleView(state)).toEqual(before)
    }

    fb.indices.fill(0)
    draw()
    expect(at(fb, 0, 0)).toBe(WORLD)

    bg.indices.fill(SUMMON_TO)
    state.battleAnim = summonAnim(0)
    draw()
    // 只走完相位 0：高位换成 5，低位留 3。相邻像素还没轮到，仍是上一帧。
    expect(at(fb, 0, 0)).toBe(0x53)
    expect(at(fb, 1, 0)).toBe(WORLD)

    state.battleAnim = summonAnim(6)
    draw()
    expect(at(fb, 0, 0)).toBe(0x54)
    expect(at(fb, 1, 0)).toBe(0x53)

    state.battleAnim = summonAnim(42)
    draw()
    expect(at(fb, 0, 0)).toBe(SUMMON_TO)
    expect(at(fb, 1, 0)).toBe(0x59)
    draw()
    expect(at(fb, 0, 0)).toBe(SUMMON_TO)
    expect(at(fb, 1, 0)).toBe(0x59)
    expect(state.battleAnim.summon?.fadeStep).toBe(42)
  })

  it('P14 战斗补帧不推进屏波，精灵像素留在原位', () => {
    resetScreenWavePhase()
    const bg = solidBg(BG)
    bg.indices[8 * 320 + 16] = TILE
    const body = image(1, 1, SPRITE)
    const present = new BattlePresent()
    const gs = battleGs()
    gs.wScreenWave = 128
    gs.sWaveProgression = -8
    const player = battlePlayer(0)
    const state = battleState([player], [])
    const pack = {
      battleSprites: new Map([
        [
          'player-1',
          { frames: [{ width: 1, height: 1, indices: body.indices, opaque: body.opaque }] },
        ],
      ]),
      battleBgs: new Map([[0, bg]]),
      playerRoles: rolesOf([role(0, { spriteNumInBattle: 1 })]),
      spells: [],
      items: [],
    }
    const fb = createFramebuffer()
    const draw = (advance: boolean) => {
      const beforeBg = bitmapView(bg)
      const beforeBody = bitmapView(body)
      present.draw(fb, gs, state, [], pack, 0, advance)
      expect(bitmapView(bg)).toEqual(beforeBg)
      expect(bitmapView(body)).toEqual(beforeBody)
      expect(gs.party).toEqual({ x: 0, y: 0, facing: 'down' })
    }

    draw(false)
    expect(gs.wScreenWave).toBe(128)
    expect(gs.sWaveProgression).toBe(-8)
    // 背景 (16,8) 左移 126 到 (210,8)。一人锚 (240,170)，1×1 精灵在 (240,169)，不跟波走。
    expect(at(fb, 210, 8)).toBe(TILE)
    expect(at(fb, 240, 169)).toBe(SPRITE)

    draw(false)
    expect(gs.wScreenWave).toBe(128)
    expect(at(fb, 210, 8)).toBe(TILE)
    expect(at(fb, 240, 169)).toBe(SPRITE)

    draw(true)
    expect(gs.wScreenWave).toBe(120)
    expect(gs.sWaveProgression).toBe(-8)
    expect(at(fb, 218, 8)).toBe(TILE)
    expect(at(fb, 210, 8)).not.toBe(TILE)
    expect(at(fb, 240, 169)).toBe(SPRITE)
  })
})
