import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  evaluateAllowlist,
  validateAllowlist,
} from '../../../../packages/editor/scripts/design-system-audit.mjs'

const entry = {
  file: 'Example.tsx',
  line: 7,
  rule: 'native-button',
  owner: 'Codex',
  reason: 'synthetic contract proof',
  verification: 'identity matches the synthetic violation',
  removalCondition: 'remove with the synthetic violation',
}

const violation = {
  file: 'Example.tsx',
  line: 7,
  rule: 'native-button',
  found: '<button>',
  recommendation: 'use DsButton',
}

test('allowlist helper import smoke', () => {
  assert.equal(process.exitCode, undefined)
  assert.equal(typeof validateAllowlist, 'function')
  assert.equal(typeof evaluateAllowlist, 'function')
})

test('a non-empty legal allowlist entry is accepted and Cursor is not an owner', () => {
  const document = { version: 1, entries: [structuredClone(entry)] }
  const beforeDocument = structuredClone(document)
  assert.deepEqual(validateAllowlist(document), [])
  assert.deepEqual(document, beforeDocument)

  const cursorDocument = { version: 1, entries: [{ ...entry, owner: 'Cursor' }] }
  const beforeCursor = structuredClone(cursorDocument)
  assert.deepEqual(validateAllowlist(cursorDocument), [
    'entries[0].owner must name an Agent or card:ED-XXX',
  ])
  assert.deepEqual(cursorDocument, beforeCursor)
})

test('file, line, and rule mismatches stay unapproved while the original entry is stale', () => {
  const axes = [
    {
      file: 'Other.tsx',
      line: 7,
      rule: 'native-button',
      found: '<button>',
      recommendation: 'use DsButton',
    },
    {
      file: 'Example.tsx',
      line: 8,
      rule: 'native-button',
      found: '<button>',
      recommendation: 'use DsButton',
    },
    {
      file: 'Example.tsx',
      line: 7,
      rule: 'other-rule',
      found: '<button>',
      recommendation: 'use DsButton',
    },
  ]
  for (const mismatched of axes) {
    const document = { version: 1, entries: [structuredClone(entry)] }
    const rows = [mismatched]
    const beforeDocument = structuredClone(document)
    const beforeRows = structuredClone(rows)
    assert.deepEqual(evaluateAllowlist(document, rows), {
      code: 2,
      active: [],
      unapproved: [mismatched],
      stale: ['Example.tsx:7:native-button'],
      problems: [],
    })
    assert.deepEqual(document, beforeDocument)
    assert.deepEqual(rows, beforeRows)
  }
})

test('an exact allowlist match returns the active identity and no stale or unapproved rows', () => {
  const document = { version: 1, entries: [structuredClone(entry)] }
  const rows = [structuredClone(violation)]
  const beforeDocument = structuredClone(document)
  const beforeRows = structuredClone(rows)
  assert.deepEqual(evaluateAllowlist(document, rows), {
    code: 0,
    active: ['Example.tsx:7:native-button'],
    unapproved: [],
    stale: [],
    problems: [],
  })
  assert.deepEqual(document, beforeDocument)
  assert.deepEqual(rows, beforeRows)
})

test('invalid allowlist shapes return problems and do not classify violations', () => {
  const versionDocument = { version: 2, entries: [] }
  const versionRows = [structuredClone(violation)]
  const beforeVersionDocument = structuredClone(versionDocument)
  const beforeVersionRows = structuredClone(versionRows)
  assert.deepEqual(evaluateAllowlist(versionDocument, versionRows), {
    code: 2,
    active: [],
    unapproved: [],
    stale: [],
    problems: ['design-system-allowlist.json must contain { version: 1, entries: [] }'],
  })
  assert.deepEqual(versionDocument, beforeVersionDocument)
  assert.deepEqual(versionRows, beforeVersionRows)

  const nullDocument = { version: 1, entries: [null] }
  const nullRows = [structuredClone(violation)]
  const beforeNullDocument = structuredClone(nullDocument)
  const beforeNullRows = structuredClone(nullRows)
  assert.deepEqual(evaluateAllowlist(nullDocument, nullRows), {
    code: 2,
    active: [],
    unapproved: [],
    stale: [],
    problems: ['entries[0] must be an object'],
  })
  assert.deepEqual(nullDocument, beforeNullDocument)
  assert.deepEqual(nullRows, beforeNullRows)
})
