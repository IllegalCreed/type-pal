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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

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
  cadence?: 'transition',
): ScriptFlowV5 {
  return {
    kind: 'stateMachine',
    machine: {
      id: 'machine',
      label: '状态机',
      ...(cadence === undefined ? {} : { cadence }),
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

  test('a terminal completed stage never replays the one-shot body', async () => {
    const host = fakeHost()
    const flow = compile({
      kind: 'stages',
      initial: 'initial',
      stages: [
        {
          id: 'initial',
          body: [{ kind: 'setFlag', flag: 'once', value: true }],
          next: 'completed',
        },
        { id: 'completed', body: [] },
      ],
    })
    const first = controller()
    await new ScriptRunnerV5(host, new AbortController().signal).runFlow(flow, {
      cursorController: first,
    })
    const second = controller()
    await new ScriptRunnerV5(host, new AbortController().signal).runFlow(flow, {
      cursor: first.cursors[0],
      cursorController: second,
    })

    expect(host.calls).toEqual(['execute:setFlag:-:-'])
    expect(first.cursors).toEqual([{ kind: 'stage', stage: 'completed' }])
    expect(second.cursors).toEqual([{ kind: 'stage', stage: 'completed' }])
  })

  test('a source prefix runs once before a persistent tail loop', async () => {
    const host = fakeHost()
    const flow = compile(
      states({
        initial: {
          label: '一次性前缀',
          body: [{ kind: 'setFlag', flag: 'prefix', value: true }],
          next: { kind: 'continue', state: 'tail' },
        },
        tail: {
          label: '循环正文',
          body: [{ kind: 'setFlag', flag: 'tail', value: true }],
          next: { kind: 'to', state: 'tail', yield: 'worldTick' },
        },
      }),
    )
    const first = controller(['stop'])
    await new ScriptRunnerV5(host, new AbortController().signal).runFlow(flow, {
      cursorController: first,
    })
    const second = controller(['stop'])
    await new ScriptRunnerV5(host, new AbortController().signal).runFlow(flow, {
      cursor: first.cursors[0],
      cursorController: second,
    })

    expect(host.calls).toEqual([
      'execute:setFlag:-:-',
      'execute:setFlag:-:-',
      'execute:setFlag:-:-',
    ])
    expect(first.cursors).toEqual([{ kind: 'state', machine: 'machine', state: 'tail' }])
    expect(second.cursors).toEqual([{ kind: 'state', machine: 'machine', state: 'tail' }])
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

  test('fails loudly when a malformed executable contains an unbounded continue chain', async () => {
    const executable = compile(
      states({
        initial: {
          label: 'A',
          body: [],
          next: { kind: 'continue', state: 'b' },
        },
        b: {
          label: 'B',
          body: [],
          next: { kind: 'stay' },
        },
      }),
    )
    if (executable.flow.kind !== 'stateMachine') throw new Error('expected state machine')
    executable.flow.machine.states.b!.next = { kind: 'continue', state: 'initial' }

    await expect(
      new ScriptRunnerV5(fakeHost(), new AbortController().signal).runFlow(executable, {
        cursorController: controller(),
      }),
    ).rejects.toThrow(/continue 链超过 4096/)
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

  test('transition cadence executes a compound source state in one frame and yields once', async () => {
    const host = fakeHost()
    const cursors = controller()
    await new ScriptRunnerV5(host, new AbortController().signal).runFlow(
      compile(
        states(
          {
            initial: {
              label: '复合源指令',
              body: [
                { kind: 'setFlag', flag: 'first', value: true },
                { kind: 'setFlag', flag: 'second', value: true },
              ],
              next: { kind: 'to', state: 'target', yield: 'worldTick' },
            },
            target: {
              label: '下一源指令',
              body: [{ kind: 'setFlag', flag: 'target', value: true }],
              next: { kind: 'stay' },
            },
          },
          'transition',
        ),
        'auto',
      ),
      { cursorController: cursors },
    )

    expect(host.calls).toEqual([
      'execute:setFlag:-:-',
      'execute:setFlag:-:-',
      'yield:worldTick',
      'execute:setFlag:-:-',
    ])
    expect(host.calls).not.toContain('wait:100')
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

  test('host execution gate freezes commands and empty-flow safe-points', async () => {
    const host = fakeHost()
    const firstGate = deferred<void>()
    const secondGate = deferred<void>()
    const gates = [firstGate, secondGate]
    host.gate = vi.fn(() => gates.shift()?.promise)
    const cursors = controller()
    const running = new ScriptRunnerV5(host, new AbortController().signal).runFlow(
      compile({
        kind: 'stages',
        initial: 'initial',
        stages: [{ id: 'initial', body: [] }],
      }),
      { cursorController: cursors },
    )
    await Promise.resolve()
    expect(cursors.cursors).toEqual([])

    firstGate.resolve()
    await Promise.resolve()
    expect(cursors.cursors).toEqual([])

    secondGate.resolve()
    await running
    expect(cursors.cursors).toEqual([{ kind: 'stage', stage: 'initial' }])
    expect(host.gate).toHaveBeenCalledTimes(2)
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

  test('shared calls inherit transition cadence without adding hidden waits', async () => {
    const host = fakeHost()
    const library: SharedScriptLibraryV5 = {
      helper: {
        name: '同帧帮助脚本',
        self: 'none',
        body: [{ kind: 'clearDialog' }],
      },
    }
    await new ScriptRunnerV5(
      host,
      new AbortController().signal,
      new MemorySharedScriptResolverV5(library, digest),
    ).runFlow(
      compile(
        states(
          {
            initial: {
              label: '调用共享脚本',
              body: [{ kind: 'callScript', script: 'helper' }],
              next: { kind: 'stay' },
            },
          },
          'transition',
        ),
        'auto',
      ),
      { cursorController: controller() },
    )

    expect(host.calls).toEqual(['execute:clearDialog:-:-'])
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
              prepare: [
                { kind: 'clearDialog' },
                { kind: 'wait', ms: 180 },
              ],
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

    expect(host.calls).toEqual([
      'execute:clearDialog:-:-',
      'execute:wait:-:-',
      'reveal:cut',
      'execute:setFlag:-:-',
    ])
  })

  test('scene entry waits for prepare commands before revealing the target frame', async () => {
    const host = fakeHost()
    const waitGate = deferred<void>()
    host.execute = vi.fn(async (command) => {
      host.calls.push(`execute:${command.kind}`)
      if (command.kind === 'wait') await waitGate.promise
    })
    const running = new ScriptRunnerV5(host, new AbortController().signal).runFlow(
      compile({
        kind: 'stages',
        initial: 'initial',
        stages: [
          {
            id: 'initial',
            entry: {
              prepare: [{ kind: 'wait', ms: 180 }],
              reveal: { kind: 'cut' },
            },
            body: [],
          },
        ],
      }),
      {
        cursorController: controller(),
        allowSceneEntry: true,
        runSceneEntry: true,
      },
    )

    await vi.waitFor(() => expect(host.calls).toEqual(['execute:wait']))
    waitGate.resolve()
    await running
    expect(host.calls).toEqual(['execute:wait', 'reveal:cut'])
  })
})
