import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const folder = dirname(fileURLToPath(import.meta.url)),
  root = resolve(folder, '../../../../..')
const read = (p) => readFileSync(join(root, p)),
  hash = (b) => createHash('sha256').update(b).digest('hex')
const report = JSON.parse(readFileSync(join(folder, 'review.json')))
const stale = [...report.files, ...report.contextPins, ...report.inherited].filter(
  (p) => hash(read(p.path)) !== p.sha256,
)
if (stale.length) {
  console.log(
    JSON.stringify({
      state: 'STALE',
      affected: stale.map((p) => p.path),
      scope: 'Only affected claims need revalidation',
    }),
  )
  process.exit(2)
}
const zipped = readFileSync(join(folder, report.receipts.path))
assert.equal(hash(zipped), report.receipts.sha256)
const archive = JSON.parse(gunzipSync(zipped))
for (const [name, row] of Object.entries(archive)) {
  const bytes = Buffer.from(row.base64, 'base64')
  assert.equal(bytes.length, row.bytes, name)
  assert.equal(hash(bytes), row.sha256, name)
}
const text = (name) => Buffer.from(archive[name].base64, 'base64').toString(),
  json = (name) => JSON.parse(text(name))
for (const [id, total, files] of [
  ['minimap-baseline', 22, 2],
  ['minimap-adjacent', 54, 7],
  ['core-id-adjacent', 330, 2],
]) {
  const r = json(`${id}.native.json`),
    e = json(`${id}.execution.json`)
  assert.equal(r.numTotalTests, total)
  assert.equal(r.numPassedTests, total)
  assert.equal(r.numFailedTests, 0)
  assert.equal(r.numPendingTests, 0)
  assert.equal(r.testResults.length, files)
  assert(r.testResults.every((s) => s.assertionResults.every((t) => t.status === 'passed')))
  assert.equal(e.exit, 0)
  assert.equal(e.signal, null)
  assert.equal(e.spawnError, null)
  assert(e.args.includes('--reporter=default'))
  assert.equal(text(`${id}.stderr.raw`), '')
}
const staticReport = JSON.parse(readFileSync(join(folder, 'static.json')))
assert.equal(staticReport.runs.length, 11)
for (const run of staticReport.runs) {
  const execution = json(run.raw['execution.json'].member)
  assert.equal(execution.exit, 0)
  assert.equal(execution.signal, null)
  assert.equal(execution.spawnError, null)
  for (const row of Object.values(run.raw)) assert.equal(archive[row.member].sha256, row.sha256)
  assert.equal(text(run.raw['stderr.raw'].member), '')
}
const lint = staticReport.runs.find((run) => run.id === 'lint-final')
assert.match(
  text(lint.raw['stdout.raw'].member),
  /lint: PASS — \d+ files; 0 errors \/ 0 warnings \/ 0 infos/,
)
const identity = (r) =>
  r.testResults
    .flatMap((s) =>
      s.assertionResults.map((t) => ({
        file: s.name.split('/packages/game/')[1],
        fullName: t.fullName,
      })),
    )
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
const before = identity(json('minimap-baseline.native.json')),
  after = identity(json('minimap-adjacent.native.json')).filter((row) =>
    before.some((old) => old.file === row.file),
  )
assert.deepEqual(after, before)
const counter = json('cache-final-counter.native.json'),
  mutation = json('cache-final-mutation.json'),
  restore = json('cache-final-restoration.json')
