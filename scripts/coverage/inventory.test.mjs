import assert from 'node:assert/strict'
import test from 'node:test'
import { auditScope, missingFromSuperset } from './inventory.mjs'

const packageScope = ({
  sources = ['packages/a/src/a.ts'],
  tests = [{ file: 'a.test.ts', testCount: 1, identityDigest: 'a' }],
  digest = 'a',
} = {}) => ({
  directory: 'packages/a',
  scopeDigest: sources.join('|'),
  sourceFileCount: sources.length,
  sourceFiles: sources,
  fastTests: {
    testCount: tests.reduce((sum, entry) => sum + entry.testCount, 0),
    fileEntries: tests,
    executionDigest: digest,
  },
})

test('full test inventory 必须包含 fast 的每个 identity', () => {
  assert.deepEqual(missingFromSuperset(['a', 'b'], ['b', 'a', 'c']), [])
  assert.deepEqual(missingFromSuperset(['a', 'b'], ['a']), ['b'])
})

test('scope audit 分别报告源码、测试和执行配置变化', () => {
  const baseline = { packages: { a: packageScope() } }
  const actual = {
    packages: {
      a: packageScope({
        sources: ['packages/a/src/b.ts'],
        tests: [{ file: 'b.test.ts', testCount: 1, identityDigest: 'b' }],
        digest: 'b',
      }),
    },
  }
  const result = auditScope(actual, baseline)
  assert.deepEqual(result.changes, [
    'a: source +1/-1（1 -> 1）',
    'a: coverage include/exclude/source digest 已变化',
    'a: fast test files +1/-1，内容变化 0（1 -> 1 tests）',
    'a: fast test execution config/digest 已变化',
  ])
  assert.deepEqual(result.removals, [
    { kind: 'source', value: 'packages/a/src/a.ts' },
    { kind: 'test-file', value: 'a.test.ts' },
  ])
})

test('同一测试文件减少 case 会形成显式 removal', () => {
  const baseline = {
    packages: {
      a: packageScope({
        tests: [{ file: 'a.test.ts', testCount: 2, identityDigest: 'old' }],
        digest: 'old',
      }),
    },
  }
  const actual = {
    packages: {
      a: packageScope({
        tests: [{ file: 'a.test.ts', testCount: 1, identityDigest: 'new' }],
        digest: 'new',
      }),
    },
  }
  assert.deepEqual(auditScope(actual, baseline).removals, [
    { kind: 'test-count', value: 'a.test.ts', previous: 2, current: 1 },
  ])
})

test('同一文件替换 case 身份仍报告变化，数量不减时不登记退役', () => {
  const baseline = { packages: { a: packageScope() } }
  const actual = {
    packages: {
      a: packageScope({
        tests: [{ file: 'a.test.ts', testCount: 1, identityDigest: 'replacement' }],
        digest: 'replacement',
      }),
    },
  }
  assert.deepEqual(auditScope(actual, baseline), {
    changes: [
      'a: fast test files +0/-0，内容变化 1（1 -> 1 tests）',
      'a: fast test execution config/digest 已变化',
    ],
    removals: [],
  })
})

test('package 的新增与移除分别报告，移除保留原目录供安全门核对', () => {
  const empty = { packages: {} }
  const populated = { packages: { a: packageScope() } }
  assert.deepEqual(auditScope(populated, empty), {
    changes: ['a: 新 package scope'],
    removals: [],
  })
  assert.deepEqual(auditScope(empty, populated), {
    changes: ['a: package scope 被移除'],
    removals: [{ kind: 'package', value: 'packages/a' }],
  })
})
