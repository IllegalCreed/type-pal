/**
 * TEST-RESOURCE-TOOLS-COVERAGE-1 R09：asset-manifest 真实 FS 树（resources/asset-manifest.ts）。
 * 既有 asset-manifest.test 已覆盖纯函数聚合/自身剔除/DS_Store（内存 entries）——不重复。
 * 本文件：mkdtemp 真实多层树（零字节/中文/二进制）精确清单、根 self 与子目录同名区分、
 * 原始 entries 不变、独立 path:size 序列 sha256。
 */
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { type AssetEntry, buildManifest, collectAssetEntries } from '../resources/asset-manifest.js'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('R09 collectAssetEntries + buildManifest 真实树', () => {
  test('多层/零字节/中文/二进制精确清单；子目录同名 asset-manifest.json 保留；entries 不变；独立序列 hash', () => {
    const root = mkdtempSync(join(tmpdir(), 'tb05-manifest-'))
    roots.push(root)
    mkdirSync(join(root, 'a', 'b'), { recursive: true })
    writeFileSync(join(root, 'a', 'b', '中文图.bin'), new Uint8Array([0, 1, 2, 255]))
    writeFileSync(join(root, 'a', 'zero.dat'), new Uint8Array(0))
    writeFileSync(join(root, 'a', 'b', 'asset-manifest.json'), '{}') // 子目录同名：保留
    writeFileSync(join(root, 'asset-manifest.json'), '{}') // 根 self：剔除
    writeFileSync(join(root, 'a', '.DS_Store'), new Uint8Array(4)) // 嵌套 DS_Store：剔除

    const entries = collectAssetEntries(root)
    expect([...entries].sort((x, y) => (x.path < y.path ? -1 : 1))).toEqual([
      { path: 'a/.DS_Store', size: 4 },
      { path: 'a/b/asset-manifest.json', size: 2 },
      { path: 'a/b/中文图.bin', size: 4 },
      { path: 'a/zero.dat', size: 0 },
      { path: 'asset-manifest.json', size: 2 }, // collect 不过滤；剔除只发生在 buildManifest
    ])

    const snapshot: AssetEntry[] = structuredClone(entries)
    const manifest = buildManifest(entries)
    expect(entries).toEqual(snapshot) // collect 结果不被 build 改写
    expect(manifest.files).toEqual([
      { path: 'a/b/asset-manifest.json', size: 2 }, // 子目录同名保留
      { path: 'a/b/中文图.bin', size: 4 },
      { path: 'a/zero.dat', size: 0 },
    ])
    expect(manifest.fileCount).toBe(3)
    expect(manifest.totalBytes).toBe(6)
    // 独立 oracle：对排序后 path:size 序列做 sha256（version = 前 16 hex）
    const expectedHash = createHash('sha256')
    for (const f of manifest.files) expectedHash.update(`${f.path}:${f.size}\n`)
    expect(manifest.version).toBe(expectedHash.digest('hex').slice(0, 16))
  })
})
