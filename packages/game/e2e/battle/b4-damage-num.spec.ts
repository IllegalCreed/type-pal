import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

/**
 * b4 攻击数字弹幕:Confirm 攻击 → 选 target → 数字飘起来。
 * 数字弹幕跨帧动画,具体 visual 跟截图时机有关,放宽 threshold + diff 上限。
 */
test('b4 攻击数字弹幕 — Confirm 攻击 → 数字飘出', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')

  // mainMenu Confirm 攻击 → targetSelect → Confirm 目标 0
  await page.keyboard.press('Enter')
  await page.waitForTimeout(150)
  await page.keyboard.press('Enter')
  // 等 perform 跑完 + 数字弹幕到峰值(约 15 帧 / 25fps = 600ms)
  await page.waitForTimeout(600)

  const actual = await snapshotCanvas(page)
  const diff = await pixelDiff({
    actual,
    baselinePath: baselinePathFor('battle', 'b4-damage-num'),
    threshold: 0.1, // 数字位置可能 1-2 像素抖动
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })
  // 允许小幅差异(动画时序),但不允许大面积不同
  expect(diff).toBeLessThan(500)
})
