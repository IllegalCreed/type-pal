import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  applyRelocation,
  digest,
  rewriteLinks,
  rewriteRepositoryPaths,
  validateMoves,
} from './relocate.mjs'

test('relocation edits only destinations, preserving formula text, labels, titles and code', () => {
  const input =
    '# Audit\n`trail[m](=leader+offset)`\n[label [nested]](../b.md#proof "Evidence")\n![图](<../asset image.png>)\n```md\n[example](../old.md)\n```\n'
  const out = rewriteLinks(
    input,
    'docs/old/a.md',
    'docs/archive/a.md',
    new Map([['docs/b.md', 'docs/specs/b.md']]),
  )
  assert.equal(out, input.replace('../b.md#proof', '../specs/b.md#proof'))
})

test('reference definitions are rewritten once and keep explanation and all usages', () => {
  const input = '[ref]: old.md "Title"\n[one][ref] [ref][] [ref]\n'
  assert.equal(
    rewriteLinks(input, 'docs/a.md', 'docs/new/a.md', new Map([['docs/old.md', 'docs/b.md']])),
    '[ref]: ../b.md "Title"\n[one][ref] [ref][] [ref]\n',
  )
})

test('repository paths update once and preserve Git historical object identities', () => {
  const map = new Map([
    ['docs/a.md', 'docs/archive/a.md'],
    ['docs/folder', 'docs/archive/folder'],
  ])
  assert.equal(
    rewriteRepositoryPaths(
      'docs/a.md:15; f1466374^:docs/a.md; docs/a.md.bak; docs/folder/x.md',
      map,
    ),
    'docs/archive/a.md:15; f1466374^:docs/a.md; docs/a.md.bak; docs/archive/folder/x.md',
  )
})

test('unsafe, colliding and overlapping paths fail before writes', () => {
  assert.throws(() => validateMoves([{ from: 'docs/a.md', to: '../a.md' }]), /Unsafe/)
  assert.throws(
    () =>
      validateMoves([
        { from: 'docs/a.md', to: 'docs/b.md' },
        { from: 'docs/c.md', to: 'docs/b.md' },
      ]),
    /Duplicate/,
  )
  const dir = mkdtempSync(join(tmpdir(), 'type-pal-doc-move-'))
  writeFileSync(join(dir, 'a.md'), 'original')
  writeFileSync(join(dir, 'b.md'), 'other')
  const entries = [
    { from: 'a.md', to: 'next/a.md', sha256: digest('original') },
    { from: 'b.md', to: 'next/b.md', sha256: digest('stale') },
  ]
  assert.throws(
    () => applyRelocation(dir, entries, new Map(), { write: true }),
    /changed since planning/,
  )
  assert.equal(readFileSync(join(dir, 'a.md'), 'utf8'), 'original')
  assert.equal(existsSync(join(dir, 'next/a.md')), false)
})

test('dry-run preserves files and write keeps every payload while rebasing links', () => {
  const dir = mkdtempSync(join(tmpdir(), 'type-pal-doc-move-'))
  writeFileSync(join(dir, 'a.md'), '[b](b.md)')
  writeFileSync(join(dir, 'b.md'), 'history [5] (=value)')
  const entries = [
    { from: 'a.md', to: 'archive/a.md', sha256: digest('[b](b.md)') },
    { from: 'b.md', to: 'b.md', sha256: digest('history [5] (=value)') },
  ]
  applyRelocation(dir, entries, new Map(entries.map((entry) => [entry.from, entry.to])))
  assert.equal(existsSync(join(dir, 'archive/a.md')), false)
  applyRelocation(dir, entries, new Map(entries.map((entry) => [entry.from, entry.to])), {
    write: true,
  })
  assert.equal(readFileSync(join(dir, 'archive/a.md'), 'utf8'), '[b](../b.md)')
  assert.equal(readFileSync(join(dir, 'b.md'), 'utf8'), 'history [5] (=value)')
  assert.equal(existsSync(join(dir, 'a.md')), false)
})
