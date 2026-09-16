/**
 * TEST-FOUNDATION-COVERAGE-1 D3/D4：createMigrationPlan 分类/summary/稳定性与
 * 原子地图三方组合（migration-plan.ts:30-217）。禁止磁盘入口：只用 snapshotOf 构造。
 */

import { isDeepStrictEqual } from 'node:util'
import { describe, expect, test } from 'vitest'
import { serializeMigrationJson, sha256 } from './migration-baseline.js'
import { createMigrationPlan, snapshotOf } from './migration-plan.js'
import type { MigrationJson } from './pal-migration.js'

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

describe('createMigrationPlan · 分类与 summary', () => {
  test('保留/新增/删除/未管理文件：精确 target/writes/deletes/summary', () => {
    const base = snap({ 'content/a.json': { v: 1 }, 'content/old.json': { x: 1 } }, [
      'content/a.json',
      'content/old.json',
    ])
    const ours = snap({ 'content/a.json': { v: 1 }, 'content/old.json': { x: 1 } }, [
      'content/a.json',
      'content/old.json',
    ])
    const theirs = snap({ 'content/a.json': { v: 2 } }, ['content/a.json'])
    const plan = createMigrationPlan(base, ours, theirs)
    // a: ours=base, theirs 改 → generated + write(theirs)
    // old: ours 有且=base, theirs 缺 → 也计入 generated(上游删除被采纳) + deletes
    expect(plan.summary).toEqual({
      managed: 2,
      generated: 2,
      kept: 0,
      merged: 0,
      writes: 1,
      deletes: 1,
      conflicts: 0,
    })
    expect([...plan.writes.keys()]).toEqual(['content/a.json'])
    expect(plan.writes.get('content/a.json')).toEqual({ v: 2 })
    expect(plan.deletes).toEqual(['content/old.json'])

    // 未管理文件：ours 有但不在 managedFiles → 不进 target/writes/deletes
    const oursUnmanaged = snap({ 'content/a.json': { v: 1 }, 'content/untracked.json': { z: 1 } }, [
      'content/a.json',
    ])
    const plan2 = createMigrationPlan(base, oursUnmanaged, base)
    expect(plan2.writes.has('content/untracked.json')).toBe(false)
    expect(plan2.deletes).toEqual([])
  })

  test('保留方向：ours 改 + theirs=base → kept，不产生 write（磁盘已是作者版）', () => {
    const base = snap({ 'content/a.json': { v: 1 } }, ['content/a.json'])
    const ours = snap({ 'content/a.json': { v: 9 } }, ['content/a.json'])
    const plan = createMigrationPlan(base, ours, base)
    expect(plan.summary.kept).toBe(1)
    expect(plan.writes.size).toBe(0)
    expect(plan.target.get('content/a.json')).toEqual({ v: 9 })
  })

  test('冲突时：全部文件的 writes/deletes 清空（含无关净改文件与待删除文件），target 仍含作者侧值', () => {
    const managed = ['content/a.json', 'content/b.json', 'content/delete.json']
    const base = snap(
      { 'content/a.json': { v: 1 }, 'content/b.json': { w: 1 }, 'content/delete.json': { d: 1 } },
      managed,
    )
    const ours = snap(
      { 'content/a.json': { v: 2 }, 'content/b.json': { w: 1 }, 'content/delete.json': { d: 1 } },
      managed,
    )
    // a 冲突；b 为 ours=base + theirs 净改；delete 为 theirs 删除 + ours 未动（若无冲突本应产生 write/delete）
    const theirs = snap({ 'content/a.json': { v: 3 }, 'content/b.json': { w: 9 } }, managed)
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts).toHaveLength(1)
    expect(plan.conflicts[0]!.file).toBe('content/a.json')
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])
    expect(plan.target.get('content/a.json')).toEqual({ v: 2 })
    // 反证（同 fixture 正控）：消除 a 冲突后 b 正常 write、delete 正常删除
    const theirsClean = snap({ 'content/a.json': { v: 2 }, 'content/b.json': { w: 9 } }, managed)
    const cleanPlan = createMigrationPlan(base, ours, theirsClean)
    expect(cleanPlan.writes.get('content/b.json')).toEqual({ w: 9 })
    expect(cleanPlan.deletes).toEqual(['content/delete.json'])
  })

  test('同输入重复调用稳定且三侧输入快照（files/managedFiles/hashes）均不被修改', () => {
    const base = snap({ 'content/a.json': { v: 1 } }, ['content/a.json'])
    const ours = snap({ 'content/a.json': { v: 1 } }, ['content/a.json'])
    const theirs = snap({ 'content/a.json': { v: 2 } }, ['content/a.json'])
    const cloneSnapshot = (s: typeof base) => ({
      files: [...s.files],
      managedFiles: [...s.managedFiles],
      hashes: s.hashes ? [...s.hashes] : undefined,
    })
    const before = {
      base: cloneSnapshot(base),
      ours: cloneSnapshot(ours),
      theirs: cloneSnapshot(theirs),
    }
    const p1 = createMigrationPlan(base, ours, theirs)
    const p2 = createMigrationPlan(base, ours, theirs)
    expect(isDeepStrictEqual(p1, p2)).toBe(true)
    expect(isDeepStrictEqual(cloneSnapshot(base), before.base)).toBe(true)
    expect(isDeepStrictEqual(cloneSnapshot(ours), before.ours)).toBe(true)
    expect(isDeepStrictEqual(cloneSnapshot(theirs), before.theirs)).toBe(true)
  })
})

