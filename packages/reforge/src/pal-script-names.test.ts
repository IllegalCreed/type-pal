import { validateAuthorScenes } from '@type-pal/content'
import { expect, test } from 'vitest'
import opening from '../../../projects/pal/content/scenes/s000.json' with { type: 'json' }
import room from '../../../projects/pal/content/scenes/s001.json' with { type: 'json' }
import inn from '../../../projects/pal/content/scenes/s003.json' with { type: 'json' }

const scenes = validateAuthorScenes([opening, room, inn])

test.each([
  ['e59', '接待结束：苗人头领进房', '走到房门，切换房内头领'],
  ['e60', '接待结束：苗人随从开门进房', '开门进房，切换房内随从'],
  ['e61', '接待结束：苗人随从跟随进房', '跟随进房，切换房内随从'],
])('RF002 %s room entry has a plot name on its existing stable behavior and step', (id, name, stepName) => {
  const behavior = scenes[2]!.entities.find((entity) => entity.id === id)!.behaviors!.auto![
    'legacy-003'
  ]!
  expect(behavior.label).toBe(name)
  expect(behavior.order).toBe(3)
  if (behavior.flow.kind !== 'stages') throw new Error('expected one room-entry step')
  expect(behavior.flow.initial).toBe('initial')
  expect(behavior.flow.stages).toHaveLength(1)
  expect(behavior.flow.stages[0]).toMatchObject({
    id: 'initial',
    label: stepName,
    next: { kind: 'complete' },
  })
})

test('reviewed opening and inn first/repeat steps have purpose names rather than technical IDs', () => {
  for (const scene of scenes.slice(0, 2)) {
    const flow = scene.hooks!.onEnter!.variants.default!.flow
    if (flow.kind !== 'stages') throw new Error('expected opening stages')
    expect(flow.stages[0]?.label).toMatch(/梦|叫醒/)
  }
  for (const [entityId, channel, behaviorId] of [
    ['e56', 'trigger', 'default'],
    ['e56', 'trigger', 'greet-after-guests'],
    ['e56', 'auto', 'legacy-006'],
    ['e56', 'auto', 'go-to-kitchen'],
    ['e62', 'trigger', 'beggar-first-talk'],
    ['e62', 'auto', 'default'],
  ] as const) {
    const flow = scenes[2]!.entities.find((entity) => entity.id === entityId)!.behaviors![channel]![
      behaviorId
    ]!.flow
    if (flow.kind !== 'stages') throw new Error('expected reviewed stages')
    for (const stage of flow.stages) {
      expect(stage.label?.trim(), `${entityId}/${channel}/${behaviorId}/${stage.id}`).toBeTruthy()
      expect(stage.label).not.toBe(stage.id)
      expect(stage.label).not.toMatch(/^(步骤|状态|自动行为|触发行为)\s*\d/)
    }
  }
})
