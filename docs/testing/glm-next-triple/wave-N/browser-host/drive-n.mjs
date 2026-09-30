/**
 * GLM Wave N 真实浏览器功能操作取证 r2 —— 严格停留标题菜单内（非剧情）：
 * 键盘选择移动 → 进入「读取进度」存档浏览（空档）→ Escape 退回菜单。
 * 不选择任何开局项、不进入 PAL 001/002 叙事路线；无 __rfWorld 等待。
 * 相位切换以 canvas 像素差分证明（选中项有 6 帧 100ms 闪烁，hash 不稳定，故用差分阈值）。
 * 用法：先起 `pnpm --filter @type-pal/reforge dev:pal`（6051），再 node 本脚本。
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const shotDir = resolve(here, '../browser-evidence')
mkdirSync(shotDir, { recursive: true })

const { chromium } = createRequire(resolve(here, '../../../../packages/editor/package.json'))(
  'playwright',
)

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
    failedRequests.push({
      url: response.url().replace('http://localhost:6051', ''),
      status: response.status(),
    })
})
page.on('requestfailed', (request) => {
  failedRequests.push({
    url: request.url().replace('http://localhost:6051', ''),
    status: null,
    failure: request.failure()?.errorText,
  })
})

const url = 'http://localhost:6051/?menu&skip-startup=1'
await page.goto(url, { waitUntil: 'domcontentloaded' })

/** 画布可见像素采样（缩到 160×100 降低闪烁噪声）。 */
const sample = () =>
  page.evaluate(() => {
    const canvas = document.getElementById('screen')
    const off = document.createElement('canvas')
    off.width = 160
    off.height = 100
    const ctx = off.getContext('2d')
    ctx.drawImage(canvas, 0, 0, 160, 100)
    return Array.from(ctx.getImageData(0, 0, 160, 100).data)
  })
/** 两帧可见像素差分占比（RGB 任一通道差 >8 记一次）。 */
const diffRatio = (a, b) => {
  let changed = 0
  for (let i = 0; i < a.length; i += 4) {
    if (
      Math.abs(a[i] - b[i]) > 8 ||
      Math.abs(a[i + 1] - b[i + 1]) > 8 ||
      Math.abs(a[i + 2] - b[i + 2]) > 8
    )
      changed++
  }
  return changed / (a.length / 4)
}
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')

// 0) 标题菜单就绪：boot 观察口出现。
await page.waitForFunction(
  () => {
    const observe = Reflect.get(window, '__tpObserve')
    return !!observe && typeof observe.readBoot === 'function'
  },
  null,
  { timeout: 60000 },
)
await page.waitForTimeout(2000)
const menuBaseline = await sample()
const titleShot = resolve(shotDir, 'menu-title.png')
await page.screenshot({ path: titleShot, fullPage: true })

// 1) 键盘选择移动（可见）：ArrowDown 改变选中项；菜单相位内差分应远小于相位切换阈值。
await page.keyboard.press('ArrowDown')
await page.waitForTimeout(400)
const afterMove = await sample()
const moveDiff = diffRatio(menuBaseline, afterMove)

// 2) 移到「读取进度」（最后一项）并确认：进入存档浏览相位（空档）。
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(120)
}
await page.keyboard.press('Enter')
// 相位切换 = 与菜单基准差分显著（整屏布局变化）；轮询至连续稳定。
let loadDiff = 0
let loadStable = 0
for (let i = 0; i < 40 && loadStable < 3; i++) {
  await page.waitForTimeout(250)
  const current = await sample()
  const d = diffRatio(menuBaseline, current)
  if (d > 0.03 && Math.abs(d - loadDiff) < 0.005) loadStable++
  else loadStable = 0
  loadDiff = d
}
const loadShot = resolve(shotDir, 'menu-load-browser.png')
await page.screenshot({ path: loadShot, fullPage: true })
const loadSample = await sample()

// 3) Escape 退回菜单（边界恢复：空档浏览可退出，不进入任何开局）。
await page.keyboard.press('Escape')
await page.waitForTimeout(600)
const backSample = await sample()
const backToMenuDiff = diffRatio(loadSample, backSample)
const backShot = resolve(shotDir, 'menu-after-escape.png')
await page.screenshot({ path: backShot, fullPage: true })

// 4) 证据断言：全程未进入世界（无 __rfWorld），三相位互相可分。
const worldMounted = await page.evaluate(() => Reflect.has(window, '__rfWorld'))
if (worldMounted) throw new Error('unexpected world boot: story route was entered')
if (!(moveDiff < 0.03)) throw new Error(`menu move diff abnormal: ${moveDiff}`)
if (!(loadDiff > 0.03)) throw new Error(`load phase not visually distinct: ${loadDiff}`)
if (!(backToMenuDiff > 0.03))
  throw new Error(`escape-back not visually distinct: ${backToMenuDiff}`)

const evidence = {
  capturedAt: new Date().toISOString(),
  url,
  viewport: { width: 1440, height: 900 },
  browser: 'chrome headless (playwright channel:chrome)',
  scope: '标题菜单内可见键盘操作；未选择开局项、未进入 PAL 001/002 叙事路线（无 __rfWorld）',
  operations: [
    'goto ?menu&skip-startup=1，等待 boot 观察口',
    `ArrowDown →（可见选中移动，差分 ${moveDiff.toFixed(4)}）`,
    `ArrowDown×6 至「读取进度」→ Enter → 存档浏览相位（与菜单差分 ${loadDiff.toFixed(4)}）`,
    `Escape → 退回菜单相位（与浏览相位差分 ${backToMenuDiff.toFixed(4)}）`,
  ],
  phaseDiffs: { menuMove: moveDiff, menuToLoad: loadDiff, loadBackToMenu: backToMenuDiff },
  worldMounted,
  screenshots: {
    'menu-title.png': sha256(titleShot),
    'menu-load-browser.png': sha256(loadShot),
    'menu-after-escape.png': sha256(backShot),
  },
  console: consoleLog,
  failedRequests,
  attributionNote:
    '≥400 响应/失败请求逐条归因；save-state.json 404 = readProjectSaveState 无存档档位合法探测。',
}
writeFileSync(resolve(here, '../browser-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)
console.log(
  JSON.stringify(
    {
      phaseDiffs: evidence.phaseDiffs,
      worldMounted,
      screenshots: Object.keys(evidence.screenshots),
      consoleCount: consoleLog.length,
      failedRequestCount: failedRequests.length,
    },
    null,
    2,
  ),
)
await browser.close()
