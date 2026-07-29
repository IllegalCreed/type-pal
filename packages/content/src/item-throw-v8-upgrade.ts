import type { CurrentManifest, LegacyManifestV7 } from './character.js'
import type { ThrowEffect, ThrowSpec } from './item.js'
import type { ItemDataV5 } from './item-v5.js'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** contentVersion 7 的投掷效果只有这两个已发布分支。 */
export type LegacyThrowEffectV7 = Extract<ThrowEffect, { kind: 'applyPoison' | 'currentHpDamage' }>

export interface LegacyThrowSpecV7 extends Omit<ThrowSpec, 'target' | 'effects'> {
  effects: LegacyThrowEffectV7[]
}

export interface LegacyItemDataV7 extends Omit<ItemDataV5, 'throw'> {
  throw?: LegacyThrowSpecV7
}

function record(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`${context}: 期望对象`)
  return value as Record<string, unknown>
}

function onlyKeys(value: Record<string, unknown>, keys: readonly string[], context: string): void {
  const allowed = new Set(keys)
  for (const key of Object.keys(value))
    if (!allowed.has(key)) throw new Error(`${context}.${key}: contentVersion 7 未知字段`)
}

function positiveInteger(value: unknown, context: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0)
    throw new Error(`${context}: 期望正安全整数`)
  return Number(value)
}

function nonNegativeInteger(value: unknown, context: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    throw new Error(`${context}: 期望非负安全整数`)
  return Number(value)
}

function validateLegacyThrowEffectV7(value: unknown, context: string): LegacyThrowEffectV7 {
  const effect = record(value, context)
  if (effect.kind === 'applyPoison') {
    onlyKeys(effect, ['kind', 'poisonId'], context)
    if (typeof effect.poisonId !== 'string' || effect.poisonId.length === 0)
      throw new Error(`${context}.poisonId: 期望非空稳定 id`)
    return effect as unknown as LegacyThrowEffectV7
  }
  if (effect.kind === 'currentHpDamage') {
    onlyKeys(effect, ['kind', 'numerator', 'denominator', 'bonus', 'cap'], context)
    positiveInteger(effect.numerator, `${context}.numerator`)
    positiveInteger(effect.denominator, `${context}.denominator`)
    nonNegativeInteger(effect.bonus, `${context}.bonus`)
    positiveInteger(effect.cap, `${context}.cap`)
    return effect as unknown as LegacyThrowEffectV7
  }
  throw new Error(`${context}.kind: contentVersion 7 投掷只允许 applyPoison/currentHpDamage`)
}

/**
 * contentVersion 7 -> 8 的纯 items 变换。
 * v7 战斗始终先选单敌，因此新增 target 的唯一无损缺省是 oneEnemy；PAL 的全体语义由
 * source-backed R13-3 augmentation 重建，不能从这个兼容缺省猜测。
 */
export function upgradeItemsV7ToV8(value: unknown): ItemDataV5[] {
  if (!Array.isArray(value)) throw new Error('items: contentVersion 7 期望数组')
  return value.map((entry, itemIndex) => {
    const item = record(entry, `items[${itemIndex}]`)
    if (item.throw === undefined) return clone(entry) as ItemDataV5
    const thrown = record(item.throw, `items[${itemIndex}].throw`)
    // writeProject 按“内容文件在前、manifest 在后”提交。若 manifest 写入失败，
    // 下次打开会遇到 manifest v7 + 已经补过 target 的 items；这里必须容忍这个
    // 唯一的中断半状态，保证升级可重试。
    onlyKeys(thrown, ['target', 'effects', 'sound', 'presentation'], `items[${itemIndex}].throw`)
    if (thrown.target !== undefined && thrown.target !== 'oneEnemy')
      throw new Error(`items[${itemIndex}].throw.target: v7 升级半状态只允许 oneEnemy`)
    if (!Array.isArray(thrown.effects) || thrown.effects.length === 0)
      throw new Error(`items[${itemIndex}].throw.effects: contentVersion 7 投掷效果不得为空`)
    const effects = thrown.effects.map((effect, effectIndex) =>
      validateLegacyThrowEffectV7(effect, `items[${itemIndex}].throw.effects[${effectIndex}]`),
    )
    return {
      ...(clone(item) as unknown as Omit<ItemDataV5, 'throw'>),
      throw: {
        ...(clone(thrown) as unknown as Omit<ThrowSpec, 'target' | 'effects'>),
        target: 'oneEnemy',
        effects: clone(effects),
      },
    }
  })
}

/** contentVersion 7 -> 8 的纯 manifest 变换；minimumSaveVersion 保持原值（当前必须为 7）。 */
export function upgradeManifestV7ToV8(value: unknown): CurrentManifest {
  const manifest = record(value, 'manifest')
  if (manifest.contentVersion !== 7) throw new Error('manifest: 期望 contentVersion 7')
  return {
    ...(clone(manifest) as unknown as LegacyManifestV7),
    contentVersion: 8,
  }
}
