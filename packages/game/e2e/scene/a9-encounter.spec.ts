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
 * P3.T1 lazy events 修后 unskip:SceneAssets 扩 eventCommands+labelMap,
 * loadScene 切 scene 时同步换入新 scene 的 events/labelMap,
 * 修 M3.5 ⚠️ #8:scene jump 后旧 labelMap 留内存 → contact NPC triggerLabel 找不到 →
 * loadEventFromNpc 早 return → mode 不切。
 */
test('a9 明雷遇怪 — 跳 scene 15 草妖通道 → 走到 contact cell → 触发 event', async ({
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

  // 走 → 触发 contact → loadEventFromNpc 找到 triggerLabel(P3.T1 lazy events 修后)
  // → gs.mode='event' → 事件脚本跑(raw op skip)→ end → mode 回 'explore'
  // party 已落在 NPC cell;最终断言检查 party 到达 contact cell
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
