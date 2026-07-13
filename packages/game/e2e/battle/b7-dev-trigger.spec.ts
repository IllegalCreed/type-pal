import { expect, test } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'

type Probe = {
  __game: {
    gs: {
      mode: string
      battleState?: { players: unknown[]; enemies: unknown[] }
    }
  }
}

test('b7 dev panel 触发战斗 — B → picker → fixture-zh1 → battle init', async ({ page }) => {
  await bootstrap(page)

  // 起点 explore
  expect(await page.evaluate(() => (window as unknown as Probe).__game.gs.mode)).toBe('explore')

  // 按 B → picker visible
  await page.keyboard.press('b')
  await expect(page.locator('text=Dev: Battle Picker')).toBeVisible()

  // 点 fixture-zh1 → mode 切 battle
  await page.click('button:has-text("fixture-zh1")')
  await page.waitForFunction(() => (window as unknown as Probe).__game.gs.mode === 'battle', {
    timeout: 5_000,
  })

  const battleState = await page.evaluate(() => (window as unknown as Probe).__game.gs.battleState)
  expect(battleState).toBeTruthy()
  expect(battleState!.players.length).toBeGreaterThan(0)
  expect(battleState!.enemies.length).toBeGreaterThan(0)
})
