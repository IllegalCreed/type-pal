import type { ObjectMagicView } from '@type-pal/shared'
import type { BattleState } from './battle-state.js'

/**
 * PAL_BattleSimulateMagic target policy (fight.c:5330-5337 + 87-128).
 * Share it between damage and FIRE animation, including zero-damage sentinels.
 * The failed auto-selection value -1 remains the simulation's all-slot branch.
 */
export function resolveSimulatedMagicTarget(
  state: BattleState,
  objectMagic: ObjectMagicView,
  targetIdx: number | undefined,
): number | 'all' {
  if (objectMagic.flags.applyToAll) return 'all'
  if (targetIdx !== undefined && targetIdx >= 0) return targetIdx

  const previous = state.iPrevEnemyTarget ?? -1
  const enemy = state.enemies[previous]
  if (enemy && !enemy.defeated && enemy.e.health > 0) return previous

  const first = state.enemies.findIndex((e) => !e.defeated && e.e.health > 0)
  return first < 0 ? 'all' : first
}
