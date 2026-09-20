import {
  type BattleTrialConfig,
  battleTrialRevision,
  collectBattleTrialIssues,
  loadCurrentProjectFrom,
  prepareBattleTrial,
  previewBattleTrialParty,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  battleTrialProjectFiles,
  fixtureSource,
} from '../../editor/src/core/__tests__/battle-trial-project.js'
import {
  parseBattleSimulatorLibrary,
  resolveBattleSimulatorPlan,
} from '../../editor/src/core/battle-simulator-library.js'
import { emptyTrialMember } from '../../editor/src/core/battle-simulator-state.js'

async function fixture() {
  const files = await battleTrialProjectFiles()
  const project = await loadCurrentProjectFrom(fixtureSource(files))
  const library = parseBattleSimulatorLibrary(files['editor/battle-simulator.json'])
  const config = resolveBattleSimulatorPlan(library, 'basic')
  return { files, project, library, config }
}

describe('saved battle plan → actual runtime inputs', () => {
  test('formal non-PAL project loads, named plan resolves, actual author inputs remain untouched', async () => {
    const { project, config, library } = await fixture()
    const revision = await battleTrialRevision(project)
    const before = structuredClone({
      config,
      library,
      actors: project.actorsById,
      items: project.items,
      enemies: project.enemiesById,
    })
    expect(collectBattleTrialIssues(config, project)).toEqual([])
    const trial = prepareBattleTrial(config, project)
    expect(trial.world.party).toHaveLength(1)
    expect(trial.players[0]!.mp).toBe(20)
    expect(trial.world.money).toBe(100)
    expect(trial.world.inventory).toEqual([{ itemId: 'trial-herb', count: 3 }])
    expect(trial.enemySlots.map((e) => e?.id ?? null)).toEqual(['dummy', null, null, null, null])
    trial.world.party[0]!.hp = 0
    trial.world.inventory[0]!.count = 0
    trial.enemySlots[0]!.stats.health = 1
    expect({
      config,
      library,
      actors: project.actorsById,
      items: project.items,
      enemies: project.enemiesById,
    }).toEqual(before)
    expect(await battleTrialRevision(project)).toBe(revision)
    expect(prepareBattleTrial(config, project).players[0]!.hp).toBeGreaterThan(0)
  })

  test('level is not invented growth; gear is applied once, skills do not grant free MP', async () => {
    const { project, config } = await fixture()
    const member = config.party.members[0]!
    member.stats = { level: 50, maxHP: 31, maxMP: 20, attack: 11 }
    member.equipment = { weapon: 'trial-sword' }
    member.skills = { kind: 'replace', ids: ['trial-spark'] }
    member.hp = { kind: 'percent', value: 50 }
    member.mp = { kind: 'value', value: 0 }
    const before = structuredClone(config)
    const trial = prepareBattleTrial(config, project)
    expect(
      previewBattleTrialParty(config.party, { actorsById: project.actorsById, items: trial.items }),
    ).toEqual(trial.players)
    expect(trial.players[0]).toMatchObject({
      hp: 15,
      maxHp: 31,
      mp: 0,
      maxMp: 20,
      attackStrength: 18,
      skills: ['trial-spark'],
    })
    expect(trial.world.party[0]).toMatchObject({
      level: 50,
      attack: 11,
      equipment: { weapon: 'trial-sword' },
    })
    expect(config).toEqual(before)
  })

  test.each([
    1, 2, 3,
  ])('%i party members and five independent enemy slots remain supported', async (count) => {
    const { project, config } = await fixture()
    config.party.members = Object.keys(project.actorsById).slice(0, count).map(emptyTrialMember)
    config.enemies = { kind: 'slots', slots: Array.from({ length: 5 }, () => 'dummy') }
    const trial = prepareBattleTrial(config, project)
    expect(trial.players).toHaveLength(count)
    expect(trial.enemySlots).toHaveLength(5)
    expect(trial.enemySlots[0]).not.toBe(trial.enemySlots[1])
  })

  test('fourth party member is rejected before runtime construction', async () => {
    const { project, config } = await fixture()
    config.party.members = Object.keys(project.actorsById).slice(0, 4).map(emptyTrialMember)
    const before = structuredClone(config)
    expect(() => prepareBattleTrial(config, project)).toThrow('最多3名')
    expect(config).toEqual(before)
  })

  test.each([
    [
      'empty party',
      (c: BattleTrialConfig) => {
        c.party.members = []
      },
      '至少选择一名',
    ],
    [
      'empty enemies',
      (c: BattleTrialConfig) => {
        c.enemies = { kind: 'slots', slots: [null, null, null, null, null] }
      },
      '空敌队',
    ],
    [
      'all zero HP',
      (c: BattleTrialConfig) => {
        c.party.members[0]!.hp = { kind: 'value', value: 0 }
      },
      '体力大于0',
    ],
    [
      'bad equipment',
      (c: BattleTrialConfig) => {
        c.party.members[0]!.equipment = { head: 'trial-sword' }
      },
      '不能在',
    ],
    [
      'missing skill',
      (c: BattleTrialConfig) => {
        c.party.members[0]!.skills = { kind: 'replace', ids: ['missing'] }
      },
      '技能 missing',
    ],
    [
      'HP above max',
      (c: BattleTrialConfig) => {
        c.party.members[0]!.hp = { kind: 'value', value: Number.MAX_SAFE_INTEGER }
      },
      '超过最大值',
    ],
    [
      'wrong music',
      (c: BattleTrialConfig) => {
        c.music = { kind: 'asset', assetId: 'missing' }
      },
      '音乐 missing',
    ],
    [
      'missing field',
      (c: BattleTrialConfig) => {
        c.fieldId = 9999
      },
      '战场 9999',
    ],
  ] as const)('%s is actionable and never silently substitutes defaults', async (_, change, message) => {
    const { project, config } = await fixture()
    change(config)
    const before = structuredClone(config)
    expect(() => prepareBattleTrial(config, project)).toThrow(message)
    expect(config).toEqual(before)
  })
})
