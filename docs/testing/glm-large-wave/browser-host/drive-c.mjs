/**
 * C 批隔离功能视觉驱动：DialogBox bottom→top 槽位共存推进与关闭。
 * 仅操作本仓 6088 隔离宿主；截图写 /tmp/type-pal-glm-large-wave/，证据 JSON 写回本目录。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(
  new URL('../../../../packages/editor/package.json', import.meta.url).href,
)
const { chromium } = require('playwright')

const OUT = '/tmp/type-pal-glm-large-wave'
mkdirSync(OUT, { recursive: true })
const URL_BASE = 'http://127.0.0.1:6088/index-c.html'
const consoleErrors = []
const evidence = { url: URL_BASE, captures: [], consoleErrors }

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1000, height: 720 } })
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('Failed to load resource'))
    consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))

await page.goto(URL_BASE, { waitUntil: 'networkidle' })

await page.click('[data-action="open"]')
await page.waitForTimeout(300)
const bottomObservation = await page.textContent('[data-observe]')
await page.screenshot({ path: `${OUT}/C1-dialog-bottom-slot-1000x720.png` })

await page.click('[data-action="advance"]')
await page.waitForTimeout(300)
const topObservation = await page.textContent('[data-observe]')
await page.screenshot({ path: `${OUT}/C1-dialog-top-slot-1000x720.png` })

await page.click('[data-action="close"]')
const closedObservation = await page.textContent('[data-observe]')
const closedStatus = await page.textContent('[data-status]')

evidence.captures.push({
  id: 'C1',
  title: 'DialogBox：bottom 槽开场 → 推进到 top 槽共存 → 关闭清空',
  viewport: '1000x720',
  steps: [
    '打开对话（截图 C1-dialog-bottom-slot-1000x720.png）：bottom 槽 speaker+正文',
    '推进下一段（截图 C1-dialog-top-slot-1000x720.png）：top 槽接棒',
    '关闭：观察清空、状态 closed',
  ],
  expect: 'open 后 observe.slot=bottom 且画布显示文本；advance 后 slot=top；close 后 observe=null',
  actual: {
    bottomSlot: JSON.parse(bottomObservation ?? '{}').slot,
    bottomPhase: JSON.parse(bottomObservation ?? '{}').phase,
    topSlot: JSON.parse(topObservation ?? '{}').slot,
    topCueIndex: JSON.parse(topObservation ?? '{}').cueIndex,
    closedObservation: closedObservation?.trim(),
    closedStatus: closedStatus?.trim(),
  },
})

await browser.close()
writeFileSync(
  new URL('./evidence-browser-c.json', import.meta.url),
  JSON.stringify(evidence, null, 2),
)
console.log(JSON.stringify({ consoleErrors, actual: evidence.captures[0].actual }, null, 2))
