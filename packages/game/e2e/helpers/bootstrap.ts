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
    () =>
      (window as unknown as { __game?: { gs: { mode: string } } }).__game?.gs?.mode ?? 'unknown',
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

/**
 * 点 picker 内 scene jump 按钮。
 * M4 P3 T6:scene picker 改 input + filter list。
 * jumpId 可传 sceneId 数字字符串(如 "14")或 jump id(如 "scene-15-mob");
 * helper 先在 input 填入数字 filter 缩小列表,再按 jumpId 精确 or fallback 点击。
 */
export async function selectSceneJump(page: Page, jumpId: string): Promise<void> {
  // 提取纯数字部分用于 filter(如 "scene-15-mob" → "15")
  const numMatch = jumpId.match(/\d+/)
  const filter = numMatch ? numMatch[0] : jumpId
  const input = page.locator('input[placeholder*="scene id"]')
  await input.fill(filter)
  // 优先尝试精确 jumpId 开头匹配(如 "scene-15-mob (");
  // 若不存在则 fallback 到数字前缀(如 "scene-14 (")兼容老 jumpId(scene-14-port 等)
  const exactLocator = page.locator(`button:has-text("${jumpId} (")`)
  const exactCount = await exactLocator.count()
  if (exactCount > 0) {
    await exactLocator.first().click()
  } else {
    await page.locator(`button:has-text("scene-${filter} (")`).first().click()
  }
  // dev jump 是 async loadScene + applySceneAssetsToPresent,P3.T1 新增 events fetch
  // 等 2s 确保 3 个并发 fetch(scene,tilemap,events)+ apply 全部完成
  await page.waitForTimeout(2000)
}

/**
 * 走路:hold key durationMs 触发多次 walk tick,然后 up + 缓冲。
 *
 * scene-system pickFacing 读 input.held,page.keyboard.press 只 hold ~10ms,
 * 60fps RAF 大概率 miss → 0 walk。固定 hold 时长更稳。
 *
 * 经验值(scene-system M2 一 tick 一 cell):每 cell ~120ms 内通常 OK,留 50ms slack。
 */
export async function walk(
  page: Page,
  key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown',
  durationMs: number,
): Promise<void> {
  await page.keyboard.down(key)
  await page.waitForTimeout(durationMs)
  await page.keyboard.up(key)
  await page.waitForTimeout(100) // 让 input.pressed.clear 完成 + party 最后 1 tick 落地
}

/**
 * 菜单切光标:press + 150ms 缓冲,确保 input.pressed 被 1 tick 消费 + 清空,
 * 避免相邻 press 折叠成同一 tick 内单次 pressed。
 *
 * battle-system mainMenu / magic / item / target handler 都用 pressed.has(...) edge 触发。
 */
export async function pressMenu(
  page: Page,
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Enter' | 'Escape',
): Promise<void> {
  await page.keyboard.press(key)
  await page.waitForTimeout(150)
}
