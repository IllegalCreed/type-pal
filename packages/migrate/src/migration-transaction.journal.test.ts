/** Persisted journal rejection, staging integrity and recovery ownership. */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, rmSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { guardFixture, put, tree } from './__tests__/migration-guard-fixture.js'
import { journalFixture } from './__tests__/migration-journal-fixture.js'
import {
  commitMigrationTransaction,
  hasPendingMigrationTransaction,
  recoverMigrationTransaction,
} from './migration-transaction.js'

describe('journal from a real interrupted commit', () => {
  const roots: string[] = []

  const first = 'projects/pal/content/a.json'

  const second = 'projects/pal/content/b.json'

  const manifest = 'projects/pal/manifest.json'

  const journalRel = '.type-pal-migrate/pal-journal.json'

  function interrupted() {
    const f = guardFixture()
    roots.push(f.root)
    put(join(f.outside, 'victim.txt'), '{"k":1}')
    put(join(f.repo, 'victim.txt'), '{"k":1}')
    expect(() =>
      commitMigrationTransaction(
        f.repo,
        [
          { target: first, scope: 'project', expectedPreviousHash: null, content: '{"k":1}' },
          { target: second, scope: 'project', expectedPreviousHash: null, content: '{"k":2}' },
          {
            target: manifest,
            scope: 'manifest',
            content: 'manifest-v2\n',
            preconditions: [
              { target: first, hash: createHash('sha256').update('{"k":1}').digest('hex') },
            ],
          },
        ],
        {
          afterOperation: (_operation, index) => {
            if (index === 0) throw new Error('intentional-interruption')
          },
        },
      ),
    ).toThrow('intentional-interruption')
    const journalPath = join(f.repo, journalRel)
    const journal: unknown = JSON.parse(readFileSync(journalPath, 'utf8'))
    assert.ok(journal !== null && typeof journal === 'object')
    assert.ok('version' in journal && 'id' in journal && 'operations' in journal)
    assert.equal(journal.version, 2)
    assert.ok(Array.isArray(journal.operations))
    assert.equal(journal.operations.length, 3)
    const pending: unknown = journal.operations[1]
    const publication: unknown = journal.operations[2]
    assert.ok(pending !== null && typeof pending === 'object')
    assert.ok(publication !== null && typeof publication === 'object')
    return { ...f, journalPath, journal, pending, publication }
  }

  // Mutations belong to unknown disk JSON, never to the typed TransactionChange API.
  const invalid: Array<{
    name: string
    mutate: (input: ReturnType<typeof interrupted>) => void
    error: string
  }> = [
    {
      name: 'operations is not an array',
      mutate: ({ journal }) => {
        journal.operations = 'nope'
      },
      error: '迁移事务 journal 操作表无效',
    },
    {
      name: 'unsupported operation kind',
      mutate: ({ pending }) => {
        Reflect.set(pending, 'kind', 'rename')
      },
      error: `迁移事务 journal 操作 kind 无效: ${second}`,
    },
    {
      name: 'staging bytes do not match the declared hash',
      mutate: ({ pending }) => {
        Reflect.set(pending, 'hash', '0'.repeat(64))
      },
      error: `事务恢复缺少有效 staging: ${second}`,
    },
    {
      name: 'staged path does not match its transaction slot',
      mutate: ({ pending }) => {
        Reflect.set(pending, 'staged', 'deadbeef')
      },
      error: `迁移事务 journal staging 路径不符: ${second}`,
    },
    {
      name: 'unsupported journal version',
      mutate: ({ journal }) => {
        journal.version = 3
      },
      error: '迁移事务 journal 版本或 id 无效',
    },
    {
      name: 'a traversal transaction id',
      mutate: ({ journal }) => {
        journal.id = '../../victim'
      },
      error: '迁移事务 journal 版本或 id 无效',
    },
    {
      name: 'a traversal target',
      mutate: ({ pending }) => {
        Reflect.set(pending, 'target', '../victim.txt')
      },
      error: '迁移事务 journal operations[1].target 不得越界: ../victim.txt',
    },
    {
      name: 'a traversal staging path',
      mutate: ({ pending }) => {
        Reflect.set(pending, 'staged', '../victim.txt')
      },
      error: '迁移事务 journal operations[1].staged 不得越界: ../victim.txt',
    },
    {
      name: 'a traversal manifest precondition',
      mutate: ({ publication }) => {
        assert.ok('preconditions' in publication && Array.isArray(publication.preconditions))
        const precondition: unknown = publication.preconditions[0]
        assert.ok(precondition !== null && typeof precondition === 'object')
        Reflect.set(precondition, 'target', '../victim.txt')
      },
      error: '迁移事务 journal operations[2].preconditions[0].target 不得越界: ../victim.txt',
    },
  ]

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  test('the unchanged seed completes pending files and clears the journal idempotently', () => {
    const f = interrupted()
    expect(existsSync(join(f.repo, second))).toBe(false)
    expect(existsSync(join(f.repo, manifest))).toBe(false)
    expect(recoverMigrationTransaction(f.repo)).toBe(true)
    expect(readFileSync(join(f.repo, first), 'utf8')).toBe('{"k":1}')
    expect(readFileSync(join(f.repo, second), 'utf8')).toBe('{"k":2}')
    expect(readFileSync(join(f.repo, manifest), 'utf8')).toBe('manifest-v2\n')
    expect(existsSync(f.journalPath)).toBe(false)
    const completed = tree(f.root)
    expect(recoverMigrationTransaction(f.repo)).toBe(false)
    expect(tree(f.root)).toEqual(completed)
  })

  test.each(invalid)('$name is refused without altering any owned file or directory', (entry) => {
    const f = interrupted()
    entry.mutate(f)
    put(f.journalPath, JSON.stringify(f.journal))
    const before = tree(f.root)
    expect(() => recoverMigrationTransaction(f.repo)).toThrow(entry.error)
    expect(tree(f.root)).toEqual(before)
  })
})

