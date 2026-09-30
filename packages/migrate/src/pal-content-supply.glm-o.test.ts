/** TEST-GLM-WAVE-O-1 O03：窄供应核与发布门的残余公开合同。
 *  旧证：O01 文件覆盖 build/validate 主干；本卡补齐供应输入守卫残余
 *  （实体跨场景重复、tileset 路径漂移、生成精灵分区过滤、场景序）与
 *  装备战斗精灵引用门。全部复用合成 typed 工程。
 */
import { describe, expect, test } from 'vitest'
import type { ItemData } from '@type-pal/content'
import { buildPalContentSupply } from './pal-content-supply.js'
import { buildPalCurrentPublication, validatePalCurrentPublication } from './pal-current-publication.js'
import { buildPalCurrentManifest } from './pal-manifest.js'
import {
  syntheticBaselineFiles,
  syntheticCatalog,
  syntheticSupply,
} from './__tests__/glm-o/supply-fixture.js'
import type { MigrationSnapshot } from './migration-baseline.js'
import type { MigrationJson } from './migration-files.js'

function baselineFromEntries(entries: readonly (readonly [string, unknown])[]): MigrationSnapshot {
  const files = new Map<string, MigrationJson>()
  for (const [path, value] of entries)
    files.set(path, JSON.parse(JSON.stringify(value)) as MigrationJson)
  return { files, managedFiles: new Set(files.keys()) }
}

describe('O03 buildPalContentSupply：供应输入守卫残余', () => {
  test('同一 EventObject 出现在多个场景时 fail-loud（全局实体唯一）', () => {
    const { sources } = syntheticSupply()
    const [first] = sources.scenes
    sources.scenes = [
      ...sources.scenes,
      { ...first!, sceneId: 999, eventObjects: [...first!.eventObjects] },
    ]
    expect(() => buildPalContentSupply(sources)).toThrow(
      `PAL EventObject ${first!.eventObjects[0]!.id + 1} 出现在多个场景`,
    )
  })

  test('源地图 tileset 路径漂移时 fail-loud（期望 tileset/<mapNum>.rle）', () => {
    const { sources } = syntheticSupply()
    sources.tilemaps = [
      {
        ...sources.tilemaps[0]!,
        source: { ...sources.tilemaps[0]!.source, tileset: 'tileset/2.rle' },
      },
    ]
    expect(() => buildPalContentSupply(sources)).toThrow(
      'map 1: tileset 路径期望 tileset/1.rle，收到 tileset/2.rle',
    )
  })

  test('生成精灵分区只保留角色资产定义（overlay/场景变体不入分区）', () => {
    const { sources } = syntheticSupply()
    const generated = buildPalContentSupply(sources)
    const ids = generated.roleDefinitions.map(({ id }) => id).sort()
    expect(ids).toEqual([
      'anu',
      'gai-luojiao',
      'li-xiaoyao',
      'lin-yueru',
      'wu-hou',
      'zhao-linger',
    ])
  })

  test('scenes 按 sceneId 升序进入生成侧（与源数组顺序无关）', () => {
    const { sources } = syntheticSupply()
    sources.scenes = [...sources.scenes].reverse()
    const generated = buildPalContentSupply(sources)
    const ids = generated.scenes.map(({ id }) => id)
    expect([...ids].sort()).toEqual(ids)
  })

  test('实体 spriteNum<=0 不产生场景实体', () => {
    const { sources } = syntheticSupply()
    const scene = sources.scenes[0]!
    sources.scenes = [
      { ...scene, eventObjects: [{ ...scene.eventObjects[0]!, spriteNum: 0 }] },
      ...sources.scenes.slice(1),
    ]
    const generated = buildPalContentSupply(sources)
    const first = generated.scenes.find(({ id }) => id === `s${String(scene.sceneId).padStart(3, '0')}`)!
    expect(first.entities).toEqual([])
  })
})

describe('O03 validatePalCurrentPublication：装备战斗精灵引用门', () => {
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
    const items = entries.get('content/items.json') as ItemData[]
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
    expect(() =>
      validatePalCurrentPublication({ publication, manifest, sources }),
    ).not.toThrow()
  })

  test('覆写引用未知角色 → 发布门以 where: message 拒绝', () => {
    const { publication, sources, manifest } = publicationWithEquip(
      equipItem({ 'ghost-actor': 'player-fighter-0' }),
    )
    expect(() =>
      validatePalCurrentPublication({ publication, manifest, sources }),
    ).toThrow(/items\[\d+\]\(166\)\.equip\.effects\[0\]\.byActor\.ghost-actor: 战斗形象覆写角色 "ghost-actor" 不在 actors/)
  })

  test('覆写角色不在 equipableBy → 发布门拒绝', () => {
    const item = equipItem({ 'zhao-linger': 'player-fighter-1' })
    item.equip!.equipableBy = ['li-xiaoyao']
    const { publication, sources, manifest } = publicationWithEquip(item)
    expect(() =>
      validatePalCurrentPublication({ publication, manifest, sources }),
    ).toThrow(/战斗形象覆写角色 "zhao-linger" 不在本物品 equipableBy/)
  })

  test('覆写引用未注册战斗精灵 → 发布门拒绝', () => {
    const { publication, sources, manifest } = publicationWithEquip(
      equipItem({ 'li-xiaoyao': 'battle-sprite-ghost' }),
    )
    expect(() =>
      validatePalCurrentPublication({ publication, manifest, sources }),
    ).toThrow(/战斗精灵 "battle-sprite-ghost" 不在 battleSprites 注册表/)
  })
})

describe('O03 合成 catalog 自检补充', () => {
  test('sprite 资源 kind 全部为 sprite（validateSprites catalog 前提）', () => {
    const catalog = syntheticCatalog()
    for (const [id, record] of Object.entries(catalog.assets))
      if (id.startsWith('sprite.pal.')) expect(record.kind).toBe('sprite')
  })
})
