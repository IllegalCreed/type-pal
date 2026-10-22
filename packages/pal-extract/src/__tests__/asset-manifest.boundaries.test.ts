/**
 * TEST-RESOURCE-TOOLS-COVERAGE-1 R09：asset-manifest 真实 FS 树（resources/asset-manifest.ts）。
 * 既有 asset-manifest.test 已覆盖纯函数聚合/自身剔除/DS_Store（内存 entries）——不重复。
 * 本文件：mkdtemp 真实多层树（零字节/中文/二进制）精确清单、根 self 与子目录同名区分、
 * 原始 entries 不变、独立 path:size:sha256 序列 sha256。
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
      {
        path: 'a/.DS_Store',
        size: 4,
        sha256: 'df3f619804a92fdb4057192dc43dd748ea778adc52bc498ce80524c014b81119',
      },
      {
        path: 'a/b/asset-manifest.json',
        size: 2,
        sha256: '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
      },
      {
        path: 'a/b/中文图.bin',
        size: 4,
        sha256: '3d1f57c984978ef98a18378c8166c1cb8ede02c03eeb6aee7e2f121dfeee3e56',
      },
      {
        path: 'a/zero.dat',
        size: 0,
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
      {
        path: 'asset-manifest.json',
        size: 2,
        sha256: '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
      }, // collect 不过滤；剔除只发生在 buildManifest
    ])

    const snapshot: AssetEntry[] = structuredClone(entries)
    const manifest = buildManifest(entries)
    expect(entries).toEqual(snapshot) // collect 结果不被 build 改写
    expect(manifest.files).toEqual([
      {
        path: 'a/b/asset-manifest.json',
        size: 2,
        sha256: '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
      }, // 子目录同名保留
      {
        path: 'a/b/中文图.bin',
        size: 4,
        sha256: '3d1f57c984978ef98a18378c8166c1cb8ede02c03eeb6aee7e2f121dfeee3e56',
      },
      {
        path: 'a/zero.dat',
        size: 0,
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    ])
    expect(manifest.fileCount).toBe(3)
    expect(manifest.totalBytes).toBe(6)
    // 独立 oracle：对排序后 path:size:sha256 序列做 sha256（version = 前 16 hex）
    const expectedHash = createHash('sha256')
    for (const f of manifest.files) expectedHash.update(`${f.path}:${f.size}:${f.sha256}\n`)
    expect(manifest.version).toBe(expectedHash.digest('hex').slice(0, 16))
  })
})

test('same-length script edit changes the cache version and records the final bytes digest', () => {
  const root = mkdtempSync(join(tmpdir(), 'pal-manifest-content-'))
  roots.push(root)
  writeFileSync(join(root, 'script.json'), '{"item":0}')
  const original = buildManifest(collectAssetEntries(root))
  writeFileSync(join(root, 'script.json'), '{"item":3}')
  const corrected = buildManifest(collectAssetEntries(root))
  expect(corrected.totalBytes).toBe(original.totalBytes)
  expect(corrected.version).not.toBe(original.version)
  expect(corrected.files[0]).toMatchObject({
    sha256: createHash('sha256').update('{"item":3}').digest('hex'),
  })
})
