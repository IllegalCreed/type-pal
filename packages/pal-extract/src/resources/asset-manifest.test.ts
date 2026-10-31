/** Pure asset content aggregation, filtering and empty-manifest contracts. */
import { describe, expect, it, test } from 'vitest'
import { buildManifest } from './asset-manifest.js'

describe('pure content aggregation and filtering', () => {
  // 标准空串SHA256前16位；预期不再调用被测函数或重做版本算法。
  const emptyManifest = { version: 'e3b0c44298fc1c14', totalBytes: 0, fileCount: 0, files: [] }

  it('聚合 files/totalBytes/fileCount,version 对内容稳定、对变化敏感', () => {
    const original = buildManifest([
      { path: 'data/items.json', size: 100, sha256: '0'.repeat(64) },
      { path: 'images/world/0.png', size: 50, sha256: '0'.repeat(64) },
    ])
    expect(original.fileCount).toBe(2)
    expect(original.totalBytes).toBe(150)
    expect(original.files[0]).toEqual({
      path: 'data/items.json',
      size: 100,
      sha256: '0'.repeat(64),
    })
    // 同输入(乱序)→ 同 version(内部排序);这里另核大小变化。
    const reordered = buildManifest([
      { path: 'images/world/0.png', size: 50, sha256: '0'.repeat(64) },
      { path: 'data/items.json', size: 100, sha256: '0'.repeat(64) },
    ])
    expect(reordered.version).toBe(original.version)
    const resized = buildManifest([
      { path: 'data/items.json', size: 101, sha256: '0'.repeat(64) },
      { path: 'images/world/0.png', size: 50, sha256: '0'.repeat(64) },
    ])
    expect(resized.version).not.toBe(original.version)
  })

  it('剔除 asset-manifest.json 自身(避免自指)', () => {
    const filtered = buildManifest([
      { path: 'asset-manifest.json', size: 9, sha256: '0'.repeat(64) },
      { path: 'data/items.json', size: 100, sha256: '0'.repeat(64) },
    ])
    expect(filtered.files.map((f) => f.path)).toEqual(['data/items.json'])
    expect(filtered.fileCount).toBe(1)
  })

  it('剔除任意目录下的 .DS_Store(macOS 噪声,deploy.sh 同样 --exclude,且不该污染 version)', () => {
    const filtered = buildManifest([
      { path: '.DS_Store', size: 6, sha256: '0'.repeat(64) },
      { path: 'data/.DS_Store', size: 6, sha256: '0'.repeat(64) },
      { path: 'data/items.json', size: 100, sha256: '0'.repeat(64) },
    ])
    expect(filtered.files.map((f) => f.path)).toEqual(['data/items.json'])
    expect(filtered.fileCount).toBe(1)
    // version 只反映真实资源 → 与"压根没有 .DS_Store"时一致
    const clean = buildManifest([{ path: 'data/items.json', size: 100, sha256: '0'.repeat(64) }])
    expect(filtered.version).toBe(clean.version)
  })

  it('buildManifest：相同 path 的条目保留（不从相同条目推断稳定排序）且排除自身与 .DS_Store', () => {
    const manifest = buildManifest([
      { path: 'b/2.png', size: 2, sha256: '0'.repeat(64) },
      { path: 'asset-manifest.json', size: 999, sha256: '0'.repeat(64) }, // SELF 排除
      { path: 'a/.DS_Store', size: 5, sha256: '0'.repeat(64) }, // 排除
      { path: 'a/1.png', size: 1, sha256: '0'.repeat(64) },
      { path: 'b/2.png', size: 2, sha256: '0'.repeat(64) }, // 与首项同 path 同 size → sort 相等臂
    ])
    expect(manifest.files).toEqual([
      { path: 'a/1.png', size: 1, sha256: '0'.repeat(64) },
      { path: 'b/2.png', size: 2, sha256: '0'.repeat(64) },
      { path: 'b/2.png', size: 2, sha256: '0'.repeat(64) },
    ])
    expect(manifest.version).toBe('0d861cd4e8faf2d3')
    expect(manifest.fileCount).toBe(3)
    expect(manifest.totalBytes).toBe(5)
  })

  test('空表：version = sha256("") 前 16 hex、totalBytes 0、fileCount 0、files []', () => {
    const manifest = buildManifest([])
    expect(manifest).toEqual(emptyManifest)
  })

  test('全被剔除的表（仅 self 与 .DS_Store）与空表同 version', () => {
    const filtered = buildManifest([
      { path: 'asset-manifest.json', size: 5, sha256: '0'.repeat(64) },
      { path: '.DS_Store', size: 6, sha256: '0'.repeat(64) },
    ])
    expect(filtered).toEqual(emptyManifest)
  })
})
