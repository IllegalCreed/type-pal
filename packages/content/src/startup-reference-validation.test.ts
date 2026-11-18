import { describe, expect, test } from 'vitest'
import { createReferenceProject } from './__tests__/reference-project.js'
import type { BattlerSpec } from './actor.js'
import type { StartWorld } from './character.js'
import { validateActors, validateSkills, validateStartWorld } from './validate.js'
import { type ContentBundle, type Issue, validateReferences } from './validate-refs.js'

function withStartWorld(patch: Partial<StartWorld>) {
  const project = createReferenceProject()
  project.entry.startWorld = validateStartWorld({ ...project.entry.startWorld, ...patch })
  return project
}

describe('startup references', () => {
  test('reports the missing actor in the opening party', () => {
    const { bundle } = withStartWorld({ party: ['missing'] })
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'entryPoints[main].startWorld.party[0]',
        message: '队员 "missing" 不在 actors 表',
      },
    ])
  })

  test('reports a registered townsperson who has no battle profile', () => {
    const { bundle } = withStartWorld({ party: ['villager'] })
    bundle.actors.push({ id: 'villager', name: 'name.hero', spriteId: 'sprite.hero' })
    validateActors(bundle.actors)
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'entryPoints[main].startWorld.party[0]',
        message: '队员 "villager" 无 battler(不可入队)',
      },
    ])
  })

  test.each([
    {
      change: { inventory: [{ itemId: 'missing', count: 1 }] },
      problem: {
        severity: 'error',
        where: 'entryPoints[main].startWorld.inventory[0].itemId',
        message: '物品 "missing" 不在 items',
      },
    },
    {
      change: { seedStats: { missing: { hp: 1 } } },
      problem: {
        severity: 'error',
        where: 'entryPoints[main].startWorld.seedStats[missing]',
        message: '属性播种角色 "missing" 不在 actors',
      },
    },
  ] satisfies {
    change: Partial<StartWorld>
    problem: Issue
  }[])('reports invalid start-world reference at $problem.where', ({ change, problem }) => {
    const { bundle } = withStartWorld(change)
    expect(validateReferences(bundle)).toEqual([problem])
  })

  test('keeps missing actor and poison diagnostics distinct for a seeded party slot', () => {
    const { bundle } = withStartWorld({
      party: ['hero', 'missing'],
      seedConditions: { missing: { poisonIds: [9] } },
    })
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'entryPoints[main].startWorld.party[1]',
        message: '队员 "missing" 不在 actors 表',
      },
      {
        severity: 'error',
        where: 'entryPoints[main].startWorld.seedConditions[missing]',
        message: '状态播种角色 "missing" 不在 actors',
      },
      {
        severity: 'error',
        where: 'entryPoints[main].startWorld.seedConditions[missing].poisonIds[0]',
        message: '毒 9 不在 poisons',
      },
    ])
  })

  test('rejects a condition seed for the non-battler declared in this opening party', () => {
    const { bundle, actor } = withStartWorld({
      party: ['companion'],
      seedConditions: { companion: {} },
    })
    bundle.actors.push({ id: 'companion', name: actor.name, spriteId: actor.spriteId })
    validateActors(bundle.actors)
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'entryPoints[main].startWorld.party[0]',
        message: '队员 "companion" 无 battler(不可入队)',
      },
      {
        severity: 'error',
        where: 'entryPoints[main].startWorld.seedConditions[companion]',
        message: '状态播种角色 "companion" 无 battler(不可入队)',
      },
    ])
    bundle.actors = [actor, { ...actor, id: 'companion' }]
    validateActors(bundle.actors)
    expect(validateReferences(bundle)).toEqual([])
  })

  test('checks the poison ID for a registered battler in the opening party', () => {
    const { bundle, entry } = withStartWorld({ seedConditions: { hero: { poisonIds: [9] } } })
    bundle.poisons = [{ id: 1, name: '赤毒', curability: 'common', color: 0 }]
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'entryPoints[main].startWorld.seedConditions[hero].poisonIds[0]',
        message: '毒 9 不在 poisons',
      },
    ])
    entry.startWorld.seedConditions = { hero: { poisonIds: [1] } }
    expect(validateReferences(bundle)).toEqual([])
  })

  test('reports each named startup entry with the same missing party actor', () => {
    const { bundle, entry } = withStartWorld({ party: ['missing'] })
    const alternateWorld = validateStartWorld({ party: ['missing'], money: 0, inventory: [] })
    bundle.entryPoints = [entry, { ...entry, id: 'alternate', startWorld: alternateWorld }]
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'entryPoints[main].startWorld.party[0]',
        message: '队员 "missing" 不在 actors 表',
      },
      {
        severity: 'error',
        where: 'entryPoints[alternate].startWorld.party[0]',
        message: '队员 "missing" 不在 actors 表',
      },
    ])
  })
})

