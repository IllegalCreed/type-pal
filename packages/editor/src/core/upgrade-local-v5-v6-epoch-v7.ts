import {
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type CurrentManifest,
  type LegacyManifestV5,
  type LegacyManifestV6,
  type LegacyManifestV7,
  type LegacyManifestV8,
  type LegacyManifestV9,
  upgradeEmbeddedBattleChoreographyV9ToV10,
  upgradeEnemiesV9ToV10,
  upgradeItemsV7ToV8,
  upgradeItemsV8ToV9,
  upgradeManifestV7ToV8,
  upgradeManifestV8ToV9,
  upgradeManifestV9ToV10,
  validateProjectRelativePath,
} from '@type-pal/content'
import {
  type FileSource,
  loadAllScenesV5,
  loadProjectV5From,
  loadStampTemplatesV5,
} from '@type-pal/reforge'
import { writeProject } from './project-io.js'

const encoder = new TextEncoder()

function stableJson(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize)
    if (!input || typeof input !== 'object') return input
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalize(child)]),
    )
  }
  return JSON.stringify(normalize(value))
}

function manifestRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function projectOverlay(source: FileSource, values: ReadonlyMap<string, unknown>): FileSource {
  const text = (path: string): string | undefined => {
    const value = values.get(path)
    return value === undefined ? undefined : `${JSON.stringify(value, null, 2)}\n`
  }
  return {
    async readText(path, signal) {
      if (signal?.aborted) throw new DOMException('file read aborted', 'AbortError')
      return text(path) ?? source.readText(path, signal)
    },
    async readJson<T>(path: string, signal?: AbortSignal) {
      const value = values.get(path)
      if (value !== undefined) return structuredClone(value) as T
      return source.readJson<T>(path, signal)
    },
    async readBytes(path, signal) {
      if (signal?.aborted) throw new DOMException('file read aborted', 'AbortError')
      const value = text(path)
      if (value === undefined) return source.readBytes(path, signal)
      const bytes = encoder.encode(value)
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    },
    urlFor: (path) => source.urlFor(path),
    legacy: source.legacy,
  }
}

function contentPathOf(
  manifest: Record<string, unknown>,
  key: string,
  required = false,
): string | undefined {
  const content = manifest.content
  if (!content || typeof content !== 'object' || Array.isArray(content))
    throw new Error('manifest.content: 期望对象')
  const path = (content as Record<string, unknown>)[key]
  if (path === undefined && !required) return undefined
  if (typeof path !== 'string' || path.length === 0)
    throw new Error(`manifest.content.${key}: 期望非空相对路径`)
  return validateProjectRelativePath(path, `manifest.content.${key}`)
}

function sceneDirectoryOf(manifest: Record<string, unknown>): string {
  const content = manifest.content
  if (!content || typeof content !== 'object' || Array.isArray(content))
    throw new Error('manifest.content: 期望对象')
  const raw = (content as Record<string, unknown>).scenes ?? 'content/scenes/'
  if (typeof raw !== 'string' || raw.length === 0)
    throw new Error('manifest.content.scenes: 期望非空相对路径')
  const path = raw.endsWith('/') ? raw.slice(0, -1) : raw
  validateProjectRelativePath(path, 'manifest.content.scenes')
  return `${path}/`
}

function sceneIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string'))
    throw new Error('scenes/index.json: 期望 string[]')
  return value as string[]
}

async function buildCurrentV10Upgrade(
  source: FileSource,
  legacyManifest: LegacyManifestV9,
  itemsOverride?: unknown,
): Promise<{
  current: CurrentManifest
  overlay: ReadonlyMap<string, unknown>
  writes: Record<string, unknown>
}> {
  const manifestRecordValue = manifestRecord(legacyManifest)
  if (!manifestRecordValue) throw new Error('manifest: 期望对象')
  const current = upgradeManifestV9ToV10(legacyManifest)
  const values = new Map<string, unknown>([['manifest.json', current]])
  const writes: Record<string, unknown> = { 'manifest.json': current }
  const upgrade = async (
    path: string,
    transform: (value: unknown) => unknown,
    override?: unknown,
  ): Promise<void> => {
    const sourceValue = await source.readJson<unknown>(path)
    const upgraded = transform(override ?? sourceValue)
    values.set(path, upgraded)
    if (stableJson(sourceValue) !== stableJson(upgraded)) writes[path] = upgraded
  }

  const itemsPath = contentPathOf(manifestRecordValue, 'items', true)!
  await upgrade(
    itemsPath,
    (value) => upgradeEmbeddedBattleChoreographyV9ToV10(value, 'items'),
    itemsOverride,
  )

  const sharedScriptsPath = contentPathOf(manifestRecordValue, 'sharedScripts', true)!
  await upgrade(sharedScriptsPath, (value) =>
    upgradeEmbeddedBattleChoreographyV9ToV10(value, 'sharedScripts'),
  )

  const enemiesPath = contentPathOf(manifestRecordValue, 'enemies')
  if (enemiesPath) await upgrade(enemiesPath, upgradeEnemiesV9ToV10)

  const sceneDir = sceneDirectoryOf(manifestRecordValue)
  const ids = sceneIds(await source.readJson<unknown>(`${sceneDir}index.json`))
  for (const id of ids) {
    const path = validateProjectRelativePath(
      `${sceneDir}${id}.json`,
      `manifest.content.scenes[${JSON.stringify(id)}]`,
    )
    await upgrade(path, (value) => upgradeEmbeddedBattleChoreographyV9ToV10(value, `scenes.${id}`))
  }

  return { current, overlay: values, writes }
}

