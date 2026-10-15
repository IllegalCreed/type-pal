import type { PlayerRole } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../../core/game-state.js'
import { createPlayerStatus } from '../../core/menu/player-status.js'
import { setWordTable } from '../../core/word-lookup.js'
import * as fontModule from '../font.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawPlayerStatus } from './draw-player-status.js'

// 最小 PlayerRole(drawPlayerStatus 读 avatar/equipment/name 等;装备全 0 → 装备行 skip;
//   stat 走 getPlayerXxx 读 gs.PlayerRolesRuntime,缺省 ?? 0 不崩)。
function minimalRole(id: number): PlayerRole {
  return {
    id,
    _name: 'r',
    name: 0,
    avatar: 0,
    level: 1,
    hp: 10,
    maxHP: 10,
    mp: 5,
    maxMP: 5,
    attackStrength: 1,
    magicStrength: 1,
    defense: 1,
    dexterity: 1,
    fleeRate: 1,
    poisonResistance: 0,
    equipment: [0, 0, 0, 0, 0, 0],
    magic: [],
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    coveredBy: 0,
    cooperativeMagic: 0,
    attackAll: 0,
    walkFrames: 0,
    spriteNum: 0,
    spriteNumInBattle: 0,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
  }
}

// C6:PlayerStatus 毒 row(sdlpal uigame.c:1245-1253)— rgPoisonStatus 的 wPoisonID,
//   poison.level<=3 才显示,名 getWord(wPoisonID),色 wColor+10,位置 RolePoisonNames[j](185,58+j*18)。
describe('drawPlayerStatus 毒 row(uigame.c:1245-1253)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    setWordTable([])
  })

  function run(opts: {
    id: number
    level: number
    color: number
    slot?: number
  }): ReturnType<typeof vi.spyOn> {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.rgPoisonStatus[`${opts.slot ?? 0}_0`] = { wPoisonID: opts.id, wPoisonScript: 0 }
    const objectPoisons = new Map([[opts.id, { level: opts.level, color: opts.color }]])
    const flat: string[] = []
    flat[opts.id] = '蛊毒'
    setWordTable(flat)
    const spy = vi.spyOn(fontModule, 'renderText')
    drawPlayerStatus({
      fb: createFramebuffer(),
      state: createPlayerStatus([0]),
      gs,
      playerRoles: { roles: [minimalRole(0)] },
      items: [],
      uiSpriteFrames: [],
      objectPoisons,
    })
    return spy
  }

  it('level<=3 → 毒名画在 (185,58),色 = wColor+10', () => {
    const spy = run({ id: 100, level: 2, color: 30 })
    // renderText(fb, text, x, y, color, glyphs, shadow)
    const call = spy.mock.calls.find((c: unknown[]) => c[2] === 185 && c[3] === 58)
    expect(call).toBeDefined()
    expect(call![1]).toBe('蛊毒') // getWord(100)
    expect(call![4]).toBe(40) // wColor 30 + 10
    expect(call![6]).toBe(true) // fShadow=TRUE
  })

  it('level>3(高级/装备毒哨兵)→ 不画', () => {
    const spy = run({ id: 100, level: 99, color: 30 })
    expect(spy.mock.calls.find((c: unknown[]) => c[2] === 185 && c[3] === 58)).toBeUndefined()
  })

  it('wPoisonID=0(无毒槽)→ 不画', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const spy = vi.spyOn(fontModule, 'renderText')
    drawPlayerStatus({
      fb: createFramebuffer(),
      state: createPlayerStatus([0]),
      gs,
      playerRoles: { roles: [minimalRole(0)] },
      items: [],
      uiSpriteFrames: [],
      objectPoisons: new Map(),
    })
    expect(spy.mock.calls.find((c: unknown[]) => c[2] === 185 && c[3] === 58)).toBeUndefined()
  })

  it('重复角色队伍：状态页 cursor 2 不复用首个同角色队员的毒槽', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [4, 5, 4]
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 100, wPoisonScript: 0 }
    const words: string[] = []
    words[100] = '蛊毒'
    setWordTable(words)
    const state = createPlayerStatus(gs.partyMembers)
    state.cursor = 2
    const spy = vi.spyOn(fontModule, 'renderText')
    drawPlayerStatus({
      fb: createFramebuffer(),
      state,
      gs,
      playerRoles: { roles: Array.from({ length: 6 }, (_, id) => minimalRole(id)) },
      items: [],
      uiSpriteFrames: [],
      objectPoisons: new Map([[100, { level: 2, color: 30 }]]),
    })
    expect(
      spy.mock.calls.filter((call) => call[2] === 185 && call[3] === 58).map((call) => call[1]),
    ).toEqual([])
  })

  it('非顺序 party：SDLPal slot 0 的毒应显示给 partyMembers[0] 的 role', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [4, 1]
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 100, wPoisonScript: 0 }
    const roles = [minimalRole(0), minimalRole(1), minimalRole(2), minimalRole(3), minimalRole(4)]
    const objectPoisons = new Map([[100, { level: 2, color: 30 }]])
    const flat: string[] = []
    flat[100] = '蛊毒'
    setWordTable(flat)
    const spy = vi.spyOn(fontModule, 'renderText')

    drawPlayerStatus({
      fb: createFramebuffer(),
      state: createPlayerStatus([4, 1]),
      gs,
      playerRoles: { roles },
      items: [],
      uiSpriteFrames: [],
      objectPoisons,
    })

    expect(spy.mock.calls.find((c: unknown[]) => c[2] === 185 && c[3] === 58)?.[1]).toBe('蛊毒')
  })
})
