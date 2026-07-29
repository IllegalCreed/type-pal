import {
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type CurrentManifest,
  type LegacyManifestV5,
  type LegacyManifestV6,
  type LegacyManifestV7,
  upgradeItemsV7ToV8,
  upgradeManifestV7ToV8,
} from '@type-pal/content'
import {
  type FileSource,
  loadAllScenesV5,
  loadProjectV5From,
  loadStampTemplatesV5,
} from '@type-pal/reforge'
import { writeProject } from './project-io.js'

const encoder = new TextEncoder()

function manifestRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function projectOverlay(
  source: FileSource,
  manifest: CurrentManifest,
  itemsPath: string,
  items: unknown,
): FileSource {
  const values = new Map<string, unknown>([
    ['manifest.json', manifest],
    [itemsPath, items],
  ])
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

function itemsPathOf(manifest: Record<string, unknown>): string {
  const content = manifest.content
  if (!content || typeof content !== 'object' || Array.isArray(content))
    throw new Error('manifest.content: 期望对象')
  const path = (content as Record<string, unknown>).items
  if (typeof path !== 'string' || path.length === 0)
    throw new Error('manifest.content.items: 期望非空相对路径')
  return path
}

async function preflightAndWriteV8(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  current: CurrentManifest,
  itemsPath: string,
  items: unknown,
): Promise<void> {
  const overlay = projectOverlay(source, current, itemsPath, items)
  const project = await loadProjectV5From(overlay)
  await Promise.all([loadAllScenesV5(project), loadStampTemplatesV5(project)])
  await writeProject(dir, { [itemsPath]: items, 'manifest.json': current })
}

/**
 * R13-2 开发期 content epoch 断点 + R13-3 投掷 schema：把已经完成 script-v4-v5
 * 迁移的本地 5/5 或 6/6 工程在内存中直接合成最终 8/7。
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
  const itemsPath = itemsPathOf(record)
  const items = upgradeItemsV7ToV8(await source.readJson<unknown>(itemsPath))
  const current: CurrentManifest = {
    ...legacy,
    contentVersion: 8,
    minimumSaveVersion: CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  }
  await preflightAndWriteV8(dir, source, current, itemsPath, items)
  return true
}

/** R13-3 content 7 -> 8；只补投掷 target，SAVE/minimum 仍为 7。 */
export async function upgradeLocalProjectV7ThrowV8(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
): Promise<boolean> {
  const record = manifestRecord(rawManifest)
  if (record?.contentVersion !== 7) return false
  const legacy = structuredClone(record) as unknown as LegacyManifestV7
  const itemsPath = itemsPathOf(record)
  const items = upgradeItemsV7ToV8(await source.readJson<unknown>(itemsPath))
  const current = upgradeManifestV7ToV8(legacy)
  if (current.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error(
      `manifest.minimumSaveVersion: contentVersion 7 期望 ` +
        `${CURRENT_PROJECT_MINIMUM_SAVE_VERSION}，收到 ${String(current.minimumSaveVersion)}`,
    )
  await preflightAndWriteV8(dir, source, current, itemsPath, items)
  return true
}
