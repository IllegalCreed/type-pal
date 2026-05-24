import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectSceneJump, walk } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

// M5 P0.0:party/npc 改像素坐标(X_STEP=16/Y_STEP=8)。
type Npc = { id: number; x: number; y: number; triggerMode?: number }
type Probe = {
  __game: {
    gs: {
      mode: string
      party: { x: number; y: number }
      npcs: Npc[]
    }
  }
}

const TRIGGER_CONTACT_MIN = 4 // sdlpal global.h kTriggerTouchNear..Farthest

/**
 * 选朝向 target(tx,ty) 移动的方向键(4 向菱形)。
 * M5 P0.0 + sdlpal scene.c:804-805:
 *   Right(East): (+16,+8) 右下;Left(West): (-16,-8) 左上
 *   Down (South): (-16,+8) 左下;Up   (North): (+16,-8) 右上
 */
function pickKey(
  px: number, py: number, tx: number, ty: number,
): 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | null {
  const candidates: Array<['ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown', number, number]> = [
    ['ArrowRight', 16, 8],
    ['ArrowLeft', -16, -8],
    ['ArrowDown', -16, 8],
    ['ArrowUp', 16, -8],
  ]
  const dist = (ax: number, ay: number) => Math.abs(ax - tx) + Math.abs(ay - ty)
  const cur = dist(px, py)
  if (cur === 0) return null
  let best: typeof candidates[0] | null = null
  let bestGain = -Infinity
  for (const c of candidates) {
    const gain = cur - dist(px + c[1], py + c[2])
    if (gain > bestGain) {
      bestGain = gain
      best = c
    }
  }
  return best ? best[0] : null
}

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

  // 取最近草妖(像素曼哈顿距离)
  const target = contactNpcs.reduce((a, b) => {
    const da = Math.abs(a.x - state.party.x) + Math.abs(a.y - state.party.y)
    const db = Math.abs(b.x - state.party.x) + Math.abs(b.y - state.party.y)
    return db < da ? b : a
  })

  // 走 → 触发 contact → loadEventFromNpc 找到 triggerLabel(P3.T1 lazy events 修后)
  // → gs.mode='event' → 事件脚本跑(raw op skip)→ end → mode 回 'explore'
  // 每段只走 1 步(150ms hold = 1 tick @ 10fps),避免走到 NPC 后多余 tick 继续移动。
  for (let seg = 0; seg < 20; seg++) {
    const p = await page.evaluate(
      () => (window as unknown as Probe).__game.gs.party,
    )
    if (p.x === target.x && p.y === target.y) break
    const key = pickKey(p.x, p.y, target.x, target.y)
    if (!key) break

    await walk(page, key, 150)
  }

  // 期望:成功踩进草妖像素(contact 不阻挡 fix 生效)
  const finalParty = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.party,
  )
  expect(finalParty.x).toBe(target.x)
  expect(finalParty.y).toBe(target.y)
})
