import type {
  AssetCatalogV1,
  BattleFieldDef,
  BattleSpriteDef,
  EnemyDef,
  MapIndexV1,
  SceneDef,
  SpriteDef,
  TilesetDef,
} from '@type-pal/content'
import {
  collectBattleSpriteDefinitionReferences,
  palBattleBackgroundAssetId,
  palSoundAssetId,
  palSpriteAssetId,
  palTilesetAssetId,
  validateBattleSprites,
} from '@type-pal/content'
import type { MigrateSources, SourceCmd, SourceScene } from './migrate-content.js'
import { mapRoleSpriteIdsByNumber, mapScenesStatic, migrateAll } from './migrate-content.js'
import { sha256 } from './migration-baseline.js'
import {
  applyPalItemOverlays,
  applyPalSkillOverlays,
  PAL_RESOLVED_ITEM_USE_IDS,
  PAL_RESOLVED_SKILL_IDS,
} from './pal-authored-overlays.js'
import { createPalBattleSpriteDefinitions } from './pal-battle-sprites.js'
import { applyPalBossEncounterOverlay } from './pal-boss-overlay.js'
import {
  migratePalPoisons,
  migratePalShops,
  type SourceObjectPoison,
  type SourceStore,
} from './pal-derived-content.js'
import {
  auditAndConvertSourceMaps,
  type ProjectMapAuditReport,
  type SourceMapAuditEntry,
} from './project-map-audit.js'
import { mapIdFromSourceNumber, tilesetIdFromSourceNumber } from './project-map-converter.js'
import { makeGlobalScriptRoots } from './script-graph.js'
import { assertScriptLibraryAudit, auditScriptLibrary } from './script-library-audit.js'
import { normalizeScriptLibrary } from './script-library-normalize.js'

export type MigrationJson =
  | null
  | boolean
  | number
  | string
  | MigrationJson[]
  | {
      [key: string]: MigrationJson
    }

export interface PalMigrationSources {
  migrate: MigrateSources
  allJson: { segments: { commands: SourceCmd[] }[] }
  allJsonPrettyBytes: number
  scenes: SourceScene[]
  eventsByScene: ReadonlyMap<number, readonly SourceCmd[]>
  tilemaps: SourceMapAuditEntry[]
  objectPlayers: Array<{ scriptOnFriendDeath: number; scriptOnDying: number }>
  musicMidi: number[]
  assetCatalog: AssetCatalogV1
  binaryAssets: import('./pal-assets.js').PalBinaryAssetSource[]
  assetReport: import('./pal-assets.js').PalAssetMigrationReport
  battleEffectIndex: number[]
  battleFields: BattleFieldDef[]
  objectPoisons: SourceObjectPoison[]
  stores: SourceStore[]
}

export interface MigrationFileSet {
  files: Map<string, MigrationJson>
  managedFiles: Set<string>
  report: {
    content: ReturnType<typeof migrateAll>['report']
    enemies: ReturnType<typeof migrateAll>['enemyReport']
    enemyTeams: ReturnType<typeof migrateAll>['enemyTeamReport']
    scenes: ReturnType<typeof mapScenesStatic>['report']
    scripts: ReturnType<typeof mapScenesStatic>['scriptReport']
    graph: ReturnType<typeof mapScenesStatic>['scriptGraphReport']
    audit: ReturnType<typeof auditScriptLibrary>
    bossOverlay: { attached: number; clearedEnemies: string[] }
    maps: ProjectMapAuditReport
    assets: import('./pal-assets.js').PalAssetMigrationReport
  }
}

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function enemyCommandRoots(enemies: readonly EnemyDef[]) {
  return enemies.flatMap((enemy) => [
    ...(enemy.choreography ?? []).map((hook, index) => ({
      id: `global/enemies/${enemy.id}/choreography-${index}`,
      body: hook.body,
    })),
    ...(enemy.onDefeated?.length
      ? [{ id: `global/enemies/${enemy.id}/on-defeated`, body: enemy.onDefeated }]
      : []),
  ])
}

export const PAL_WORLD_SPRITE_UNUSED_NUMBERS = [
  17, 71, 73, 85, 89, 93, 99, 101, 103, 115, 120, 126, 128, 130, 133, 168, 170, 174, 176, 180, 182,
  184, 186, 187, 208, 221, 243, 259, 277, 278, 280, 282, 283, 286, 287, 288, 290, 291, 296, 302,
  303, 304, 305, 316, 320, 328, 340, 352, 359, 403, 404, 406, 411, 417, 461, 463, 465, 467, 469,
  475, 483, 493, 496, 497, 498, 499, 503, 507, 508, 509, 510, 542, 543, 571, 572, 595, 635,
] as const

