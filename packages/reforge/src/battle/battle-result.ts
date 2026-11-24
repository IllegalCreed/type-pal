/** 唯一公共战斗总终态；action kind="flee" 不属于此联合。 */
export type BattleResult = 'victory' | 'defeat' | 'playerFled' | 'enemyFled' | 'terminated'
