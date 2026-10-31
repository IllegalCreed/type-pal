/** Publication order, interrupted commits, closure repair and caller-owned changes. */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, rmSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { guardFixture, put, tree } from './__tests__/migration-guard-fixture.js'
import {
  commitMigrationTransaction,
  hasPendingMigrationTransaction,
  recoverMigrationTransaction,
  type TransactionChange,
} from './migration-transaction.js'

describe('project baseline and manifest publication', () => {
  const roots: string[] = []

  function fixture() {
    const f = guardFixture()
    roots.push(f.root)
    return f
  }

  const digest = (body: string) => createHash('sha256').update(body).digest('hex')

  const retired = 'projects/pal/assets/migrated/faces/retired.png'

  const project = 'projects/pal/content/a.json'

  const baseline = 'packages/migrate/baselines/pal/content/a.json'

  const projectWrite = (content: string): TransactionChange => ({
    target: project,
    scope: 'project',
    expectedPreviousHash: null,
    content,
  })

  const state = 'packages/migrate/baselines/pal/_state.json'

  const manifest = 'projects/pal/manifest.json'

  const asset = 'projects/pal/assets/sound.wav'

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  test('a stale planned hash refuses retirement without staging or altering files', () => {
    const f = fixture()
    put(join(f.repo, retired), 'current')
    const before = tree(f.root)
    expect(() =>
      commitMigrationTransaction(f.repo, [
        { target: retired, scope: 'project', expectedPreviousHash: digest('stale') },
      ]),
    ).toThrow(`事务目标已偏离规划快照: ${retired}`)
    expect(tree(f.root)).toEqual(before)
  })

  test('a matching planned hash permits retirement and cleans the journal', () => {
    const f = fixture()
    put(join(f.repo, retired), 'current')
    commitMigrationTransaction(f.repo, [
      { target: retired, scope: 'project', expectedPreviousHash: digest('current') },
    ])
    expect(existsSync(join(f.repo, retired))).toBe(false)
    expect(recoverMigrationTransaction(f.repo)).toBe(false)
  })

  test('commit publishes both project and baseline bytes without mutating its input', () => {
    const f = fixture()
    const changes: TransactionChange[] = [
      projectWrite('new-project\n'),
      { target: baseline, scope: 'baseline', content: 'new-base\n' },
    ]
    const before = structuredClone(changes)
    commitMigrationTransaction(f.repo, changes)
    expect(readFileSync(join(f.repo, project), 'utf8')).toBe('new-project\n')
    expect(readFileSync(join(f.repo, baseline), 'utf8')).toBe('new-base\n')
    expect(changes).toEqual(before)
    expect(recoverMigrationTransaction(f.repo)).toBe(false)
  })

  test.each([
    { phase: 'project', afterIndex: 0 },
    { phase: 'baseline', afterIndex: 1 },
  ])('recovery after $phase interruption completes all writes and is idempotent', ({
    afterIndex,
  }) => {
    const f = fixture()
    put(join(f.repo, 'old-base.txt'), 'unmanaged')
    const changes: TransactionChange[] = [
      projectWrite('project-v2\n'),
      { target: baseline, scope: 'baseline', content: 'base-v2\n' },
      { target: state, scope: 'baseline', content: 'state-v2\n' },
    ]
    expect(() =>
      commitMigrationTransaction(f.repo, changes, {
        afterOperation: (_operation, index) => {
          if (index === afterIndex) throw new Error('intentional-interruption')
        },
      }),
    ).toThrow('intentional-interruption')
    expect(readFileSync(join(f.repo, project), 'utf8')).toBe('project-v2\n')
    expect(existsSync(join(f.repo, baseline))).toBe(afterIndex === 1)
    if (afterIndex === 1) expect(readFileSync(join(f.repo, baseline), 'utf8')).toBe('base-v2\n')
    expect(existsSync(join(f.repo, state))).toBe(false)
    expect(recoverMigrationTransaction(f.repo)).toBe(true)
    expect(readFileSync(join(f.repo, project), 'utf8')).toBe('project-v2\n')
    expect(readFileSync(join(f.repo, baseline), 'utf8')).toBe('base-v2\n')
    expect(readFileSync(join(f.repo, state), 'utf8')).toBe('state-v2\n')
    expect(readFileSync(join(f.repo, 'old-base.txt'), 'utf8')).toBe('unmanaged')
    const completed = tree(f.root)
    expect(recoverMigrationTransaction(f.repo)).toBe(false)
    expect(tree(f.root)).toEqual(completed)
  })

  test('manifest remains old through interruption and closure failure, then switches on recovery', () => {
    const f = fixture()
    put(join(f.repo, 'manifest-old.json'), 'unmanaged')
    put(join(f.repo, manifest), 'old-manifest\n')
    put(join(f.repo, asset), 'valid-wave')
    const changes: TransactionChange[] = [
      projectWrite('project-v2\n'),
      { target: state, scope: 'baseline', content: 'state-v2\n' },
      {
        target: manifest,
        scope: 'manifest',
        content: 'new-manifest\n',
        preconditions: [{ target: asset, hash: digest('valid-wave') }],
      },
    ]
    expect(() =>
      commitMigrationTransaction(f.repo, changes, {
        afterOperation: (_operation, index) => {
          if (index === 1) throw new Error('before-manifest')
        },
      }),
    ).toThrow('before-manifest')
    expect(readFileSync(join(f.repo, project), 'utf8')).toBe('project-v2\n')
    expect(readFileSync(join(f.repo, state), 'utf8')).toBe('state-v2\n')
    expect(readFileSync(join(f.repo, manifest), 'utf8')).toBe('old-manifest\n')
    put(join(f.repo, asset), 'broken-wave')
    const failedClosure = tree(f.root)
    expect(() => recoverMigrationTransaction(f.repo)).toThrow(
      `manifest 发布前资源闭包不符: ${asset}`,
    )
    expect(tree(f.root)).toEqual(failedClosure)
    put(join(f.repo, asset), 'valid-wave')
    expect(recoverMigrationTransaction(f.repo)).toBe(true)
    expect(readFileSync(join(f.repo, manifest), 'utf8')).toBe('new-manifest\n')
    expect(readFileSync(join(f.repo, 'manifest-old.json'), 'utf8')).toBe('unmanaged')
    expect(recoverMigrationTransaction(f.repo)).toBe(false)
  })

  test.each<{ name: string; changes: TransactionChange[]; error: string }>([
    {
      name: 'manifest before another operation',
      changes: [
        {
          target: manifest,
          scope: 'manifest',
          content: '{}\n',
          preconditions: [{ target: asset, hash: digest('ready') }],
        },
        projectWrite('{}\n'),
      ],
      error: 'manifest 操作必须是事务最后一项',
    },
    {
      name: 'manifest deletion',
      changes: [
        {
          target: manifest,
          scope: 'manifest',
          preconditions: [{ target: asset, hash: digest('ready') }],
        },
      ],
      error: 'manifest 操作只能写入，不能删除',
    },
    {
      name: 'manifest target disguised as project scope',
      changes: [
        { target: manifest, scope: 'project', expectedPreviousHash: null, content: '{}\n' },
      ],
      error: 'manifest 操作必须使用 manifest scope 与固定目标',
    },
  ])('$name is rejected before staging with the tree unchanged', ({ changes, error }) => {
    const f = fixture()
    put(join(f.repo, asset), 'ready')
    const before = tree(f.root)
    expect(() => commitMigrationTransaction(f.repo, changes)).toThrow(error)
    expect(tree(f.root)).toEqual(before)
  })

  test('a project edit after journal publication is preserved instead of overwritten', () => {
    const f = fixture()
    const second = 'projects/pal/content/b.json'
    put(join(f.repo, second), 'b1\n')
    expect(() =>
      commitMigrationTransaction(
        f.repo,
        [
          projectWrite('a2\n'),
          {
            target: second,
            scope: 'project',
            expectedPreviousHash: digest('b1\n'),
            content: 'b2\n',
          },
        ],
        {
          afterOperation: (_operation, index) => {
            if (index === 0) put(join(f.repo, second), 'user-change\n')
          },
        },
      ),
    ).toThrow(`事务目标在提交窗口被修改: ${second}`)
    expect(readFileSync(join(f.repo, project), 'utf8')).toBe('a2\n')
    expect(readFileSync(join(f.repo, second), 'utf8')).toBe('user-change\n')
  })

  test('removing the journal in afterOperation still publishes bytes and cleans staging', () => {
    const f = fixture()
    commitMigrationTransaction(
      f.repo,
      [
        {
          target: 'projects/pal/content/a.json',
          scope: 'project',
          expectedPreviousHash: null,
          content: 'new\n',
        },
      ],
      {
        afterOperation: () => {
          unlinkSync(join(f.repo, '.type-pal-migrate/pal-journal.json'))
        },
      },
    )
    expect(readFileSync(join(f.repo, 'projects/pal/content/a.json'), 'utf8')).toBe('new\n')
    expect(hasPendingMigrationTransaction(f.repo)).toBe(false)
    // Observe the actual owned transaction directory rather than a boolean about target existence.
    expect(tree(join(f.repo, '.type-pal-migrate/transactions'))).toEqual({})
    expect(recoverMigrationTransaction(f.repo)).toBe(false)
  })
})

