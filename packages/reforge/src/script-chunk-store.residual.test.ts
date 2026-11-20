import type { ScriptChunkV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { sceneScriptPair } from './__tests__/script-chunk-fixture.js'
import type { FileSource } from './file-source.js'
import { ScriptChunkStore } from './script-chunk-store.js'

function fixture() {
  const { index, chunks, firstId, secondId } = sceneScriptPair()
  const files = Object.fromEntries(
    Object.entries(chunks).map(([id, chunk]) => [`content/scripts/chunks/${id}.json`, chunk]),
  )
  return { index, chunks, files, firstId, secondId }
}

function sourceOf(readJson: FileSource['readJson']): FileSource {
  return {
    readJson,
    async readText() {
      throw new Error('unexpected text read')
    },
    async readBytes() {
      throw new Error('unexpected byte read')
    },
    async urlFor(rel) {
      return rel
    },
  }
}

describe('当前脚本分片读取的租约与故障边界', () => {
  test('合法双场景分片超预算时保护在用租约；释放后淘汰旧片，再访问须真实重读', async () => {
    const { index, files, firstId, secondId } = fixture()
    const reads: string[] = []
    const source = sourceOf(async <T>(path: string): Promise<T> => {
      reads.push(path)
      const result = files[path]
      if (!result) throw new Error(`404 ${path}`)
      return result as T
    })
    const signal = new AbortController().signal
    const budget = Math.max(...Object.values(index.chunks).map((meta) => meta.bytes))
    const store = new ScriptChunkStore(source, 'content/scripts', index, budget)
    const first = await store.resolve({ chunk: 'scene/s001', id: firstId }, signal)
    const second = await store.resolve({ chunk: 'scene/s002', id: secondId }, signal)
    expect([first.body, second.body]).toEqual([
      [{ kind: 'wait', ms: 1 }],
      [{ kind: 'wait', ms: 2 }],
    ])
    expect(store.stats).toMatchObject({ chunks: 2, leased: 2 })
    first.release()
    expect(store.stats).toEqual({ chunks: 1, bytes: index.chunks['scene/s002']!.bytes, leased: 1 })
    first.release()
    expect(store.stats.leased).toBe(1)
    second.release()
    const again = await store.resolve({ chunk: 'scene/s001', id: firstId }, signal)
    expect(reads).toEqual([
      'content/scripts/chunks/scene/s001.json',
      'content/scripts/chunks/scene/s002.json',
      'content/scripts/chunks/scene/s001.json',
    ])
    expect(again.body).toEqual(first.body)
    again.release()
  })

  test('底层读取忽略 abort 并迟到交付时，分片仍在缓存入口前拒绝且零租约', async () => {
    const { index, chunks, firstId } = fixture()
    let release!: (chunk: ScriptChunkV1) => void
    const reads: string[] = []
    const readJson = <T>(path: string): Promise<T> => {
      reads.push(path)
      return new Promise<T>((resolve) => {
        release = (chunk) => resolve(chunk as T)
      })
    }
    const store = new ScriptChunkStore(sourceOf(readJson), 'content/scripts', index)
    const controller = new AbortController()
    const pending = store.resolve({ chunk: 'scene/s001', id: firstId }, controller.signal)
    expect(reads).toEqual(['content/scripts/chunks/scene/s001.json'])
    controller.abort()
    release(chunks['scene/s001']!)
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(store.stats).toEqual({ chunks: 0, bytes: 0, leased: 0 })
  })
})
