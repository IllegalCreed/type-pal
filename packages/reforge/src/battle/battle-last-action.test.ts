import { expectTypeOf, test } from 'vitest'
import type { BattleLastAction } from './battle-last-action.js'

test('BattleLastAction 按 side+kind 强制关键目标与伤害', () => {
  const enemyMate: BattleLastAction = {
    side: 'enemy',
    idx: 0,
    kind: 'attackMate',
    targetEnemyIdx: 1,
    damage: 123,
  }
  expectTypeOf(enemyMate.damage).toEqualTypeOf<number>()

  const enemyAttack: BattleLastAction = {
    side: 'enemy',
    idx: 0,
    kind: 'attack',
    targetPlayerIdx: 0,
  }
  expectTypeOf(enemyAttack.targetPlayerIdx).toEqualTypeOf<number>()

  // @ts-expect-error enemy attackMate cannot omit its enemy target and full damage evidence
  const malformedMate: BattleLastAction = { side: 'enemy', idx: 0, kind: 'attackMate' }
  void malformedMate

  // @ts-expect-error ordinary enemy attack cannot omit its player target
  const malformedAttack: BattleLastAction = { side: 'enemy', idx: 0, kind: 'attack' }
  void malformedAttack
})
