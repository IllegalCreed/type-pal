import type {
  Command,
  EnemyDef,
  EnemyTeamDef,
  EntryPoint,
  ManifestAssetConfigV3,
  ScriptChunkV1,
  ScriptIndexV1,
  StartWorld,
} from '@type-pal/content'
import {
  checkScriptIndex,
  collectAssetReferences,
  collectBattleSpriteDefinitionReferences,
  stableScriptHash,
  validateActors,
  validateAssetCatalog,
  validateAssetReferenceClosure,
  validateBattleFields,
  validateBattleSprites,
  validateEnemies,
  validateItems,
  validateLocale,
  validateManifestAssetConfigV3,
  validateMapIndex,
  validateProjectMap,
  validateReferences,
  validateScenes,
  validateSkills,
  validateSprites,
  validateStampTemplates,
  validateTilesets,
} from '@type-pal/content'
import type { MigrationJson, PalMigrationSources } from './pal-migration.js'
import { MIGRATED_SCENE_ENTRY_PREFIX } from './scene-entry-normalize.js'
import { assertScriptLibraryAudit, auditScriptLibrary } from './script-library-audit.js'

export interface MigrationValidationReport {
  scenes: number
  maps: number
  managedFiles: number
  referenceWarnings: number
  assetReferences: number
  assetWarnings: number
  spriteReferences: SpriteReferenceClosureReport
  battleSpriteReferences: BattleSpriteReferenceClosureReport
  sceneEntryReferences: SceneEntryReferenceClosureReport
  scriptAudit: ReturnType<typeof auditScriptLibrary>
}

export interface BattleSpriteReferenceClosureReport {
  definitions: number
  references: number
  usedDefinitions: number
  sharedDefinitions: number
  unusedAssets: number
}

export type SpriteReferenceChannel =
  | 'definitions'
  | 'actors'
  | 'entities'
  | 'setActorSprite'
  | 'setActorAppearance'
  | 'setFollowers'

export interface SpriteReferenceClosureReport {
  channels: Record<SpriteReferenceChannel, { total: number; migrated: number }>
  legacy: Array<{ where: string; id: string }>
  unresolved: Array<{ where: string; id: string; channel: SpriteReferenceChannel }>
}

export interface SceneEntryReferenceClosureReport {
  commands: { total: number; default: number; named: number; explicitPos: number }
  generatedEntries: number
  issues: Array<{ where: string; message: string }>
}

const LEGACY_MIGRATED_SPRITE_ID = /^npc-\d+(?:-f\d+)?$/
const MIGRATED_SPRITE_ID = /^sprite-\d+(?:-f\d+)?$/

function pointerSegment(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1')
}

/**
 * 审计合并后的最终 target，而不是纯生成中间态。除三类真实引用外，actors.spriteId
 * 作为 semantic-only 第五通道也纳入闭包；实体 id、文案等含 npc- 的字符串不会被扫描。
 */
