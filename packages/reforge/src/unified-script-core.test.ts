import {
  checkRuntimeCommands,
  checkRuntimeScriptFlow,
  type FlowCursor,
  flowCanComplete,
  type RuntimeCommand,
  type RuntimeScriptFlow,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import { fixture as projectFixture } from './__tests__/save-lineage-fixture.js'
import {
  compileRuntimeCommandRoot,
  compileRuntimeScriptFlow,
  RuntimeSharedScriptResolver,
} from './runtime-script-compiler.js'
import { RuntimeScriptRunner, type ScriptRuntimeHost } from './runtime-script-runner.js'
import { ScriptExecutionBudget, ScriptExecutionBudgets } from './script-execution-budget.js'

const digest = 'd'.repeat(64)
function flow(body: RuntimeCommand[]): RuntimeScriptFlow {
  return {
    kind: 'stages',
    initial: 'first',
    stages: [
      { id: 'first', body, next: 'repeat' },
      { id: 'repeat', body: [] },
    ],
  }
}
function fixture(overrides: Partial<ScriptRuntimeHost> = {}, budget = new ScriptExecutionBudget()) {
  let now = 0
  const effects: RuntimeCommand[] = []
  const cursors: FlowCursor[] = []
  const controller = new AbortController()
  const host: ScriptRuntimeHost = {
    execute(command) {
      effects.push(command)
      if (command.kind === 'wait') now += command.ms
    },
    gameplayNow: () => now,
    evalCondition: () => false,
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => true,
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
    ...overrides,
  }
  const cursorController = {
    reachSafePoint(cursor: FlowCursor) {
      cursors.push(cursor)
      return 'continue' as const
    },
  }
  return {
    host,
    effects,
    cursors,
    controller,
    cursorController,
    run: (source: RuntimeScriptFlow, timing: 'auto' | 'interactive' = 'interactive') =>
      new RuntimeScriptRunner(host, controller.signal, undefined, budget).runFlow(
        compileRuntimeScriptFlow(source, { timing, canonicalContentDigest: digest }),
        { cursorController },
      ),
  }
}

// Replaces old machine-transition/organizer fixtures with actual author-level contracts.
test.each([
  [{ kind: 'stay' }, { kind: 'stage', stage: 'first' }],
  [
    { kind: 'stage', stage: 'repeat' },
    { kind: 'stage', stage: 'repeat' },
  ],
  [{ kind: 'complete' }, { kind: 'completed' }],
] as const)('finishStep %j short-circuits the body and commits exactly once', async (next, cursor) => {
  const f = fixture()
  const source = flow([
    { kind: 'giveMoney', delta: 1 },
    { kind: 'finishStep', next },
    { kind: 'giveMoney', delta: 999 },
  ])
  await f.run(source)
  expect(f.effects).toEqual([{ kind: 'giveMoney', delta: 1 }])
  expect(f.cursors).toEqual([cursor])
  expect(flowCanComplete(source)).toBe(next.kind === 'complete')
})

test('lexical root validation rejects crossing script roots and non-ancestor targets', () => {
  expect(() =>
    checkRuntimeCommands([{ kind: 'finishStep', next: { kind: 'stay' } }], 'private'),
  ).toThrow(/步骤正文/)
  expect(() => checkRuntimeScriptFlow(flow([{ kind: 'returnScript' }]), 'flow')).toThrow(/脚本根/)
  expect(() =>
    checkRuntimeScriptFlow(
      flow([{ kind: 'finishStep', next: { kind: 'stage', stage: 'missing' } }]),
      'flow',
    ),
  ).toThrow(/未命中/)
  expect(() => checkRuntimeCommands([{ kind: 'breakLoop' }], 'private')).toThrow(/循环/)
  expect(() =>
    checkRuntimeScriptFlow(
      flow([
        { kind: 'continueLoop', loop: 'later' },
        { kind: 'repeat', id: 'later', count: 1, body: [] },
      ]),
      'flow',
    ),
  ).toThrow(/祖先/)
  expect(() =>
    checkRuntimeScriptFlow(
      flow([
        {
          kind: 'repeat',
          id: 'same',
          count: 1,
          body: [{ kind: 'repeat', id: 'same', count: 1, body: [] }],
        },
      ]),
      'flow',
    ),
  ).toThrow(/重复循环/)
})

test.each([
  true,
  false,
])('confirm selects only its explicit %s arm without result IDs', async (answer) => {
  const f = fixture({ confirm: async () => answer })
  await f.run(
    flow([
      {
        kind: 'confirm',
        onYes: [{ kind: 'giveMoney', delta: 3 }],
        onNo: [{ kind: 'giveMoney', delta: -4 }],
      },
    ]),
  )
  expect(f.effects).toEqual([{ kind: 'giveMoney', delta: answer ? 3 : -4 }])
})

test('auto control wrappers do not add time between leaf commands', async () => {
  let waits = 0
  const f = fixture({
    wait: async () => {
      waits++
    },
    waitWorldTick: async () => {
      waits++
    },
  })
  await f.run(
    flow([
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 10 },
        then: [],
        else: [{ kind: 'giveMoney', delta: 1 }],
      },
      { kind: 'repeat', count: 3, body: [{ kind: 'giveMoney', delta: 2 }] },
    ]),
    'auto',
  )
  expect(waits).toBe(0)
  expect(f.effects).toHaveLength(4)
})

