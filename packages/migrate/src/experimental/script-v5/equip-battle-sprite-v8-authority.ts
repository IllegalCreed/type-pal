import type { LegacyItemDataV8 } from '@type-pal/content'
import { upgradeItemsV8ToV9 } from '@type-pal/content'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import {
  derivePalMigrationFileSet,
  type MigrationFileSet,
  type MigrationJson,
} from '../../pal-migration.js'
import { digestRecord, stableJsonSha256 } from './stable-json.js'

const ITEMS_PATH = 'content/items.json' as const

const EXPECTED_PAL_BATTLE_SPRITES = [
  { itemId: '163', actorId: 'lin-yueru', spriteId: 'player-fighter-6' },
  { itemId: '164', actorId: 'lin-yueru', spriteId: 'player-fighter-6' },
  { itemId: '165', actorId: 'lin-yueru', spriteId: 'player-fighter-6' },
  { itemId: '179', actorId: 'anu', spriteId: 'player-fighter-7' },
  { itemId: '185', actorId: 'anu', spriteId: 'player-fighter-7' },
  { itemId: '187', actorId: 'anu', spriteId: 'player-fighter-7' },
  { itemId: '188', actorId: 'anu', spriteId: 'player-fighter-7' },
] as const

export interface EquipBattleSpriteUpgradeEvidenceV1 {
  kind: 'equip-battle-sprite-upgrade-evidence'
  version: 1
  generator: {
    id: 'equip-battle-sprite-v8-v9'
    version: 1
  }
  mappings: Array<{
    itemId: string
    actorId: string
    spriteId: string
  }>
  legacyItemsDigest: string
  currentItemsDigest: string
  digest: string
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function record(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`${context}: 期望对象`)
  return value as Record<string, unknown>
}

function assertOnlyKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  context: string,
): void {
  const allowed = new Set(expected)
  for (const key of Object.keys(value))
    if (!allowed.has(key)) throw new Error(`${context}.${key}: 未知字段`)
}

function sortedMappings(
  mappings: Array<{ itemId: string; actorId: string; spriteId: string }>,
): Array<{ itemId: string; actorId: string; spriteId: string }> {
  return mappings.sort(
    (left, right) =>
      left.itemId.localeCompare(right.itemId) ||
      left.actorId.localeCompare(right.actorId) ||
      left.spriteId.localeCompare(right.spriteId),
  )
}

function assertPalMappings(
  mappings: Array<{ itemId: string; actorId: string; spriteId: string }>,
  context: string,
): void {
  const expected = sortedMappings(EXPECTED_PAL_BATTLE_SPRITES.map((entry) => ({ ...entry })))
  const actual = sortedMappings(mappings.map((entry) => ({ ...entry })))
  if (stableJsonSha256(actual) !== stableJsonSha256(expected))
    throw new Error(`${context}: PAL 7 条装备战斗形象映射漂移`)
}

function collectCurrentMappings(
  value: unknown,
  context: string,
): Array<{ itemId: string; actorId: string; spriteId: string }> {
  if (!Array.isArray(value)) throw new Error(`${context}: items 期望数组`)
  const mappings: Array<{ itemId: string; actorId: string; spriteId: string }> = []
  value.forEach((entry, itemIndex) => {
    const item = record(entry, `${context}[${itemIndex}]`)
    if (typeof item.id !== 'string') throw new Error(`${context}[${itemIndex}].id: 期望 string`)
    if (item.equip === undefined) return
    const equip = record(item.equip, `${context}[${itemIndex}].equip`)
    if (!Array.isArray(equip.effects))
      throw new Error(`${context}[${itemIndex}].equip.effects: 期望数组`)
    for (const [effectIndex, effect] of equip.effects.entries()) {
      const effectRecord = record(effect, `${context}[${itemIndex}].equip.effects[${effectIndex}]`)
      if (effectRecord.kind !== 'battleSprite') continue
      assertOnlyKeys(
        effectRecord,
        ['kind', 'byActor'],
        `${context}[${itemIndex}].equip.effects[${effectIndex}]`,
      )
      const byActor = record(
        effectRecord.byActor,
        `${context}[${itemIndex}].equip.effects[${effectIndex}].byActor`,
      )
      for (const [actorId, spriteId] of Object.entries(byActor)) {
        if (typeof spriteId !== 'string')
          throw new Error(
            `${context}[${itemIndex}].equip.effects[${effectIndex}].byActor.${actorId}: 期望 string`,
          )
        mappings.push({ itemId: item.id, actorId, spriteId })
      }
    }
  })
  return mappings
}

