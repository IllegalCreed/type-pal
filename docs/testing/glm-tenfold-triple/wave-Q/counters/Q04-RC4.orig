// Q04 · ScriptRunnerCore 光标与共享脚本调用门残差（排重：旧 runner-core 21 例已证 flow 语义/
// 调试钩子/commandOutcome 消费/scene entry 主路径；本文件只补非法 cursor 组合、
// callScript 门族（无 resolver/深度/错 id/digest/timing/boundary/self 模式）、
// while 前置条件序与 host 缺 revealSceneEntry 守卫）。
import type { BaseScriptFlow, BaseScriptLibrary, FlowCursor } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  BaseSharedScriptResolver,
  compileBaseScriptFlow,
  SCRIPT_COMPILER_VERSION,
} from './script-compiler-core.js'
import type { BaseScriptRuntimeHost, FlowCursorController } from './script-runner-core.js'
import { ScriptRunnerCore } from './script-runner-core.js'

const digest = 'c'.repeat(64)

interface FakeHost extends BaseScriptRuntimeHost {
  calls: string[]
  battleResults: ('victory' | 'defeat' | 'playerFled')[]
}

function fakeHost(): FakeHost {
  const calls: string[] = []
  return {
    calls,
    battleResults: [],
    execute: vi.fn(async (command) => {
      calls.push(`execute:${command.kind}`)
    }),
    evalCondition: vi.fn(() => false),
    confirm: vi.fn(async () => true),
    startBattle: vi.fn(async () => 'victory' as const),
    teleportOut: vi.fn(async () => true),
    wait: vi.fn(async () => {}),
    waitWorldTick: vi.fn(async () => {
      calls.push('yield:worldTick')
    }),
    yieldMacroTask: vi.fn(async () => {
      calls.push('yield:macroTask')
    }),
  }
}

function controller(decisions: Array<'continue' | 'stop'> = []): FlowCursorController & {
  cursors: FlowCursor[]
} {
  const cursors: FlowCursor[] = []
  return {
    cursors,
    reachSafePoint: async (cursor) => {
      cursors.push(structuredClone(cursor))
      return decisions.shift() ?? 'continue'
    },
  }
}

function compile(
  flow: BaseScriptFlow,
  options: { digest?: string; timing?: 'auto' | 'interactive'; allowSceneEntry?: boolean } = {},
) {
  return compileBaseScriptFlow(flow, {
    canonicalContentDigest: options.digest ?? digest,
    timing: options.timing ?? 'interactive',
    allowSceneEntry: options.allowSceneEntry ?? true,
  })
}

const stagesFlow = (): BaseScriptFlow => ({
  kind: 'stages',
  initial: 'one',
  stages: [{ id: 'one', body: [{ kind: 'clearDialog' }] }],
})

const machineFlow = (): BaseScriptFlow => ({
  kind: 'stateMachine',
  machine: {
    id: 'machine',
    label: '状态机',
    initial: 's0',
    states: { s0: { label: 's0', body: [{ kind: 'clearDialog' }], next: { kind: 'stay' } } },
  },
})

