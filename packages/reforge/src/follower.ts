import type { Facing, GridPos } from '@type-pal/content'
import { expectDefined } from './defined.js'

/**
 * Follow the slot history used by SDLPal's PAL_UpdatePartyGestures.
 * Reforge samples half-tile steps, so walking starts two slots back and facing lags one more slot.
 * Blocked offsets fall back to the base slot. A stationary party keeps the last walked formation.
 */

export interface TrailEntry {
  pos: GridPos
  dir: Facing
  /** A shared placement sample before the first movement stores its own departure. */
  formationSeed?: true
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
 * 0x46 / 场景落点后的直线队形轨迹。
 *
 * sdlpal 会从队长位置开始，按当前朝向每槽向身后铺一个 16×8 菱形步；不能只留一个
 * trail 头，否则随后 setParty 恢复的队员会叠在队长脚下，直到玩家走动才重新排开。
 */
export function seedFormationTrail(pos: GridPos, facing: Facing, cap = 6): TrailEntry[] {
  const back = {
    left: { dcol: 1, drow: 0 },
    right: { dcol: -1, drow: 0 },
    up: { dcol: 0, drow: 1 },
    down: { dcol: 0, drow: -1 },
  }[facing]
  return Array.from({ length: cap }, (_, index) => ({
    pos: {
      col: pos.col + back.dcol * index,
      row: pos.row + back.drow * index,
      height: pos.height,
    },
    dir: facing,
    ...(index === 0 ? { formationSeed: true } : {}),
  }))
}

/**
 * Exploration turns before writing its departure. Authored walking records the facing at
 * departure before updating the leader (SDLPal scene.c PAL_UpdateParty vs script.c PAL_PartyWalkTo).
 * After placement the first move also records a distinct departure. The seeded history
 * keeps the position and facing it had before the move.
 */
export function pushTrail(
  trail: TrailEntry[],
  pos: GridPos,
  facing: Facing,
  departingFacing?: Facing,
): void {
  const head = trail[0]
  if (head && head.pos.col === pos.col && head.pos.row === pos.row) return
  const departure = departingFacing ?? facing
  if (head?.formationSeed) {
    trail.unshift({ pos: { ...head.pos }, dir: departure })
  } else if (head) {
    head.dir = departure
  }
  trail.unshift({ pos: { ...pos }, dir: facing })
  if (trail.length > 6) trail.length = 6
}

const WALKING_BASE_SLOT = 2

/** Return no follower until there is a previous slot. Stationary placement without a snapshot uses its seeded member slot. */
export function computeFollowerPos(
  s: FollowerPosState,
  m: number,
  isWalkable: (col: number, row: number) => boolean,
): { pos: GridPos; dir: Facing } | null {
  if (s.trail.length <= 1) return null
  const baseTrail = expectDefined(s.trail[Math.min(WALKING_BASE_SLOT, s.trail.length - 1)])
  const baseDir = baseTrail.dir
  // 朝向源(sdlpal:rgTrail[基点+1].wDirection = 比位置晚一步;不足回退基点 dir)
  const curDir = s.trail[WALKING_BASE_SLOT + 1]?.dir ?? baseDir

  if (!s.walking) {
    const fo = s.frozenOffset[m]
    if (fo) {
      return {
        pos: { col: s.party.col + fo.dcol, row: s.party.row + fo.drow, height: s.party.height },
        dir: curDir,
      }
    }
    // 未捕获冻结快照(0x46 摆位/刚进场景):原版直接取 rgTrail[m]。0x46 的相邻槽本身
    // 已按 16×8(一个菱形格)铺开；WALKING_BASE_SLOT 只属于连续走路轨迹的半步采样，不能套到这里。
    const frozen = s.trail[m] ?? expectDefined(s.trail[s.trail.length - 1])
    return { pos: { ...frozen.pos }, dir: curDir }
  }

  // 方向偏移(原版 scene.c:695-707 像素 ±16/±8 → 菱形格 ±1 单轴)
  let offCol: number
  let offRow: number
  if (m === 2) {
    // m===2:E/W→-col/row侧;N/S→+col侧(原版 East||West?-16:+16 / +8 row)
    const horizontal = baseDir === 'left' || baseDir === 'right'
    offCol = horizontal ? 0 : 1
    offRow = horizontal ? 1 : 0
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
  // If the offset hits a wall, keep the current base slot (scene.c:712–717).
  if (!isWalkable(col, row)) {
    col = baseTrail.pos.col
    row = baseTrail.pos.row
  }
  // Hold this formation relative to the leader when walking stops.
  s.frozenOffset[m] = { dcol: col - s.party.col, drow: row - s.party.row, dir: curDir }
  return { pos: { col, row, height: baseTrail.pos.height }, dir: curDir }
}
