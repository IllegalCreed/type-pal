import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from './migration-baseline.js'
import { createInitialMigrationPlan, createMigrationPlan, snapshotOf } from './migration-plan.js'
import type { MigrationFileSet, MigrationJson } from './pal-migration.js'

const snapshot = (files: Record<string, MigrationJson>): MigrationSnapshot => ({
  files: new Map(Object.entries(files)),
  managedFiles: new Set(Object.keys(files)),
})
const generated = (
  files: Record<string, MigrationJson>,
): Pick<MigrationFileSet, 'files' | 'managedFiles'> => ({
  files: new Map(Object.entries(files)),
  managedFiles: new Set(Object.keys(files)),
})

const projectMap = (tile: number): MigrationJson => ({
  version: 2,
  width: 1,
  height: 1,
  tilesetId: 'tileset-001',
  layers: [
    {
      id: 'floor',
      name: '地板',
      depthMode: 'height',
      tiles: [[tile], [tile]],
      heights: [[0], [0]],
    },
  ],
  collision: [[0], [0]],
})

describe('createMigrationPlan', () => {
  test('独立吸收上游和人工字段并只计划真实变化', () => {
    const base = snapshot({ 'content/locale.json': { a: 1, b: 1 } })
    const ours = snapshot({ 'content/locale.json': { a: 2, b: 1 } })
    const plan = createMigrationPlan(
      base,
      ours,
      generated({ 'content/locale.json': { a: 1, b: 3 } }),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get('content/locale.json')).toEqual({ a: 2, b: 3 })
    expect(plan.summary).toMatchObject({ writes: 1, conflicts: 0 })
  })

  test('冲突时严格零写盘计划', () => {
    const base = snapshot({ 'content/locale.json': { a: 1 } })
    const ours = snapshot({ 'content/locale.json': { a: 2 } })
    const plan = createMigrationPlan(base, ours, generated({ 'content/locale.json': { a: 3 } }))
    expect(plan.conflicts).toHaveLength(1)
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])
  })

  test('生成文件退役只删托管文件', () => {
    const base = snapshot({ 'content/old.json': { a: 1 } })
    const ours = snapshot({ 'content/old.json': { a: 1 } })
    const plan = createMigrationPlan(base, ours, generated({}))
    expect(plan.deletes).toEqual(['content/old.json'])
  })

  test('当前 index 引用的 ours-only 文件会保留', () => {
    const base = snapshot({})
    const ours = snapshot({ 'content/scripts/chunks/manual.json': { id: 'manual' } })
    const plan = createMigrationPlan(base, ours, generated({}))
    expect(plan.target.get('content/scripts/chunks/manual.json')).toEqual({ id: 'manual' })
    expect(plan.deletes).toEqual([])
  })

  test('脚本按稳定 id 合并并忽略双方 bytes/hash/imports 派生差异', () => {
    const index = (bytes: number, hash: string): MigrationJson => ({
      version: 1,
      shards: { shared: 1, global: {} },
      chunks: {
        'shared/c00': {
          path: 'chunks/shared/c00.json',
          bytes,
          hash,
          imports: [`derived-${hash}`],
        },
      },
    })
    const chunk = (left: number, right: number, imports: string[]): MigrationJson => ({
      version: 1,
      id: 'shared/c00',
      imports,
      scripts: {
        'shared/L_1/default': [{ kind: 'wait', ms: left }],
        'shared/L_2/default': [{ kind: 'wait', ms: right }],
      },
    })
    const path = 'content/scripts/chunks/shared/c00.json'
    const base = snapshot({
      'content/scripts/index.json': index(1, 'base'),
      [path]: chunk(1, 1, ['base']),
    })
    const ours = snapshot({
      'content/scripts/index.json': index(2, 'ours'),
      [path]: chunk(2, 1, ['ours']),
    })
    const plan = createMigrationPlan(
      base,
      ours,
      generated({
        'content/scripts/index.json': index(3, 'theirs'),
        [path]: chunk(1, 3, ['theirs']),
      }),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get(path)).toMatchObject({
      scripts: {
        'shared/L_1/default': [{ kind: 'wait', ms: 2 }],
        'shared/L_2/default': [{ kind: 'wait', ms: 3 }],
      },
    })
  })

  test('脚本跨 chunk 重分桶时保留人工 body 并重写所有 ref.chunk', () => {
    const shards = { shared: 1, global: {} }
    const rootId = 'scene/s001/root/a'
    const targetId = 'scene/s001/target'
    const chunk = (id: string, refChunk: string, wait: number): MigrationJson => ({
      version: 1,
      id,
      scripts: {
        [rootId]: [
          { kind: 'callScript', ref: { chunk: refChunk, id: targetId } },
          { kind: 'wait', ms: wait },
        ],
        [targetId]: [{ kind: 'stopScript' }],
      },
    })
    const index = (id: string): MigrationJson => ({
      version: 1,
      shards,
      chunks: { [id]: { path: `chunks/${id}.json`, bytes: 1, hash: id } },
    })
    const legacyPath = 'content/scripts/chunks/legacy.json'
    const targetPath = 'content/scripts/chunks/scene/s001.json'
    const base = snapshot({
      'content/scripts/index.json': index('legacy'),
      [legacyPath]: chunk('legacy', 'legacy', 1),
    })
    const ours = snapshot({
      'content/scripts/index.json': index('legacy'),
      [legacyPath]: chunk('legacy', 'legacy', 2),
    })
    const plan = createMigrationPlan(
      base,
      ours,
      generated({
        'content/scripts/index.json': index('scene/s001'),
        [targetPath]: chunk('scene/s001', 'scene/s001', 1),
      }),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.deletes).toContain(legacyPath)
    expect(plan.target.get(targetPath)).toMatchObject({
      id: 'scene/s001',
      scripts: {
        [rootId]: [
          { kind: 'callScript', ref: { chunk: 'scene/s001', id: targetId } },
          { kind: 'wait', ms: 2 },
        ],
      },
    })
  })

  test('ours-only 作者目录与作者 body 可和 theirs 同 shard 内部脚本无冲突合并', () => {
    const authoredId = 'shared/user/demo-a1b2c3d4'
    const internalId = 'shared/L_1/default'
    const chunkId = 'shared/c00'
    const path = 'content/scripts/chunks/shared/c00.json'
    const makeIndex = (library?: MigrationJson): MigrationJson => ({
      version: 1,
      shards: { shared: 1, global: {} },
      chunks: { [chunkId]: { path: 'chunks/shared/c00.json', bytes: 1 } },
      ...(library ? { library } : {}),
    })
    const makeChunk = (internalWait: number, authoredWait?: number): MigrationJson => ({
      version: 1,
      id: chunkId,
      scripts: {
        [internalId]: [{ kind: 'wait', ms: internalWait }],
        ...(authoredWait === undefined
          ? {}
          : { [authoredId]: [{ kind: 'wait', ms: authoredWait }] }),
      },
    })
    const authorLibrary: MigrationJson = {
      [authoredId]: { name: '演示', self: 'none' },
    }
    const plan = createMigrationPlan(
      snapshot({ 'content/scripts/index.json': makeIndex(), [path]: makeChunk(1) }),
      snapshot({
        'content/scripts/index.json': makeIndex(authorLibrary),
        [path]: makeChunk(1, 9),
      }),
      generated({ 'content/scripts/index.json': makeIndex(), [path]: makeChunk(2) }),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get('content/scripts/index.json')).toMatchObject({ library: authorLibrary })
    expect(plan.target.get(path)).toMatchObject({
      scripts: {
        [internalId]: [{ kind: 'wait', ms: 2 }],
        [authoredId]: [{ kind: 'wait', ms: 9 }],
      },
    })
  })

  test('双方修改同一作者 body 时显式冲突且零写盘', () => {
    const authoredId = 'shared/user/demo-a1b2c3d4'
    const chunkId = 'shared/c00'
    const path = 'content/scripts/chunks/shared/c00.json'
    const index: MigrationJson = {
      version: 1,
      shards: { shared: 1, global: {} },
      chunks: { [chunkId]: { path: 'chunks/shared/c00.json', bytes: 1 } },
      library: { [authoredId]: { name: '演示', self: 'none' } },
    }
    const chunk = (ms: number): MigrationJson => ({
      version: 1,
      id: chunkId,
      scripts: { [authoredId]: [{ kind: 'wait', ms }] },
    })
    const plan = createMigrationPlan(
      snapshot({ 'content/scripts/index.json': index, [path]: chunk(1) }),
      snapshot({ 'content/scripts/index.json': index, [path]: chunk(2) }),
      generated({ 'content/scripts/index.json': index, [path]: chunk(3) }),
    )
    expect(plan.conflicts.length).toBeGreaterThan(0)
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])
  })

  test('原子地图 baseline 仅有 hash 时仍按三方规则保作者修改', () => {
    const path = 'content/maps/map-001.json'
    const fullBase = snapshotOf(generated({ [path]: projectMap(1) }))
    const hashOnlyBase: MigrationSnapshot = {
      files: new Map(),
      managedFiles: new Set([path]),
      hashes: fullBase.hashes,
    }
    const plan = createMigrationPlan(
      hashOnlyBase,
      snapshot({ [path]: projectMap(2) }),
      generated({ [path]: projectMap(1) }),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get(path)).toEqual(projectMap(2))
    expect(plan.writes.size).toBe(0)
  })

  test('原子地图 ours=base 时接收新迁移，双方变化时报 hash 冲突', () => {
    const path = 'content/maps/map-001.json'
    const fullBase = snapshotOf(generated({ [path]: projectMap(1) }))
    const hashOnlyBase: MigrationSnapshot = {
      files: new Map(),
      managedFiles: new Set([path]),
      hashes: fullBase.hashes,
    }
    const update = createMigrationPlan(
      hashOnlyBase,
      snapshot({ [path]: projectMap(1) }),
      generated({ [path]: projectMap(2) }),
    )
    expect(update.conflicts).toEqual([])
    expect(update.writes.get(path)).toEqual(projectMap(2))

    const conflict = createMigrationPlan(
      hashOnlyBase,
      snapshot({ [path]: projectMap(2) }),
      generated({ [path]: projectMap(3) }),
    )
    expect(conflict.conflicts).toHaveLength(1)
    expect(conflict.conflicts[0]?.base.value).toHaveProperty('sha256')
    expect(conflict.writes.size).toBe(0)
  })

  test('首次 bootstrap 只写语义变化并删除 target 明确退役项', () => {
    const ours = snapshot({ 'content/a.json': { x: 1 }, 'content/old.json': { x: 1 } })
    const target = snapshot({ 'content/a.json': { x: 1 }, 'content/new.json': { x: 2 } })
    const plan = createInitialMigrationPlan(ours, target)
    expect([...plan.writes]).toEqual([['content/new.json', { x: 2 }]])
    expect(plan.deletes).toEqual(['content/old.json'])
  })
})
