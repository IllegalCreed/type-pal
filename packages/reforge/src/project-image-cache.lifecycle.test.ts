/**
 * TEST-REFORGE-ASSET-IO-1 B5/B6/B7：ProjectImageCache 生命周期（project-image-cache.ts）。
 * project-image-cache.test.ts:34 已覆盖 pending/decoded 命中期 kind 复验——不重复；
 * 本文件补：不支持 kind 的零读取门、pending 复用（并发一次解码）、失败重试、
 * 完成态 dispose 关闭位图 + 重载、实例隔离。在途 dispose 回填政策按 r2 隔离待证，不测。
 */
import type { AssetCatalogV1, AssetKind } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { AssetResolver } from './asset-resolver.js'
import { ProjectImageCache } from './project-image-cache.js'

interface Bitmap {
  id: string
  closed: boolean
  close(): void
}

const catalog = (): AssetCatalogV1 =>
  ({
    version: 1,
    assets: {
      'portrait.a': {
        kind: 'portrait',
        path: 'assets/generated/pa.png',
        mediaType: 'image/png',
        bytes: 4,
        sha256: 'a'.repeat(64),
        origin: { kind: 'generated' },
        label: 'a',
      },
      'portrait.b': {
        kind: 'portrait',
        path: 'assets/generated/pb.png',
        mediaType: 'image/png',
        bytes: 4,
        sha256: 'b'.repeat(64),
        origin: { kind: 'generated' },
        label: 'b',
      },
    },
  }) as never

interface Harness {
  cache: ProjectImageCache
  bitmaps: Bitmap[]
  reads: string[]
  failOnce: () => void
}

function harness(): Harness {
  const bitmaps: Bitmap[] = []
  const reads: string[] = []
  let fail = false
  const source = {
    reads,
    async readText() {
      return ''
    },
    async readJson<T>() {
      return {} as T
    },
    async readBytes(path: string) {
      reads.push(path)
      if (fail) {
        fail = false
        throw new Error('disk unavailable')
      }
      return new ArrayBuffer(4)
    },
    async urlFor(path: string) {
      reads.push(`url:${path}`)
      return `blob:${path}`
    },
  }
  const _originalCreate = globalThis.createImageBitmap
  globalThis.createImageBitmap = (async (blob: Blob) => {
    const bitmap: Bitmap = {
      id: `bm-${reads.length}-${(blob as { type?: string }).type ?? ''}`,
      closed: false,
      close() {
        bitmap.closed = true
      },
    }
    bitmaps.push(bitmap)
    return bitmap
  }) as unknown as typeof createImageBitmap
  const resolver = new AssetResolver('proj-img', catalog(), {}, source as never)
  const cache = new ProjectImageCache(resolver)
  return {
    cache,
    bitmaps,
    reads,
    failOnce: () => {
      fail = true
    },
    // 测试后恢复全局由各用例 finally 处理
  }
}

const restoreCreate = (): void => {
  globalThis.createImageBitmap = realCreateImageBitmap
}
const realCreateImageBitmap = globalThis.createImageBitmap

describe('B5/B6 ProjectImageCache 生命周期', () => {
  test('不支持 kind 在任何读取前拒绝（resolver.record 零调用 → 零 bytes 读取）', () => {
    const h = harness()
    try {
      expect(() => h.cache.load('portrait.a', 'music' as AssetKind)).toThrow(
        'ProjectImageCache 不支持 kind=music',
      )
      expect(h.reads).toEqual([]) // 零 IO
    } finally {
      restoreCreate()
    }
  })
  test('pending 复用：并发同 asset 只解码一次、同一 bitmap 身份；命中后零新读取', async () => {
    const h = harness()
    try {
      const [first, second] = await Promise.all([
        h.cache.load('portrait.a', 'portrait'),
        h.cache.load('portrait.a', 'portrait'),
      ])
      expect(first).toBe(second) // 同一 bitmap（pending 复用）
      expect(h.bitmaps).toHaveLength(1) // 只解码一次
      expect(h.reads).toEqual(['assets/generated/pa.png']) // 只读一次
      const third = await h.cache.load('portrait.a', 'portrait')
      expect(third).toBe(first)
      expect(h.reads).toHaveLength(1) // decoded 命中零新读
    } finally {
      restoreCreate()
    }
  })
  test('读取失败不缓存失败：同 reader 修复后重试成功（真实重读见证）', async () => {
    const h = harness()
    try {
      h.failOnce()
      await expect(h.cache.load('portrait.a', 'portrait')).rejects.toThrow('disk unavailable')
      expect(h.reads).toEqual(['assets/generated/pa.png'])
      await expect(h.cache.load('portrait.a', 'portrait')).resolves.toBeDefined()
      expect(h.reads).toEqual(['assets/generated/pa.png', 'assets/generated/pa.png'])
    } finally {
      restoreCreate()
    }
  })
  test('完成态 dispose 关闭全部位图；dispose 后重载产生新 bitmap', async () => {
    const h = harness()
    try {
      const a = (await h.cache.load('portrait.a', 'portrait')) as unknown as Bitmap
      const b = (await h.cache.load('portrait.b', 'portrait')) as unknown as Bitmap
      h.cache.dispose()
      expect(a.closed).toBe(true)
      expect(b.closed).toBe(true)
      // dispose 后重载（在途回填政策不在此固化——此处是完成态之后的新调用）
      const reloaded = (await h.cache.load('portrait.a', 'portrait')) as unknown as Bitmap
      expect(reloaded.closed).toBe(false)
      expect(reloaded).not.toBe(a)
      expect(h.reads).toEqual([
        'assets/generated/pa.png',
        'assets/generated/pb.png',
        'assets/generated/pa.png',
      ])
    } finally {
      restoreCreate()
    }
  })
  test('实例隔离：同 catalog 两个 cache 实例互不预热（各自解码）', async () => {
    const h1 = harness()
    const one = (await h1.cache.load('portrait.a', 'portrait')) as unknown as Bitmap
    const h2 = harness() // 第二实例在第一实例完成加载后创建（全局替身按最后创建者生效）
    try {
      const two = (await h2.cache.load('portrait.a', 'portrait')) as unknown as Bitmap
      expect(one).not.toBe(two)
      expect(h1.bitmaps).toHaveLength(1)
      expect(h2.bitmaps).toHaveLength(1)
      h1.cache.dispose()
      expect(two.closed).toBe(false) // 实例 1 的 dispose 不影响实例 2
    } finally {
      restoreCreate()
      restoreCreate()
    }
  })
  test('kind 门在 decoded 命中时仍拦截（复用语义校验路径与首载一致）', async () => {
    const h = harness()
    try {
      await h.cache.load('portrait.a', 'portrait')
      expect(() => h.cache.load('portrait.a', 'music' as AssetKind)).toThrow(
        'ProjectImageCache 不支持 kind=music',
      )
    } finally {
      restoreCreate()
    }
  })
})
void vi
