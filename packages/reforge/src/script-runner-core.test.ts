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

  test('abort before implicit or explicit settlement never manufactures completion', async () => {
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
          {
            id: 'one',
            body: stop ? [{ kind: 'finishStep', next: { kind: 'stay' } }] : [],
            next: { kind: 'complete' },
          },
        ],
      })
      const pending = new ScriptRunnerCore(host, ac.signal).runFlow(flow, {
        cursorController: cursors,
      })
      await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
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

  test('host execution gate freezes commands and empty-flow safe-points', async () => {
    const host = fakeHost()
    const firstGate = deferred<void>()
    const gates = [firstGate]
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
    await running
    expect(cursors.cursors).toEqual([{ kind: 'stage', stage: 'initial' }])
    expect(host.gate).toHaveBeenCalledTimes(1)
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

  test('finishStep stay explicitly preserves the persistent step', async () => {
    const host = fakeHost()
    const cursors = controller()
    await new ScriptRunnerCore(host, new AbortController().signal).runFlow(
      compile({
        kind: 'stages',
        initial: 'initial',
        stages: [
          {
            id: 'initial',
            body: [
              { kind: 'finishStep', next: { kind: 'stay' } },
              { kind: 'setFlag', flag: 'unreachable', value: true },
            ],
            next: 'later',
          },
          { id: 'later', body: [] },
        ],
      }),
      { cursorController: cursors },
    )

    expect(host.calls).toEqual([])
    expect(cursors.cursors).toEqual([{ kind: 'stage', stage: 'initial' }])
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

    expect(host.calls).toEqual(['execute:clearDialog:s001:e1'])
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
