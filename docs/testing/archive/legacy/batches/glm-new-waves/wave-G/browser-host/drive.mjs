/**
 * GLM Wave G 隔离 battle trial 视觉驱动（真实浏览器 + 真实 runBattleTrial + 真实 pal 工程）。
 * 产出仅落 /tmp/type-pal-glm-new-wave/G/（截图）与 wave-G/（证据 JSON）。
 * 用法：先起 vite（6092），再 node docs/testing/archive/legacy/batches/glm-new-waves/wave-G/browser-host/drive.mjs
 *
 * r1 返工：逐条记录 ≥400 响应与失败请求的 URL/status，并按
 * `readProjectSaveState`（project-save-state.ts:17-22 NotFound→null=无存档档位）
 * 归因；无法归因的失败请求 → consoleUnattributed>0，视觉 console 标未证。
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../../..')
const outDir = '/tmp/type-pal-glm-new-wave/G'
const evidenceDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
mkdirSync(outDir, { recursive: true })

// playwright 经 editor 包依赖解析（worktree 环境 root node_modules 无 playwright 包目录）。
const { chromium } = createRequire(resolve(repoRoot, 'packages/editor/package.json'))('playwright')

const consoleLog = []
const failedRequests = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (message) =>
  consoleLog.push({ type: message.type(), text: message.text().slice(0, 400) }),
)
page.on('pageerror', (error) =>
  consoleLog.push({ type: 'pageerror', text: String(error).slice(0, 400) }),
)
page.on('response', (response) => {
  if (response.status() >= 400)
    failedRequests.push({ url: response.url(), status: response.status() })
})
page.on('requestfailed', (request) => {
  failedRequests.push({ url: request.url(), status: null, failure: request.failure()?.errorText })
})

await page.goto('http://localhost:6092/', { waitUntil: 'domcontentloaded' })

// 1) trial 面板（菜单）出现：三按钮 + 状态离开“正在准备”。
await page.waitForFunction(
  () =>
    [...document.querySelectorAll('button')].some((b) => b.textContent === '停止试打') &&
    document.querySelector('p[role="status"]')?.textContent &&
    document.querySelector('p[role="status"]').textContent !== '正在准备战斗资源…',
  null,
  { timeout: 60000 },
)
const menuStatus = await page.locator('p[role="status"]').innerText()
await page.screenshot({ path: `${outDir}/trial-menu.png`, fullPage: true })

// 2) F5 拦截提示（菜单内的错误/边界反馈）。
await page.keyboard.press('F5')
await page.waitForFunction(
  () =>
    document.querySelector('p[role="status"]')?.textContent ===
    '独立试打不提供存档/读档，本场结果不会保存。',
  null,
  { timeout: 10000 },
)
await page.screenshot({ path: `${outDir}/trial-f5-notice.png`, fullPage: true })

// 3) 错误恢复臂 A：停止试打 → abort 取消真实会话 → 宿主 promise 兑现。
await page.getByRole('button', { name: '停止试打' }).click()
await page.waitForFunction(
  () =>
    document.querySelector('p[role="status"]')?.textContent ===
    '已停止。本场变化已丢弃，可重新试打。',
  null,
  { timeout: 10000 },
)
await page.waitForFunction(
  () => document.getElementById('page-status')?.textContent?.includes('runBattleTrial settled'),
  null,
  { timeout: 10000 },
)
const stopStatus = await page.locator('p[role="status"]').innerText()
const pageStatus = await page.locator('#page-status').innerText()
await page.screenshot({ path: `${outDir}/trial-stop-recovered.png`, fullPage: true })

// 4) 错误恢复臂 B：停止后 restart 解锁；宿主注入的 onRestart 抛错回显状态栏。
await page.getByRole('button', { name: '重新试打' }).click()
await page.waitForFunction(
  () => document.querySelector('p[role="status"]')?.textContent === '重启失败注入（视觉取证）',
  null,
  { timeout: 10000 },
)
const restartErrorStatus = await page.locator('p[role="status"]').innerText()
await page.screenshot({ path: `${outDir}/trial-restart-error.png`, fullPage: true })

await browser.close()

// 404 归因：`.type-pal/save-state.json` 的 404 是「工程目录无存档档位」的预期路径，
// 由产品 `readProjectSaveState`（NotFound → null）消费；其余任何失败请求均不可归因。
const saveStateProbe = (entry) =>
  entry.status === 404 && entry.url.endsWith('/projects/pal/.type-pal/save-state.json')
const unattributed = failedRequests.filter((entry) => !saveStateProbe(entry))
const consoleErrorCount = consoleLog.filter((entry) => entry.type === 'error').length
// console 文本不含 URL，只能以数量对账：error 行数与失败请求数不一致的差值无法逐条归因。
const consoleErrorDelta = consoleErrorCount - failedRequests.length
const attribution = {
  failedRequests,
  saveStateProbe404: failedRequests.filter((entry) => saveStateProbe(entry)).length,
  unattributedCount: unattributed.length,
  unattributed,
  consoleErrorCount,
  consoleErrorVsRequestDelta: consoleErrorDelta,
  rule: '404 × /projects/pal/.type-pal/save-state.json = readProjectSaveState 的预期 NotFound（无存档档位→null）；其余失败请求不可归因',
  consoleAttested: unattributed.length === 0 && consoleErrorDelta === 0,
  consoleAttestedNote:
    consoleErrorDelta === 0
      ? '失败请求全量归因为 save-state 预期 NotFound，console error 行数与失败请求数一致'
      : '失败请求侧已全量归因，但 console error 行数与失败请求数差值非零且文本无 URL，无法逐条归因 → console 标未证',
}

const shots = [
  'trial-menu.png',
  'trial-f5-notice.png',
  'trial-restart-error.png',
  'trial-stop-recovered.png',
]
const evidence = {
  url: 'http://localhost:6092/',
  viewport: '1440x900',
  browser: 'chromium channel=chrome headless',
  steps: [
    'goto / → 等待试打面板三按钮且状态离开“正在准备战斗资源…” → trial-menu.png',
    `menuStatus=${JSON.stringify(menuStatus)}`,
    'keydown F5 → 状态=存读档拦截文案 → trial-f5-notice.png',
    'click 停止试打 → 状态=已停止 + runBattleTrial settled → trial-stop-recovered.png',
    `stopStatus=${JSON.stringify(stopStatus)}`,
    'click 重新试打（停止后解锁；宿主 onRestart 注入抛错）→ 状态=错误回显 → trial-restart-error.png',
    `restartErrorStatus=${JSON.stringify(restartErrorStatus)}`,
  ],
  pageStatus,
  failedRequestAttribution: attribution,
  screenshots: shots.map((name) => ({
    name,
    sha256: createHash('sha256')
      .update(readFileSync(`${outDir}/${name}`))
      .digest('hex'),
  })),
  console: consoleLog,
}
writeFileSync(
  resolve(evidenceDir, 'visual-evidence.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
)
console.log(
  JSON.stringify(
    {
      ok: true,
      consoleAttested: attribution.consoleAttested,
      failedRequests: attribution.failedRequests,
      shots: evidence.screenshots,
      consoleCount: consoleLog.length,
    },
    null,
    2,
  ),
)
