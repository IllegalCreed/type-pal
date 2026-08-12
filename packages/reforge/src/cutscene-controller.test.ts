import { describe, expect, test, vi } from 'vitest'
import type { CutsceneExecutor } from './cutscene-controller.js'
import { CutsceneController } from './cutscene-controller.js'
import type { Cutscene } from './presentation-intent.js'

function executor() {
  const calls: string[] = []
  const exec: CutsceneExecutor = {
    dialog: async () => {
      calls.push('dialog')
    },
    clearDialog: () => {
      calls.push('clearDialog')
    },
    fade: async () => {
      calls.push('fade')
    },
    cameraPan: async () => {
      calls.push('cameraPan')
    },
    cameraSnap: () => {
      calls.push('cameraSnap')
    },
    frameAnimation: async () => {
      calls.push('frameAnimation')
    },
    video: async () => {
      calls.push('video')
    },
    wait: async () => {
      calls.push('wait')
    },
    resetPresentation: vi.fn(() => {
      calls.push('reset')
    }),
  }
  return { calls, exec }
}

describe('CutsceneController (D14-2)', () => {
  test('run 按序执行 intent 且 busy() 期间为 true(K1)', async () => {
    const { calls, exec } = executor()
    const controller = new CutsceneController(exec, { isRunnerActive: () => false })
    expect(controller.busy()).toBe(false)
    const cutscene: Cutscene = [
      { kind: 'dialog', cue: { rows: [] } as never },
      { kind: 'fade', dir: 'out', ms: 100 },
      { kind: 'cameraPan', dx: 1, dy: 0, frames: 2 },
      { kind: 'wait', ms: 10 },
    ]
    const run = controller.run(cutscene, new AbortController().signal)
    expect(controller.busy()).toBe(true)
    await run
    expect(controller.busy()).toBe(false)
    expect(calls).toEqual(['dialog', 'fade', 'cameraPan', 'wait'])
  })

  test('K1:runner 活跃但无 intent 时 busy() 仍 true', () => {
    const { exec } = executor()
    const controller = new CutsceneController(exec, { isRunnerActive: () => true })
    expect(controller.busy()).toBe(true)
  })

  test('后台 wait 不占用呈现锁，auto 环境脚本不会冻结明雷与生命周期世界拍', async () => {
    const { exec } = executor()
    let releaseWait!: () => void
    exec.wait = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseWait = resolve
        }),
    )
    const controller = new CutsceneController(exec, { isRunnerActive: () => false })

    const waiting = controller.waitPassive(320, new AbortController().signal)
    expect(exec.wait).toHaveBeenCalledTimes(1)
    expect(controller.busy()).toBe(false)

    releaseWait()
    await waiting
    expect(controller.busy()).toBe(false)
  })

  test('K3:取消 → 中止后续 intent 且 activeRuns 清理;cancelAll 调 resetPresentation', async () => {
    const { calls, exec } = executor()
    const controller = new CutsceneController(exec, { isRunnerActive: () => false })
    const ac = new AbortController()
    const cutscene: Cutscene = [
      { kind: 'dialog', cue: { rows: [] } as never },
      { kind: 'fade', dir: 'in', ms: 100 },
      { kind: 'wait', ms: 10 },
    ]
    const run = controller.run(cutscene, ac.signal)
    ac.abort()
    await expect(run).rejects.toThrow('aborted')
    expect(controller.busy()).toBe(false)
    // dialog 已执行,后续 wait 未执行。
    expect(calls).toEqual(['dialog'])
    controller.cancelAll()
    expect(calls).toContain('reset')
  })

  test('K5:并发 run 不全局 supersede(资源分域)——两个 run 顺序交错均执行', async () => {
    const { calls, exec } = executor()
    const controller = new CutsceneController(exec, { isRunnerActive: () => false })
    await Promise.all([
      controller.run(
        [{ kind: 'dialog', cue: { rows: [] } as never }],
        new AbortController().signal,
      ),
      controller.run([{ kind: 'fade', dir: 'in', ms: 100 }], new AbortController().signal),
    ])
    expect(calls.filter((c) => c === 'dialog')).toHaveLength(1)
    expect(calls.filter((c) => c === 'fade')).toHaveLength(1)
  })

  test('K7:同 cutscene 两次回放调用序列逐帧一致', async () => {
    const { calls, exec } = executor()
    const controller = new CutsceneController(exec, { isRunnerActive: () => false })
    const cutscene: Cutscene = [
      { kind: 'fade', dir: 'out', ms: 100 },
      { kind: 'cameraPan', dx: 0, dy: 1, frames: 3 },
      { kind: 'wait', ms: 5 },
    ]
    await controller.run(cutscene, new AbortController().signal)
    const first = [...calls]
    calls.length = 0
    await controller.run(cutscene, new AbortController().signal)
    expect(calls).toEqual(first)
  })
})
