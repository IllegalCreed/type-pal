import type { Page } from '@playwright/test'

/**
 * 启动 game (Playwright nav 到 ?skip-intro=1) 并等进 explore mode。
 *
 * skip-intro URL flag(M3.5 commit a9a87ac)跳过 scene 1 onEnter 对话,
 * party 直接在 PARTY_START 位置 explore mode,省去 Space loop 时间。
 */
export async function bootstrap(page: Page): Promise<void> {
  await page.goto('/?skip-intro=1')

  // 等 canvas 渲染出来
  await page.waitForSelector('canvas', { timeout: 30_000 })

  // 等 dev gate 暴露 window.__game 且 gs.mode === 'explore'
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { __game?: { gs: { mode: string } } }).__game
      return g?.gs?.mode === 'explore'
    },
    { timeout: 10_000 },
  )
}

/** 读当前 gs.mode(via dev gate)。 */
export async function getCurrentMode(page: Page): Promise<string> {
  return await page.evaluate(
    () => (window as unknown as { __game?: { gs: { mode: string } } }).__game?.gs?.mode ?? 'unknown',
  )
}

/** 按 B 弹 dev panel picker,等 picker DOM 出来。 */
export async function openDevPicker(page: Page): Promise<void> {
  await page.keyboard.press('b')
  // picker 是 floating div,内含 "Dev: Battle Picker" / "Dev: Scene Jump" 文本
  await page.waitForSelector('text=Dev: Battle Picker', { timeout: 5_000 })
}

/** 点 picker 内 battle fixture 按钮(text 含 fixtureId)。 */
export async function selectBattleFixture(page: Page, fixtureId: string): Promise<void> {
  await page.click(`button:has-text("${fixtureId}")`)
  // 等战斗界面渲染 + selectAction phase 就位
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { __game?: { gs: { mode: string } } }).__game
      return g?.gs?.mode === 'battle'
    },
    { timeout: 5_000 },
  )
  await page.waitForTimeout(300) // 让 battle UI 全渲染一帧
}

/** 点 picker 内 scene jump 按钮(text 含 jumpId)。 */
export async function selectSceneJump(page: Page, jumpId: string): Promise<void> {
  await page.click(`button:has-text("${jumpId}")`)
  // dev jump 是 async loadScene + applySceneAssetsToPresent,等几百 ms 让 fetch + apply 完
  await page.waitForTimeout(500)
}
