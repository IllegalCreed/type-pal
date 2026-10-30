import type { Magic } from '@type-pal/shared'
import type { BattleState } from '../battle-state.js'

/** Existing phase1 magic SHORT conversion for temporary calculations; never writes back role growth. */
export function asMagicShort(n: number): number {
  return (n << 16) >> 16
}

/** sdlpal 攻击魔法 4 落点类型(OffMagic 时间线支持)。 */
type OffMagicType = 'normal' | 'attackAll' | 'attackWhole' | 'attackField'
const OFF_MAGIC_TYPES: ReadonlySet<Magic['type']> = new Set<Magic['type']>([
  'normal',
  'attackAll',
  'attackWhole',
  'attackField',
])

export type PendingDamageNums = NonNullable<
  NonNullable<BattleState['battleAnim']>['pendingDamageNums']
>

/** Shared classification for damage, animation dispatch and sound ownership. */
export function isOffensiveMagicType(type: Magic['type']): type is OffMagicType {
  return OFF_MAGIC_TYPES.has(type)
}
