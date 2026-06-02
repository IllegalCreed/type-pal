import { describe, it, expect, vi, afterEach } from 'vitest'
import type { PlayerRoles } from '@type-pal/shared'
import * as fontModule from '../font.js'
import { drawPlayerStatus } from './draw-player-status.js'
import { createFramebuffer } from '../framebuffer.js'
import { createInitialGameState } from '../../core/game-state.js'
import { createPlayerStatus } from '../../core/menu/player-status.js'
import { setWordTable } from '../../core/word-lookup.js'

// 最小 PlayerRole(drawPlayerStatus 读 avatar/equipment/name 等;装备全 0 → 装备行 skip;
//   stat 走 getPlayerXxx 读 gs.PlayerRolesRuntime,缺省 ?? 0 不崩)。
function minimalRole(id: number): unknown {
  return {
    id, _name: 'r', name: 0, avatar: 0, level: 1, hp: 10, maxHP: 10, mp: 5, maxMP: 5,
    attackStrength: 1, magicStrength: 1, defense: 1, dexterity: 1, fleeRate: 1, poisonResistance: 0,
    equipment: [0, 0, 0, 0, 0, 0], magic: [], elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    coveredBy: 0, cooperativeMagic: 0, attackAll: 0, walkFrames: 0, spriteNum: 0, spriteNumInBattle: 0,
  }
}

// C6:PlayerStatus 毒 row(sdlpal uigame.c:1245-1253)— rgPoisonStatus 的 wPoisonID,
//   poison.level<=3 才显示,名 getWord(wPoisonID),色 wColor+10,位置 RolePoisonNames[j](185,58+j*18)。
describe('drawPlayerStatus 毒 row(uigame.c:1245-1253)', () => {
  afterEach(() => { vi.restoreAllMocks(); setWordTable([]) })

  function run(opts: { id: number; level: number; color: number; slot?: number }): ReturnType<typeof vi.spyOn> {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.rgPoisonStatus[`${opts.slot ?? 0}_0`] = { wPoisonID: opts.id, wPoisonScript: 0 }
    const objectPoisons = new Map([[opts.id, { level: opts.level, color: opts.color }]])
    const flat: string[] = []; flat[opts.id] = '蛊毒'; setWordTable(flat)
    const spy = vi.spyOn(fontModule, 'renderText')
    drawPlayerStatus({
      fb: createFramebuffer(), state: createPlayerStatus([0]), gs,
      playerRoles: { roles: [minimalRole(0)] } as unknown as PlayerRoles,
      items: [], uiSpriteFrames: [], objectPoisons,
    })
    return spy
  }

  it('level<=3 → 毒名画在 (185,58),色 = wColor+10', () => {
    const spy = run({ id: 100, level: 2, color: 30 })
    // renderText(fb, text, x, y, color, glyphs, shadow)
    const call = spy.mock.calls.find((c: unknown[]) => c[2] === 185 && c[3] === 58)
    expect(call).toBeDefined()
    expect(call![1]).toBe('蛊毒')   // getWord(100)
    expect(call![4]).toBe(40)       // wColor 30 + 10
    expect(call![6]).toBe(true)     // fShadow=TRUE
  })

  it('level>3(高级/装备毒哨兵)→ 不画', () => {
    const spy = run({ id: 100, level: 99, color: 30 })
    expect(spy.mock.calls.find((c: unknown[]) => c[2] === 185 && c[3] === 58)).toBeUndefined()
  })

  it('wPoisonID=0(无毒槽)→ 不画', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const spy = vi.spyOn(fontModule, 'renderText')
    drawPlayerStatus({
      fb: createFramebuffer(), state: createPlayerStatus([0]), gs,
      playerRoles: { roles: [minimalRole(0)] } as unknown as PlayerRoles,
      items: [], uiSpriteFrames: [], objectPoisons: new Map(),
    })
    expect(spy.mock.calls.find((c: unknown[]) => c[2] === 185 && c[3] === 58)).toBeUndefined()
  })
})
