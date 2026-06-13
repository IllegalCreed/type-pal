import type { TrailEntry } from '../core/game-state.js'

export interface FollowerPosState {
  /** 队长(party[0])世界坐标。 */
  party: { x: number; y: number }
  /** 队伍跟随轨迹(trail[0]=最新,越后越早)。 */
  trail: TrailEntry[]
  /** 队伍是否处于走路态(= sdlpal PAL_UpdatePartyGestures 的 fWalking)。 */
  walking: boolean
  /**
   * 每个队员(index 1..)冻结的"相对队长世界偏移"。不走路时复用以**冻结屏幕位置**——
   * 等价 sdlpal 在 else 分支不更新 rgParty[i] 屏幕相对坐标(队长恒在 partyoffset,故"相对队长偏移恒定"
   * ⇔"屏幕坐标恒定"),骑乘时随船锁死。trail 整体重填(0x46/0xA1/进场景/回标题)时应清空。
   */
  frozenOffset: ({ dx: number; dy: number } | null)[]
}

/**
 * 跟随者世界坐标 —— port sdlpal `PAL_UpdatePartyGestures` 的 fWalking 二分支(scene.c:658 vs 745)。
 *
 *  - **walking**(fWalking=TRUE,scene.c:690-717):`trail[1]` + 方向偏移;偏移位撞墙 → 回退 `trail[1]`
 *    (障碍回退 scene.c:712-717,**仅此分支有**);并捕获 `frozenOffset`(= 该位 − 队长)供静止冻结用。
 *  - **not walking**(else,scene.c:745-771):**不重算位置**,冻结 = 队长 + `frozenOffset`。这正是原版
 *    "上船后两人固定站位、随船移动不重叠"的来源(我方旧代码无此闸门 → 演出/骑乘静止时跟随者仍每帧
 *    trail 重定位 + 落水避障回退贴到队长 = 那一下重叠跳变)。无 `frozenOffset`(刚进场景/0x46、还没走过)
 *    → 回退到下方 trail+偏移(= 旧行为,不回归其它场景)。
 *
 * @returns 世界坐标;`trail` 不足(<=1)返回 null(不画跟随者)。
 */
export function computeFollowerWorldPos(
  s: FollowerPosState,
  m: number,
  isWalkable: (x: number, y: number) => boolean,
): { x: number; y: number } | null {
  if (s.trail.length <= 1) return null
  const baseTrail = s.trail[1]!
  const baseDir = baseTrail.dir

  // not walking + 已捕获冻结偏移 → 冻结(scene.c:745 else:位置一行都不更新)
  if (!s.walking) {
    const fo = s.frozenOffset[m]
    if (fo) return { x: s.party.x + fo.dx, y: s.party.y + fo.dy }
    // 未捕获(进场景/0x46 后未走过)→ 落到下方 trail 回退(= 旧行为)
  }

  // 方向偏移(scene.c:695-707)
  let offX: number
  let offY: number
  if (m === 2) {
    offX = baseDir === 'right' || baseDir === 'left' ? -16 : 16 // East||West ? -16 : +16
    offY = 8
  } else {
    offX = baseDir === 'left' || baseDir === 'down' ? 16 : -16 // West||South ? +16 : -16
    offY = baseDir === 'left' || baseDir === 'up' ? 8 : -8 // West||North ? +8 : -8
  }
  let x = baseTrail.x + offX
  let y = baseTrail.y + offY
  // 障碍回退(scene.c:712-717):偏移位撞墙 → 去偏移回到 trail[1]。
  if (!isWalkable(x, y)) {
    x = baseTrail.x
    y = baseTrail.y
  }
  // walking 时捕获冻结偏移(供下次静止帧冻结用;not walking 不捕获,避免冻结值随帧漂移)
  if (s.walking) s.frozenOffset[m] = { dx: x - s.party.x, dy: y - s.party.y }
  return { x, y }
}
