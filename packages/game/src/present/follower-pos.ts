import type { FollowerFrozen, TrailEntry } from '../core/game-state.js'

export interface FollowerPosState {
  /** 队长(party[0])世界坐标。 */
  party: { x: number; y: number }
  /** 队伍跟随轨迹(trail[0]=最新,越后越早)。 */
  trail: TrailEntry[]
  /** 队伍是否处于走路态(= sdlpal PAL_UpdatePartyGestures 的 fWalking)。 */
  walking: boolean
  /**
   * 按队员下标保存相对队长的位置，walking 时写入，静止时借用；dir 只作捕获记录。
   * 轨迹重填或聚拢时由事件/场景 Owner 清空或重设，本 helper 不持有缓存生命周期。
   */
  frozenOffset: (FollowerFrozen | null)[]
}

/**
 * 返回跟随者世界坐标与默认朝向，对应 PAL_UpdatePartyGestures 的 walking/静止分支。
 * walking 用 trail[1] 加队员偏移，遇障碍回退，并捕获相对队长的位置。
 * 静止时复用冻结偏移；无快照则取 trail[m]，不再次加 walking 偏移或检查障碍。
 * 两种状态的默认朝向都取当前 trail[2].dir（不足则取 trail[1]），不取冻结记录的 dir。
 * present caller 仍可用该队员的脚本帧覆盖默认朝向；这里不决定最终演出帧。
 * @returns trail 不足两项时返回 null，由 caller 跳过该跟随者。
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

  // not walking + 已捕获冻结快照 → **位置冻结**(scene.c:745 else 不动位置,防上船重叠跳变),
  //   但**朝向仍用当前 trail[2].dir**(scene.c:761:静止时 follower wFrame = rgTrail[2].wDirection,
  //   **不跟队长的 0x15**)。两类演出由此自然区分:
  //   - 船划行:ride(0x44 等)每步把 trail 刷成船行方向 → 跟随者朝船行方向(= 队长),看着"跟队长转"。
  //   - 隐龙窟站立对话:队长 0x15 回头不动 trail → 跟随者保持走来方向(不跟队长转)。
  //   旧码取 fo.dir + 0x15 调 turnFollowersFrozen 同步 fo.dir(= 跟随者跟 0x15),修了船却把隐龙窟
  //   "站着不动、队长回头"也误判成要跟 → 李逍遥被一起转向(user 2026-06-14 报)。
  if (!s.walking) {
    const fo = s.frozenOffset[m]
    if (fo) return { x: s.party.x + fo.dx, y: s.party.y + fo.dy, dir: curDir }
    // 未捕获冻结快照(0x46 摆位 / 刚进场景、还没走过):sdlpal 0x46(script.c:1690-1700)直接把
    //   rgParty[i]=rgTrail[i]=队长+i×offset(每员往身后退**一格**),演出期不调 PAL_UpdatePartyGestures
    //   → 位置冻在此。故 member m 落 rgTrail[m](= 队长+m×offset),**不是** trail[1] 再叠一次方向偏移
    //   ——后者是 fWalking 分支(scene.c:692-707)的扇形布局,会多退一格 = 间隙。
    //   旧码这里误用 trail[1]+offset → 刘晋元叫醒黑屏后两人间隙、本该紧贴(user 2026-06-16 报)。
    //   不做障碍回退(0x46 不检障碍)。trail[m] 缺失(短 trail 兜底)回退末项。
    const frozen = s.trail[m] ?? s.trail[s.trail.length - 1]!
    return { x: frozen.x, y: frozen.y, dir: curDir }
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
  // 静止分支已返回；只在当前 walking 帧更新位置快照，供随后静止时复用。
  s.frozenOffset[m] = { dx: x - s.party.x, dy: y - s.party.y, dir: curDir }
  return { x, y, dir: curDir }
}
