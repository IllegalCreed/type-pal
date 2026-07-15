import type { Command, ScriptChunkV1, ScriptIndexV1, ScriptRef } from '@type-pal/content'
import { checkCommands, deriveScriptChunk, upgradeLegacyDialogues } from '@type-pal/content'
import type { FileSource } from './file-source.js'

export interface ResolvedScript {
  body: readonly Command[]
  ref: ScriptRef
  release(): void
}

export interface ScriptResolver {
  resolve(ref: ScriptRef, signal: AbortSignal): Promise<ResolvedScript>
}

/** 编辑器预览用：和 IO store 相同的 N2 重推导/错误语义，但脚本体已在工作副本内。 */
export class MemoryScriptResolver implements ScriptResolver {
  constructor(
    readonly index: ScriptIndexV1,
    readonly chunks: Readonly<Record<string, ScriptChunkV1>>,
  ) {}

  async resolve(ref: ScriptRef, signal: AbortSignal): Promise<ResolvedScript> {
    if (signal.aborted) throw new DOMException('script resolve aborted', 'AbortError')
    const derived = deriveScriptChunk(ref.id, this.index.shards)
    const candidates = [...new Set([ref.chunk, derived].filter((id): id is string => !!id))]
    let foundChunk = false
    for (const chunkId of candidates) {
      const chunk = this.chunks[chunkId]
      if (!chunk) continue
      foundChunk = true
      const body = chunk.scripts[ref.id]
      if (body) return { body, ref: { chunk: chunkId, id: ref.id }, release() {} }
    }
    if (!foundChunk)
      throw new Error(
        `MemoryScriptResolver: chunk 不存在(ref=${ref.chunk}, derived=${derived ?? 'none'})`,
      )
    throw new Error(`MemoryScriptResolver: script id 不存在 "${ref.id}"`)
  }
}

interface CacheEntry {
  chunk: ScriptChunkV1
  bytes: number
  leases: number
  usedAt: number
}

function joinPath(base: string, path: string): string {
  if (path.startsWith('/')) return path
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

/** 只缓存脚本 chunk；它不依赖 SceneDef、地图或素材 loader。 */
export class ScriptChunkStore implements ScriptResolver {
  private readonly cache = new Map<string, CacheEntry>()
  private clock = 0
  private residentBytes = 0

  constructor(
    private readonly source: FileSource,
    private readonly baseDir: string,
    readonly index: ScriptIndexV1,
    readonly maxResidentBytes = 8 * 1024 * 1024,
  ) {}

  get stats(): { chunks: number; bytes: number; leased: number } {
    let leased = 0
    for (const entry of this.cache.values()) leased += entry.leases
    return { chunks: this.cache.size, bytes: this.residentBytes, leased }
  }

  private async load(chunkId: string, signal: AbortSignal): Promise<CacheEntry> {
    const hit = this.cache.get(chunkId)
    if (hit) {
      hit.usedAt = ++this.clock
      return hit
    }
    const meta = this.index.chunks[chunkId]
    if (!meta) throw new Error(`ScriptChunkStore: chunk 不存在 "${chunkId}"`)
    const raw = await this.source.readJson<unknown>(joinPath(this.baseDir, meta.path), signal)
    const json = upgradeLegacyDialogues(raw).value as ScriptChunkV1
    if (signal.aborted) throw new DOMException('script chunk load aborted', 'AbortError')
    if (
      json.version !== 1 ||
      json.id !== chunkId ||
      typeof json.scripts !== 'object' ||
      json.scripts === null
    )
      throw new Error(`ScriptChunkStore: chunk "${chunkId}" 形状或 id 不符`)
    for (const [id, body] of Object.entries(json.scripts))
      checkCommands(body, `scripts/${chunkId}/${id}`)
    // 多个 auto runner 首拍可能并发读同一 chunk；后完成者复用先完成者，避免 residentBytes 重复记账。
    const raced = this.cache.get(chunkId)
    if (raced) {
      raced.usedAt = ++this.clock
      return raced
    }
    const entry: CacheEntry = {
      chunk: json,
      bytes: Math.max(meta.bytes, new TextEncoder().encode(JSON.stringify(json)).byteLength),
      leases: 0,
      usedAt: ++this.clock,
    }
    this.cache.set(chunkId, entry)
    this.residentBytes += entry.bytes
    return entry
  }

  async resolve(ref: ScriptRef, signal: AbortSignal): Promise<ResolvedScript> {
    const derived = deriveScriptChunk(ref.id, this.index.shards)
    const candidates = [...new Set([ref.chunk, derived].filter((id): id is string => !!id))]
    let foundChunk = false
    for (const chunkId of candidates) {
      if (!this.index.chunks[chunkId]) continue
      foundChunk = true
      const entry = await this.load(chunkId, signal)
      const body = entry.chunk.scripts[ref.id]
      if (!body) continue
      entry.leases++
      entry.usedAt = ++this.clock
      this.evict()
      let released = false
      return {
        body,
        ref: { chunk: chunkId, id: ref.id },
        release: () => {
          if (released) return
          released = true
          entry.leases--
          entry.usedAt = ++this.clock
          this.evict()
        },
      }
    }
    if (!foundChunk)
      throw new Error(
        `ScriptChunkStore: chunk 不存在(ref=${ref.chunk}, id=${ref.id}, derived=${derived ?? 'none'})`,
      )
    throw new Error(
      `ScriptChunkStore: script id 不存在 "${ref.id}"(hint=${ref.chunk}, derived=${derived ?? 'none'})`,
    )
  }

  async prefetch(chunkId: string, signal: AbortSignal, seen = new Set<string>()): Promise<void> {
    if (seen.has(chunkId)) return
    seen.add(chunkId)
    const entry = await this.load(chunkId, signal)
    for (const dep of entry.chunk.imports ?? []) await this.prefetch(dep, signal, seen)
    this.evict()
  }

  private evict(): void {
    while (this.residentBytes > this.maxResidentBytes) {
      let victimId: string | undefined
      let victim: CacheEntry | undefined
      for (const [id, entry] of this.cache) {
        if (entry.leases > 0 || (victim && entry.usedAt >= victim.usedAt)) continue
        victimId = id
        victim = entry
      }
      if (!victimId || !victim) return
      this.cache.delete(victimId)
      this.residentBytes -= victim.bytes
    }
  }
}
