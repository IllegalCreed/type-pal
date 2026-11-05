/**
 * Public entry for battle frame builders. Builders do not write battle state or run action scripts.
 * Callers supply resolved resource metadata and stable position/frame snapshots; nested frame data
 * may be borrowed. The action/animation driver owns playback, cleanup and effects on battle state.
 * Flee text uses the current locale, and blow motion consumes the supplied RNG.
 */

export {
  buildFleeFailTimeline,
  buildStealTimeline,
  buildThrowWindupTimeline,
  buildUseItemTimeline,
} from './animation/action-gestures.js'
export type { BuildCoopMagicInput } from './animation/cooperative-magic.js'
export { buildCoopMagicTimeline } from './animation/cooperative-magic.js'
export {
  buildEnemyDivisionTimeline,
  buildEnemySummonTimeline,
  buildEnemyTransformTimeline,
} from './animation/enemy-transformation.js'
export { BATTLE_FRAME_TIME, EFFECT_SPRITE_CHUNK } from './animation/frames.js'
export type { BuildPostMagicInput } from './animation/hit-reaction.js'
export { buildPlayerMagicHitReaction, buildPostMagicTimeline } from './animation/hit-reaction.js'
export type {
  BuildEnemyMagicInput,
  BuildEnemyMagicIntroInput,
  BuildOffMagicInput,
  BuildPlayerDefMagicInput,
  BuildPreMagicInput,
  BuildShowMagicAnimInput,
} from './animation/magic-effects.js'
export {
  buildEnemyMagicCastIntro,
  buildEnemyMagicTimeline,
  buildPlayerDefMagicTimeline,
  buildPlayerOffMagicTimeline,
  buildPreMagicTimeline,
  buildShowMagicAnimTimeline,
} from './animation/magic-effects.js'
export type {
  BuildEnemyConfusedAttackInput,
  BuildEnemyPhysicalInput,
  BuildPlayerAttackInput,
} from './animation/physical-attack.js'
export {
  buildAttackMateTimeline,
  buildEnemyConfusedAttackTimeline,
  buildEnemyPhysicalTimeline,
  buildPlayerAttackTimeline,
} from './animation/physical-attack.js'
export type { BuildSummonInput } from './animation/summon.js'
export {
  buildSummonBrightenTimeline,
  buildSummonGodSequence,
  SUMMON_FADE_STEP_MS,
  SUMMON_FADE_STEPS,
} from './animation/summon.js'
