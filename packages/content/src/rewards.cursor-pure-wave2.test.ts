/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C3：applyLevelGrowth 非正次数不掷成长。
 * rewards.test.ts 已证 levels=1 的 99 级钳顶。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap, wave2Actor } from './__tests__/cursor-pure-wave2-fixtures.js'
import { instantiate } from './character.js'
import { applyLevelGrowth, grantBattleRewards } from './rewards.js'

const zeros = {
  level: 0,
  maxHP: 0,
  maxMP: 0,
  attack: 0,
  magicAttack: 0,
  defense: 0,
  speed: 0,
  luck: 0,
}

describe('C3 rewards 剩余合同', () => {
  test('levels<=0 与不足 1 的小数不改目标，delta 全 0', () => {
    const target = {
      level: 7,
      maxHP: 140,
      maxMP: 50,
      attack: 22,
      magicAttack: 18,
      defense: 16,
      speed: 19,
      luck: 11,
    }
    const snap = inputSnap(target)
    expect(applyLevelGrowth(target, 0, () => 0.99)).toEqual(zeros)
    expect(target).toEqual(snap)
    expect(applyLevelGrowth(target, -3, () => 0.99)).toEqual(zeros)
    expect(target).toEqual(snap)
    expect(applyLevelGrowth(target, 0.9, () => 0.99)).toEqual(zeros)
    expect(target).toEqual(snap)
    expect(target.luck).toBe(11)
  })

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
