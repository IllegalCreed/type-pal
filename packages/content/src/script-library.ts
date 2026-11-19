import { validateProjectRelativePath } from './asset.js'
import { type Command, checkCommands } from './script.js'

export const AUTHORED_SCRIPT_PREFIX = 'shared/user/'

export type SharedScriptSelf = 'none' | 'optional' | 'required'

/** 内存分片索引的目录信息；当前作者库的元数据由 canonical 脚本持有。 */
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

/** 内存脚本引用使用的稳定分桶配置。 */
export interface ScriptShardConfigV1 {
  shared: number
  global: Record<string, number>
}

/** 内存脚本分片的轻量索引，脚本正文由对应分片持有。 */
export interface ScriptIndexV1 {
  version: 1
  shards: ScriptShardConfigV1
  chunks: Record<string, ScriptChunkMetaV1>
  /** 仅登记作者创建的一等共享脚本；未登记的 id 属于迁移/内部脚本。 */
  library?: Record<string, SharedScriptMetaV1>
}

function isDictionary(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

/** 固定 FNV-1a 32 位散列，用于内存分片的身份分桶及索引校验。 */
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
 * 只恢复当前内存索引内的引用。
 */
export function deriveScriptChunk(id: string, shards: ScriptShardConfigV1): string | undefined {
  const parts = id.split('/')
  if (parts[0] === 'scene' && parts.length >= 3) return `scene/${parts[1]}`
  if (parts[0] === 'shared' && parts.length >= 2)
    return shardName('shared', sharedShardKey(id), shards.shared)
  if (parts[0] === 'global' && parts.length >= 3) {
    const domain = parts[1]
    if (!domain || !Object.hasOwn(shards.global, domain)) return undefined
    const count = shards.global[domain]
    return count === undefined ? undefined : shardName(`global/${domain}`, id, count)
  }
  return undefined
}

function checkSharedScriptMeta(value: unknown, path: string): asserts value is SharedScriptMetaV1 {
  if (!isDictionary(value)) throw new Error(`${path}: 期望对象`)
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
  if (!isDictionary(value)) throw new Error(`${path}: 期望对象`)
  const index = value as Partial<ScriptIndexV1>
  if (index.version !== 1) throw new Error(`${path}.version: 期望 1`)
  if (!isDictionary(index.shards)) throw new Error(`${path}.shards: 期望对象`)
  if (!Number.isInteger(index.shards.shared) || index.shards.shared <= 0)
    throw new Error(`${path}.shards.shared: 期望正整数`)
  if (!isDictionary(index.shards.global)) throw new Error(`${path}.shards.global: 期望对象`)
  for (const [domain, count] of Object.entries(index.shards.global)) {
    if (!domain || !Number.isInteger(count) || count <= 0)
      throw new Error(`${path}.shards.global.${domain}: 期望正整数`)
  }
  if (!isDictionary(index.chunks)) throw new Error(`${path}.chunks: 期望对象`)
  const chunkPaths = new Map<string, string>()
  for (const [id, raw] of Object.entries(index.chunks)) {
    if (!isDictionary(raw)) throw new Error(`${path}.chunks.${id}: 期望对象`)
    const meta = raw as Partial<ScriptChunkMetaV1>
    if (typeof meta.path !== 'string' || meta.path.length === 0)
      throw new Error(`${path}.chunks.${id}.path: 期望非空字符串`)
    validateProjectRelativePath(meta.path, `${path}.chunks.${id}.path`)
    const previousOwner = chunkPaths.get(meta.path)
    if (previousOwner)
      throw new Error(`${path}.chunks.${id}.path: 与 chunk ${previousOwner} 重复使用 ${meta.path}`)
    chunkPaths.set(meta.path, id)
    if (typeof meta.bytes !== 'number' || !Number.isInteger(meta.bytes) || meta.bytes < 0)
      throw new Error(`${path}.chunks.${id}.bytes: 期望非负整数`)
  }
  if (index.library !== undefined) {
    if (!isDictionary(index.library)) throw new Error(`${path}.library: 期望对象`)
    for (const [id, raw] of Object.entries(index.library)) {
      if (!id.startsWith(AUTHORED_SCRIPT_PREFIX) || id.length <= AUTHORED_SCRIPT_PREFIX.length)
        throw new Error(
          `${path}.library.${id}: 作者脚本 id 必须位于 ${AUTHORED_SCRIPT_PREFIX} 命名空间`,
        )
      checkSharedScriptMeta(raw, `${path}.library.${id}`)
    }
  }
}

/** 从已知的内存分片定位 id，重复归属必须显式失败。 */
export function findScriptOwnerChunk(
  chunks: Readonly<Record<string, ScriptChunkV1>>,
  id: string,
): string | undefined {
  let owner: string | undefined
  for (const [chunkId, chunk] of Object.entries(chunks)) {
    if (!Object.hasOwn(chunk.scripts, id)) continue
    if (owner) throw new Error(`脚本 id 重复 ${id}(${owner},${chunkId})`)
    owner = chunkId
  }
  return owner
}

function scriptInChunk(
  chunks: Readonly<Record<string, ScriptChunkV1>>,
  chunkId: string,
  id: string,
): Command[] | undefined {
  const chunk = Object.hasOwn(chunks, chunkId) ? chunks[chunkId] : undefined
  return chunk && Object.hasOwn(chunk.scripts, id) ? chunk.scripts[id] : undefined
}

export function getScriptBody(
  index: ScriptIndexV1,
  chunks: Readonly<Record<string, ScriptChunkV1>>,
  id: string,
): Command[] | undefined {
  const derived = deriveScriptChunk(id, index.shards)
  const direct = derived ? scriptInChunk(chunks, derived, id) : undefined
  if (direct) return direct
  const owner = findScriptOwnerChunk(chunks, id)
  return owner ? scriptInChunk(chunks, owner, id) : undefined
}

/** 验证编辑器持有的内存索引和分片是否构成闭包。 */
export function checkScriptLibrary(
  index: ScriptIndexV1,
  chunks: Readonly<Record<string, ScriptChunkV1>>,
  path = 'scripts',
): void {
  checkScriptIndex(index, `${path}/index.json`)
  const owners = new Map<string, string>()
  for (const [chunkId, chunk] of Object.entries(chunks)) {
    if (chunk.version !== 1 || chunk.id !== chunkId || !isDictionary(chunk.scripts))
      throw new Error(`${path}/${chunkId}: chunk 格式无效`)
    const meta = Object.hasOwn(index.chunks, chunkId) ? index.chunks[chunkId] : undefined
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
    if (!Object.hasOwn(chunks, id)) throw new Error(`${path}/${id}: index chunk 缺文件`)
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
      if (
        !scriptInChunk(chunks, ref.chunk, ref.id) &&
        !(derived && scriptInChunk(chunks, derived, ref.id))
      )
        throw new Error(`${path}: 孤儿 ref ${ref.chunk}:${ref.id}(derived=${derived ?? 'none'})`)
    })
  }
}
