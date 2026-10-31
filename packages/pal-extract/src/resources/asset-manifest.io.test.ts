/** Asset entry filesystem discovery, caller input ownership and final-content digests. */

import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { type AssetEntry, buildManifest, collectAssetEntries } from './asset-manifest.js'

describe('filesystem discovery and final byte digests', () => {
  const roots: string[] = []

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  test('多层/零字节/中文/二进制精确清单；子目录同名 asset-manifest.json 保留；entries 不变；独立序列 hash', () => {
    const root = mkdtempSync(join(tmpdir(), 'pal-manifest-tree-'))
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

    // 倒序前像确保原地排序会被 ownership 断言捕获。
    entries.reverse()
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
    // 由上面三条固定记录独立计算，不能从被测输出再次推导预期。
    expect(manifest.version).toBe('2fa510e09782e86c')
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
})
