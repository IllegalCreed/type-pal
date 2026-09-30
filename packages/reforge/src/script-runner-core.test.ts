import type {
  AuthorCondition,
  BaseScriptFlow,
  BaseScriptLibrary,
  EntityAddress,
  FlowCursor,
} from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { BaseSharedScriptResolver, compileBaseScriptFlow } from './script-compiler-core.js'
import type { BaseScriptRuntimeHost, FlowCursorController } from './script-runner-core.js'
import { ScriptRunnerCore } from './script-runner-core.js'

const digest = 'b'.repeat(64)

describe('optional command debugger hook', () => {
  const oneCommand = () =>
    compile({
      kind: 'stages',
      initial: 'one',
      stages: [
        {
          id: 'one',
          body: [{ kind: 'setFlag', flag: 'ran', value: true }],
        },
      ],
    })
  const drain = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

  test('waits exactly at authored commands, keeping stage and final host gates', async () => {
    const host = fakeHost()
    const gate = vi.fn()
    host.gate = gate
    const release = deferred<void>()
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
    const observed: string[] = []
    const step = vi.fn()
    runner.onStep = step
    runner.beforeStep = async (event) => {
      observed.push(`${event.path.join('/')}:${event.command.kind}`)
      await release.promise
    }
    const pending = runner.runFlow(oneCommand(), { cursorController: controller() })
    try {
      await drain()
      expect(observed).toEqual(['one/0:leaf'])
      expect(gate).toHaveBeenCalledTimes(1)
      expect(host.calls).toEqual([])
      expect(step).not.toHaveBeenCalled()
      release.resolve()
      await pending
      expect(host.calls).toEqual(['execute:setFlag:-:-'])
      expect(step).toHaveBeenCalledOnce()
      expect(gate).toHaveBeenCalledTimes(3)
    } finally {
      release.resolve()
      await pending
    }
  })

  test('checks abort after a suspended debugger hook and never emits or executes the command', async () => {
    const host = fakeHost()
    const ac = new AbortController()
    const release = deferred<void>()
    const runner = new ScriptRunnerCore(host, ac.signal)
    const entered: string[] = []
    runner.beforeStep = async (event) => {
      entered.push(event.path.join('/'))
      await release.promise
    }
    const step = vi.fn()
    runner.onStep = step
    const pending = runner
      .runFlow(oneCommand(), { cursorController: controller() })
      .catch((error) => error)
    try {
      await drain()
      expect(entered).toEqual(['one/0'])
      ac.abort()
      release.resolve()
      expect(await pending).toMatchObject({ name: 'AbortError' })
      expect(host.calls).toEqual([])
      expect(step).not.toHaveBeenCalled()
      expect(runner.running).toBe(false)
    } finally {
      ac.abort()
      release.resolve()
      await pending
    }
  })

  test('a host modal closing during debugger pause still blocks execution after release', async () => {
    const host = fakeHost()
    const debug = deferred<void>()
    const modal = deferred<void>()
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
    const trace: string[] = []
    let closed = false
    host.gate = () => {
      trace.push('host')
      if (closed) return modal.promise
    }
    runner.beforeStep = async () => {
      trace.push('debug')
      await debug.promise
    }
    const pending = runner.runFlow(oneCommand(), { cursorController: controller() })
    try {
      await drain()
      expect(trace).toEqual(['host', 'debug'])
      closed = true
      debug.resolve()
      await drain()
      expect(trace).toEqual(['host', 'debug', 'host'])
      expect(host.calls).toEqual([])
      modal.resolve()
      await pending
      expect(host.calls).toEqual(['execute:setFlag:-:-'])
      expect(trace).toEqual(['host', 'debug', 'host', 'host'])
    } finally {
      debug.resolve()
      modal.resolve()
      await pending
    }
  })

  test('debugger failure preserves the error and executes no command', async () => {
    const host = fakeHost()
    const failure = new Error('debugger rejected')
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
    runner.beforeStep = () => {
      throw failure
    }
    await expect(runner.runFlow(oneCommand(), { cursorController: controller() })).rejects.toBe(
      failure,
    )
    expect(host.calls).toEqual([])
    expect(runner.running).toBe(false)
  })
})

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

interface FakeHost extends BaseScriptRuntimeHost {
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
    evalCondition: vi.fn((condition: AuthorCondition) => {
      if (condition.kind !== 'flag') throw new Error(`unexpected condition ${condition.kind}`)
      return conditions.get(condition.flag) ?? false
    }),
    confirm: vi.fn(async () => {
      calls.push('confirm')
      return confirmations.shift() ?? true
    }),
    startBattle: vi.fn(async () => 'victory' as const),
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
): FlowCursorController & { cursors: FlowCursor[] } {
  const cursors: FlowCursor[] = []
  return {
    cursors,
    reachSafePoint: vi.fn(async (cursor: FlowCursor) => {
      cursors.push(structuredClone(cursor))
      return decisions.shift() ?? 'continue'
    }),
  }
}

