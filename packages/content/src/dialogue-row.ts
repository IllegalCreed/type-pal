import type { DialogueRow } from './index.js'
import { type Locale, lookupText } from './locale.js'

/** Standard rewards are typed rows; neither their text nor their count is parsed from prose. */
export function resolveDialogueRowText(row: DialogueRow, locale: Locale): string {
  if ('text' in row) return lookupText(row.text, locale)
  return row.reward.kind === 'item'
    ? `获得${lookupText(row.reward.itemName, locale)} × ${row.reward.count}`
    : `获得${row.reward.amount}文钱`
}

export function checkDialogueRow(value: unknown, path: string): asserts value is DialogueRow {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  const row = value as Record<string, unknown>
  const allowed = Object.hasOwn(row, 'text') ? ['text', 'speed'] : ['reward', 'speed']
  for (const key of Object.keys(row))
    if (!allowed.includes(key)) throw new Error(`${path}.${key}: 未知字段`)
  if ('text' in row) {
    if (typeof row.text !== 'string' || !row.text.trim())
      throw new Error(`${path}.text: 期望非空字符串`)
  } else {
    if (!row.reward || typeof row.reward !== 'object' || Array.isArray(row.reward))
      throw new Error(`${path}.reward: 期望奖励对象`)
    const reward = row.reward as Record<string, unknown>
    const fields = reward.kind === 'item' ? ['kind', 'itemName', 'count'] : ['kind', 'amount']
    for (const key of Object.keys(reward))
      if (!fields.includes(key)) throw new Error(`${path}.reward.${key}: 未知字段`)
    if (reward.kind === 'item') {
      if (typeof reward.itemName !== 'string' || !reward.itemName.trim())
        throw new Error(`${path}.reward.itemName: 期望文本 ID`)
      if (!Number.isSafeInteger(reward.count) || Number(reward.count) <= 0)
        throw new Error(`${path}.reward.count: 期望正安全整数`)
    } else if (reward.kind === 'money') {
      if (!Number.isSafeInteger(reward.amount) || Number(reward.amount) <= 0)
        throw new Error(`${path}.reward.amount: 期望正安全整数`)
    } else throw new Error(`${path}.reward.kind: 期望 item|money`)
  }
  if (
    row.speed !== undefined &&
    (typeof row.speed !== 'number' || !Number.isFinite(row.speed) || row.speed < 0)
  )
    throw new Error(`${path}.speed: 期望非负有限数`)
}