export const PAL_WORLD_SPRITE_SEMANTIC_DIGEST =
  'a45887f9e22c00c6afc95704945e52d24f7f60a1e2c0a85f5a32102c3b55902f'

function assertPalWorldSpriteBaseline(
  sprites: readonly SpriteDef[],
  catalog: AssetCatalogV1,
): void {
  const expectedCatalogIds = Array.from({ length: 636 }, (_, index) => palSpriteAssetId(index + 1))
  const catalogIds = Object.entries(catalog.assets)
    .filter(([, record]) => record.kind === 'sprite')
    .map(([asset]) => asset)
    .sort()
  const used = new Set(sprites.map(({ asset }) => asset))
  const unused = expectedCatalogIds.filter((asset) => !used.has(asset))
  const expectedUnused = PAL_WORLD_SPRITE_UNUSED_NUMBERS.map(palSpriteAssetId)
  const semanticDigest = sha256(
    JSON.stringify(
      sprites.map(({ id, asset, label, layout, poses }) =>
        poses === undefined ? { id, asset, label, layout } : { id, asset, label, layout, poses },
      ),
    ),
  )
  if (sprites.length !== 580) throw new Error(`PAL SpriteDef 期望 580，收到 ${sprites.length}`)
  if (used.size !== 559) throw new Error(`PAL 已用 sprite AssetId 期望 559，收到 ${used.size}`)
  if (sprites.length - used.size !== 21)
    throw new Error(`PAL 共享 SpriteDef 关系期望 21，收到 ${sprites.length - used.size}`)
  if (JSON.stringify(catalogIds) !== JSON.stringify(expectedCatalogIds))
    throw new Error('PAL sprite catalog AssetId 集合不是精确 1..636')
  if (JSON.stringify(unused) !== JSON.stringify(expectedUnused))
    throw new Error('PAL 未引用 sprite AssetId 集合发生漂移')
  if (semanticDigest !== PAL_WORLD_SPRITE_SEMANTIC_DIGEST)
    throw new Error(`PAL SpriteDef 语义投影发生漂移: ${semanticDigest}`)
}

function assertPalBattleSpriteBaseline(args: {
  definitions: readonly BattleSpriteDef[]
  catalog: AssetCatalogV1
  actors: ReturnType<typeof migrateAll>['actors']
  enemies: readonly EnemyDef[]
  items: ReturnType<typeof migrateAll>['items']
  skills: ReturnType<typeof migrateAll>['skills']['skills']
  scenes: readonly SceneDef[]
  scriptChunks: Readonly<Record<string, import('@type-pal/content').ScriptChunkV1>>
}): void {
  const { definitions, catalog } = args
  validateBattleSprites(definitions, catalog)
  const records = Object.entries(catalog.assets).filter(
    ([, record]) => record.kind === 'battle-sprite',
  )
  if (records.length !== 172)
    throw new Error(`PAL battle-sprite catalog 期望 172，收到 ${records.length}`)
  if (definitions.length !== 171)
    throw new Error(`PAL BattleSpriteDef 期望 171，收到 ${definitions.length}`)
  const references = collectBattleSpriteDefinitionReferences({
    actors: args.actors,
    enemies: [...args.enemies],
    items: args.items,
    skills: args.skills,
    scenes: [...args.scenes],
    scriptChunks: args.scriptChunks,
  })
  if (references.length !== 179)
    throw new Error(`PAL BattleSpriteDef 直接引用期望 179，收到 ${references.length}`)
  const byId = new Map(definitions.map((definition) => [definition.id, definition]))
  const occurrences = new Map<string, number>()
  for (const reference of references) {
    const definition = byId.get(reference.battleSprite)
    if (!definition) throw new Error(`PAL 战斗精灵引用缺定义: ${reference.battleSprite}`)
    if (definition.profile.kind !== reference.expectedProfile)
      throw new Error(
        `PAL 战斗精灵 ${definition.id} profile ${definition.profile.kind} 不匹配 ${reference.expectedProfile}`,
      )
    occurrences.set(definition.id, (occurrences.get(definition.id) ?? 0) + 1)
  }
  if (occurrences.size !== 171)
    throw new Error(`PAL 已用 BattleSpriteDef 期望 171，收到 ${occurrences.size}`)
  const shared = [...occurrences.entries()]
    .filter(([, count]) => count > 1)
    .sort(([left], [right]) => left.localeCompare(right))
  const expectedShared = [
    ['enemy-battle-81', 2],
    ['player-fighter-1', 2],
    ['player-fighter-5', 2],
    ['player-fighter-6', 3],
    ['player-fighter-7', 4],
  ]
  if (JSON.stringify(shared) !== JSON.stringify(expectedShared))
    throw new Error(`PAL BattleSpriteDef 共享关系漂移: ${JSON.stringify(shared)}`)
  const usedAssets = new Set(definitions.map((definition) => definition.asset))
  const unused = records.map(([asset]) => asset).filter((asset) => !usedAssets.has(asset))
  if (JSON.stringify(unused) !== JSON.stringify(['battle-sprite.pal.enemy.098']))
    throw new Error(`PAL battle-sprite 未引用资源漂移: ${unused.join(',')}`)

  const indirectEdges: Array<{ source: string; target: string; kind: 'transform' | 'summon' }> = []
  for (const enemy of args.enemies)
    for (const rule of enemy.ai.rules ?? []) {
      if (rule.do.kind === 'transform')
        indirectEdges.push({ source: enemy.id, target: rule.do.enemyId, kind: 'transform' })
      else if (rule.do.kind === 'summon')
        indirectEdges.push({
          source: enemy.id,
          target: rule.do.enemyId ?? enemy.id,
          kind: 'summon',
        })
    }
  const transforms = indirectEdges.filter(({ kind }) => kind === 'transform')
  const summons = indirectEdges.filter(({ kind }) => kind === 'summon')
  if (transforms.length !== 4 || summons.length !== 22 || indirectEdges.length !== 26)
    throw new Error(
      `PAL 敌 AI 间接边漂移: transform=${transforms.length} summon=${summons.length} total=${indirectEdges.length}`,
    )
  const enemiesById = new Set(args.enemies.map(({ id }) => id))
  const missingTargets = [
    ...new Set(
      indirectEdges.map(({ target }) => target).filter((target) => !enemiesById.has(target)),
    ),
  ].sort()
  if (missingTargets.length) throw new Error(`PAL 敌 AI 间接边缺目标: ${missingTargets.join(',')}`)
  const uniqueTargets = [...new Set(indirectEdges.map(({ target }) => target))].sort()
  const expectedTargets = [
    'enemy-403',
    'enemy-407',
    'enemy-410',
    'enemy-419',
    'enemy-420',
    'enemy-433',
    'enemy-434',
    'enemy-441',
    'enemy-442',
    'enemy-453',
    'enemy-461',
    'enemy-470',
    'enemy-490',
    'enemy-492',
    'enemy-512',
  ]
  if (JSON.stringify(uniqueTargets) !== JSON.stringify(expectedTargets))
    throw new Error(`PAL 敌 AI 间接目标集漂移: ${JSON.stringify(uniqueTargets)}`)
}

