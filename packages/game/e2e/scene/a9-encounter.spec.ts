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
  // P0.e: bootstrap setStartBattleHandler 闭包内累积计数 — 供 a9 断言"opcode 7 真触发"
  __battleStartCount?: number
  __lastBattleEnemyTeam?: number
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
 * 跳到该 scene → 含 contact NPC → 走向最近草妖 → 距离菱形 Manhattan < 16 → trigger script 跑 →
 * 内含 opcode 7 startBattle → mode 切 'battle'。
 *
 * 走路用 walk(hold key)pattern,scene-system pickFacing 读 input.held。
 * 每段最多 hold 一个 walk 时长;走完每段重新探针 mode / 距离决定下一段。最多 60 段兜底。
 *
 * 历史:
 *  - contact 之前用 npcAt 严格 ==,改菱形 Manhattan < 16 → workaround page.evaluate 去除
 *  - opcode 7 之前 raw skip → 接 startBattle handler 后真做 → mode 终态 'battle' 而非 'event'
 */
test('a9 明雷遇怪 — 跳 scene 15 草妖通道 → 走到 contact → opcode 7 切 mode=battle', async ({
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

  // 截图初始 scene 15(visual baseline,party 在 NPC-anchored BFS center)
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
  // contact 用菱形 Manhattan < 16 判定 — 走到 NPC ±1 步就触发 → mode 切 'event' → trigger 跑 opcode 7。
  // P0.e 简化版:battle 可能瞬间 finalize(空 partyMembers / 资源缺等场景),
  // 用 __battleStartCount 累积观察 — opcode 7 handler 执行即 +1。
  for (let seg = 0; seg < 60; seg++) {
    const probe = await page.evaluate(
      () => {
        const w = window as unknown as Probe
        return {
          party: w.__game.gs.party,
          mode: w.__game.gs.mode,
          battleStarts: w.__battleStartCount ?? 0,
        }
      },
    )
    if (probe.battleStarts > 0) break  // opcode 7 已触发 startBattle handler
    if (probe.mode === 'event') {
      // 等 event-system 跑 opcode 7;空 walk 推进 tick
      await walk(page, 'ArrowDown', 50)
      continue
    }
    const key = pickKey(probe.party.x, probe.party.y, target.x, target.y)
    if (!key) break
    await walk(page, key, 150)
  }

  // 期望:opcode 7 startBattle handler 至少触发一次 + enemyTeamId 是草妖一员(15/16/40)
  const final = await page.evaluate(
    () => {
      const w = window as unknown as Probe
      return {
        battleStarts: w.__battleStartCount ?? 0,
        lastEnemyTeam: w.__lastBattleEnemyTeam,
      }
    },
  )
  expect(final.battleStarts).toBeGreaterThan(0)
  // 草妖 trigger script 真值 (scene-015 ip=6/10/14): enemyTeamId ∈ {15, 16, 40}
  expect([15, 16, 40]).toContain(final.lastEnemyTeam)
})
