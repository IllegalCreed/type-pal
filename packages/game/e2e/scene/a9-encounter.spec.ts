import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectSceneJump } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

type Npc = { id: number; col: number; row: number; triggerMode?: number }
type Probe = {
  __game: {
    gs: {
      mode: string
      party: { col: number; row: number }
      npcs: Npc[]
    }
  }
}

const TRIGGER_CONTACT_MIN = 4 // sdlpal global.h kTriggerTouchNear..Farthest

/**
 * a9 明雷遇怪:scene-16-mob 通道 2 含 4 个 sprite 468 草妖(triggerMode=5 contact),
 * 跳到该 scene → 验证含 contact NPC → 走方向键到 NPC cell → mode 切 'battle'。
 *
 * scene 切换后 partyStart = (col 32, row 32, facing 'down'),草妖位置由真 EventObject 决定;
 * spec 取最近 contact NPC,逐步逼近,最多 30 步后 verify mode==='battle'。
 */
test('a9 明雷遇怪 — 跳 scene 16(通道 2 草妖)→ 走到 contact cell → 进 battle', async ({
  page,
}) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectSceneJump(page, 'scene-16-mob')
  await page.waitForTimeout(300)

  // 验证含 contact NPC(草妖 4 个 triggerMode>=4)
  const state = await page.evaluate(() => {
    const w = window as unknown as Probe
    return { party: w.__game.gs.party, npcs: w.__game.gs.npcs }
  })
  const contactNpcs = state.npcs.filter(
    (n) => (n.triggerMode ?? 0) >= TRIGGER_CONTACT_MIN,
  )
  expect(contactNpcs.length).toBeGreaterThan(0)

  // 截图含草妖 sprite 的初始 scene 16(visual baseline)
  const initialBuf = await snapshotCanvas(page)
  expect(
    await pixelDiff({
      actual: initialBuf,
      baselinePath: baselinePathFor('scene', 'a9-encounter-initial'),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    }),
  ).toBe(0)

  // 取最近草妖,走向它(最多 40 步)
  const target = contactNpcs.reduce((a, b) => {
    const da = Math.abs(a.col - state.party.col) + Math.abs(a.row - state.party.row)
    const db = Math.abs(b.col - state.party.col) + Math.abs(b.row - state.party.row)
    return db < da ? b : a
  })

  for (let i = 0; i < 40; i++) {
    const mode = await page.evaluate(
      () => (window as unknown as Probe).__game.gs.mode,
    )
    if (mode === 'battle') break
    const w = await page.evaluate(
      () => (window as unknown as Probe).__game.gs.party,
    )
    if (target.col > w.col) await page.keyboard.press('ArrowRight')
    else if (target.col < w.col) await page.keyboard.press('ArrowLeft')
    else if (target.row > w.row) await page.keyboard.press('ArrowDown')
    else if (target.row < w.row) await page.keyboard.press('ArrowUp')
    else break
    await page.waitForTimeout(100)
  }

  const finalMode = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.mode,
  )
  expect(finalMode).toBe('battle')
})
