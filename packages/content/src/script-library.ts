import { type Command, checkCommands } from './script.js'

export const AUTHORED_SCRIPT_PREFIX = 'shared/user/'

export type SharedScriptSelf = 'none' | 'optional' | 'required'

/** 作者脚本的轻量目录信息；命令体仍只存在 ScriptChunkV1。 */
export interface SharedScriptMetaV1 {
  name: string
  description?: string
  self: SharedScriptSelf
}

/** 脚本体的稳定引用。chunk 是加载提示，id 才是持久身份。 */
export interface ScriptRef {
  chunk: string
  id: string
}

/** 脚本分片。每个脚本体在全库中只存一份。 */
export interface ScriptChunkV1 {
  version: 1
  id: string
  imports?: string[]
  scripts: Record<string, Command[]>
}

export interface ScriptChunkMetaV1 {
  path: string
  bytes: number
  hash?: string
  imports?: string[]
}

/** 稳定分桶配置。改变分片数属于 contentVersion 事件。 */
export interface ScriptShardConfigV1 {
  shared: number
  global: Record<string, number>
}

/** 启动时只加载元数据，不携带任何 Command[]。 */
export interface ScriptIndexV1 {
  version: 1
  shards: ScriptShardConfigV1
  chunks: Record<string, ScriptChunkMetaV1>
  /** 仅登记作者创建的一等共享脚本；未登记的 id 属于迁移/内部脚本。 */
  library?: Record<string, SharedScriptMetaV1>
}

export const DEFAULT_SCRIPT_SHARDS: ScriptShardConfigV1 = { shared: 16, global: {} }

export interface NormalizedScriptLibrary {
  index: ScriptIndexV1
  chunks: Record<string, ScriptChunkV1>
}

/** 内容模型只含 JSON 值；用 JSON 复制避免给纯逻辑包引入 DOM structuredClone。 */
function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** 与 TextEncoder(JSON).byteLength 一致的 UTF-8 字节数，供 Node/浏览器共用。 */
export function utf8ByteLength(value: string): number {
  let total = 0
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    total += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4
  }
  return total
}

export function isScriptRef(value: unknown): value is ScriptRef {
  if (typeof value !== 'object' || value === null) return false
  const ref = value as Partial<ScriptRef>
  return (
    typeof ref.chunk === 'string' &&
    ref.chunk.length > 0 &&
    typeof ref.id === 'string' &&
    ref.id.length > 0
  )
}

export function checkScriptRef(value: unknown, path: string): asserts value is ScriptRef {
  if (!isScriptRef(value)) throw new Error(`${path}: 期望 {chunk,id} ScriptRef`)
}

/** 递归访问结构中的 ScriptRef；场景根、命令嵌套臂与 chunk body 共用。 */
export function visitScriptRefs(node: unknown, visit: (ref: ScriptRef) => void): void {
  if (Array.isArray(node)) {
    for (const value of node) visitScriptRefs(value, visit)
    return
  }
  if (!node || typeof node !== 'object') return
  if (isScriptRef(node)) {
    visit(node)
    return
  }
  for (const value of Object.values(node)) visitScriptRefs(value, visit)
}

