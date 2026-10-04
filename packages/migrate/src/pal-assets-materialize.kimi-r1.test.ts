/**
 * TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 · materializePalAssets 残余分支（pal-assets.ts:1201-1318）。
 *
 * 隔离：repo 为本次 mkdtemp（realpath 后写入全部落在临时 projects/pal 树下），
 * afterEach 仅清理本次目录；不触碰真实 projects/pal 或 data/extracted。
 *
 * 排重 basis（旧 fullName 不重复）：pal-assets.ownership.test.ts 覆盖所有权预检主面
 * （重复 id/路径冲突/缺资源/字段改写/未知所有权）、pal-assets.retirements.test.ts 覆盖
 * 退役规划。本文件只补 fast lcov 一手测量的未覆盖 edge：
 * - :1237 origin 被非 authored 记录改写精确拒绝（且全量预检先于任何写入，目标目录不落地）。
 * - :1253 authored 接管跳过复制：同 AssetId 被作者接管后只验证 authored 文件 bytes/hash，
 *   绝不复制 migrated 来源（report.authored 计数）；同测试钉 written/unchanged 主路径
 *   与最终逐文件重读闭包（真实 resolver 输出 oracle）。
 * 不覆盖（ledger）：:1148 退役路径越界——validateAssetCatalog 的 ownedPrefix
 * （legacy-migrated 必须位于 assets/migrated/）与 validateProjectRelativePath
 * （拒绝绝对/反斜杠/空段/. /..）已先行拒绝 assertRetirableMigratedPath 的全部触发形态。
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import type { AssetCatalogV1, AssetRecordV1 } from '@type-pal/content'
import { afterEach, describe, expect, test } from 'vitest'
import { sha256 } from './migration-baseline.js'
import { materializePalAssets, type PalBinaryAssetSource } from './pal-assets.js'

const roots: string[] = []
const tempRepo = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'kimi-r1-palmat-'))
  roots.push(root)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function record(path: string, bytes: Uint8Array, origin: AssetRecordV1['origin']): AssetRecordV1 {
  return {
    kind: 'sprite',
    path,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
    label: `测试 ${path}`,
    origin,
  }
}

function generated(id: string, bytes: Uint8Array, rec: AssetRecordV1): PalBinaryAssetSource {
  return { id, bytes, record: { ...rec } }
}

function writeProjectFile(repo: string, rel: string, data: Uint8Array): void {
  const full = resolve(repo, 'projects/pal', rel)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, data)
}

const BYTES_A = new Uint8Array([1, 2, 3, 4, 5])
const BYTES_B = new Uint8Array([6, 7, 8])
const BYTES_C = new Uint8Array([9, 10, 11, 12])

describe('KIMI-R1 materializePalAssets 残余分支', () => {
  test('written/unchanged/authored 三路 + 最终重读闭包', () => {
    const repo = tempRepo()
    const recWritten = record('assets/migrated/sprites/999.rle', BYTES_A, {
      kind: 'legacy-migrated',
      ref: 'sprite/999.rle',
    })
    const recUnchanged = record('assets/migrated/sprites/998.rle', BYTES_B, {
      kind: 'legacy-migrated',
      ref: 'sprite/998.rle',
    })
    const recAuthored = record('assets/authored/sprites/custom.rle', BYTES_C, {
      kind: 'authored',
    })
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: {
        'sprite-999': recWritten,
        'sprite-998': recUnchanged,
        'sprite-custom': recAuthored,
      },
    }
    writeProjectFile(repo, 'assets/migrated/sprites/998.rle', BYTES_B) // 与登记一致 → unchanged
    writeProjectFile(repo, 'assets/authored/sprites/custom.rle', BYTES_C) // authored 验证源
    const report = materializePalAssets({
      repo,
      catalog,
      binaries: [
        generated('sprite-999', BYTES_A, recWritten),
        generated('sprite-998', BYTES_B, recUnchanged),
        generated('sprite-custom', BYTES_C, recAuthored),
      ],
    })
    expect(report).toEqual({
      written: 1,
      unchanged: 1,
      authored: 1,
      files: 3,
      bytes: BYTES_A.byteLength + BYTES_B.byteLength + BYTES_C.byteLength,
    })
    // written 真落盘且内容与来源一致；authored 文件未被 migrated 来源覆盖
    expect(
      new Uint8Array(readFileSync(resolve(repo, 'projects/pal/assets/migrated/sprites/999.rle'))),
    ).toEqual(BYTES_A)
    expect(
      new Uint8Array(
        readFileSync(resolve(repo, 'projects/pal/assets/authored/sprites/custom.rle')),
      ),
    ).toEqual(BYTES_C)
    // 临时文件不留存
    const migrated = Array.from({ length: 0 }, () =>
      resolve(repo, 'projects/pal/assets/migrated/sprites'),
    )
    expect(migrated).toEqual([])
  })

  test('origin 被非 authored 记录改写精确拒绝；预检先于任何写入', () => {
    const repo = tempRepo()
    const source = record('assets/migrated/sprites/999.rle', BYTES_A, {
      kind: 'legacy-migrated',
      ref: 'sprite/999.rle',
    })
    const rewritten: AssetRecordV1 = {
      ...source,
      origin: { kind: 'legacy-migrated', ref: 'tampered.rle' }, // origin 被改写
    }
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: { 'sprite-999': rewritten },
    }
    expect(() =>
      materializePalAssets({ repo, catalog, binaries: [generated('sprite-999', BYTES_A, source)] }),
    ).toThrow('迁移资源 sprite-999.origin 被非 authored 记录改写')
    // 全量预检先于第一个写入：目标不得落地
    expect(() =>
      readFileSync(resolve(repo, 'projects/pal/assets/migrated/sprites/999.rle')),
    ).toThrow('ENOENT')
  })
})
