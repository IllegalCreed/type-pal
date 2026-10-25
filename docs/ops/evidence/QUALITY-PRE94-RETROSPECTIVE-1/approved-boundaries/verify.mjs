import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const folder = dirname(fileURLToPath(import.meta.url))
const root = resolve(folder, '../../../../..')
const read = (path) => readFileSync(join(root, path))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const review = JSON.parse(readFileSync(join(folder, 'review.json')))
const stale = [...review.files, ...review.contextPins].filter(
  (pin) => hash(read(pin.path)) !== pin.sha256,
)
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', affected: stale.map((pin) => pin.path) }))
  process.exit(2)
}
for (const row of review.files) {
  assert.deepEqual(Object.keys(row.dimensions), [...'ABCDEFGH'])
  assert.equal(
    hash(execFileSync('git', ['show', `${review.base}:${row.path}`], { cwd: root })),
    row.baseSha256,
  )
  if (row.inheritedReview) {
    assert.equal(hash(read(row.inheritedReview)), row.inheritedReviewSha256)
    const inherited = JSON.parse(read(row.inheritedReview)).files.find(
      (item) => item.path === row.path,
    )
    assert.equal(inherited.sha256, row.inheritedSourceSha256)
  }
}
assert.equal(
  hash(execFileSync('git', ['diff', review.base, '--', ...review.changedPaths], { cwd: root })),
  review.patchSha256,
)
const compressed = readFileSync(join(folder, review.receipts.path))
assert.equal(hash(compressed), review.receipts.sha256)
const archive = JSON.parse(gunzipSync(compressed))
for (const [name, row] of Object.entries(archive)) {
  const bytes = Buffer.from(row.base64, 'base64')
  assert.equal(bytes.length, row.bytes, name)
  assert.equal(hash(bytes), row.sha256, name)
}
const text = (name) => Buffer.from(archive[name].base64, 'base64').toString()
const json = (name) => JSON.parse(text(name))
const red = json('approved-red.native.json'),
  green = json('approved-green.native.json')
assert.equal(red.numPassedTests, 33)
assert.equal(red.numFailedTests, 2)
assert.equal(red.numPendingTests, 0)
const failures = red.testResults.flatMap((file) =>
  file.assertionResults.filter((test) => test.status === 'failed'),
)
assert.equal(failures.length, 2)
assert(
  failures.every((test) =>
    test.failureMessages.every((message) => message.includes('AssertionError')),
  ),
)
assert(failures.some((test) => test.fullName.includes('正防御跨过 SHORT')))
assert(failures.some((test) => test.fullName.includes('脚本慢速跨样式与姓名')))
assert.equal(green.numPassedTests, 131)
assert.equal(green.numFailedTests, 0)
assert.equal(green.numPendingTests, 0)
assert.equal(green.testResults.length, 4)
for (const file of red.testResults)
  for (const test of file.assertionResults) {
    assert(
      green.testResults.some(
        (suite) =>
          suite.name === file.name &&
          suite.assertionResults.some(
            (item) => item.fullName === test.fullName && item.status === 'passed',
          ),
      ),
    )
  }
for (const id of ['approved-green', 'game-typecheck']) {
  const execution = json(`${id}.execution.json`)
  assert.equal(execution.exit, 0)
  assert.equal(execution.signal, null)
  assert.equal(execution.spawnError, null)
  assert.equal(text(`${id}.stderr.raw`), '')
}
assert(json('approved-green.execution.json').args.includes('--reporter=default'))
console.log(
  JSON.stringify({
    state: 'MATCH',
    acceptedCodeCards: ['3m', '42'],
    directed: 131,
    formalBusinessReds: 2,
    unifiedGates: 'deferred until CODE1 complete',
    limit: review.invalidation,
  }),
)
