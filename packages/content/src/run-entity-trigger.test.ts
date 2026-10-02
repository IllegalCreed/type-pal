import { expect, test } from 'vitest'
import {
  checkBaseAuthorCommands,
  checkBaseEntityBehaviors,
  checkBaseScriptFlow,
} from './author-script-core.js'

const target = { scene: 'room', entity: 'npc' }
const command = { kind: 'runEntityTrigger', target }
test('explicit entity trigger is a strict current address-only command', () => {
  expect(() => checkBaseAuthorCommands([command], 'commands')).not.toThrow()
  for (const value of [
    { ...command, entity: 'npc' },
    { ...command, selection: 'other' },
    { ...command, target: 'npc' },
  ])
    expect(() => checkBaseAuthorCommands([value], 'commands')).toThrow()
})
test('automatic and scene-entry prepare cannot start an interactive entity flow', () => {
  const flow = { kind: 'stages', initial: 'first', stages: [{ id: 'first', body: [command] }] }
  expect(() =>
    checkBaseEntityBehaviors({ auto: { loop: { label: 'loop', order: 0, flow } } }, 'npc'),
  ).toThrow(/runEntityTrigger.*interactive|interactive.*runEntityTrigger/)
  expect(() =>
    checkBaseScriptFlow(
      {
        ...flow,
        stages: [{ id: 'first', body: [], entry: { prepare: [command], reveal: { kind: 'cut' } } }],
      },
      'flow',
      { allowSceneEntry: true },
    ),
  ).toThrow(/prepare.*runEntityTrigger|runEntityTrigger.*prepare/)
})
