/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C3：grantBattleRewards 死者跳过 hiddenCounts。
 * applyLevelGrowth(0/-3/0.9) 仅防御钳位，现行生产只传已校验正整数，不计本包。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap, wave2Actor } from './__tests__/cursor-pure-wave2-fixtures.js'
import { instantiate } from './character.js'
import { grantBattleRewards } from './rewards.js'

describe('C3 rewards 剩余合同', () => {
  test('死者跳过 hiddenCounts，活人仍成长；死者仍吃 Phase F', () => {
    const table = Array.from({ length: 100 }, () => 10)
    const liveDef = wave2Actor('hero.live', 'name.live')
    const deadDef = wave2Actor('hero.dead', 'name.dead')
    liveDef.battler!.leveling = { expTable: table }
    deadDef.battler!.leveling = { expTable: table }
    const live = instantiate(liveDef)
    const dead = instantiate(deadDef)
    dead.hp = 0
    const liveSnap = inputSnap(live)
    const deadHidden = inputSnap(dead.hiddenExp)
    const report = grantBattleRewards(
      [dead, live],
      {},
      { [liveDef.id]: liveDef, [deadDef.id]: deadDef },
      {},
      {
        exp: 5,
        cash: 0,
        hiddenCounts: { [dead.id]: { attack: 3 }, [live.id]: { defense: 2 } },
      },
      () => 0,
    )
    expect(dead.exp).toBe(0)
    expect(dead.hiddenExp).toEqual(deadHidden)
    expect(dead.attack).toBe(liveSnap.attack)
    expect(dead.hp).toBe(60)
    expect(live.defense).toBe(liveSnap.defense + 1)
    expect(report.hiddenUps).toEqual([{ characterId: live.id, stat: 'defense', delta: 1 }])
    expect(report.hiddenUps.some((entry) => entry.characterId === dead.id)).toBe(false)
  })
})
