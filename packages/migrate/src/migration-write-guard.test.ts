import * as fs from 'node:fs'
import { join } from 'node:path'
import { afterEach, expect, test, vi } from 'vitest'
import { guardFixture, put, tree } from './__tests__/migration-guard-fixture.js'
import { serializeMigrationJson, sha256 } from './migration-baseline.js'
import { createMigrationPlan, snapshotOf } from './migration-plan.js'
import {
  assertProjectSnapshotCurrent,
  loadProjectMigrationSnapshot,
} from './migration-project-io.js'
import {
  commitMigrationTransaction,
  recoverMigrationTransaction,
  type TransactionChange,
} from './migration-transaction.js'
import { buildMigrationTransactionChanges } from './migration-write-plan.js'

vi.mock('node:fs', async (original) => ({ ...(await original<typeof fs>()) }))
const native = await vi.importActual<typeof fs>('node:fs')
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
  return { ...f, path, target, raw, project, plan, next, changes }
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
  expect(f.changes[0]).toMatchObject({
    expectedPreviousHash: kind === 'create' ? null : sha256(f.raw),
  })
  if (kind !== 'create')
    expect(sha256(f.raw)).not.toBe(sha256(serializeMigrationJson({ value: 1 })))
  expect(() =>
    commitMigrationTransaction(f.repo, f.changes, {
      afterOperation: () => {
        throw new Error('interrupt')
      },
    }),
  ).toThrow('interrupt')
  const journal = JSON.parse(
    fs.readFileSync(join(f.repo, '.type-pal-migrate/pal-journal.json'), 'utf8'),
  )
  expect(journal.version).toBe(2)
  expect(journal.operations[0].previousHash).toBe(kind === 'create' ? null : sha256(f.raw))
  expect(recoverMigrationTransaction(f.repo)).toBe(true)
  expect(recoverMigrationTransaction(f.repo)).toBe(false)
  if (kind === 'delete') expect(fs.existsSync(f.target)).toBe(false)
  else expect(fs.readFileSync(f.target, 'utf8')).toBe(serializeMigrationJson({ value: 2 }))
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

test.each([
  undefined,
  'bad-hash',
])('project operations cannot silently sample a missing/invalid planned hash: %s', (hash) => {
  const f = fixture()
  const before = tree(f.root)
  const change = {
    target: `projects/pal/${f.path}`,
    scope: 'project',
    content: 'new',
    ...(hash === undefined ? {} : { expectedPreviousHash: hash }),
  }
  expect(() => commitMigrationTransaction(f.repo, [change as TransactionChange])).toThrow(
    /规划|expectedPreviousHash/,
  )
  expect(tree(f.root)).toEqual(before)
})

test('changes during staging cannot become the journal previousHash or overwrite author bytes on recovery', () => {
  const f = fixture()
  let injected = 0
  vi.spyOn(fs, 'writeFileSync').mockImplementation((...args) => {
    const result = native.writeFileSync(...args)
    if (String(args[0]).includes('/stage/') && injected++ === 0)
      native.writeFileSync(f.target, 'late-author')
    return result
  })
  expect(() => commitMigrationTransaction(f.repo, f.changes)).toThrow(/偏离规划快照|提交窗口被修改/)
  expect(injected).toBeGreaterThan(0)
  expect(fs.readFileSync(f.target, 'utf8')).toBe('late-author')
  const path = join(f.repo, '.type-pal-migrate/pal-journal.json')
  if (fs.existsSync(path)) {
    expect(JSON.parse(fs.readFileSync(path, 'utf8')).operations[0].previousHash).toBe(sha256(f.raw))
    expect(() => recoverMigrationTransaction(f.repo)).toThrow('提交窗口被修改')
    expect(fs.readFileSync(f.target, 'utf8')).toBe('late-author')
  }
})

test('a later target changed during earlier staging is not resampled into permission', () => {
  const f = fixture()
  const second = join(f.repo, 'projects/pal/content/z.json')
  put(second, 'original-second')
  f.changes.splice(1, 0, {
    target: 'projects/pal/content/z.json',
    scope: 'project',
    expectedPreviousHash: sha256('original-second'),
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

test('format-only byte changes and deletion after planning are still conflicts', () => {
  for (const variant of ['format', 'missing']) {
    const f = fixture()
    if (variant === 'format') put(f.target, serializeMigrationJson({ value: 1 }))
    else fs.unlinkSync(f.target)
    const before = tree(f.root)
    expect(() => commitMigrationTransaction(f.repo, f.changes)).toThrow('偏离规划快照')
    expect(tree(f.root)).toEqual(before)
  }
})

test('planning requires an observed scope and original hash, not serialized fallback', () => {
  const f = fixture()
  const before = structuredClone(f.project)
  const args = { repo: f.repo, plan: f.plan, projectSnapshot: f.project, nextBaseline: f.next }
  expect(buildMigrationTransactionChanges(args)).toEqual(f.changes)
  expect(f.project).toEqual(before)
  f.project.managedFiles.delete(f.path)
  expect(() => buildMigrationTransactionChanges(args)).toThrow('未纳入规划快照')
  f.project.managedFiles.add(f.path)
  f.project.hashes.delete(f.path)
  expect(() => buildMigrationTransactionChanges(args)).toThrow('缺原始字节 hash')
})
