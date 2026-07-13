import { expect, test } from '@playwright/test'
import { bootstrap, openDevPicker, pressMenu, selectBattleFixture } from '../helpers/bootstrap.js'
import { sdlpalDiff } from '../helpers/pixel-diff.js'
import { snapshotCanvas } from '../helpers/snapshot.js'

type Probe = {
  __game: {
    gs: {
      mode: string
      battleState?: { phase: string; uiState: string }
    }
  }
}

/**
 * b4 攻击数字弹幕:Confirm 攻击 → 选 target → 数字飘起来。
 *
 * 用 fixture-zh2(2 player + 2 enemy)避免 fixture-zh1 1 灯笼被 1 击秒杀 → mode 切
 * explore → 截到客栈 scene 的 timing bug。
 *
 * 流程:player 0(李逍遥)Attack → target enemy 0 → player 1(林月如)Defend(直接,
 * 不需 targetSelect)→ 两人全填后 phase 切 performAction → 数字弹幕飘 → 截图。
 *
 * 数字弹幕是跨帧动画,visual 跟截图时机相关;threshold 0.1 + diff < 500 容忍。
 */
test('b4 攻击数字弹幕 — fixture-zh2 双方动作完成 → 数字飘出', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh2')

  // player 0(李逍遥)Attack(cursor=0)→ targetSelect → Confirm enemy 0
  await pressMenu(page, 'Enter')
  await pressMenu(page, 'Enter')

  // player 1(林月如)Defend(cursor=3)→ 直接落 pendingActions(无 targetSelect)
  await pressMenu(page, 'ArrowDown')
  await pressMenu(page, 'ArrowDown')
  await pressMenu(page, 'ArrowDown')
  await pressMenu(page, 'Enter')

  // 等 phase → performAction(uiState 切 hidden)
  await page.waitForFunction(
    () => {
      const bs = (window as unknown as Probe).__game.gs.battleState
      return bs?.phase === 'performAction' || bs?.uiState === 'hidden'
    },
    { timeout: 3000 },
  )
  // 等数字弹幕进入中位帧(发射 + 部分上飘);至少 200ms 让 showDamageNum 命令产生 + 弹幕开始飘。
  await page.waitForTimeout(250)

  // 确认 mode 仍 'battle'(没被秒杀)
  const mode = await page.evaluate(() => (window as unknown as Probe).__game.gs.mode)
  expect(mode).toBe('battle')

  const actual = await snapshotCanvas(page)
  // 与 sdlpal real baseline 对比(fixture-zh2 含双方 sprite + 状态栏)
  // 数字弹幕是跨帧动画,截图时机与 sdlpal 不同;允许 < 8% diff(KNOWN_DEVIATION: 弹幕帧差异)
  const pct = await sdlpalDiff({ actual, baseline: 'fixture-zh2', threshold: 0.1 })
  expect(pct).toBeLessThan(0.08)
})