export function auditSpriteReferenceClosure(
  files: ReadonlyMap<string, MigrationJson>,
): SpriteReferenceClosureReport {
  const channels: SpriteReferenceClosureReport['channels'] = {
    definitions: { total: 0, migrated: 0 },
    actors: { total: 0, migrated: 0 },
    entities: { total: 0, migrated: 0 },
    setActorSprite: { total: 0, migrated: 0 },
    setActorAppearance: { total: 0, migrated: 0 },
    setFollowers: { total: 0, migrated: 0 },
  }
  const definitions = new Set<string>()
  const legacy: SpriteReferenceClosureReport['legacy'] = []
  const unresolved: SpriteReferenceClosureReport['unresolved'] = []
  const sprites = files.get('content/sprites.json')
  if (Array.isArray(sprites))
    sprites.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return
      const id = entry.id
      if (typeof id !== 'string') return
      definitions.add(id)
      channels.definitions.total++
      if (MIGRATED_SPRITE_ID.test(id)) channels.definitions.migrated++
      if (LEGACY_MIGRATED_SPRITE_ID.test(id))
        legacy.push({ where: `content/sprites.json/${index}/id`, id })
    })

  const reference = (
    channel: Exclude<SpriteReferenceChannel, 'definitions'>,
    id: string,
    where: string,
  ): void => {
    channels[channel].total++
    if (MIGRATED_SPRITE_ID.test(id)) channels[channel].migrated++
    if (LEGACY_MIGRATED_SPRITE_ID.test(id)) legacy.push({ where, id })
    if (!definitions.has(id)) unresolved.push({ where, id, channel })
  }

  const actors = files.get('content/actors.json')
  if (Array.isArray(actors))
    actors.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return
      if (typeof entry.spriteId === 'string')
        reference('actors', entry.spriteId, `content/actors.json/${index}/spriteId`)
    })

  for (const [path, value] of files) {
    if (/^content\/scenes\/[^/]+\.json$/.test(path) && path !== 'content/scenes/index.json') {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Array.isArray(value.entities)
      )
        value.entities.forEach((entry, index) => {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return
          if (typeof entry.sprite === 'string')
            reference('entities', entry.sprite, `${path}/entities/${index}/sprite`)
        })
    }

    const walkCommands = (node: unknown, pointer: string): void => {
      if (Array.isArray(node)) {
        node.forEach((entry, index) => {
          walkCommands(entry, `${pointer}/${index}`)
        })
        return
      }
      if (!node || typeof node !== 'object') return
      const record = node as Record<string, unknown>
      if (record.kind === 'setActorSprite' && typeof record.sprite === 'string')
        reference('setActorSprite', record.sprite, `${pointer}/sprite`)
      if (record.kind === 'setActorAppearance' && typeof record.spriteId === 'string')
        reference('setActorAppearance', record.spriteId, `${pointer}/spriteId`)
      if (record.kind === 'setFollowers' && Array.isArray(record.sprites))
        record.sprites.forEach((sprite, index) => {
          const where = `${pointer}/sprites/${index}`
          if (typeof sprite === 'string') reference('setFollowers', sprite, where)
          else {
            channels.setFollowers.total++
            unresolved.push({ where, id: String(sprite), channel: 'setFollowers' })
          }
        })
      for (const [key, entry] of Object.entries(record))
        walkCommands(entry, `${pointer}/${pointerSegment(key)}`)
    }
    walkCommands(value, path)
  }

  return { channels, legacy, unresolved }
}

/** 旧生成身份或任一悬空引用都必须在事务写盘前 fail-loud。 */
export function assertSpriteReferenceClosure(
  files: ReadonlyMap<string, MigrationJson>,
): SpriteReferenceClosureReport {
  const report = auditSpriteReferenceClosure(files)
  if (!report.legacy.length && !report.unresolved.length) return report
  const details = [
    ...report.legacy.map((issue) => `${issue.where}: 旧生成 id ${issue.id}`),
    ...report.unresolved.map(
      (issue) => `${issue.where}: ${issue.channel} 引用 ${issue.id} 不在 sprites 注册表`,
    ),
  ]
  throw new Error(`精灵引用闭包门禁失败:\n${details.slice(0, 50).join('\n')}`)
}

/**
 * W4-1:审计三方合并后的最终 target。脚本可位于 scene、共享 chunk、分支或敌人编舞，
 * 因而按命令形状递归扫全部托管 JSON，而不是另写一套场景内联脚本扫描器。
 */
