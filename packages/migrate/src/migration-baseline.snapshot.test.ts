/** Pure baseline snapshot encoding, path classification and content identity. */
import { describe, expect, test } from 'vitest'
import {
  baselineWrites,
  isAtomicProjectMapPath,
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
  snapshotFileHash,
  snapshotFilePresent,
} from './migration-baseline.js'
import type { MigrationJson } from './migration-files.js'

describe('baseline snapshot encoding', () => {
  const file = 'content/x.json'

  const nullSnapshot: MigrationSnapshot = {
    files: new Map<string, MigrationJson>([[file, null]]),
    managedFiles: new Set([file]),
  }

  test('只认 content/maps/ 下非 index 的 .json', () => {
    expect(isAtomicProjectMapPath('content/maps/m1.json')).toBe(true)
    expect(isAtomicProjectMapPath('content/maps/index.json')).toBe(false)
    expect(isAtomicProjectMapPath('content/maps/m1.json.bak')).toBe(false)
    expect(isAtomicProjectMapPath('content/actors.json')).toBe(false)
    expect(isAtomicProjectMapPath('maps/m1.json')).toBe(false)
  })

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

  test('已知输入的精确摘要（字符串与 Uint8Array 同摘要）', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(sha256(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  test('显式 null：present=true，hash=序列化字节摘要；write-map 含 null 正文', () => {
    expect(snapshotFilePresent(nullSnapshot, file)).toBe(true)
    expect(snapshotFileHash(nullSnapshot, file)).toBe(sha256('null\n'))
    const writes = baselineWrites(nullSnapshot)
    expect(writes.get(`packages/migrate/baselines/pal/${file}`)).toBe('null\n')
  })

  test('真正缺席（managed 却无 files/hashes）：present=false，baseline 生成门拒绝', () => {
    const absentSnapshot: MigrationSnapshot = {
      files: new Map<string, MigrationJson>(),
      managedFiles: new Set([file]),
    }
    expect(snapshotFilePresent(absentSnapshot, file)).toBe(false)
    expect(snapshotFileHash(absentSnapshot, file)).toBeUndefined()
    expect(() => baselineWrites(absentSnapshot)).toThrow(/baseline 托管清单缺文件或 hash/)
  })

  test('metadata/write-map 对应：_state.json 记录的 hash = write-map 正文字节摘要', () => {
    const snapshot: MigrationSnapshot = {
      files: new Map<string, MigrationJson>([
        ['content/b.json', { a: null }],
        ['content/a.json', { v: 1 }],
      ]),
      managedFiles: new Set(['content/b.json', 'content/a.json']),
    }
    const writes = baselineWrites(snapshot)
    const statePath = 'packages/migrate/baselines/pal/_state.json'
    const state: unknown = JSON.parse(writes.get(statePath)!)
    const expectedBodies = {
      'content/a.json': '{\n  "v": 1\n}\n',
      'content/b.json': '{\n  "a": null\n}\n',
    }
    expect(state).toEqual({
      version: 1,
      managedFiles: ['content/a.json', 'content/b.json'],
      files: {
        'content/a.json': sha256(expectedBodies['content/a.json']),
        'content/b.json': sha256(expectedBodies['content/b.json']),
      },
    })
    for (const [path, body] of Object.entries(expectedBodies)) {
      expect(writes.get(`packages/migrate/baselines/pal/${path}`)).toBe(body)
      expect(snapshotFileHash(snapshot, path)).toBe(sha256(body))
    }
  })

  test('地图序列化保留 canonical 紧凑矩阵与隐式单来源的精确字节', () => {
    const value: MigrationJson = {
      version: 4,
      width: 1,
      height: 1,
      tilesetRefs: ['tileset-001'],
      layers: [{ id: 'floor', name: '地板', tiles: [[1], [null]], sources: [[0], [null]] }],
      collision: [[0], [0]],
    }
    expect(serializeMigrationJson(value, 'content/maps/map-001.json')).toBe(`{
  "version": 4,
  "width": 1,
  "height": 1,
  "tilesetRefs": ["tileset-001"],
  "layers": [
    {
      "id": "floor",
      "name": "地板",
      "tiles": [
        [1],
        [null]
      ]
    }
  ],
  "collision": [
    [0],
    [0]
  ]
}
`)
  })

  test('stamps 序列化使用 canonical 字段顺序而非输入对象顺序', () => {
    const stamps: MigrationJson = [
      {
        // Same valid fields, deliberately supplied in a different insertion order.
        name: '树',
        id: 'tree',
        width: 1,
        height: 1,
        origin: 'migrated',
        anchor: { row: 0, col: 0 },
        tilesetRefs: ['tileset-001'],
        layers: [{ id: 'ground', name: '地面', tiles: [[1], [null]], sources: [[0], [null]] }],
        collision: [[0], [null]],
      },
    ]
    const canonical = [
      {
        id: 'tree',
        name: '树',
        origin: 'migrated',
        anchor: { row: 0, col: 0 },
        width: 1,
        height: 1,
        tilesetRefs: ['tileset-001'],
        layers: [{ id: 'ground', name: '地面', tiles: [[1], [null]], sources: [[0], [null]] }],
        collision: [[0], [null]],
      },
    ]
    expect(serializeMigrationJson(stamps, 'content/stamps.json')).toBe(
      `${JSON.stringify(canonical, null, 2)}\n`,
    )
  })
})
