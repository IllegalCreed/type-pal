import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const folder = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(folder, '../../../../..')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const read = (name) => fs.readFileSync(path.resolve(root, name))
const json = (name) => JSON.parse(read(name))
const review = JSON.parse(fs.readFileSync(path.join(folder, 'review.json')))
const poison = json(review.poisonRepair.path)
const battle = json(
  'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/event-battle-returns/review.json',
)
const pins = [
  ...review.files,
  ...review.context,
  ...review.primary,
  ...review.externalAssets,
  ...review.inheritedReports,
  review.poisonRepair,
  ...battle.files,
  ...battle.commentOnly,
  ...battle.context,
]
const stale = pins.filter(
  (pin) => !fs.existsSync(path.resolve(root, pin.path)) || hash(read(pin.path)) !== pin.sha256,
)
if (stale.length) {
  console.log(
    JSON.stringify({
      state: 'STALE',
      paths: [...new Set(stale.map((pin) => pin.path))],
      scope: 'Revalidate affected claims only.',
    }),
  )
  process.exitCode = 2
} else {
  for (const file of review.files) assert.deepEqual(Object.keys(file.dimensions), [...'ABCDEFGH'])
  assert.equal(review.files.filter((file) => file.decision.startsWith('accept-code')).length, 15)
  const unpack = (meta, base = root) => {
    const compressed = fs.readFileSync(path.resolve(base, meta.path))
    assert.equal(hash(compressed), meta.sha256)
    const entries = new Map()
    for (const [name, item] of Object.entries(JSON.parse(gunzipSync(compressed)))) {
      const bytes = Buffer.from(item.base64, 'base64')
      assert.equal(bytes.length, item.bytes, name)
      assert.equal(hash(bytes), item.sha256, name)
      entries.set(name, bytes)
    }
    assert.equal(entries.size, meta.entries)
    return entries
  }
  const staticReport = JSON.parse(fs.readFileSync(path.join(folder, 'static.json')))
  const staticArchive = unpack(staticReport.artifact, folder)
  for (const run of staticReport.successfulRuns) {
    const actual = JSON.parse(staticArchive.get(`${run.id}.execution.json`))
    assert.equal(actual.exit, 0)
    assert.equal(actual.signal, null)
    assert.equal(actual.spawnError, null)
    assert.equal(staticArchive.get(run.stderr).length, 0)
  }
  assert(
    staticArchive
      .get('lint-zero-final.stdout.raw')
      .toString()
      .includes('0 errors / 0 warnings / 0 infos'),
  )
  const cards = json('docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.json').cards
  for (const id of ['3o', '3p'])
    assert.equal(cards.find((card) => card.id === id).currentAcceptance, true)
  const current = unpack(poison.receipts)
  const assets = unpack(battle.receipts)
  const copy = unpack(review.receipts)
  const inherited = unpack(review.oldRawArchive, path.resolve(folder, '../mode-player-quality'))
  const native = (archive, id, passed, failed, files) => {
    const execution = JSON.parse(archive.get(`${id}.execution.json`))
    const result = JSON.parse(archive.get(`${id}.vitest.json`))
    assert.equal(execution.exit, failed ? 1 : 0, id)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
    assert.equal(result.numPassedTests, passed)
    assert.equal(result.numFailedTests, failed)
    assert.equal(result.numTotalTests, passed + failed)
    assert.equal(result.numPendingTests, 0)
    assert.equal(result.numTodoTests, 0)
    assert.equal(result.testResults.length, files)
    const cases = result.testResults.flatMap((file) => file.assertionResults)
    assert.equal(cases.length, passed + failed)
    for (const test of cases.filter((test) => test.status === 'failed')) {
      assert(test.failureMessages.length > 0)
      assert(test.failureMessages.every((message) => message.startsWith('AssertionError:')))
    }
    if (!failed) {
      assert.equal(archive.get(`${id}.stderr.raw`).length, 0, id)
      assert(!/\b(?:stdout|stderr)\s*\|/.test(archive.get(`${id}.stdout.raw`).toString()), id)
    }
    return cases
  }
  const red = native(current, 'entry-frozen-red', 3, 4, 1)
  const green = native(current, 'entry-final-recovery', 7, 0, 1)
  assert.deepEqual(
    red.map((test) => test.fullName),
    green.map((test) => test.fullName),
  )
  assert.equal(
    hash(current.get('entry-red-spec.ts')),
    hash(read('packages/game/src/core/player-poison-equipment-lifecycle.test.ts')),
  )
  assert.equal(
    hash(current.get('entry-after.ts')),
    hash(read('packages/game/src/core/player-poison-state.ts')),
  )
  assert.equal(JSON.parse(current.get('entry-frozen-restore.json')).restored, true)
  const copied = native(current, 'copy-packet-counter', 6, 1, 1)
  assert(copied.find((test) => test.status === 'failed').fullName.includes('卸Wear'))
  assert.equal(JSON.parse(current.get('copy-packet-restore.json')).restored, true)
  native(current, 'entry-adjacent', 491, 0, 11)
  const sliceRed = native(assets, 'battle-slice-red', 14, 2, 1)
  const sliceGreen = native(assets, 'battle-slice-green', 83, 0, 9)
  const greenNames = new Set(sliceGreen.map((test) => test.fullName))
  assert(sliceRed.every((test) => greenNames.has(test.fullName)))
  const original = JSON.parse(inherited.get('final-local.vitest.json')).testResults
  const expected = new Map([
    ['dialog-history.test.ts', 7],
    ['mode.test.ts', 10],
    ['scene-system-search.test.ts', 12],
  ])
  for (const [name, count] of expected)
    assert.equal(
      original.find((file) => file.name.endsWith(`/${name}`)).assertionResults.length,
      count,
    )
  for (const [id, passed, failed] of [
    ['cap-50-old', 7, 0],
    ['cap-50-new', 5, 2],
    ['mutate-restore-input-old', 7, 0],
    ['mutate-restore-input-new', 6, 1],
    ['force-all-mp-success-old', 6, 0],
    ['force-all-mp-success-new', 4, 2],
    ['wrong-unknown-role-diagnostic-old', 41, 0],
    ['wrong-unknown-role-diagnostic-new', 40, 1],
  ])
    native(inherited, id, passed, failed, 1)
  const ts = createRequire(path.join(root, 'package.json'))('typescript')
  const print = (source) => {
    const parsed = ts.createSourceFile('f.ts', source, ts.ScriptTarget.Latest, true)
    assert.equal(parsed.parseDiagnostics.length, 0)
    return ts.createPrinter({ removeComments: true }).printFile(parsed)
  }
  assert.notEqual(print('const x=1'), print('const x=2'))
  const proof = JSON.parse(copy.get(review.commentProof.member))
  for (const row of proof.rows) {
    const before = execFileSync('git', ['show', `${proof.base}:${row.path}`], {
      cwd: root,
      encoding: 'utf8',
    })
    const after = read(row.path).toString()
    assert.equal(hash(before), row.before)
    assert.equal(hash(after), row.after)
    assert.equal(print(before), print(after), row.path)
  }
  for (const [archive, id] of [
    [current, 'game-typecheck'],
    [assets, 'extract-typecheck'],
    [copy, 'source-lint-final'],
  ]) {
    assert.equal(JSON.parse(archive.get(`${id}.execution.json`)).exit, 0)
    assert.equal(archive.get(`${id}.stderr.raw`).length, 0)
    assert(!/\b(?:error|warning|info)\b/i.test(archive.get(`${id}.stdout.raw`).toString()))
  }
  const raw = JSON.parse(assets.get('battle-return-fixed.json'))
  assert.equal(raw.inputHashesStable, true)
  assert.equal(raw.rawByteRoundtripExact, true)
  assert.equal(raw.fixtureByteRoundtripExact, true)
  assert.equal(raw.missingInUnion.length, 0)
  assert.deepEqual(raw.sliceDelta.removed, [])
  assert.equal(raw.sliceDelta.added.length, 15)
  assert.equal(raw.instructions, 43503)
  console.log(
    JSON.stringify({
      state: 'MATCH',
      wholeFiles: 15,
      cards: ['3o', '3p'],
      poisonBusinessRed: 4,
      identityCounterRed: 1,
      sliceBusinessRed: 2,
      adjacent: ['491/11 game', '83/9 extract'],
      unifiedGates: 'DEFERRED',
      scope:
        'Pinned evidence and declared contracts only; not whole pre94 completion, browser or semantic auto-certification.',
    }),
  )
}
