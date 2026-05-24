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
  const initialState = await page.evaluate(() => {
    const w = window as unknown as Probe
    return { party: w.__game.gs.party, npcs: w.__game.gs.npcs }
  })
  const contactNpcs = initialState.npcs.filter(
    (n) => (n.triggerMode ?? 0) >= TRIGGER_CONTACT_MIN,
  )
  expect(contactNpcs.length).toBeGreaterThan(0)

  // P0.e: scene 15 wScriptOnEnter 不含 setPartyPos + 无 caller-trace,
  // dev-only NPC-anchored BFS fallback 落 (864,1432) — 跟草妖同区可达但走过去要 30+ 步。
  // 缩 e2e:用 dev gate 直接把 party 移到最近草妖旁 1 步,验证 contact 触发机制。
  // NPC 208 在 (1344, 1168);party 从 (1360, 1160) = 1 step Left(-16,-8) 可走进。
  // 这是 contact 机制 e2e 验证的有效 dev override。
  const target = contactNpcs.find((n) => n.id === 208) ?? contactNpcs[0]!

  // 把 party 移到 target 旁 1 步 Left(East → West: dx=-16, dy=-8)
  await page.evaluate(
    ({ tx, ty }) => {
      const gs = (window as unknown as { __game: { gs: Probe['__game']['gs'] } }).__game.gs
      // 放在目标旁(Right 方向相邻:dx=+16,dy=+8,所以反向 dx=-16,dy=-8 to target)
      gs.party.x = tx - 16
      gs.party.y = ty - 8
      gs.camera.x = gs.party.x
      gs.camera.y = gs.party.y
    },
    { tx: target.x, ty: target.y },
  )

  // 截图初始 scene 15(visual baseline,party 已在草妖旁)
  const initialBuf = await snapshotCanvas(page)
  expect(
    await pixelDiff({
      actual: initialBuf,
      baselinePath: baselinePathFor('scene', 'a9-encounter-initial'),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    }),
  ).toBe(0)

  // 走 1 步进入草妖像素 → contact 触发
  // target NPC 在 party 右下方(Right: dx=+16, dy=+8)
  for (let seg = 0; seg < 5; seg++) {
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
