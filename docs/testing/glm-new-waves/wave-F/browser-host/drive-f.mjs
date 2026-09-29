/**
 * F 波隔离功能视觉驱动：脚本命令编辑回显/取消 + 上传器失败恢复。
 * 仅操作本仓 6091 隔离宿主；截图写 /tmp/type-pal-glm-new-wave/F/，证据 JSON 写回本目录。
 * 视觉一（导航/编辑回显）：1440×900 打开编辑弹窗回显 17 → 取消 → 1000×720 重开仍 17。
 * 视觉二（上传失败恢复）：1440×900 合法图集三帧预览 → 帧宽改 10 触发切不开失败 →
 * 1000×720 改回 16 恢复三帧预览（不点应用，零提交）。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(
  new URL('../../../../../packages/editor/package.json', import.meta.url).href,
)
const { chromium } = require('playwright')

const OUT = '/tmp/type-pal-glm-new-wave/F'
mkdirSync(OUT, { recursive: true })
const URL_BASE = 'http://127.0.0.1:6091/'
const consoleErrors = []
const evidence = { url: URL_BASE, viewport: ['1440x900', '1000x720'], captures: [], consoleErrors }

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const noteConsole = (message) => {
  if (message.type() === 'error' && !message.text().includes('Failed to load resource'))
    consoleErrors.push(message.text())
}
page.on('console', noteConsole)
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))

await page.goto(URL_BASE, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-surface="script-editor"]')

// 视觉一：命令编辑回显与取消。
const row = page.locator('[data-surface="script-editor"] [role="treeitem"]').first()
await row.dblclick()
await page.waitForSelector('[role="dialog"][open], [role="dialog"]')
const dialogInput = page
  .locator('[role="dialog"] input[type="number"], [role="dialog"] input')
  .first()
const echoedBefore = await dialogInput.inputValue()
await dialogInput.fill('40')
await page.screenshot({ path: `${OUT}/F1-script-edit-echo-1440x900.png`, fullPage: true })
evidence.captures.push({
  file: 'F1-script-edit-echo-1440x900.png',
  viewport: '1440x900',
  step: '双击等待命令 → 弹窗回显 ms=17 → 修改为 40（未提交）',
  expect: '弹窗输入回显 17，可编辑为 40',
  actual: `回显=${echoedBefore}`,
})
await page.click('[aria-label="关闭"]')
await page.setViewportSize({ width: 1000, height: 720 })
await row.dblclick()
await page.waitForSelector('[role="dialog"]')
const echoedAfterCancel = await page
  .locator('[role="dialog"] input[type="number"], [role="dialog"] input')
  .first()
  .inputValue()
await page.screenshot({ path: `${OUT}/F1-script-edit-cancelled-1000x720.png`, fullPage: true })
evidence.captures.push({
  file: 'F1-script-edit-cancelled-1000x720.png',
  viewport: '1000x720',
  step: '关闭取消 → 重开同一命令弹窗',
  expect: '取消不留草稿：回显仍为 17',
  actual: `回显=${echoedAfterCancel}`,
})
await page.click('[aria-label="关闭"]')

// 视觉二：上传器合法输入、失败回显与恢复。
// 经页面内真实 Canvas→toBlob→DataTransfer 注入（与用户选择同一 change 事件路径）。
await page.setViewportSize({ width: 1440, height: 900 })
const picked = await page.evaluate(async () => {
  const canvas = document.createElement('canvas')
  canvas.width = 48
  canvas.height = 16
  const ctx = canvas.getContext('2d')
  for (const [index, color] of ['#d82020', '#20c840', '#2040d8'].entries()) {
    ctx.fillStyle = color
    ctx.fillRect(index * 16, 0, 16, 16)
  }
  const blob = await new Promise((done) => canvas.toBlob(done, 'image/png'))
  const file = new File([blob], 'atlas.png', { type: 'image/png' })
  const input = document.querySelector('[data-surface="uploader"] input[type="file"]')
  const transfer = new DataTransfer()
  transfer.items.add(file)
  input.files = transfer.files
  input.dispatchEvent(new Event('change', { bubbles: true }))
  return { name: file.name, bytes: file.size }
})
await page.waitForSelector('[data-surface="uploader"] .bsu-frame-summary')
const frameSummary = (await page.textContent('[data-surface="uploader"] .bsu-frame-summary')).trim()
const widthInput = page.locator('[data-surface="uploader"] [aria-label="战斗精灵帧宽"]')
await widthInput.fill('10')
await page.waitForTimeout(150)
const failureText = (await page.textContent('[data-surface="uploader"] .bsu-frame-summary')).trim()
const applyDisabled = await page
  .locator('[data-surface="uploader"] button', { hasText: '应用外观' })
  .isDisabled()
await page.screenshot({ path: `${OUT}/F2-uploader-failure-1440x900.png`, fullPage: true })
evidence.captures.push({
  file: 'F2-uploader-failure-1440x900.png',
  viewport: '1440x900',
  step: `页面内 Canvas 生成 48×16 PNG 并经 DataTransfer 选择（picked=${JSON.stringify(picked)}）→ 预览 3 帧 → 帧宽改 10`,
  expect: '先显「共 3 帧（横排逐行切）」，失败显「图 48×16 切不开（宽高须整除）」且应用禁用',
  actual: `healthy=${frameSummary} failure=${failureText} applyDisabled=${applyDisabled}`,
})
await page.setViewportSize({ width: 1000, height: 720 })
await widthInput.fill('16')
await page.waitForTimeout(150)
const recovered = (await page.textContent('[data-surface="uploader"] .bsu-frame-summary')).trim()
const recoveredThumbs = await page
  .locator('[data-surface="uploader"] .bsu-frame-grid canvas')
  .count()
const status = (await page.textContent('[data-apply-status]')).trim()
await page.screenshot({ path: `${OUT}/F2-uploader-recovered-1000x720.png`, fullPage: true })
evidence.captures.push({
  file: 'F2-uploader-recovered-1000x720.png',
  viewport: '1000x720',
  step: '帧宽改回 16 恢复',
  expect: '恢复「共 3 帧（横排逐行切）」且 3 枚预览格；未点应用 → 零提交',
  actual: `recovered=${recovered} thumbs=${recoveredThumbs} status=${status}`,
})

await browser.close()
evidence.ok =
  echoedBefore === '17' &&
  echoedAfterCancel === '17' &&
  frameSummary.includes('共 3 帧') &&
  failureText.includes('切不开') &&
  applyDisabled &&
  recovered.includes('共 3 帧') &&
  recoveredThumbs === 3 &&
  consoleErrors.length === 0
writeFileSync(
  new URL('./evidence-browser-f.json', import.meta.url),
  `${JSON.stringify(evidence, null, 2)}\n`,
)
console.log(
  JSON.stringify({ ok: evidence.ok, captures: evidence.captures, consoleErrors }, null, 2),
)