describe('persisted field policies and already-applied targets', () => {
  const roots: string[] = []

  function fixture() {
    const f = guardFixture()
    roots.push(f.root)
    return f
  }

  function pending() {
    return journalFixture(fixture())
  }

  const project = 'projects/pal/content/a.json'

  const manifest = 'projects/pal/manifest.json'

  const invalid: Array<{
    name: string
    mutate: (f: ReturnType<typeof pending>) => void
    error: string
  }> = [
    {
      name: 'non-object operation',
      mutate: (f) => {
        Reflect.set(f.journal.operations, '0', 'not-an-object')
      },
      error: '迁移事务 journal 操作 0 无效',
    },
    {
      name: 'empty target',
      mutate: (f) => {
        f.projectOperation.target = ''
      },
      error: '迁移事务 journal operations[0].target 路径无效',
    },
    {
      name: 'backslash target',
      mutate: (f) => {
        f.projectOperation.target = 'projects\\pal\\x.json'
      },
      error: '迁移事务 journal operations[0].target 路径无效',
    },
    {
      name: 'dot slash target',
      mutate: (f) => {
        f.projectOperation.target = `./${project}`
      },
      error: '迁移事务 journal operations[0].target 必须是规范仓库相对路径',
    },
    {
      name: 'duplicate journal target',
      mutate: (f) => {
        put(join(f.repo, f.manifestOperation.staged), 'pending-project\n')
        Reflect.set(f.journal, 'operations', [
          f.projectOperation,
          { ...f.projectOperation, staged: f.manifestOperation.staged },
        ])
      },
      error: `迁移事务 journal 包含重复目标: ${project}`,
    },
    {
      name: 'delete with staging metadata',
      mutate: (f) => {
        f.projectOperation.kind = 'delete'
      },
      error: `迁移事务 journal delete 不得携带 staging/hash: ${project}`,
    },
    {
      name: 'non-array preconditions',
      mutate: (f) => {
        Reflect.set(f.manifestOperation, 'preconditions', 'nope')
      },
      error: `迁移事务 journal preconditions 无效: ${manifest}`,
    },
    {
      name: 'project with preconditions',
      mutate: (f) => {
        Reflect.set(f.projectOperation, 'preconditions', f.manifestOperation.preconditions)
      },
      error: `只有 manifest 操作可以携带前置条件: ${project}`,
    },
    {
      name: 'precondition outside project',
      mutate: (f) => {
        f.precondition.target = 'baselines/evil.json'
      },
      error: 'manifest 前置条件目标越界: baselines/evil.json',
    },
    {
      name: 'noncanonical manifest target',
      mutate: (f) => {
        f.manifestOperation.target = 'projects/pal/content/other.json'
      },
      error: 'manifest scope 目标必须是固定 manifest: projects/pal/content/other.json',
    },
    {
      name: 'missing manifest preconditions',
      mutate: (f) => {
        Reflect.deleteProperty(f.manifestOperation, 'preconditions')
      },
      error: 'manifest 操作缺资源闭包前置条件',
    },
  ]

  const digest = (body: string) => createHash('sha256').update(body).digest('hex')

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  test('the shared valid seed publishes both files and cleans its transaction', () => {
    const f = pending()
    expect(recoverMigrationTransaction(f.repo)).toBe(true)
    expect(readFileSync(join(f.repo, project), 'utf8')).toBe('pending-project\n')
    expect(readFileSync(join(f.repo, manifest), 'utf8')).toBe('pending-manifest\n')
    expect(existsSync(f.transaction)).toBe(false)
    expect(hasPendingMigrationTransaction(f.repo)).toBe(false)
  })

  test.each(invalid)('$name is refused with all owned paths unchanged', ({ mutate, error }) => {
    const f = pending()
    mutate(f)
    put(f.journalPath, JSON.stringify(f.journal))
    const before = tree(f.root)
    expect(() => recoverMigrationTransaction(f.repo)).toThrow(error)
    expect(tree(f.root)).toEqual(before)
  })

  test('malformed JSON is refused without writing or cleaning any path', () => {
    const f = pending()
    put(f.journalPath, 'not-json{')
    const before = tree(f.root)
    expect(() => recoverMigrationTransaction(f.repo)).toThrow(SyntaxError)
    expect(tree(f.root)).toEqual(before)
  })

  test('recovery preserves a target edited since its recorded previous hash', () => {
    const f = pending()
    Reflect.set(f.projectOperation, 'previousHash', digest('original'))
    put(f.journalPath, JSON.stringify(f.journal))
    put(join(f.repo, project), 'user-edit')
    const before = tree(f.root)
    expect(() => recoverMigrationTransaction(f.repo)).toThrow(
      `事务目标在提交窗口被修改: ${project}`,
    )
    expect(tree(f.root)).toEqual(before)
  })

  test('an already applied target needs no staging file during recovery', () => {
    const f = pending()
    put(join(f.repo, project), 'pending-project\n')
    unlinkSync(join(f.repo, f.projectOperation.staged))
    expect(recoverMigrationTransaction(f.repo)).toBe(true)
    expect(readFileSync(join(f.repo, project), 'utf8')).toBe('pending-project\n')
    expect(readFileSync(join(f.repo, manifest), 'utf8')).toBe('pending-manifest\n')
    expect(existsSync(f.transaction)).toBe(false)
    expect(hasPendingMigrationTransaction(f.repo)).toBe(false)
  })

  test('a missing journal id is refused with all owned paths unchanged', () => {
    const f = pending()
    Reflect.deleteProperty(f.journal, 'id')
    put(f.journalPath, JSON.stringify(f.journal))
    const before = tree(f.root)
    expect(() => recoverMigrationTransaction(f.repo)).toThrow('迁移事务 journal 版本或 id 无效')
    expect(tree(f.root)).toEqual(before)
  })

  test.each([
    'malformed',
    'missing',
  ])('a %s previous hash is refused without altering paths', (kind) => {
    const f = pending()
    if (kind === 'malformed') Reflect.set(f.projectOperation, 'previousHash', 'not-a-hash')
    else Reflect.deleteProperty(f.projectOperation, 'previousHash')
    put(f.journalPath, JSON.stringify(f.journal))
    const before = tree(f.root)
    expect(() => recoverMigrationTransaction(f.repo)).toThrow(
      '迁移事务 journal previousHash 无效: projects/pal/content/a.json',
    )
    expect(tree(f.root)).toEqual(before)
  })

  test.each([
    'malformed',
    'missing',
  ])('a %s precondition hash is refused without altering paths', (kind) => {
    const f = pending()
    const { precondition } = f
    if (kind === 'malformed') precondition.hash = 'short'
    else Reflect.deleteProperty(precondition, 'hash')
    put(f.journalPath, JSON.stringify(f.journal))
    const before = tree(f.root)
    expect(() => recoverMigrationTransaction(f.repo)).toThrow(
      'manifest 前置条件 hash 无效: projects/pal/assets/ready.bin',
    )
    expect(tree(f.root)).toEqual(before)
  })
})