/**
 * content9 上游输出 → 已发布 R13-3 仍使用的 content8 scalar authority。
 * 这是严格可逆投影；任何不能还原成单值的作者数据都必须停止，不能污染历史 seal。
 */
export function projectItemsV9ToLegacyV8(value: unknown): LegacyItemDataV8[] {
  if (!Array.isArray(value)) throw new Error('E1 legacy authority: items 期望数组')
  const currentMappings = collectCurrentMappings(value, 'E1 legacy authority current')
  assertPalMappings(currentMappings, 'E1 legacy authority current')

  const projected = clone(value) as unknown[]
  projected.forEach((entry, itemIndex) => {
    const item = record(entry, `E1 legacy authority items[${itemIndex}]`)
    if (item.equip === undefined) return
    const equip = record(item.equip, `E1 legacy authority items[${itemIndex}].equip`)
    if (!Array.isArray(equip.equipableBy))
      throw new Error(`E1 legacy authority items[${itemIndex}].equip.equipableBy: 期望数组`)
    const equipableBy = equip.equipableBy.map((actorId, actorIndex) => {
      if (typeof actorId !== 'string' || actorId.length === 0)
        throw new Error(
          `E1 legacy authority items[${itemIndex}].equip.equipableBy[${actorIndex}]: 期望非空 ActorDef.id`,
        )
      return actorId
    })
    if (new Set(equipableBy).size !== equipableBy.length)
      throw new Error(`E1 legacy authority items[${itemIndex}].equip.equipableBy: 角色重复`)
    if (!Array.isArray(equip.effects))
      throw new Error(`E1 legacy authority items[${itemIndex}].equip.effects: 期望数组`)

    let battleSpriteCount = 0
    equip.effects = equip.effects.map((effect, effectIndex) => {
      const effectRecord = record(
        effect,
        `E1 legacy authority items[${itemIndex}].equip.effects[${effectIndex}]`,
      )
      if (effectRecord.kind !== 'battleSprite') return effect
      battleSpriteCount += 1
      if (battleSpriteCount > 1)
        throw new Error(
          `E1 legacy authority items[${itemIndex}].equip.effects: battleSprite 效果最多一个`,
        )
      assertOnlyKeys(
        effectRecord,
        ['kind', 'byActor'],
        `E1 legacy authority items[${itemIndex}].equip.effects[${effectIndex}]`,
      )
      const byActor = record(
        effectRecord.byActor,
        `E1 legacy authority items[${itemIndex}].equip.effects[${effectIndex}].byActor`,
      )
      const actorIds = Object.keys(byActor)
      if (stableJsonSha256([...actorIds].sort()) !== stableJsonSha256([...equipableBy].sort()))
        throw new Error(
          `E1 legacy authority items[${itemIndex}].equip.effects[${effectIndex}].byActor: 必须与 equipableBy 完全一致`,
        )
      if (actorIds.length === 0)
        throw new Error(
          `E1 legacy authority items[${itemIndex}].equip.effects[${effectIndex}].byActor: 不得为空`,
        )
      const sprites = actorIds.map((actorId) => byActor[actorId])
      if (
        sprites.some(
          (spriteId) =>
            typeof spriteId !== 'string' || spriteId.length === 0 || spriteId !== spriteId.trim(),
        )
      )
        throw new Error(
          `E1 legacy authority items[${itemIndex}].equip.effects[${effectIndex}].byActor: BattleSpriteDef.id 无效`,
        )
      if (new Set(sprites).size !== 1)
        throw new Error(
          `E1 legacy authority items[${itemIndex}].equip.effects[${effectIndex}].byActor: 多角色形象不同，无法还原 scalar`,
        )
      return { kind: 'battleSprite', sprite: sprites[0] as string }
    })
  })

  const roundTrip = upgradeItemsV8ToV9(projected)
  if (stableJsonSha256(roundTrip) !== stableJsonSha256(value))
    throw new Error('E1 legacy authority: scalar 逆投影无法无损 round-trip')
  return projected as LegacyItemDataV8[]
}

/** 为冻结的 P7→R13-3 链建立同源 legacy authority，并保留 translation session。 */
export function projectMigrationV9ToLegacyV8(migration: MigrationFileSet): MigrationFileSet {
  const currentItems = migration.files.get(ITEMS_PATH)
  if (currentItems === undefined) throw new Error(`E1 legacy authority: 缺 ${ITEMS_PATH}`)
  const files = new Map(migration.files)
  files.set(ITEMS_PATH, clone(projectItemsV9ToLegacyV8(currentItems)) as unknown as MigrationJson)
  const derived = derivePalMigrationFileSet(migration, files)
  derived.report = {
    ...migration.report,
    rawProjection: {
      ...migration.report.rawProjection,
      items: projectItemsV9ToLegacyV8(migration.report.rawProjection.items) as never,
    },
  }
  return derived
}

