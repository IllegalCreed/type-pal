import type { EntityAddress, GridPos, ProjectMap, WorldScriptState } from '@type-pal/content'
import { isBlockedAt } from './collision.js'
import { writeSceneEntityValue } from './scene-entity-values.js'

/** Match PAL trap placement: the forward cell checks map collision only. */
export function planItemEntityPlacement(args: {
  target: EntityAddress
  currentSceneId: string
  entityIds: ReadonlySet<string>
  map: ProjectMap
  partyPos: GridPos
  step: { dcol: number; drow: number }
}): GridPos | undefined {
  if (args.target.scene !== args.currentSceneId || !args.entityIds.has(args.target.entity))
    return undefined
  const pos = {
    col: args.partyPos.col + args.step.dcol,
    row: args.partyPos.row + args.step.drow,
    height: args.partyPos.height,
  }
  return isBlockedAt(args.map, pos) ? undefined : pos
}

/** Store the position snapshot and gate state for the scene projection to consume together. */
export function commitItemEntityPlacement(
  script: WorldScriptState,
  target: EntityAddress,
  state: number,
  pos: GridPos,
): void {
  script.entityPos ??= {}
  writeSceneEntityValue(script.entityPos, target, pos)
  writeSceneEntityValue(script.entityState, target, state)
}
