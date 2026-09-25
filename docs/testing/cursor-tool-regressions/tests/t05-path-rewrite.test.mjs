import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  rewriteLinks,
  rewriteRepositoryPaths,
  validateMoves,
} from '../../../../scripts/docs/relocate.mjs'

test('path rewrite helper import smoke', () => {
  assert.equal(process.exitCode, undefined)
  assert.equal(typeof validateMoves, 'function')
  assert.equal(typeof rewriteLinks, 'function')
  assert.equal(typeof rewriteRepositoryPaths, 'function')
})

test('suffix-distinct document paths validate and the entries array stays intact', () => {
  const entries = [
    { from: 'docs/a.md', to: 'docs/archive/a.md' },
    { from: 'docs/a.md.bak', to: 'docs/archive/a.md.bak' },
  ]
  const before = structuredClone(entries)
  assert.equal(validateMoves(entries), undefined)
  assert.deepEqual(entries, before)
})

test('a parent directory mapping rewrites a hyphenated child that is not under a deeper key', () => {
  const mapping = new Map([['docs/old', 'docs/archive/old']])
  const before = structuredClone([...mapping])
  const input = 'docs/old/deep-extra.md'
  assert.equal(rewriteRepositoryPaths(input, mapping), 'docs/archive/old/deep-extra.md')
  assert.deepEqual([...mapping], before)
})

test('repository path rewrite prefers the longest valid key and preserves SHA and unmatched suffixes', () => {
  const mapping = new Map([
    ['docs/old', 'docs/archive/old'],
    ['docs/old/deep', 'docs/archive/deep'],
  ])
  const before = structuredClone([...mapping])
  const input = [
    'docs/old/deep/file.md',
    'docs/old/note.md',
    'abcdef0:docs/old/deep/file.md',
    'docs/other/deep-extra.md',
  ].join('\n')
  assert.equal(
    rewriteRepositoryPaths(input, mapping),
    [
      'docs/archive/deep/file.md',
      'docs/archive/old/note.md',
      'abcdef0:docs/old/deep/file.md',
      'docs/other/deep-extra.md',
    ].join('\n'),
  )
  assert.deepEqual([...mapping], before)

  const deepOnly = new Map([['docs/old/deep', 'docs/archive/deep']])
  const beforeDeep = structuredClone([...deepOnly])
  assert.equal(rewriteRepositoryPaths('docs/old/deep-extra.md', deepOnly), 'docs/old/deep-extra.md')
  assert.deepEqual([...deepOnly], beforeDeep)
})

test('link rewrite changes destinations only, encoding bare spaces and keeping angle-bracket spaces', () => {
  const mapping = new Map([['docs/old/my file.md', 'docs/specs/my file.md']])
  const before = structuredClone([...mapping])
  const input = '正文不动 [标签](my%20file.md?x=1#p "标题") 以及 [角](<my file.md>)\n'
  assert.equal(
    rewriteLinks(input, 'docs/old/a.md', 'docs/archive/a.md', mapping),
    '正文不动 [标签](../specs/my%20file.md?x=1#p "标题") 以及 [角](<../specs/my file.md>)\n',
  )
  assert.deepEqual([...mapping], before)
})
