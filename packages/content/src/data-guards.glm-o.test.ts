/** TEST-GLM-WAVE-O-1 O09：stamp/tileset/world-variable/map-index/migration-diagnostics
 *  数据 guard 残余合同。旧证：各 leaf-wave/contract 文件覆盖常规正控；本卡按 gap-map
 *  直击未覆盖臂：stamp id/origin/anchor 轴、tileset 退役字段轴、world-variable id/name
 *  边界、map-index 结构轴、诊断表 id 去重。
 */
import { describe, expect, test } from 'vitest'
import type { AssetCatalogV1 } from './asset.js'
import { mapAssetById, validateMapIndex } from './map-index.js'
import { validateMigrationDiagnostics } from './migration-diagnostic.js'
import { validateStampTemplates } from './stamp.js'
import { resolveTilesetAsset, validateTilesets } from './tileset.js'
import { validateWorldVariableRegistryV1 } from './world-variable.js'

describe('O09 validateStampTemplates：id/origin/anchor 残臂', () => {
  const base = {
    name: '模板',
    origin: 'authored',
    width: 2,
    height: 1,
    tilesetRefs: ['t1'],
    anchor: { row: 0, col: 0 },
    layers: [
      {
        id: 'layer-0',
        name: '下',
        tiles: [
          [null, 5],
          [null, null],
        ],
        sources: [
          [null, 0],
          [null, null],
        ],
      },
    ],
    collision: [
      [0, 0],
      [0, 0],
    ],
  }

  test('合法模板通过并产出锚点', () => {
    const templates = validateStampTemplates([{ ...base, id: 'stamp-1' }])
    expect(templates[0]).toMatchObject({ id: 'stamp-1', anchor: { row: 0, col: 0 } })
  })

  test('id 重复 / origin 非法 / anchor 非负整数 逐轴拒绝', () => {
    expect(() =>
      validateStampTemplates([
        { ...base, id: 'a' },
        { ...base, id: 'a' },
      ]),
    ).toThrow(/重复 id "a"/)
    expect(() => validateStampTemplates([{ ...base, id: 'a', origin: 'x' }])).toThrow(
      /origin: 期望 authored 或 migrated/,
    )
    expect(() =>
      validateStampTemplates([{ ...base, id: 'a', anchor: { row: -1, col: 0 } }]),
    ).toThrow(/期望非负安全整数/)
  })

  test('anchor 超出局部 surface（row ≥ height*2 / col ≥ width）拒绝', () => {
    expect(() =>
      validateStampTemplates([{ ...base, id: 'a', anchor: { row: 2, col: 0 } }]),
    ).toThrow(/锚点超出局部 surface/)
    expect(() =>
      validateStampTemplates([{ ...base, id: 'a', anchor: { row: 0, col: 2 } }]),
    ).toThrow(/锚点超出局部 surface/)
  })

  test('migrated origin 合法', () => {
    expect(() => validateStampTemplates([{ ...base, id: 'a', origin: 'migrated' }])).not.toThrow()
  })
})

describe('O09 validateTilesets：退役字段与唯一 id', () => {
  const tileset = { id: 't1', name: '瓦片', category: 'builtin', asset: 'tileset.pal.001' }

  test('合法通过；resolveTilesetAsset 命中与未知拒绝', () => {
    const list = validateTilesets([tileset])
    expect(list[0]!.id).toBe('t1')
    expect(resolveTilesetAsset('t1', list)).toBe('tileset.pal.001')
    expect(() => resolveTilesetAsset('ghost', list)).toThrow(/ghost/)
  })

  test("id 含 '/' / 重复 id / 退役 path / 退役 tiles 逐轴拒绝", () => {
    expect(() => validateTilesets([{ ...tileset, id: 'a/b' }])).toThrow(/id 不得含/)
    expect(() => validateTilesets([tileset, { ...tileset, name: '另一个' }])).toThrow(
      /重复 id "t1"/,
    )
    expect(() => validateTilesets([{ ...tileset, path: 'assets/x' }])).toThrow(/path.*已退役/)
    expect(() => validateTilesets([{ ...tileset, tiles: [] }])).toThrow(/tiles.*已退役/)
  })

  test('catalog 注入时 asset 必须存在', () => {
    const catalog = {
      version: 1 as const,
      assets: {
        'tileset.pal.001': {
          kind: 'tileset' as const,
          path: 'assets/generated/tileset-pal-001.bin',
          mediaType: 'application/octet-stream',
          bytes: 16,
          sha256: 'a'.repeat(64),
          origin: { kind: 'generated' as const },
        },
      },
    } satisfies AssetCatalogV1
    expect(() => validateTilesets([tileset], catalog)).not.toThrow()
    expect(() => validateTilesets([{ ...tileset, asset: 'tileset.ghost' }], catalog)).toThrow(
      /不在 catalog/,
    )
  })
})

