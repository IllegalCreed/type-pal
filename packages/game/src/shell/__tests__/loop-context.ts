/** Fresh empty input and map for direct frame tests; publishes the scene context explicitly.
 * Full-loop entry points publish it again through their production owner. */
import type { AbstractKey, InputSnapshot } from '@type-pal/shared'

import { createCommandBus } from '../../core/command-bus.js'
import { createInitialGameState } from '../../core/game-state.js'
import { setSceneContext } from '../../core/scene-system.js'
import type { LoopContext } from '../main-loop.js'
import { walkableTilemap } from './loop-tilemap.js'

export function prepareEmptyLoopContext(
  gs = createInitialGameState({ x: 0, y: 0, facing: 'down' }),
  onPresent: LoopContext['onPresent'] = () => {},
): LoopContext {
  const ctx: LoopContext = {
    gs,
    bus: createCommandBus(),
    input: { nextSnapshot: (frameNum) => ({ held: new Set(), pressed: new Set(), frameNum }) },
    tilemap: walkableTilemap(8, 8),
    onPresent,
  }
  setSceneContext({
    tilemap: ctx.tilemap,
  })
  return ctx
}

export function heldSnapshot(held: AbstractKey[] = [], frameNum = 0): InputSnapshot {
  return { held: new Set(held), pressed: new Set(), frameNum }
}
