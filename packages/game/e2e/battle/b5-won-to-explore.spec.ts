import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'

type Probe = { __game: { gs: { mode: string } } }

test('b5 won → mode=explore', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1') // 弱怪,反复攻击易赢

  // 反复 Enter (主菜单 Confirm 攻击 → targetSelect Confirm) 直到战斗结束
  let safety = 40
  while (safety-- > 0) {
    const mode = await page.evaluate(
      () => (window as unknown as Probe).__game.gs.mode,
    )
    if (mode === 'explore') break

    // mainMenu Confirm 攻击 → targetSelect Confirm
    await page.keyboard.press('Enter')
    await page.waitForTimeout(150)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1200) // 等 perform + postAction round 结束
  }

  const finalMode = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.mode,
  )
  expect(finalMode).toBe('explore')
})
