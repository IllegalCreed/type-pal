import type {
  AuthorConditionV5,
  EntityAddress,
  FlowCursor,
  ScriptFlowV5,
  SharedScriptLibraryV5,
} from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { compileScriptFlowV5, MemorySharedScriptResolverV5 } from './script-compiler-v5.js'
import type { FlowCursorControllerV5, ScriptRuntimeHostV5 } from './script-runner-v5.js'
import { ScriptRunnerV5 } from './script-runner-v5.js'

const digest = 'b'.repeat(64)

interface FakeHost extends ScriptRuntimeHostV5 {
  calls: string[]
  conditions: Map<string, boolean>
  confirmations: boolean[]
}

function fakeHost(): FakeHost {
  const calls: string[] = []
  const conditions = new Map<string, boolean>()
  const confirmations: boolean[] = []
  return {
    calls,
    conditions,
    confirmations,
    execute: vi.fn(async (command, context) => {
      calls.push(
        `execute:${command.kind}:${context.self?.scene ?? '-'}:${context.self?.entity ?? '-'}`,
      )
    }),
    evalCondition: vi.fn((condition: AuthorConditionV5) => {
      if (condition.kind !== 'flag') throw new Error(`unexpected condition ${condition.kind}`)
      return conditions.get(condition.flag) ?? false
    }),
    confirm: vi.fn(async () => {
      calls.push('confirm')
      return confirmations.shift() ?? true
    }),
    startBattle: vi.fn(async () => 'win' as const),
    teleportOut: vi.fn(async () => true),
    revealSceneEntry: vi.fn(async (reveal) => {
      calls.push(`reveal:${reveal.kind}`)
    }),
    wait: vi.fn(async (ms) => {
      calls.push(`wait:${ms}`)
    }),
    waitWorldTick: vi.fn(async () => {
      calls.push('yield:worldTick')
    }),
    yieldMacroTask: vi.fn(async () => {
      calls.push('yield:macroTask')
    }),
  }
}

function controller(
  decisions: Array<'continue' | 'stop'> = [],
): FlowCursorControllerV5 & { cursors: FlowCursor[] } {
  const cursors: FlowCursor[] = []
  return {
    cursors,
    reachSafePoint: vi.fn(async (cursor: FlowCursor) => {
      cursors.push(structuredClone(cursor))
      return decisions.shift() ?? 'continue'
    }),
  }
}

function compile(flow: ScriptFlowV5, timing: 'auto' | 'interactive' = 'interactive') {
  return compileScriptFlowV5(flow, {
    canonicalContentDigest: digest,
    timing,
    allowSceneEntry: true,
  })
}

function states(
  entries: ScriptFlowV5 extends infer _Flow
    ? Record<
        string,
        {
          label: string
          body: Extract<ScriptFlowV5, { kind: 'stages' }>['stages'][number]['body']
          next: Extract<ScriptFlowV5, { kind: 'stateMachine' }>['machine']['states'][string]['next']
        }
      >
    : never,
): ScriptFlowV5 {
  return {
    kind: 'stateMachine',
    machine: {
      id: 'machine',
      label: '状态机',
      initial: 'initial',
      states: entries,
    },
  }
}

