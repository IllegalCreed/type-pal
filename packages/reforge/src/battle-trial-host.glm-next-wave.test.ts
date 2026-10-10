// @vitest-environment jsdom
/**
 * TEST-GLM-NEW-G-1 G02：battle-trial-host 生命周期（全仓首个直接覆盖）。
 * 旧证：battle-trial-config/-prepare/-assets 各 wave2 测试只覆盖数据层；宿主入口
 * `runBattleTrial` 无任何旧测试。本文件以真实工程（readyTrialFixture 内存工程）+
 * jsdom 壳宿主（installShellHost，唯一外部 Canvas/Audio/网络替身）补公开合同：
 *   1) 无 #screen 画布在入口 fail-loud（battle-trial-host.ts:31-33）；
 *   2) F5/F9 存读档键拦截只更新状态、不进 pressed（:116-130）；
 *   3) 真实战斗打到 victory：onResult 映射 + 状态栏金钱/体力摘要（:285-300）；
 *   4) 停止按钮 → abort → 真实会话取消 → runBattleTrial 兑现 + restart 依外层
 *      signal 复位 + onRestart 回调（:140-166）；
 *   5) onRestart 抛错回显错误消息（错误恢复臂 :156-162）。
 * 不 mock 被测核心：BattleSession/准备管线/资源读取全部真实。
 */
import { afterEach, expect, test, vi } from 'vitest'
import { readyTrialFixture } from './__tests__/coverage-wave2/b-trial-catalog.js'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { type BattleTrialHostOptions, runBattleTrial } from './battle-trial-host.js'

let browser: ShellHost | undefined

afterEach(() => {
  browser?.close()
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

test('F5/F9 只更新状态栏存读档提示；真实战斗打到 victory 并回调 onResult(胜利)', async () => {
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
  // F5/F9：拦截为状态提示，绝不进入 pressed（战斗不被打断）。
  for (const key of ['F5', 'F9']) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    expect(statusText()).toBe('独立试打不提供存档/读档，本场结果不会保存。')
  }
  await pumpUntil(() => statusText().includes('胜利'))
  await running
  expect(results).toEqual(['胜利'])
  expect(statusText()).toContain('金钱 100 → ')
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
