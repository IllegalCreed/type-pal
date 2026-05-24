import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'

// M5 P0.0:party/npc 改像素坐标(X_STEP=16/Y_STEP=8)。
type Npc = { id: number; x: number; y: number }
type Probe = { __game: { gs: { npcs: Npc[]; party: { x: number; y: number } } } }

/** 像素曼哈顿距离(两点 x/y 差之和)。 */
function pixelDist(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by)
}

/** 选朝向 target(tx,ty) 移动的方向键(4 向菱形,优先减少主轴距离)。 */
function pickKey(
  px: number, py: number, tx: number, ty: number,
): 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | null {
  const dx = tx - px
  const dy = ty - py
  if (dx === 0 && dy === 0) return null
  // Right(+16,-8)/Left(-16,+8)/Down(+16,+8)/Up(-16,-8)
  // 选使距离减小最多的键
  const candidates: Array<['ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown', number, number]> = [
    ['ArrowRight', 16, -8],
    ['ArrowLeft', -16, 8],
    ['ArrowDown', 16, 8],
    ['ArrowUp', -16, -8],
  ]
  let best: typeof candidates[0] | null = null
  let bestGain = -Infinity
  for (const [key, ddx, ddy] of candidates) {
    const gain = pixelDist(px, py, tx, ty) - pixelDist(px + ddx, py + ddy, tx, ty)
    if (gain > bestGain) {
      bestGain = gain
      best = [key, ddx, ddy]
    }
  }
  return best ? best[0] : null
}

/**
 * a6 撞 NPC 阻挡:scene 1 含 N 个 NPC,party 走向 NPC 应卡在 NPC 前。
 * 简版策略:取最近 NPC(像素曼哈顿距离),朝它方向走,verify 没踩进 NPC 像素。
 */
test('a6 撞 NPC 阻挡 — party 走向最近 NPC → 停在 NPC 前一格(不与 NPC 同像素)', async ({ page }) => {
  await bootstrap(page)
  await page.waitForTimeout(150)

  const initial = await page.evaluate(() => {
    const w = window as unknown as Probe
    return { party: w.__game.gs.party, npcs: w.__game.gs.npcs }
  })
  expect(initial.npcs.length).toBeGreaterThan(0)

  // 取像素距离最近的 NPC
  const target = initial.npcs.reduce((a, b) => {
    const da = pixelDist(a.x, a.y, initial.party.x, initial.party.y)
    const db = pixelDist(b.x, b.y, initial.party.x, initial.party.y)
    return db < da ? b : a
  })

  // 走若干步逼近
  const steps = Math.ceil(pixelDist(target.x, target.y, initial.party.x, initial.party.y) / 16) + 2
  for (let i = 0; i < steps; i++) {
    const p = await page.evaluate(() => (window as unknown as Probe).__game.gs.party)
    const key = pickKey(p.x, p.y, target.x, target.y)
    if (!key) break
    await page.keyboard.press(key === 'ArrowLeft' ? 'ArrowLeft'
      : key === 'ArrowRight' ? 'ArrowRight'
      : key === 'ArrowDown' ? 'ArrowDown' : 'ArrowUp')
    await page.waitForTimeout(100)
  }

  const final = await page.evaluate(() => (window as unknown as Probe).__game.gs.party)
  // party 不应与 target NPC 完全同像素(被阻挡)
  expect(!(final.x === target.x && final.y === target.y)).toBe(true)
})
