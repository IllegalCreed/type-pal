import * as fs from 'node:fs'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { guardFixture, put, tree } from './__tests__/migration-guard-fixture.js'
import {
  commitMigrationTransaction,
  recoverMigrationTransaction,
  type TransactionChange,
} from './migration-transaction.js'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

function fixture() {
  const result = guardFixture()
  roots.push(result.root)
  return result
}

const changes: readonly TransactionChange[] = [
  {
    target: 'projects/pal/content/items.json',
    scope: 'project',
    expectedPreviousHash: null,
    content: '{"value":1}\n',
  },
]

test.each([
  'control',
  'transactions',
] as const)('commit rejects an existing %s directory link before any staging writes', (directory) => {
  const f = fixture()
  const control = join(f.repo, '.type-pal-migrate')
  if (directory === 'transactions') fs.mkdirSync(control)
  fs.symlinkSync(f.outside, directory === 'control' ? control : join(control, 'transactions'))
  const outside = tree(f.outside)
  const before = tree(f.root)
  let failure: unknown
  try {
    commitMigrationTransaction(f.repo, changes)
  } catch (error) {
    failure = error
  }
  expect(tree(f.outside)).toEqual(outside)
  expect(tree(f.root)).toEqual(before)
  expect(failure).toMatchObject({ message: expect.stringContaining('符号链接') })
})

test('commit rejects a journal temporary link without overwriting its external target', () => {
  const f = fixture()
  const control = join(f.repo, '.type-pal-migrate')
  fs.mkdirSync(control)
  const external = join(f.outside, 'original.txt')
  put(external, 'outside-original')
  fs.symlinkSync(external, join(control, 'pal-journal.json.tmp'))
  const before = tree(f.root)
  let failure: unknown
  try {
    commitMigrationTransaction(f.repo, changes)
  } catch (error) {
    failure = error
  }
  expect(fs.readFileSync(external, 'utf8')).toBe('outside-original')
  expect(tree(f.root)).toEqual(before)
  expect(failure).toMatchObject({ message: expect.stringContaining('符号链接') })
})

test('recovery rejects a linked control directory without deleting the external journal or tree', () => {
  const f = fixture()
  const id = '0123456789abcdef'
  put(join(f.outside, 'pal-journal.json'), JSON.stringify({ version: 2, id, operations: [] }))
  put(join(f.outside, 'transactions', id, 'keep.txt'), 'outside-owned')
  fs.symlinkSync(f.outside, join(f.repo, '.type-pal-migrate'))
  const before = tree(f.root)
  let failure: unknown
  try {
    recoverMigrationTransaction(f.repo)
  } catch (error) {
    failure = error
  }
  expect(tree(f.root)).toEqual(before)
  expect(failure).toMatchObject({ message: expect.stringContaining('符号链接') })
})
