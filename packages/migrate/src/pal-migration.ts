import type { AssetCatalogV1, EnemyDef, MapIndexV1, SceneDef, TilesetDef } from '@type-pal/content'
import { palSoundAssetId } from '@type-pal/content'
import type { MigrateSources, SourceCmd, SourceScene } from './migrate-content.js'
import { mapScenesStatic, migrateAll } from './migrate-content.js'
import {
  applyPalItemOverlays,
  applyPalSkillOverlays,
  PAL_RESOLVED_ITEM_USE_IDS,
  PAL_RESOLVED_SKILL_IDS,
} from './pal-authored-overlays.js'
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
  battleFields: MigrationJson[]
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
    migrated.sprites,
    globalRoots,
    soundAssetForNum,
  )
  const boss = applyPalBossEncounterOverlay(
    migrated.enemies,
    migrated.enemyTeams,
    sceneOutput.scriptChunks,
  )
  const scripts = normalizeScriptLibrary(sceneOutput.scriptIndex, boss.chunks)
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
  put('content/sprites.json', [...migrated.sprites, ...sceneOutput.sprites])
  put('content/items.json', items)
  put('content/skills.json', skills)
  put('content/enemies.json', boss.enemies)
  put('content/enemy-teams.json', migrated.enemyTeams)
  put('content/locale.json', { ...migrated.localeNames, ...sceneOutput.scriptLocale })
  put('assets/index.json', sources.assetCatalog)
  put('content/battle-fields.json', structuredClone(sources.battleFields))
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
      path: source.tileset,
    }
  })
  put('content/maps/index.json', mapIndex)
  for (const { mapNum } of sources.tilemaps) {
    const map = convertedMaps.maps.get(mapNum)
    if (!map) throw new Error(`地图转换结果缺 map ${mapNum}`)
    put(`content/maps/${mapIdFromSourceNumber(mapNum)}.json`, map)
  }
  put('content/tilesets.json', tilesets)
  // W7G-A 只建立上游所有权与合并边界；预置图章内容在 W7G-B 由迁移真源生成。
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
