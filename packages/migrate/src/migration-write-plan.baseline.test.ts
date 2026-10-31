/** Baseline byte equality, removed ownership and retired hash-only map bodies. */

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { guardFixture, put, tree } from './__tests__/migration-guard-fixture.js'
import { plannedChanges } from './__tests__/planned-changes-fixture.js'
import { loadPalBaseline, type MigrationSnapshot } from './migration-baseline.js'
import type { MigrationPlan } from './migration-plan.js'
import { loadProjectMigrationSnapshot } from './migration-project-io.js'
import { buildMigrationTransactionChanges } from './migration-write-plan.js'

describe('baseline disk projection', () => {
  const roots: string[] = []

  const snap = (paths: string[]): MigrationSnapshot => ({
    files: new Map(paths.map((path) => [path, { kind: 'stub', path }])),
    managedFiles: new Set(paths),
  })

  const emptyPlan = (): Pick<MigrationPlan, 'writes' | 'deletes'> => ({
    writes: new Map(),
    deletes: [],
  })

  function fixture() {
    const f = guardFixture()
    roots.push(f.root)
    return f
  }

  const emptyState = '{\n  "version": 1,\n  "managedFiles": [],\n  "files": {}\n}\n'

  const stateTarget = 'packages/migrate/baselines/pal/_state.json'

  const mapPath = 'content/maps/old.json'

  const mapTarget = `packages/migrate/baselines/pal/${mapPath}`

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  test('baseline 正文按实际字节决定跳过或写入', () => {
    const root = mkdtempSync(join(tmpdir(), 'tb10-wp-'))
    roots.push(root)
    const baselineDir = join(root, 'packages/migrate/baselines/pal')
    mkdirSync(baselineDir, { recursive: true })
    const samePath = join(baselineDir, 'same.json')
    const sameContent = '{\n  "kind": "stub",\n  "path": "same.json"\n}\n'
    const same = snap(['same.json'])
    writeFileSync(samePath, sameContent, 'utf8')
    const unchanged = plannedChanges({ repo: root, plan: emptyPlan(), nextBaseline: same })
    expect(unchanged.map((change) => change.target)).toEqual([
      'packages/migrate/baselines/pal/_state.json',
    ])
    writeFileSync(samePath, `${sameContent} `, 'utf8')
    const changed = plannedChanges({
      repo: root,
      plan: emptyPlan(),
      nextBaseline: same,
    })
    expect(changed.find((change) => change.target.endsWith('/same.json'))).toEqual({
      target: 'packages/migrate/baselines/pal/same.json',
      scope: 'baseline',
      content: sameContent,
    })
  })

  test('baseline 不再托管已有正文时计划删除', () => {
    const root = mkdtempSync(join(tmpdir(), 'tb10-wp-'))
    roots.push(root)
    const dir = join(root, 'packages/migrate/baselines/pal')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'same.json'), '{"kind":"stub","path":"same.json"}', 'utf8')
    const dropped = plannedChanges({
      repo: root,
      plan: emptyPlan(),
      previousBaseline: snap(['same.json']),
      nextBaseline: snap([]),
    })
    const del = dropped.find((change) => change.target.endsWith('same.json'))
    expect(del).toEqual({ target: 'packages/migrate/baselines/pal/same.json', scope: 'baseline' })
  })

  test.each([
    'absent',
    'present',
  ])('a retired hash-only baseline map that is %s follows disk presence', (presence) => {
    const f = fixture()
    // Current atomic-map baselines store a digest in _state, without a map body.
    put(
      join(f.repo, stateTarget),
      JSON.stringify({
        version: 1,
        managedFiles: [mapPath],
        files: { [mapPath]: 'a'.repeat(64) },
      }),
    )
    const previousBaseline = loadPalBaseline(f.repo)
    assert.ok(previousBaseline)
    if (presence === 'present') put(join(f.repo, mapTarget), 'obsolete-owned-body')
    const args: Parameters<typeof buildMigrationTransactionChanges>[0] = {
      repo: f.repo,
      plan: { writes: new Map(), deletes: [] },
      projectSnapshot: loadProjectMigrationSnapshot(f.repo, new Set()),
      previousBaseline,
      nextBaseline: { files: new Map(), managedFiles: new Set() },
    }
    const inputs = structuredClone(args),
      before = tree(f.root)
    const changes = buildMigrationTransactionChanges(args)
    const stateChange = { target: stateTarget, scope: 'baseline', content: emptyState }
    expect(changes).toEqual(
      presence === 'present'
        ? [{ target: mapTarget, scope: 'baseline' }, stateChange]
        : [stateChange],
    )
    expect(args).toEqual(inputs)
    expect(tree(f.root)).toEqual(before)
  })
})