describe('ScriptRunnerV5 flow semantics', () => {
  test('stage next commits its stable cursor and ends the activation', async () => {
    const host = fakeHost()
    const cursors = controller()
    const runner = new ScriptRunnerV5(host, new AbortController().signal)
    await runner.runFlow(
      compile({
        kind: 'stages',
        initial: 'initial',
        stages: [
          {
            id: 'initial',
            body: [{ kind: 'clearDialog' }],
            next: 'second',
          },
          {
            id: 'second',
            body: [{ kind: 'clearDialog' }, { kind: 'clearDialog' }],
          },
        ],
      }),
      { cursorController: cursors },
    )

    expect(host.calls).toEqual(['execute:clearDialog:-:-'])
    expect(cursors.cursors).toEqual([{ kind: 'stage', stage: 'second' }])
  })

  test('continue stays synchronous while advance commits and ends', async () => {
    const host = fakeHost()
    const cursors = controller()
    const runner = new ScriptRunnerV5(host, new AbortController().signal)
    await runner.runFlow(
      compile(
        states({
          initial: {
            label: '前缀',
            body: [{ kind: 'clearDialog' }],
            next: { kind: 'continue', state: 'continuation' },
          },
          continuation: {
            label: '同步后缀',
            body: [{ kind: 'setFlag', flag: 'continued', value: true }],
            next: { kind: 'advance', state: 'later' },
          },
          later: {
            label: '下次激活',
            body: [{ kind: 'setFlag', flag: 'too-early', value: true }],
            next: { kind: 'stay' },
          },
        }),
      ),
      { cursorController: cursors },
    )

    expect(host.calls).toEqual(['execute:clearDialog:-:-', 'execute:setFlag:-:-'])
    expect(cursors.cursors).toEqual([{ kind: 'state', machine: 'machine', state: 'later' }])
  })

  test('to commits, crosses the safe-point and yields before same-activation continuation', async () => {
    const host = fakeHost()
    const cursors = controller()
    const runner = new ScriptRunnerV5(host, new AbortController().signal)
    await runner.runFlow(
      compile(
        states({
          initial: {
            label: '初始',
            body: [{ kind: 'clearDialog' }],
            next: { kind: 'to', state: 'target', yield: 'macroTask' },
          },
          target: {
            label: '目标',
            body: [{ kind: 'setFlag', flag: 'target', value: true }],
            next: { kind: 'stay' },
          },
        }),
      ),
      { cursorController: cursors },
    )

    expect(host.calls).toEqual([
      'execute:clearDialog:-:-',
      'yield:macroTask',
      'execute:setFlag:-:-',
    ])
    expect(cursors.cursors).toEqual([
      { kind: 'state', machine: 'machine', state: 'target' },
      { kind: 'state', machine: 'machine', state: 'target' },
    ])
  })

  test('a closed save gate stops a to-transition after cursor commit', async () => {
    const host = fakeHost()
    const cursors = controller(['stop'])
    const runner = new ScriptRunnerV5(host, new AbortController().signal)
    await runner.runFlow(
      compile(
        states({
          initial: {
            label: '初始',
            body: [{ kind: 'clearDialog' }],
            next: { kind: 'to', state: 'target', yield: 'worldTick' },
          },
          target: {
            label: '目标',
            body: [{ kind: 'setFlag', flag: 'target', value: true }],
            next: { kind: 'stay' },
          },
        }),
      ),
      { cursorController: cursors },
    )

    expect(host.calls).toEqual(['execute:clearDialog:-:-'])
    expect(cursors.cursors).toEqual([{ kind: 'state', machine: 'machine', state: 'target' }])
  })

  test.each([
    {
      accepted: false,
      expectedState: 'no',
      expectedFlag: 'no-path',
    },
    {
      accepted: true,
      expectedState: 'yes',
      expectedFlag: 'yes-path',
    },
  ])('commandOutcome consumes the top-level confirm result without replay ($expectedState)', async ({
    accepted,
    expectedState,
    expectedFlag,
  }) => {
    const host = fakeHost()
    host.confirmations.push(accepted)
    const cursors = controller()
    const runner = new ScriptRunnerV5(host, new AbortController().signal)
    await runner.runFlow(
      compile(
        states({
          initial: {
            label: '选择',
            body: [{ kind: 'confirm', id: 'choice', onNo: [] }],
            next: {
              kind: 'commandOutcome',
              commandId: 'choice',
              command: 'confirm',
              outcome: 'no',
              then: { kind: 'continue', state: 'no' },
              else: { kind: 'continue', state: 'yes' },
            },
          },
          no: {
            label: '否',
            body: [{ kind: 'setFlag', flag: 'no-path', value: true }],
            next: { kind: 'stay' },
          },
          yes: {
            label: '是',
            body: [{ kind: 'setFlag', flag: 'yes-path', value: true }],
            next: { kind: 'stay' },
          },
        }),
      ),
      { cursorController: cursors },
    )

    expect(host.calls).toEqual(['confirm', 'execute:setFlag:-:-'])
    expect(host.execute).toHaveBeenCalledWith(
      { kind: 'setFlag', flag: expectedFlag, value: true },
      { self: undefined, timing: 'interactive' },
      expect.any(AbortSignal),
    )
    expect(cursors.cursors).toEqual([{ kind: 'state', machine: 'machine', state: expectedState }])
  })

  test('until loops yield only on back-edges and fail loudly at maxIterations', async () => {
    const host = fakeHost()
    let checks = 0
    host.evalCondition = vi.fn(() => ++checks >= 3)
    const cursors = controller()
    const runner = new ScriptRunnerV5(host, new AbortController().signal)
    await runner.runFlow(
      compile({
        kind: 'stages',
        initial: 'initial',
        stages: [
          {
            id: 'initial',
            body: [
              {
                kind: 'loop',
                mode: 'until',
                cond: { kind: 'flag', flag: 'done', is: true },
                body: [{ kind: 'clearDialog' }],
                yield: 'worldTick',
                maxIterations: 3,
              },
            ],
          },
        ],
      }),
      { cursorController: cursors },
    )

    expect(host.calls).toEqual([
      'execute:clearDialog:-:-',
      'yield:worldTick',
      'execute:clearDialog:-:-',
      'yield:worldTick',
      'execute:clearDialog:-:-',
    ])

    const blocked = fakeHost()
    blocked.evalCondition = vi.fn(() => false)
    await expect(
      new ScriptRunnerV5(blocked, new AbortController().signal).runFlow(
        compile({
          kind: 'stages',
          initial: 'initial',
          stages: [
            {
              id: 'initial',
              body: [
                {
                  kind: 'loop',
                  mode: 'until',
                  cond: { kind: 'flag', flag: 'never', is: true },
                  body: [{ kind: 'clearDialog' }],
                  yield: 'worldTick',
                  maxIterations: 2,
                },
              ],
            },
          ],
        }),
        { cursorController: controller() },
      ),
    ).rejects.toThrow(/maxIterations=2/)
  })

  test('stopScript leaves the persistent cursor untouched', async () => {
    const host = fakeHost()
    const cursors = controller()
    await new ScriptRunnerV5(host, new AbortController().signal).runFlow(
      compile({
        kind: 'stages',
        initial: 'initial',
        stages: [
          {
            id: 'initial',
            body: [{ kind: 'stopScript' }, { kind: 'setFlag', flag: 'unreachable', value: true }],
            next: 'later',
          },
          { id: 'later', body: [] },
        ],
      }),
      { cursorController: cursors },
    )

    expect(host.calls).toEqual([])
    expect(cursors.cursors).toEqual([])
  })

  test('shared calls inherit composite self and the caller timing', async () => {
    const host = fakeHost()
    const self: EntityAddress = { scene: 's001', entity: 'e1' }
    const library: SharedScriptLibraryV5 = {
      helper: {
        name: '帮助脚本',
        self: 'required',
        body: [{ kind: 'clearDialog' }],
      },
    }
    const resolver = new MemorySharedScriptResolverV5(library, digest)
    const runner = new ScriptRunnerV5(host, new AbortController().signal, resolver)
    await runner.runFlow(
      compile(
        {
          kind: 'stages',
          initial: 'initial',
          stages: [
            {
              id: 'initial',
              body: [{ kind: 'callScript', script: 'helper' }],
            },
          ],
        },
        'auto',
      ),
      { cursorController: controller(), self },
    )

    expect(host.calls).toEqual(['execute:clearDialog:s001:e1', 'wait:100', 'wait:100'])
  })

  test('scene entry executes prepare, reveal and body exactly once when requested', async () => {
    const host = fakeHost()
    const runner = new ScriptRunnerV5(host, new AbortController().signal)
    await runner.runFlow(
      compile({
        kind: 'stages',
        initial: 'initial',
        stages: [
          {
            id: 'initial',
            entry: {
              prepare: [{ kind: 'clearDialog' }],
              reveal: { kind: 'cut' },
            },
            body: [{ kind: 'setFlag', flag: 'body', value: true }],
          },
        ],
      }),
      {
        cursorController: controller(),
        allowSceneEntry: true,
        runSceneEntry: true,
      },
    )

    expect(host.calls).toEqual(['execute:clearDialog:-:-', 'reveal:cut', 'execute:setFlag:-:-'])
  })
})
