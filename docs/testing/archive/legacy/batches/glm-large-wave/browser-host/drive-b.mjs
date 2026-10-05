/**
 * B 批隔离功能视觉驱动：脚本会话选择→修改→undo。
 * 仅操作本仓 6087 隔离宿主；截图写 /tmp/type-pal-glm-large-wave/，证据 JSON 写回本目录。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(
  new URL('../../../../../../../packages/editor/package.json', import.meta.url).href,
)
const { chromium } = require('playwright')

const OUT = '/tmp/type-pal-glm-large-wave'
mkdirSync(OUT, { recursive: true })
const URL_BASE = 'http://127.0.0.1:6087/index-b.html'
const consoleErrors = []
const evidence = { url: URL_BASE, captures: [], consoleErrors }

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('Failed to load resource'))
    consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))

await page.goto(URL_BASE, { waitUntil: 'networkidle' })

// 选择行 → 修改数值 → 会话落值 → 撤销回到原值。
await page.screenshot({ path: `${OUT}/B1-script-session-initial-1440x900.png`, fullPage: true })
const initial = await page.textContent('[data-body-value]')

// 选中树行（点击含 setVar 的行），在表单里把值 2 改成 9。
const row = page.locator('.cmd-row', { hasText: 'count' }).first()
await row.dblclick()
await page.waitForSelector('[role="dialog"]')
const numberInput = page.locator('[role="dialog"] input[type="number"]')
await numberInput.fill('9')
await page.getByRole('button', { name: '完成' }).click()
await page.waitForSelector('[role="dialog"]', { state: 'detached' })
const afterEdit = await page.textContent('[data-body-value]')
const versionAfterEdit = await page.textContent('[data-version]')
await page.screenshot({ path: `${OUT}/B1-script-session-edited-1440x900.png`, fullPage: true })

await page.click('[data-action="undo"]')
const afterUndo = await page.textContent('[data-body-value]')
const versionAfterUndo = await page.textContent('[data-version]')
await page.screenshot({ path: `${OUT}/B1-script-session-undone-1000x720.png`, fullPage: true })

await page.setViewportSize({ width: 1000, height: 720 })
await page.click('[data-action="redo"]')
const afterRedo = await page.textContent('[data-body-value]')

evidence.captures.push({
  id: 'B1',
  title: '脚本会话：选择行 → 修改命令值 → undo 回原值 → redo 复原',
  viewport: '1440x900 -> 1000x720',
  steps: [
    '初始正文 setVar count=2（截图 B1-script-session-initial-1440x900.png）',
    '双击树行打开属性表单，把值改为 9 完成（截图 B1-script-session-edited-1440x900.png）',
    '点撤销（截图 B1-script-session-undone-1000x720.png）后点重做',
  ],
  expect: '编辑后会话正文 value=9、历史版本 +1；undo 后回到 value=2；redo 后回到 value=9',
  actual: { initial, afterEdit, versionAfterEdit, afterUndo, versionAfterUndo, afterRedo },
})

await browser.close()
writeFileSync(
  new URL('./evidence-browser-b.json', import.meta.url),
  JSON.stringify(evidence, null, 2),
)
console.log(JSON.stringify({ consoleErrors, actual: evidence.captures[0].actual }, null, 2))