test('fixed repeat executes exactly 320 times and then the common tail', async () => {
  const f = fixture()
  await f.run(
    flow([
      { kind: 'repeat', count: 320, body: [{ kind: 'giveMoney', delta: 1 }] },
      { kind: 'giveMoney', delta: 9 },
    ]),
  )
  expect(f.effects).toHaveLength(321)
  expect(f.effects.at(-1)).toEqual({ kind: 'giveMoney', delta: 9 })
})

test('outer continue is not consumed by an inner loop; repeat continues at its next iteration', async () => {
  const f = fixture()
  await f.run(
    flow([
      {
        kind: 'repeat',
        id: 'outer',
        count: 3,
        body: [
          { kind: 'giveMoney', delta: 1 },
          { kind: 'loop', mode: 'forever', body: [{ kind: 'continueLoop', loop: 'outer' }] },
          { kind: 'giveMoney', delta: 999 },
        ],
      },
      { kind: 'giveMoney', delta: 7 },
    ]),
  )
  expect(f.effects).toEqual([1, 1, 1, 7].map((delta) => ({ kind: 'giveMoney', delta })))
})

test.each([
  'while',
  'until',
] as const)('%s continue evaluates the condition exactly once per required test', async (mode) => {
  let tests = 0
  const f = fixture({ evalCondition: () => (mode === 'while' ? ++tests <= 3 : ++tests >= 3) })
  await f.run(
    flow([
      {
        kind: 'loop',
        mode,
        cond: { kind: 'chance', percent: 50 },
        body: [
          { kind: 'giveMoney', delta: 1 },
          { kind: 'continueLoop' },
          { kind: 'giveMoney', delta: 99 },
        ],
      },
    ]),
  )
  expect(f.effects).toHaveLength(3)
  expect(tests).toBe(mode === 'while' ? 4 : 3)
})

test('break exits only the nearest loop and still executes the enclosing tail', async () => {
  const f = fixture()
  await f.run(
    flow([
      {
        kind: 'repeat',
        count: 2,
        body: [
          { kind: 'loop', mode: 'forever', body: [{ kind: 'breakLoop' }] },
          { kind: 'giveMoney', delta: 1 },
        ],
      },
    ]),
  )
  expect(f.effects).toHaveLength(2)
})