async function preflightAndWriteCurrent(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  legacyManifest: LegacyManifestV9,
  itemsOverride?: unknown,
): Promise<void> {
  const prepared = await buildCurrentV10Upgrade(source, legacyManifest, itemsOverride)
  const overlay = projectOverlay(source, prepared.overlay)
  const project = await loadProjectV5From(overlay)
  await Promise.all([loadAllScenesV5(project), loadStampTemplatesV5(project)])
  await writeProject(dir, prepared.writes)
}

/**
 * R13-2 开发期 content epoch 断点 + R13-3 投掷 schema：把已经完成 script-v4-v5
 * 迁移的本地 5/5 或 6/6 工程在内存中直接合成最终 10/8。
 *
 * 绝不先落盘中间 7/7；写盘前用最终 manifest + items 走当前 loader 完整闭环。
 * writeProject 最后写 manifest；若中断，纯升级器能识别已带 oneEnemy 的 items 半状态并重试。
 */
export async function upgradeLocalProjectV5V6EpochV7(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
): Promise<boolean> {
  const record = manifestRecord(rawManifest)
  if (record?.contentVersion !== 5 && record?.contentVersion !== 6) return false
  const legacy = structuredClone(record) as unknown as LegacyManifestV5 | LegacyManifestV6
  const itemsPath = contentPathOf(record, 'items', true)!
  const items = upgradeItemsV8ToV9(upgradeItemsV7ToV8(await source.readJson<unknown>(itemsPath)))
  const v9: LegacyManifestV9 = {
    ...legacy,
    contentVersion: 9,
    minimumSaveVersion: CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  }
  await preflightAndWriteCurrent(dir, source, v9, items)
  return true
}

/** content 7 -> 当前：先补投掷 target，再升级按角色装备形象与 9/8 epoch。 */
export async function upgradeLocalProjectV7ThrowV8(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
): Promise<boolean> {
  const record = manifestRecord(rawManifest)
  if (record?.contentVersion !== 7) return false
  const legacy = structuredClone(record) as unknown as LegacyManifestV7
  const itemsPath = contentPathOf(record, 'items', true)!
  const items = upgradeItemsV8ToV9(upgradeItemsV7ToV8(await source.readJson<unknown>(itemsPath)))
  const intermediate = upgradeManifestV7ToV8(legacy)
  if (intermediate.minimumSaveVersion !== 7)
    throw new Error(
      `manifest.minimumSaveVersion: contentVersion 7 期望 7，收到 ${String(
        intermediate.minimumSaveVersion,
      )}`,
    )
  const v9 = upgradeManifestV8ToV9(intermediate)
  await preflightAndWriteCurrent(dir, source, v9, items)
  return true
}

/** content 8 -> 当前：scalar 装备形象升级到 byActor，并主动切到 SAVE8/min8。 */
export async function upgradeLocalProjectV8EquipBattleSpriteV9(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
): Promise<boolean> {
  const record = manifestRecord(rawManifest)
  if (record?.contentVersion !== 8) return false
  const legacy = structuredClone(record) as unknown as LegacyManifestV8
  const itemsPath = contentPathOf(record, 'items', true)!
  const items = upgradeItemsV8ToV9(await source.readJson<unknown>(itemsPath))
  const v9 = upgradeManifestV8ToV9(legacy)
  await preflightAndWriteCurrent(dir, source, v9, items)
  return true
}

/** content 9 -> 10：收窄 battle/onDefeated 上下文并保持 SAVE8/min8。 */
export async function upgradeLocalProjectV9EnemyScriptV10(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
): Promise<boolean> {
  const record = manifestRecord(rawManifest)
  if (record?.contentVersion !== 9) return false
  const legacy = structuredClone(record) as unknown as LegacyManifestV9
  await preflightAndWriteCurrent(dir, source, legacy)
  return true
}
