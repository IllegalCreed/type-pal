/** TEST-GLM-NEW-J-1 J02：pal-current-publication 发布前资源闭包前置计划。
 * 旧证：pal-current-publication.pal.test.ts 走真实全量 baseline（pal 工程）；
 * `palAssetPreconditions`（manifest 前每个 catalog 二进制的 hash 物化前置）
 * 在旧测试零直接断言。纯内存：synthetic catalog，不发布、不写盘。
 */
import type { AssetCatalogV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { type PalCurrentPublication, palAssetPreconditions } from './pal-current-publication.js'
import type { ProjectMapAuditReport } from './project-map-audit.js'

const HEX_64 = `${'a'.repeat(63)}b`

const emptyMapReport: ProjectMapAuditReport = {
  mapCount: 0,
  latticeInstances: 0,
  residualWordCount: 0,
  emptyLayer1NonzeroHeightCount: 0,
  emptyLayer1NonzeroHeightWords: [],
  layer0NonzeroHeightCount: 0,
  layer1NonzeroHeightCount: 0,
  collisionInstanceCount: 0,
  multiHeightTilesetTileCount: 0,
  residualWords: [],
  rawRoundTripMismatchCount: 0,
  semanticRoundTripMismatchCount: 0,
  sourceJsonBytes: 0,
  projectMapJsonBytes: 0,
  sizeRatio: 0,
}

function publicationWithCatalog(catalog: AssetCatalogV1): PalCurrentPublication {
  return {
    files: new Map([['assets/index.json', JSON.parse(JSON.stringify(catalog))]]),
    managedFiles: new Set(['assets/index.json']),
    mapReport: structuredClone(emptyMapReport),
  }
}

function catalogWith(paths: string[]): AssetCatalogV1 {
  return {
    version: 1,
    assets: Object.fromEntries(
      paths.map((path) => [
        path,
        {
          kind: 'portrait',
          path,
          mediaType: 'image/png',
          bytes: 1,
          sha256: HEX_64,
          origin: { kind: 'legacy-migrated', ref: path },
        },
      ]),
    ),
  }
}

describe('palAssetPreconditions：manifest 之前每个 catalog 二进制的 hash 物化前置', () => {
  test('按目标路径排序产出 projects/pal 前缀前置，hash 取自 catalog 记录', () => {
    const publication = publicationWithCatalog(
      catalogWith(['assets/migrated/z.png', 'assets/migrated/a.png']),
    )
    const before = structuredClone(publication)
    const preconditions = palAssetPreconditions(publication)
    expect(preconditions).toEqual([
      { target: 'projects/pal/assets/migrated/a.png', hash: HEX_64 },
      { target: 'projects/pal/assets/migrated/z.png', hash: HEX_64 },
    ])
    expect(publication).toEqual(before)
  })

  test('空 catalog 产出空前置表（不虚构资源）', () => {
    expect(palAssetPreconditions(publicationWithCatalog(catalogWith([])))).toEqual([])
  })

  test('publication 缺 assets/index.json 时 fail-loud', () => {
    const publication: PalCurrentPublication = {
      files: new Map(),
      managedFiles: new Set(),
      mapReport: structuredClone(emptyMapReport),
    }
    expect(() => palAssetPreconditions(publication)).toThrow(
      'PAL current publication 缺文件 assets/index.json',
    )
  })

  test('catalog 记录非法（sha256 非十六进制）时经 validateAssetCatalog fail-loud', () => {
    const catalog = catalogWith(['assets/migrated/a.png'])
    catalog.assets['assets/migrated/a.png']!.sha256 = 'nothex'
    const publication = publicationWithCatalog(catalog)
    expect(() => palAssetPreconditions(publication)).toThrow(/期望 64 位小写十六进制/)
  })
})
