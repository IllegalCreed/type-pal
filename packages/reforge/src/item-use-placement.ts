import type { EntityAddress, GridPos, ProjectMap, WorldScriptState } from '@type-pal/content'
import { isBlockedAt } from './collision.js'

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

export function commitItemEntityPlacement(
  script: WorldScriptState,
  target: EntityAddress,
  state: number,
  pos: GridPos,
): void {
  script.entityPos ??= {}
  const scenePositions = script.entityPos[target.scene] ?? {}
  script.entityPos[target.scene] = scenePositions
  scenePositions[target.entity] = { ...pos }
  const sceneStates = script.entityState[target.scene] ?? {}
  script.entityState[target.scene] = sceneStates
  sceneStates[target.entity] = state
}
