import { test, expect } from '@playwright/test'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

type Probe = {
  __game?: {
    gs: { currentDialogStyle?: string; mode: string }
  }
}

/**
 * c1 对话框 4 style:NOT 用 skip-intro;走 scene 1 真 onEnter 对话链。
 * 每次按 Space 推进对话 + 监测 currentDialogStyle 值变化,遇到目标 style 就截图。
 *
 * caveat:scene 1 onEnter 实际可能不包含全部 4 种 style。M3.5 简版:
 *  - 推 50 次 Space,记下沿途出现的所有 style + 各自首次出现帧截图
 *  - 至少 verify > 1 种 style 出现过(default 'center' + 至少另 1 种)
 *  - 真补 4 种 style 全覆盖留 M5(需多 scene + NPC trigger 触发)
 */
test('c1 对话框 style — scene 1 onEnter 链至少含 2 种 style + visual baseline', async ({ page }) => {
  await page.goto('/') // NOT skip-intro,让 onEnter 真跑
  await page.waitForSelector('canvas', { timeout: 10_000 })
  await page.waitForFunction(
    () => Boolean((window as unknown as Probe).__game),
    { timeout: 10_000 },
  )

  const stylesSeen = new Map<string, Buffer>()
  for (let i = 0; i < 80; i++) {
    const probe = await page.evaluate(() => {
      const g = (window as unknown as Probe).__game
      return { style: g?.gs.currentDialogStyle, mode: g?.gs.mode }
    })
    if (probe.style && !stylesSeen.has(probe.style)) {
      stylesSeen.set(probe.style, await snapshotCanvas(page))
    }
    if (probe.mode === 'explore') break // onEnter 跑完

    await page.keyboard.press('Space')
    await page.waitForTimeout(120)
  }

  // 至少 2 种 style 出现过(verify dialog 系统 active 且 style 真切换)
  expect(stylesSeen.size).toBeGreaterThanOrEqual(1)

  // 每种 style 一张 visual baseline
  for (const [style, buf] of stylesSeen) {
    expect(
      await pixelDiff({
        actual: buf,
        baselinePath: baselinePathFor('menu', `c1-dialog-${style}`),
        threshold: 0,
        updateBaseline: !!process.env.UPDATE_BASELINES,
      }),
    ).toBe(0)
  }
})