/** FNV-1a 32 位稳定散列；迁移器与运行时必须共用，不能依赖平台 hash。 */
export function stableScriptHash(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function shardName(prefix: string, id: string, count: number): string | undefined {
  if (!Number.isInteger(count) || count <= 0) return undefined
  const width = Math.max(2, String(count - 1).length)
  return `${prefix}/c${String(stableScriptHash(id) % count).padStart(width, '0')}`
}

function sharedShardKey(id: string): string {
  const parts = id.split('/')
  return parts[0] === 'shared' && parts[1]?.startsWith('scc-') ? `shared/${parts[1]}` : id
}

/**
 * 根据稳定 id 和当前分桶配置重算 chunk。ref.chunk 失配时 resolver 用它恢复，
 * 因此存档不会仅因 shared/global 重新分桶而失效。
 */
export function deriveScriptChunk(id: string, shards: ScriptShardConfigV1): string | undefined {
  const parts = id.split('/')
  if (parts[0] === 'scene' && parts.length >= 3) return `scene/${parts[1]}`
  if (parts[0] === 'shared' && parts.length >= 2)
    return shardName('shared', sharedShardKey(id), shards.shared)
  if (parts[0] === 'global' && parts.length >= 3) {
    const domain = parts[1]
    if (!domain) return undefined
    const count = shards.global[domain]
    return count === undefined ? undefined : shardName(`global/${domain}`, id, count)
  }
  return undefined
}

function checkSharedScriptMeta(value: unknown, path: string): asserts value is SharedScriptMetaV1 {
  if (typeof value !== 'object' || value === null) throw new Error(`${path}: 期望对象`)
  const meta = value as Partial<SharedScriptMetaV1>
  if (typeof meta.name !== 'string' || meta.name.trim().length === 0)
    throw new Error(`${path}.name: 期望非空字符串`)
  if (meta.description !== undefined && typeof meta.description !== 'string')
    throw new Error(`${path}.description: 期望字符串`)
  if (meta.self !== 'none' && meta.self !== 'optional' && meta.self !== 'required')
    throw new Error(`${path}.self: 期望 none|optional|required`)
}

export function checkScriptIndex(
  value: unknown,
  path = 'scripts/index.json',
): asserts value is ScriptIndexV1 {
  if (typeof value !== 'object' || value === null) throw new Error(`${path}: 期望对象`)
  const index = value as Partial<ScriptIndexV1>
  if (index.version !== 1) throw new Error(`${path}.version: 期望 1`)
  if (typeof index.shards !== 'object' || index.shards === null)
    throw new Error(`${path}.shards: 期望对象`)
  if (!Number.isInteger(index.shards.shared) || index.shards.shared <= 0)
    throw new Error(`${path}.shards.shared: 期望正整数`)
  if (typeof index.shards.global !== 'object' || index.shards.global === null)
    throw new Error(`${path}.shards.global: 期望对象`)
  for (const [domain, count] of Object.entries(index.shards.global)) {
    if (!domain || !Number.isInteger(count) || count <= 0)
      throw new Error(`${path}.shards.global.${domain}: 期望正整数`)
  }
  if (typeof index.chunks !== 'object' || index.chunks === null)
    throw new Error(`${path}.chunks: 期望对象`)
  for (const [id, raw] of Object.entries(index.chunks)) {
    if (typeof raw !== 'object' || raw === null) throw new Error(`${path}.chunks.${id}: 期望对象`)
    const meta = raw as Partial<ScriptChunkMetaV1>
    if (typeof meta.path !== 'string' || meta.path.length === 0)
      throw new Error(`${path}.chunks.${id}.path: 期望非空字符串`)
    if (typeof meta.bytes !== 'number' || !Number.isInteger(meta.bytes) || meta.bytes < 0)
      throw new Error(`${path}.chunks.${id}.bytes: 期望非负整数`)
  }
  if (index.library !== undefined) {
    if (typeof index.library !== 'object' || index.library === null)
      throw new Error(`${path}.library: 期望对象`)
    for (const [id, raw] of Object.entries(index.library)) {
      if (!id.startsWith(AUTHORED_SCRIPT_PREFIX) || id.length <= AUTHORED_SCRIPT_PREFIX.length)
        throw new Error(
          `${path}.library.${id}: 作者脚本 id 必须位于 ${AUTHORED_SCRIPT_PREFIX} 命名空间`,
        )
      checkSharedScriptMeta(raw, `${path}.library.${id}`)
    }
  }
}

export function createScriptIndex(
  shards: ScriptShardConfigV1 = DEFAULT_SCRIPT_SHARDS,
): ScriptIndexV1 {
  const index: ScriptIndexV1 = {
    version: 1,
    shards: cloneJson(shards),
    chunks: {},
  }
  checkScriptIndex(index)
  return index
}

function collectImports(node: unknown, owner: string, imports: Set<string>): void {
  if (Array.isArray(node)) {
    for (const value of node) collectImports(value, owner, imports)
    return
  }
  if (!node || typeof node !== 'object') return
  const value = node as Record<string, unknown>
  if ((value.kind === 'callScript' || value.kind === 'jumpScript') && isScriptRef(value.ref)) {
    if (value.ref.chunk !== owner) imports.add(value.ref.chunk)
  }
  for (const child of Object.values(value)) collectImports(child, owner, imports)
}

/** 修改脚本体后统一重算 imports、bytes、hash；chunk 布局与 shard 配置保持不变。 */
export function normalizeScriptLibrary(
  index: ScriptIndexV1,
  input: Readonly<Record<string, ScriptChunkV1>>,
): NormalizedScriptLibrary {
  checkScriptIndex(index)
  const chunks: Record<string, ScriptChunkV1> = {}
  for (const id of Object.keys(input).sort()) {
    const source = input[id]
    if (!source) continue
    const scripts = Object.fromEntries(
      Object.entries(source.scripts).map(([scriptId, body]) => [scriptId, cloneJson(body)]),
    )
    const imports = new Set<string>()
    collectImports(scripts, id, imports)
    chunks[id] = {
      version: 1,
      id,
      ...(imports.size ? { imports: [...imports].sort() } : {}),
      scripts,
    }
  }

  const metas: ScriptIndexV1['chunks'] = {}
  for (const [id, chunk] of Object.entries(chunks)) {
    const json = JSON.stringify(chunk)
    const bytes = utf8ByteLength(json)
    if (bytes >= 1024 * 1024) throw new Error(`脚本 chunk ${id} ${bytes}B 超过 1MiB`)
    metas[id] = {
      path: index.chunks[id]?.path ?? `chunks/${id}.json`,
      bytes,
      hash: stableScriptHash(json).toString(16).padStart(8, '0'),
      ...(chunk.imports?.length ? { imports: chunk.imports } : {}),
    }
  }

  const library = index.library
    ? Object.fromEntries(
        Object.entries(index.library)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, meta]) => [id, cloneJson(meta)]),
      )
    : undefined
  return {
    index: {
      version: 1,
      shards: cloneJson(index.shards),
      chunks: metas,
      ...(library && Object.keys(library).length ? { library } : {}),
    },
    chunks,
  }
}

