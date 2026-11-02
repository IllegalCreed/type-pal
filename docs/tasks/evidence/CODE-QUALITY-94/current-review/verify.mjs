import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const folder = new URL('./', import.meta.url)
const root = fileURLToPath(new URL('../../../../../', import.meta.url))
const sha = (b) => createHash('sha256').update(b).digest('hex')
const review = JSON.parse(readFileSync(new URL('review.json', folder), 'utf8'))
const bytes = readFileSync(new URL(review.receipts.path, folder))
assert.equal(sha(bytes), review.receipts.sha256)
const packed = JSON.parse(gunzipSync(bytes))
assert.equal(Object.keys(packed.files).length, review.receipts.originalFiles)
for (const [name, item] of Object.entries(packed.files)) {
  assert.equal(Buffer.byteLength(item.text), item.bytes, name)
  assert.equal(sha(item.text), item.sha256, name)
}
assert.equal(review.files.length, 53)
for (const file of review.files) {
  const current = readFileSync(new URL(file.path, `file://${root}/`))
  assert.equal(sha(current), file.sha256, file.path)
  const original = execFileSync('git', ['show', `${review.base}:${file.path}`], { cwd: root })
  assert.equal(sha(original), file.baseSha256, file.path)
  assert.equal(file.changed, file.sha256 !== file.baseSha256, file.path)
  if (file.currentDisposition === 'retain-accepted') assert.equal(file.changed, false, file.path)
  else assert.deepEqual(Object.keys(file.dimensions).sort(), [...'ABCDEFGH'], file.path)
}
const json = (name) => JSON.parse(packed.files[name].text)
const failures = (native) =>
  native.testResults.flatMap((s) => s.assertionResults.filter((a) => a.status === 'failed'))
for (const [claim, evidence] of Object.entries(review.claimEvidence)) {
  const execution = json(`${evidence.red}.execution.json`)
  const native = json(`${evidence.red}.native.json`)
  assert.equal(execution.exit, 1, claim)
  assert.equal(native.numPendingTests, 0, claim)
  const failed = failures(native)
  assert.equal(native.numFailedTests, failed.length, claim)
  assert.deepEqual(
    failed.map((f) => f.fullName).sort(),
    [...evidence.expectedFailedFullNames].sort(),
    claim,
  )
  for (const test of failed) {
    assert(test.failureMessages.length > 0, claim)
    assert(
      test.failureMessages.every((message) => message.startsWith('AssertionError:')),
      claim,
    )
  }
}
for (const [name, total] of [
  ['opening-old-mutant', 8],
  ['opening-status-directed', 14],
  ['menu-save-related-r2', 147],
  ['helper-quality-r1', 51],
]) {
  assert.equal(json(`${name}.execution.json`).exit, 0, name)
  const native = json(`${name}.native.json`)
  assert.equal(native.numPassedTests, total, name)
  assert.equal(native.numFailedTests, 0, name)
  assert.equal(native.numPendingTests, 0, name)
  assert.equal(packed.files[`${name}.stderr.raw`].bytes, 0, name)
}
for (const name of ['game-typecheck-2', 'scoped-biome-1']) {
  assert.equal(json(`${name}.execution.json`).exit, 0, name)
  assert.equal(packed.files[`${name}.stderr.raw`].bytes, 0, name)
}
const fixture = json('fixture-proof.json')
for (const binding of fixture.bindings) {
  assert.equal(
    sha(readFileSync(new URL(binding.path, `file://${root}/`))),
    binding.sha256,
    binding.path,
  )
}
const { isApprovedTestRetirement } = await import(
  new URL('scripts/coverage/approved-test-retirements.mjs', `file://${root}/`)
)
const transfer = review.identityMapping.saveMetadataTransfer
const file = transfer.from.file
const nativeFile = json('menu-save-related-r2.native.json').testResults.find((r) =>
  r.name.endsWith(file),
)
const identityNames = nativeFile.assertionResults.map((a) =>
  [...a.ancestorTitles, a.title].join(' > '),
)
const digest = (names) =>
  sha(
    JSON.stringify(
      names.map((name) => `${file} :: project root :: ${name}`).sort((a, b) => a.localeCompare(b)),
    ),
  )
const baseline = JSON.parse(
  execFileSync('git', ['show', `${review.base}:scripts/coverage/baseline.fast.json`], {
    cwd: root,
  }),
).packages.game.fastTests.fileEntries.find((f) => f.file === file)
assert.equal(
  digest([
    ...identityNames,
    'SlotMeta.savedTimes — sdlpal uigame.c:589-597 真值 > savedTimes 从 gs.wSavedTimes 取(extractMeta 真值)',
  ]),
  baseline.identityDigest,
)
const proof = {
  removal: { kind: 'test-count', value: file, previous: 15, current: 14 },
  previous: baseline,
  current: { file, testCount: identityNames.length, identityDigest: digest(identityNames) },
  fileSha256: sha(readFileSync(new URL(file, `file://${root}/`))),
}
assert.equal(isApprovedTestRetirement(proof), true)
assert.equal(isApprovedTestRetirement({ ...proof, fileSha256: 'changed bytes' }), false)
const postflight = JSON.parse(gunzipSync(readFileSync(new URL('postflight.json.gz', folder))))
assert.equal(postflight.status, 'recorded')
assert.deepEqual(
  postflight.runs.map((run) => run.execution.id),
  [
    'docs-consumers-final',
    'lint-final-r2',
    'ledger-final',
    'diff-check-final-r2',
    'postflight-verifier-static',
  ],
)
for (const run of postflight.runs) {
  assert.equal(run.execution.exit, 0, run.execution.id)
  assert.equal(run.execution.signal, null, run.execution.id)
  assert.equal(run.stderr, '', run.execution.id)
}
console.log(
  `PASS:53 source/base bindings;${Object.keys(packed.files).length} original receipts;4 exact business red sets;green147+51;TC/scoped static. Read-only; no whole-gate or closure credit.`,
)
