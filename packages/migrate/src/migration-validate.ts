import type {
  Command,
  EnemyDef,
  EnemyTeamDef,
  ScriptChunkV1,
  ScriptIndexV1,
  StartWorld,
} from '@type-pal/content'
import {
  checkScriptIndex,
  stableScriptHash,
  validateActors,
  validateItems,
  validateLocale,
  validateReferences,
  validateScenes,
  validateSkills,
  validateSprites,
} from '@type-pal/content'
import type { MigrationJson, PalMigrationSources } from './pal-migration.js'
import { assertScriptLibraryAudit, auditScriptLibrary } from './script-library-audit.js'

export interface MigrationValidationReport {
  scenes: number
  managedFiles: number
  referenceWarnings: number
  scriptAudit: ReturnType<typeof auditScriptLibrary>
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
    if (record.kind === 'dialog' && record.line && typeof record.line === 'object') {
      const line = record.line as Record<string, unknown>
      for (const field of ['text', 'speaker']) {
        const key = line[field]
        if (typeof key === 'string' && !(key in locale)) missing.add(key)
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
}): MigrationValidationReport {
  const { files, managedFiles, sources, startWorld } = args
  const actors = validateActors(required(files, 'content/actors.json'))
  const skillData = validateSkills(required(files, 'content/skills.json'))
  const items = validateItems(required(files, 'content/items.json'))
  const locale = validateLocale(required(files, 'content/locale.json'))
  const sprites = validateSprites(required(files, 'content/sprites.json'))

  for (const path of [
    'content/enemies.json',
    'content/enemy-teams.json',
    'content/music.json',
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

  const enemies = required(files, 'content/enemies.json') as unknown as EnemyDef[]
  const enemyTeams = required(files, 'content/enemy-teams.json') as unknown as EnemyTeamDef[]
  const issues = validateReferences({
    scenes,
    actors,
    skills: skillData.skills,
    levelUp: skillData.levelUp as never,
    items,
    locale,
    sprites,
    startWorld,
    enemies,
    enemyTeams,
    music: required(files, 'content/music.json') as never,
    battleFields: required(files, 'content/battle-fields.json') as never,
    poisons: required(files, 'content/poisons.json') as never,
    shops: required(files, 'content/shops.json') as never,
  })
  const referenceErrors = issues.filter((issue) => issue.severity === 'error')
  if (referenceErrors.length)
    throw new Error(
      `跨引用门禁失败:\n${referenceErrors.map((issue) => `${issue.where}: ${issue.message}`).join('\n')}`,
    )
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
    managedFiles: managedFiles.size,
    referenceWarnings: issues.length - referenceErrors.length,
    scriptAudit,
  }
}
