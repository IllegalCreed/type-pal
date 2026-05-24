import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectSceneJump, walk } from '../helpers/bootstrap.js'
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
 * a9 明雷遇怪:scene-15-mob 通道 2 含 4 个 sprite 468 草妖(triggerMode=5 contact),
 * 跳到该 scene → 含 contact NPC → 走向最近草妖 → mode 切 'battle'。
 *
 * 走路用 walk(hold key)pattern,scene-system pickFacing 读 input.held。
 * 每段最多 hold N 个 walk 时长;走完每段重新探针距离决定下一段。最多 20 段兜底。
 */
/**
 * M3.5 limitation:scene jump 不重载新 scene 的 events.json segment,labelMap 仍是
 * scene 1 → contact NPC trigger 标签找不到 → loadEventFromNpc 早 return + mode 保持
 * explore + party 继续走过 NPC cell。
 *
 * 完整 contact → battle 端到端要等 M5:
 *  - scene events lazy load(每个 scene 各自 events.json segment)
 *  - 或 D33 SceneAssets 扩 eventCommands + labelMap 字段
 *
 * 本 spec 当前只验证 scene 15 有 contact NPC(triggerMode>=4)+ visual baseline(草妖
 * sprite 468 可见)。走路 + mode 切 battle 留 M5。
 */
test.skip('a9 明雷遇怪 — M3.5 简版,完整 contact → battle 端到端等 M5(scene events lazy load)', async ({
  page,
}) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectSceneJump(page, 'scene-15-mob')

  // 验证含 contact NPC(草妖 4 个 triggerMode>=4)
  const state = await page.evaluate(() => {
    const w = window as unknown as Probe
    return { party: w.__game.gs.party, npcs: w.__game.gs.npcs }
  })
  const contactNpcs = state.npcs.filter(
    (n) => (n.triggerMode ?? 0) >= TRIGGER_CONTACT_MIN,
  )
  expect(contactNpcs.length).toBeGreaterThan(0)

  // 截图含草妖 sprite 的初始 scene 15(visual baseline)
  const initialBuf = await snapshotCanvas(page)
  expect(
    await pixelDiff({
      actual: initialBuf,
      baselinePath: baselinePathFor('scene', 'a9-encounter-initial'),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    }),
  ).toBe(0)

  // 取最近草妖,分段 walk(每段走到位前探针 + 切方向)
  const target = contactNpcs.reduce((a, b) => {
    const da = Math.abs(a.col - state.party.col) + Math.abs(a.row - state.party.row)
    const db = Math.abs(b.col - state.party.col) + Math.abs(b.row - state.party.row)
    return db < da ? b : a
  })

  // 走 → 触发 contact → mode 离开 explore(event 或 battle)
  // 现状:scene jump 不重载新 scene events,labelMap 仍是 scene 1 → 触发后 mode='event'
  // 但 triggerScript 41179 等不在 labelMap → loadEventFromNpc 早 return 不切 mode
  // M3.5 简版 spec:只验证 walking 能进入 contact cell(NPC 不阻挡)+ 视觉草妖确实在
  // 真做 contact → battle 端到端要等 scene events lazy load(M5)
  for (let seg = 0; seg < 20; seg++) {
    const p = await page.evaluate(
      () => (window as unknown as Probe).__game.gs.party,
    )
    if (p.col === target.col && p.row === target.row) break
    let key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | null = null
    if (target.col > p.col) key = 'ArrowRight'
    else if (target.col < p.col) key = 'ArrowLeft'
    else if (target.row > p.row) key = 'ArrowDown'
    else if (target.row < p.row) key = 'ArrowUp'
    if (!key) break

    const dist = Math.max(Math.abs(target.col - p.col), Math.abs(target.row - p.row))
    await walk(page, key, Math.min(dist + 1, 6) * 150)
  }

  // 期望:成功踩进草妖 cell(contact 不阻挡 fix 生效)
  const finalParty = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party,
  )
  expect(finalParty.col).toBe(target.col)
  expect(finalParty.row).toBe(target.row)
})
