/**
 * A 批隔离功能视觉驱动：命令表单清除/取消 + 音效选择缺失恢复。
 * 仅操作本仓 6086 隔离宿主；截图写 /tmp/type-pal-glm-large-wave/，证据 JSON 写回本目录。
 */
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(
  new URL('../../../../packages/editor/package.json', import.meta.url).href,
)
const { chromium } = require('playwright')

const OUT = '/tmp/type-pal-glm-large-wave'
mkdirSync(OUT, { recursive: true })
const URL_BASE = 'http://127.0.0.1:6086/'
const consoleErrors = []
const evidence = { url: URL_BASE, captures: [], consoleErrors }

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('Failed to load resource'))
    consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))

await page.goto(URL_BASE, { waitUntil: 'networkidle' })

// 视觉一：命令表单清除/取消（1440×900 打开表单 + 编辑；1000×720 取消后重开回到原值）。
await page.click('[data-action="open-form"]')
await page.waitForSelector('dialog[open]')
const value = page.locator('[role="dialog"] input[type="number"]')
await value.fill('5')
await page.screenshot({ path: `${OUT}/A1-command-form-editing-1440x900.png`, fullPage: true })
await page.setViewportSize({ width: 1000, height: 720 })
await page.click('[data-action="cancel"]')
await page.waitForSelector('dialog[open]', { state: 'detached' })
const committedAfterCancel = await page.textContent('[data-committed]')
await page.click('[data-action="open-form"]')
await page.waitForSelector('dialog[open]')
const valueAfterReopen = await page.locator('[role="dialog"] input[type="number"]').inputValue()
await page.screenshot({ path: `${OUT}/A1-command-form-after-cancel-1000x720.png`, fullPage: true })
await page.click('[data-action="cancel"]')
await page.waitForSelector('dialog[open]', { state: 'detached' })

evidence.captures.push({
  id: 'A1',
  title: '命令表单：编辑后取消，草稿被清除且不落库',
  viewport: '1440x900 -> 1000x720',
  steps: [
    '打开表单，把「设为」从 2 改为 5（截图 A1-command-form-editing-1440x900.png）',
    '点「取消」关闭弹层，重开表单（截图 A1-command-form-after-cancel-1000x720.png）',
  ],
  expect: '取消后重开，数值输入恢复为 2；已保存值保持 {kind:"setVar",var:"count",value:2}',
  actual: {
    committedAfterCancel,
    valueAfterReopen,
    valueAfterReopenIsOriginal: valueAfterReopen === '2',
  },
})

// 视觉二：音效选择缺失恢复（1440×900 缺失态；1000×720 选中有效资产）。
await page.setViewportSize({ width: 1440, height: 900 })
await page.screenshot({ path: `${OUT}/A2-sound-picker-missing-1440x900.png`, fullPage: true })
const missingState = await page.textContent('[data-visual="sound-picker"]')
await page.setViewportSize({ width: 1000, height: 720 })
const trigger = page.locator('[data-visual="sound-picker"] [role="combobox"]')
await trigger.click()
await page.getByRole('option', { name: /鼓点/ }).click()
const recoveredValue = await page.textContent('[data-sound-value]')
const recoveredState = await page.textContent('[data-visual="sound-picker"]')
await page.screenshot({ path: `${OUT}/A2-sound-picker-recovered-1000x720.png`, fullPage: true })

evidence.captures.push({
  id: 'A2',
  title: '音效资源选择：缺失/类型错误资产显示警告，选择有效资产后恢复',
  viewport: '1440x900 -> 1000x720',
  steps: [
    '初始值为不在目录中的 sound-ghost（截图 A2-sound-picker-missing-1440x900.png）',
    '打开组合框选择「鼓点 (sound-drum)」（截图 A2-sound-picker-recovered-1000x720.png）',
  ],
  expect: '缺失态显示 ⚠ sound-ghost（缺失或类型错误）；选择后显示 鼓点 (sound-drum) 且无警告',
  actual: {
    missingShowsWarning: missingState?.includes('缺失或类型错误'),
    recoveredValue,
    recoveredClean: !recoveredState?.includes('缺失或类型错误'),
  },
})

await browser.close()
writeFileSync(new URL('./evidence-browser-a.json', import.meta.url), JSON.stringify(evidence, null, 2))
console.log(JSON.stringify({ consoleErrors, actuals: evidence.captures.map((c) => c.actual) }, null, 2))
