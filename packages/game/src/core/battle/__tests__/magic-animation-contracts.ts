/** Compile-only ownership boundary; these assertions add no runtime test identities. */
import type { PerformMagicInput } from '../actions/magic.js'
import type { startMagicAnimation } from '../actions/magic-animation.js'

type Assert<T extends true> = T
type AnimationInput = Parameters<typeof startMagicAnimation>[0]
type ActionOnlyFields =
  | 'gs'
  | 'commands'
  | 'runScript'
  | 'spells'
  | 'items'
  | 'objectMagics'
  | 'enemySpriteFrameHeights'

export type AnimationHasNoScriptOrPersistentStateContext = Assert<
  Extract<keyof AnimationInput, ActionOnlyFields> extends never ? true : false
>
export type ActionSuppliesAnimationResources = Assert<
  PerformMagicInput extends AnimationInput ? true : false
>