export function auditSceneEntryReferenceClosure(
  files: ReadonlyMap<string, MigrationJson>,
): SceneEntryReferenceClosureReport {
  type EntryRecord = Record<string, { pos?: unknown }>
  const scenes = new Map<string, { path: string; entries: EntryRecord }>()
  const generated = new Map<string, { where: string; references: number }>()
  const issues: SceneEntryReferenceClosureReport['issues'] = []
  for (const [path, value] of files) {
    if (!/^content\/scenes\/[^/]+\.json$/.test(path) || path === 'content/scenes/index.json')
      continue
    if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.id !== 'string')
      continue
    const entries =
      value.entries && typeof value.entries === 'object' && !Array.isArray(value.entries)
        ? (value.entries as EntryRecord)
        : {}
    scenes.set(value.id, { path, entries })
    const positions = new Map<string, string>()
    for (const [entryId, entry] of Object.entries(entries)) {
      if (!entryId.startsWith(MIGRATED_SCENE_ENTRY_PREFIX)) continue
      const where = `${path}/entries/${pointerSegment(entryId)}`
      generated.set(`${value.id}\0${entryId}`, { where, references: 0 })
      const pos = entry?.pos
      if (!pos || typeof pos !== 'object' || Array.isArray(pos)) continue
      const record = pos as Record<string, unknown>
      const key = `${String(record.col)},${String(record.row)},${String(record.height)}`
      const duplicate = positions.get(key)
      if (duplicate)
        issues.push({ where, message: `迁移命名落点与 ${duplicate} 使用重复 GridPos ${key}` })
      else positions.set(key, entryId)
    }
  }

  const commands = { total: 0, default: 0, named: 0, explicitPos: 0 }
  const seen = new WeakSet<object>()
  const walk = (node: unknown, where: string): void => {
    if (!node || typeof node !== 'object') return
    if (seen.has(node)) return
    seen.add(node)
    if (Array.isArray(node)) {
      node.forEach((child, index) => {
        walk(child, `${where}/${index}`)
      })
      return
    }
    const record = node as Record<string, unknown>
    if (record.kind === 'loadScene') {
      commands.total++
      if ('entry' in record)
        issues.push({ where, message: 'loadScene.entry 旧字段已退役，必须使用 entryId' })
      if (record.entryId !== undefined && record.pos !== undefined)
        issues.push({ where, message: 'entryId 与 pos 不能同时存在' })
      const sceneId = record.scene
      const target = typeof sceneId === 'string' ? scenes.get(sceneId) : undefined
      if (!target) {
        issues.push({ where, message: `目标场景 ${String(sceneId)} 不存在` })
      } else if (record.entryId !== undefined) {
        commands.named++
        if (typeof record.entryId !== 'string' || !record.entryId) {
          issues.push({ where, message: 'entryId 必须是非空字符串' })
        } else if (!(record.entryId in target.entries)) {
          issues.push({
            where,
            message: `命名落点 ${sceneId}/${record.entryId} 不存在`,
          })
        } else {
          const migrated = generated.get(`${sceneId}\0${record.entryId}`)
          if (migrated) migrated.references++
        }
      } else if (record.pos !== undefined) commands.explicitPos++
      else commands.default++
    }
    for (const [key, child] of Object.entries(record))
      walk(child, `${where}/${pointerSegment(key)}`)
  }
  for (const [path, value] of files) walk(value, path)

  for (const [key, entry] of generated) {
    if (entry.references > 0) continue
    const [, entryId = key] = key.split('\0')
    issues.push({ where: entry.where, message: `迁移命名落点 ${entryId} 没有任何脚本引用` })
  }

  return { commands, generatedEntries: generated.size, issues }
}

export function assertSceneEntryReferenceClosure(
  files: ReadonlyMap<string, MigrationJson>,
): SceneEntryReferenceClosureReport {
  const report = auditSceneEntryReferenceClosure(files)
  if (!report.issues.length) return report
  throw new Error(
    `命名落点引用闭包门禁失败:\n${report.issues
      .slice(0, 50)
      .map((issue) => `${issue.where}: ${issue.message}`)
      .join('\n')}`,
  )
}

export function findMissingDialogLocaleRefs(
  files: ReadonlyMap<string, MigrationJson>,
  locale: Readonly<Record<string, string>>,
): string[] {
  const missing = new Set<string>()
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const value of node) walk(value)
      return
    }
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    if (record.kind === 'dialog' && record.cue && typeof record.cue === 'object') {
      const cue = record.cue as Record<string, unknown>
      const speaker = cue.speaker
      if (typeof speaker === 'string' && !(speaker in locale)) missing.add(speaker)
      if (Array.isArray(cue.rows)) {
        for (const row of cue.rows) {
          if (!row || typeof row !== 'object') continue
          const key = (row as Record<string, unknown>).text
          if (typeof key === 'string' && !(key in locale)) missing.add(key)
        }
      }
    }
    for (const value of Object.values(record)) walk(value)
  }
  for (const [path, value] of files) {
    if (path !== 'content/locale.json') walk(value)
  }
  return [...missing].sort()
}

function required(files: ReadonlyMap<string, MigrationJson>, path: string): MigrationJson {
  const value = files.get(path)
  if (value === undefined) throw new Error(`合并结果缺必需文件 ${path}`)
  return value
}

function assertStableIds(value: MigrationJson, path: string): void {
  if (!Array.isArray(value)) throw new Error(`${path}: 期望根数组`)
  const seen = new Set<string>()
  value.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      throw new Error(`${path}[${index}]: 期望对象`)
    const id = entry.id
    if (typeof id !== 'string' && typeof id !== 'number')
      throw new Error(`${path}[${index}]: 缺稳定 id`)
    const key = `${typeof id}:${id}`
    if (seen.has(key)) throw new Error(`${path}: 重复 id ${id}`)
    seen.add(key)
  })
}

