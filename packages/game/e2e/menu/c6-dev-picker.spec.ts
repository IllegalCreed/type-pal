import { expect, test } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'

/**
 * c6 dev panel picker:DOM 浮层,validate 标题 / 3 fixture / scene jump input filter / Cancel 关。
 * M4 P3 T6:scene jump 扩 294 entries,UI 改 input + filter list(前 30)。
 */
test('c6 dev panel picker — B 弹 + 3 fixture + scene jump input filter + Cancel 关', async ({
  page,
}) => {
  await bootstrap(page)

  await page.keyboard.press('b')

  await expect(page.locator('text=Dev: Battle Picker')).toBeVisible()
  await expect(page.locator('button:has-text("fixture-zh1")')).toBeVisible()
  await expect(page.locator('button:has-text("fixture-zh2")')).toBeVisible()
  await expect(page.locator('button:has-text("fixture-end")')).toBeVisible()

  await expect(page.locator('text=Dev: Scene Jump')).toBeVisible()
  // input filter 存在
  await expect(page.locator('input[placeholder*="scene id"]')).toBeVisible()
  // 默认列出前 30 条;scene-1 在前 30 内
  await expect(page.locator('button:has-text("scene-1 (map-")').first()).toBeVisible()
  // filter "17" → scene-17 等
  await page.fill('input[placeholder*="scene id"]', '17')
  await expect(page.locator('button:has-text("scene-17 (map-")')).toBeVisible()

  await page.click('button:has-text("Cancel")')
  await expect(page.locator('text=Dev: Battle Picker')).not.toBeVisible()
})
