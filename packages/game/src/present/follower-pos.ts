import type { FollowerFrozen, TrailEntry } from '../core/game-state.js'

export interface FollowerPosState {
  /** 队长(party[0])世界坐标。 */
  party: { x: number; y: number }
  /** 队伍跟随轨迹(trail[0]=最新,越后越早)。 */
  trail: TrailEntry[]
  /** 队伍是否处于走路态(= sdlpal PAL_UpdatePartyGestures 的 fWalking)。 */
  walking: boolean
  /**
   * 每个队员(index 1..)的冻结快照(位置偏移 + 朝向)。不走路时复用以**冻结位置与朝向**——
   * 等价 sdlpal 在 else 分支不更新 rgParty[i] 位置、且骑乘期 PAL_GameUpdate 不重设其 wFrame
   * (play.c:144 的 UpdatePartyGestures 仅 NPC 邻近转向才调,骑乘 script.c:300 一般不触发)→
   * 跟随者整帧冻结在"上船走位末帧"状态。trail 整体重填(0x46/0xA1/进场景/回标题)时清空。
   */
  frozenOffset: (FollowerFrozen | null)[]
}

/**
 * 跟随者世界坐标 + 朝向 —— port sdlpal `PAL_UpdatePartyGestures` 的 fWalking 二分支(scene.c:658 vs 745)。
 *
 *  - **walking**(fWalking=TRUE,scene.c:690-730):位置 `trail[1]`+方向偏移(撞墙回退 trail[1],scene.c:712);
 *    朝向 = `trail[2].dir`(scene.c:724/728);并捕获冻结快照(位置偏移 + 朝向)。
 *  - **not walking**(else,scene.c:745-771 + 骑乘期 PAL_GameUpdate 不重设 wFrame,play.c:144 仅 NPC 邻近):
 *    **位置与朝向双双冻结** = 队长 + 冻结偏移、朝向 = 冻结朝向。这是原版"上船后两人固定站位、固定朝向、
 *    随船移动不重叠"的来源(旧代码无此闸门 → 跟随者每帧 trail 重定位 + 重设朝向 = 重叠跳变 + 朝向乱)。
 *    无冻结快照(刚进场景/0x46、还没走过)→ 回退 trail[1]+偏移 + 当前 trail[2].dir(= 旧行为,不回归)。
 *
 * @returns `{x,y,dir}`;`trail` 不足(<=1)返回 null(不画跟随者)。
 */
export function computeFollowerWorldPos(
  s: FollowerPosState,
  m: number,
  isWalkable: (x: number, y: number) => boolean,
): { x: number; y: number; dir: TrailEntry['dir'] } | null {
  if (s.trail.length <= 1) return null
  const baseTrail = s.trail[1]!
  const baseDir = baseTrail.dir
  // 朝向源(sdlpal:rgTrail[2].wDirection;不足回退 trail[1].dir)
  const curDir = s.trail[2]?.dir ?? baseDir

  // not walking + 已捕获冻结快照 → 位置与朝向双双冻结(scene.c:745 else 不动位置;骑乘期 wFrame 也不重设)
  if (!s.walking) {
    const fo = s.frozenOffset[m]
    if (fo) return { x: s.party.x + fo.dx, y: s.party.y + fo.dy, dir: fo.dir }
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
  // walking 时捕获冻结快照(位置偏移 + 朝向),供下次静止帧冻结用;not walking 不捕获,避免漂移。
  if (s.walking) s.frozenOffset[m] = { dx: x - s.party.x, dy: y - s.party.y, dir: curDir }
  return { x, y, dir: curDir }
}
