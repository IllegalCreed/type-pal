/** Atomic map version selection, missing bodies and canonical snapshot hashes. */
import { describe, expect, test } from 'vitest'
import { type MigrationSnapshot, serializeMigrationJson, sha256 } from './migration-baseline.js'
import type { MigrationJson } from './migration-files.js'
import { createMigrationPlan, snapshotOf } from './migration-plan.js'

describe('hash-only map versions', () => {
  const MAP = 'content/maps/map-001.json'

  const mapV = (n: number): MigrationJson => ({
    version: 4,
    width: 1,
    height: 1,
    tilesetRefs: ['tileset-001'],
    layers: [{ id: 'floor', name: '底', tiles: [[0], [0]], sources: [[0], [0]] }],
    collision: [[n], [0]],
  })

  function snap(
    entries: readonly (readonly [string, MigrationJson])[],
    hashOnly: readonly string[] = [],
  ): MigrationSnapshot {
    const files = new Map<string, MigrationJson>()
    const hashes = new Map<string, string>()
    for (const [path, value] of entries) {
      if (hashOnly.includes(path)) {
        hashes.set(path, sha256(serializeMigrationJson(value, path)))
        continue
      }
      files.set(path, structuredClone(value))
    }
    return { files, managedFiles: new Set([...files.keys(), ...hashes.keys()]), hashes }
  }

  // Fixed digests of independently written canonical bytes; the evidence retains those bytes.
  const mapHashes = {
    base: '0b64cbb6e1ae8a6675d20a40f4faa2eafad8d71ef48ed95595b627d77b733da2',
    ours: '133027d0b7c8141b786421e86ee193fe65ba5c29bce0ca8faa2ce3d482461cfd',
    theirs: 'bdc84d0221900ea07f855fb13e49ab22daa17afd069f53928d24a1f63276c4e1',
  }

  const DOC = 'content/scenes/s000.json'

  test('ours 的 hash-only 版本与新迁移相同，从 theirs 回填选中正文', () => {
    const base = snap([[MAP, mapV(1)]], [MAP])
    const ours = snap([[MAP, mapV(9)]], [MAP])
    const theirs = snap([[MAP, mapV(9)]])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get(MAP)).toEqual(mapV(9))
  })

  test('保留 ours 的 hash-only 修改但没有同版本正文时明确失败', () => {
    const base = snap([[MAP, mapV(1)]], [MAP])
    const ours = snap([[MAP, mapV(9)]], [MAP])
    const theirs = snap([[MAP, mapV(1)]])
    expect(() => createMigrationPlan(base, ours, theirs)).toThrow(
      `原子地图 ${MAP} 选中版本只有 hash、缺正文`,
    )
  })

  test('原子地图三方各改各的 → value 冲突，冲突快照带 hash 版本', () => {
    const base = snap([[MAP, mapV(1)]])
    const ours = snap([[MAP, mapV(2)]])
    const theirs = snap([[MAP, mapV(3)]])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts).toEqual([
      {
        file: MAP,
        path: '/',
        type: 'value',
        base: { present: true, value: { sha256: mapHashes.base } },
        ours: { present: true, value: { sha256: mapHashes.ours } },
        theirs: { present: true, value: { sha256: mapHashes.theirs } },
      },
    ])
    // 有冲突的原子地图不进 target（发布停线）。
    expect(plan.target.has(MAP)).toBe(false)
  })

  test('原子地图一方删除、一方修改 → delete-modify 冲突', () => {
    const base = snap([[MAP, mapV(1)]])
    const ours = snap([])
    ours.managedFiles = new Set([MAP])
    const theirs = snap([[MAP, mapV(3)]])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts.map(({ type }) => type)).toEqual(['delete-modify'])
  })

  test('原子地图双方各自新增不同版本 → add-add 冲突', () => {
    const base = snap([])
    const ours = snap([[MAP, mapV(2)]])
    const theirs = snap([[MAP, mapV(3)]])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts.map(({ type }) => type)).toEqual(['add-add'])
  })

  test('snapshotOf 为每个文件产出序列化 hash 且原子地图走专用格式化', () => {
    const snapshot = snap([
      [MAP, mapV(1)],
      [DOC, { v: 1 }],
    ])
    const withHashes = snapshotOf({ files: snapshot.files, managedFiles: snapshot.managedFiles })
    expect(withHashes.hashes).toEqual(
      new Map([
        [DOC, '05ea03c4a3ef474e2276a2910f804ae49e759d1107946e8b50df38dc508abc27'],
        [MAP, mapHashes.base],
      ]),
    )
  })
})

