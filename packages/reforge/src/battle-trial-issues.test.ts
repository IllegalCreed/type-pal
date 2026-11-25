import { validateActors } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  trialActor,
  trialCatalogFixture,
  trialConfig,
  trialMember,
} from './__tests__/coverage-wave2/b-trial-catalog.js'
import { collectBattleTrialIssues } from './battle-trial-prepare.js'

test('locates missing world, party, skill, and inventory references in the draft', () => {
  const catalog = trialCatalogFixture()
  const draft = trialConfig([trialMember()], {
    fieldId: 99,
    enemies: { kind: 'team', teamId: 'missing-team' },
    bag: { items: [{ itemId: 'missing-item', quantity: 1 }] },
  })
  expect(collectBattleTrialIssues(draft, catalog)).toEqual([
    { severity: 'error', path: 'fieldId', message: '战场 99 不存在，请在战场目录配置' },
    { severity: 'error', path: 'enemies', message: '敌队 missing-team 不存在' },
    { severity: 'error', path: 'bag.items[0]', message: '背包物品 missing-item 不存在' },
  ])

  const unknownActor = trialConfig([trialMember({ actorId: 'missing-actor' })])
  expect(collectBattleTrialIssues(unknownActor, catalog)).toEqual([
    {
      severity: 'error',
      path: 'party.members[0].actorId',
      message: '角色 missing-actor 不存在或不可参战',
    },
    { severity: 'error', path: 'party', message: '我方必须至少有一名体力大于0的队员' },
  ])
  const unknownSkill = trialConfig([
    trialMember({ skills: { kind: 'replace', ids: ['missing-skill'] } }),
  ])
  expect(collectBattleTrialIssues(unknownSkill, catalog)).toEqual([
    { severity: 'error', path: 'party.members[0].skills', message: '技能 missing-skill 不存在' },
  ])
})

test('distinguishes depleted parties, out-of-range pool overrides, and an unusable actor maximum', () => {
  const catalog = trialCatalogFixture()
  const partyWithoutHp = trialConfig([trialMember({ hp: { kind: 'value', value: 0 } })])
  expect(collectBattleTrialIssues(partyWithoutHp, catalog)).toEqual([
    { severity: 'error', path: 'party', message: '我方必须至少有一名体力大于0的队员' },
  ])
  const excessiveMp = trialConfig([trialMember({ mp: { kind: 'value', value: 51 } })])
  expect(collectBattleTrialIssues(excessiveMp, catalog)).toEqual([
    { severity: 'error', path: 'party.members[0].mp', message: '当前值 51 超过最大值 50' },
  ])

  const actorWithoutCapacity = trialActor(0, 50)
  validateActors([actorWithoutCapacity])
  // Structural actor validation leaves trial viability to the draft diagnostics.
  catalog.actorsById.hero = actorWithoutCapacity
  expect(collectBattleTrialIssues(trialConfig(), catalog)).toEqual([
    { severity: 'error', path: 'party.members[0].stats', message: 'hero 的最大体力无效' },
    { severity: 'error', path: 'party', message: '我方必须至少有一名体力大于0的队员' },
  ])
})

test('reports equipment ownership and dangling grants separately from advisory pool effects', () => {
  const catalog = trialCatalogFixture()
  const wrongSlot = trialConfig([trialMember({ equipment: { head: 'sword' } })])
  expect(collectBattleTrialIssues(wrongSlot, catalog)).toEqual([
    {
      severity: 'error',
      path: 'party.members[0].equipment.head',
      message: '角色 hero 不能在 head 穿戴 sword',
    },
  ])
  const wrongActor = trialConfig([trialMember({ equipment: { weapon: 'cursed' } })])
  expect(collectBattleTrialIssues(wrongActor, catalog)).toEqual([
    {
      severity: 'error',
      path: 'party.members[0].equipment.weapon',
      message: '角色 hero 不能在 weapon 穿戴 cursed',
    },
  ])
  const grant = trialConfig([trialMember({ equipment: { weapon: 'ghostSkill' } })])
  expect(collectBattleTrialIssues(grant, catalog)).toEqual([])
  const equipment = catalog.items.ghostSkill?.equip
  if (!equipment) throw new Error('试打夹具缺少授技装备')
  equipment.effects = [{ kind: 'grantSkill', skillId: 'missing-skill' }]
  expect(collectBattleTrialIssues(grant, catalog)).toEqual([
    {
      severity: 'error',
      path: 'party.members[0].equipment.weapon',
      message: '装备授予的技能 missing-skill 不存在',
    },
  ])
  const maxPool = trialConfig([trialMember({ equipment: { weapon: 'maxpool' } })])
  expect(collectBattleTrialIssues(maxPool, catalog)).toEqual([
    {
      severity: 'warning',
      path: 'party.members[0].equipment.weapon',
      message: 'maxpool 的体力/真气上限效果当前引擎尚未执行；试打不单独修改正式规则',
    },
  ])
})

test('locates an empty team and an unresolved explicit enemy slot', () => {
  const catalog = trialCatalogFixture()
  const emptyTeam = trialConfig([trialMember()], { enemies: { kind: 'team', teamId: 'empty' } })
  expect(collectBattleTrialIssues(emptyTeam, catalog)).toEqual([
    { severity: 'error', path: 'enemies', message: '请至少选择一个敌人，空敌队不能试打' },
  ])
  const missingEnemy = trialConfig([trialMember()], {
    enemies: { kind: 'slots', slots: [null, 'slime', null, 'missing-enemy', null] },
  })
  expect(collectBattleTrialIssues(missingEnemy, catalog)).toEqual([
    {
      severity: 'error',
      path: 'enemies.slots[3]',
      message: '敌人 missing-enemy 不存在',
    },
  ])
})

test('reports a single config diagnostic for an unparseable draft', () => {
  expect(collectBattleTrialIssues({ party: 'nope' }, trialCatalogFixture())).toEqual([
    { path: 'config', severity: 'error', message: 'trial.party: 期望对象' },
  ])
})
