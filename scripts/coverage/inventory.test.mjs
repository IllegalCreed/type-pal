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
  assert.equal(result.changes.length, 4)
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
      }),
    },
  }
  const actual = {
    packages: {
      a: packageScope({
        tests: [{ file: 'a.test.ts', testCount: 1, identityDigest: 'new' }],
      }),
    },
  }
  assert.deepEqual(auditScope(actual, baseline).removals, [
    { kind: 'test-count', value: 'a.test.ts', previous: 2, current: 1 },
  ])
})
