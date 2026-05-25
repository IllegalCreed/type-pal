import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('a2 队长 sprite — 初始(facing=down)', async ({ page }) => {
  await bootstrap(page)
  await page.waitForTimeout(150)

  const actual = await snapshotCanvas(page)
  const diff = await pixelDiff({
    actual,
    baselinePath: baselinePathFor('scene', 'a2-leader-initial'),
    threshold: 0,
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })
  expect(diff).toBe(0)
})

// facing 4 方向 — 经 page.evaluate 直接 set gs.party.facing(M3.5 T19 dev hook 暴露)。
// 之前用 keyboard.down + 150ms hold 引入 timing nondeterminism(10fps explore =
// 100ms/tick,150ms 卡 1.5 tick 边界,有时 1 tick 有时 2 tick 走,party 位置抖)。
// 走纯渲染 verify:facing 切到 X 后,present 应取 frame `direction × walkFrames`(sdlpal scene.c:755)。
test('a2 队长 sprite — facing 4 方向切换', async ({ page }) => {
  await bootstrap(page)

  const facings = ['down', 'left', 'up', 'right'] as const

  for (const facing of facings) {
    await page.evaluate((f) => {
      const w = window as unknown as {
        __game?: {
          gs: {
            party: { facing: string }
            partyScriptedFrame: Record<number, number>
          }
        }
      }
      if (!w.__game) throw new Error('window.__game 缺;DEV gate 没触发')
      w.__game.gs.party.facing = f
      // Sync.2 fix3:清 partyScriptedFrame 避免被 scene 1 onEnter 的 setPartyDirectionAndFrame 覆盖
      w.__game.gs.partyScriptedFrame = {}
    }, facing)
    // 给一帧 RAF 让 presentFrame 跑 → flushToCanvas 上屏
    await page.waitForTimeout(150)

    const actual = await snapshotCanvas(page)
    const diff = await pixelDiff({
      actual,
      baselinePath: baselinePathFor('scene', `a2-leader-facing-${facing}`),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    })
    expect(diff).toBe(0)
  }
})
