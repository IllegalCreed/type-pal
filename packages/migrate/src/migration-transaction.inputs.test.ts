/** Typed commit preflight; raw persisted journal fields belong to the journal spec. */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { guardFixture, put, tree } from './__tests__/migration-guard-fixture.js'
import {
  commitMigrationTransaction,
  hasPendingMigrationTransaction,
  type TransactionChange,
} from './migration-transaction.js'

describe('typed transaction preflight', () => {
  const roots: string[] = []

  function fixture() {
    const f = guardFixture()
    roots.push(f.root)
    return f
  }

  const write = (target: string, content = 'new\n'): TransactionChange => ({
    target,
    content,
    scope: 'project',
    expectedPreviousHash: null,
  })

  const project = 'projects/pal/content/a.json'

  const manifest = 'projects/pal/manifest.json'

  const asset = 'projects/pal/assets/ready.bin'

  const digest = (body: string) => createHash('sha256').update(body).digest('hex')

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  test.each(['absolute', 'traversal'])('%s target is refused without changing the tree', (kind) => {
    const f = fixture()
    const target = kind === 'absolute' ? join(f.outside, 'keep.txt') : 'projects/pal/../evil.txt'
    put(join(f.outside, 'keep.txt'), 'outside-keep')
    const before = tree(f.root)
    expect(() => commitMigrationTransaction(f.repo, [write(target)])).toThrow(
      `事务目标必须是仓库内相对路径: ${target}`,
    )
    expect(tree(f.root)).toEqual(before)
  })

  test('a leading dot slash is normalized without changing the supplied change', () => {
    const f = fixture(),
      changes = [write(`./${project}`, 'a\n')]
    const before = structuredClone(changes)
    commitMigrationTransaction(f.repo, changes)
    expect(readFileSync(join(f.repo, project), 'utf8')).toBe('a\n')
    expect(changes).toEqual(before)
    expect(hasPendingMigrationTransaction(f.repo)).toBe(false)
  })

  test('normalized duplicate targets are refused before staging', () => {
    const f = fixture(),
      before = tree(f.root)
    expect(() =>
      commitMigrationTransaction(f.repo, [write(project, '1'), write(`./${project}`, '2')]),
    ).toThrow('迁移事务包含重复目标')
    expect(tree(f.root)).toEqual(before)
  })

  test('a malformed project planning hash is refused before staging', () => {
    const f = fixture(),
      before = tree(f.root)
    expect(() =>
      commitMigrationTransaction(f.repo, [
        { target: project, scope: 'project', expectedPreviousHash: 'not-a-hash', content: 'x' },
      ]),
    ).toThrow(`事务 expectedPreviousHash 无效: ${project}`)
    expect(tree(f.root)).toEqual(before)
  })

  test('a malformed commit precondition hash is refused before staging', () => {
    const f = fixture(),
      before = tree(f.root)
    expect(() =>
      commitMigrationTransaction(f.repo, [
        {
          target: manifest,
          scope: 'manifest',
          content: '{}\n',
          preconditions: [{ target: asset, hash: 'xyz' }],
        },
      ]),
    ).toThrow(`事务前置条件 hash 无效: ${manifest}`)
    expect(tree(f.root)).toEqual(before)
  })

  test('project changes cannot carry manifest preconditions', () => {
    const f = fixture(),
      before = tree(f.root)
    expect(() =>
      commitMigrationTransaction(f.repo, [
        { ...write(project), preconditions: [{ target: asset, hash: digest('ready') }] },
      ]),
    ).toThrow(`只有 manifest 操作可以携带前置条件: ${project}`)
    expect(tree(f.root)).toEqual(before)
  })

  test('a manifest commit requires closure preconditions', () => {
    const f = fixture(),
      before = tree(f.root)
    expect(() =>
      commitMigrationTransaction(f.repo, [
        { target: manifest, scope: 'manifest', content: '{}\n' },
      ]),
    ).toThrow('manifest 操作缺资源闭包前置条件')
    expect(tree(f.root)).toEqual(before)
  })

  test('baseline scope cannot publish project content', () => {
    const f = fixture()
    expect(() =>
      commitMigrationTransaction(f.repo, [{ target: project, scope: 'baseline', content: 'x' }]),
    ).toThrow(`baseline scope 目标越界: ${project}`)
    // Validation can leave owned staging; it must not publish either the target or journal.
    expect(existsSync(join(f.repo, project))).toBe(false)
    expect(hasPendingMigrationTransaction(f.repo)).toBe(false)
  })

  test('a typed baseline change with an own undefined planning hash is refused', () => {
    const f = fixture()
    // optional never admits undefined under the current compiler options; own-key policy is runtime.
    const changes: TransactionChange[] = [
      {
        target: 'packages/migrate/baselines/pal/content/a.json',
        scope: 'baseline',
        expectedPreviousHash: undefined,
        content: 'x',
      },
    ]
    const before = tree(f.root)
    expect(() => commitMigrationTransaction(f.repo, changes)).toThrow(
      '只有 project 操作可以携带 expectedPreviousHash: packages/migrate/baselines/pal/content/a.json',
    )
    expect(tree(f.root)).toEqual(before)
  })

  test('two distinct manifest targets are refused by singleton preflight without writes', () => {
    const f = fixture()
    put(join(f.repo, 'projects/pal/assets/ready.bin'), 'ready')
    const preconditions = [
      {
        target: 'projects/pal/assets/ready.bin',
        hash: createHash('sha256').update('ready').digest('hex'),
      },
    ]
    const before = tree(f.root)
    // These typed DTOs deliberately violate manifest singleton/fixed-target rules.
    // Commit checks singleton ordering before journal scope validation or staging.
    expect(() =>
      commitMigrationTransaction(f.repo, [
        { target: 'projects/pal/manifest.json', scope: 'manifest', content: '{}\n', preconditions },
        { target: 'projects/pal/other.json', scope: 'manifest', content: 'x\n', preconditions },
      ]),
    ).toThrow('迁移事务只能包含一个 manifest 操作')
    expect(tree(f.root)).toEqual(before)
  })
})
