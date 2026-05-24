import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'

/**
 * c6 dev panel picker:DOM 浮层,validate 标题 / 3 fixture / 5 scene jump / Cancel 关。
 * scene jump IDs 真值 from M3.5 T16 scene-jumps.json。
 */
test('c6 dev panel picker — B 弹 + 3 fixture + 5 scene jump + Cancel 关', async ({ page }) => {
  await bootstrap(page)

  await page.keyboard.press('b')

  await expect(page.locator('text=Dev: Battle Picker')).toBeVisible()
  await expect(page.locator('button:has-text("fixture-zh1")')).toBeVisible()
  await expect(page.locator('button:has-text("fixture-zh2")')).toBeVisible()
  await expect(page.locator('button:has-text("fixture-end")')).toBeVisible()

  await expect(page.locator('text=Dev: Scene Jump')).toBeVisible()
  await expect(page.locator('button:has-text("scene-1")').first()).toBeVisible()
  await expect(page.locator('button:has-text("scene-14-port")')).toBeVisible()
  await expect(page.locator('button:has-text("scene-15-corridor")')).toBeVisible()
  await expect(page.locator('button:has-text("scene-16-mob")')).toBeVisible()
  await expect(page.locator('button:has-text("scene-17-maze")')).toBeVisible()

  await page.click('button:has-text("Cancel")')
  await expect(page.locator('text=Dev: Battle Picker')).not.toBeVisible()
})
