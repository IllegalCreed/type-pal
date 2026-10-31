import * as fs from 'node:fs'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { guardFixture, put, tree } from './__tests__/migration-guard-fixture.js'
import { assertMigrationFilePath } from './migration-path.js'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})
function fixture() {
  const f = guardFixture()
  roots.push(f.root)
  return f
}

test.each([
  '',
  '/absolute',
  '../escape',
  'a/../b',
  './a',
  'a//b',
  'a\\b',
  'a/',
])('rejects non-canonical path %s without writes', (path) => {
  const f = fixture(),
    before = tree(f.root)
  expect(() => assertMigrationFilePath(f.repo, path, 'test')).toThrow('规范仓库相对路径')
  expect(tree(f.root)).toEqual(before)
})
test('inspects missing hierarchy and regular targets without creating or changing files', () => {
  const f = fixture()
  const missing = tree(f.root)
  expect(assertMigrationFilePath(f.repo, 'a/b/c', 'test')).toBe(join(f.repo, 'a/b/c'))
  expect(tree(f.root)).toEqual(missing)
  put(join(f.repo, 'a/b/c'), 'data')
  const existing = tree(f.root)
  expect(assertMigrationFilePath(f.repo, 'a/b/c', 'test')).toBe(join(f.repo, 'a/b/c'))
  expect(tree(f.root)).toEqual(existing)
})

test.each([
  { name: 'directory leaves', path: 'a/b' },
  { name: 'non-directory parents', path: 'a/b/c/d' },
])('rejects $name without writes', ({ path }) => {
  const f = fixture()
  put(join(f.repo, 'a/b/c'), 'data')
  const before = tree(f.root)
  expect(() => assertMigrationFilePath(f.repo, path, 'test')).toThrow('路径类型无效')
  expect(tree(f.root)).toEqual(before)
})
