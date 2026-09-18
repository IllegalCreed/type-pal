/**
 * TEST-REFORGE-RUNTIME-CONTRACTS-1 E1-E3：CutsceneController 分支派发协议（cutscene-controller.ts）。
 * cutscene-controller.test.ts 已覆盖按序/busy/waitPassive/取消/并发/重放；本文件补
 * clearDialog/cameraSnap/video/frameAnimation 真实分支参数与同 signal、挂起/拒绝时序、
 * 显式零值与可选缺席的传递。只测协议调用，不测画面。
 */
import { describe, expect, test } from 'vitest'
import { deferred } from './__tests__/glm-runtime-contract-fixtures.js'
import type { CutsceneExecutor } from './cutscene-controller.js'
import { CutsceneController } from './cutscene-controller.js'

interface Call {
  method: string
  args: unknown[]
}

/** 记录型 executor：async 方法可换成 deferred 控制；未实现成员被触碰即测试失败。 */
function recordingExecutor(overrides: Record<string, unknown> = {}): {
  exec: CutsceneExecutor
  calls: Call[]
} {
  const calls: Call[] = []
  const record =
    (method: string) =>
    (...args: unknown[]): void => {
      calls.push({ method, args })
    }
  const base: Record<string, unknown> = {
    dialog: record('dialog'),
    clearDialog: record('clearDialog'),
    fade: record('fade'),
    cameraPan: record('cameraPan'),
    cameraSnap: record('cameraSnap'),
    frameAnimation: record('frameAnimation'),
    video: record('video'),
    wait: record('wait'),
    resetPresentation: record('resetPresentation'),
  }
  // 覆写也先记录再委托（挂起/拒绝控制的分支同样要出现在调用轨迹里）
  for (const [name, impl] of Object.entries(overrides))
    base[name] = (...args: unknown[]) => {
      calls.push({ method: name, args })
      return (impl as (...a: unknown[]) => unknown)(...args)
    }
  return { exec: base as unknown as CutsceneExecutor, calls }
}

const controller = (exec: CutsceneExecutor, runnerActive = () => false) =>
  new CutsceneController(exec, { isRunnerActive: runnerActive })

describe('E1 分支真实参数与同 signal', () => {
  test('clearDialog/cameraSnap/video/frameAnimation 各进对应分支；async 分支收到同一 signal', async () => {
    const { exec, calls } = recordingExecutor()
    const signal = new AbortController().signal
    await controller(exec).run(
      [
        { kind: 'clearDialog' },
        { kind: 'cameraSnap', to: { row: 2, col: 3, height: 1 } },
        { kind: 'video', asset: 'video.v1' },
        {
          kind: 'frameAnimation',
          asset: 'anim.a',
          startFrame: 2,
          endFrame: 9,
          frameRate: 12,
        },
      ],
      signal,
    )
    expect(calls).toEqual([
      { method: 'clearDialog', args: [] },
      { method: 'cameraSnap', args: [{ row: 2, col: 3, height: 1 }] },
      { method: 'video', args: ['video.v1', signal] },
      {
        method: 'frameAnimation',
        args: [{ asset: 'anim.a', startFrame: 2, endFrame: 9, frameRate: 12 }, signal],
      },
    ])
    // async 分支收到的是 run 的同一个 signal 对象（非复制/重建）
    expect(calls[2]?.args[1]).toBe(signal)
    expect(calls[3]?.args[1]).toBe(signal)
  })
})

describe('E2 挂起/拒绝时序', () => {
  test('单个 await intent 挂起时不进下一条；resolve 后按序；同输入正控完整执行', async () => {
    const gate = deferred<void>()
    const { exec, calls } = recordingExecutor({
      video: (_asset: string, _signal: AbortSignal) => gate.promise,
    })
    const cutscene = [{ kind: 'video', asset: 'video.v1' }, { kind: 'clearDialog' }] as const
    const run = controller(exec).run([...cutscene], new AbortController().signal)
    await Promise.resolve()
    expect(calls.map((c) => c.method)).toEqual(['video']) // 挂起：clearDialog 未进
    gate.resolve()
    await run
    expect(calls.map((c) => c.method)).toEqual(['video', 'clearDialog'])
    // 同输入正控（无挂起）：完整执行
    const positive = recordingExecutor()
    await controller(positive.exec).run([...cutscene], new AbortController().signal)
    expect(positive.calls.map((c) => c.method)).toEqual(['video', 'clearDialog'])
  })
  test('executor 拒绝 → run 拒绝、busy 收尾清零、后续 intent 不执行', async () => {
    const { exec, calls } = recordingExecutor({
      video: () => Promise.reject(new Error('codec failed')),
    })
    const c = controller(exec)
    const cutscene = [{ kind: 'video', asset: 'video.v1' }, { kind: 'clearDialog' }] as const
    const run = c.run([...cutscene], new AbortController().signal)
    expect(c.busy()).toBe(true) // 在途
    await expect(run).rejects.toThrow('codec failed')
    expect(c.busy()).toBe(false) // 收尾：activeRuns 清理
    expect(calls.map((x) => x.method)).toEqual(['video']) // 后续未执行
  })
})

describe('E3 显式零值与可选缺席传递', () => {
  test('frameAnimation startFrame:0 显式保留；fade ms 缺省 300 / 显式 0 保留', async () => {
    const { exec, calls } = recordingExecutor()
    const signal = new AbortController().signal
    await controller(exec).run(
      [
        { kind: 'frameAnimation', asset: 'anim.a', startFrame: 0, endFrame: 3 },
        { kind: 'fade', dir: 'out' },
        { kind: 'fade', dir: 'in', ms: 0 },
        { kind: 'cameraSnap' }, // to 缺席
      ],
      signal,
    )
    expect(calls[0]?.args[0]).toEqual({ asset: 'anim.a', startFrame: 0, endFrame: 3 })
    expect(calls[1]?.args[0]).toBe('out')
    expect(calls[1]?.args[1]).toBe(300) // 缺省 ms
    expect(calls[2]?.args[1]).toBe(0) // 显式 0 不丢
    expect(calls[3]?.args[0]).toBeUndefined() // cameraSnap to 缺省 → undefined
  })
})
