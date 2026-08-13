import { type Facing, type GridPos, gridToPixel, type WalkSpeed } from '@type-pal/content'

/** Direction to one logical diamond-grid step. */
export const WALK_STEP: Readonly<Record<Facing, { dcol: number; drow: number }>> = {
  down: { dcol: 0, drow: 1 },
  up: { dcol: 0, drow: -1 },
  left: { dcol: -1, drow: 0 },
  right: { dcol: 1, drow: 0 },
}

/** Original speed code converted to logical grid distance per 100ms world tick. */
export const SPEED_GRID: Readonly<Record<WalkSpeed, number>> = {
  slow: 2 / 8,
  normal: 3 / 8,
  fast: 4 / 8,
  run: 1,
}

/** PAL_NPCWalkTo snap threshold in projected pixels. */
const SPEED_SNAP_PX: Readonly<Record<WalkSpeed, number>> = {
  slow: 4,
  normal: 6,
  fast: 8,
  run: 16,
}

/**
 * Per-command cadence for the original slow NPC speed.
 *
 * The first eligible tick always attempts. Only an actual planner attempt arms one following rest
 * tick; menu/battle/authority/lifecycle pauses never call either transition and therefore cannot
 * age or rephase the command.
 */
export function consumeScheduledMoveRest(
  speed: WalkSpeed,
  restPending: boolean,
): { attempt: boolean; restPending: boolean } {
  if (speed === 'slow' && restPending) return { attempt: false, restPending: false }
  return { attempt: true, restPending }
}

export function restAfterMoveAttempt(speed: WalkSpeed): boolean {
  return speed === 'slow'
}

/** Original one-step NPC opcode: one quarter of a logical diamond-grid step. */
export function stepEntityPos(pos: GridPos, facing: Facing): GridPos {
  const delta = WALK_STEP[facing]
  return {
    ...pos,
    col: pos.col + delta.dcol * 0.25,
    row: pos.row + delta.drow * 0.25,
  }
}

/** PAL direction quadrants are projected-pixel quadrants, not raw diamond-grid axes. */
export function facingToward(from: GridPos, to: GridPos): Facing {
  const current = gridToPixel(from)
  const target = gridToPixel(to)
  const dx = target.x - current.x
  const dy = target.y - current.y
  return dy < 0 ? (dx < 0 ? 'left' : 'up') : dx < 0 ? 'down' : 'right'
}

/** One production NPCWalkTo tick, including the original either-axis snap rule. */
export function walkTick(
  pos: GridPos,
  to: GridPos,
  speed: WalkSpeed,
): { pos: GridPos; facing: Facing; done: boolean } {
  const cur = gridToPixel(pos)
  const tgt = gridToPixel(to)
  const dx = tgt.x - cur.x
  const dy = tgt.y - cur.y
  const facing = facingToward(pos, to)
  const snap = SPEED_SNAP_PX[speed]
  if (Math.abs(dx) < snap || Math.abs(dy) < snap) return { pos: { ...to }, facing, done: true }
  const d = WALK_STEP[facing]
  const g = SPEED_GRID[speed]
  return {
    pos: { ...pos, col: pos.col + d.dcol * g, row: pos.row + d.drow * g },
    facing,
    done: false,
  }
}
