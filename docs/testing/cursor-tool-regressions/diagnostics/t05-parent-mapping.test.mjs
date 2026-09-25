import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rewriteRepositoryPaths } from '../../../../scripts/docs/relocate.mjs'

const parentOnly = new Map([['docs/old', 'docs/archive/old']])
const both = new Map([
  ['docs/old', 'docs/archive/old'],
  ['docs/old/deep', 'docs/archive/deep'],
])
const input = 'docs/old/deep-extra.md'

test('parent-only mapping rewrites a hyphenated path that is not under the deeper directory', () => {
  const mapping = new Map(parentOnly)
  const before = structuredClone([...mapping])
  assert.equal(rewriteRepositoryPaths(input, mapping), 'docs/archive/old/deep-extra.md')
  assert.deepEqual([...mapping], before)
})

test('an inapplicable deeper mapping must not hide the still-valid parent rewrite', () => {
  const mapping = new Map(both)
  const before = structuredClone([...mapping])
  assert.equal(rewriteRepositoryPaths(input, mapping), 'docs/archive/old/deep-extra.md')
  assert.deepEqual([...mapping], before)
})
