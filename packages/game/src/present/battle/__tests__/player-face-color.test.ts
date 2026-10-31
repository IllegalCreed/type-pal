import { describe, expect, it } from 'vitest'
import type { GameState } from '../../../core/game-state.js'
import { createInitialGameState } from '../../../core/game-state.js'
import { computePlayerFaceColor } from '../../player-info-box.js'

describe('player portrait tint', () => {
  const poisons = new Map([
    [551, { level: 0, color: 16 }],
    [552, { level: 1, color: 64 }],
    [555, { level: 3, color: 128 }],
    [561, { level: 4, color: 200 }], // level>3 不影响头像色
  ])

  function gsWith(poisonSlots: Record<string, number>): GameState {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1]
    gs.rgPoisonStatus = {}
    for (const [key, pid] of Object.entries(poisonSlots)) {
      gs.rgPoisonStatus[key] = { wPoisonID: pid, wPoisonScript: 0 }
    }
    return gs
  }

  it('无毒 + 活着 → 0xFF(满色,正常 blit)', () => {
    expect(computePlayerFaceColor(gsWith({}), 0, 100, poisons)).toBe(0xff)
  })

  it('单毒 level1 → 该毒 wColor(64)', () => {
    expect(computePlayerFaceColor(gsWith({ '0_0': 552 }), 0, 100, poisons)).toBe(64)
  })

  it('多毒取最高 level 的色(level1=64 + level3=128 → 128)', () => {
    expect(computePlayerFaceColor(gsWith({ '0_0': 552, '1_0': 555 }), 0, 100, poisons)).toBe(128)
  })

  it('level>3 毒(561 L4)不影响头像色 → 仍 0xFF', () => {
    expect(computePlayerFaceColor(gsWith({ '0_0': 561 }), 0, 100, poisons)).toBe(0xff)
  })

  it('死亡 hp==0 → 0(黑白 mono),覆盖中毒色', () => {
    expect(computePlayerFaceColor(gsWith({ '0_0': 555 }), 0, 0, poisons)).toBe(0)
  })

  it('另一队员(role 1)的毒不影响 role 0', () => {
    expect(computePlayerFaceColor(gsWith({ '0_1': 552 }), 0, 100, poisons)).toBe(0xff)
  })
})
