import {
  loadCurrentProjectFrom,
  loadFireSprite,
  loadStandardPalette,
  prepareBattleTrial,
} from '@type-pal/reforge'
import { expect, test, vi } from 'vitest'
import {
  battleTrialProjectFiles,
  fixtureSource,
} from '../../editor/src/core/__tests__/battle-trial-project.js'
import {
  parseBattleSimulatorLibrary,
  resolveBattleSimulatorPlan,
} from '../../editor/src/core/battle-simulator-library.js'
import { emptyTrialMember } from '../../editor/src/core/battle-simulator-state.js'
import { createBattlePlayers } from '../src/battle/battle-player-input.js'
import { prepareBattleSpriteReadiness } from '../src/battle/battle-sprite-readiness.js'
import { finishBattleWorldState } from '../src/battle/battle-world-result.js'
import { createBattleTrialSession } from '../src/battle-trial-session.js'

async function fixture(hp?: number) {
  const files = await battleTrialProjectFiles()
  const project = await loadCurrentProjectFrom(fixtureSource(files))
  const config = resolveBattleSimulatorPlan(
    parseBattleSimulatorLibrary(files['editor/battle-simulator.json']),
    'basic',
  )
  config.party.members[0]!.skills = { kind: 'replace', ids: ['trial-spark'] }
  config.party.members[0]!.stats = { attack: 100, defense: 200 }
  if (hp !== undefined) config.party.members[0]!.hp = { kind: 'value', value: hp }
  const prepared = prepareBattleTrial(config, project)
  const ready = await prepareBattleSpriteReadiness({
    cache: project.battleSpriteCache,
    reader: project.assetResolver,
    definitionsById: project.battleSpritesById,
    party: prepared.world.party,
    actorsById: project.actorsById,
    itemsById: prepared.items,
    playerSkillIds: prepared.players.map((p) => p.skills),
    cooperativeSkillIds: [],
    skillsById: project.skills,
    enemyDefs: prepared.enemySlots.filter((e) => e !== null),
    enemiesById: project.enemiesById,
  })
  const assets = {
    palette: await loadStandardPalette(project.assetBase),
    glyphs: new Map(),
    battleSprites: ready.byDefinitionId,
    playerBaseDefinitionIds: ready.playerBaseDefinitionIds,
    fireSprites: { 0: await loadFireSprite(project.assetBase, 0) },
  }
  return { files, project, config, prepared, assets }
}
test.each([
  'spell',
  'throw',
  'heal',
] as const)('same browser-host factory runs real %s action and isolated settlement', async (action) => {
  const { project, config, prepared, assets } = await fixture(action === 'heal' ? 30 : undefined)
  const initial = structuredClone(config)
  const author = structuredClone({
    actors: project.actorsById,
    items: project.items,
    skills: project.skills,
    enemies: project.enemiesById,
  })
  let beforeReward: typeof prepared.world | undefined
  const exp = vi.fn(() => {
    beforeReward = structuredClone(prepared.world)
  })
  const session = createBattleTrialSession(prepared, project, assets, {
    active() {},
    onExpReward: exp,
    rng: () => 0.5,
  })
  let outcome: string | undefined, failure: unknown
  void session.done.then(
    (v) => {
      outcome = v
    },
    (e) => {
      failure = e
    },
  )
  let time = 0
  const tick = (keys: string[] = []) => {
    time += 100
    session.tick(100, new Set(keys), time)
  }
  try {
    // Formal menu shortcuts/keys, not direct core mutation or a mock victory.
    tick([action === 'spell' ? 'ArrowLeft' : action === 'throw' ? 'w' : 'e'])
    tick(['Enter'])
    tick(['Enter'])
    tick()
    for (let i = 0; i < 500 && !outcome && !failure; i++) {
      tick(['Enter'])
      await Promise.resolve()
    }
    expect(failure).toBeUndefined()
    expect(outcome, session.debugLog().join('\n')).toBe('victory')
    finishBattleWorldState(session, 'victory', prepared.world, project)
    expect(exp).toHaveBeenCalledTimes(1)
    expect(prepared.world.money).toBe(103)
    expect(beforeReward!.party[0]!.mp).toBe(action === 'spell' ? 18 : 20)
    expect(prepared.world.party[0]!.mp).toBe(action === 'spell' ? 29 : 30) // 正式胜利结算恢复缺失真气的一半。
    expect(prepared.world.inventory).toEqual([
      { itemId: 'trial-herb', count: action === 'spell' ? 3 : 2 },
    ])
    if (action === 'heal') expect(beforeReward!.party[0]!.hp).toBeGreaterThan(30)
    expect(config).toEqual(initial)
    expect({
      actors: project.actorsById,
      items: project.items,
      skills: project.skills,
      enemies: project.enemiesById,
    }).toEqual(author)
    expect(prepareBattleTrial(config, project).world.money).toBe(100)
  } finally {
    session.cancel()
    await session.done.catch(() => {})
  }
})

