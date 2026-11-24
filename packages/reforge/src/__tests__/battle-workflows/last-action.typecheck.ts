import { expectTypeOf } from 'vitest'
import type { BattleLastAction } from '../../battle/battle-last-action.js'

type EnemyAttack = Extract<BattleLastAction, { side: 'enemy'; kind: 'attack' }>
type EnemyAttackMate = Extract<BattleLastAction, { side: 'enemy'; kind: 'attackMate' }>

expectTypeOf<EnemyAttack['targetPlayerIdx']>().toEqualTypeOf<number>()
expectTypeOf<EnemyAttackMate['targetEnemyIdx']>().toEqualTypeOf<number>()
expectTypeOf<EnemyAttackMate['damage']>().toEqualTypeOf<number>()
