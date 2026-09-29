/**
 * GLM Wave G 隔离 battle trial 视觉驱动（真实浏览器 + 真实 runBattleTrial + 真实 pal 工程）。
 * 产出仅落 /tmp/type-pal-glm-new-wave/G/（截图）与本目录（console/hash 证据 JSON）。
 * 用法：先起 vite（6092），再 node docs/testing/glm-new-waves/wave-G/browser-host/drive.mjs
 */
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const outDir = '/tmp/type-pal-glm-new-wave/G'
const evidenceDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
mkdirSync(outDir, { recursive: true })

// playwright 经 editor 包依赖解析（worktree 环境 root node_modules 无 playwright 包目录）。
const { chromium } = createRequire(resolve(repoRoot, 'packages/editor/package.json'))('playwright')

const consoleLog = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (message) =>
  consoleLog.push({ type: message.type(), text: message.text().slice(0, 400) }),
)
page.on('pageerror', (error) => consoleLog.push({ type: 'pageerror', text: String(error).slice(0, 400) }))

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
  () => document.querySelector('p[role="status"]')?.textContent === '独立试打不提供存档/读档，本场结果不会保存。',
  null,
  { timeout: 10000 },
)
await page.screenshot({ path: `${outDir}/trial-f5-notice.png`, fullPage: true })

// 3) 错误恢复臂 A：停止试打 → abort 取消真实会话 → 宿主 promise 兑现。
await page.getByRole('button', { name: '停止试打' }).click()
await page.waitForFunction(
  () => document.querySelector('p[role="status"]')?.textContent === '已停止。本场变化已丢弃，可重新试打。',
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

const shots = ['trial-menu.png', 'trial-f5-notice.png', 'trial-restart-error.png', 'trial-stop-recovered.png']
const evidence = {
  url: 'http://localhost:6092/',
  viewport: '1440x900',
  browser: 'chromium channel=chrome headless',
  steps: [
    'goto / → 等待试打面板三按钮且状态离开“正在准备战斗资源…” → trial-menu.png',
    `menuStatus=${JSON.stringify(menuStatus)}`,
    'keydown F5 → 状态=存读档拦截文案 → trial-f5-notice.png',
    'click 重新试打（宿主 onRestart 注入抛错）→ 状态=错误回显 → trial-restart-error.png',
    `restartErrorStatus=${JSON.stringify(restartErrorStatus)}`,
    'click 停止试打 → 状态=已停止 + runBattleTrial settled → trial-stop-recovered.png',
    `stopStatus=${JSON.stringify(stopStatus)}`,
  ],
  pageStatus,
  screenshots: shots.map((name) => ({
    name,
    sha256: createHash('sha256').update(readFileSync(`${outDir}/${name}`)).digest('hex'),
  })),
  console: consoleLog,
}
writeFileSync(resolve(evidenceDir, 'visual-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, shots: evidence.screenshots, consoleCount: consoleLog.length }, null, 2))