test('ordinary and trial callers share live player derivation, including carried conditions and debug-only flags', async () => {
  const { project, config } = await fixture()
  config.party.members.push(emptyTrialMember('ally-2'))
  config.party.members[0]!.equipment = { weapon: 'trial-sword' }
  project.actorsById.hero!.battler!.coveredBy = 'ally-2'
  project.actorsById.hero!.battler!.cooperativeMagicSkillId = 'trial-spark'
  const prepared = prepareBattleTrial(config, project),
    member = prepared.world.party[0]!
  member.extraStatuses = [{ status: 'protect', turns: 3 }]
  member.extraPoisonRes = 7
  member.poisons = [{ poisonId: 1, tickIndex: 2 }]
  const original = structuredClone(prepared.world)
  const players = createBattlePlayers(prepared.world, {
    actorsById: project.actorsById,
    items: prepared.items,
  })
  expect(players[0]).toMatchObject({
    hp: 100,
    mp: 20,
    attackStrength: 107,
    defense: 200,
    baseDexterity: 60,
    actorTemplateId: 'hero',
    coveredBy: prepared.world.party[1]!.id,
    cooperativeMagicSkillId: 'trial-spark',
    poisonRes: 7,
    itemPoisonResBonus: 7,
    carriedStatuses: [{ status: 'protect', turns: 3 }],
    poisons: [{ poisonId: 1, tickIndex: 2 }],
    attackAll: false,
    persistentProgress: { level: 1, attack: 100, defense: 200 },
  })
  const debug = createBattlePlayers(
    prepared.world,
    { actorsById: project.actorsById, items: prepared.items },
    { allLeader: member.id, dualLeader: member.id },
  )
  expect(debug[0]).toMatchObject({ attackAll: true, grantedStatuses: ['dualAttack'] })
  expect(debug[1]).toMatchObject({ attackAll: false, grantedStatuses: [] })
  players[0]!.carriedStatuses![0]!.turns = 1
  players[0]!.poisons![0]!.tickIndex = 0
  expect(prepared.world).toEqual(original)
})

test('real defeat writes back only to the trial world; a new trial starts healthy and without rewards', async () => {
  const { project, config, assets } = await fixture()
  config.auto = true
  config.party.members[0]!.stats = { attack: 0, defense: 0, maxHP: 1 }
  config.party.members[0]!.skills = { kind: 'replace', ids: [] }
  const prepared = prepareBattleTrial(config, project),
    before = structuredClone(config)
  const exp = vi.fn(),
    session = createBattleTrialSession(prepared, project, assets, {
      active() {},
      onExpReward: exp,
      rng: () => 0.5,
    })
  let result: string | undefined, failure: unknown
  void session.done.then(
    (v) => {
      result = v
    },
    (e) => {
      failure = e
    },
  )
  try {
    for (let i = 1; i < 300 && !result && !failure; i++) {
      session.tick(100, new Set(), i * 100)
      await Promise.resolve()
    }
    expect(failure).toBeUndefined()
    expect(result).toBe('defeat')
    finishBattleWorldState(session, 'defeat', prepared.world, project)
    expect(prepared.world.party[0]!.hp).toBe(0)
    expect(prepared.world.money).toBe(100)
    expect(exp).not.toHaveBeenCalled()
    expect(config).toEqual(before)
    expect(prepareBattleTrial(config, project).world.party[0]!.hp).toBe(1)
  } finally {
    session.cancel()
    await session.done.catch(() => {})
  }
})
