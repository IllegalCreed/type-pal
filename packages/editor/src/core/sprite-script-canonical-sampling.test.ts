import type { AuthorCommand, AuthorScriptLibrary } from '@type-pal/content'
import { expect, test } from 'vitest'
import { LANTERN, loadScriptedSpritePreview } from './__tests__/scripted-sprite-preview-fixture.js'
import type { SpriteReferenceBehavior } from './world-sprite-behavior.js'

const frame = (frame: number): AuthorCommand => ({ kind: 'setEntityFrame', target: LANTERN, frame })
const finish: AuthorCommand = { kind: 'finishStep', next: { kind: 'complete' } }

async function sample(name: string, body: AuthorCommand[], shared: AuthorScriptLibrary = {}) {
  const { behavior } = await loadScriptedSpritePreview(
    name,
    { kind: 'stages', initial: 'watch', stages: [{ id: 'watch', body }] },
    shared,
  )
  return behavior
}

function representative(behavior: SpriteReferenceBehavior) {
  if (behavior.preview?.kind !== 'variants') throw new Error('Expected representative frame paths')
  return behavior.preview.variants
}

test('a shared script with required self samples the addressed scene instance and retains the caller tail', async () => {
  const result = await sample(
    'bound-shared-sprite-preview',
    [{ kind: 'callScript', script: 'turn' }, frame(5), finish],
    {
      turn: {
        name: '转身',
        self: 'required',
        body: [
          { kind: 'setEntityFacing', target: 'self', facing: 'left' },
          { kind: 'setEntityFrame', target: 'self', frame: 4 },
          { kind: 'wait', ms: 180 },
          { kind: 'returnScript' },
          frame(7),
        ],
      },
    },
  )
  expect(representative(result).map(({ steps }) => steps)).toEqual([
    [
      { frame: 4, holdMs: 180 },
      { frame: 5, holdMs: 200 },
    ],
  ])
  expect(result.detail).toContain('代表性合法分支示例')
})

test.each([
  { chance: 0, expected: 6 },
  { chance: 100, expected: 5 },
])('fixed chance $chance yields the selected frame $expected as a complete cycle', async ({
  chance,
  expected,
}) => {
  const result = await sample('fixed-chance-sprite-preview', [
    {
      kind: 'branch',
      cond: { kind: 'chance', percent: chance },
      then: [frame(5)],
      else: [frame(6)],
    },
  ])
  expect(result.preview).toEqual({
    kind: 'cycle',
    mode: 'explicit',
    intro: [],
    cycle: [{ frame: expected, holdMs: 200 }],
  })
  expect(result.detail).toBe(`检测到 #${expected}；速度与分支以脚本为准`)
})

test('compound constant conditions control the selected frames without claiming every branch', async () => {
  const result = await sample('compound-sprite-preview-conditions', [
    {
      kind: 'branch',
      cond: {
        kind: 'all',
        of: [
          { kind: 'chance', percent: 100 },
          { kind: 'not', cond: { kind: 'chance', percent: 0 } },
        ],
      },
      then: [frame(1)],
      else: [frame(7)],
    },
    {
      kind: 'branch',
      cond: {
        kind: 'any',
        of: [
          { kind: 'chance', percent: 0 },
          { kind: 'chance', percent: 100 },
        ],
      },
      then: [frame(3)],
    },
    {
      kind: 'branch',
      cond: {
        kind: 'all',
        of: [
          { kind: 'chance', percent: 100 },
          { kind: 'chance', percent: 0 },
        ],
      },
      then: [frame(6)],
    },
    finish,
  ])
  expect(representative(result).map(({ steps }) => steps.map(({ frame }) => frame))).toEqual([
    [1, 3],
  ])
})

test('a named continue targets the outer repeat and leaves its subsequent operation reachable', async () => {
  const result = await sample('continue-sprite-frame-repeat', [
    {
      kind: 'repeat',
      id: 'outer',
      count: 3,
      body: [
        {
          kind: 'repeat',
          count: 2,
          body: [
            { kind: 'animEntity', target: LANTERN },
            { kind: 'wait', ms: 100 },
            { kind: 'continueLoop', loop: 'outer' },
            frame(6),
          ],
        },
        frame(7),
      ],
    },
    frame(4),
    { kind: 'wait', ms: 100 },
    finish,
  ])
  expect(representative(result).map(({ steps }) => steps)).toEqual([
    [1, 2, 3, 4].map((frame) => ({ frame, holdMs: 100 })),
  ])
})

test('a local break exits its loop and lets the current stage finish with the next frame', async () => {
  const result = await sample('break-sprite-frame-loop', [
    {
      kind: 'loop',
      mode: 'while',
      cond: { kind: 'chance', percent: 100 },
      body: [frame(1), { kind: 'breakLoop' }, frame(7)],
    },
    frame(2),
    finish,
  ])
  expect(representative(result).map(({ steps }) => steps.map(({ frame }) => frame))).toEqual([
    [1, 2],
  ])
})

test('a false while condition skips its body and shows the next authored frame', async () => {
  const result = await sample('skip-sprite-frame-loop', [
    {
      kind: 'loop',
      mode: 'while',
      cond: { kind: 'chance', percent: 0 },
      body: [frame(5)],
    },
    frame(6),
    finish,
  ])
  expect(representative(result).map(({ steps }) => steps.map(({ frame }) => frame))).toEqual([[6]])
})

