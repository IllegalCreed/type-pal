/**
 * TEST-GLM-REFORGE-ASSET-RESOLVER-1：AssetResolver 失败原因边界（asset-resolver.ts）。
 * 旧测（asset-resolver.test.ts / asset-resolver.io-boundaries.test.ts D4-D6）的失败注入全部是
 * Error 实例；非 Error 原因的 String 包装（asset-resolver.ts:96）与 source 未提供可选
 * dispose 时的 no-op（:84）未证。本文件只补这两轴，成功/恢复不与 D4-D5 重复包装。
 */
import type { AssetCatalogV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { AssetResolver } from './asset-resolver.js'
import type { FileSource } from './file-source.js'

const catalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    'music.theme': {
      kind: 'music',
      path: 'assets/authored/theme.mid',
      mediaType: 'audio/midi',
      bytes: 6,
      sha256: 'a'.repeat(64),
      origin: { kind: 'authored' },
    },
  },
}

interface CauseHarness {
  resolver: AssetResolver
  reads: string[]
  throwRaw: (raw: unknown | undefined) => void
}

/** 单点可修复故障：throwRaw(undefined) 恢复同一 source 实例。 */
function harness(): CauseHarness {
  const reads: string[] = []
  let raw: unknown | undefined
  let armed = false
  const source: FileSource = {
    async readText() {
      return ''
    },
    async readJson<T>() {
      return {} as T
    },
    async readBytes(path) {
      reads.push(path)
      if (armed) throw raw
      return new TextEncoder().encode(path).buffer
    },
    async urlFor(path) {
      return `blob:${path}`
    },
  }
  const resolver = new AssetResolver('cause-proj', catalog, {}, source)
  return {
    resolver,
    reads,
    throwRaw: (value) => {
      raw = value
      armed = value !== undefined
    },
  }
}

describe('AssetResolver 失败原因边界', () => {
  test('非 Error 原因（裸字符串）仍包装出工程/asset/kind/path 上下文；同实例修复后恢复', async () => {
    const { resolver, reads, throwRaw } = harness()
    throwRaw('disk-fault:raw')
    const error = (await resolver
      .readBytes('music.theme', 'music')
      .catch((e: unknown) => e)) as Error
    expect(error).toBeInstanceOf(Error)
    // asset-resolver.ts:96 String(error) 分支：裸字符串原因原样进入包装消息
    expect(error.message).toContain('cause-proj')
    expect(error.message).toContain('music.theme')
    expect(error.message).toContain('kind=music')
    expect(error.message).toContain('assets/authored/theme.mid')
    expect(error.message).toContain('disk-fault:raw')
    // 同一 resolver/source 实例修复后同 asset 成功（非换新对象）
    throwRaw(undefined)
    const bytes = await resolver.readBytes('music.theme', 'music')
    expect(bytes.byteLength).toBeGreaterThan(0)
    expect(reads).toEqual(['assets/authored/theme.mid', 'assets/authored/theme.mid'])
  })

  test('source 未提供可选 dispose 时 resolver.dispose() 不抛、不阻断后续读取', async () => {
    // httpSource 形态：FileSource.dispose 可选，真实 HTTP source 就没有该键
    const { resolver, throwRaw } = harness()
    expect(() => resolver.dispose()).not.toThrow()
    throwRaw(undefined)
    await expect(resolver.readBytes('music.theme', 'music')).resolves.toBeInstanceOf(ArrayBuffer)
  })
})