describe('O09 validateWorldVariableRegistryV1：id/name 边界', () => {
  test('空键 / 非法 id 字符 / 超长 name 逐轴拒绝', () => {
    expect(() =>
      validateWorldVariableRegistryV1({
        '': { kind: 'flag', name: 'n', description: '', initial: true },
      }),
    ).toThrow('worldVariables.<empty>: 不能为空')
    expect(() =>
      validateWorldVariableRegistryV1({
        'a b': { kind: 'flag', name: 'n', description: '', initial: true },
      }),
    ).toThrow(/worldVariables\.a b/)
    expect(() =>
      validateWorldVariableRegistryV1({
        ok: { kind: 'flag', name: 'x'.repeat(200), description: '', initial: true },
      }),
    ).toThrow(/name/)
  })

  test('首尾空格 name / 非字符串 description 拒绝', () => {
    expect(() =>
      validateWorldVariableRegistryV1({
        v: { kind: 'flag', name: ' x', description: '', initial: true },
      }),
    ).toThrow(/不得包含首尾空格/)
    expect(() =>
      validateWorldVariableRegistryV1({
        v: { kind: 'flag', name: 'x', description: 3, initial: true },
      }),
    ).toThrow(/description.*期望字符串/)
  })
})

describe('O09 validateMapIndex / mapAssetById', () => {
  const index = {
    version: 1,
    maps: [{ id: 'map-001', name: '一', path: 'content/maps/map-001.json' }],
  }

  test('path 重复拒绝；mapAssetById 命中与未命中', () => {
    expect(() =>
      validateMapIndex({
        version: 1,
        maps: [
          { id: 'map-001', name: '一', path: 'content/maps/map-001.json' },
          { id: 'map-002', name: '二', path: 'content/maps/map-001.json' },
        ],
      }),
    ).toThrow(/重复|path/)
    const valid = validateMapIndex(index)
    expect(mapAssetById(valid, 'map-001')?.path).toBe('content/maps/map-001.json')
    expect(mapAssetById(valid, 'map-999')).toBeUndefined()
  })

  test('非法 map 条目（缺 id）拒绝', () => {
    expect(() => validateMapIndex({ version: 1, maps: [{ name: 'x', path: 'p' }] })).toThrow(/id/)
  })
})

describe('O09 validateMigrationDiagnostics：诊断表结构', () => {
  test('诊断项缺 id / 重复 id 逐轴拒绝；合法空表通过', () => {
    expect(() =>
      validateMigrationDiagnostics({ version: 1, diagnostics: [{ target: 'x' }] }),
    ).toThrow('migrationDiagnostics.diagnostics[0].id: 期望非空 string')
    const diagnostic = {
      severity: 'warn',
      id: 'd1',
      reason: '退役物品仍被引用',
      category: 'unsupported-command',
      source: { kind: 'legacy-script', label: '旧脚本', address: 0 },
      target: { domain: 'item', objectId: '2', capability: 'use', label: '目标' },
    } as const
    expect(() =>
      validateMigrationDiagnostics({ version: 1, diagnostics: [diagnostic, diagnostic] }),
    ).toThrow('migrationDiagnostics.diagnostics[1].id: 重复 d1')
    expect(validateMigrationDiagnostics({ version: 1, diagnostics: [] })).toEqual({
      version: 1,
      diagnostics: [],
    })
  })
})
