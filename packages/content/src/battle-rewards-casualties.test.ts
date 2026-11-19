/** Battle rewards and half recovery for a mixed living and fallen party. */
import { describe, expect, test } from 'vitest'
import { actorWithPortraitsAndBattler } from './__tests__/actor-fixtures.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import { instantiate } from './character.js'
import { grantBattleRewards } from './rewards.js'

describe('rewards', () => {
  test('fallen members skip experience growth and still recover half their missing HP', () => {
    const table = Array.from({ length: 100 }, () => 10)
    const liveDef = actorWithPortraitsAndBattler('hero.live', 'name.live')
    const deadDef = actorWithPortraitsAndBattler('hero.dead', 'name.dead')
    liveDef.battler!.leveling = { expTable: table }
    deadDef.battler!.leveling = { expTable: table }
    const live = instantiate(liveDef)
    const dead = instantiate(deadDef)
    dead.hp = 0
    const liveSnap = deepSnapshot(live)
    const deadHidden = deepSnapshot(dead.hiddenExp)
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
  })
})
