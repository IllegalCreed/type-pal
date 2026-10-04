// TEST-GLM-REFORGE-HOST-LIFECYCLE-1 — script-runner-core.ts 续跑控制帧/检查点/帧深合同。
// 公开入口 runFlow;命令经公开 compileBaseScriptFlow 守卫编译;宿主与游标控制器均为
// 公开接口替身。续跑帧形状由公开 checkAutoScriptContinuation 校验后合法进入。
import type {
  AutoScriptContinuation,
  BaseAuthorCommand,
  BaseScriptFlow,
  EntityAddress,
  FlowCursor,
} from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { compileBaseScriptFlow } from './script-compiler-core.js'
import type {
  AutomaticCommandCheckpoint,
  AutomaticMotionCheckpoint,
  BaseScriptRuntimeHost,
  FlowCursorController,
} from './script-runner-core.js'
import { ScriptRunnerCore } from './script-runner-core.js'

const digest = 'b'.repeat(64)
const self: EntityAddress = { scene: 's1', entity: 'e1' }

function compile(flow: BaseScriptFlow) {
  return compileBaseScriptFlow(flow, {
    canonicalContentDigest: digest,
    timing: 'interactive',
    allowSceneEntry: true,
  })
}

interface ProbeHost extends BaseScriptRuntimeHost {
  calls: string[]
  conditions: Map<string, boolean>
}

function probeHost(): ProbeHost {
  const calls: string[] = []
  const conditions = new Map<string, boolean>()
  return {
    calls,
    conditions,
    execute: vi.fn(async (command) => {
      calls.push(`execute:${command.kind}`)
    }),
    evalCondition: vi.fn((condition) => {
      if (condition.kind !== 'flag') throw new Error(`unexpected condition ${condition.kind}`)
      return conditions.get(condition.flag) ?? false
    }),
    confirm: vi.fn(async () => {
      calls.push('confirm')
      return true
    }),
    startBattle: vi.fn(async () => {
      calls.push('startBattle')
      return 'victory' as const
    }),
    teleportOut: vi.fn(async () => {
      calls.push('teleportOut')
      return true
    }),
    wait: vi.fn(async () => {}),
    waitWorldTick: vi.fn(async () => {}),
    yieldMacroTask: vi.fn(async () => {}),
  }
}

interface Snapshot {
  kind: 'checkpoint' | 'ready'
  cursor: FlowCursor | undefined
  frames: readonly unknown[]
  ready: boolean
}

interface ProbeController extends FlowCursorController {
  cursors: FlowCursor[]
  snapshots: Snapshot[]
  gateTurns: number
}

function probeController(readyDecisions: ('wait' | 'stop')[] = []): ProbeController {
  const controller: ProbeController = {
    checkpointEnabled: true,
    cursors: [],
    snapshots: [],
    gateTurns: 0,
    checkpoint: (cursor, resume, ready) => {
      controller.snapshots.push({ kind: 'checkpoint', cursor, frames: resume.frames, ready })
      return 'continue'
    },
    setCheckpointReady: (ready) => {
      controller.snapshots.push({ kind: 'ready', cursor: undefined, frames: [], ready })
      return readyDecisions.shift() ?? 'continue'
    },
    waitForCheckpointGate: async () => {
      controller.gateTurns++
    },
    reachSafePoint: async (cursor) => {
      controller.cursors.push(structuredClone(cursor))
      return 'continue' as const
    },
  }
  return controller
}

function resumeOf(frames: AutoScriptContinuation['frames']): AutoScriptContinuation {
  return { digest, frames }
}