/** 找到稳定 id 当前实际所属 chunk；内部编辑/迁移重分桶兼容用。 */
export function findScriptOwnerChunk(
  chunks: Readonly<Record<string, ScriptChunkV1>>,
  id: string,
): string | undefined {
  let owner: string | undefined
  for (const [chunkId, chunk] of Object.entries(chunks)) {
    if (!(id in chunk.scripts)) continue
    if (owner) throw new Error(`脚本 id 重复 ${id}(${owner},${chunkId})`)
    owner = chunkId
  }
  return owner
}

export function getScriptBody(
  index: ScriptIndexV1,
  chunks: Readonly<Record<string, ScriptChunkV1>>,
  id: string,
): Command[] | undefined {
  const derived = deriveScriptChunk(id, index.shards)
  const direct = derived ? chunks[derived]?.scripts[id] : undefined
  if (direct) return direct
  const owner = findScriptOwnerChunk(chunks, id)
  return owner ? chunks[owner]?.scripts[id] : undefined
}

function authoredMetaIndex(
  index: ScriptIndexV1,
  id: string,
  meta: SharedScriptMetaV1,
): ScriptIndexV1 {
  if (!id.startsWith(AUTHORED_SCRIPT_PREFIX) || id.length <= AUTHORED_SCRIPT_PREFIX.length)
    throw new Error(`作者脚本 id 必须位于 ${AUTHORED_SCRIPT_PREFIX} 命名空间`)
  checkSharedScriptMeta(meta, `library.${id}`)
  return {
    ...cloneJson(index),
    library: { ...cloneJson(index.library ?? {}), [id]: cloneJson(meta) },
  }
}

export function upsertAuthoredScript(
  index: ScriptIndexV1,
  chunks: Readonly<Record<string, ScriptChunkV1>>,
  id: string,
  meta: SharedScriptMetaV1,
  body: readonly Command[],
): NormalizedScriptLibrary {
  checkCommands(body, `library.${id}.body`)
  const nextIndex = authoredMetaIndex(index, id, meta)
  const chunkId = deriveScriptChunk(id, nextIndex.shards)
  if (!chunkId) throw new Error(`作者脚本 ${id} 无法推导 chunk`)
  const oldOwner = findScriptOwnerChunk(chunks, id)
  if (oldOwner && oldOwner !== chunkId)
    throw new Error(`作者脚本 ${id} 当前位于 ${oldOwner}，应先重分桶到 ${chunkId}`)
  const target = chunks[chunkId]
  const nextChunks: Record<string, ScriptChunkV1> = {
    ...cloneJson(chunks),
    [chunkId]: {
      version: 1,
      id: chunkId,
      scripts: { ...cloneJson(target?.scripts ?? {}), [id]: cloneJson([...body]) },
    },
  }
  return normalizeScriptLibrary(nextIndex, nextChunks)
}

