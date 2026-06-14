import { describe, expect, it } from 'vitest'
import { buildManifest } from '../resources/asset-manifest.js'

describe('buildManifest', () => {
  it('聚合 files/totalBytes/fileCount,version 对内容稳定、对变化敏感', () => {
    const a = buildManifest([
      { path: 'data/items.json', size: 100 },
      { path: 'images/world/0.png', size: 50 },
    ])
    expect(a.fileCount).toBe(2)
    expect(a.totalBytes).toBe(150)
    expect(a.files[0]).toEqual({ path: 'data/items.json', size: 100 })
    // 同输入(乱序)→ 同 version(内部排序);路径或大小变 → version 变
    const b = buildManifest([
      { path: 'images/world/0.png', size: 50 },
      { path: 'data/items.json', size: 100 },
    ])
    expect(b.version).toBe(a.version)
    const c = buildManifest([
      { path: 'data/items.json', size: 101 },
      { path: 'images/world/0.png', size: 50 },
    ])
    expect(c.version).not.toBe(a.version)
  })

  it('剔除 asset-manifest.json 自身(避免自指)', () => {
    const m = buildManifest([
      { path: 'asset-manifest.json', size: 9 },
      { path: 'data/items.json', size: 100 },
    ])
    expect(m.files.map((f) => f.path)).toEqual(['data/items.json'])
    expect(m.fileCount).toBe(1)
  })

  it('剔除任意目录下的 .DS_Store(macOS 噪声,deploy.sh 同样 --exclude,且不该污染 version)', () => {
    const m = buildManifest([
      { path: '.DS_Store', size: 6 },
      { path: 'data/.DS_Store', size: 6 },
      { path: 'data/items.json', size: 100 },
    ])
    expect(m.files.map((f) => f.path)).toEqual(['data/items.json'])
    expect(m.fileCount).toBe(1)
    // version 只反映真实资源 → 与"压根没有 .DS_Store"时一致
    const clean = buildManifest([{ path: 'data/items.json', size: 100 }])
    expect(m.version).toBe(clean.version)
  })
})
