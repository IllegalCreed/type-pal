/**
 * TEST-REFORGE-ASSET-IO-1 B8：HTTP 透传合同（file-source.ts）。
 * file-source.test.ts 已覆盖 404/非200/AbortSignal 透传取消/no-store/urlFor 拼接——不重复；
 * 本文件补：同一 signal 实例原样到达 fetch（identity 见证）、urlFor 零 fetch、
 * Response 原样消费（text/json/bytes 不再包装）、错型 JSON 透传原生解析错误。
 */
import { describe, expect, test, vi } from 'vitest'
import { httpSource } from './file-source.js'

const okResponse = (body: string, init?: ResponseInit): Response =>
  new Response(body, { status: 200, ...init })

describe('B8 HTTP 透传合同（真 fetch 替身；无 FSA 式逐 await 门）', () => {
  test('同一 AbortSignal 实例原样到达 fetch（identity 不复制不重建）', async () => {
    const controller = new AbortController()
    const seen: unknown[] = []
    const fetchDouble = vi.fn(async (_url: unknown, init?: RequestInit) => {
      seen.push(init?.signal)
      return okResponse('"ok"')
    })
    vi.stubGlobal('fetch', fetchDouble)
    try {
      const source = httpSource('projects/x')
      await source.readJson('content/a.json', controller.signal)
      expect(fetchDouble).toHaveBeenCalledOnce()
      expect(seen[0]).toBe(controller.signal) // 同一实例
      // 无 signal 调用不造空 signal
      await source.readText('content/b.json')
      expect(seen[1]).toBeUndefined()
    } finally {
      vi.unstubAllGlobals()
    }
  })
  test('urlFor 零 fetch：纯拼接不产生网络 IO；读取轨迹见证', async () => {
    const fetchDouble = vi.fn(async () => okResponse('x'))
    vi.stubGlobal('fetch', fetchDouble)
    try {
      const source = httpSource('projects/y')
      await expect(source.urlFor('assets/z.png')).resolves.toBe('projects/y/assets/z.png')
      expect(fetchDouble).not.toHaveBeenCalled()
      await expect(source.urlFor('a/b.json')).resolves.toBe('projects/y/a/b.json')
      expect(fetchDouble).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
  test('Response 原样消费：text 逐字节、json 解析值、arrayBuffer 字节数；坏 JSON 透传原生错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => okResponse('{"n": 7, "s": "中文"}', {})),
    )
    try {
      const source = httpSource('projects/z')
      await expect(source.readJson<{ n: number; s: string }>('a.json')).resolves.toEqual({
        n: 7,
        s: '中文',
      })
    } finally {
      vi.unstubAllGlobals()
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => okResponse('{"truncated":')),
    )
    try {
      const source = httpSource('projects/z')
      // 原生 JSON 解析错误透传（无二次包装合同）
      await expect(source.readJson('bad.json')).rejects.toThrow()
    } finally {
      vi.unstubAllGlobals()
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => okResponse('abc')),
    )
    try {
      const source = httpSource('projects/z')
      await expect(source.readText('t.txt')).resolves.toBe('abc')
      const bytes = await source.readBytes('b.bin')
      expect(bytes.byteLength).toBe(3)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
