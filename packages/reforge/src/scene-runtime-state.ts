import type { BehaviorCursor, Facing } from '@type-pal/content'
import type { EntityActionSnapshot } from './entity-action-player.js'
import type { StoredAutomaticChaseClaim } from './save/types.js'
import type { EntityMotionSnapshot } from './world-motion-runtime.js'

export type AutomaticWaitKind =
  | 'command'
  | 'chase-pacing'
  | 'chase-terminal'
  | 'chase-range'
  | 'chase-hidden'
export interface AutomaticWaitSnapshot {
  kind: AutomaticWaitKind
  durationMs: number
  remainingMs: number
}

/** Engine-owned inactive-scene state, not author pages or a story-state scheme.
 * Positions have one durable source: WorldScriptState.entityPos, captured at the same boundary.
 */
export interface SceneRuntimeState {
  entities: Record<string, { facing?: Facing; fixedFrame?: number; motion: EntityMotionSnapshot }>
  actions: EntityActionSnapshot[]
  automatic: Record<
    string,
    {
      cursor: BehaviorCursor
      wait?: AutomaticWaitSnapshot
    }
  >
  chaseClaims: StoredAutomaticChaseClaim[]
}

export type SceneRuntimeStates = Record<string, SceneRuntimeState>
