import type { Tilemap } from '@type-pal/shared'
import { createInitialGameState, type GameState } from '../../../../core/game-state.js'
import type { PresentContext } from '../../../present.js'
import { snapBitmap } from './images.js'

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

/** 渲染不该改的世界字段。波和震的计数由对应用例单独断言。 */
export function worldView(gs: GameState) {
  return {
    party: { ...gs.party },
    camera: { ...gs.camera },
    npcs: gs.npcs.map((npc) => ({
      id: npc.id,
      x: npc.x,
      y: npc.y,
      sLayer: npc.sLayer ?? 0,
      spriteNum: npc.spriteNum,
    })),
    partyMembers: [...gs.partyMembers],
    trail: gs.trail.map((entry) => ({ ...entry })),
    walking: { ...gs.walkingFrame },
    wLayer: gs.wLayer,
    mode: gs.mode,
    inventory: gs.inventory.map((entry) => ({ ...entry })),
    menuLength: gs.menuStack.length,
    dialogText: gs.dialogBox?.currentLineText ?? null,
    dialogChars: gs.dialogBox?.charsRevealed ?? 0,
    followerFrozen: gs.followerFrozenOffset.map((entry) => (entry ? { ...entry } : null)),
  }
}

export function bitmapView(
  img: { width: number; height: number; indices: Uint8Array; opaque?: Uint8Array } | undefined,
) {
  return img ? snapBitmap(img) : null
}
