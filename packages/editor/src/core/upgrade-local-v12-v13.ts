/**
 * 本地 content12 → content13 原子升级。
 *
 * 目标是让 editor 能以 manifest-last 的方式把已落地的 v12 工程整体晋升到 v13，
 * 同时在写盘前用 v13 loader 做整包预检，避免先改 manifest 再发现 scenes/shared
 * scripts 不闭合。
 */
import {
  type ManifestV13,
  type LegacyManifestV12,
  upgradeManifestV12ToV13,
  upgradeScenesV12ToV13,
  validateProjectRelativePath,
} from '@type-pal/content'
import {
  type FileSource,
  loadAllScenesV13,
  loadProjectV13From,
  loadStampTemplatesV13,
} from '@type-pal/reforge'
import { writeProject } from './project-io.js'

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
  const encoder = new TextEncoder()
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

async function preflightAndWriteV13(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  legacyManifest: LegacyManifestV12,
): Promise<void> {
  const manifestObject = manifestRecord(legacyManifest)
  if (!manifestObject) throw new Error('manifest: 期望对象')
  const current: ManifestV13 = upgradeManifestV12ToV13(legacyManifest)
  const overlayValues = new Map<string, unknown>()
  const writes: Record<string, unknown> = {}

  const sceneDir = sceneDirectoryOf(manifestObject)
  const ids = sceneIds(await source.readJson<unknown>(`${sceneDir}index.json`))
  const scenes = await Promise.all(ids.map((id) => source.readJson<unknown>(`${sceneDir}${id}.json`)))
  const upgradedScenes = upgradeScenesV12ToV13(scenes)
  upgradedScenes.forEach((scene, index) => {
    const id = ids[index]
    if (!id) throw new Error('v13 upgrade: scene ids / scenes 长度不一致')
    const path = validateProjectRelativePath(`${sceneDir}${id}.json`, `scenes[${JSON.stringify(id)}]`)
    overlayValues.set(path, scene)
    if (stableJson(scenes[index]) !== stableJson(scene)) writes[path] = scene
  })
  overlayValues.set('manifest.json', current)
  const overlay = projectOverlay(source, overlayValues)
  const project = await loadProjectV13From(overlay)
  await Promise.all([loadAllScenesV13(project), loadStampTemplatesV13(project)])
  writes['manifest.json'] = current
  await writeProject(dir, writes)
}

/** content 12 → 13：scene hostile policy 与 manifest 原子晋升。 */
export async function upgradeLocalProjectV12V13(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
): Promise<boolean> {
  const record = manifestRecord(rawManifest)
  if (record?.contentVersion !== 12) return false
  const legacy = structuredClone(record) as unknown as LegacyManifestV12
  await preflightAndWriteV13(dir, source, legacy)
  return true
}