describe('pending publication and repaired closure', () => {
  const roots: string[] = []

  function fixture() {
    const f = guardFixture()
    roots.push(f.root)
    return f
  }

  const project = 'projects/pal/content/a.json'

  const write = (target: string, content = 'new\n'): TransactionChange => ({
    target,
    content,
    scope: 'project',
    expectedPreviousHash: null,
  })

  const digest = (body: string) => createHash('sha256').update(body).digest('hex')

  const manifest = 'projects/pal/manifest.json'

  const asset = 'projects/pal/assets/ready.bin'

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  test('a pending journal blocks another commit until recovery', () => {
    const f = fixture()
    expect(hasPendingMigrationTransaction(f.repo)).toBe(false)
    expect(() =>
      commitMigrationTransaction(f.repo, [write(project, 'a\n')], {
        afterOperation: () => {
          throw new Error('intentional-stop')
        },
      }),
    ).toThrow('intentional-stop')
    expect(hasPendingMigrationTransaction(f.repo)).toBe(true)
    const before = tree(f.root)
    expect(() =>
      commitMigrationTransaction(f.repo, [write('projects/pal/content/b.json')]),
    ).toThrow('存在未恢复迁移事务；请先调用 recoverMigrationTransaction')
    expect(tree(f.root)).toEqual(before)
    expect(recoverMigrationTransaction(f.repo)).toBe(true)
    expect(hasPendingMigrationTransaction(f.repo)).toBe(false)
  })

  test('a final byte mismatch rejects while retaining the pending journal', () => {
    const f = fixture()
    expect(() =>
      commitMigrationTransaction(f.repo, [write(project, 'a2\n')], {
        afterOperation: () => {
          put(join(f.repo, project), 'mutated')
        },
      }),
    ).toThrow(`事务提交后哈希不符: ${project}`)
    expect(readFileSync(join(f.repo, project), 'utf8')).toBe('mutated')
    expect(hasPendingMigrationTransaction(f.repo)).toBe(true)
  })

  test('a failed commit closure can recover the same publication once repaired', () => {
    const f = fixture()
    put(join(f.repo, manifest), 'old-manifest\n')
    put(join(f.repo, asset), 'broken-before-commit')
    expect(() =>
      commitMigrationTransaction(f.repo, [
        {
          target: manifest,
          scope: 'manifest',
          content: '{}\n',
          preconditions: [{ target: asset, hash: digest('ready') }],
        },
      ]),
    ).toThrow(`manifest 发布前资源闭包不符: ${asset}`)
    expect(readFileSync(join(f.repo, manifest), 'utf8')).toBe('old-manifest\n')
    expect(hasPendingMigrationTransaction(f.repo)).toBe(true)
    put(join(f.repo, asset), 'ready')
    expect(recoverMigrationTransaction(f.repo)).toBe(true)
    expect(readFileSync(join(f.repo, manifest), 'utf8')).toBe('{}\n')
    expect(hasPendingMigrationTransaction(f.repo)).toBe(false)
  })
})
