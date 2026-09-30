/**
 * GLM Wave N 真实浏览器功能操作取证：reforge dev:pal 标题菜单 → 选择入口 → 世界可玩。
 * 产出：本目录 evidence.json + 截图（SHA256 记录）。不读取或复述其它席结论。
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

// 1) 标题菜单出现：菜单已渲染（菜单选择态由引擎绘制在 canvas 上，以 boot 观察口为准）。
await page.waitForFunction(
  () => {
    const observe = Reflect.get(window, '__tpObserve')
    return !!observe && typeof observe.readBoot === 'function'
  },
  null,
  { timeout: 60000 },
)
await page.waitForTimeout(2500)
const titleShot = resolve(shotDir, 'menu-title.png')
await page.screenshot({ path: titleShot, fullPage: true })
const titleCanvas = await page.evaluate(() => {
  const canvas = document.getElementById('screen')
  return { w: canvas?.width ?? 0, h: canvas?.height ?? 0 }
})

// 2) 功能操作：方向键下移一项并确认（菜单项间移动 + Enter 选择入口）。
await page.keyboard.press('ArrowDown')
await page.waitForTimeout(300)
await page.keyboard.press('ArrowUp')
await page.waitForTimeout(300)
await page.keyboard.press('Enter')
// 选择入口 → boot 继续到世界可玩（boot 观察口 opening 收敛 / 世界挂载）。
await page.waitForFunction(
  () => {
    const world = Reflect.get(window, '__rfWorld')
    return !!world && Array.isArray(world.party) && world.party.length > 0
  },
  null,
  { timeout: 90000 },
)
await page.waitForTimeout(2500)
const worldShot = resolve(shotDir, 'world-after-entry.png')
await page.screenshot({ path: worldShot, fullPage: true })

const worldState = await page.evaluate(() => {
  const world = Reflect.get(window, '__rfWorld')
  const scene = Reflect.get(window, '__rfScene')
  const reforge = Reflect.get(window, '__reforge')
  return {
    partyTemplates: (world?.party ?? []).map((member) => member.template),
    money: world?.money ?? null,
    sceneId: scene?.id ?? reforge?.sceneId ?? null,
    playerPos: reforge?.player?.pos ?? null,
    menuActive: reforge?.renderDebug?.menuActive ?? null,
  }
})

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const evidence = {
  capturedAt: new Date().toISOString(),
  url,
  viewport: { width: 1440, height: 900 },
  browser: 'chrome headless (playwright channel:chrome)',
  operations: [
    'goto ?menu&skip-startup=1',
    'wait for boot observation bridge',
    'ArrowDown → ArrowUp → Enter（标题菜单选择第一入口）',
    'wait for __rfWorld party mount',
  ],
  titleCanvas,
  worldState,
  screenshots: {
    'menu-title.png': sha256(titleShot),
    'world-after-entry.png': sha256(worldShot),
  },
  console: consoleLog,
  failedRequests,
  attributionNote:
    '≥400 响应/失败请求须逐条归因（提取器/资产缺席等）；无法归因的失败请求 → console 标未证。',
}
writeFileSync(resolve(here, '../browser-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)
console.log(
  JSON.stringify(
    {
      worldState,
      screenshots: Object.keys(evidence.screenshots),
      consoleCount: consoleLog.length,
      failedRequestCount: failedRequests.length,
    },
    null,
    2,
  ),
)
await browser.close()
