import { expect, test } from 'vitest'
import { type AuthorSavePlan, savePrefix } from './author-save-plan.js'
import { reconcileSaveCursor } from './author-save-prefix.js'

const old = `bin:1:${'a'.repeat(64)}` as const
const next = `bin:2:${'b'.repeat(64)}` as const
const empty = 'bin:0:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' as const
const plan: AuthorSavePlan = {
  kind: 'type-pal-author-save-plan',
  version: 1,
  contentVersion: 20,
  operationId: 'cf448da8-601d-4c9c-bbdc-235b7d61d483',
  identity: {
    workspaceId: 'cf448da8-601d-4c9c-bbdc-235b7d61d483',
    projectId: 'demo',
    mode: 'local-project',
    source: 'blank-project',
  },
  before: { 'kept.json': old, 'new.json': null, 'remove.json': old, 'catalog.json': old },
  directories: { empty: false },
  steps: [
    { kind: 'write', path: 'new.json', signature: next },
    { kind: 'write', path: 'catalog.json', signature: next },
    { kind: 'remove', path: 'remove.json' },
    { kind: 'mkdir', path: 'empty' },
    { kind: 'write', path: 'catalog.json', signature: old },
  ],
}
test.each([0, 1, 2, 3, 4, 5])('accepts exact idle prefix %i', (completed) => {
  const cursor = { completed, issued: false }
  expect(reconcileSaveCursor(plan, cursor, savePrefix(plan, completed))).toEqual(cursor)
})
test.each([
  0, 1, 2, 3, 4,
])('reconciles before/after issued step %i, without replaying an observed close', (completed) => {
  const cursor = { completed, issued: true }
  expect(reconcileSaveCursor(plan, cursor, savePrefix(plan, completed))).toEqual(cursor)
  expect(reconcileSaveCursor(plan, cursor, savePrefix(plan, completed + 1))).toEqual({
    completed: completed + 1,
    issued: false,
  })
})
test('accepts an empty create placeholder ONLY at the issued new write', () => {
  const disk = savePrefix(plan, 0)
  disk.files.set('new.json', empty)
  expect(reconcileSaveCursor(plan, { completed: 0, issued: true }, disk)).toEqual({
    completed: 0,
    issued: true,
  })
  expect(() => reconcileSaveCursor(plan, { completed: 0, issued: false }, disk)).toThrow('new.json')
  const existing = savePrefix(plan, 1)
  existing.files.set('catalog.json', empty)
  expect(() => reconcileSaveCursor(plan, { completed: 1, issued: true }, existing)).toThrow(
    'catalog.json',
  )
})
test.each([
  'kept.json',
  'new.json',
  'catalog.json',
  'remove.json',
])('rejects foreign changes to %s', (path) => {
  const disk = savePrefix(plan, 1)
  disk.files.set(path, `bin:3:${'c'.repeat(64)}`)
  expect(() => reconcileSaveCursor(plan, { completed: 1, issued: true }, disk)).toThrow(path)
})
test('rejects a future target, missing observation and unexpected directory, not just current file mismatch', () => {
  const future = savePrefix(plan, 0)
  future.files.set('catalog.json', next)
  expect(() => reconcileSaveCursor(plan, { completed: 0, issued: true }, future)).toThrow(
    'catalog.json',
  )
  const missing = savePrefix(plan, 0)
  missing.files.delete('new.json')
  expect(() => reconcileSaveCursor(plan, { completed: 0, issued: false }, missing)).toThrow(
    'new.json',
  )
  const directory = savePrefix(plan, 0)
  directory.directories.set('empty', true)
  expect(() => reconcileSaveCursor(plan, { completed: 0, issued: false }, directory)).toThrow(
    'empty',
  )
  const unobserved = savePrefix(plan, 3)
  unobserved.directories.delete('empty')
  expect(() => reconcileSaveCursor(plan, { completed: 3, issued: true }, unobserved)).toThrow(
    'empty',
  )
})
test('rejects missing/wrong directory observations and malformed cursors', () => {
  const missing = savePrefix(plan, 0)
  missing.directories.delete('empty')
  expect(() => reconcileSaveCursor(plan, { completed: 0, issued: false }, missing)).toThrow('empty')
  expect(() =>
    reconcileSaveCursor(plan, { completed: 5, issued: true }, savePrefix(plan, 5)),
  ).toThrow('已完成')
  expect(() =>
    reconcileSaveCursor(
      plan,
      { completed: 0, issued: 1 as unknown as boolean },
      savePrefix(plan, 0),
    ),
  ).toThrow('issued')
  expect(() =>
    reconcileSaveCursor(plan, { completed: -1, issued: false }, savePrefix(plan, 0)),
  ).toThrow('游标')
})
