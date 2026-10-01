/** TEST-GLM-WAVE-O-1 O02：迁移计划（createMigrationPlan/snapshotOf）的原子地图
 *  hash-only 选取、冲突分类与输入不可变合同。旧证：migration-plan.test.ts 覆盖常规
 *  写/删/冲突计数；本卡补齐 gap-map 缺口：hashVersion、delete-modify/add-add 分类、
 *  hash-only 正文回填与“只有 hash 缺正文”fail-loud。
 */
import { describe, expect, test } from 'vitest'
import type { MigrationJson } from './migration-files.js'
import {
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
} from './migration-baseline.js'
import { createMigrationPlan, snapshotOf } from './migration-plan.js'
import { convertSourceTilemap } from './project-map-converter.js'

const MAP = 'content/maps/map-001.json'
const DOC = 'content/scenes/s000.json'

const SOURCE_TILEMAP = {
  width: 1,
  height: 1,
  tileset: 'tileset/1.rle',
  cells: [[{ lower: 0, upper: 0 }]],
}

/** 真实合法 ProjectMap（经 convertSourceTilemap 构造，n 只进入 collision 以制造版本差）；
 *  经 JSON 往返深克隆为 MigrationJson（与产品 asJson 同一克隆边界）。 */
const mapV = (n: number): MigrationJson => {
  const map = convertSourceTilemap(1, SOURCE_TILEMAP)
  map.collision[0]![0] = n
  return JSON.parse(JSON.stringify(map)) as MigrationJson
}

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
    files.set(path, JSON.parse(JSON.stringify(value)) as MigrationJson)
  }
  return { files, managedFiles: new Set([...files.keys(), ...hashes.keys()]), hashes }
}

describe('O02 createMigrationPlan：原子地图 hash-only 与冲突分类', () => {
  test('base/theirs 均以 hash-only 存图、ours 有同 hash 正文 → 选中版本从 ours 回填正文', () => {
    const base = snap([[MAP, mapV(1)]], [MAP])
    const ours = snap([[MAP, mapV(1)]])
    const theirs = snap([[MAP, mapV(1)]], [MAP])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get(MAP)).toEqual(mapV(1))
  })

  test('base hash-only、ours 同 hash 正文、theirs 更新 → 采纳 theirs 更新', () => {
    const base = snap([[MAP, mapV(1)]], [MAP])
    const ours = snap([[MAP, mapV(1)]])
    const theirs = snap([[MAP, mapV(2)]])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get(MAP)).toEqual(mapV(2))
  })

  test('base hash-only 且选中版本缺正文、无同 hash 正文可回填 → fail-loud', () => {
    const base = snap([[MAP, mapV(1)]], [MAP])
    const ours = snap([[MAP, mapV(9)]], [MAP])
    const theirs = snap([[MAP, mapV(9)]], [MAP])
    expect(() => createMigrationPlan(base, ours, theirs)).toThrow(
      `原子地图 ${MAP} 选中版本只有 hash、缺正文`,
    )
  })

  test('原子地图三方各改各的 → value 冲突，冲突快照带 hash 版本', () => {
    const base = snap([[MAP, mapV(1)]])
    const ours = snap([[MAP, mapV(2)]])
    const theirs = snap([[MAP, mapV(3)]])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts).toHaveLength(1)
    expect(plan.conflicts[0]).toMatchObject({ file: MAP, path: '/', type: 'value' })
    // 原子地图冲突快照带 hash 版本（不含正文，省体积）。
    const oursSnapshot = plan.conflicts[0]!.ours.value as { sha256?: string }
    const baseSnapshot = plan.conflicts[0]!.base.value as { sha256?: string }
    const theirsSnapshot = plan.conflicts[0]!.theirs.value as { sha256?: string }
    expect(oursSnapshot.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(baseSnapshot.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(theirsSnapshot.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(baseSnapshot.sha256).not.toBe(oursSnapshot.sha256)
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
})

describe('O02 createMigrationPlan：普通文件、写入/删除与输入不可变', () => {
  test('普通文件经三方合并进入 target；summary 计数一致', () => {
    const base = snap([
      [DOC, { entities: [{ id: 'e1' }] }],
      ['content/shops.json', [{ id: 1 }]],
    ])
    const ours = snap([
      [DOC, { entities: [{ id: 'e1' }, { id: 'e2' }] }],
      ['content/shops.json', [{ id: 1 }]],
    ])
    const theirs = snap([
      [DOC, { entities: [{ id: 'e1' }] }],
      ['content/shops.json', [{ id: 1 }, { id: 2 }]],
    ])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get(DOC)).toEqual({ entities: [{ id: 'e1' }, { id: 'e2' }] })
    expect(plan.target.get('content/shops.json')).toEqual([{ id: 1 }, { id: 2 }])
    expect(plan.writes.has(DOC)).toBe(false)
    expect(plan.summary.managed).toBe(plan.target.size)
  })

  test('theirs 新增文件进入 writes；theirs 删除的托管文件进入 deletes', () => {
    const base = snap([
      [DOC, { v: 1 }],
      ['content/extra.json', { old: true }],
    ])
    const ours = snap([
      [DOC, { v: 1 }],
      ['content/extra.json', { old: true }],
    ])
    const theirs = snap([
      [DOC, { v: 2 }],
      ['content/new.json', { added: true }],
    ])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.writes.has('content/new.json')).toBe(true)
    expect(plan.deletes).toEqual(['content/extra.json'])
    expect(plan.target.has('content/extra.json')).toBe(false)
  })

  test('ours 独有的新增文件（base/theirs 均无）保留在 target 且不进 deletes', () => {
    const base = snap([[DOC, { v: 1 }]])
    const ours = snap([
      [DOC, { v: 1 }],
      ['content/extra.json', { keep: true }],
    ])
    const theirs = snap([[DOC, { v: 2 }]])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.deletes).toEqual([])
    expect(plan.target.get('content/extra.json')).toEqual({ keep: true })
  })

  test('重放同一 publication：writes/deletes/conflicts 全零', () => {
    const base = snap([[DOC, { v: 1 }]])
    const ours = snap([[DOC, { v: 1 }]])
    const theirs = snap([[DOC, { v: 2 }]])
    const first = createMigrationPlan(base, ours, theirs)
    const published = { files: new Map(first.target), managedFiles: new Set(first.target.keys()) }
    const replay = createMigrationPlan(snapshotOf(published), snapshotOf(published), theirs)
    expect(replay.summary).toMatchObject({ writes: 0, deletes: 0, conflicts: 0 })
  })

  test('snapshotOf 为每个文件产出序列化 hash 且原子地图走专用格式化', () => {
    const snapshot = snap([
      [MAP, mapV(1)],
      [DOC, { v: 1 }],
    ])
    const withHashes = snapshotOf({ files: snapshot.files, managedFiles: snapshot.managedFiles })
    expect(withHashes.hashes!.get(DOC)).toBe(sha256(`${JSON.stringify({ v: 1 }, null, 2)}\n`))
    expect(withHashes.hashes!.has(MAP)).toBe(true)
  })

  test('createMigrationPlan 不修改三个输入快照（输入不可变）', () => {
    const base = snap([[DOC, { v: 1 }]])
    const ours = snap([[DOC, { v: 1 }]])
    const theirs = snap([[DOC, { v: 2 }]])
    const before = JSON.stringify([
      [...base.files],
      [...ours.files],
      [...theirs.files],
      [...base.managedFiles],
      [...ours.managedFiles],
      [...theirs.managedFiles],
    ])
    createMigrationPlan(base, ours, theirs)
    const after = JSON.stringify([
      [...base.files],
      [...ours.files],
      [...theirs.files],
      [...base.managedFiles],
      [...ours.managedFiles],
      [...theirs.managedFiles],
    ])
    expect(after).toBe(before)
  })

  test('计划 target 与输入文件 Map 无别名（改 target 不影响 theirs）', () => {
    const base = snap([[DOC, { v: 1 }]])
    const ours = snap([[DOC, { v: 1 }]])
    const theirs = snap([[DOC, { v: 2 }]])
    const plan = createMigrationPlan(base, ours, theirs)
    ;(plan.target.get(DOC) as { v: number }).v = 999
    expect(theirs.files.get(DOC)).toEqual({ v: 2 })
  })
})

