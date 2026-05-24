import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'

type Npc = { id: number; col: number; row: number }
type Probe = { __game: { gs: { npcs: Npc[]; party: { col: number; row: number } } } }

/**
 * a6 撞 NPC 阻挡:scene 1 含 N 个 NPC,party 走向 NPC cell 应卡在前一格。
 * 简版策略:取最近 NPC(曼哈顿距离),朝它方向走 1 格,verify 没踩进 NPC cell。
 */
test('a6 撞 NPC 阻挡 — party 走向最近 NPC → 停在 NPC 前一格(不与 NPC 同格)', async ({ page }) => {
  await bootstrap(page)
  await page.waitForTimeout(150)

  const initial = await page.evaluate(() => {
    const w = window as unknown as Probe
    return { party: w.__game.gs.party, npcs: w.__game.gs.npcs }
  })
  expect(initial.npcs.length).toBeGreaterThan(0)

  // 取最近 NPC 走 N 步逼近(N 取足够大,撞墙也最多 stuck)
  const target = initial.npcs.reduce((a, b) => {
    const da = Math.abs(a.col - initial.party.col) + Math.abs(a.row - initial.party.row)
    const db = Math.abs(b.col - initial.party.col) + Math.abs(b.row - initial.party.row)
    return db < da ? b : a
  })

  const steps = Math.abs(target.col - initial.party.col) + Math.abs(target.row - initial.party.row) + 2
  for (let i = 0; i < steps; i++) {
    const w = await page.evaluate(() => (window as unknown as Probe).__game.gs.party)
    if (target.col > w.col) await page.keyboard.press('ArrowRight')
    else if (target.col < w.col) await page.keyboard.press('ArrowLeft')
    else if (target.row > w.row) await page.keyboard.press('ArrowDown')
    else if (target.row < w.row) await page.keyboard.press('ArrowUp')
    else break // 到位
    await page.waitForTimeout(100)
  }

  const final = await page.evaluate(() => (window as unknown as Probe).__game.gs.party)
  // party 不应跟 target NPC 完全同格(被阻挡)
  expect(!(final.col === target.col && final.row === target.row)).toBe(true)
})