test.each([
  'while',
  'until',
] as const)('a conditional %s loop yields bounded examples with the correct first visit', async (mode) => {
  const result = await sample('conditional-sprite-frame-loop', [
    {
      kind: 'loop',
      mode,
      cond: { kind: 'chance', percent: 50 },
      body: [frame(1), { kind: 'wait', ms: 100 }],
    },
    frame(2),
    { kind: 'wait', ms: 100 },
    finish,
  ])
  const paths = representative(result)
  expect(result.detail).toContain('不是唯一循环')
  expect(paths.some(({ steps }) => steps.at(-1)?.frame === 2)).toBe(true)
  if (mode === 'until') expect(paths.every(({ steps }) => steps[0]?.frame === 1)).toBe(true)
  else expect(paths.some(({ steps }) => steps[0]?.frame === 2)).toBe(true)
  expect(paths.some(({ note }) => note?.includes('前一部分'))).toBe(true)
})

test('a frame before an unending control loop remains a labeled partial prefix', async () => {
  const result = await sample('sprite-loop-with-partial-frame', [
    frame(1),
    { kind: 'loop', mode: 'forever', body: [{ kind: 'continueLoop' }] },
  ])
  expect(representative(result).map(({ steps }) => steps)).toEqual([[{ frame: 1, holdMs: 200 }]])
  expect(representative(result)[0]?.note).toContain('前一部分')
})

test('canonical sampling keeps explicit frame overrides and accumulates waits before finishing', async () => {
  const result = await sample('sprite-preview-frame-override', [
    { kind: 'animEntity', target: LANTERN },
    { kind: 'wait', ms: 120 },
    frame(3),
    { kind: 'animEntity', target: LANTERN },
    { kind: 'wait', ms: 20 },
    { kind: 'wait', ms: 30 },
    frame(9),
    { kind: 'wait', ms: 90 },
    finish,
  ])
  expect(representative(result).map(({ steps }) => steps)).toEqual([
    [
      { frame: 1, holdMs: 120 },
      { frame: 3, holdMs: 60 },
      { frame: 0, holdMs: 90 },
    ],
  ])
})

test('a frame change to another actual entity and nonvisual side effects stay explicitly unavailable', async () => {
  const paths: AuthorCommand[][] = [
    [frame(1), { kind: 'setEntityFrame', target: { scene: 'start', entity: 'brazier' }, frame: 2 }],
    [frame(1), { kind: 'giveMoney', delta: 5 }],
    [frame(1), { kind: 'confirm', onYes: [frame(2)], onNo: [frame(3)] }],
  ]
  for (const body of paths) {
    const result = await sample('conservative-sprite-preview', body)
    expect(result).toEqual({
      kind: 'script',
      label: '自动行为脚本',
      detail: '移动、显隐或帧切换由这个场景实例的脚本决定',
      preview: { kind: 'unavailable', reason: '脚本含无法安全展开的控制流或副作用' },
    })
  }
})

test('an exact current stage completion is displayed once with the final authored completion edge', async () => {
  const { behavior } = await loadScriptedSpritePreview('completed-sprite-preview-stage', {
    kind: 'stages',
    initial: 'second',
    stages: [
      { id: 'first', body: [frame(7)] },
      { id: 'second', body: [frame(2), frame(4)], next: { kind: 'complete' } },
    ],
  })
  expect(behavior.preview).toEqual({
    kind: 'once',
    steps: [
      { frame: 2, holdMs: 200 },
      { frame: 4, holdMs: 200 },
    ],
  })
  expect(behavior.detail).toBe('执行 #2 → #4 后完成，不循环')
})

test('a fixed repeat and a later page selection keep the current visible cycle', async () => {
  const result = await sample('fixed-sprite-preview-repeat', [
    {
      kind: 'repeat',
      count: 2,
      body: [frame(1), { kind: 'wait', ms: 100 }, frame(2), { kind: 'wait', ms: 120 }],
    },
    { kind: 'selectEntityPage', target: LANTERN, selection: { kind: 'use', value: 'default' } },
  ])
  expect(result.preview).toEqual({
    kind: 'cycle',
    mode: 'explicit',
    intro: [],
    cycle: [
      { frame: 1, holdMs: 100 },
      { frame: 2, holdMs: 120 },
    ],
  })
})

test('the named initial stage and transitions determine the visible loop order', async () => {
  const { behavior } = await loadScriptedSpritePreview('sprite-preview-stage-order', {
    kind: 'stages',
    initial: 'second',
    stages: [
      { id: 'first', body: [frame(1), { kind: 'wait', ms: 90 }], next: 'second' },
      { id: 'second', body: [frame(2), { kind: 'wait', ms: 150 }], next: 'first' },
    ],
  })
  expect(behavior.preview).toEqual({
    kind: 'cycle',
    mode: 'explicit',
    intro: [],
    cycle: [
      { frame: 2, holdMs: 150 },
      { frame: 1, holdMs: 90 },
    ],
  })
})

test('a large finite repeat keeps a bounded prefix and omits the frame after the repeat', async () => {
  const result = await sample('large-sprite-preview-repeat', [
    frame(1),
    { kind: 'repeat', count: 5000, body: [frame(2), { kind: 'wait', ms: 100 }] },
    frame(7),
    finish,
  ])
  expect(representative(result).map(({ steps }) => steps.map(({ frame }) => frame))).toEqual([
    [1, 2],
  ])
  expect(representative(result)[0]?.note).toContain('前一部分')
})

test('a recursive background call without a visible step has no inferred frame', async () => {
  const result = await sample(
    'recursive-sprite-preview-call',
    [{ kind: 'callScript', script: 'first' }],
    {
      first: { name: '第一段', self: 'none', body: [{ kind: 'callScript', script: 'second' }] },
      second: { name: '第二段', self: 'none', body: [{ kind: 'callScript', script: 'first' }] },
    },
  )
  expect(result.preview).toEqual({
    kind: 'unavailable',
    reason: '暂时无法推断这段脚本的帧序，请到场景中播放确认。',
  })
})
