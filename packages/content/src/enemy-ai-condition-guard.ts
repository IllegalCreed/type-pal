import type { AiCond } from './enemy-ai.js'
import { exactKeys, nonEmptyString, percent, record } from './enemy-validation-shapes.js'

export function checkEnemyAiCondition(value: unknown, path: string): asserts value is AiCond {
  const condition = record(value, path)
  const kind = nonEmptyString(condition.kind, `${path}.kind`) as AiCond['kind']
  switch (kind) {
    case 'hpBelow':
    case 'hpAbove':
    case 'anyPlayerHpBelow':
    case 'chance':
      exactKeys(condition, ['kind', 'percent'], path)
      percent(condition.percent, `${path}.percent`)
      return
    case 'turn':
      exactKeys(condition, ['kind', 'op', 'value'], path)
      if (condition.op !== '==' && condition.op !== '>=') throw new Error(`${path}.op: 期望 ==|>=`)
      if (!Number.isInteger(condition.value) || Number(condition.value) < 0)
        throw new Error(`${path}.value: 期望非负整数`)
      return
    case 'aloneAlive':
    case 'firstOfKind':
      exactKeys(condition, ['kind'], path)
      return
    case 'allyCount':
      exactKeys(condition, ['kind', 'op', 'value'], path)
      if (condition.op !== '<=' && condition.op !== '>=') throw new Error(`${path}.op: 期望 <=|>=`)
      if (!Number.isInteger(condition.value) || Number(condition.value) < 0)
        throw new Error(`${path}.value: 期望非负整数`)
      return
    case 'playerInParty':
      exactKeys(condition, ['kind', 'role'], path)
      nonEmptyString(condition.role, `${path}.role`)
      return
    case 'difficulty':
      exactKeys(condition, ['kind', 'in'], path)
      if (!Array.isArray(condition.in) || condition.in.length === 0)
        throw new Error(`${path}.in: 期望非空难度 id 数组`)
      condition.in.forEach((entry, index) => {
        nonEmptyString(entry, `${path}.in[${index}]`)
      })
      return
    case 'all':
    case 'any':
      exactKeys(condition, ['kind', 'of'], path)
      if (!Array.isArray(condition.of)) throw new Error(`${path}.of: 期望条件数组`)
      condition.of.forEach((entry, index) => {
        checkEnemyAiCondition(entry, `${path}.of[${index}]`)
      })
      return
    case 'not':
      exactKeys(condition, ['kind', 'cond'], path)
      checkEnemyAiCondition(condition.cond, `${path}.cond`)
      return
    default:
      throw new Error(`${path}.kind: 未知敌人 AI 条件 ${String(kind)}`)
  }
}