test('a shared return stops only that script; finishStep cannot be smuggled into a shared root', async () => {
  const f = fixture()
  const library = new RuntimeSharedScriptResolver(
    {
      part: {
        name: 'part',
        self: 'none',
        body: [{ kind: 'returnScript' }, { kind: 'giveMoney', delta: 99 }],
      },
    },
    digest,
  )
  const runner = new RuntimeScriptRunner(f.host, f.controller.signal, library)
  await runner.runFlow(
    compileRuntimeCommandRoot(
      [
        { kind: 'callScript', script: 'part' },
        { kind: 'giveMoney', delta: 5 },
      ],
      { timing: 'interactive', canonicalContentDigest: digest },
    ),
    { cursorController: f.cursorController },
  )
  expect(f.effects).toEqual([{ kind: 'giveMoney', delta: 5 }])
  expect(
    () =>
      new RuntimeSharedScriptResolver(
        {
          bad: {
            name: 'bad',
            self: 'required',
            body: [{ kind: 'finishStep', next: { kind: 'complete' } }],
          },
        },
        digest,
      ),
  ).toThrow(/步骤正文/)
})

test('zero-time loops stop even when the host returns promises, yields CPU or handles wait(0)', async () => {
  const f = fixture()
  await expect(
    f.run(flow([{ kind: 'loop', mode: 'forever', body: [{ kind: 'wait', ms: 0 }] }])),
  ).rejects.toThrow(/循环没有等待/)
})

test('normal long-running patrol has no lifetime iteration ceiling', async () => {
  let turns = 0
  const f = fixture({ evalCondition: () => ++turns <= 12_000 })
  await f.run(
    flow([
      {
        kind: 'loop',
        mode: 'while',
        cond: { kind: 'chance', percent: 50 },
        body: [{ kind: 'wait', ms: 1 }],
      },
    ]),
    'auto',
  )
  expect(f.effects).toHaveLength(12_000)
})

test('automatic signal replacement and step reactivation cannot refresh the stable job budget', async () => {
  const budgets = new ScriptExecutionBudgets()
  const first = new AbortController(),
    second = new AbortController()
  const a = budgets.forAutomatic('session', 'scene', 'actor', first.signal)
  const b = budgets.forAutomatic('session', 'scene', 'actor', second.signal)
  expect(a).toBe(b)
  for (let i = 0; i < ScriptExecutionBudget.LIMIT; i++) a.consume()
  await expect(fixture({}, b).run(flow([]), 'auto')).rejects.toThrow(/循环没有等待/)
  expect(budgets.forAutomatic('replacement', 'scene', 'actor', second.signal)).not.toBe(a)
})

test('an immediately-returning confirmation host cannot report fake user progress', async () => {
  const f = fixture({
    confirm: async (_signal, report) => {
      report?.()
      return true
    },
  })
  await expect(
    f.run(
      flow([{ kind: 'loop', mode: 'forever', body: [{ kind: 'confirm', onYes: [], onNo: [] }] }]),
    ),
  ).rejects.toThrow(/循环没有等待/)
})

test('real ProjectRuntime self-selection A to B with fresh signals cannot bypass the automatic job limit', async () => {
  const f = projectFixture()
  const entity = f.scene.entities[0]!
  entity.pages![0]!.auto = 'a'
  entity.behaviors!.auto = Object.fromEntries(
    ['a', 'b'].map((id) => [
      id,
      {
        label: id,
        order: id === 'a' ? 0 : 1,
        flow: {
          kind: 'stages',
          initial: 'first',
          stages: [
            {
              id: 'first',
              body: [
                {
                  kind: 'selectEntityBehavior',
                  target: { scene: 's', entity: 'e' },
                  channel: 'auto',
                  selection: { kind: 'use', value: id === 'a' ? 'b' : 'a' },
                },
              ],
            },
          ],
        },
      },
    ]),
  )
  let completed = 0
  const cycling = async () => {
    for (; completed < ScriptExecutionBudget.LIMIT; completed++)
      await f.runtime.runEntityBehavior(f.scene, 'e', 'auto', {
        signal: new AbortController().signal,
      })
  }
  await expect(cycling()).rejects.toThrow(/循环没有等待/)
  expect(completed).toBeGreaterThan(1)
  expect(completed).toBeLessThan(ScriptExecutionBudget.LIMIT)
  expect(
    f.runtime.coordinator.isOwnerActive({
      kind: 'entity-behavior',
      target: { scene: 's', entity: 'e' },
      channel: 'auto',
    }),
  ).toBe(false)
})
