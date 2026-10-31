import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import * as fs from 'node:fs'
import { join } from 'node:path'
import { afterEach, expect, test, vi } from 'vitest'
import { guardFixture, put, tree } from './__tests__/migration-guard-fixture.js'
import { createMigrationPlan, snapshotOf } from './migration-plan.js'
import {
  assertProjectSnapshotCurrent,
  loadProjectMigrationSnapshot,
} from './migration-project-io.js'
import {
  commitMigrationTransaction,
  hasPendingMigrationTransaction,
  recoverMigrationTransaction,
} from './migration-transaction.js'
import { buildMigrationTransactionChanges } from './migration-write-plan.js'

// Preserve native IO; a mutable facade lets the two staging cases inject at an exact write.
vi.mock('node:fs', async (original) => ({ ...(await original<typeof fs>()) }))
const native = await vi.importActual<typeof fs>('node:fs')
const digest = (bytes: string) => createHash('sha256').update(bytes).digest('hex')
const expectedContent = '{\n  "value": 2\n}\n'
const roots: string[] = []
afterEach(() => {
  vi.restoreAllMocks()
  for (const root of roots.splice(0)) native.rmSync(root, { recursive: true, force: true })
})
function fixture(kind: 'write' | 'create' | 'delete' = 'write') {
  const f = guardFixture()
  roots.push(f.root)
  const path = 'content/items.json'
  const target = join(f.repo, 'projects/pal', path)
  const raw = '{ "value": 1 }\n' // deliberately not the serializer's formatting
  if (kind !== 'create') put(target, raw)
  const files = new Map(kind === 'create' ? [] : [[path, { value: 1 }]])
  const base = snapshotOf({ files, managedFiles: new Set(files.keys()) })
  const nextFiles = new Map(kind === 'delete' ? [] : [[path, { value: 2 }]])
  const next = snapshotOf({ files: nextFiles, managedFiles: new Set(nextFiles.keys()) })
  const project = loadProjectMigrationSnapshot(f.repo, new Set([path]))
  const plan = createMigrationPlan(base, project, next)
  expect(plan.conflicts).toEqual([])
  assertProjectSnapshotCurrent(f.repo, project, next.managedFiles)
  const changes = buildMigrationTransactionChanges({
    repo: f.repo,
    plan,
    projectSnapshot: project,
    nextBaseline: next,
  })
  return { ...f, path, target, raw, next, changes }
}

function journalObservation(repo: string) {
  const journal: unknown = JSON.parse(
    fs.readFileSync(join(repo, '.type-pal-migrate/pal-journal.json'), 'utf8'),
  )
  assert.ok(journal !== null && typeof journal === 'object')
  assert.ok('version' in journal && 'operations' in journal && Array.isArray(journal.operations))
  const operation: unknown = journal.operations[0]
  return { version: journal.version, operation }
}

test.each([
  'write',
  'create',
  'delete',
] as const)('planned %s rejects later author bytes before any staging', (kind) => {
  const f = fixture(kind)
  put(f.target, '{"author":"newer"}\n')
  const before = tree(f.root)
  const writes = vi.spyOn(fs, 'writeFileSync')
  const rename = vi.spyOn(fs, 'renameSync')
  expect(() => commitMigrationTransaction(f.repo, f.changes)).toThrow('偏离规划快照')
  expect(writes).not.toHaveBeenCalled()
  expect(rename).not.toHaveBeenCalled()
  expect(tree(f.root)).toEqual(before)
})

