import type { ItemDataV5 } from '@type-pal/content'
import { upgradeItemsV7ToV8, validateItemsV5 } from '@type-pal/content'

/**
 * 已发布 R13-2 parent 仍是 content-v7 序列化：throw 没有 target，且效果只允许
 * applyPoison/currentHpDamage。这里借纯 v7→v8 upgrader 做严格校验，但返回原始值，
 * 绝不把兼容缺省写回历史 parent 或旧 seal。
 */
export function validateR13ItemThrowParentItems(value: unknown): ItemDataV5[] {
  if (!Array.isArray(value)) throw new Error('R13 item throw parent: items 期望数组')
  const hasLegacyThrow = value.some(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      (entry as { throw?: unknown }).throw !== undefined &&
      (entry as { throw?: { target?: unknown } }).throw?.target === undefined,
  )
  if (!hasLegacyThrow) return validateItemsV5(value)
  const hasCurrentThrow = value.some(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      (entry as { throw?: { target?: unknown } }).throw?.target !== undefined,
  )
  if (hasCurrentThrow) throw new Error('R13 item throw parent: legacy/current throw 半状态混用')
  validateItemsV5(upgradeItemsV7ToV8(value))
  return structuredClone(value) as unknown as ItemDataV5[]
}