describe('HL1 续跑控制帧', () => {
  test('confirm 相位帧重放已选臂,宿主 confirm 不再询问', async () => {
    const host = probeHost()
    const controller = probeController()
    const flow = compile({
      kind: 'stages',
      initial: 'one',
      stages: [
        {
          id: 'one',
          body: [
            {
              kind: 'confirm',
              onYes: [{ kind: 'giveMoney', delta: 5 }],
              onNo: [{ kind: 'giveMoney', delta: 9 }],
            },
            { kind: 'giveMoney', delta: 1 },
          ],
        },
      ],
    })
    await new ScriptRunnerCore(host, new AbortController().signal).runFlow(flow, {
      cursor: { kind: 'stage', stage: 'one' },
      resume: resumeOf([{ index: 0, control: { kind: 'confirm', arm: 'onYes' } }]),
      cursorController: controller,
    })
    expect(host.calls).toEqual(['execute:giveMoney', 'execute:giveMoney'])
    expect(host.confirm).not.toHaveBeenCalled()
  })

  test('startBattle 已知战败相位只重放 onLose,不重开战斗', async () => {
    const host = probeHost()
    const controller = probeController()
    const flow = compile({
      kind: 'stages',
      initial: 'one',
      stages: [
        {
          id: 'one',
          body: [
            {
              kind: 'startBattle',
              enemyTeamId: 'team-1',
              onLose: [{ kind: 'giveMoney', delta: 6 }],
              onFlee: [{ kind: 'giveMoney', delta: 7 }],
            },
          ],
        },
      ],
    })
    await new ScriptRunnerCore(host, new AbortController().signal).runFlow(flow, {
      cursor: { kind: 'stage', stage: 'one' },
      resume: resumeOf([{ index: 0, control: { kind: 'startBattle', arm: 'onLose' } }]),
      cursorController: controller,
    })
    expect(host.calls).toEqual(['execute:giveMoney'])
    expect(host.startBattle).not.toHaveBeenCalled()
  })

  test('teleportOut 已知失败相位只重放 onFail,不再传出', async () => {
    const host = probeHost()
    const controller = probeController()
    const flow = compile({
      kind: 'stages',
      initial: 'one',
      stages: [
        {
          id: 'one',
          body: [
            {
              kind: 'teleportOut',
              onFail: [{ kind: 'giveMoney', delta: 8 }],
            },
          ],
        },
      ],
    })
    await new ScriptRunnerCore(host, new AbortController().signal).runFlow(flow, {
      cursor: { kind: 'stage', stage: 'one' },
      resume: resumeOf([{ index: 0, control: { kind: 'teleportOut', failed: true } }]),
      cursorController: controller,
    })
    expect(host.calls).toEqual(['execute:giveMoney'])
    expect(host.teleportOut).not.toHaveBeenCalled()
  })
})