/** data/extracted 的内存快照 -> 完整纯迁移文件集；严禁接收或读取 projects/pal。 */
export function buildPalMigration(sources: PalMigrationSources): MigrationFileSet {
  const soundAssetForNum = (sound: number) => {
    if (!Number.isInteger(sound) || sound <= 0) return undefined
    const id = palSoundAssetId(sound)
    return sources.assetCatalog.assets[id]?.kind === 'sound' ? id : undefined
  }
  const convertedMaps = auditAndConvertSourceMaps(sources.tilemaps)
  const migrated = migrateAll({ ...sources.migrate, soundAssetForNum })
  const items = applyPalItemOverlays(migrated.items)
  const skills = {
    ...migrated.skills,
    skills: applyPalSkillOverlays(migrated.skills.skills),
  }
  const globalRoots = makeGlobalScriptRoots({
    items: sources.migrate.items.flatMap((item) => [
      item.scriptOnUse,
      item.scriptOnEquip,
      item.scriptOnThrow,
      item.scriptDesc,
    ]),
    skills: sources.migrate.spells.flatMap((spell) => [
      spell.scriptOnUse,
      spell.scriptOnSuccess,
      spell.scriptDesc,
    ]),
    enemies: (sources.migrate.enemyObjects ?? []).flatMap((enemy) => [
      enemy.scriptOnTurnStart,
      enemy.scriptOnBattleEnd,
      enemy.scriptOnReady,
    ]),
    actors: sources.objectPlayers.flatMap((actor) => [
      actor.scriptOnFriendDeath,
      actor.scriptOnDying,
    ]),
  })
  const sceneOutput = mapScenesStatic(
    sources.scenes,
    sources.eventsByScene,
    mapRoleSpriteIdsByNumber(sources.migrate.roles, migrated.sprites),
    globalRoots,
    soundAssetForNum,
  )
  const boss = applyPalBossEncounterOverlay(
    migrated.enemies,
    migrated.enemyTeams,
    sceneOutput.scriptChunks,
  )
  const scripts = normalizeScriptLibrary(sceneOutput.scriptIndex, boss.chunks)
  const sprites = [...migrated.sprites, ...sceneOutput.sprites]
  assertPalWorldSpriteBaseline(sprites, sources.assetCatalog)
  const battleSprites = createPalBattleSpriteDefinitions(
    sources.migrate.enemies ?? [],
    sources.migrate.enemyObjects ?? [],
    sources.assetReport.battleSpritePlayerFrameCounts,
    sources.assetReport.battleSpriteEnemyFrameCounts,
    sources.battleEffectIndex,
  )
  assertPalBattleSpriteBaseline({
    definitions: battleSprites,
    catalog: sources.assetCatalog,
    actors: migrated.actors,
    enemies: boss.enemies,
    items,
    skills: skills.skills,
    scenes: sceneOutput.scenes,
    scriptChunks: scripts.chunks,
  })
  const audit = auditScriptLibrary({
    sourceJson: sources.allJson,
    sourcePrettyBytes: sources.allJsonPrettyBytes,
    sourceCommandCount: sources.migrate.commands.length,
    scenes: sceneOutput.scenes,
    index: scripts.index,
    chunks: scripts.chunks,
    extraRoots: enemyCommandRoots(boss.enemies),
  })
  assertScriptLibraryAudit(audit)

  const files = new Map<string, MigrationJson>()
  const put = (path: string, value: unknown): void => {
    files.set(path, asJson(value))
  }
  put('content/actors.json', migrated.actors)
  put('content/sprites.json', sprites)
  put('content/battle-sprites.json', battleSprites)
  put('content/items.json', items)
  put('content/skills.json', skills)
  put('content/enemies.json', boss.enemies)
  put('content/enemy-teams.json', migrated.enemyTeams)
  put('content/locale.json', { ...migrated.localeNames, ...sceneOutput.scriptLocale })
  put('assets/index.json', sources.assetCatalog)
  const battleFields = sources.battleFields.map((field) => ({
    ...structuredClone(field),
    ...(field.id >= 6 && field.id <= 57
      ? { background: palBattleBackgroundAssetId(field.id) }
      : {}),
  }))
  put('content/battle-fields.json', battleFields)
  put('content/poisons.json', migratePalPoisons(sources.objectPoisons))
  put('content/shops.json', migratePalShops(sources.stores))
  const mapIndex: MapIndexV1 = {
    version: 1,
    maps: sources.tilemaps.map(({ mapNum }) => ({
      id: mapIdFromSourceNumber(mapNum),
      name: `PAL 地图 ${mapNum}`,
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
  put('content/maps/index.json', mapIndex)
  for (const { mapNum } of sources.tilemaps) {
    const map = convertedMaps.maps.get(mapNum)
    if (!map) throw new Error(`地图转换结果缺 map ${mapNum}`)
    put(`content/maps/${mapIdFromSourceNumber(mapNum)}.json`, map)
  }
  put('content/tilesets.json', tilesets)
  // PAL 提取真值只有逐格 tile/height/collision，没有命名组合、锚点或成员语义。
  // 因此保持空表；不得用邻接/图案相似度猜预置图章。未来预置须来自显式策展的上游描述源。
  put('content/stamps.json', [])
  put(
    'content/scenes/index.json',
    sceneOutput.scenes.map((scene) => scene.id),
  )
  for (const scene of sceneOutput.scenes) put(`content/scenes/${scene.id}.json`, scene)
  put('content/scripts/index.json', scripts.index)
  for (const id of Object.keys(scripts.chunks).sort()) {
    const meta = scripts.index.chunks[id]
    if (!meta) throw new Error(`scripts index 缺 chunk ${id}`)
    put(`content/scripts/${meta.path}`, scripts.chunks[id])
  }

  return {
    files,
    managedFiles: new Set(files.keys()),
    report: {
      content: {
        ...migrated.report,
        pendingSkills: migrated.report.pendingSkills.filter(
          (item) => !PAL_RESOLVED_SKILL_IDS.has(item.id),
        ),
        pendingUse: migrated.report.pendingUse.filter(
          (item) => !PAL_RESOLVED_ITEM_USE_IDS.has(item.itemId),
        ),
      },
      enemies: migrated.enemyReport,
      enemyTeams: migrated.enemyTeamReport,
      scenes: sceneOutput.report,
      scripts: sceneOutput.scriptReport,
      graph: sceneOutput.scriptGraphReport,
      audit,
      bossOverlay: { attached: boss.attached, clearedEnemies: boss.clearedEnemies },
      maps: convertedMaps.report,
      assets: structuredClone(sources.assetReport),
    },
  }
}

/** 审计与测试用：抽取纯文件集内的场景，不经 projects/pal 回读。 */
export function migrationScenes(fileSet: MigrationFileSet): SceneDef[] {
  const ids = fileSet.files.get('content/scenes/index.json') as string[] | undefined
  return (ids ?? []).map(
    (id) => fileSet.files.get(`content/scenes/${id}.json`) as unknown as SceneDef,
  )
}
