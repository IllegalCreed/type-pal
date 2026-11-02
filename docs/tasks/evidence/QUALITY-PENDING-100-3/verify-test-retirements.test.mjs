import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { verifyTestRetirements } from './verify-test-retirements.mjs'

const root = pathToFileURL(`${process.cwd()}/`)
const callback = `() => {
  const source = new ReplayInputSource([])
  const snapshot = source.nextSnapshot(0)
  expect(snapshot.held.size).toBe(0)
  expect(snapshot.pressed.size).toBe(0)
}`
const frozen = { 'before.ts': `describe('replay', () => { it('empty', ${callback}) })` }
const current = {
  'after.ts': `describe('recording', () => { it('empty frame', () => {
    const source = new ReplayInputSource([])
    const shot = source.nextSnapshot(8)
    expect(shot.frameNum).toBe(8)
    expect(shot.held.size).toBe(0)
    expect(shot.pressed.size).toBe(0)
  }) })`,
}
const destination = {
  file: 'after.ts',
  titles: ['recording'],
  template: 'empty frame',
  fullName: 'recording empty frame',
}
const entry = {
  old: {
    file: 'before.ts',
    ordinal: 0,
    fullName: 'replay empty',
    callbackSha256: createHash('sha256').update(callback).digest('hex'),
    assertionStatements: 2,
  },
  current: destination,
  identifierRenames: { snapshot: 'shot' },
  reason: 'The empty held/pressed contract is preserved with an additional caller-frame oracle.',
  inputEquivalence:
    'Both construct an empty ReplayInputSource; frame0/8 does not change the empty sets.',
}
const verify = (candidate, registrations = [{ current: destination }]) =>
  verifyTestRetirements(root, frozen, candidate, [entry], registrations)

test('keeps the old identity and requires both direct assertions in its named survivor', () => {
  assert.deepEqual(verify(current), [{ file: 'before.ts', fullName: 'replay empty' }])
})
test('rejects a survivor missing the pressed assertion', () => {
  assert.throws(
    () =>
      verify({ 'after.ts': current['after.ts'].replace('expect(shot.pressed.size).toBe(0)', '') }),
    /missing or weakened/,
  )
})
test('rejects a changed expected value and an assertion hidden behind a condition', () => {
  assert.throws(
    () =>
      verify({
        'after.ts': current['after.ts'].replace(
          'shot.pressed.size).toBe(0)',
          'shot.pressed.size).toBe(1)',
        ),
      }),
    /missing or weakened/,
  )
  assert.throws(
    () =>
      verify({
        'after.ts': current['after.ts'].replace(
          'expect(shot.pressed.size).toBe(0)',
          'if (false) expect(shot.pressed.size).toBe(0)',
        ),
      }),
    /Nested or conditional/,
  )
})
test('rejects an unregistered survivor rather than allowing a silent case drop', () => {
  assert.throws(() => verify(current, []))
})
