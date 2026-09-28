/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R08（resources/asset-manifest.ts）。
 * 去重账（targets.json existingTestPointers 过期——实际已有两份覆盖，登记差异）：
 * asset-manifest.test 覆盖聚合/version 稳定敏感/自剔除/DS_Store；asset-manifest.boundaries
 * （TB-05 + RESOURCE-TOOLS R09）覆盖 mkdtemp 真实树精确清单/子目录同名保留/entries 不变/
 * path:size 序列 sha256 oracle。本文件只做未占用合同：空 entries 清单（空串 sha256 前缀、
 * 零计数、空 files）。
 */
import { createHash } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import { buildManifest } from '../resources/asset-manifest.js'

describe('R08 buildManifest 空 entries', () => {
  test('空表：version = sha256("") 前 16 hex、totalBytes 0、fileCount 0、files []', () => {
    const manifest = buildManifest([])
    const expected = createHash('sha256').update('').digest('hex').slice(0, 16)
    expect(manifest).toEqual({ version: expected, totalBytes: 0, fileCount: 0, files: [] })
  })

  test('全被剔除的表（仅 self 与 .DS_Store）与空表同 version', () => {
    const filtered = buildManifest([
      { path: 'asset-manifest.json', size: 5 },
      { path: '.DS_Store', size: 6 },
    ])
    expect(filtered).toEqual(buildManifest([]))
  })
})
