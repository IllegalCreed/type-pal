/** Transaction validation, recovery ownership and observable commit lifecycle. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, rmSync, symlinkSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { guardFixture, put, tree } from './__tests__/migration-guard-fixture.js'
import {
  commitMigrationTransaction,
  hasPendingMigrationTransaction,
  recoverMigrationTransaction,
  type TransactionChange,
} from './migration-transaction.js'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})
function fixture() {
  const f = guardFixture()
  roots.push(f.root)
  return f
}
const digest = (raw: string) => createHash('sha256').update(raw).digest('hex')
const journalRel = '.type-pal-migrate/pal-journal.json'
const first = 'projects/pal/content/a.json'
const second = 'projects/pal/content/b.json'
const firstBody = '{"step":1}\n'
const secondBody = '{"step":2}\n'
const writeOp = (target: string, content: string): TransactionChange => ({
  target,
  scope: 'project',
  expectedPreviousHash: null,
  content,
})

// This factory authors raw journal IO, not a typed product call or an expected result.
// The valid control below proves that the shared seed reaches recovery successfully.
function pendingJournal() {
  const f = fixture()
  const id = 'a'.repeat(16)
  const operation = (target: string, index: number, body: string) => {
    const staged = `.type-pal-migrate/transactions/${id}/stage/${String(index).padStart(6, '0')}`
    put(join(f.repo, staged), body)
    return {
      kind: 'write',
      target,
      scope: 'project',
      staged,
      hash: digest(body),
      previousHash: null,
    }
  }
  const firstOperation = operation(first, 0, firstBody)
  const lastOperation = operation(second, 1, secondBody)
  const journal = { version: 2, id, operations: [firstOperation, lastOperation] }
  return { ...f, journal, lastOperation }
}
type PendingJournal = ReturnType<typeof pendingJournal>
function saveJournal(f: PendingJournal, value: unknown = f.journal) {
  put(join(f.repo, journalRel), JSON.stringify(value))
}
function makeManifest(f: PendingJournal) {
  const asset = 'projects/pal/assets/ready.bin'
  put(join(f.repo, asset), 'asset-ready')
  Object.assign(f.lastOperation, {
    target: 'projects/pal/manifest.json',
    scope: 'manifest',
    preconditions: [{ target: asset, hash: digest('asset-ready') }],
  })
}

const invalidJournals: Array<{
  name: string
  prepare: (f: PendingJournal) => unknown
  error: string
}> = [
  {
    name: 'absolute target',
    prepare: (f) => {
      put(join(f.outside, 'victim.json'), 'keep')
      f.lastOperation.target = join(f.outside, 'victim.json')
      return f.journal
    },
    error: '迁移事务 journal operations[1].target 必须是规范仓库相对路径',
  },
  {
    name: 'missing staged path',
    prepare: (f) => {
      Reflect.deleteProperty(f.lastOperation, 'staged')
      return f.journal
    },
    error: '迁移事务 journal operations[1].staged 路径无效',
  },
  { name: 'null root', prepare: () => null, error: '迁移事务 journal 格式无效' },
  {
    name: 'unknown scope',
    prepare: (f) => {
      f.lastOperation.scope = 'weird'
      return f.journal
    },
    error: '迁移事务 journal scope 无效: weird',
  },
  {
    name: 'project target outside its scope',
    prepare: (f) => {
      f.lastOperation.target = 'packages/migrate/baselines/pal/other.json'
      return f.journal
    },
    error: 'project scope 目标越界: packages/migrate/baselines/pal/other.json',
  },
  {
    name: 'non-object manifest precondition',
    prepare: (f) => {
      makeManifest(f)
      Object.assign(f.lastOperation, { preconditions: ['not-an-object'] })
      return f.journal
    },
    error: '迁移事务 journal precondition 无效: projects/pal/manifest.json',
  },
]

describe('journal validation before applying any pending operation', () => {
  test('the shared valid journal seed restores both files and cleans its owned transaction', () => {
    const f = pendingJournal()
    saveJournal(f)
    expect(recoverMigrationTransaction(f.repo)).toBe(true)
    expect(readFileSync(join(f.repo, first), 'utf8')).toBe(firstBody)
    expect(readFileSync(join(f.repo, second), 'utf8')).toBe(secondBody)
    expect(hasPendingMigrationTransaction(f.repo)).toBe(false)
    expect(existsSync(join(f.repo, '.type-pal-migrate/transactions', f.journal.id))).toBe(false)
  })

  test.each(invalidJournals)('$name is rejected with every owned file unchanged', ({
    prepare,
    error,
  }) => {
    const f = pendingJournal()
    saveJournal(f, prepare(f))
    const before = tree(f.root)
    expect(() => recoverMigrationTransaction(f.repo)).toThrow(error)
    expect(tree(f.root)).toEqual(before)
  })

  test('manifest 前置条件指向 symlink 时恢复拒绝并保全文件', () => {
    const f = pendingJournal()
    makeManifest(f)
    const outside = join(f.outside, 'asset.bin')
    put(outside, 'asset-ready')
    const asset = join(f.repo, 'projects/pal/assets/ready.bin')
    unlinkSync(asset)
    symlinkSync(outside, asset)
    saveJournal(f)
    const before = tree(f.root)
    expect(() => recoverMigrationTransaction(f.repo)).toThrow(
      '不得经过符号链接: projects/pal/assets/ready.bin',
    )
    expect(tree(f.root)).toEqual(before)
  })
})

function readTransactionId(repo: string): string {
  const value: unknown = JSON.parse(readFileSync(join(repo, journalRel), 'utf8'))
  assert.ok(
    value !== null && typeof value === 'object' && 'id' in value && typeof value.id === 'string',
  )
  assert.match(value.id, /^[a-f0-9]{16}$/)
  return value.id
}
function interruptAfterFirst(repo: string, changes: TransactionChange[]) {
  expect(() =>
    commitMigrationTransaction(repo, changes, {
      afterOperation: (_operation, index) => {
        if (index === 0) throw new Error('intentional-stop')
      },
    }),
  ).toThrow('intentional-stop')
  return readTransactionId(repo)
}

describe('transaction ownership and lifecycle', () => {
  test('a linked commit target is rejected before staging without altering any owned file', () => {
    const f = fixture()
    const outside = join(f.outside, 'target.json')
    put(outside, 'keep')
    const target = 'projects/pal/content/link.json'
    put(join(f.repo, 'projects/pal/content/placeholder.json'), '{}')
    symlinkSync(outside, join(f.repo, target))
    const before = tree(f.root)
    expect(() =>
      commitMigrationTransaction(f.repo, [
        {
          target,
          scope: 'project',
          content: 'new',
          expectedPreviousHash: digest('keep'),
        },
      ]),
    ).toThrow(`不得经过符号链接: ${target}`)
    expect(tree(f.root)).toEqual(before)
  })

  test('recovery removes the actual interrupted transaction directory', () => {
    const f = fixture()
    const id = interruptAfterFirst(f.repo, [writeOp(first, firstBody), writeOp(second, secondBody)])
    const transaction = join(f.repo, '.type-pal-migrate/transactions', id)
    expect(existsSync(transaction)).toBe(true)
    expect(existsSync(join(f.repo, second))).toBe(false)
    expect(recoverMigrationTransaction(f.repo)).toBe(true)
    expect(readFileSync(join(f.repo, second), 'utf8')).toBe(secondBody)
    expect(existsSync(transaction)).toBe(false)
  })

  test('afterOperation observes applied write/delete/manifest operations in order', () => {
    const f = fixture()
    const old = 'projects/pal/content/old.json'
    put(join(f.repo, old), 'old')
    const seen: Array<{ target: string; index: number; kind: string; observed: string | null }> = []
    commitMigrationTransaction(
      f.repo,
      [
        writeOp(first, 'new\n'),
        { target: old, scope: 'project', expectedPreviousHash: digest('old') },
        {
          target: 'projects/pal/manifest.json',
          scope: 'manifest',
          content: 'manifest\n',
          preconditions: [{ target: first, hash: digest('new\n') }],
        },
      ],
      {
        afterOperation: (operation, index) => {
          const target = join(f.repo, operation.target)
          const observed = existsSync(target) ? readFileSync(target, 'utf8') : null
          seen.push({ target: operation.target, index, kind: operation.kind, observed })
        },
      },
    )
    expect(seen).toEqual([
      { target: first, index: 0, kind: 'write', observed: 'new\n' },
      { target: old, index: 1, kind: 'delete', observed: null },
      {
        target: 'projects/pal/manifest.json',
        index: 2,
        kind: 'write',
        observed: 'manifest\n',
      },
    ])
    expect(readFileSync(join(f.repo, first), 'utf8')).toBe('new\n')
    expect(existsSync(join(f.repo, old))).toBe(false)
    expect(readFileSync(join(f.repo, 'projects/pal/manifest.json'), 'utf8')).toBe('manifest\n')
    expect(hasPendingMigrationTransaction(f.repo)).toBe(false)
    expect(readdirSync(join(f.repo, '.type-pal-migrate/transactions'))).toEqual([])
  })

  test('a baseline change during the commit window preserves the newer bytes and rejects', () => {
    const f = fixture()
    const a = 'packages/migrate/baselines/pal/content/a.json'
    const b = 'packages/migrate/baselines/pal/content/b.json'
    put(join(f.repo, b), 'v1')
    expect(() =>
      commitMigrationTransaction(
        f.repo,
        [
          { target: a, scope: 'baseline', content: 'a2' },
          { target: b, scope: 'baseline', content: 'v2' },
        ],
        {
          afterOperation: (_operation, index) => {
            if (index === 0) put(join(f.repo, b), 'user-edit')
          },
        },
      ),
    ).toThrow(`事务目标在提交窗口被修改: ${b}`)
    expect(readFileSync(join(f.repo, a), 'utf8')).toBe('a2')
    expect(readFileSync(join(f.repo, b), 'utf8')).toBe('user-edit')
  })

  test('deletion of an observed absent target completes without creating it', () => {
    const f = fixture()
    const target = 'projects/pal/content/already-gone.json'
    commitMigrationTransaction(f.repo, [{ target, scope: 'project', expectedPreviousHash: null }])
    expect(existsSync(join(f.repo, target))).toBe(false)
    expect(hasPendingMigrationTransaction(f.repo)).toBe(false)
  })

  test('transaction identity is stable across roots and distinguishes different contents', () => {
    const a = fixture(),
      b = fixture(),
      c = fixture()
    const idA = interruptAfterFirst(a.repo, [writeOp(first, 'same')])
    const idB = interruptAfterFirst(b.repo, [writeOp(first, 'same')])
    const idC = interruptAfterFirst(c.repo, [writeOp(first, 'different')])
    expect(idA).toBe(idB)
    expect(idC).not.toBe(idA)
  })
})
