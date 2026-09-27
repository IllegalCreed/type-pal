/**
 * TEST-CURSOR-PURE-WAVE-1 B04：二次 resolve 命中缓存。
 * 并发 lease / prefetch / 缺失诊断见 script-chunk-store.test.ts。
 */
import type { ScriptChunkV1, ScriptIndexV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { FileSource } from './file-source.js'
import { ScriptChunkStore } from './script-chunk-store.js'

function sourceOf(chunks: Record<string, ScriptChunkV1>, reads: string[] = []): FileSource {
  return {
    async readJson<T>(rel: string) {
      reads.push(rel)
      const value = chunks[rel]
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

describe('B04 script-chunk-store 剩余合同', () => {
  test('二次 resolve 命中缓存：reads 仍为 1，body/ref 完整且 unused sibling chunk 未读', async () => {
    const id = 'shared/user/open-door-a1b2c3d4'
    const index: ScriptIndexV1 = {
      version: 1,
      shards: { shared: 2, global: {} },
      chunks: {
        'shared/c00': { path: 'chunks/shared/c00.json', bytes: 80 },
        'shared/c01': { path: 'chunks/shared/c01.json', bytes: 80 },
      },
      library: { [id]: { name: '开门', self: 'none' } },
    }
    const reads: string[] = []
    const store = new ScriptChunkStore(
      sourceOf(
        {
          'content/scripts/chunks/shared/c00.json': {
            version: 1,
            id: 'shared/c00',
            scripts: { [id]: [{ kind: 'playSound', asset: 'sound.pal.002' }] },
          },
          'content/scripts/chunks/shared/c01.json': {
            version: 1,
            id: 'shared/c01',
            scripts: { 'shared/unused': [{ kind: 'playSound', asset: 'sound.pal.099' }] },
          },
        },
        reads,
      ),
      'content/scripts',
      index,
    )
    const signal = new AbortController().signal
    const first = await store.resolve({ chunk: 'shared/c00', id }, signal)
    expect(first.body).toEqual([{ kind: 'playSound', asset: 'sound.pal.002' }])
    expect(first.ref).toEqual({ chunk: 'shared/c00', id })
    expect(reads).toEqual(['content/scripts/chunks/shared/c00.json'])
    first.release()
    const second = await store.resolve({ chunk: 'shared/c00', id }, signal)
    expect(reads).toEqual(['content/scripts/chunks/shared/c00.json'])
    expect(second.body).toEqual(first.body)
    expect(second.ref).toEqual({ chunk: 'shared/c00', id })
    expect(store.stats.chunks).toBe(1)
    expect(reads).not.toContain('content/scripts/chunks/shared/c01.json')
    second.release()
  })
})
