import { describe, test } from 'vitest'
import { expectAcceptsUnchanged, expectRejectUnchanged } from './__tests__/validation-assertions.js'
import { type Command, checkStages, type ScriptStage } from './script.js'

function stageWithPreparation(prepare: Command[]): ScriptStage {
  return {
    body: [{ kind: 'dialog', cue: { rows: [{ text: 'We have arrived.' }] } }],
    entry: { prepare, reveal: { kind: 'dither', ms: 0, source: 'previousPresentedFrame' } },
  }
}

const validateOnEnter = (stages: unknown) =>
  checkStages(stages, 'scene.onEnter', { allowSceneEntry: true })

describe('scene entry before revealing the target world', () => {
  test('permits entry body overlap only during an explicit fade', () => {
    const stage = stageWithPreparation([])
    const withReveal = (reveal: unknown) => [{ ...stage, entry: { prepare: [], reveal } }]
    expectAcceptsUnchanged(
      validateOnEnter,
      withReveal({ kind: 'fade', outMs: 80, inMs: 120, withBody: true }),
    )
    expectRejectUnchanged(
      validateOnEnter,
      withReveal(null),
      'scene.onEnter[0].entry.reveal: 期望对象',
    )
    for (const reveal of [
      { kind: 'fade', outMs: 80, inMs: 120, withBody: false },
      { kind: 'dither', ms: 120, source: 'previousPresentedFrame', withBody: true },
    ]) {
      expectRejectUnchanged(
        validateOnEnter,
        withReveal(reveal),
        'scene.onEnter[0].entry.reveal.withBody: 仅淡入允许指定 true',
      )
    }
  })

  test('accepts position, facing, state, inventory, flags and a short wait before reveal', () => {
    const stages = [
      stageWithPreparation([
        { kind: 'setEntityState', entity: 'guard', state: 1 },
        { kind: 'setEntityFacing', entity: 'guard', facing: 'down' },
        { kind: 'setEntityPos', entity: 'guard', pos: { col: 1, row: 2, height: 0 } },
        { kind: 'giveItem', itemId: 'medicine', count: 1 },
        { kind: 'setFlag', flag: 'arrived', value: true },
        { kind: 'teleportParty', pos: { col: 2, row: 3, height: 0 } },
        { kind: 'wait', ms: 100 },
      ]),
    ]
    expectAcceptsUnchanged(validateOnEnter, stages)
  })

  test.each<Command>([
    { kind: 'loadScene', scene: 'next-scene', entryId: 'default' },
    { kind: 'fade', dir: 'out' },
    { kind: 'startBattle', enemyTeamId: 'guard-team' },
    { kind: 'openShop', shop: 1, mode: 'buy' },
    { kind: 'dialog', cue: { rows: [{ text: 'We have arrived.' }] } },
  ])('rejects $kind while the target world is still hidden', (command) => {
    expectAcceptsUnchanged(validateOnEnter, [stageWithPreparation([])])
    expectRejectUnchanged(
      validateOnEnter,
      [stageWithPreparation([command])],
      `scene.onEnter[0].entry.prepare[0]: 命令 ${command.kind} 不允许在隐藏目标画面时执行`,
    )
  })

  test('reports reveal timing and an unsupported reveal kind at the exact field', () => {
    const stage = stageWithPreparation([])
    expectAcceptsUnchanged(validateOnEnter, [stage])
    expectRejectUnchanged(
      validateOnEnter,
      [{ ...stage, entry: { prepare: [], reveal: { kind: 'fade', outMs: -1, inMs: 1 } } }],
      'scene.onEnter[0].entry.reveal.outMs: 期望非负有限数',
    )
    expectRejectUnchanged(
      validateOnEnter,
      [{ ...stage, entry: { prepare: [], reveal: { kind: 'wipe' } } }],
      'scene.onEnter[0].entry.reveal.kind: 期望 dither|fade|cut',
    )
  })
})
