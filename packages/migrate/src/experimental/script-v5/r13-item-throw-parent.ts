import type { ItemDataV5 } from '@type-pal/content'
import { upgradeItemsV7ToV8, upgradeItemsV8ToV9, validateItemsV5 } from '@type-pal/content'

/**
 * 已发布 R13-2 parent 仍是 content-v7 序列化：throw 没有 target，且效果只允许
 * applyPoison/currentHpDamage，装备形象仍是 scalar。这里仅在校验副本上串行投影到 v9，
 * 但返回原始值，
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
  const hasCurrentThrow = value.some(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      (entry as { throw?: { target?: unknown } }).throw?.target !== undefined,
  )
  if (hasLegacyThrow && hasCurrentThrow)
    throw new Error('R13 item throw parent: legacy/current throw 半状态混用')
  const throwProjected = hasLegacyThrow ? upgradeItemsV7ToV8(value) : structuredClone(value)
  validateItemsV5(upgradeItemsV8ToV9(throwProjected))
  return structuredClone(value) as unknown as ItemDataV5[]
}