assert.equal(counter.numTotalTests, 30)
assert.equal(counter.numPassedTests, 29)
assert.equal(counter.numFailedTests, 1)
const failures = counter.testResults.flatMap((s) =>
  s.assertionResults.filter((t) => t.status === 'failed').map((t) => ({ file: s.name, ...t })),
)
assert.equal(failures.length, 1)
assert(failures[0].file.endsWith('/minimap.glm-phase1-leaves.test.ts'))
assert(failures[0].fullName.includes('Image 尚未 onload'))
assert(failures[0].failureMessages.every((m) => m.includes('AssertionError')))
assert.equal(
  mutation.newSpec,
  hash(read('packages/game/src/tools/minimap.glm-phase1-leaves.test.ts')),
)
assert.equal(restore.before, restore.after)
assert.equal(restore.removed, true)
assert.equal(
  restore.before,
  hash(
    execFileSync('git', ['show', `${report.stages.split}:packages/game/src/tools/minimap.ts`], {
      cwd: root,
    }),
  ),
)
assert(!existsSync(join(root, 'packages/game/src/tools/minimap.cache-final-old-counter.test.ts')))
const log = text('minimap-adjacent.stdout.raw')
assert.equal(log.split(report.normalOutputs.literal).length - 1, 5)
for (const pin of report.inherited.filter((p) => p.path.endsWith('controls.json'))) {
  const old = JSON.parse(read(pin.path))
  for (const control of old.controls)
    for (const [version, run] of Object.entries(control.runs)) {
      const raw = gunzipSync(read(join(dirname(pin.path), run.raw))),
        native = gunzipSync(read(join(dirname(pin.path), run.nativeReport)))
      assert.equal(hash(raw), run.rawSha256)
      const nativePath = join(dirname(pin.path), run.nativeReport)
      const nativePin = report.inheritedNativePins.find((row) => row.path === nativePath)
      assert(nativePin, 'every inherited native must have an explicit frozen pin')
      assert.equal(hash(read(nativePath)), nativePin.sha256)
      assert.equal(
        execFileSync('git', ['rev-parse', `${report.base}:${nativePath}`], {
          cwd: root,
          encoding: 'utf8',
        }).trim(),
        nativePin.gitBlobAtBase,
      )
      if (run.nativeSha256 !== undefined) assert.equal(hash(native), run.nativeSha256)
      const r = JSON.parse(native)
      assert.equal(r.numPassedTests, run.passed)
      assert.equal(r.numFailedTests, run.failed)
      assert.equal(r.numPendingTests, 0)
      if (version === 'old') assert.equal(r.numFailedTests, 0)
      else {
        assert.equal(r.numFailedTests, 1)
        const failed = r.testResults.flatMap((s) =>
          s.assertionResults.filter((t) => t.status === 'failed'),
        )
        assert.equal(failed.length, 1)
        assert(failed[0].fullName.includes(control.expectedNewFailureNameContains))
        assert(failed[0].failureMessages.every((m) => m.includes('AssertionError')))
      }
    }
}
const ts = createRequire(join(root, 'package.json'))('typescript'),
  parse = (s) => ts.createSourceFile('x.ts', s, ts.ScriptTarget.Latest, true),
  print = (s) =>
    ts.createPrinter({ removeComments: true }).printFile(parse(s.replace(/^export /, '')))
function functions(source) {
  const sf = parse(source)
  return new Map(
    sf.statements.filter(ts.isFunctionDeclaration).map((n) => [n.name.text, n.getText(sf)]),
  )
}
const oldSource = gunzipSync(
  read(
    'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/tools-thumbnail-hotkeys/aaf2d4b03ac2-minimap.ts.current.gz',
  ),
).toString()
const prior = functions(oldSource),
  current = new Map(
    ['minimap.ts', 'minimap-model.ts', 'minimap-draw.ts'].flatMap((name) => [
      ...functions(read(`packages/game/src/tools/${name}`).toString()),
    ]),
  )
for (const name of [
  'worldToThumb',
  'computeView',
  'classifyTrigger',
  'collectEventKinds',
  'npcVisible',
  'collectMinimapData',
  'drawMinimap',
  'dot',
])
  assert.equal(print(prior.get(name)), print(current.get(name)), name)
execFileSync(process.execPath, [join(folder, 'prove-split.mjs'), report.stages.test], {
  cwd: root,
  stdio: 'pipe',
})
execFileSync(process.execPath, [join(folder, 'prove-bindings.mjs'), '--with-minimap'], {
  cwd: root,
  stdio: 'pipe',
})
for (const row of report.files) assert.deepEqual(Object.keys(row.dimensions), [...'ABCDEFGH'])
const rawAudit = JSON.parse(
  read(report.inherited.find((p) => p.path.endsWith('raw-quantity-audit.json')).path),
)
assert.equal(hash(readFileSync(rawAudit.raw)), rawAudit.rawSha256)
const master = JSON.parse(read('docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.json')),
  counts = { pending: 0, partial: 0, accept: 0 }
for (const c of master.cards) counts[c.currentReview]++
assert.equal(master.cards.length, 83)
assert.equal(new Set(master.cards.map((c) => c.id)).size, 83)
assert.deepEqual(master.currentReviewCounts, counts)
assert.deepEqual(master.lastIncrementalReview.fixed83, counts)
assert.equal(master.currentAccepted, counts.accept)
assert.equal(master.cards.find((c) => c.id === '56').currentReview, 'accept')
console.log(
  JSON.stringify({
    state: 'SCOPED MATCH',
    acceptedFiles: 6,
    minimapDirect: 22,
    adjacent: 32,
    coreAdjacent: 330,
    oldCounter: '22 green',
    newCounter: '21green/one business AssertionError',
    normalInitMessages: 5,
    fixed83: counts,
    limits: 'No fullpre94, CODE57/58, broad core, unified gate or browser/visual credit',
  }),
)
