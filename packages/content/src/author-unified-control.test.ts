import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import {
  checkBaseAuthorCommands,
  checkBaseScriptFlow,
  checkBaseScriptLibrary,
  checkWorldScriptState,
  emptyWorldScriptState,
  flowCanComplete,
} from './author-script-core.js'

const sample = (body: unknown[], next?: unknown) => ({
  kind: 'stages',
  initial: 'first',
  stages: [
    { id: 'first', body, ...(next === undefined ? {} : { next }) },
    { id: 'repeat', body: [] },
  ],
})

test('only ordinary steps are accepted; old machine and timing controls cannot enter current content', () => {
  expect(() => checkBaseScriptFlow({ kind: 'stateMachine', machine: {} }, 'flow')).toThrow()
  for (const command of [
    { kind: 'stopScript' },
    { kind: 'confirm', id: 'answer', onNo: [] },
    {
      kind: 'loop',
      mode: 'until',
      cond: { kind: 'chance', percent: 50 },
      body: [],
      yield: 'worldTick',
      maxIterations: 3,
    },
    {
      kind: 'selectEntityBehavior',
      target: { scene: 's', entity: 'e' },
      channel: 'auto',
      selection: { kind: 'use', value: 'b' },
      cursorHandoff: {},
    },
  ])
    expect(() => checkBaseScriptFlow(sample([command]), 'flow')).toThrow()
})

test.each([
  'stay',
  'complete',
  'stage',
] as const)('finishStep %s is valid only within its owning flow root', (kind) => {
  const command = {
    kind: 'finishStep',
    next: kind === 'stage' ? { kind, stage: 'repeat' } : { kind },
  }
  expect(() =>
    checkBaseScriptFlow(sample([{ kind: 'confirm', onYes: [command], onNo: [] }]), 'flow'),
  ).not.toThrow()
  expect(() => checkBaseAuthorCommands([command], 'script')).toThrow(/步骤正文/)
  expect(() =>
    checkBaseScriptLibrary({ part: { name: 'Part', self: 'required', body: [command] } }),
  ).toThrow(/步骤正文/)
})

test('completion discovery includes nested explicit exits but never guesses completion from empty bodies', () => {
  expect(
    flowCanComplete({
      kind: 'stages',
      stages: [
        {
          body: [
            {
              kind: 'confirm',
              onYes: [{ kind: 'finishStep', next: { kind: 'complete' } }],
              onNo: [],
            },
          ],
        },
      ],
    }),
  ).toBe(true)
  expect(flowCanComplete({ kind: 'stages', stages: [{ body: [] }] })).toBe(false)
})

test('entry preparation has no owner-step exits or private returns', () => {
  for (const command of [
    { kind: 'finishStep', next: { kind: 'complete' } },
    { kind: 'returnScript' },
  ]) {
    const flow = sample([])
    Object.assign(flow.stages[0]!, { entry: { prepare: [command], reveal: { kind: 'cut' } } })
    expect(() => checkBaseScriptFlow(flow, 'flow', { allowSceneEntry: true })).toThrow()
  }
})

test('loop ids are lexical stable identities, never indices or generic jump labels', () => {
  const body = [
    {
      kind: 'repeat',
      id: 'attempt',
      label: '重试动作',
      count: 3,
      body: [{ kind: 'loop', mode: 'forever', body: [{ kind: 'continueLoop', loop: 'attempt' }] }],
    },
  ]
  const before = deepSnapshot(body)
  expect(() => checkBaseScriptFlow(sample(body), 'flow')).not.toThrow()
  expect(body).toEqual(before)
  expect(() =>
    checkBaseScriptFlow(
      sample([
        { kind: 'repeat', id: 'earlier', count: 1, body: [] },
        { kind: 'continueLoop', loop: 'earlier' },
      ]),
      'flow',
    ),
  ).toThrow(/祖先/)
  expect(() =>
    checkBaseScriptFlow(
      sample([
        { kind: 'repeat', id: 'same', count: 1, body: [] },
        { kind: 'repeat', id: 'same', count: 1, body: [] },
      ]),
      'flow',
    ),
  ).toThrow(/重复循环/)
  expect(() =>
    checkBaseScriptLibrary({
      part: { name: 'Part', self: 'optional', body: [{ kind: 'continueLoop', loop: 'attempt' }] },
    }),
  ).toThrow(/祖先/)
})

test.each([
  0,
  -1,
  1.5,
  Number.MAX_SAFE_INTEGER + 1,
])('repeat rejects invalid exact count %s', (count) => {
  expect(() => checkBaseScriptFlow(sample([{ kind: 'repeat', count, body: [] }]), 'flow')).toThrow(
    /正安全整数/,
  )
})

test('new saved cursors cannot carry a retired state address or result-ID map', () => {
  for (const at of [
    { kind: 'state', machine: 'm', state: 'old' },
    { kind: 'stage', stage: 'first' },
  ]) {
    const world = emptyWorldScriptState()
    Object.assign(world.behaviors, {
      entities: {
        s: {
          e: {
            auto: {
              cursor: {
                behavior: 'b',
                at,
                resume: { digest: 'a'.repeat(64), frames: [{ index: 0 }], outcomes: {} },
              },
            },
          },
        },
      },
    })
    expect(() => checkWorldScriptState(world)).toThrow()
  }
})
