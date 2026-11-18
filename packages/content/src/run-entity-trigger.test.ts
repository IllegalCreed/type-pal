import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  type AuthorCommand,
  checkAuthorCommands,
  checkAuthorEntityBehaviors,
  checkAuthorScriptFlow,
} from './author-script.js'

function trigger() {
  return {
    kind: 'runEntityTrigger',
    target: { scene: 'room', entity: 'npc' },
  } satisfies AuthorCommand
}

test('an interactive trigger call carries an explicit stable address and no scheme selection', () => {
  const command = trigger()
  const before = deepSnapshot(command)
  checkAuthorCommands([command], 'commands')
  expect(command).toEqual(before)

  const cases = [
    [{ ...command, entity: 'npc' }, 'commands[0].entity: 未知字段'],
    [{ ...command, selection: 'other' }, 'commands[0].selection: 未知字段'],
    [{ ...command, target: 'npc' }, 'commands[0].target: 期望对象'],
  ] as const
  for (const [value, message] of cases)
    expect(() => checkAuthorCommands([value], 'commands')).toThrow(new Error(message))
})

test('automatic behavior and hidden entry preparation cannot start an interactive trigger', () => {
  const command = trigger()
  const flow = { kind: 'stages', initial: 'first', stages: [{ id: 'first', body: [command] }] }
  const behavior = { label: '交谈', order: 0, flow }
  checkAuthorEntityBehaviors({ trigger: { talk: behavior } }, 'npc')
  expect(() => checkAuthorEntityBehaviors({ auto: { talk: behavior } }, 'npc')).toThrow(
    new Error(
      'npc.behaviors.auto.talk.flow.stages[0].body[0]: auto 禁止 runEntityTrigger，仅允许 interactive',
    ),
  )
  expect(() =>
    checkAuthorScriptFlow(
      {
        ...flow,
        stages: [{ id: 'first', body: [], entry: { prepare: [command], reveal: { kind: 'cut' } } }],
      },
      'flow',
      { allowSceneEntry: true },
    ),
  ).toThrow(
    new Error('flow.stages[0].entry.prepare[0]: prepare 禁止 runEntityTrigger，仅允许 interactive'),
  )
})