describe('actor battle configuration references', () => {
  function withBattler(patch: Partial<BattlerSpec>): ContentBundle {
    const { bundle, actor } = createReferenceProject()
    bundle.actors = validateActors([{ ...actor, battler: { ...actor.battler, ...patch } }])
    return bundle
  }

  test('reports the exact slot of a missing initial skill', () => {
    expect(validateReferences(withBattler({ initialMagic: ['missing'] }))).toEqual([
      {
        severity: 'error',
        where: 'actors[0](hero).battler.initialMagic[0]',
        message: '初始仙术 "missing" 不在 skills',
      },
    ])
  })

  test('warns when an actor is configured to cover themself', () => {
    expect(validateReferences(withBattler({ coveredBy: 'hero' }))).toEqual([
      {
        severity: 'warn',
        where: 'actors[0](hero).battler.coveredBy',
        message: 'coveredBy 指向自己（运行时死者 hp=0 不满足援护前置，天然不触发）',
      },
    ])
  })

  test('rejects a missing cooperative magic skill', () => {
    expect(validateReferences(withBattler({ cooperativeMagicSkillId: 'missing' }))).toEqual([
      {
        severity: 'error',
        where: 'actors[0](hero).battler.cooperativeMagicSkillId',
        message: '合体技 "missing" 不在 skills',
      },
    ])
  })

  test('warns with the exact path of unregistered casualty dialogue text', () => {
    const bundle = withBattler({
      casualty: {
        dying: {
          gates: [
            {
              chance: 50,
              branch: { lines: [{ text: 'dlg.missing', style: 'bottom' }], effects: [] },
            },
          ],
          fallback: { lines: [], effects: [] },
        },
      },
    })
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'warn',
        where: 'actors[0](hero).battler.casualty.dying.gates[0].branch.lines[0].text',
        message: '文本 id "dlg.missing" 不在 locale',
      },
    ])
  })
})

test('checks protect against the seeded current HP of the opening character', () => {
  const { bundle, entry } = withStartWorld({
    seedStats: { hero: { hp: 0 } },
    seedConditions: { hero: { statuses: [{ status: 'protect', turns: 7 }] } },
  })
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'error',
      where: 'entryPoints[main].startWorld.seedConditions[hero].statuses[0].status',
      message: '当前 HP 为 0 的角色 "hero" 不能播种好状态 protect',
    },
  ])
  entry.startWorld.seedStats = { hero: { hp: 1 } }
  expect(validateReferences(bundle)).toEqual([])
})

test('distinguishes a registered cover partner with no battle configuration', () => {
  const { bundle, actor } = createReferenceProject()
  bundle.actors = validateActors([
    { ...actor, battler: { ...actor.battler, coveredBy: 'villager' } },
    { id: 'villager', name: actor.name, spriteId: actor.spriteId },
  ])
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'error',
      where: 'actors[0](hero).battler.coveredBy',
      message: '战斗角色 "villager" 不是可战斗角色',
    },
  ])
})

test('accepts paired cover, a registered cooperative spell and casualty dialogue', () => {
  const { bundle, actor } = createReferenceProject()
  bundle.locale['dlg.friend'] = '当心'
  bundle.skills = [
    {
      id: 'together',
      name: '合击',
      desc: '',
      cost: {},
      usableOutsideBattle: false,
      target: 'oneEnemy',
      effects: [{ kind: 'damage', power: 1, elemental: 0 }],
      animation: { effectSprite: 1 },
    },
  ]
  validateSkills({ skills: bundle.skills, levelUp: bundle.levelUp })
  bundle.actors = validateActors([
    {
      ...actor,
      battler: {
        ...actor.battler,
        coveredBy: 'partner',
        cooperativeMagicSkillId: 'together',
        casualty: {
          friendDeath: {
            gates: [
              {
                chance: 75,
                branch: { lines: [{ text: 'dlg.friend', style: 'bottom' }], effects: [] },
              },
            ],
            fallback: { lines: [], effects: [{ kind: 'heal', resource: 'hp' }] },
          },
        },
      },
    },
    { ...actor, id: 'partner', battler: { ...actor.battler, coveredBy: 'hero' } },
  ])
  expect(validateReferences(bundle)).toEqual([])
})

test('reports missing casualty text separately from an empty script', () => {
  const { bundle, actor } = createReferenceProject()
  bundle.actors = validateActors([
    {
      ...actor,
      battler: {
        ...actor.battler,
        casualty: {
          friendDeath: {
            gates: [],
            fallback: { lines: [{ text: 'dlg.missing', style: 'bottom' }], effects: [] },
          },
          dying: { gates: [], fallback: { lines: [], effects: [] } },
        },
      },
    },
  ])
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'warn',
      where: 'actors[0](hero).battler.casualty.friendDeath.fallback.lines[0].text',
      message: '文本 id "dlg.missing" 不在 locale',
    },
    {
      severity: 'warn',
      where: 'actors[0](hero).battler.casualty.dying',
      message: '伤亡脚本为空壳（gates 空且 fallback 无台词/效果），疑误存',
    },
  ])
})