/** R13-3 immutable successor 之上重新应用 E1，生成 content9 的唯一最终 items。 */
export function upgradeEquipBattleSpritesAfterR13(snapshot: MigrationSnapshot): {
  snapshot: MigrationSnapshot
  evidence: EquipBattleSpriteUpgradeEvidenceV1
} {
  const legacyItems = snapshot.files.get(ITEMS_PATH)
  if (legacyItems === undefined) throw new Error(`E1 successor: 缺 ${ITEMS_PATH}`)
  const currentItems = upgradeItemsV8ToV9(legacyItems)
  const mappings = collectCurrentMappings(currentItems, 'E1 successor current')
  assertPalMappings(mappings, 'E1 successor current')
  const evidence = digestRecord<EquipBattleSpriteUpgradeEvidenceV1>({
    kind: 'equip-battle-sprite-upgrade-evidence',
    version: 1,
    generator: {
      id: 'equip-battle-sprite-v8-v9',
      version: 1,
    },
    mappings: sortedMappings(mappings),
    legacyItemsDigest: stableJsonSha256(legacyItems),
    currentItemsDigest: stableJsonSha256(currentItems),
  })
  const files = new Map(snapshot.files)
  files.set(ITEMS_PATH, clone(currentItems) as unknown as MigrationJson)
  const successor: MigrationSnapshot = {
    ...snapshot,
    files,
    managedFiles: new Set(snapshot.managedFiles),
  }
  assertEquipBattleSpriteUpgradeBacked(snapshot, successor, evidence)
  return {
    snapshot: successor,
    evidence,
  }
}

export function assertEquipBattleSpriteUpgradeEvidence(
  evidence: EquipBattleSpriteUpgradeEvidenceV1,
): void {
  if (
    evidence.kind !== 'equip-battle-sprite-upgrade-evidence' ||
    evidence.version !== 1 ||
    evidence.generator.id !== 'equip-battle-sprite-v8-v9' ||
    evidence.generator.version !== 1
  )
    throw new Error('E1 evidence: identity 无效')
  assertPalMappings(evidence.mappings, 'E1 evidence')
  if (
    !/^[a-f0-9]{64}$/.test(evidence.legacyItemsDigest) ||
    !/^[a-f0-9]{64}$/.test(evidence.currentItemsDigest)
  )
    throw new Error('E1 evidence: items digest 无效')
  const { digest, ...body } = evidence
  if (digest !== stableJsonSha256(body)) throw new Error('E1 evidence: digest 漂移')
}

export function assertEquipBattleSpriteUpgradeBacked(
  legacySnapshot: MigrationSnapshot,
  currentSnapshot: MigrationSnapshot,
  evidence: EquipBattleSpriteUpgradeEvidenceV1,
): void {
  assertEquipBattleSpriteUpgradeEvidence(evidence)
  const legacyItems = legacySnapshot.files.get(ITEMS_PATH)
  const currentItems = currentSnapshot.files.get(ITEMS_PATH)
  if (!Array.isArray(legacyItems) || !Array.isArray(currentItems))
    throw new Error('E1 snapshot-backed: items 无效')
  if (
    stableJsonSha256(legacyItems) !== evidence.legacyItemsDigest ||
    stableJsonSha256(currentItems) !== evidence.currentItemsDigest ||
    stableJsonSha256(upgradeItemsV8ToV9(legacyItems)) !== evidence.currentItemsDigest
  )
    throw new Error('E1 snapshot-backed: items digest 漂移')
  assertPalMappings(
    collectCurrentMappings(currentItems, 'E1 snapshot-backed current'),
    'E1 snapshot-backed',
  )
}

/**
 * 三方 merge 与后续 append-only pass 可以保留无关 item 作者改动；E1 只继续拥有
 * 这 7 条 item/actor/battleSprite 映射。
 */
export function assertEquipBattleSpriteFinalTargetClosure(
  snapshot: MigrationSnapshot,
  evidence: EquipBattleSpriteUpgradeEvidenceV1,
): void {
  assertEquipBattleSpriteUpgradeEvidence(evidence)
  const items = snapshot.files.get(ITEMS_PATH)
  if (!Array.isArray(items)) throw new Error('E1 final target: items 无效')
  const mappings = collectCurrentMappings(items, 'E1 final target')
  assertPalMappings(mappings, 'E1 final target')
  if (
    stableJsonSha256(sortedMappings(mappings.map((mapping) => ({ ...mapping })))) !==
    stableJsonSha256(evidence.mappings)
  )
    throw new Error('E1 final target: battleSprite mappings 漂移')
}