function compile(flow: BaseScriptFlow, timing: 'auto' | 'interactive' = 'interactive') {
  return compileBaseScriptFlow(flow, {
    canonicalContentDigest: digest,
    timing,
    allowSceneEntry: true,
  })
}

function states(
  entries: BaseScriptFlow extends infer _Flow
    ? Record<
        string,
        {
          label: string
          body: Extract<BaseScriptFlow, { kind: 'stages' }>['stages'][number]['body']
          next: Extract<
            BaseScriptFlow,
            { kind: 'stateMachine' }
          >['machine']['states'][string]['next']
        }
      >
    : never,
  cadence?: 'transition',
): BaseScriptFlow {
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

describe('ScriptRunnerCore flow semantics', () => {
  test('a completed stage executes once, commits only after settlement, and becomes inert', async () => {
    const host = fakeHost()
    const cursors = controller()
    const settlement = deferred<void>()
    host.gate = async (_signal, boundary) => {
      if (boundary?.kind === 'settlement') await settlement.promise
    }
    const flow = compile({
      kind: 'stages',
      initial: 'one',
      stages: [{ id: 'one', body: [{ kind: 'giveMoney', delta: 7 }], next: { kind: 'complete' } }],
    })
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
    const pending = runner.runFlow(flow, { cursorController: cursors })
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    expect(host.calls).toContain('execute:giveMoney:-:-')
    expect(cursors.cursors).toEqual([])
    settlement.resolve()
    await pending
    expect(cursors.cursors).toEqual([{ kind: 'completed' }])
    const before = [...host.calls]
    await runner.runFlow(flow, { cursor: { kind: 'completed' }, cursorController: cursors })
    expect(host.calls).toEqual(before)
    expect(cursors.cursors).toHaveLength(1)
    await expect(
      runner.runFlow(
        compile({ kind: 'stages', initial: 'repeat', stages: [{ id: 'repeat', body: [] }] }),
        { cursor: { kind: 'completed' }, cursorController: cursors },
      ),
    ).rejects.toThrow(/未声明 complete/)
  })

  test.each([
    'complete',
    'branch',
    'commandOutcome',
  ] as const)('machine %s completion is final without an extra tick', async (kind) => {
    const host = fakeHost()
    host.conditions.set('finish', true)
    const next: Extract<
      BaseScriptFlow,
      { kind: 'stateMachine' }
    >['machine']['states'][string]['next'] =
      kind === 'complete'
        ? { kind: 'complete' }
        : kind === 'branch'
          ? {
              kind: 'branch',
              cond: { kind: 'flag', flag: 'finish', is: true },
              then: { kind: 'complete' },
              else: { kind: 'stay' },
            }
          : {
              kind: 'commandOutcome',
              commandId: 'answer',
              command: 'confirm',
              outcome: 'no',
              then: { kind: 'stay' },
              else: { kind: 'complete' },
            }
    const cursors = controller()
    const flow = compile(
      states({
        initial: {
          label: 'One',
          body:
            kind === 'commandOutcome'
              ? [{ kind: 'confirm', id: 'answer', onNo: [] }]
              : [{ kind: 'giveMoney', delta: 7 }],
          next,
        },
      }),
    )
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
    await runner.runFlow(flow, { cursorController: cursors })
    expect(cursors.cursors).toEqual([{ kind: 'completed' }])
    expect(host.waitWorldTick).not.toHaveBeenCalled()
    expect(host.yieldMacroTask).not.toHaveBeenCalled()
    const before = [...host.calls]
    await runner.runFlow(flow, { cursor: { kind: 'completed' }, cursorController: cursors })
    expect(host.calls).toEqual(before)
  })

  test('abort and stopScript never manufacture completion', async () => {
    for (const stop of [true, false]) {
      const host = fakeHost()
      const cursors = controller()
      const ac = new AbortController()
      host.gate = (_signal, boundary) => {
        if (boundary?.kind === 'settlement') ac.abort()
      }
      const flow = compile({
        kind: 'stages',
        initial: 'one',
        stages: [
          { id: 'one', body: stop ? [{ kind: 'stopScript' }] : [], next: { kind: 'complete' } },
        ],
      })
      const pending = new ScriptRunnerCore(host, ac.signal).runFlow(flow, {
        cursorController: cursors,
      })
      if (stop) await pending
      else await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
      expect(cursors.cursors).toEqual([])
    }
  })
  test('stage next commits its stable cursor and ends the activation', async () => {
    const host = fakeHost()
    const cursors = controller()
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
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
    await new ScriptRunnerCore(host, new AbortController().signal).runFlow(flow, {
      cursorController: first,
    })
    const second = controller()
    await new ScriptRunnerCore(host, new AbortController().signal).runFlow(flow, {
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
    await new ScriptRunnerCore(host, new AbortController().signal).runFlow(flow, {
      cursorController: first,
    })
    const second = controller(['stop'])
    await new ScriptRunnerCore(host, new AbortController().signal).runFlow(flow, {
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
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
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
      new ScriptRunnerCore(fakeHost(), new AbortController().signal).runFlow(executable, {
        cursorController: controller(),
      }),
    ).rejects.toThrow(/continue 链超过 4096/)
  })

  test('to commits, crosses the safe-point and yields before same-activation continuation', async () => {
    const host = fakeHost()
    const cursors = controller()
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
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
    await new ScriptRunnerCore(host, new AbortController().signal).runFlow(
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
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
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
    const running = new ScriptRunnerCore(host, new AbortController().signal).runFlow(
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

  test('a completed body settles through its modal safe-point gate, not its closed gameplay gate', async () => {
    const host = fakeHost()
    const modal = deferred<void>()
    let closed = false
    host.gate = (_signal, boundary) => {
      if (boundary?.kind === 'settlement') return modal.promise
      if (closed) throw new Error('completed body incorrectly re-entered gameplay gate')
    }
    host.execute = async () => {
      closed = true
    }
    const cursors = controller()
    const running = new ScriptRunnerCore(host, new AbortController().signal).runFlow(
      compile({
        kind: 'stages',
        initial: 'one',
        stages: [
          { id: 'one', body: [{ kind: 'setFlag', flag: 'hide', value: true }], next: 'two' },
          { id: 'two', body: [] },
        ],
      }),
      { cursorController: cursors },
    )
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      expect(closed).toBe(true)
      expect(cursors.cursors).toEqual([])
      modal.resolve()
      await running
      expect(cursors.cursors).toEqual([{ kind: 'stage', stage: 'two' }])
    } finally {
      modal.resolve()
      await running
    }
  })

  test('machine to commits a completed body but the next state remains behind the gameplay gate', async () => {
    const host = fakeHost()
    const paused = deferred<void>()
    let closed = false
    const execute = host.execute
    host.execute = async (command, context, signal) => {
      await execute(command, context, signal)
      if (command.kind === 'setFlag' && command.flag === 'hide') closed = true
    }
    host.gate = (_signal, boundary) =>
      boundary?.kind === 'settlement' ? undefined : closed ? paused.promise : undefined
    const cursors = controller()
    const running = new ScriptRunnerCore(host, new AbortController().signal).runFlow(
      compile(
        states({
          initial: {
            label: 'Hide',
            body: [{ kind: 'setFlag', flag: 'hide', value: true }],
            next: { kind: 'to', state: 'next', yield: 'worldTick' },
          },
          next: {
            label: 'Next',
            body: [{ kind: 'setFlag', flag: 'later', value: true }],
            next: { kind: 'stay' },
          },
        }),
      ),
      { cursorController: cursors },
    )
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      expect(cursors.cursors).toEqual([{ kind: 'state', machine: 'machine', state: 'next' }])
      expect(host.calls).toEqual(['execute:setFlag:-:-', 'yield:worldTick'])
      closed = false
      paused.resolve()
      await running
      expect(host.calls).toEqual(['execute:setFlag:-:-', 'yield:worldTick', 'execute:setFlag:-:-'])
      expect(cursors.cursors).toHaveLength(2)
    } finally {
      closed = false
      paused.resolve()
      await running
    }
  })

  test('abort during a suspended safe-point gate never commits the cursor', async () => {
    const host = fakeHost()
    const paused = deferred<void>()
    host.gate = (_signal, boundary) =>
      boundary?.kind === 'settlement' ? paused.promise : undefined
    const cursors = controller()
    const ac = new AbortController()
    const running = new ScriptRunnerCore(host, ac.signal)
      .runFlow(compile({ kind: 'stages', initial: 'one', stages: [{ id: 'one', body: [] }] }), {
        cursorController: cursors,
      })
      .catch((error: unknown) => error)
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    expect(cursors.cursors).toEqual([])
    ac.abort()
    paused.resolve()
    expect(await running).toMatchObject({ name: 'AbortError' })
    expect(cursors.cursors).toEqual([])
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
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
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
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
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
      new ScriptRunnerCore(blocked, new AbortController().signal).runFlow(
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
    await new ScriptRunnerCore(host, new AbortController().signal).runFlow(
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
    const library: BaseScriptLibrary = {
      helper: {
        name: '帮助脚本',
        self: 'required',
        body: [{ kind: 'clearDialog' }],
      },
    }
    const resolver = new BaseSharedScriptResolver(library, digest)
    const runner = new ScriptRunnerCore(host, new AbortController().signal, resolver)
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
    const library: BaseScriptLibrary = {
      helper: {
        name: '同帧帮助脚本',
        self: 'none',
        body: [{ kind: 'clearDialog' }],
      },
    }
    await new ScriptRunnerCore(
      host,
      new AbortController().signal,
      new BaseSharedScriptResolver(library, digest),
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
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
    await runner.runFlow(
      compile({
        kind: 'stages',
        initial: 'initial',
        stages: [
          {
            id: 'initial',
            entry: {
              prepare: [{ kind: 'clearDialog' }, { kind: 'wait', ms: 180 }],
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
    const running = new ScriptRunnerCore(host, new AbortController().signal).runFlow(
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
