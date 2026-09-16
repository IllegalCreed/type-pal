/**
 * TEST-FOUNDATION-COVERAGE-1 D5：migration-baseline 纯辅助边界
 * （migration-baseline.ts:29-77：isAtomicProjectMapPath/serializeMigrationJson/sha256；
 * snapshotOf 见 migration-plan.boundaries）。不调用任何磁盘入口
 * （loadPalBaseline/assertPalBaselineSnapshotCurrent 不在白名单）。
 */
import { describe, expect, test } from 'vitest'
import { isAtomicProjectMapPath, serializeMigrationJson, sha256 } from './migration-baseline.js'

describe('isAtomicProjectMapPath', () => {
  test('只认 content/maps/ 下非 index 的 .json', () => {
    expect(isAtomicProjectMapPath('content/maps/m1.json')).toBe(true)
    expect(isAtomicProjectMapPath('content/maps/index.json')).toBe(false)
    expect(isAtomicProjectMapPath('content/maps/m1.json.bak')).toBe(false)
    expect(isAtomicProjectMapPath('content/actors.json')).toBe(false)
    expect(isAtomicProjectMapPath('maps/m1.json')).toBe(false)
  })
})

describe('serializeMigrationJson', () => {
  test('默认形状：JSON.stringify(value, null, 2) + 换行（精确字节）', () => {
    expect(serializeMigrationJson({ a: 1 })).toBe('{\n  "a": 1\n}\n')
    expect(serializeMigrationJson({ a: 1 }, 'content/items.json')).toBe('{\n  "a": 1\n}\n')
  })
  test('原子地图路径走 formatProjectMap：合法 v4 图字节稳定；非 v4 版本拒绝', () => {
    const value = {
      version: 4,
      width: 1,
      height: 1,
      tilesetRefs: ['t'],
      layers: [{ id: 'L1', name: '底', tiles: [[0], [0]] }],
      collision: [[0], [0]],
    }
    const a = serializeMigrationJson(value, 'content/maps/m1.json')
    expect(a).not.toBe(JSON.stringify(value, null, 2) + '\n')
    expect(serializeMigrationJson(value, 'content/maps/m1.json')).toBe(a)
    expect(() => serializeMigrationJson({ tiles: [1] }, 'content/maps/m1.json')).toThrow(
      /仅支持当前版本 4/,
    )
  })
})

describe('sha256', () => {
  test('已知输入的精确摘要（字符串与 Uint8Array 同摘要）', () => {
    expect(sha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
    expect(sha256(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
    expect(sha256('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })
  test('缺席与显式 null 在序列化字节上可区分（metadata/write-map 对应合同）', () => {
    expect(serializeMigrationJson(null)).toBe('null\n')
    expect(serializeMigrationJson({ a: null })).toBe('{\n  "a": null\n}\n')
    expect(sha256(serializeMigrationJson(null))).not.toBe(
      sha256(serializeMigrationJson({ a: null })),
    )
  })
})
