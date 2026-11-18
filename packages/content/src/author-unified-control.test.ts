import { expect, test } from 'vitest'
import { expectExactError } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
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

test('a retired state machine is rejected at its former container', () => {
  expectExactError(
    () => checkBaseScriptFlow({ kind: 'stateMachine', machine: {} }, 'flow'),
    'flow.machine: 未知字段',
  )
})

test.each([
  [{ kind: 'stopScript' }, 'flow.stages[0].body[0].kind: 未知或已退役的 author 命令 stopScript'],
  [{ kind: 'confirm', id: 'answer', onYes: [], onNo: [] }, 'flow.stages[0].body[0].id: 未知字段'],
  [
    {
      kind: 'selectEntityBehavior',
      target: { scene: 's', entity: 'e' },
      channel: 'auto',
      selection: { kind: 'use', value: 'b' },
      cursorHandoff: {},
    },
    'flow.stages[0].body[0].cursorHandoff: 未知字段',
  ],
])('rejects retired command fields at their stage body: %j', (command, message) => {
  expectExactError(() => checkBaseScriptFlow(sample([command]), 'flow'), message)
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

test('completion discovery considers nested exits and step edges but not an empty body', () => {
  const empty = sample([])
  const nestedExit = sample([
    { kind: 'confirm', onYes: [{ kind: 'finishStep', next: { kind: 'complete' } }], onNo: [] },
  ])
  const stepEdge = sample([], { kind: 'complete' })
  checkBaseScriptFlow(empty, 'flow')
  checkBaseScriptFlow(nestedExit, 'flow')
  checkBaseScriptFlow(stepEdge, 'flow')
  expect(flowCanComplete(empty)).toBe(false)
  expect(flowCanComplete(nestedExit)).toBe(true)
  expect(flowCanComplete(stepEdge)).toBe(true)
})

test.each([
  [
    { kind: 'finishStep', next: { kind: 'complete' } },
    'flow.stages[0].entry.prepare[0]: finishStep 仅允许步骤正文',
  ],
  [{ kind: 'returnScript' }, 'flow.stages[0].entry.prepare[0]: returnScript 仅允许独立脚本根'],
] as const)('entry preparation rejects %j in its own scope', (command, message) => {
  const flow = sample([])
  Object.assign(flow.stages[0]!, { entry: { prepare: [command], reveal: { kind: 'cut' } } })
  expectExactError(() => checkBaseScriptFlow(flow, 'flow', { allowSceneEntry: true }), message)
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

test.each([
  [
    { kind: 'state', machine: 'm', state: 'old' },
    {},
    'world.script.behaviors.entities.s.e.auto.cursor.at.kind: 期望 stage|completed',
  ],
  [
    { kind: 'stage', stage: 'first' },
    { outcomes: {} },
    'world.script.behaviors.entities.s.e.auto.cursor.resume.outcomes: 未知字段',
  ],
] as const)('saved cursors reject retired addresses or results: %j', (at, extra, message) => {
  const world = {
    ...emptyWorldScriptState(),
    behaviors: {
      entities: {
        s: {
          e: {
            auto: {
              cursor: {
                behavior: 'b',
                at,
                resume: { digest: 'a'.repeat(64), frames: [{ index: 0 }], ...extra },
              },
            },
          },
        },
      },
    },
  }
  expectExactError(() => checkWorldScriptState(world), message)
})
