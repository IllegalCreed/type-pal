/**
 * TEST-FOUNDATION-COVERAGE-1 D5：migration-baseline 纯辅助边界
 * （migration-baseline.ts:29-79：isAtomicProjectMapPath/serializeMigrationJson/sha256/
 * snapshotFilePresent/snapshotFileHash/baselineWrites）。不调用任何磁盘入口
 * （loadPalBaseline/assertPalBaselineSnapshotCurrent 不在白名单）。
 */
import { describe, expect, test } from 'vitest'
import {
  baselineWrites,
  isAtomicProjectMapPath,
  serializeMigrationJson,
  sha256,
  snapshotFileHash,
  snapshotFilePresent,
} from './migration-baseline.js'
import { snapshotOf } from './migration-plan.js'
import type { MigrationJson } from './pal-migration.js'

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
    expect(a).not.toBe(`${JSON.stringify(value, null, 2)}\n`)
    expect(serializeMigrationJson(value, 'content/maps/m1.json')).toBe(a)
    expect(() => serializeMigrationJson({ tiles: [1] }, 'content/maps/m1.json')).toThrow(
      /仅支持当前版本 4/,
    )
  })
})

describe('sha256', () => {
  test('已知输入的精确摘要（字符串与 Uint8Array 同摘要）', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(sha256(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
  test('缺席与显式 null 在序列化字节上可区分（基础字节事实）', () => {
    expect(serializeMigrationJson(null)).toBe('null\n')
    expect(serializeMigrationJson({ a: null })).toBe('{\n  "a": null\n}\n')
    expect(sha256(serializeMigrationJson(null))).not.toBe(
      sha256(serializeMigrationJson({ a: null })),
    )
  })
})

describe('snapshot 缺席与显式 null 的纯函数合同（D5）', () => {
  const file = 'content/x.json'
  const nullSnapshot = snapshotOf({
    files: new Map<string, MigrationJson>([[file, null]]),
    managedFiles: new Set([file]),
  })

  test('显式 null：present=true，hash=序列化字节摘要；write-map 含 null 正文', () => {
    expect(snapshotFilePresent(nullSnapshot, file)).toBe(true)
    expect(snapshotFileHash(nullSnapshot, file)).toBe(sha256('null\n'))
    const writes = baselineWrites(nullSnapshot)
    expect(writes.get(`packages/migrate/baselines/pal/${file}`)).toBe('null\n')
  })

  test('真正缺席（managed 却无 files/hashes）：present=false，baseline 生成门拒绝', () => {
    const absentSnapshot = snapshotOf({
      files: new Map<string, MigrationJson>(),
      managedFiles: new Set([file]),
    })
    expect(snapshotFilePresent(absentSnapshot, file)).toBe(false)
    expect(snapshotFileHash(absentSnapshot, file)).toBeUndefined()
    expect(() => baselineWrites(absentSnapshot)).toThrow(/baseline 托管清单缺文件或 hash/)
  })

  test('metadata/write-map 对应：_state.json 记录的 hash = write-map 正文字节摘要', () => {
    const snapshot = snapshotOf({
      files: new Map<string, MigrationJson>([
        ['content/b.json', { v: 2 }],
        ['content/a.json', { v: 1 }],
      ]),
      managedFiles: new Set(['content/b.json', 'content/a.json']),
    })
    const writes = baselineWrites(snapshot)
    const statePath = 'packages/migrate/baselines/pal/_state.json'
    const state = JSON.parse(writes.get(statePath)!) as {
      version: number
      managedFiles: string[]
      files: Record<string, string>
    }
    expect(state.version).toBe(1)
    expect(state.managedFiles).toEqual(['content/a.json', 'content/b.json']) // 排序稳定
    for (const path of state.managedFiles) {
      const body = writes.get(`packages/migrate/baselines/pal/${path}`)!
      expect(state.files[path]).toBe(sha256(body))
      expect(state.files[path]).toBe(snapshotFileHash(snapshot, path))
    }
  })
})