describe('O02 createMigrationPlan：summary 计数与冲突停线', () => {
  test('只有 theirs（生成侧）改动 → generated；只有 ours（作者侧）改动 → kept', () => {
    const base = snap([[DOC, { v: 1 }]])
    const oursOnly = createMigrationPlan(base, snap([[DOC, { v: 2 }]]), snap([[DOC, { v: 1 }]]))
    expect(oursOnly.summary.kept).toBe(1)
    expect(oursOnly.summary.generated).toBe(0)
    const theirsOnly = createMigrationPlan(base, snap([[DOC, { v: 1 }]]), snap([[DOC, { v: 3 }]]))
    expect(theirsOnly.summary.generated).toBe(1)
    expect(theirsOnly.summary.kept).toBe(0)
  })

  test('双方各自改动同一普通文件的不同字段 → merged 计数', () => {
    const base = snap([[DOC, { v: 1, w: 0 }]])
    const ours = snap([[DOC, { v: 2, w: 0 }]])
    const theirs = snap([[DOC, { v: 1, w: 5 }]])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get(DOC)).toEqual({ v: 2, w: 5 })
    expect(plan.summary.merged).toBe(1)
  })

  test('原子地图 ours 改、theirs 同 base → theirs 更新进入 writes', () => {
    const base = snap([[MAP, mapV(1)]])
    const ours = snap([[MAP, mapV(1)]])
    const theirs = snap([[MAP, mapV(5)]])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts).toEqual([])
    expect(plan.writes.has(MAP)).toBe(true)
  })

  test('存在冲突时 writes/deletes 全空（停线）', () => {
    const base = snap([[DOC, { v: 1 }]])
    const plan = createMigrationPlan(base, snap([[DOC, { v: 2 }]]), snap([[DOC, { v: 3 }]]))
    expect(plan.conflicts).toHaveLength(1)
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])
    expect(plan.summary.conflicts).toBe(1)
  })

  test('summary.managed = 三方托管并集（含仅存在于单方的文件）', () => {
    const base = snap([['a.json', {}]])
    const ours = snap([
      ['a.json', {}],
      ['b.json', {}],
    ])
    const theirs = snap([
      ['a.json', {}],
      ['c.json', {}],
    ])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.summary.managed).toBe(3)
  })
})
