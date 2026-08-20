/** 唯一公共战斗总终态；action kind="flee" 不属于此联合。 */
export type BattleResult = 'victory' | 'defeat' | 'playerFled' | 'enemyFled' | 'terminated'

export function isBattleResult(value: unknown): value is BattleResult {
  return (
    value === 'victory' ||
    value === 'defeat' ||
    value === 'playerFled' ||
    value === 'enemyFled' ||
    value === 'terminated'
  )
}

export function battleResultHasVictoryRewards(result: BattleResult): boolean {
  return result === 'victory'
}

export function battleResultRunsOnLose(result: BattleResult): boolean {
  return result === 'defeat'
}

export function battleResultRunsOnFlee(result: BattleResult): boolean {
  return result === 'playerFled'
}
