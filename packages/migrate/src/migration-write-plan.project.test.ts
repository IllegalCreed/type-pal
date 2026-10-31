/** Project write/delete bytes, observed hashes and contradictory planning inputs. */

import { createHash } from 'node:crypto'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { guardFixture, put, tree } from './__tests__/migration-guard-fixture.js'
import type { MigrationJson } from './migration-files.js'
import {
  loadProjectMigrationSnapshot,
  type ProjectMigrationSnapshot,
} from './migration-project-io.js'
import { buildMigrationTransactionChanges } from './migration-write-plan.js'

describe('project changes and snapshot consistency', () => {
  type BuildArgs = Parameters<typeof buildMigrationTransactionChanges>[0]

  const roots: string[] = []

  function fixture() {
    const f = guardFixture()
    roots.push(f.root)
    return f
  }

  const digest = (raw: string) => createHash('sha256').update(raw).digest('hex')

  const baseArgs = (repo: string): BuildArgs => ({
    repo,
    plan: { writes: new Map(), deletes: [] },
    projectSnapshot: loadProjectMigrationSnapshot(repo, new Set()),
    nextBaseline: { files: new Map(), managedFiles: new Set() },
  })

  const mapValue = (collision: number): MigrationJson => ({
    version: 4,
    width: 1,
    height: 1,
    tilesetRefs: ['tileset-001'],
    layers: [{ id: 'floor', name: '底', tiles: [[0], [0]], sources: [[0], [0]] }],
    collision: [[collision], [0]],
  })

  // Independently written canonical bytes; do not compute this oracle with the production formatter.
  const mapBytes = `{
  "version": 4,
  "width": 1,
  "height": 1,
  "tilesetRefs": ["tileset-001"],
  "layers": [
    {
      "id": "floor",
      "name": "底",
      "tiles": [
        [0],
        [0]
      ]
    }
  ],
  "collision": [
    [1],
    [0]
  ]
}
`

  const path = 'content/items.json'

  const argsFor = (repo: string, projectSnapshot: ProjectMigrationSnapshot): BuildArgs => ({
    repo,
    plan: { writes: new Map([[path, [{ id: 'generated' }]]]), deletes: [] },
    projectSnapshot,
    nextBaseline: { files: new Map(), managedFiles: new Set() },
  })

  const raw = '[ { "id": "old" } ]\r\n'

  const expectedContent = '[\n  {\n    "id": "generated"\n  }\n]\n'

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  test('map write delegates canonical bytes and retains the observed raw-byte anchor', () => {
    const f = fixture()
    const path = 'content/maps/map-001.json'
    const raw = JSON.stringify(mapValue(0))
    put(join(f.repo, 'projects/pal', path), raw)
    const args: BuildArgs = {
      ...baseArgs(f.repo),
      plan: { writes: new Map([[path, mapValue(1)]]), deletes: [] },
      projectSnapshot: loadProjectMigrationSnapshot(f.repo, new Set([path])),
    }
    const before = structuredClone(args)
    const filesBefore = tree(f.root)
    const changes = buildMigrationTransactionChanges(args)
    expect(changes.filter((change) => change.scope === 'project')).toEqual([
      {
        target: `projects/pal/${path}`,
        scope: 'project',
        content: mapBytes,
        expectedPreviousHash: digest(raw),
      },
    ])
    expect(args).toEqual(before)
    expect(tree(f.root)).toEqual(filesBefore)
  })

  test('explicit deletion of an observed absent target carries null and no content', () => {
    const f = fixture()
    const path = 'content/gone.json'
    const changes = buildMigrationTransactionChanges({
      ...baseArgs(f.repo),
      plan: { writes: new Map(), deletes: [path] },
      projectSnapshot: loadProjectMigrationSnapshot(f.repo, new Set([path])),
    })
    expect(changes.filter((change) => change.scope === 'project')).toEqual([
      { target: `projects/pal/${path}`, scope: 'project', expectedPreviousHash: null },
    ])
  })

  test('deletion of an existing target carries its observed raw-byte hash and no content', () => {
    const f = fixture()
    const path = 'content/present.json'
    const raw = '[ { "id": "p" } ]\r\n'
    put(join(f.repo, 'projects/pal', path), raw)
    const changes = buildMigrationTransactionChanges({
      ...baseArgs(f.repo),
      plan: { writes: new Map(), deletes: [path] },
      projectSnapshot: loadProjectMigrationSnapshot(f.repo, new Set([path])),
    })
    expect(changes.filter((change) => change.scope === 'project')).toEqual([
      { target: `projects/pal/${path}`, scope: 'project', expectedPreviousHash: digest(raw) },
    ])
  })

  test('invalid retirement diagnostics identify the exact resource and path without writes', () => {
    const f = fixture()
    const before = tree(f.root)
    expect(() =>
      buildMigrationTransactionChanges({
        ...baseArgs(f.repo),
        retiredAssets: [
          { id: 'ret-1', path: 'assets/other/x.png', expectedSha256: 'a'.repeat(64) },
        ],
      }),
    ).toThrow('退役迁移资源计划无效: ret-1 -> assets/other/x.png')
    expect(tree(f.root)).toEqual(before)
  })

  test('a JSON write and retirement cannot claim the same target', () => {
    const f = fixture()
    const path = 'assets/migrated/dup.json'
    const raw = '{"tag":"old"}'
    put(join(f.repo, 'projects/pal', path), raw)
    const before = tree(f.root)
    // Deliberately contradictory planning DTOs must be rejected before any transaction exists.
    expect(() =>
      buildMigrationTransactionChanges({
        ...baseArgs(f.repo),
        plan: { writes: new Map([[path, { tag: 'next' }]]), deletes: [] },
        projectSnapshot: loadProjectMigrationSnapshot(f.repo, new Set([path])),
        retiredAssets: [{ id: 'ret-1', path, expectedSha256: digest(raw) }],
      }),
    ).toThrow('迁移写入计划包含重复工程目标')
    expect(tree(f.root)).toEqual(before)
  })

  test('rejects a write target that was never observed', () => {
    const f = fixture()
    const args = argsFor(f.repo, loadProjectMigrationSnapshot(f.repo, new Set()))
    const before = structuredClone(args)
    expect(() => buildMigrationTransactionChanges(args)).toThrow(`工程目标未纳入规划快照: ${path}`)
    expect(args).toEqual(before)
  })

  test('rejects an observed body whose raw-byte hash was removed', () => {
    const f = fixture()
    put(join(f.repo, 'projects/pal', path), raw)
    const snapshot = loadProjectMigrationSnapshot(f.repo, new Set([path]))
    snapshot.hashes.delete(path) // Corrupt one public snapshot index at the validation boundary.
    const args = argsFor(f.repo, snapshot)
    const before = structuredClone(args)
    expect(() => buildMigrationTransactionChanges(args)).toThrow(
      `工程规划快照缺原始字节 hash: ${path}`,
    )
    expect(args).toEqual(before)
  })

  test('rejects an observed raw-byte hash whose body was removed', () => {
    const f = fixture()
    put(join(f.repo, 'projects/pal', path), raw)
    const snapshot = loadProjectMigrationSnapshot(f.repo, new Set([path]))
    snapshot.files.delete(path) // The inverse inconsistency must also fail closed.
    const args = argsFor(f.repo, snapshot)
    const before = structuredClone(args)
    expect(() => buildMigrationTransactionChanges(args)).toThrow(
      `工程规划快照缺原始字节 hash: ${path}`,
    )
    expect(args).toEqual(before)
  })

  test('an existing write uses the observed raw-byte hash and independently specified output bytes', () => {
    const f = fixture()
    put(join(f.repo, 'projects/pal', path), raw)
    const args = argsFor(f.repo, loadProjectMigrationSnapshot(f.repo, new Set([path])))
    const before = structuredClone(args)
    const filesBefore = tree(f.root)
    const changes = buildMigrationTransactionChanges(args)
    expect(changes.filter((change) => change.scope === 'project')).toEqual([
      {
        target: `projects/pal/${path}`,
        scope: 'project',
        content: expectedContent,
        expectedPreviousHash: createHash('sha256').update(raw).digest('hex'),
      },
    ])
    expect(args).toEqual(before)
    expect(tree(f.root)).toEqual(filesBefore)
  })

  test('an observed absent write uses a null precondition', () => {
    const f = fixture()
    const args = argsFor(f.repo, loadProjectMigrationSnapshot(f.repo, new Set([path])))
    const before = structuredClone(args)
    const changes = buildMigrationTransactionChanges(args)
    expect(changes.filter((change) => change.scope === 'project')).toEqual([
      {
        target: `projects/pal/${path}`,
        scope: 'project',
        content: expectedContent,
        expectedPreviousHash: null,
      },
    ])
    expect(args).toEqual(before)
  })
})
