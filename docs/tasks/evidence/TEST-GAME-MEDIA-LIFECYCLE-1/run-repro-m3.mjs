// TEST-GAME-MEDIA-LIFECYCLE-1 M3 产品缺陷隔离复现(按需运行,故意红,与绿门分列)。r2 按
// Codex 一审 A-R1-02/04 强化:生成测试改用 typed spyOn 原型端口(restoreAllMocks 真恢复,
// 不裸赋值)+ afterEach 经公开事件收妥在途播放器;红形状 JSON 持久保存单列,不再随树删除。
//
// 缺陷(avi-player.ts tryPlay 重试层):首次 play() 被拒 → overlay 点击监听 {once:true};
// 用户第一次点击重试仍被拒时,catch 因 `if (settled || clickOverlay) return` 早退,
// 不重建点击入口,而 overlay 上的一次性监听已被消费 → 后续真实 click 无任何可用重试入口
// (视频无法开始,仅跳过键可逃离)。本工具在 mkdtemp 隔离树生成临时测试,真实调用冻结产品
// 与真实 DOM click,断言「第二次真实 click 应再次发起 play()」——期望恰一红,证明缺陷存在。
// 本复现不进默认 test,不写绿测辩护坏行为,不修产品(交 Codex 裁决)。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  buildIsolatedTree,
  judgeRed,
  persistJson,
  runJudgeProbes,
  runVitestJson,
  sha256Of,
} from './lib-isolated-tree.mjs'

const EV = import.meta.dirname
const REPRO_DIR = 'src/shell/__repro__'
const REPRO_FILE = `${REPRO_DIR}/repro-m3-dead-retry-entry.test.ts`
const REPRO_FULL_NAME = 'repro-m3 隔离复现 连续 autoplay 拒绝后第二次真实 click 应仍有可用重试入口'
const MARKER = 'repro-m3: 第二次真实 click 后应仍有可用重试入口'

const REPRO_TEST = `import { afterEach, describe, expect, it, vi } from 'vitest'
import { playAvi } from '../avi-player.js'

const OVERLAY_TEXT = '点击屏幕开始 / Click to start'

async function flushMicrotasks(): Promise<void> {
  await new Promise<void>((resolve) => { queueMicrotask(resolve) })
  await new Promise<void>((resolve) => { queueMicrotask(resolve) })
}

describe('repro-m3 隔离复现', () => {
  it('连续 autoplay 拒绝后第二次真实 click 应仍有可用重试入口', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const played: HTMLMediaElement[] = []
    // typed spyOn 原型端口(restoreAllMocks 恢复真实 jsdom 实现,不裸赋值)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      played.push(this)
      return Promise.reject(new Error('NotAllowedError: play() rejected (autoplay policy)'))
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
      void this
    })

    void playAvi({ src: '/extracted/videos/1.mp4' })
    await flushMicrotasks() // 首次拒绝 → 点击重试层出现
    const overlay1 = [...document.querySelectorAll('div')].find(
      (d) => d.textContent === OVERLAY_TEXT,
    )
    if (!overlay1) throw new Error('repro-m3 setup: 首次拒绝后未出现点击重试层')

    overlay1.dispatchEvent(new MouseEvent('click', { bubbles: true })) // 第一次重试,仍被拒
    await flushMicrotasks()
    expect(played).toHaveLength(2) // 首播 + 第一次重试

    const overlay2 = [...document.querySelectorAll('div')].find(
      (d) => d.textContent === OVERLAY_TEXT,
    )
    if (!overlay2) throw new Error('repro-m3 setup: 重试被拒后重试层应仍然可见')
    overlay2.dispatchEvent(new MouseEvent('click', { bubbles: true })) // 第二次真实 click
    await flushMicrotasks()

    expect(
      played.length,
      'repro-m3: 第二次真实 click 后应仍有可用重试入口(再次发起 play())',
    ).toBeGreaterThanOrEqual(3)
  })

  // 双路径收尾:断言失败(预期红)也经公开事件 settle 在途播放器,再恢复端口与 DOM。
  afterEach(async () => {
    for (const video of [...document.body.querySelectorAll('video')]) {
      video.dispatchEvent(new Event('ended'))
    }
    await new Promise<void>((resolve) => { queueMicrotask(resolve) })
    await new Promise<void>((resolve) => { queueMicrotask(resolve) })
    document.body.querySelectorAll('video').forEach((v) => { v.remove() })
    document.querySelectorAll('div').forEach((d) => {
      if (d.textContent === OVERLAY_TEXT) d.remove()
    })
    vi.restoreAllMocks()
  })
})
`

