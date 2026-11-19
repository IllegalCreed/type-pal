import { type ItemData, validateAuthorItems } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { syntheticBaselineFiles, syntheticSupply } from './__tests__/glm-o/supply-fixture.js'
import type { MigrationSnapshot } from './migration-baseline.js'
import type { MigrationJson } from './migration-files.js'
import {
  buildPalCurrentPublication,
  validatePalCurrentPublication,
} from './pal-current-publication.js'
import { buildPalCurrentManifest } from './pal-manifest.js'

function baselineFromEntries(entries: Iterable<readonly [string, unknown]>): MigrationSnapshot {
  const files = new Map<string, MigrationJson>()
  for (const [path, value] of entries)
    files.set(path, JSON.parse(JSON.stringify(value)) as MigrationJson)
  return { files, managedFiles: new Set(files.keys()) }
}

describe('PAL publication validates equipment battle sprite overrides', () => {
  const equipItem = (byActor: Record<string, string>): ItemData => ({
    id: '166',
    name: '木剑',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    equip: {
      slot: 'weapon',
      equipableBy: Object.keys(byActor),
      effects: [{ kind: 'battleSprite', byActor }],
    },
  })

  function publicationWithEquip(item: ItemData) {
    const { sources } = syntheticSupply()
    const entries = syntheticBaselineFiles()
    const items = validateAuthorItems(entries.get('content/items.json'))
    entries.set('content/items.json', [...items, item])
    const baseline = baselineFromEntries(entries)
    const publication = buildPalCurrentPublication(baseline, sources)
    const manifest = buildPalCurrentManifest(sources.assetCatalog)
    return { publication, sources, manifest }
  }

  test('合法战斗形象覆写（现存可战斗角色且在 equipableBy）通过发布门', () => {
    const { publication, sources, manifest } = publicationWithEquip(
      equipItem({ 'li-xiaoyao': 'player-fighter-0' }),
    )
    expect(() => validatePalCurrentPublication({ publication, manifest, sources })).not.toThrow()
  })

  test('覆写引用未知角色 → 发布门以 where: message 拒绝', () => {
    const { publication, sources, manifest } = publicationWithEquip(
      equipItem({ 'ghost-actor': 'player-fighter-0' }),
    )
    expect(() => validatePalCurrentPublication({ publication, manifest, sources })).toThrow(
      /items\[\d+\]\(166\)\.equip\.effects\[0\]\.byActor\.ghost-actor: 战斗形象覆写角色 "ghost-actor" 不在 actors/,
    )
  })

  test('覆写角色不在 equipableBy → 发布门拒绝', () => {
    const item = equipItem({ 'zhao-linger': 'player-fighter-1' })
    item.equip!.equipableBy = ['li-xiaoyao']
    const { publication, sources, manifest } = publicationWithEquip(item)
    expect(() => validatePalCurrentPublication({ publication, manifest, sources })).toThrow(
      /战斗形象覆写角色 "zhao-linger" 不在本物品 equipableBy/,
    )
  })

  test('覆写引用未注册战斗精灵 → 发布门拒绝', () => {
    const { publication, sources, manifest } = publicationWithEquip(
      equipItem({ 'li-xiaoyao': 'battle-sprite-ghost' }),
    )
    expect(() => validatePalCurrentPublication({ publication, manifest, sources })).toThrow(
      /战斗精灵 "battle-sprite-ghost" 不在 battleSprites 注册表/,
    )
  })
})
