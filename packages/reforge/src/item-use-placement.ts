import type {
  EntityAddress,
  GridPos,
  ProjectMap,
  WorldScriptState,
  WorldScriptStateV5,
} from '@type-pal/content'
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
  script: { kind: 'v5'; value: WorldScriptStateV5 } | { kind: 'legacy'; value: WorldScriptState },
  target: EntityAddress,
  state: number,
  pos: GridPos,
): void {
  if (script.kind === 'v5') {
    script.value.entityPos ??= {}
    const scenePositions = script.value.entityPos[target.scene] ?? {}
    script.value.entityPos[target.scene] = scenePositions
    scenePositions[target.entity] = { ...pos }
    const sceneStates = script.value.entityState[target.scene] ?? {}
    script.value.entityState[target.scene] = sceneStates
    sceneStates[target.entity] = state
    return
  }
  script.value.entityPos ??= {}
  script.value.entityPos[target.entity] = { ...pos }
  script.value.entityState[target.entity] = state
}
