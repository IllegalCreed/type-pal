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

test('importing allowlist helpers does not run the design-system gate', () => {
  assert.equal(process.exitCode, undefined)
  assert.equal(typeof validateAllowlist, 'function')
  assert.equal(typeof evaluateAllowlist, 'function')
})

test('a non-empty legal allowlist entry is accepted and Cursor is not an owner', () => {
  const document = { version: 1, entries: [structuredClone(entry)] }
  const before = structuredClone(document)
  assert.deepEqual(validateAllowlist(document), [])
  assert.deepEqual(document, before)
  const cursorOwned = { ...entry, owner: 'Cursor' }
  assert.deepEqual(validateAllowlist({ version: 1, entries: [cursorOwned] }), [
    'entries[0].owner must name an Agent or card:ED-XXX',
  ])
})

test('file, line, and rule mismatches stay unapproved while the original entry is stale', () => {
  const document = { version: 1, entries: [structuredClone(entry)] }
  const axes = [
    { ...violation, file: 'Other.tsx' },
    { ...violation, line: 8 },
    { ...violation, rule: 'other-rule' },
  ]
  const beforeDocument = structuredClone(document)
  const beforeAxes = structuredClone(axes)
  for (const mismatched of axes) {
    assert.deepEqual(evaluateAllowlist(document, [mismatched]), {
      code: 2,
      active: [],
      unapproved: [mismatched],
      stale: ['Example.tsx:7:native-button'],
      problems: [],
    })
  }
  assert.deepEqual(document, beforeDocument)
  assert.deepEqual(axes, beforeAxes)
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
  const violations = [structuredClone(violation)]
  const before = structuredClone(violations)
  assert.deepEqual(evaluateAllowlist({ version: 2, entries: [] }, violations), {
    code: 2,
    active: [],
    unapproved: [],
    stale: [],
    problems: ['design-system-allowlist.json must contain { version: 1, entries: [] }'],
  })
  assert.deepEqual(evaluateAllowlist({ version: 1, entries: [null] }, violations), {
    code: 2,
    active: [],
    unapproved: [],
    stale: [],
    problems: ['entries[0] must be an object'],
  })
  assert.deepEqual(violations, before)
})