const tree = buildIsolatedTree('repro-m3')
try {
  mkdirSync(path.join(tree.game, REPRO_DIR), { recursive: true })
  const reproPath = path.join(tree.game, REPRO_FILE)
  writeFileSync(reproPath, REPRO_TEST)
  const run = runVitestJson(
    tree.game,
    [REPRO_FILE],
    path.join(EV, 'repro-logs/repro-m3.dead-retry.raw'),
    path.join(EV, 'repro-logs/repro-m3.dead-retry.json'),
  )
  const problems = judgeRed(
    run,
    [`${REPRO_FILE} :: ${REPRO_FULL_NAME}`],
    [REPRO_FILE],
    REPRO_FULL_NAME,
    MARKER,
  )
  const failed = run.tests.find((t) => t.status === 'failed')
  // A-R2-01 同门实证:M3 复现也用同一唯一判据,先跑三例真实 Vitest 探针(树内生成、用后删)。
  const judgeProbes = runJudgeProbes(tree, path.join(EV, 'repro-logs'))
  const report = {
    card: 'TEST-GAME-MEDIA-LIFECYCLE-1',
    revision: 'r2(A-R1-02/04:typed spyOn 原型+事件收尾;红形状 JSON 单列持久)',
    axis: 'M3 product-counter:重试点击入口在第一次重试被拒后死亡',
    expected: '故意红(repro-*),与绿门分列;不进默认 test,不计覆盖率',
    command: `node ${path.join('docs/ops/evidence/TEST-GAME-MEDIA-LIFECYCLE-1', 'run-repro-m3.mjs')}`,
    process: {
      exit: run.exit,
      signal: run.signal,
      pid: run.pid,
      spawnError: run.spawnError,
      argv: run.argv,
      cwd: run.cwd,
      env: run.env,
    },
    frozenCheck: 'avi-player.ts sha256 与任务卡冻结值一致(建树时由 lib-isolated-tree 校验)',
    tests: `${run.report.numPassedTests ?? 0} passed / ${run.report.numFailedTests ?? 0} failed / ${run.report.numTotalTests ?? 0} total`,
    failedTest: failed
      ? {
          fullName: failed.fullName,
          status: failed.status,
          failureMessages: failed.failureMessages ?? [],
        }
      : null,
    judgeProblems: problems,
    judgeProbes,
    verdict: problems.length === 0 ? 'real-red-confirmed' : 'NOT-CONFIRMED',
    raw: { file: 'repro-logs/repro-m3.dead-retry.raw', sha256: run.rawSha256 },
    json: { file: 'repro-logs/repro-m3.dead-retry.json', sha256: run.jsonSha256 },
    reproTestSha256: sha256Of(reproPath),
    cleanup: '',
  }
  persistJson(path.join(EV, 'repro-m3.json'), JSON.stringify(report, null, 2))
  console.log(`repro-m3 verdict=${report.verdict} exit=${run.exit} ${report.tests}`)
  if (problems.length > 0) process.exitCode = 1
} finally {
  // 清理证明先执行,再回填到已落盘的 JSON(工具可重跑,报告始终含清理证据)。
  const proof = tree.cleanup()
  const file = path.join(EV, 'repro-m3.json')
  if (existsSync(file)) {
    const json = JSON.parse(readFileSync(file, 'utf8'))
    json.cleanup = proof
    persistJson(file, JSON.stringify(json, null, 2))
  }
  console.log(`cleanup: ${proof}`)
}
