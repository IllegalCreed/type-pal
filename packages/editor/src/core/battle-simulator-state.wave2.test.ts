/** W2-B: subject edits on a loader-validated project, preserving actual input and presets. */

import { validateSkills } from '@type-pal/content'
import { loadCurrentProjectFrom } from '@type-pal/reforge'
import { expect, test } from 'vitest'
import { battleTrialProjectFiles, fixtureSource } from './__tests__/battle-trial-project.js'
import { emptyBattleSimulatorLibrary } from './battle-simulator-library.js'
import {
  applyTrialSubject,
  emptyTrialMember,
  emptyTrialPlan,
  resolveTrialDraft,
  trialCatalog,
} from './battle-simulator-state.js'
import { toEditorState } from './project-io.js'

async function fixture() {
  const project = await loadCurrentProjectFrom(fixtureSource(await battleTrialProjectFiles()))
  const state = toEditorState(project, [project.authorContent.entryScene], {}, {}, [])
  state.skills.push({ ...structuredClone(state.skills[0]!), id: 'ice' })
  state.actors.find((actor) => actor.id === 'hero')!.battler!.initialMagic = ['trial-spark']
  validateSkills({ skills: state.skills, levelUp: state.levelUp })
  return state
}
test.each([
  ['enemy-team', 'practice', { kind: 'team', teamId: 'practice' }, '当前敌队已不存在'],
  [
    'enemy',
    'dummy',
    { kind: 'slots', slots: ['dummy', null, null, null, null] },
    '当前敌人已不存在',
  ],
] as const)('subject %s sets only a temporary override and rejects a missing identity', async (kind, id, expected, message) => {
  const state = await fixture(),
    library = emptyBattleSimulatorLibrary(),
    plan = emptyTrialPlan(state)
  const before = structuredClone({ state, library, plan })
  const next = applyTrialSubject(plan, library, state, { kind, id })
  expect(next).toEqual({ ...before.plan, overrides: { enemies: expected } })
  expect(() => applyTrialSubject(plan, library, state, { kind, id: 'missing' })).toThrow(message)
  expect({ state, library, plan }).toEqual(before)
})
test('skill subject resolves inherited skills once, preserves original plan/state and never raises MP', async () => {
  const state = await fixture(),
    library = emptyBattleSimulatorLibrary(),
    plan = emptyTrialPlan(state)
  const member = emptyTrialMember('hero')
  member.mp = { kind: 'value', value: 1 }
  plan.party = { kind: 'inline', config: { members: [member] } }
  const before = structuredClone({ state, library, plan })
  const next = applyTrialSubject(plan, library, state, { kind: 'skill', id: 'ice' }, 'hero')
  const resolved = resolveTrialDraft(library, next)
  expect(resolved.party.members).toEqual([
    { ...member, skills: { kind: 'replace', ids: ['trial-spark', 'ice'] } },
  ])
  const nextBefore = structuredClone(next)
  const again = applyTrialSubject(next, library, state, { kind: 'skill', id: 'ice' }, 'hero')
  expect(again).toEqual(nextBefore)
  expect(next).toEqual(nextBefore)
  expect(() =>
    applyTrialSubject(plan, library, state, { kind: 'skill', id: 'ice' }, 'missing'),
  ).toThrow('请选择本方案中的施放队员')
  expect(() =>
    applyTrialSubject(plan, library, state, { kind: 'skill', id: 'missing' }, 'hero'),
  ).toThrow('当前技能已不存在')
  expect({ state, library, plan }).toEqual(before)
})
test('trial catalog projects stable identities from actual editor records', async () => {
  const state = await fixture(),
    before = structuredClone(state),
    catalog = trialCatalog(state)
  expect(catalog).toEqual({
    actorsById: Object.fromEntries(state.actors.map((entry) => [entry.id, entry])),
    skills: Object.fromEntries(state.skills.map((entry) => [entry.id, entry])),
    items: Object.fromEntries(state.items.map((entry) => [entry.id, entry])),
    enemiesById: Object.fromEntries(state.enemies!.map((entry) => [entry.id, entry])),
    enemyTeamsById: Object.fromEntries(state.enemyTeams!.map((entry) => [entry.id, entry])),
    battleFields: state.battleFields,
    assetCatalog: state.assetCatalog,
  })
  expect(state).toEqual(before)
})