function enemyCommandRoots(enemies: readonly EnemyDef[]): Array<{ id: string; body: Command[] }> {
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

/** 所有校验都是纯读内存目标，必须在事务 journal 创建前完成。 */
export function validatePalMigrationTarget(args: {
  files: ReadonlyMap<string, MigrationJson>
  managedFiles: ReadonlySet<string>
  sources: PalMigrationSources
  startWorld: StartWorld
  assets: ManifestAssetConfigV3
  entryPoints?: readonly EntryPoint[]
}): MigrationValidationReport {
  const { files, managedFiles, sources, startWorld } = args
  const assetCatalog = validateAssetCatalog(required(files, 'assets/index.json'))
  validateManifestAssetConfigV3(args.assets, assetCatalog)
  const actors = validateActors(required(files, 'content/actors.json'))
  const skillData = validateSkills(required(files, 'content/skills.json'))
  const items = validateItems(required(files, 'content/items.json'))
  const locale = validateLocale(required(files, 'content/locale.json'))
  const sprites = validateSprites(required(files, 'content/sprites.json'), assetCatalog)
  const battleSprites = validateBattleSprites(
    required(files, 'content/battle-sprites.json'),
    assetCatalog,
  )
  const spriteReferences = assertSpriteReferenceClosure(files)
  const sceneEntryReferences = assertSceneEntryReferenceClosure(files)
  const mapIndex = validateMapIndex(required(files, 'content/maps/index.json'))
  const tilesets = validateTilesets(required(files, 'content/tilesets.json'), assetCatalog)
  const tilesetIds = new Set(tilesets.map((tileset) => tileset.id))
  const stamps = validateStampTemplates(required(files, 'content/stamps.json'))
  for (const stamp of stamps) {
    if (!tilesetIds.has(stamp.tilesetId))
      throw new Error(
        `content/stamps.json: 图章 "${stamp.id}" 的 tilesetId "${stamp.tilesetId}" 不在 tilesets 注册表`,
      )
  }
  if (mapIndex.maps.length !== sources.tilemaps.length)
    throw new Error(`地图索引数量 ${mapIndex.maps.length} != 源图数量 ${sources.tilemaps.length}`)
  const indexedMapPaths = new Set<string>()
  for (const asset of mapIndex.maps) {
    indexedMapPaths.add(asset.path)
    const map = validateProjectMap(required(files, asset.path))
    if (!tilesetIds.has(map.tilesetId))
      throw new Error(`${asset.path}: tilesetId "${map.tilesetId}" 不在 tilesets 注册表`)
  }
  const orphanMap = [...files.keys()].find(
    (path) =>
      /^content\/maps\/[^/]+\.json$/.test(path) &&
      path !== 'content/maps/index.json' &&
      !indexedMapPaths.has(path),
  )
  if (orphanMap) throw new Error(`合并结果有孤儿地图文件 ${orphanMap}`)

  for (const path of [
    'content/enemies.json',
    'content/enemy-teams.json',
    'content/battle-fields.json',
    'content/poisons.json',
    'content/shops.json',
  ])
    assertStableIds(required(files, path), path)

  const sceneIdsRaw = required(files, 'content/scenes/index.json')
  if (!Array.isArray(sceneIdsRaw) || sceneIdsRaw.some((id) => typeof id !== 'string'))
    throw new Error('content/scenes/index.json: 期望 string[]')
  const sceneIds = sceneIdsRaw as string[]
  if (new Set(sceneIds).size !== sceneIds.length)
    throw new Error('content/scenes/index.json: scene id 重复')
  const scenes = validateScenes(sceneIds.map((id) => required(files, `content/scenes/${id}.json`)))
  scenes.forEach((scene, index) => {
    if (scene.id !== sceneIds[index])
      throw new Error(`场景文件 id 与 index 不符: ${sceneIds[index]} -> ${scene.id}`)
  })
  const indexedScenes = new Set(sceneIds.map((id) => `content/scenes/${id}.json`))
  const orphanScene = [...files.keys()].find(
    (path) => /^content\/scenes\/s\d+\.json$/.test(path) && !indexedScenes.has(path),
  )
  if (orphanScene) throw new Error(`合并结果有孤儿场景文件 ${orphanScene}`)

  const enemies = validateEnemies(required(files, 'content/enemies.json'))
  const battleFields = validateBattleFields(required(files, 'content/battle-fields.json'))
  const enemyTeams = required(files, 'content/enemy-teams.json') as unknown as EnemyTeamDef[]
  const missingDialogLocale = findMissingDialogLocaleRefs(files, locale)
  if (missingDialogLocale.length)
    throw new Error(`对话 locale 引用缺失: ${missingDialogLocale.slice(0, 50).join(', ')}`)

  const indexRaw = required(files, 'content/scripts/index.json')
  checkScriptIndex(indexRaw)
  const index = indexRaw as unknown as ScriptIndexV1
  const chunks: Record<string, ScriptChunkV1> = {}
  const indexedChunkPaths = new Set<string>()
  for (const [id, meta] of Object.entries(index.chunks)) {
    const path = `content/scripts/${meta.path}`
    indexedChunkPaths.add(path)
    const chunk = required(files, path) as unknown as ScriptChunkV1
    if (
      chunk.version !== 1 ||
      chunk.id !== id ||
      !chunk.scripts ||
      typeof chunk.scripts !== 'object'
    )
      throw new Error(`脚本 chunk 形状或 id 不符: ${id}`)
    const compact = JSON.stringify(chunk)
    const bytes = new TextEncoder().encode(compact).byteLength
    const hash = stableScriptHash(compact).toString(16).padStart(8, '0')
    if (meta.bytes !== bytes || meta.hash !== hash)
      throw new Error(`脚本 chunk 派生元数据不符: ${id}`)
    chunks[id] = chunk
  }
  const orphanChunk = [...files.keys()].find(
    (path) =>
      path.startsWith('content/scripts/') &&
      path !== 'content/scripts/index.json' &&
      !indexedChunkPaths.has(path),
  )
  if (orphanChunk) throw new Error(`合并结果有孤儿脚本 chunk ${orphanChunk}`)

  const issues = validateReferences({
    scenes,
    actors,
    skills: skillData.skills,
    levelUp: skillData.levelUp as never,
    items,
    locale,
    sprites,
    battleSprites,
    startWorld,
    enemies,
    enemyTeams,
    battleFields,
    poisons: required(files, 'content/poisons.json') as never,
    shops: required(files, 'content/shops.json') as never,
    tilesets,
    stamps,
    mapIndex,
    scriptChunks: chunks,
  })
  const referenceErrors = issues.filter((issue) => issue.severity === 'error')
  if (referenceErrors.length)
    throw new Error(
      `跨引用门禁失败:\n${referenceErrors.map((issue) => `${issue.where}: ${issue.message}`).join('\n')}`,
    )

  const battleSpriteDefinitionReferences = collectBattleSpriteDefinitionReferences({
    actors,
    enemies,
    items,
    skills: skillData.skills,
    scenes,
    scriptChunks: chunks,
  })
  const battleSpriteReferenceCounts = new Map<string, number>()
  for (const reference of battleSpriteDefinitionReferences)
    battleSpriteReferenceCounts.set(
      reference.battleSprite,
      (battleSpriteReferenceCounts.get(reference.battleSprite) ?? 0) + 1,
    )
  const battleSpriteDefinitionAssets = new Set(battleSprites.map(({ asset }) => asset))
  const battleSpriteReferences: BattleSpriteReferenceClosureReport = {
    definitions: battleSprites.length,
    references: battleSpriteDefinitionReferences.length,
    usedDefinitions: battleSpriteReferenceCounts.size,
    sharedDefinitions: [...battleSpriteReferenceCounts.values()].filter((count) => count > 1)
      .length,
    unusedAssets: Object.entries(assetCatalog.assets).filter(
      ([asset, record]) =>
        record.kind === 'battle-sprite' && !battleSpriteDefinitionAssets.has(asset),
    ).length,
  }

  const assetReferences = collectAssetReferences({
    assets: args.assets,
    entryPoints: args.entryPoints,
    scenes,
    scriptChunks: chunks,
    actors,
    enemies,
    items,
    skills: skillData.skills,
    battleFields,
    tilesets,
    sprites,
    battleSprites,
  })
  const assetIssues = validateAssetReferenceClosure(assetCatalog, assetReferences)
  const assetErrors = assetIssues.filter((issue) => issue.severity === 'error')
  if (assetErrors.length)
    throw new Error(
      `资源引用闭包门禁失败:\n${assetErrors
        .map((issue) => `${issue.where}: ${issue.message}`)
        .join('\n')}`,
    )

  const scriptAudit = auditScriptLibrary({
    sourceJson: sources.allJson,
    sourcePrettyBytes: sources.allJsonPrettyBytes,
    sourceCommandCount: sources.migrate.commands.length,
    scenes,
    index,
    chunks,
    extraRoots: enemyCommandRoots(enemies),
  })
  assertScriptLibraryAudit(scriptAudit)
  return {
    scenes: scenes.length,
    maps: mapIndex.maps.length,
    managedFiles: managedFiles.size,
    referenceWarnings: issues.length - referenceErrors.length,
    assetReferences: assetReferences.length,
    assetWarnings: assetIssues.length - assetErrors.length,
    spriteReferences,
    battleSpriteReferences,
    sceneEntryReferences,
    scriptAudit,
  }
}
