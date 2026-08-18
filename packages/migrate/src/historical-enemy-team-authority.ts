import type { SceneDefV5, ScriptChunkV1, ScriptIndexV1 } from '@type-pal/content'
import { normalizeScriptLibrary, validateScenesV5 } from '@type-pal/content'
import {
  derivePalMigrationFileSet,
  type MigrationFileSet,
  type MigrationJson,
} from './pal-migration.js'

const SCRIPT_INDEX_PATH = 'content/scripts/index.json'

function currentValidationValue(value: unknown, ownerKey?: string): unknown {
  if (Array.isArray(value)) {
    const children = value.map((child) => currentValidationValue(child))
    return children.some((child, index) => child !== value[index]) ? children : value
  }
  if (value === null || typeof value !== 'object') return value
  const historical = value as Record<string, unknown>
  const isEnemyTeamReference =
    (historical.kind === 'startBattle' || ownerKey === 'hostile') &&
    Number.isSafeInteger(historical.team)
  if (isEnemyTeamReference) {
    if (Object.hasOwn(historical, 'enemyTeamId'))
      throw new Error('historical enemy-team validation: team/enemyTeamId 双字段')
    return Object.fromEntries(
      Object.entries(historical).map(([key, child]) =>
        key === 'team'
          ? ['enemyTeamId', `team-${String(historical.team)}`]
          : [key, currentValidationValue(child, key)],
      ),
    )
  }
  const entries = Object.entries(historical).map(
    ([key, child]) => [key, currentValidationValue(child, key)] as const,
  )
  return entries.some(([key, child]) => child !== historical[key])
    ? Object.fromEntries(entries)
    : value
}

/** 只供 current-only validator 读历史 scene；返回隔离副本，不改冻结 authority。 */
export function projectHistoricalSceneForCurrentValidation(value: unknown): unknown {
  return currentValidationValue(value)
}

/** 校验历史/current 两种 scene 形状，但始终把未改写的原 authority 返回调用方。 */
export function validateHistoricalScenesForCurrentSchema(values: readonly unknown[]): SceneDefV5[] {
  validateScenesV5(values.map(projectHistoricalSceneForCurrentValidation))
  return values as SceneDefV5[]
}

function projectValue(value: unknown, ownerKey?: string): unknown {
  if (Array.isArray(value)) {
    const children = value.map((child) => projectValue(child))
    return children.some((child, index) => child !== value[index]) ? children : value
  }
  if (value === null || typeof value !== 'object') return value
  const current = value as Record<string, unknown>
  const isEnemyTeamReference =
    (current.kind === 'startBattle' || ownerKey === 'hostile') &&
    Object.hasOwn(current, 'enemyTeamId')
  if (isEnemyTeamReference) {
    if (Object.hasOwn(current, 'team'))
      throw new Error('historical enemy-team authority: enemyTeamId/team 双字段无法投影')
    if (typeof current.enemyTeamId !== 'string')
      throw new Error('historical enemy-team authority: enemyTeamId 期望 string')
    const match = /^team-(0|[1-9]\d*)$/.exec(current.enemyTeamId)
    const team = match ? Number(match[1]) : Number.NaN
    if (!Number.isSafeInteger(team))
      throw new Error(
        `historical enemy-team authority: ${current.enemyTeamId} 不是可逆的 PAL team-N 引用`,
      )
    return Object.fromEntries(
      Object.entries(current).map(([key, child]) =>
        key === 'enemyTeamId' ? ['team', team] : [key, projectValue(child, key)],
      ),
    )
  }
  const entries = Object.entries(current).map(
    ([key, child]) => [key, projectValue(child, key)] as const,
  )
  return entries.some(([key, child]) => child !== current[key])
    ? Object.fromEntries(entries)
    : value
}

/** 把 current validator/compiler 的 transient 结果逆投影回冻结 authority 形状。 */
export function projectCurrentEnemyTeamReferencesForHistoricalAuthority(value: unknown): unknown {
  return projectValue(value)
}

function normalizeProjectedScriptFiles(
  files: Map<string, MigrationJson>,
  input: ReadonlyMap<string, MigrationJson>,
): void {
  const index = input.get(SCRIPT_INDEX_PATH) as unknown as ScriptIndexV1 | undefined
  if (!index) return
  const changedChunks: Record<string, ScriptChunkV1> = {}
  for (const [id, meta] of Object.entries(index.chunks)) {
    const path = `content/scripts/${meta.path}`
    const rawChunk = files.get(path)
    const chunk = rawChunk as unknown as ScriptChunkV1 | undefined
    if (!chunk) throw new Error(`historical enemy-team authority: 缺脚本 chunk ${id}(${path})`)
    if (rawChunk !== input.get(path)) changedChunks[id] = chunk
  }
  if (Object.keys(changedChunks).length === 0) return

  // Historical stages remain resident together in the shared release worker. Re-normalizing every
  // chunk here would retain another complete script library for a handful of changed references.
  const normalized = normalizeScriptLibrary(index, changedChunks)
  const nextIndex: ScriptIndexV1 = {
    ...index,
    chunks: { ...index.chunks },
  }
  for (const [id, chunk] of Object.entries(normalized.chunks)) {
    const meta = normalized.index.chunks[id]
    if (!meta) throw new Error(`historical enemy-team authority: 归一化缺 chunk ${id}`)
    nextIndex.chunks[id] = meta
    files.set(`content/scripts/${meta.path}`, structuredClone(chunk) as unknown as MigrationJson)
  }
  files.set(SCRIPT_INDEX_PATH, nextIndex as unknown as MigrationJson)
}

export function projectHistoricalEnemyTeamFiles(
  input: ReadonlyMap<string, MigrationJson>,
): Map<string, MigrationJson> {
  const files = new Map(
    [...input].map(([path, value]) => [path, projectValue(value) as MigrationJson]),
  )
  normalizeProjectedScriptFiles(files, input)
  return files
}

export function projectMigrationForFrozenEnemyTeamAuthority(
  migration: MigrationFileSet,
): MigrationFileSet {
  const derived = derivePalMigrationFileSet(
    migration,
    projectHistoricalEnemyTeamFiles(migration.files),
  )
  derived.report = projectValue(migration.report) as MigrationFileSet['report']
  return derived
}
