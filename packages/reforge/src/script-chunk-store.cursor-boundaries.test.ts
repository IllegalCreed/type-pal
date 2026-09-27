/**
 * TEST-CURSOR-PURE-WAVE-1 B04：二次 resolve 命中缓存。
 * 并发 lease / prefetch / 缺失诊断见 script-chunk-store.test.ts。
 */
import {
  checkScriptLibrary,
  deriveScriptChunk,
  normalizeScriptLibrary,
  type ScriptChunkV1,
  type ScriptIndexV1,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { FileSource } from './file-source.js'
import { ScriptChunkStore } from './script-chunk-store.js'

function sourceOf(files: Record<string, ScriptChunkV1>, reads: string[] = []): FileSource {
  return {
    async readJson<T>(rel: string) {
      reads.push(rel)
      const value = files[rel]
      if (!value) throw new Error(`404 ${rel}`)
      return value as T
    },
    async readText() {
      throw new Error('not used')
    },
    async readBytes() {
      throw new Error('not used')
    },
    async urlFor(rel) {
      return rel
    },
  }
}

function siblingId(id: string, shards: ScriptIndexV1['shards']): string {
  const owner = deriveScriptChunk(id, shards)
  for (const candidate of [
    'shared/user/unused-cache-sibling',
    'shared/user/unused-cache-b',
    'shared/user/cache-sib-00',
    'shared/user/a',
  ] as const) {
    const derived = deriveScriptChunk(candidate, shards)
    if (derived && derived !== owner) return candidate
  }
  throw new Error('无法找到派生到另一分片的旁路作者脚本')
}

describe('B04 script-chunk-store 剩余合同', () => {
  test('二次 resolve 命中缓存：reads 仍为 1，body/ref 完整且 unused sibling chunk 未读', async () => {
    const shards = { shared: 2, global: {} }
    const id = 'shared/user/open-door-a1b2c3d4'
    const otherId = siblingId(id, shards)
    const derived = deriveScriptChunk(id, shards)
    const otherDerived = deriveScriptChunk(otherId, shards)
    expect(derived).toBe('shared/c01')
    expect(otherDerived).toBeTruthy()
    expect(otherDerived).not.toBe(derived)

    const draft: ScriptIndexV1 = {
      version: 1,
      shards,
      chunks: {
        [derived!]: { path: `chunks/${derived}.json`, bytes: 0 },
        [otherDerived!]: { path: `chunks/${otherDerived}.json`, bytes: 0 },
      },
      library: {
        [id]: { name: '开门', self: 'none' },
        [otherId]: { name: '旁路', self: 'none' },
      },
    }
    const { index, chunks } = normalizeScriptLibrary(draft, {
      [derived!]: {
        version: 1,
        id: derived!,
        scripts: { [id]: [{ kind: 'wait', ms: 1 }] },
      },
      [otherDerived!]: {
        version: 1,
        id: otherDerived!,
        scripts: { [otherId]: [{ kind: 'wait', ms: 2 }] },
      },
    })
    checkScriptLibrary(index, chunks)

    const files: Record<string, ScriptChunkV1> = {}
    for (const [chunkId, meta] of Object.entries(index.chunks))
      files[`content/scripts/${meta.path}`] = chunks[chunkId]!
    const reads: string[] = []
    const store = new ScriptChunkStore(sourceOf(files, reads), 'content/scripts', index)
    const signal = new AbortController().signal
    const ref = { chunk: derived!, id }
    const first = await store.resolve(ref, signal)
    expect(first.body).toEqual([{ kind: 'wait', ms: 1 }])
    expect(first.ref).toEqual(ref)
    expect(reads).toEqual([`content/scripts/chunks/${derived}.json`])
    first.release()
    const second = await store.resolve(ref, signal)
    expect(reads).toEqual([`content/scripts/chunks/${derived}.json`])
    expect(second.body).toEqual(first.body)
    expect(second.ref).toEqual(ref)
    expect(store.stats.chunks).toBe(1)
    expect(store.stats.bytes).toBe(index.chunks[derived!]!.bytes)
    expect(reads).not.toContain(`content/scripts/chunks/${otherDerived}.json`)
    second.release()
    expect(store.stats.leased).toBe(0)
  })
})
