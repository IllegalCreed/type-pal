import type { AssetCatalogV1, MapIndexV1, SpriteDef, TilesetDef } from '@type-pal/content'
import { palTilesetAssetId } from '@type-pal/content'
import type { MigrationJson } from './migration-files.js'
import type { PalAssetMigrationReport, PalBinaryAssetSource } from './pal-assets.js'
import { applyPalCasualtyOverlays } from './pal-casualty-scripts.js'
import type { SourceStore } from './pal-derived-content.js'
import { migratePalShops } from './pal-derived-content.js'
import { buildPalItemMessageSources } from './pal-item-message-source.js'
import { mapNameFromSourceNumber } from './pal-map-names.js'
import { mapActor, mapRoleSpritesByNumber, mapSprites } from './pal-role-mapping.js'
import { buildPalSceneIndex } from './pal-scene-index.js'
import { palSoundAssetForSources } from './pal-sound-assets.js'
import type { SourceItem, SourceRole, SourceScene } from './pal-source-types.js'
import { PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIAS_IDS } from './pal-world-sprite-layouts.js'
import { createPalWorldSpriteRegistry } from './pal-world-sprite-registry.js'
import type { SourceMapAuditEntry } from './project-map-audit.js'
import { auditAndConvertSourceMaps } from './project-map-audit.js'
import { mapIdFromSourceNumber, tilesetIdFromSourceNumber } from './project-map-converter.js'
import type { SourceCmd } from './source-facts.js'
import { sceneSlug } from './source-facts.js'

/** current 供应只需资源、静态布局及两个窄脚本消费者；完整转换域不在合同中。 */
export interface PalContentSupplySources {
  migrate: { roles: SourceRole[]; levelUpExp: number[]; items: SourceItem[]; commands: SourceCmd[] }
  scenes: SourceScene[]
  tilemaps: SourceMapAuditEntry[]
  objectPlayers: Array<{ scriptOnFriendDeath: number; scriptOnDying: number }>
  musicMidi: number[]
  assetCatalog: AssetCatalogV1
  binaryAssets: PalBinaryAssetSource[]
  worldSpriteFrameCounts: number[]
  assetReport: PalAssetMigrationReport
  stores: SourceStore[]
}

/** 纯供应分区，场景仅给出真实静态引用证据，不产生作者正文或环境动作。 */
export function buildPalContentSupply(sources: PalContentSupplySources) {
  const convertedMaps = auditAndConvertSourceMaps(sources.tilemaps)
  const files = new Map<string, MigrationJson>()
  const put = (path: string, value: unknown): void => {
    files.set(path, JSON.parse(JSON.stringify(value)) as MigrationJson)
  }
  const soundAssetForNum = palSoundAssetForSources(sources)
  const actors = applyPalCasualtyOverlays(
    sources.migrate.roles.map((role) =>
      mapActor(role, sources.migrate.levelUpExp, soundAssetForNum),
    ),
    sources.migrate.commands,
    sources.objectPlayers,
  ).actors
  const sprites = mapSprites(sources.migrate.roles)
  const roleSpritesByNumber = mapRoleSpritesByNumber(sources.migrate.roles, sprites)
  const registry = createPalWorldSpriteRegistry(sources.scenes, roleSpritesByNumber, {
    worldSpriteFrameCounts: sources.worldSpriteFrameCounts,
    sceneSemanticSpriteIds: PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIAS_IDS,
  })
  const seenEntities = new Set<number>()
  const scenes = [...sources.scenes]
    .sort((left, right) => left.sceneId - right.sceneId)
    .map((scene) => ({
      id: sceneSlug(scene.sceneId),
      mapId: mapIdFromSourceNumber(scene.mapNum),
      entities: scene.eventObjects.flatMap((entity) => {
        if (seenEntities.has(entity.id))
          throw new Error(`PAL EventObject ${entity.id + 1} 出现在多个场景`)
        seenEntities.add(entity.id)
        return entity.spriteNum > 0
          ? [{ id: `e${entity.id}`, sprite: registry.spriteRef(entity) }]
          : []
      }),
    }))
  // 只保留源实体实际懒取到的角色 legacy 域；未使用的 overlay 注册不是 generated 定义。
  const roleAssets = new Set(sprites.map(({ asset }) => asset))
  const roleDefinitions: SpriteDef[] = [
    ...sprites,
    ...[...registry.spriteDefs.values()].filter(({ asset }) => roleAssets.has(asset)),
  ]
  const mapIndex: MapIndexV1 = {
    version: 1,
    maps: sources.tilemaps.map(({ mapNum }) => ({
      id: mapIdFromSourceNumber(mapNum),
      name: mapNameFromSourceNumber(mapNum),
      path: `content/maps/${mapIdFromSourceNumber(mapNum)}.json`,
    })),
  }
  const tilesets: TilesetDef[] = sources.tilemaps.map(({ mapNum, source }) => {
    const expectedPath = `tileset/${mapNum}.rle`
    if (source.tileset !== expectedPath)
      throw new Error(`map ${mapNum}: tileset 路径期望 ${expectedPath}，收到 ${source.tileset}`)
    return {
      id: tilesetIdFromSourceNumber(mapNum),
      name: `PAL 瓦片集 ${mapNum}`,
      category: 'builtin',
      asset: palTilesetAssetId(mapNum),
    }
  })
  put('assets/index.json', sources.assetCatalog)
  put('content/actors.json', actors)
  put('content/shops.json', migratePalShops(sources.stores))
  put('content/maps/index.json', mapIndex)
  put('content/tilesets.json', tilesets)
  for (const { mapNum } of sources.tilemaps) {
    const map = convertedMaps.maps.get(mapNum)
    if (!map) throw new Error(`地图转换结果缺 map ${mapNum}`)
    put(`content/maps/${mapIdFromSourceNumber(mapNum)}.json`, map)
  }
  return {
    files,
    managedFiles: new Set(files.keys()),
    mapReport: convertedMaps.report,
    sceneIndex: buildPalSceneIndex(scenes, mapIndex),
    scenes,
    roleDefinitions,
    roleSpritesByNumber,
    itemMessages: buildPalItemMessageSources(
      sources.migrate.items,
      sources.migrate.commands,
      sources.stores,
    ),
  }
}
