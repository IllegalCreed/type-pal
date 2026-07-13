import { expect, test } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'

type Probe = { __game: { gs: { mode: string } } }

test('b6 flee → mode=explore', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')

  // 反复 cursor 切到 4(逃跑)+ Confirm 直到 mode=='explore'
  let safety = 30
  while (safety-- > 0) {
    const mode = await page.evaluate(() => (window as unknown as Probe).__game.gs.mode)
    if (mode === 'explore') break

    // mainMenu 状态:下 4 次到 cursor=4(逃跑)→ Confirm
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(50)
    }
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1200)
  }

  const finalMode = await page.evaluate(() => (window as unknown as Probe).__game.gs.mode)
  expect(finalMode).toBe('explore')
})