describe('canonical map bytes and absence', () => {
  const snap = (files: Record<string, MigrationJson>, managed: string[]) =>
    snapshotOf({
      files: new Map(Object.entries(files)),
      managedFiles: new Set(managed),
    })

  /** 合法最小 v4 ProjectMap（formatProjectMap 校验通过的最小形状）。 */
  const v4map = (over: Record<string, MigrationJson> = {}) => ({
    version: 4,
    width: 1,
    height: 1,
    tilesetRefs: ['t'],
    layers: [{ id: 'L1', name: '底', tiles: [[0], [0]] }],
    collision: [[0], [0]],
    ...over,
  })

  const mapFile = 'content/maps/m1.json'

  test('ours=base + theirs 改 → 生成 theirs 值的 write；hash 按序列化字节比较', () => {
    const base = snap({ [mapFile]: v4map() }, [mapFile])
    const ours = snap({ [mapFile]: v4map() }, [mapFile])
    const theirs = snap(
      { [mapFile]: v4map({ layers: [{ id: 'L1', name: '底', tiles: [[1], [1]] }] }) },
      [mapFile],
    )
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts).toEqual([])
    expect(plan.writes.get(mapFile)).toEqual(
      v4map({ layers: [{ id: 'L1', name: '底', tiles: [[1], [1]] }] }),
    )
    expect(plan.summary.generated).toBe(1)
  })

  test('ours 与 theirs 同改同值 → 无 write（字节相同视为同一版本）', () => {
    const base = snap({ [mapFile]: v4map() }, [mapFile])
    const ours = snap({ [mapFile]: v4map({ tilesetRefs: ['t2'] }) }, [mapFile])
    const theirs = snap({ [mapFile]: v4map({ tilesetRefs: ['t2'] }) }, [mapFile])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.writes.size).toBe(0)
    expect(plan.conflicts).toEqual([])
  })

  test('theirs 删除未改的原子地图时，计划删除工程中的该图', () => {
    const base = snap({ [mapFile]: v4map() }, [mapFile])
    // theirs 缺席、ours=base(磁盘仍在) → 计划删除磁盘文件
    const plan = createMigrationPlan(base, base, snap({}, [mapFile]))
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([mapFile])
  })

  test('ours 侧已缺席的原子地图无需再次删除', () => {
    const base = snap({ [mapFile]: v4map() }, [mapFile])
    const oursGone = createMigrationPlan(base, snap({}, [mapFile]), base)
    expect(oursGone.writes.size).toBe(0)
    expect(oursGone.deletes).toEqual([])
  })

  test('原子地图的图层名称变化产生携带完整正文的 write', () => {
    const base = snap({ [mapFile]: v4map() }, [mapFile])
    const ours = snap({ [mapFile]: v4map() }, [mapFile])
    // 真实字段（名称）变化：hash 不同 → write 携带完整 theirs 值
    const renamed = snap(
      { [mapFile]: v4map({ layers: [{ id: 'L1', name: '顶层', tiles: [[0], [0]] }] }) },
      [mapFile],
    )
    const plan = createMigrationPlan(base, ours, renamed)
    expect(plan.writes.get(mapFile)).toEqual(
      v4map({ layers: [{ id: 'L1', name: '顶层', tiles: [[0], [0]] }] }),
    )
    expect(plan.conflicts).toEqual([])
  })

  test('仅未建模扩展字段不同的地图按 canonical 字节视为同版本', () => {
    const base = snap({ [mapFile]: v4map() }, [mapFile])
    const plan = createMigrationPlan(base, base, snap({ [mapFile]: v4map({ meta: 1 }) }, [mapFile]))
    expect(plan.writes.size).toBe(0)
    expect(plan.conflicts).toEqual([])
  })
})
