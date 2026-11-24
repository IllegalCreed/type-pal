// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { readyTrialFixture } from './__tests__/coverage-wave2/b-trial-catalog.js'
import { deferred } from './__tests__/glm-runtime-contract-fixtures.js'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { type BattleTrialHostOptions, runBattleTrial } from './battle-trial-host.js'

let browser: ShellHost | undefined

afterEach(async () => {
  await browser?.close()
  browser = undefined
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const statusText = (): string => document.querySelector('p[role="status"]')?.textContent ?? ''

const button = (label: string): HTMLButtonElement => {
  const found = [...document.querySelectorAll('button')].find(
    (candidate) => candidate.textContent === label,
  )
  if (!found) throw new Error(`trial panel button missing: ${label}`)
  return found
}

const trialOptions = (
  token: string,
  revision: string,
  hooks: Pick<BattleTrialHostOptions, 'onRestart' | 'onResult'> & { signal?: AbortSignal },
): BattleTrialHostOptions => ({
  signal: hooks.signal ?? new AbortController().signal,
  sourceToken: token,
  revision,
  onRestart: hooks.onRestart,
  ...(hooks.onResult ? { onResult: hooks.onResult } : {}),
})

/** 推进真实 rAF 帧直至谓词成立；输入经公开 keydown 路径逐帧消费。 */
async function pumpUntil(predicate: () => boolean, frames = 400): Promise<void> {
  for (let i = 0; i < frames && !predicate(); i += 1) {
    browser!.key(' ')
    await browser!.frame(100)
    await browser!.settleIO()
  }
  expect(predicate(), 'trial battle did not finish within frame budget').toBe(true)
}

test('无 #screen 画布时入口精确 fail-loud（battle-trial-host.ts:33）', async () => {
  // jsdom Blob 缺 stream()；与其余 harness 同型以 Node 原生 Blob 供 fixture 编码用。
  const nodeBufferModule = 'node:buffer'
  const native = await import(nodeBufferModule)
  vi.stubGlobal('Blob', (native as { Blob: typeof Blob }).Blob)
  const f = await readyTrialFixture()
  document.body.replaceChildren() // 单点移除画布：合法宿主的唯一变异
  await expect(
    runBattleTrial(
      f.project,
      f.config,
      trialOptions(f.token, f.revision, { onRestart: () => undefined }),
    ),
  ).rejects.toThrowError('独立试打缺少可用画布')
})

test('a real trial victory reports exact rewards and health in the host', async () => {
  browser = await installShellHost()
  const f = await readyTrialFixture()
  const member = f.config.party.members[0]
  if (!member) throw new Error('fixture party missing')
  member.stats.attack = 9999 // 单点提速：保证帧预算内真实击杀，不改变被测合同
  // 真实会话默认走 Math.random；固定敌普攻的 7/17 被动格挡掷骰，避免同一组全绿测试
  // 偶尔不经过格挡表现链，令受保护 fast coverage 在相同产品源码上随机回退。
  vi.spyOn(Math, 'random').mockReturnValue(0.99)
  const results: string[] = []
  const running = runBattleTrial(
    f.project,
    f.config,
    trialOptions(f.token, f.revision, {
      onRestart: () => undefined,
      onResult: (result) => results.push(result),
    }),
  )
  await vi.waitFor(() => expect(statusText()).toContain('战斗中'))
  await pumpUntil(() => statusText().includes('胜利'))
  await running
  expect(results).toEqual(['胜利'])
  expect(statusText()).toContain('金钱 100 → 101；')
  expect(statusText()).toContain('体力 100 → 100') // 固定格挡后未扣血
  expect(statusText()).toContain('本场结果不保存')
})

test('停止按钮：abort 取消真实会话、runBattleTrial 兑现、restart 复位并回调 onRestart', async () => {
  browser = await installShellHost()
  const f = await readyTrialFixture()
  const outer = new AbortController()
  const results: string[] = []
  const restarts: number[] = []
  const running = runBattleTrial(
    f.project,
    f.config,
    trialOptions(f.token, f.revision, {
      signal: outer.signal,
      onRestart: () => {
        restarts.push(1)
      },
      onResult: (result) => results.push(result),
    }),
  )
  await vi.waitFor(() => expect(statusText()).toContain('战斗中'))
  expect(button('重新试打').disabled).toBe(true) // 运行中禁止 restart
  button('停止试打').click()
  await running // abort 路径下宿主 promise 必须 settle（finally 释放监听）
  expect(statusText()).toBe('已停止。本场变化已丢弃，可重新试打。')
  expect(button('重新试打').disabled).toBe(outer.signal.aborted) // 外层未 abort → 可用
  expect(results).toEqual([]) // 取消不产生 onResult
  button('重新试打').click()
  expect(restarts).toEqual([1])
})

test('onRestart 抛错时错误消息回显状态栏（错误恢复臂）', async () => {
  browser = await installShellHost()
  const f = await readyTrialFixture()
  const outer = new AbortController()
  const running = runBattleTrial(
    f.project,
    f.config,
    trialOptions(f.token, f.revision, {
      signal: outer.signal,
      onRestart: () => {
        throw new Error('重启失败注入')
      },
    }),
  )
  await vi.waitFor(() => expect(statusText()).toContain('战斗中'))
  button('停止试打').click() // 运行中 restart 禁用；先停止解锁再点
  await running
  button('重新试打').click()
  expect(statusText()).toBe('重启失败注入')
})

test.each([
  { exit: 'abort', message: '试打已取消' },
  { exit: 'binding rejection', message: '目录项目绑定在读取期间发生变化' },
] as const)('trial releases a prepared project face after post-read $exit', async ({
  exit,
  message,
}) => {
  const shell = await installShellHost()
  browser = shell
  const f = await readyTrialFixture()
  const controller = new AbortController()
  const rechecked = deferred<void>()
  let prepared = false
  const results: string[] = []
  const running = runBattleTrial(f.project, f.config, {
    signal: controller.signal,
    sourceToken: f.token,
    revision: f.revision,
    // Same placement as withProjectDirectoryReadLock: allocate inside read(), then await recheck.
    withReadLock: async (read) => {
      const value = await read()
      prepared = true
      await rechecked.promise
      if (exit === 'binding rejection') throw new Error(message)
      return value
    },
    onRestart: () => undefined,
    onResult: (result) => results.push(result),
  })

  try {
    await vi.waitFor(() => expect(prepared).toBe(true))
    // The legal project face is 6×8; the browser fixture uses 5×8 bundled chrome.
    const projectFaces = shell.bitmaps.filter((bitmap) => bitmap.width === 6 && bitmap.height === 8)
    expect(projectFaces).toHaveLength(1)
    const face = projectFaces[0]!
    expect(face.close).not.toHaveBeenCalled()

    if (exit === 'abort') {
      controller.abort()
      await running
    }
    rechecked.resolve()
    await running
    await shell.settleIO()

    const role = exit === 'abort' ? 'status' : 'alert'
    expect(document.querySelector(`[role="${role}"]`)?.textContent).toContain(message)
    expect(shell.frames.size).toBe(0)
    expect(results).toEqual([])
    expect(face.close).toHaveBeenCalledTimes(1)
  } finally {
    controller.abort()
    rechecked.resolve()
    await running
  }
})