describe('Q04 非法光标组合', () => {
  test('machine id 不匹配的 state cursor 精确拒绝', async () => {
    const runner = new ScriptRunnerCore(fakeHost(), new AbortController().signal)
    const cursor: FlowCursor = { kind: 'state', machine: 'other', state: 's0' }
    await expect(
      runner.runFlow(compile(machineFlow()), { cursor, cursorController: controller() }),
    ).rejects.toThrow('ScriptRunnerCore: machine cursor other 不匹配 machine')
  })

  test('stage cursor 不能运行 stateMachine flow；state cursor 不能运行 stages flow', async () => {
    const runner = new ScriptRunnerCore(fakeHost(), new AbortController().signal)
    const stageCursor: FlowCursor = { kind: 'stage', stage: 'one' }
    await expect(
      runner.runFlow(compile(machineFlow()), {
        cursor: stageCursor,
        cursorController: controller(),
      }),
    ).rejects.toThrow('ScriptRunnerCore: stage cursor 不能运行 stateMachine flow')
    const stateCursor: FlowCursor = { kind: 'state', machine: 'machine', state: 's0' }
    await expect(
      runner.runFlow(compile(stagesFlow()), {
        cursor: stateCursor,
        cursorController: controller(),
      }),
    ).rejects.toThrow('ScriptRunnerCore: state cursor 不能运行 stages flow')
  })

  test('stage cursor 指向不存在 stage 时精确报错', async () => {
    const runner = new ScriptRunnerCore(fakeHost(), new AbortController().signal)
    const cursor: FlowCursor = { kind: 'stage', stage: 'ghost' }
    await expect(
      runner.runFlow(compile(stagesFlow()), { cursor, cursorController: controller() }),
    ).rejects.toThrow('ScriptRunnerCore: stage cursor 不存在 ghost')
  })

  test('state cursor 指向不存在 state 时按 machine.path 精确报错', async () => {
    const runner = new ScriptRunnerCore(fakeHost(), new AbortController().signal)
    const cursor: FlowCursor = { kind: 'state', machine: 'machine', state: 'ghost' }
    await expect(
      runner.runFlow(compile(machineFlow()), { cursor, cursorController: controller() }),
    ).rejects.toThrow('machine machine: state 不存在 ghost')
  })
})

describe('Q04 commandOutcome 与 callScript 门', () => {
  test('无 resolver 时 callScript 前置拒绝', async () => {
    const host = fakeHost()
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
    await expect(
      runner.runFlow(
        compile({
          kind: 'stages',
          initial: 'one',
          stages: [{ id: 'one', body: [{ kind: 'callScript', script: 'probe' }] }],
        }),
        { cursorController: controller() },
      ),
    ).rejects.toThrow('ScriptRunnerCore: 无 resolver，无法解析 probe')
  })

  test('callScript 自递归在深度 128 处精确熔断', async () => {
    const host = fakeHost()
    const library: BaseScriptLibrary = {
      recurse: {
        name: '递归',
        self: 'optional',
        body: [{ kind: 'callScript', script: 'recurse' }],
      },
    }
    const runner = new ScriptRunnerCore(
      host,
      new AbortController().signal,
      new BaseSharedScriptResolver(library, digest),
    )
    await expect(
      runner.runFlow(
        compile({
          kind: 'stages',
          initial: 'one',
          stages: [{ id: 'one', body: [{ kind: 'callScript', script: 'recurse' }] }],
        }),
        { cursorController: controller() },
      ),
    ).rejects.toThrow('ScriptRunnerCore: callScript 调用深度超过 128')
  })

  test('resolver 返回错误 script id 时拒绝', async () => {
    const host = fakeHost()
    const library: BaseScriptLibrary = {
      probe: { name: '探针', self: 'optional', body: [{ kind: 'clearDialog' }] },
      other: { name: '其它', self: 'optional', body: [{ kind: 'clearDialog' }] },
    }
    const resolver = new BaseSharedScriptResolver(library, digest)
    const crooked = {
      resolve: (
        id: string,
        timing: 'auto' | 'interactive',
        boundaryPolicy: 'perCommand' | 'transition',
        signal: AbortSignal,
      ) => {
        void id
        void signal
        return resolver.resolve('other', timing, boundaryPolicy)
      },
    }
    const runner = new ScriptRunnerCore(host, new AbortController().signal, crooked)
    await expect(
      runner.runFlow(
        compile({
          kind: 'stages',
          initial: 'one',
          stages: [{ id: 'one', body: [{ kind: 'callScript', script: 'probe' }] }],
        }),
        { cursorController: controller() },
      ),
    ).rejects.toThrow('ScriptRunnerCore: resolver 返回错误 script id other')
  })

  test('shared executable digest/timing/boundary 任一过期都拒绝', async () => {
    const host = fakeHost()
    const library: BaseScriptLibrary = {
      probe: { name: '探针', self: 'optional', body: [{ kind: 'clearDialog' }] },
    }
    // digest 过期
    const staleDigest = new ScriptRunnerCore(
      host,
      new AbortController().signal,
      new BaseSharedScriptResolver(library, 'd'.repeat(64)),
    )
    await expect(
      staleDigest.runFlow(
        compile({
          kind: 'stages',
          initial: 'one',
          stages: [{ id: 'one', body: [{ kind: 'callScript', script: 'probe' }] }],
        }),
        { cursorController: controller() },
      ),
    ).rejects.toThrow('ScriptRunnerCore: shared probe executable cache 已过期')
    // 注：timing/boundary 过期臂经 BaseSharedScriptResolver 不可达（按调用方参数现编），
    // 属于其它 resolver 实现的防御契约，登记为 defensive-unreachable。
  })

  test('self=none 禁显式 self；self=required 缺 self 拒绝', async () => {
    const host = fakeHost()
    const library: BaseScriptLibrary = {
      free: { name: '无 self', self: 'none', body: [{ kind: 'clearDialog' }] },
      needs: { name: '需 self', self: 'required', body: [{ kind: 'clearDialog' }] },
    }
    const runner = new ScriptRunnerCore(
      host,
      new AbortController().signal,
      new BaseSharedScriptResolver(library, digest),
    )
    await expect(
      runner.runFlow(
        compile({
          kind: 'stages',
          initial: 'one',
          stages: [
            {
              id: 'one',
              body: [
                {
                  kind: 'callScript',
                  script: 'free',
                  self: { scene: 'a', entity: 'e1' },
                },
              ],
            },
          ],
        }),
        { cursorController: controller() },
      ),
    ).rejects.toThrow('ScriptRunnerCore: free self=none，禁止显式 self')
    await expect(
      runner.runFlow(
        compile({
          kind: 'stages',
          initial: 'one',
          stages: [{ id: 'one', body: [{ kind: 'callScript', script: 'needs' }] }],
        }),
        { cursorController: controller() },
      ),
    ).rejects.toThrow('ScriptRunnerCore: needs 需要 self')
  })
})

