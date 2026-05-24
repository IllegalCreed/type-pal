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
      camera: { x: number; y: number }
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
 * 跳到该 scene → 含 contact NPC → 走向最近草妖 → 距离菱形 Manhattan < 16 → mode 切 'event'。
 *
 * 走路用 walk(hold key)pattern,scene-system pickFacing 读 input.held。
 * 每段最多 hold 一个 walk 时长;走完每段重新探针 mode / 距离决定下一段。最多 60 段兜底。
 *
 * 历史:之前 contact 用 npcAt 严格 ==,party 步长 parity 让走不到精确像素 →
 * 用 page.evaluate 把 party teleport 到 NPC 旁 1 步绕过。P0.e fix(sdlpal scene.c:624
 * 菱形 Manhattan < 16)真做后,workaround 去除,直接 greedy walk 走过去即触发。
 */
test('a9 明雷遇怪 — 跳 scene 15 草妖通道 → 走到 contact → 触发 event', async ({
  page,
}) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectSceneJump(page, 'scene-15-mob')

  // 验证含 contact NPC(草妖 4 个 triggerMode>=4)
  const initialState = await page.evaluate(() => {
    const w = window as unknown as Probe
    return { party: w.__game.gs.party, npcs: w.__game.gs.npcs }
  })
  const contactNpcs = initialState.npcs.filter(
    (n) => (n.triggerMode ?? 0) >= TRIGGER_CONTACT_MIN,
  )
  expect(contactNpcs.length).toBeGreaterThan(0)

  // 截图初始 scene 15(visual baseline,party 在 NPC-anchored BFS center 864,1432)
  const initialBuf = await snapshotCanvas(page)
  expect(
    await pixelDiff({
      actual: initialBuf,
      baselinePath: baselinePathFor('scene', 'a9-encounter-initial'),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    }),
  ).toBe(0)

  // 选最近的草妖作 target
  let target = contactNpcs[0]!
  let minDist = Math.abs(target.x - initialState.party.x) + Math.abs(target.y - initialState.party.y) * 2
  for (const n of contactNpcs) {
    const d = Math.abs(n.x - initialState.party.x) + Math.abs(n.y - initialState.party.y) * 2
    if (d < minDist) { minDist = d; target = n }
  }

  // greedy walk:每 seg 选最逼近 target 的方向键 hold 1 walk 时长。
  // contact 用菱形 Manhattan < 16 判定 — 走到 NPC ±1 步就触发 → mode 切 'event'。
  for (let seg = 0; seg < 60; seg++) {
    const probe = await page.evaluate(
      () => {
        const w = window as unknown as Probe
        return { party: w.__game.gs.party, mode: w.__game.gs.mode }
      },
    )
    if (probe.mode === 'event') break  // contact 已触发
    const key = pickKey(probe.party.x, probe.party.y, target.x, target.y)
    if (!key) break
    await walk(page, key, 150)
  }

  // 期望:mode 切 'event'(contact 菱形距离 < 16 触发)
  const finalMode = await page.evaluate(
    () => (window as unknown as Probe).__game.gs.mode,
  )
  expect(finalMode).toBe('event')
})