test.each([
  'write',
  'create',
  'delete',
] as const)('planned %s succeeds with raw-byte provenance and journal v2', (kind) => {
  const f = fixture(kind)
  const expectedHash = kind === 'create' ? null : digest(f.raw)
  expect(f.changes[0]).toMatchObject({
    expectedPreviousHash: expectedHash,
  })
  expect(() =>
    commitMigrationTransaction(f.repo, f.changes, {
      afterOperation: () => {
        throw new Error('interrupt')
      },
    }),
  ).toThrow('interrupt')
  const journal = journalObservation(f.repo)
  expect(journal.version).toBe(2)
  expect(journal.operation).toMatchObject({
    target: `projects/pal/${f.path}`,
    kind: kind === 'delete' ? 'delete' : 'write',
    previousHash: expectedHash,
  })
  expect(recoverMigrationTransaction(f.repo)).toBe(true)
  expect(recoverMigrationTransaction(f.repo)).toBe(false)
  if (kind === 'delete') expect(fs.existsSync(f.target)).toBe(false)
  else expect(fs.readFileSync(f.target, 'utf8')).toBe(expectedContent)
  const after = loadProjectMigrationSnapshot(f.repo, new Set([f.path]))
  const replay = createMigrationPlan(f.next, after, f.next)
  expect(replay.writes.size).toBe(0)
  expect(replay.deletes).toEqual([])
  expect(replay.conflicts).toEqual([])
})

test('a late conflicting operation prevents even the first staging write', () => {
  const f = fixture()
  const late = join(f.repo, 'projects/pal/content/z.json')
  put(late, 'external')
  const before = tree(f.root)
  f.changes.push({
    target: 'projects/pal/content/z.json',
    scope: 'project',
    content: 'planned',
    expectedPreviousHash: null,
  })
  const writes = vi.spyOn(fs, 'writeFileSync')
  expect(() => commitMigrationTransaction(f.repo, f.changes)).toThrow('偏离规划快照')
  expect(writes).not.toHaveBeenCalled()
  expect(tree(f.root)).toEqual(before)
})

test('changes during staging cannot become the journal previousHash or overwrite author bytes on recovery', () => {
  const f = fixture()
  let injected = false
  vi.spyOn(fs, 'writeFileSync').mockImplementation((...args) => {
    const result = native.writeFileSync(...args)
    if (String(args[0]).includes('/stage/') && !injected) {
      injected = true
      native.writeFileSync(f.target, 'late-author')
    }
    return result
  })
  expect(() => commitMigrationTransaction(f.repo, f.changes)).toThrow(
    `事务目标在提交窗口被修改: projects/pal/${f.path}`,
  )
  expect(injected).toBe(true)
  expect(fs.readFileSync(f.target, 'utf8')).toBe('late-author')
  expect(hasPendingMigrationTransaction(f.repo)).toBe(true)
  expect(journalObservation(f.repo).operation).toMatchObject({ previousHash: digest(f.raw) })
  const before = tree(f.root)
  expect(() => recoverMigrationTransaction(f.repo)).toThrow(
    `事务目标在提交窗口被修改: projects/pal/${f.path}`,
  )
  expect(tree(f.root)).toEqual(before)
})

test('a later target changed during earlier staging is not resampled into permission', () => {
  const f = fixture()
  const second = join(f.repo, 'projects/pal/content/z.json')
  put(second, 'original-second')
  f.changes.splice(1, 0, {
    target: 'projects/pal/content/z.json',
    scope: 'project',
    expectedPreviousHash: digest('original-second'),
    content: 'planned-second',
  })
  let injected = false
  vi.spyOn(fs, 'writeFileSync').mockImplementation((...args) => {
    const result = native.writeFileSync(...args)
    if (String(args[0]).endsWith('/stage/000000')) {
      injected = true
      native.writeFileSync(second, 'external-second')
    }
    return result
  })
  expect(() => commitMigrationTransaction(f.repo, f.changes)).toThrow('偏离规划快照')
  expect(injected).toBe(true)
  expect(fs.readFileSync(second, 'utf8')).toBe('external-second')
  expect(fs.readFileSync(f.target, 'utf8')).toBe(f.raw)
  expect(fs.existsSync(join(f.repo, '.type-pal-migrate/pal-journal.json'))).toBe(false)
})

test.each(['format', 'missing'])('%s changes after planning remain conflicts', (variant) => {
  const f = fixture()
  if (variant === 'format') put(f.target, '{\n  "value": 1\n}\n')
  else fs.unlinkSync(f.target)
  const before = tree(f.root)
  expect(() => commitMigrationTransaction(f.repo, f.changes)).toThrow('偏离规划快照')
  expect(tree(f.root)).toEqual(before)
})