describe('createMigrationPlan · 原子地图（字节/hash 合同）', () => {
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

  test('theirs 删除 + ours 未动 → deletes 含该图；ours 侧已缺席则无需 delete；双方异改 → value 冲突', () => {
    const base = snap({ [mapFile]: v4map() }, [mapFile])
    // theirs 缺席、ours=base(磁盘仍在) → 计划删除磁盘文件
    const plan = createMigrationPlan(base, base, snap({}, [mapFile]))
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([mapFile])
    // ours 侧已缺席(磁盘无文件) → 不需要 delete 条目
    const oursGone = createMigrationPlan(base, snap({}, [mapFile]), base)
    expect(oursGone.writes.size).toBe(0)
    expect(oursGone.deletes).toEqual([])

    const conflictPlan = createMigrationPlan(
      base,
      snap({ [mapFile]: v4map({ tilesetRefs: ['t2'] }) }, [mapFile]),
      snap({ [mapFile]: v4map({ tilesetRefs: ['t3'] }) }, [mapFile]),
    )
    expect(conflictPlan.conflicts[0]!.type).toBe('value')
    expect(conflictPlan.conflicts[0]!.path).toBe('/')
  })

  test('真实字段变化产生 write；未知字段经 canonical 序列化归一 → 字节合同下同版本无 write', () => {
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
    // 未知字段/键序差异：formatProjectMap canonical 序列化归一 → hash 相同 → 无 write
    const plan2 = createMigrationPlan(
      base,
      ours,
      snap({ [mapFile]: v4map({ meta: 1 }) }, [mapFile]),
    )
    expect(plan2.writes.size).toBe(0)
    // 字节合同直证：两次独立构造的等值图序列化字节相同（同 hash）；
    // 不同值（真实字段）序列化字节不同（hash 不同）——非自比较
    expect(sha256(serializeMigrationJson(v4map(), mapFile))).toBe(
      sha256(serializeMigrationJson(v4map({ tilesetRefs: ['t'] }), mapFile)),
    )
    expect(sha256(serializeMigrationJson(v4map(), mapFile))).not.toBe(
      sha256(
        serializeMigrationJson(
          v4map({ layers: [{ id: 'L1', name: '顶层', tiles: [[0], [0]] }] }),
          mapFile,
        ),
      ),
    )
  })
})
