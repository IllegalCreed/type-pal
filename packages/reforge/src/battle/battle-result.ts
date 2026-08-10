/** 唯一公共战斗总终态；action kind="flee" 不属于此联合。 */
export type BattleResult = 'victory' | 'defeat' | 'playerFled' | 'enemyFled' | 'terminated'

/** 仅 legacy host/脚本 adapter 可见的旧结果。 */
export type LegacyBattleResult = 'win' | 'lose' | 'flee'

export function isBattleResult(value: unknown): value is BattleResult {
  return (
    value === 'victory' ||
    value === 'defeat' ||
    value === 'playerFled' ||
    value === 'enemyFled' ||
    value === 'terminated'
  )
}

/** 把旧三态收口到唯一总终态；enemyFled 只能由显式 legacy adapter 提供。 */
export function normalizeLegacyBattleResult(
  value: BattleResult | LegacyBattleResult,
  enemyFled = false,
): BattleResult {
  if (isBattleResult(value)) return value
  if (value === 'lose') return 'defeat'
  if (value === 'flee') return 'playerFled'
  return enemyFled ? 'enemyFled' : 'victory'
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
