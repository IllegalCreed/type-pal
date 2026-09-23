import { checkAuthorScriptLibrary, validatePoisons, validateSkills } from '@type-pal/content'
import { expect, test } from 'vitest'
import { referenceProject } from '../__tests__/coverage-wave2/d-reference-project.js'
import { collectBattleDataReferences } from './battle-data-references.js'

test('exclude-script poison scan keeps the exact static references but omits canonical command references', async () => {
  const { state } = await referenceProject()
  state.poisons = [{ id: 9, name: 'Nine', curability: 'common', color: 0 }]
  state.skills[0]!.effects = [{ kind: 'applyPoison', poisonId: '9' }]
  state.sharedScripts = {
    dose: {
      name: 'Dose',
      self: 'none',
      body: [
        { kind: 'applyActorCondition', actor: 'hero', condition: { kind: 'poison', poisonId: 9 } },
      ],
    },
  }
  validatePoisons(state.poisons)
  validateSkills({ skills: state.skills, levelUp: state.levelUp })
  checkAuthorScriptLibrary(state.sharedScripts)
  const before = structuredClone(state)
  const included = collectBattleDataReferences(state, 'poison')
  const excluded = collectBattleDataReferences(state, 'poison', { includeScriptCommands: false })
  expect(excluded).toEqual([
    {
      target: 'poison',
      targetId: '9',
      kind: 'skill-poison',
      label: `技能 ${state.skills[0]!.name}`,
      where: `skills[0](${state.skills[0]!.id}).effects[0].poisonId`,
      detail: '施加毒',
      locator: { kind: 'skill', skillId: state.skills[0]!.id },
    },
  ])
  expect(included.filter((entry) => entry.kind === 'command-actor-condition-poison')).toEqual([
    {
      target: 'poison',
      targetId: '9',
      kind: 'command-actor-condition-poison',
      label: '共享脚本 Dose',
      where: 'sharedScripts.dose.body[0].condition.poisonId',
      detail: '剧情施毒或指定解毒',
      locator: { kind: 'shared-script', scriptId: 'dose' },
    },
  ])
  expect(included.filter((entry) => entry.kind !== 'command-actor-condition-poison')).toEqual(
    excluded,
  )
  expect(state).toEqual(before)
})
test('enemy team references preserve repeated enemy slots separately rather than deduplicating by target', async () => {
  const { state } = await referenceProject()
  state.enemyTeams = [{ id: 'practice', slots: ['dummy', null, 'dummy', null, null] }]
  const before = structuredClone(state)
  expect(collectBattleDataReferences(state, 'enemy')).toEqual([
    {
      target: 'enemy',
      targetId: 'dummy',
      kind: 'enemy-team-slot',
      label: '敌队 practice',
      where: 'enemyTeams[0](practice).slots[0]',
      detail: '敌队槽位 1',
      locator: { kind: 'enemy-team', enemyTeamId: 'practice' },
    },
    {
      target: 'enemy',
      targetId: 'dummy',
      kind: 'enemy-team-slot',
      label: '敌队 practice',
      where: 'enemyTeams[0](practice).slots[2]',
      detail: '敌队槽位 3',
      locator: { kind: 'enemy-team', enemyTeamId: 'practice' },
    },
  ])
  expect(state).toEqual(before)
})
