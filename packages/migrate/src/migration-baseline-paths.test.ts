import { createHash } from 'node:crypto'
import * as fs from 'node:fs'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { guardFixture, put, tree } from './__tests__/migration-guard-fixture.js'
import {
  assertPalBaselineSnapshotCurrent,
  baselineWrites,
  loadPalBaseline,
  type MigrationSnapshot,
  PAL_BASELINE_REL,
} from './migration-baseline.js'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

const escaped = '../../../../../outside/value.json'
const body = '{\n  "outsideOwned": 1\n}\n'
const digest = createHash('sha256').update(body).digest('hex')

function fixture() {
  const f = guardFixture()
  roots.push(f.root)
  put(join(f.outside, 'value.json'), body)
  return f
}

function writeManifest(repo: string, path: string | number) {
  put(
    join(repo, PAL_BASELINE_REL, '_state.json'),
    `${JSON.stringify({ version: 1, managedFiles: [path], files: { [path]: digest } }, null, 2)}\n`,
  )
}

test('loading rejects a baseline path that can reach an existing outside JSON file', () => {
  const f = fixture()
  writeManifest(f.repo, escaped)
  const before = tree(f.root)
  expect(() => loadPalBaseline(f.repo)).toThrow('规范相对')
  expect(tree(f.root)).toEqual(before)
})

test.each([
  '',
  'C:outside.json',
  './content/value.json',
  'content//value.json',
  'content\\value.json',
  0,
])('loading rejects non-canonical manifest path %j at the input boundary', (path) => {
  const f = fixture()
  writeManifest(f.repo, path)
  const before = tree(f.root)
  expect(() => loadPalBaseline(f.repo)).toThrow('规范相对')
  expect(tree(f.root)).toEqual(before)
})

test('loading rejects an absolute path to an owned outside JSON file', () => {
  const f = fixture()
  writeManifest(f.repo, join(f.outside, 'value.json'))
  const before = tree(f.root)
  expect(() => loadPalBaseline(f.repo)).toThrow('规范相对')
  expect(tree(f.root)).toEqual(before)
})

test('baseline publication refuses to emit paths that its loader must reject', () => {
  const snapshot: MigrationSnapshot = {
    files: new Map([[escaped, { outsideOwned: 1 }]]),
    managedFiles: new Set([escaped]),
  }
  expect(() => baselineWrites(snapshot)).toThrow('规范相对')
})

test('TOCTOU verification rejects a matching but out-of-root snapshot', () => {
  const f = fixture()
  writeManifest(f.repo, escaped)
  const snapshot: MigrationSnapshot = {
    files: new Map([[escaped, { outsideOwned: 1 }]]),
    managedFiles: new Set([escaped]),
  }
  const before = tree(f.root)
  expect(() => assertPalBaselineSnapshotCurrent(f.repo, snapshot)).toThrow('规范相对')
  expect(tree(f.root)).toEqual(before)
})
