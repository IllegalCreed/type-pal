/** 空清单边界：直接空输入与过滤后为空；非空聚合/排序与真实FS由相邻两专测核验。 */
import { describe, expect, test } from 'vitest'
import { buildManifest } from '../resources/asset-manifest.js'

// 标准空串SHA256前16位；预期不再调用被测函数或重做版本算法。
const emptyManifest = { version: 'e3b0c44298fc1c14', totalBytes: 0, fileCount: 0, files: [] }

describe('R08 buildManifest 空 entries', () => {
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