describe('HL1 自动单步检查点', () => {
  test('settle 相位写入续跑帧,宿主迟到回执静默不再发布', async () => {
    const host = probeHost()
    const controller = probeController()
    const flow = compile({
      kind: 'stages',
      initial: 'one',
      stages: [
        {
          id: 'one',
          body: [{ kind: 'stepEntity', target: self, dir: 'down' }],
        },
      ],
    })
    let motion: AutomaticMotionCheckpoint | undefined
    const phases: (string | undefined)[] = []
    host.execute = vi.fn(async (_command, context) => {
      host.calls.push('execute:stepEntity')
      motion = context.autoMotionCheckpoint
      if (!motion) throw new Error('stepEntity 叶应携带 autoMotionCheckpoint')
      phases.push(motion.phase) // 无相位帧 → undefined
      motion.settle('continuation')
      phases.push(motion.phase) // 刚写入的相位立即可读
    })
    host.gate = async (_signal, boundary) => {
      if (boundary?.kind !== 'settlement') return
      // 段体已收尾、执行帧栈已空:宿主迟到的相位/就绪回执不得再发布检查点。
      const before = controller.snapshots.length
      motion?.ready()
      motion?.settle('done')
      expect(controller.snapshots.length).toBe(before)
    }
    await new ScriptRunnerCore(host, new AbortController().signal).runFlow(flow, {
      cursorController: controller,
    })
    // 指令执行中发布的续跑游标帧携带 continuation 相位(存档边界的 continuation cursor)。
    expect(
      controller.snapshots.some(
        (snapshot) =>
          snapshot.kind === 'checkpoint' &&
          snapshot.ready === true &&
          JSON.stringify(snapshot.frames) ===
            JSON.stringify([
              { index: 0, control: { kind: 'leaf', command: 'stepEntity', phase: 'continuation' } },
            ]),
      ),
    ).toBe(true)
    // 迟到的 settle('done') 不得留下 done 相位帧。
    expect(
      controller.snapshots.some((snapshot) => JSON.stringify(snapshot.frames).includes('"done"')),
    ).toBe(false)
    expect(phases).toEqual([undefined, 'continuation'])
    expect(controller.cursors).toEqual([{ kind: 'stage', stage: 'one' }])
  })

  test('活发布窗口内的检查点 stop 被吞没,真实错误按原样穿透宿主提交批', async () => {
    const flow = compile({
      kind: 'stages',
      initial: 'one',
      stages: [
        {
          id: 'one',
          body: [{ kind: 'stepEntity', target: self, dir: 'right' }],
        },
      ],
    })
    const runWith = async (
      checkpointImpl: ProbeController['checkpoint'],
    ): Promise<{ calls: string[]; error: unknown }> => {
      const host = probeHost()
      const controller = probeController()
      controller.checkpoint = checkpointImpl
      const outcome: { calls: string[]; error: unknown } = { calls: host.calls, error: undefined }
      host.execute = vi.fn(async (_command, context) => {
        host.calls.push('execute:stepEntity')
        const motion = context.autoMotionCheckpoint
        if (!motion) throw new Error('stepEntity 叶应携带 autoMotionCheckpoint')
        motion.settle('continuation')
        try {
          motion.settle('done')
        } catch (error) {
          outcome.error = error
        }
      })
      try {
        await new ScriptRunnerCore(host, new AbortController().signal).runFlow(flow, {
          cursorController: controller,
        })
      } catch (error) {
        outcome.error = error
      }
      return outcome
    }
    // stop(租约过期):活发布吞没 ScriptStopped,不打断宿主同步提交批,流程照常收尾。
    // settle 的活发布是唯一携带 continuation 相位帧的 ready 发布,与命令前预检区分。
    const stopped = await runWith((_cursor, resume, ready) => {
      const control = resume.frames[0]?.control
      if (ready && control?.kind === 'leaf' && control.phase === 'continuation') return 'stop'
      return 'continue'
    })
    expect(stopped.error).toBeUndefined()
    expect(stopped.calls).toEqual(['execute:stepEntity'])
    // 宿主控制器的真实错误:穿透 settle 原样上抛,不吞没。
    const failure = new Error('controller storage failed')
    const failed = await runWith(() => {
      throw failure
    })
    expect(failed.error).toBe(failure)
  })

  test('宿主持有的检查点在空执行帧上请求变更走 setCheckpointReady 的 wait 门', async () => {
    const flow = compile({
      kind: 'stages',
      initial: 'one',
      stages: [
        {
          id: 'one',
          body: [{ kind: 'stepEntity', target: self, dir: 'up' }],
        },
      ],
    })
    const runWith = async (decisions: ('wait' | 'stop')[]) => {
      const host = probeHost()
      const controller = probeController(decisions)
      let commandCheckpoint: AutomaticCommandCheckpoint | undefined
      host.execute = vi.fn(async (_command, context) => {
        commandCheckpoint = context.autoCommandCheckpoint
      })
      // 段体结束后(执行帧栈已空)宿主仍持有检查点引用,在结算门前请求一次变更。
      host.gate = async (_signal, boundary) => {
        if (boundary?.kind === 'settlement') await commandCheckpoint?.beginMutation()
      }
      await new ScriptRunnerCore(host, new AbortController().signal).runFlow(flow, {
        cursorController: controller,
      })
      return controller
    }
    const baseline = await runWith([])
    const waited = await runWith(['wait'])
    // wait 臂:第一次空帧请求挂起,经 checkpointGate 重请求一次后放行;
    // 无决策基线只请求一次即放行。
    expect(waited.gateTurns).toBe(baseline.gateTurns + 1)
    expect(waited.snapshots.filter((s) => s.kind === 'ready').map((s) => s.ready)).toEqual([
      false,
      false,
    ])
    expect(baseline.snapshots.filter((s) => s.kind === 'ready').map((s) => s.ready)).toEqual([
      false,
    ])
    expect(waited.cursors).toEqual([{ kind: 'stage', stage: 'one' }])
  })

  test('setCheckpointReady 返回 stop 时空帧变更令本次激活干净收尾且不提交游标', async () => {
    const host = probeHost()
    const controller = probeController(['stop'])
    const flow = compile({
      kind: 'stages',
      initial: 'one',
      stages: [
        {
          id: 'one',
          body: [{ kind: 'stepEntity', target: self, dir: 'left' }],
        },
      ],
    })
    let commandCheckpoint: AutomaticCommandCheckpoint | undefined
    host.execute = vi.fn(async (_command, context) => {
      commandCheckpoint = context.autoCommandCheckpoint
    })
    host.gate = async (_signal, boundary) => {
      if (boundary?.kind === 'settlement') await commandCheckpoint?.beginMutation()
    }
    await new ScriptRunnerCore(host, new AbortController().signal).runFlow(flow, {
      cursorController: controller,
    })
    expect(controller.cursors).toEqual([])
    expect(controller.snapshots.some((snapshot) => snapshot.kind === 'ready')).toBe(true)
  })
})

describe('HL1 执行帧深', () => {
  test('嵌套分支超过 256 执行帧时精确熔断', async () => {
    const host = probeHost()
    host.conditions.set('deep', true)
    let body: BaseAuthorCommand[] = [{ kind: 'giveMoney', delta: 1 }]
    for (let i = 0; i < 257; i++)
      body = [{ kind: 'branch', cond: { kind: 'flag', flag: 'deep', is: true }, then: body }]
    const flow = compile({
      kind: 'stages',
      initial: 'one',
      stages: [{ id: 'one', body }],
    })
    await expect(
      new ScriptRunnerCore(host, new AbortController().signal).runFlow(flow, {
        cursorController: probeController(),
      }),
    ).rejects.toThrow('ScriptRunnerCore: 执行帧深度超过256')
  })
})
