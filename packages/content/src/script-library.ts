import type { Command } from './script.js'

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
}

export function isScriptRef(value: unknown): value is ScriptRef {
  if (typeof value !== 'object' || value === null) return false
  const ref = value as Partial<ScriptRef>
  return typeof ref.chunk === 'string' && ref.chunk.length > 0 && typeof ref.id === 'string' && ref.id.length > 0
}

export function checkScriptRef(value: unknown, path: string): asserts value is ScriptRef {
  if (!isScriptRef(value)) throw new Error(`${path}: 期望 {chunk,id} ScriptRef`)
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
  if (parts[0] === 'shared' && parts.length >= 2) return shardName('shared', sharedShardKey(id), shards.shared)
  if (parts[0] === 'global' && parts.length >= 3) {
    const domain = parts[1]
    if (!domain) return undefined
    const count = shards.global[domain]
    return count === undefined ? undefined : shardName(`global/${domain}`, id, count)
  }
  return undefined
}

export function checkScriptIndex(value: unknown, path = 'scripts/index.json'): asserts value is ScriptIndexV1 {
  if (typeof value !== 'object' || value === null) throw new Error(`${path}: 期望对象`)
  const index = value as Partial<ScriptIndexV1>
  if (index.version !== 1) throw new Error(`${path}.version: 期望 1`)
  if (typeof index.shards !== 'object' || index.shards === null) throw new Error(`${path}.shards: 期望对象`)
  if (!Number.isInteger(index.shards.shared) || index.shards.shared <= 0)
    throw new Error(`${path}.shards.shared: 期望正整数`)
  if (typeof index.shards.global !== 'object' || index.shards.global === null)
    throw new Error(`${path}.shards.global: 期望对象`)
  for (const [domain, count] of Object.entries(index.shards.global)) {
    if (!domain || !Number.isInteger(count) || count <= 0)
      throw new Error(`${path}.shards.global.${domain}: 期望正整数`)
  }
  if (typeof index.chunks !== 'object' || index.chunks === null) throw new Error(`${path}.chunks: 期望对象`)
  for (const [id, raw] of Object.entries(index.chunks)) {
    if (typeof raw !== 'object' || raw === null) throw new Error(`${path}.chunks.${id}: 期望对象`)
    const meta = raw as Partial<ScriptChunkMetaV1>
    if (typeof meta.path !== 'string' || meta.path.length === 0)
      throw new Error(`${path}.chunks.${id}.path: 期望非空字符串`)
    if (typeof meta.bytes !== 'number' || !Number.isInteger(meta.bytes) || meta.bytes < 0)
      throw new Error(`${path}.chunks.${id}.bytes: 期望非负整数`)
  }
}
