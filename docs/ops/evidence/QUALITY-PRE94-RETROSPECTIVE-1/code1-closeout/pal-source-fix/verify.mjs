import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const folder = dirname(fileURLToPath(import.meta.url))
const root = resolve(folder, '../../../../../..')
const read = (path) => {
  try {
    return readFileSync(join(root, path))
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.log(JSON.stringify({ state: 'UNAVAILABLE', missing: path }))
      process.exit(3)
    }
    throw error
  }
}
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const review = JSON.parse(readFileSync(join(folder, 'review.json')))
for (const path of review.configurationAbsences) {
  if (existsSync(join(root, path))) {
    console.log(JSON.stringify({ state: 'STALE', newConfiguration: path }))
    process.exit(2)
  }
}
const oldCode1 = JSON.parse(read(review.inheritance.code1Review.path))
const fixturePath = join(dirname(review.inheritance.code1Review.path), oldCode1.fixtureInputs.path)
assert.equal(hash(read(fixturePath)), oldCode1.fixtureInputs.sha256)
const fixtures = JSON.parse(read(fixturePath))
assert.equal(fixtures.length, 539)
const pins = [
  ...review.files,
  ...review.contextPins,
  ...review.inheritance.code1UnchangedContext,
  ...review.inheritance.engineering.files,
  ...fixtures,
]
const stale = pins.filter((pin) => hash(read(pin.path)) !== pin.sha256)
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', affected: stale.map((pin) => pin.path) }))
  process.exit(2)
}
for (const file of review.files) assert.deepEqual(Object.keys(file.dimensions), [...'ABCDEFGH'])
for (const key of ['code1Review', 'rleReview']) {
  const prior = review.inheritance[key]
  assert.equal(hash(read(prior.path)), prior.sha256)
}
assert.equal(
  hash(read(review.inheritance.engineering.acceptance)),
  review.inheritance.engineering.acceptanceSha256,
)
assert.equal(
  hash(read(review.inheritance.engineering.dimensions)),
  review.inheritance.engineering.dimensionsSha256,
)
assert.equal(
  hash(read(review.inheritance.q1b)),
  hash(execFileSync('git', ['show', `${review.base}:${review.inheritance.q1b}`], { cwd: root })),
)
assert.equal(
  hash(execFileSync('git', ['diff', review.base, '--', ...review.sourcePatchPaths], { cwd: root })),
  review.sourcePatchSha256,
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
for (const gate of Object.values(review.gates)) {
  const native = json(`${gate.id}.native.json`),
    execution = json(`${gate.id}.execution.json`)
  assert.equal(native.numPassedTests, gate.passed)
  assert.equal(native.numFailedTests, 0)
  assert.equal(native.numPendingTests, 0)
  assert.equal(native.testResults.length, gate.files)
  assert(
    native.testResults.every((file) =>
      file.assertionResults.every((test) => test.status === 'passed'),
    ),
  )
  assert.equal(execution.exit, 0)
  assert.equal(execution.signal, null)
  assert.equal(execution.spawnError, null)
  assert(execution.args.includes('--reporter=default'))
  assert.equal(text(`${gate.id}.stderr.raw`), '')
}
for (const id of [
  ...review.typechecks,
  'ending-fixed',
  'writer-closure',
  'source-census-repaired',
]) {
  const e = json(`${id}.execution.json`)
  assert.equal(e.exit, 0)
  assert.equal(e.signal, null)
  assert.equal(e.spawnError, null)
  assert.equal(text(`${id}.stderr.raw`), '')
}
for (const id of ['pal-red', 'final-counter']) {
  const native = json(`${id}.native.json`)
  assert.equal(native.numPassedTests, 2)
  assert.equal(native.numFailedTests, 2)
  assert.equal(native.numPendingTests, 0)
  const failed = native.testResults.flatMap((f) =>
    f.assertionResults.filter((t) => t.status === 'failed'),
  )
  assert.equal(failed.length, 2)
  assert(failed.every((t) => t.failureMessages.every((m) => m.includes('AssertionError'))))
  assert(failed.some((t) => t.fullName.startsWith('PAL来源的0x18444偏移')))
  assert(failed.some((t) => t.fullName.startsWith('PAL来源的高位指令')))
}
const counter = json('final-counter-proof.json')
assert.equal(counter.base, review.base)
assert.equal(counter.finalSpecSha256, hash(read('packages/shared/src/pal-rle.test.ts')))
assert.equal(
  counter.baseSourceSha256,
  hash(execFileSync('git', ['show', `${review.base}:packages/shared/src/rle.ts`], { cwd: root })),
)
assert.equal(
  counter.aliasOnlyAppend,
  '\nexport const decodePalRle = decodeRle\nexport const parsePalSpriteChunk = parseSpriteChunk\nexport const parsePalSpriteChunkStrict = parseSpriteChunkStrict\n',
)
assert.equal(counter.temporaryRemoved, true)
assert.equal(counter.trackedSourceUnchanged, true)
const census = json('source-census.json')
assert.equal(census.records.length, 1428)
assert.deepEqual(census.changed, review.sourceProof.changed)
assert.equal(census.reforge.frames, 2)
assert.equal(census.reforge.decode.skippedLegacyTailSlots, 0)
assert.equal(census.reforge.authoredFrames, 2)
assert.equal(census.reforge.authoredProfile, 'canonical')
for (const pin of census.inputs) assert.equal(hash(read(pin.path)), pin.sha256)
const previousRle = JSON.parse(read(review.inheritance.rleReview.path))
const previousArchive = JSON.parse(
  gunzipSync(read(join(dirname(review.inheritance.rleReview.path), previousRle.receipts.path))),
)
const previousNative = previousArchive.members.find((row) => row.name === 'native571.json')
assert(previousNative)
assert.equal(previousNative.sha256, archive['native571.json'].sha256)
const native = json('native571.json')
for (let index = 0; index < 2; index++) {
  assert.equal(census.pngProof[index].pixelsSha256, native.native.frames[index].pixelsSha256)
  assert.equal(census.pngProof[index].opaqueSha256, native.native.frames[index].opaqueSha256)
}
const ending = json('ending-counter.json')
assert.equal(ending.results.actualFrames, 2)
assert.equal(ending.results.actual.sha256, native.native.frames[1].pixelsSha256)
assert.equal(ending.results.actual.nonZero, 23036)
assert.deepEqual(ending.diagnostics, [])
assert.equal(ending.browserClosed, true)
assert.equal(hash(readFileSync(join(folder, review.screenshot.path))), review.screenshot.sha256)
const writer = json('writer-closure.json')
assert.equal(writer.files.length, 809)
assert.equal(writer.secondRunZeroDiff, true)
assert.equal(writer.temporaryRemoved, true)
for (const pin of writer.files) assert.equal(hash(read(`data/extracted/${pin.path}`)), pin.sha256)
assert.match(text('writer-closure.stdout.raw'), /636 sprites, 4134 frames total/)
assert.equal(review.retained.spriteWrapper.includes('whole-file review retained'), true)
console.log(
  JSON.stringify({
    state: 'MATCH',
    codeCard: 'CODE1',
    directedAndAdjacent: 164,
    businessReds: 2,
    sourceRecords: 1428,
    changedRawFrame: 'MGO571',
    writerFiles: 809,
    unifiedGates: 'not certified by this verifier',
    limit: census.scope,
  }),
)