export function removeAuthoredScript(
  index: ScriptIndexV1,
  chunks: Readonly<Record<string, ScriptChunkV1>>,
  id: string,
): NormalizedScriptLibrary {
  if (!index.library?.[id]) throw new Error(`作者脚本不存在 ${id}`)
  const owner = findScriptOwnerChunk(chunks, id)
  if (!owner) throw new Error(`作者脚本 ${id} 没有脚本体`)
  const nextChunks = cloneJson(chunks) as Record<string, ScriptChunkV1>
  const ownerChunk = nextChunks[owner]
  if (!ownerChunk) throw new Error(`作者脚本 ${id} 的分片 ${owner} 不存在`)
  delete ownerChunk.scripts[id]
  if (Object.keys(ownerChunk.scripts).length === 0) delete nextChunks[owner]
  const nextLibrary = cloneJson(index.library)
  delete nextLibrary[id]
  const nextIndex: ScriptIndexV1 = {
    ...cloneJson(index),
    ...(Object.keys(nextLibrary).length ? { library: nextLibrary } : {}),
  }
  if (!Object.keys(nextLibrary).length) delete nextIndex.library
  return normalizeScriptLibrary(nextIndex, nextChunks)
}

/** 编辑器/迁移器持有全量 chunk 时使用的完整 fail-loud 校验。 */
export function checkScriptLibrary(
  index: ScriptIndexV1,
  chunks: Readonly<Record<string, ScriptChunkV1>>,
  path = 'scripts',
): void {
  checkScriptIndex(index, `${path}/index.json`)
  const owners = new Map<string, string>()
  for (const [chunkId, chunk] of Object.entries(chunks)) {
    if (
      chunk.version !== 1 ||
      chunk.id !== chunkId ||
      typeof chunk.scripts !== 'object' ||
      chunk.scripts === null
    )
      throw new Error(`${path}/${chunkId}: chunk 格式无效`)
    const meta = index.chunks[chunkId]
    if (!meta) throw new Error(`${path}/${chunkId}: chunk 不在 index`)
    const json = JSON.stringify(chunk)
    const actualBytes = utf8ByteLength(json)
    if (meta.bytes !== actualBytes)
      throw new Error(`${path}/${chunkId}: bytes ${meta.bytes} 与实际 ${actualBytes} 不一致`)
    const actualHash = stableScriptHash(json).toString(16).padStart(8, '0')
    if (meta.hash !== undefined && meta.hash !== actualHash)
      throw new Error(`${path}/${chunkId}: hash ${meta.hash} 与实际 ${actualHash} 不一致`)
    for (const [id, body] of Object.entries(chunk.scripts)) {
      if (owners.has(id)) throw new Error(`${path}: 脚本 id 重复 ${id}`)
      owners.set(id, chunkId)
      checkCommands(body, `${path}/${chunkId}.${id}`)
    }
  }
  for (const id of Object.keys(index.chunks)) {
    if (!chunks[id]) throw new Error(`${path}/${id}: index chunk 缺文件`)
  }
  for (const id of Object.keys(index.library ?? {})) {
    const owner = owners.get(id)
    if (!owner) throw new Error(`${path}: 作者脚本 ${id} 没有脚本体`)
    const derived = deriveScriptChunk(id, index.shards)
    if (owner !== derived)
      throw new Error(`${path}: 作者脚本 ${id} 位于 ${owner}，应位于 ${derived ?? '未知'}`)
  }
  for (const chunk of Object.values(chunks)) {
    visitScriptRefs(chunk.scripts, (ref) => {
      const derived = deriveScriptChunk(ref.id, index.shards)
      if (!chunks[ref.chunk]?.scripts[ref.id] && !(derived && chunks[derived]?.scripts[ref.id]))
        throw new Error(`${path}: 孤儿 ref ${ref.chunk}:${ref.id}(derived=${derived ?? 'none'})`)
    })
  }
}
