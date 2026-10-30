import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const folder = dirname(fileURLToPath(import.meta.url))
const root = resolve(folder, '../../../../..')
const read = (p) => readFileSync(join(root, p))
const hash = (b) => createHash('sha256').update(b).digest('hex')
const review = JSON.parse(readFileSync(join(folder, 'review.json')))
const stale = [...review.files, ...review.contextPins].filter(
  (row) => hash(read(row.path)) !== row.sha256,
)
if (stale.length) {
  console.log(
    JSON.stringify({
      state: 'STALE',
      affected: stale.map((row) => row.path),
      limit: 'Revalidate affected claims, not all prior work.',
    }),
  )
  process.exit(2)
}
const archiveBytes = readFileSync(join(folder, review.receipts.path))
assert.equal(hash(archiveBytes), review.receipts.sha256)
const archive = JSON.parse(gunzipSync(archiveBytes))
for (const [name, row] of Object.entries(archive)) {
  const bytes = Buffer.from(row.base64, 'base64')
  assert.equal(bytes.length, row.bytes, name)
  assert.equal(hash(bytes), row.sha256, name)
}
const text = (name) => Buffer.from(archive[name].base64, 'base64').toString()
const json = (name) => JSON.parse(text(name))
for (const [id, cases, files] of [
  ['dialog-baseline', 107, 4],
  ['final-adjacent', 532, 12],
  ['final-legal-reset', 25, 2],
  ['final-glyph-reuse', 23, 2],
]) {
  const r = json(`${id}.native.json`),
    e = json(`${id}.execution.json`)
  assert.equal(r.numTotalTests, cases)
  assert.equal(r.numPassedTests, cases)
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
const counter = json('counter-empty-colors.native.json')
assert.equal(counter.numTotalTests, 176)
assert.equal(counter.numPassedTests, 175)
assert.equal(counter.numFailedTests, 1)
const failures = counter.testResults.flatMap((s) =>
  s.assertionResults.filter((t) => t.status === 'failed').map((t) => ({ file: s.name, ...t })),
)
assert.equal(failures.length, 1)
assert(failures[0].file.endsWith('/dialog-box.test.ts'))
assert(failures[0].fullName.includes('narration(isDialog=TRUE)'))
assert(failures[0].failureMessages.every((message) => message.includes('AssertionError')))
const restore = json('counter-restoration.json')
assert.equal(restore.sourceBefore, restore.sourceAfter)
assert.equal(restore.temporaryTestRemoved, true)
assert.equal(
  restore.sourceBefore,
  hash(
    execFileSync(
      'git',
      ['show', `${review.stages.split}:packages/game/src/present/dialog-text.ts`],
      { cwd: root },
    ),
  ),
)
assert(!existsSync(join(root, 'packages/game/src/present/dialog-box.old-counter.test.ts')))
const identity = (r) =>
  r.testResults
    .flatMap((s) =>
      s.assertionResults.map((t) => ({
        file: s.name.split('/packages/game/')[1],
        fullName: t.fullName,
      })),
    )
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
assert.deepEqual(identity(json('dialog-baseline.native.json')), review.identities.before)
const direct = identity(json('final-adjacent.native.json')).filter((t) =>
  review.identities.before.some((old) => old.file === t.file),
)
assert.deepEqual(direct, review.identities.after)
assert.equal(direct.length, 105)
const retired = review.identities.before.filter(
  (old) => !direct.some((row) => JSON.stringify(row) === JSON.stringify(old)),
)
assert.deepEqual(retired, review.identities.retired)
assert.equal(retired.length, 2)
assert.equal(review.identities.added.length, 0)
const ts = createRequire(join(root, 'package.json'))('typescript')
const parse = (s) => ts.createSourceFile('x.ts', s, ts.ScriptTarget.Latest, true)
const print = (s) => ts.createPrinter({ removeComments: true }).printFile(parse(s))
const git = (rev, p) =>
  execFileSync('git', ['show', `${rev}:${p}`], { cwd: root, encoding: 'utf8' })
for (const row of review.files) {
  assert.deepEqual(Object.keys(row.dimensions), [...'ABCDEFGH'])
  assert.equal(hash(read(row.inheritedEightAxes.path)), row.inheritedEightAxes.sha256)
}
for (const p of ['dialog-box.ts', 'dialog-text.ts', 'dialog-draw.ts']) {
  const pathname = `packages/game/src/present/${p}`
  assert.equal(
    print(read(pathname).toString()),
    print(git(review.stages.privateAndRetirement, pathname)),
  )
}
const oldChrome = git(review.base, 'packages/game/src/present/dialog-box-chrome.grok-r1.test.ts')
const fn = (s, name) => {
  const sf = parse(s)
  return sf.statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === name).getText(sf)
}
assert.equal(
  print(
    fn(read('packages/game/src/__tests__/dialog-fixtures.ts').toString(), 'dialogGlyphs').replace(
      'export function dialogGlyphs',
      'function glyphs',
    ),
  ),
  print(fn(oldChrome, 'glyphs')),
)
execFileSync(process.execPath, [join(folder, 'prove-split.mjs')], { cwd: root, stdio: 'pipe' })
const master = JSON.parse(read('docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.json')),
  counts = { pending: 0, partial: 0, accept: 0 }
for (const card of master.cards) counts[card.currentReview]++
assert.equal(master.cards.length, 83)
assert.equal(new Set(master.cards.map((c) => c.id)).size, 83)
assert.deepEqual(master.currentReviewCounts, counts)
assert.deepEqual(master.lastIncrementalReview.fixed83, counts)
assert.equal(master.currentAccepted, counts.accept)
assert.equal(master.cards.find((c) => c.id === '42').currentReview, 'partial')
console.log(
  JSON.stringify({
    state: 'SCOPED MATCH',
    acceptedFiles: 7,
    stateSource: 'review: title speed decision pending',
    directTests: 105,
    distinctAdjacentTests: 427,
    retiredDummyTests: 2,
    oldCounter: '69main passed',
    newCounter: 'one business AssertionError',
    fixed83: counts,
    limits: 'No fullpre94, unified gates, main merge or browser/visual credit.',
  }),
)
