import type { ScriptChunkV1, ScriptIndexV1, ScriptRef } from '@type-pal/content'
import {
  checkScriptIndex,
  deriveScriptChunk,
  isScriptRef,
  normalizeScriptLibrary,
} from '@type-pal/content'
import type { MigrationJson } from './pal-migration.js'

export { normalizeScriptLibrary }

export const MIGRATION_SCRIPT_VIEW_PATH = 'content/scripts/.mg2-by-script-id.json'
const SCRIPT_INDEX_PATH = 'content/scripts/index.json'
const SCRIPT_REF_SENTINEL = '__mg2-derived__'

interface CanonicalScriptEntry {
  body: ScriptChunkV1['scripts'][string]
  oldChunk?: string
}

interface CanonicalScriptView {
  version: 1
  scripts: Record<string, CanonicalScriptEntry>
}

export function isMigrationScriptChunkFile(path: string): boolean {
  return (
    path.startsWith('content/scripts/') &&
    path !== SCRIPT_INDEX_PATH &&
    path !== MIGRATION_SCRIPT_VIEW_PATH
  )
}

function rewriteScriptRefs(
  node: unknown,
  resolveChunk: (ref: ScriptRef) => string | undefined,
): void {
  if (Array.isArray(node)) {
    for (const value of node) rewriteScriptRefs(value, resolveChunk)
    return
  }
  if (!node || typeof node !== 'object') return
  if (isScriptRef(node)) {
    const chunk = resolveChunk(node)
    if (chunk) node.chunk = chunk
  }
  for (const value of Object.values(node)) rewriteScriptRefs(value, resolveChunk)
}

/**
 * 把物理 chunk 视图转换成按 script id 的合并视图。chunk/imports/bytes/hash 与
 * ScriptRef.chunk 都是派生提示，不参与三方冲突判定。
 */
export function canonicalizeMigrationScriptFiles(
  input: ReadonlyMap<string, MigrationJson>,
): Map<string, MigrationJson> {
  const files = new Map([...input].map(([path, value]) => [path, structuredClone(value)] as const))
  const index = files.get(SCRIPT_INDEX_PATH) as unknown as ScriptIndexV1 | undefined
  if (!index) return files
  checkScriptIndex(index)
  const scripts: CanonicalScriptView['scripts'] = {}
  const chunkPaths: string[] = []
  for (const value of files.values()) rewriteScriptRefs(value, () => SCRIPT_REF_SENTINEL)
  for (const [path, raw] of files) {
    if (!isMigrationScriptChunkFile(path)) continue
    const chunk = raw as unknown as ScriptChunkV1
    if (chunk.version !== 1 || typeof chunk.id !== 'string' || !chunk.scripts) continue
    chunkPaths.push(path)
    for (const [id, body] of Object.entries(chunk.scripts)) {
      if (scripts[id]) throw new Error(`合并前脚本 id 重复: ${id}`)
      const derived = deriveScriptChunk(id, index.shards)
      scripts[id] = {
        body: structuredClone(body),
        ...(derived ? {} : { oldChunk: chunk.id }),
      }
    }
  }

  for (const path of chunkPaths) files.delete(path)
  const chunkPathsOnly = Object.fromEntries(
    Object.entries(index.chunks).map(([id, meta]) => [id, { path: meta.path, bytes: 0 }]),
  )
  files.set(
    SCRIPT_INDEX_PATH,
    JSON.parse(
      JSON.stringify({
        version: 1,
        shards: structuredClone(index.shards),
        chunks: chunkPathsOnly,
        ...(index.library ? { library: structuredClone(index.library) } : {}),
      }),
    ) as MigrationJson,
  )
  files.set(
    MIGRATION_SCRIPT_VIEW_PATH,
    JSON.parse(
      JSON.stringify({ version: 1, scripts } satisfies CanonicalScriptView),
    ) as MigrationJson,
  )
  return files
}

/** 按 script id 合并完成后统一重分桶、恢复 ref.chunk，并重算全部派生元数据。 */
export function materializeMigrationScriptFiles(
  input: ReadonlyMap<string, MigrationJson>,
): Map<string, MigrationJson> {
  const files = new Map([...input].map(([path, value]) => [path, structuredClone(value)] as const))
  const index = files.get(SCRIPT_INDEX_PATH) as unknown as ScriptIndexV1 | undefined
  const view = files.get(MIGRATION_SCRIPT_VIEW_PATH) as unknown as CanonicalScriptView | undefined
  if (!index || !view) return files
  if (view.version !== 1 || !view.scripts || typeof view.scripts !== 'object')
    throw new Error('合并脚本虚拟视图格式无效')

  const grouped = new Map<string, Record<string, ScriptChunkV1['scripts'][string]>>()
  const owners = new Map<string, string>()
  for (const [id, entry] of Object.entries(view.scripts)) {
    if (!entry || !Array.isArray(entry.body)) throw new Error(`合并脚本体格式无效: ${id}`)
    const chunk = deriveScriptChunk(id, index.shards) ?? entry.oldChunk
    if (!chunk) throw new Error(`脚本 ${id} 无法推导 chunk，且没有旧 chunk 提示`)
    const bucket = grouped.get(chunk) ?? {}
    bucket[id] = structuredClone(entry.body)
    grouped.set(chunk, bucket)
    owners.set(id, chunk)
  }

  const resolveRef = (ref: ScriptRef): string | undefined =>
    deriveScriptChunk(ref.id, index.shards) ?? owners.get(ref.id)
  for (const value of files.values()) rewriteScriptRefs(value, resolveRef)
  for (const scripts of grouped.values()) rewriteScriptRefs(scripts, resolveRef)
  files.delete(MIGRATION_SCRIPT_VIEW_PATH)

  const rawChunks: Record<string, ScriptChunkV1> = {}
  for (const [id, chunkScripts] of [...grouped].sort(([a], [b]) => a.localeCompare(b))) {
    rawChunks[id] = { version: 1, id, scripts: chunkScripts }
  }
  const normalized = normalizeScriptLibrary(index, rawChunks)
  files.set(SCRIPT_INDEX_PATH, JSON.parse(JSON.stringify(normalized.index)) as MigrationJson)
  for (const [id, chunk] of Object.entries(normalized.chunks)) {
    const meta = normalized.index.chunks[id]
    if (!meta) throw new Error(`归一化脚本 index 缺少 chunk ${id}`)
    const path = `content/scripts/${meta.path}`
    if (files.has(path)) throw new Error(`脚本重分桶目标与现有文件冲突: ${path}`)
    files.set(path, JSON.parse(JSON.stringify(chunk)) as MigrationJson)
  }
  return files
}

export function normalizeMigrationScriptFiles(
  input: ReadonlyMap<string, MigrationJson>,
): Map<string, MigrationJson> {
  return materializeMigrationScriptFiles(canonicalizeMigrationScriptFiles(input))
}
