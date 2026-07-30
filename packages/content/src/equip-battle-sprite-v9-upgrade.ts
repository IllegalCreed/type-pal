import type { LegacyManifestV8, LegacyManifestV9 } from './character.js'
import type { EquipEffect, EquipSpec } from './item.js'
import type { ItemDataV5 } from './item-v5.js'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function record(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`${context}: 期望对象`)
  return value as Record<string, unknown>
}

function onlyKeys(value: Record<string, unknown>, keys: readonly string[], context: string): void {
  const allowed = new Set(keys)
  for (const key of Object.keys(value))
    if (!allowed.has(key)) throw new Error(`${context}.${key}: contentVersion 8 未知字段`)
}

export type LegacyEquipEffectV8 =
  | Exclude<EquipEffect, { kind: 'battleSprite' }>
  | { kind: 'battleSprite'; sprite: string }

export interface LegacyEquipSpecV8 extends Omit<EquipSpec, 'effects'> {
  effects: LegacyEquipEffectV8[]
}

export interface LegacyItemDataV8 extends Omit<ItemDataV5, 'equip'> {
  equip?: LegacyEquipSpecV8
}

function validateCurrentMap(value: unknown, context: string): void {
  const byActor = record(value, context)
  for (const [actorId, battleSprite] of Object.entries(byActor)) {
    if (actorId.length === 0 || actorId !== actorId.trim())
      throw new Error(`${context}: ActorDef.id 必须非空且不得包含首尾空格`)
    if (
      typeof battleSprite !== 'string' ||
      battleSprite.length === 0 ||
      battleSprite !== battleSprite.trim()
    )
      throw new Error(`${context}.${actorId}: 期望非空且无首尾空格的 BattleSpriteDef.id`)
  }
}

/**
 * contentVersion 8 -> 9 的纯 items 变换。
 *
 * 旧 scalar 对旧 equipableBy 全量复制；同一物品有多个旧效果时按既有运行时的最后写入获胜，
 * 并把折叠结果留在最后一个旧效果的位置。允许“items 已写、manifest 未写”的 v9 半状态重试，
 * 但同一物品新旧形态混合必须 fail-loud。
 */
export function upgradeItemsV8ToV9(value: unknown): ItemDataV5[] {
  if (!Array.isArray(value)) throw new Error('items: contentVersion 8 期望数组')
  return value.map((entry, itemIndex) => {
    const item = record(entry, `items[${itemIndex}]`)
    if (item.equip === undefined) return clone(entry) as ItemDataV5
    const equip = record(item.equip, `items[${itemIndex}].equip`)
    if (!Array.isArray(equip.equipableBy))
      throw new Error(`items[${itemIndex}].equip.equipableBy: 期望数组`)
    const equipableBy = equip.equipableBy.map((actorId, actorIndex) => {
      if (typeof actorId !== 'string' || actorId.length === 0)
        throw new Error(
          `items[${itemIndex}].equip.equipableBy[${actorIndex}]: 期望非空 ActorDef.id`,
        )
      return actorId
    })
    if (!Array.isArray(equip.effects))
      throw new Error(`items[${itemIndex}].equip.effects: 期望数组`)

    const effects = equip.effects.map((effect, effectIndex) => {
      const effectRecord = record(effect, `items[${itemIndex}].equip.effects[${effectIndex}]`)
      if (effectRecord.kind !== 'battleSprite')
        return { kind: 'other' as const, effect: clone(effectRecord) }
      const hasLegacy = Object.hasOwn(effectRecord, 'sprite')
      const hasCurrent = Object.hasOwn(effectRecord, 'byActor')
      if (hasLegacy === hasCurrent)
        throw new Error(
          `items[${itemIndex}].equip.effects[${effectIndex}]: battleSprite 必须恰有 sprite/byActor 之一`,
        )
      if (hasLegacy) {
        onlyKeys(
          effectRecord,
          ['kind', 'sprite'],
          `items[${itemIndex}].equip.effects[${effectIndex}]`,
        )
        if (
          typeof effectRecord.sprite !== 'string' ||
          effectRecord.sprite.length === 0 ||
          effectRecord.sprite !== effectRecord.sprite.trim()
        )
          throw new Error(
            `items[${itemIndex}].equip.effects[${effectIndex}].sprite: 期望非空且无首尾空格的 BattleSpriteDef.id`,
          )
        return { kind: 'legacy' as const, sprite: effectRecord.sprite }
      }
      onlyKeys(
        effectRecord,
        ['kind', 'byActor'],
        `items[${itemIndex}].equip.effects[${effectIndex}]`,
      )
      validateCurrentMap(
        effectRecord.byActor,
        `items[${itemIndex}].equip.effects[${effectIndex}].byActor`,
      )
      return { kind: 'current' as const, effect: clone(effectRecord) }
    })

    const legacy = effects.filter((effect) => effect.kind === 'legacy')
    const current = effects.filter((effect) => effect.kind === 'current')
    if (legacy.length > 0 && current.length > 0)
      throw new Error(`items[${itemIndex}].equip.effects: contentVersion 8/9 battleSprite 形态混合`)
    if (current.length > 1)
      throw new Error(`items[${itemIndex}].equip.effects: battleSprite 效果最多一个`)
    if (legacy.length > 0 && equipableBy.length === 0)
      throw new Error(
        `items[${itemIndex}].equip.effects: 旧 battleSprite 存在但 equipableBy 为空，无法确定角色映射`,
      )

    let lastLegacyIndex = -1
    for (let effectIndex = effects.length - 1; effectIndex >= 0; effectIndex -= 1)
      if (effects[effectIndex]?.kind === 'legacy') {
        lastLegacyIndex = effectIndex
        break
      }
    const lastSprite = lastLegacyIndex < 0 ? undefined : effects[lastLegacyIndex]?.sprite
    const upgradedEffects = effects.flatMap((effect, effectIndex) => {
      if (effect.kind === 'other' || effect.kind === 'current') return [effect.effect]
      if (effectIndex !== lastLegacyIndex || !lastSprite) return []
      return [
        {
          kind: 'battleSprite',
          byActor: Object.fromEntries(equipableBy.map((actorId) => [actorId, lastSprite])),
        },
      ]
    })

    return {
      ...(clone(item) as unknown as Omit<ItemDataV5, 'equip'>),
      equip: {
        ...(clone(equip) as unknown as Omit<EquipSpec, 'effects'>),
        effects: upgradedEffects as EquipEffect[],
      },
    }
  })
}

/** contentVersion 8 -> 9；R13-4 同时主动断开 SAVE8/min8。 */
export function upgradeManifestV8ToV9(value: unknown): LegacyManifestV9 {
  const manifest = record(value, 'manifest')
  if (manifest.contentVersion !== 8) throw new Error('manifest: 期望 contentVersion 8')
  if (manifest.minimumSaveVersion !== 7)
    throw new Error(
      `manifest.minimumSaveVersion: contentVersion 8 期望 7，收到 ${String(
        manifest.minimumSaveVersion,
      )}`,
    )
  return {
    ...(clone(manifest) as unknown as LegacyManifestV8),
    contentVersion: 9,
    minimumSaveVersion: 8,
  }
}
