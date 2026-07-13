import type { ScriptChunkV1, ScriptIndexV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { FileSource } from './file-source.js'
import { ScriptChunkStore } from './script-chunk-store.js'

const index: ScriptIndexV1 = {
  version: 1,
  shards: { shared: 2, global: {} },
  chunks: {
    'scene/s001': { path: 'chunks/scene/s001.json', bytes: 100 },
    'shared/c00': { path: 'chunks/shared/c00.json', bytes: 100 },
    'shared/c01': { path: 'chunks/shared/c01.json', bytes: 100 },
  },
}

function sourceOf(chunks: Record<string, ScriptChunkV1>, reads: string[] = []): FileSource {
  return {
    async readJson<T>(rel: string) {
      reads.push(rel)
      const value = chunks[rel]
      if (!value) throw new Error(`404 ${rel}`)
      return value as T
    },
    async readText() { throw new Error('not used') },
    async readBytes() { throw new Error('not used') },
    async urlFor(rel) { return rel },
  }
}

describe('ScriptChunkStore', () => {
  test('ref.chunk 只是提示：错误提示下按稳定 id 重推导并命中', async () => {
    const id = 'scene/s001/on-enter/0'
    const reads: string[] = []
    const store = new ScriptChunkStore(sourceOf({
      'content/scripts/chunks/scene/s001.json': {
        version: 1,
        id: 'scene/s001',
        scripts: { [id]: [{ kind: 'playSound', soundId: 1 }] },
      },
      'content/scripts/chunks/shared/c00.json': { version: 1, id: 'shared/c00', scripts: {} },
    }, reads), 'content/scripts', index)
    const lease = await store.resolve({ chunk: 'shared/c00', id }, new AbortController().signal)
    expect(lease.ref.chunk).toBe('scene/s001')
    expect(lease.body).toEqual([{ kind: 'playSound', soundId: 1 }])
    expect(reads).toEqual([
      'content/scripts/chunks/shared/c00.json',
      'content/scripts/chunks/scene/s001.json',
    ])
    lease.release()
  })

  test('chunk 缺失与 script id 缺失分别给出显式诊断', async () => {
    const store = new ScriptChunkStore(sourceOf({
      'content/scripts/chunks/scene/s001.json': { version: 1, id: 'scene/s001', scripts: {} },
    }), 'content/scripts', index)
    await expect(store.resolve(
      { chunk: 'missing', id: 'unknown/id' },
      new AbortController().signal,
    )).rejects.toThrow(/chunk 不存在/)
    await expect(store.resolve(
      { chunk: 'scene/s001', id: 'scene/s001/missing' },
      new AbortController().signal,
    )).rejects.toThrow(/script id 不存在/)
  })

  test('abort 会取消未完成读取，且不会回填缓存', async () => {
    let started = false
    const source: FileSource = {
      async readJson<T>(_rel: string, signal?: AbortSignal): Promise<T> {
        started = true
        return new Promise<T>((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
        })
      },
      async readText() { throw new Error('not used') },
      async readBytes() { throw new Error('not used') },
      async urlFor(rel) { return rel },
    }
    const store = new ScriptChunkStore(source, 'content/scripts', index)
    const ac = new AbortController()
    const loading = store.resolve(
      { chunk: 'scene/s001', id: 'scene/s001/on-enter/0' },
      ac.signal,
    )
    await Promise.resolve()
    expect(started).toBe(true)
    ac.abort()
    await expect(loading).rejects.toMatchObject({ name: 'AbortError' })
    expect(store.stats).toEqual({ chunks: 0, bytes: 0, leased: 0 })
  })

  test('同一 chunk 并发加载只登记一次缓存字节，lease 分别释放', async () => {
    const id = 'scene/s001/on-enter/0'
    let reads = 0
    const chunk: ScriptChunkV1 = {
      version: 1,
      id: 'scene/s001',
      scripts: { [id]: [{ kind: 'playSound', soundId: 1 }] },
    }
    const expectedBytes = Math.max(100, new TextEncoder().encode(JSON.stringify(chunk)).byteLength)
    const source: FileSource = {
      async readJson<T>(): Promise<T> {
        reads++
        await Promise.resolve()
        return chunk as T
      },
      async readText() { throw new Error('not used') },
      async readBytes() { throw new Error('not used') },
      async urlFor(rel) { return rel },
    }
    const store = new ScriptChunkStore(source, 'content/scripts', index)
    const signal = new AbortController().signal
    const [first, second] = await Promise.all([
      store.resolve({ chunk: 'scene/s001', id }, signal),
      store.resolve({ chunk: 'scene/s001', id }, signal),
    ])

    expect(reads).toBe(2)
    expect(store.stats).toEqual({ chunks: 1, bytes: expectedBytes, leased: 2 })
    first.release()
    second.release()
    expect(store.stats).toEqual({ chunks: 1, bytes: expectedBytes, leased: 0 })
  })
})