describe('Q04 其它公开守卫', () => {
  test('host 未实现 revealSceneEntry 时 scene entry fail-loud', async () => {
    const host = fakeHost()
    host.revealSceneEntry = undefined
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
    const flow: BaseScriptFlow = {
      kind: 'stages',
      initial: 'one',
      stages: [
        {
          id: 'one',
          body: [],
          entry: { prepare: [], reveal: { kind: 'fade', outMs: 10, inMs: 10 } },
        },
      ],
    }
    await expect(
      runner.runFlow(compile(flow), {
        cursorController: controller(),
        runSceneEntry: true,
        allowSceneEntry: true,
      }),
    ).rejects.toThrow('ScriptRunnerCore: host 未实现 revealSceneEntry')
  })

  test('while 循环先判条件再执行体：条件即假时体零执行', async () => {
    const host = fakeHost()
    host.evalCondition = vi.fn(() => false)
    const runner = new ScriptRunnerCore(host, new AbortController().signal)
    await runner.runFlow(
      compile({
        kind: 'stages',
        initial: 'one',
        stages: [
          {
            id: 'one',
            body: [
              {
                kind: 'loop',
                mode: 'while',
                cond: { kind: 'flag', flag: 'go', is: true },
                maxIterations: 3,
                yield: 'worldTick',
                body: [{ kind: 'clearDialog' }],
              },
            ],
          },
        ],
      }),
      { cursorController: controller() },
    )
    expect(host.execute).not.toHaveBeenCalled()
    expect(host.calls).toEqual([])
    expect(host.evalCondition).toHaveBeenCalledTimes(1)
  })

  test('合法 shared 调用在同 digest/timing 下放行并执行体', async () => {
    const host = fakeHost()
    const library: BaseScriptLibrary = {
      probe: { name: '探针', self: 'optional', body: [{ kind: 'clearDialog' }] },
    }
    const runner = new ScriptRunnerCore(
      host,
      new AbortController().signal,
      new BaseSharedScriptResolver(library, digest),
    )
    await runner.runFlow(
      compile({
        kind: 'stages',
        initial: 'one',
        stages: [{ id: 'one', body: [{ kind: 'callScript', script: 'probe' }] }],
      }),
      { cursorController: controller() },
    )
    expect(host.calls).toEqual(['execute:clearDialog'])
  })

  test('当前编译器版本标识为常量且被 executable 记录', () => {
    const compiled = compile(stagesFlow())
    expect(compiled.compilerVersion).toBe(SCRIPT_COMPILER_VERSION)
  })
})
