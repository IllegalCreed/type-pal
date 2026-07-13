import type { Facing, GridPos } from '@type-pal/content'
import { expectDefined } from './defined.js'

/**
 * 跟随者定位 —— 1:1 移植一阶段 [follower-pos.ts](../../game/src/present/follower-pos.ts)
 * (sdlpal scene.c PAL_UpdatePartyGestures 的 fWalking 二分支)。
 *
 * 坐标从原版像素(±16/±8)换菱形格(±1 单轴);trail 是下标槽([0]=最新/[1]=上一步/[2]=更早),
 * 不是参数化路径。**位置基点 = trail[BASE_SLOT],朝向源 = trail[BASE_SLOT+1].dir**(朝向比
 * 位置晚一步转,原版 quirk → 拐弯时位置先转、朝向后转,肉眼平滑)。
 *
 * ⚠ 粒度换算:原版 trail 基点 = 队长后 1 平铺 tile;reforge 菱形格 = 半 tile/步 →
 * BASE_SLOT = **2**(跑 phase-1 live 实测:m1 = 队长后 3 格、m2 = (2,1);slot 1 会近一半 = 跟太近)。
 *
 * walking(走路态):位置 trail[1]+方向偏移(撞墙回退 trail[1]);捕获 frozenOffset。
 * not-walking(演出/骑乘):位置冻结 = 队长 + frozenOffset;无快照则落 trail[m]。
 *
 * 原版拐弯在连续像素下也跳(实测 follower-pos.ts 跑正方形,拐弯步跳 36px),
 * 但 60fps + 连续像素稀释了肉眼感知。reforge 整格离散把跳放大了 —— 这是已知
 * 限制,接受(要完全平滑需亚格渲染插值,逻辑层忠实原版即可)。
 */

export interface TrailEntry {
  pos: GridPos
  dir: Facing
}

export interface FollowerFrozen {
  dcol: number
  drow: number
  dir: Facing
}

export interface FollowerPosState {
  /** 队长(party[0])位置。 */
  party: GridPos
  /** 队伍轨迹(trail[0]=最新,越后越早)。 */
  trail: TrailEntry[]
  /** 走路态(= sdlpal PAL_UpdatePartyGestures 的 fWalking)。 */
  walking: boolean
  /** 每个队员(idx 1..)的冻结快照。不走路时复用冻结位置(防演出期重叠跳变)。 */
  frozenOffset: (FollowerFrozen | null)[]
}

/**
 * trail 推进(原版 rgTrail 模型)。同格不记(原地转身队员不动)。
 * ⚠ dir = **离开该格的方向**(PAL_UpdateParty 先定向后记录):推进时回写旧头 dir 为本步方向。
 * 拐角格因此记「新方向」,偏移向量提前一槽翻转 → 跟随者拐弯甩尾(m1 甩到拐角外侧再回落)。
 * 8 字实测原版逐行如此;若记「到达方向」会晚一槽 = 贴路径滑,不忠实(2026-07-07 双轨迹对比定案)。
 */
export function pushTrail(trail: TrailEntry[], pos: GridPos, facing: Facing, cap = 6): void {
  const head = trail[0]
  if (head && head.pos.col === pos.col && head.pos.row === pos.row) return
  if (head) head.dir = facing // 离开方向回写
  trail.unshift({ pos: { ...pos }, dir: facing })
  if (trail.length > cap) trail.length = cap
}

/**
 * 跟随者位置 + 朝向 —— port computeFollowerWorldPos(菱形格域)。
 *
 * walking:位置 = trail[1] + 方向偏移(撞墙回退 trail[1]);朝向 = trail[2].dir;捕获冻结快照。
 * not-walking:位置冻结 = 队长 + frozenOffset;朝向仍 trail[2].dir。无快照 → 落 trail[m]。
 *
 * @returns 位置+朝向;trail 不足(<=1)返回 null(不画跟随者)。
 */
/** 位置基点槽:phase-1 平铺 1 tile 后 = reforge 2 菱形格后(live 实测校准,勿改回 1)。 */
const BASE_SLOT = 2

export function computeFollowerPos(
  s: FollowerPosState,
  m: number,
  isWalkable: (col: number, row: number) => boolean,
): { pos: GridPos; dir: Facing } | null {
  if (s.trail.length <= 1) return null
  const baseTrail = expectDefined(s.trail[Math.min(BASE_SLOT, s.trail.length - 1)])
  const baseDir = baseTrail.dir
  // 朝向源(sdlpal:rgTrail[基点+1].wDirection = 比位置晚一步;不足回退基点 dir)
  const curDir = s.trail[BASE_SLOT + 1]?.dir ?? baseDir

  if (!s.walking) {
    const fo = s.frozenOffset[m]
    if (fo) {
      return {
        pos: { col: s.party.col + fo.dcol, row: s.party.row + fo.drow, height: s.party.height },
        dir: curDir,
      }
    }
    // 未捕获冻结快照(0x46 摆位/刚进场景):落 trail[m×BASE_SLOT](每员退一平铺 tile=2 格),不做障碍回退。
    const frozen = s.trail[m * BASE_SLOT] ?? expectDefined(s.trail[s.trail.length - 1])
    return { pos: { ...frozen.pos }, dir: curDir }
  }

  // 方向偏移(原版 scene.c:695-707 像素 ±16/±8 → 菱形格 ±1 单轴)
  let offCol: number
  let offRow: number
  if (m === 2) {
    // m===2:E/W→-col/row侧;N/S→+col侧(原版 East||West?-16:+16 / +8 row)
    offCol = baseDir === 'right' || baseDir === 'left' ? 0 : 1
    offRow = m === 2 ? (baseDir === 'left' || baseDir === 'right' ? 1 : 0) : 0
  } else {
    // m===1,3,4:与 m===2 反侧
    switch (baseDir) {
      case 'left':
        offCol = 1
        offRow = 0
        break
      case 'right':
        offCol = -1
        offRow = 0
        break
      case 'up':
        offCol = 0
        offRow = 1
        break
      default:
        offCol = 0
        offRow = -1
        break // down
    }
  }
  let col = baseTrail.pos.col + offCol
  let row = baseTrail.pos.row + offRow
  // 障碍回退(scene.c:712-717):偏移位撞墙 → 回退 trail[1]
  if (!isWalkable(col, row)) {
    col = baseTrail.pos.col
    row = baseTrail.pos.row
  }
  // walking 捕获冻结快照(位置偏移 + 朝向),供下次静止帧冻结用
  if (s.walking) {
    s.frozenOffset[m] = { dcol: col - s.party.col, drow: row - s.party.row, dir: curDir }
  }
  return { pos: { col, row, height: baseTrail.pos.height }, dir: curDir }
}
