/** World render context inputs; motion/bitmap ownership snapshots are separate. */
import type { Tilemap } from '@type-pal/shared'
import { createInitialGameState, type GameState } from '../../core/game-state.js'
import type { PresentContext } from '../present.js'

export function emptyMap(width: number, height: number): Tilemap {
  return {
    width,
    height,
    cells: Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ lower: 0, upper: 0 })),
    ),
    tileset: 'candidate',
  }
}

export function exploreState(pos: { x: number; y: number }): GameState {
  const gs = createInitialGameState({ ...pos, facing: 'down' })
  gs.camera = { x: 0, y: 0 }
  gs.walkingFrame = { stepFrame: 0, walking: false }
  return gs
}

export function baseContext(patch: Partial<PresentContext> = {}): PresentContext {
  return {
    tilemap: emptyMap(8, 8),
    tileImages: { get: () => undefined },
    partyFrames: [],
    partyWalkFrames: 1,
    npcSprites: new Map(),
    ...patch,
  }
}
