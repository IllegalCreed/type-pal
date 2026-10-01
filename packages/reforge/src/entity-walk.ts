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

/**
 * One authored target-movement tick, along the projected ground-plane line.
 * Keep the speed of a diamond-axis step, but never snap an unrelated, distant axis:
 * an endpoint is reached only when its full remaining distance fits in this tick.
 * Height remains a display-only endpoint property, not part of ground-plane speed.
 */
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
  const distance = Math.hypot(dx, dy)
  const distancePerTick = Math.hypot(16, 8) * SPEED_GRID[speed]
  if (distance <= distancePerTick) return { pos: { ...to }, facing, done: true }
  const fraction = distancePerTick / distance
  return {
    pos: {
      ...pos,
      col: pos.col + (to.col - pos.col) * fraction,
      row: pos.row + (to.row - pos.row) * fraction,
    },
    facing,
    done: false,
  }
}
