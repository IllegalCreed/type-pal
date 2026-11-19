import { expect, test } from 'vitest'
import { createEnemyReferenceProject } from './__tests__/reference-project.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { AuthorEnemyDef } from './author-enemy.js'
import { validateAuthorEnemies } from './validate-author.js'

const dialogueRoutes = ['ready', 'turnStart', 'onDefeated', 'choreography'] as const

function enemyWithDialogue(route: (typeof dialogueRoutes)[number]) {
  const { enemy: definition } = createEnemyReferenceProject()
  const enemy: AuthorEnemyDef = {
    ...definition,
    ai: { resistanceToSorcery: definition.ai.resistanceToSorcery },
    choreography: undefined,
    onDefeated: undefined,
  }
  const cue = { identity: { kind: 'narration' as const }, rows: [{ text: 'line.warning' }] }
  const dialogue = { kind: 'dialog' as const, cue }
  if (route === 'onDefeated') {
    enemy.onDefeated = [dialogue]
  } else if (route === 'choreography') {
    enemy.choreography = [
      {
        at: 'battleStart',
        once: true,
        body: [dialogue, { kind: 'playSound', asset: 'sound.warn' }],
      },
    ]
  } else {
    enemy.ai.hooks = {
      [route]: {
        initial: 'warn',
        states: {
          warn: {
            body: [dialogue, { kind: 'playSound', asset: 'sound.warn' }],
            next: { kind: 'stay' },
          },
        },
      },
    }
  }
  return { enemy, cue, dialogue }
}

test.each([
  ['ready', 'enemies[0].ai.hooks.ready.states.warn.body[0].cue.identity'],
  ['turnStart', 'enemies[0].ai.hooks.turnStart.states.warn.body[0].cue.identity'],
  ['onDefeated', 'enemies[0].onDefeated[0].cue.identity'],
  ['choreography', 'enemies[0].choreography[0].body[0].cue.identity'],
] as const)('validates author identity through the enemy %s route', (route, path) => {
  const { enemy, cue } = enemyWithDialogue(route)
  const complete = deepSnapshot(enemy)
  expect(validateAuthorEnemies([enemy])).toEqual([complete])
  expect(enemy).toEqual(complete)

  Reflect.deleteProperty(cue, 'identity')
  const before = deepSnapshot(enemy)
  expect(() => validateAuthorEnemies([enemy])).toThrow(new Error(`${path}: 期望对象`))
  expect(enemy).toEqual(before)
})

test.each([
  ['ready', 'enemies[0].ai.hooks.ready.states.warn.body[0].kind'],
  ['choreography', 'enemies[0].choreography[0].body[0].kind'],
] as const)('rejects an unknown action specifically in the enemy %s route', (route, path) => {
  const { enemy, dialogue } = enemyWithDialogue(route)
  validateAuthorEnemies([enemy])
  Reflect.set(dialogue, 'kind', 'unknownAction')
  const before = deepSnapshot(enemy)
  expect(() => validateAuthorEnemies([enemy])).toThrow(
    new Error(`${path}: battle context 不支持动作 unknownAction`),
  )
  expect(enemy).toEqual(before)
})

test('validates both arms of a defeated script and the flag condition in a nested branch', () => {
  const { enemy, dialogue } = enemyWithDialogue('onDefeated')
  const condition = { kind: 'flag' as const, flag: 'rewarded', is: false }
  enemy.onDefeated = [
    {
      kind: 'branch',
      cond: condition,
      then: [
        {
          kind: 'branch',
          cond: { kind: 'all', of: [{ kind: 'flag', flag: 'battle-ready', is: true }] },
          then: [dialogue],
          else: [{ kind: 'playSound', asset: 'sound.quiet' }],
        },
      ],
      else: [{ kind: 'wait', ms: 120 }],
    },
  ]
  const complete = deepSnapshot(enemy)
  expect(validateAuthorEnemies([enemy])).toEqual([complete])
  Reflect.set(condition, 'is', 'no')
  const before = deepSnapshot(enemy)
  expect(() => validateAuthorEnemies([enemy])).toThrow(
    new Error('enemies[0].onDefeated[0].cond.is: 期望 boolean'),
  )
  expect(enemy).toEqual(before)
})
