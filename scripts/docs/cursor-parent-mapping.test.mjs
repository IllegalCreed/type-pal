import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rewriteRepositoryPaths } from './relocate.mjs'

const parentOnly = new Map([['docs/old', 'docs/archive/old']])
const both = new Map([
  ['docs/old', 'docs/archive/old'],
  ['docs/old/deep', 'docs/archive/deep'],
])
const input = 'docs/old/deep-extra.md'

test('an inapplicable deeper mapping must not hide the still-valid parent rewrite', () => {
  const mapping = new Map(both)
  const before = structuredClone([...mapping])
  assert.equal(rewriteRepositoryPaths(input, parentOnly), 'docs/archive/old/deep-extra.md')
  assert.equal(rewriteRepositoryPaths(input, mapping), 'docs/archive/old/deep-extra.md')
  assert.deepEqual([...mapping], before)
})
