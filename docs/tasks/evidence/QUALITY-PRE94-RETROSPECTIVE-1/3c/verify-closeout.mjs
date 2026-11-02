import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import ts from 'typescript'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../../../..')
const evidence = 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/'
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const read = (path) => {
  const absolute = resolve(repo, path)
  assert(absolute.startsWith(`${repo}${sep}`), `outside repository: ${path}`)
  return readFileSync(absolute)
}
const json = (path) => JSON.parse(read(path))
const pinned = ({ path, sha256 }) => {
  const bytes = read(path)
  assert.equal(hash(bytes), sha256, `stale bytes: ${path}`)
  return bytes
}
const gitBlob = (commit, path) => {
  assert.match(commit, /^[a-f0-9]{40}$/)
  return execFileSync('git', ['show', `${commit}:${path}`], { cwd: repo, maxBuffer: 8e6 })
}

const animation = json(`${evidence}3c/closeout.json`)
const engineering = json(`${evidence}92/closeout.json`)
const ownership = json(`${evidence}3w-post-scripts/ownership-current.json`)
const archive = JSON.parse(gunzipSync(pinned(animation.nativeArchive)))
for (const [name, member] of Object.entries(archive.members)) {
  assert.equal(hash(Buffer.from(member.data, member.encoding)), member.sha256, name)
}
for (const binding of animation.bindings) {
  pinned({ path: binding.path, sha256: binding.currentSha256 })
}
for (const binding of engineering.sourceBindings) pinned(binding)

const oldProof = json(`${evidence}3c/after-proof.json`)
assert.deepEqual(
  animation.controls.map((control) => control.name),
  ['control', 'fallback', 'finish', 'cleanup'],
)
assert.equal(animation.files[0].sha256, oldProof.testSha256)
assert.equal(hash(read(animation.files[0].path)), oldProof.testSha256)
assert.equal(hash(read('packages/editor/src/ui/SpriteFrameWorkbench.tsx')), oldProof.sourceSha256)
for (const control of animation.controls) {
  const frozen = oldProof.runs.find((run) => run.name === control.name)
  assert.equal(control.nativeSha256, frozen?.runnerSha256)
  assert.equal(control.rawSha256, frozen?.rawSha256)
  const stem = `${evidence}3c/after-${control.name}`
  const raw = gunzipSync(read(`${stem}.raw.gz`))
  const native = gunzipSync(read(`${stem}.runner.json.gz`))
  assert.equal(hash(raw), control.rawSha256)
  assert.equal(hash(native), control.nativeSha256)
  const cases = JSON.parse(native).testResults.flatMap((file) => file.assertionResults)
  assert.equal(cases.length, 1)
  assert.equal(cases[0].fullName, control.cases[0].fullName)
  assert.equal(cases[0].status, control.name === 'control' ? 'passed' : 'failed')
  if (control.name !== 'control') assert.match(cases[0].failureMessages[0], /^AssertionError:/)
}

const gate = JSON.parse(pinned(animation.reusedGate))
assert.deepEqual(gate.pendingRuns, [])
const gateArchive = JSON.parse(gunzipSync(pinned(animation.reusedGateArchive)))
for (const execution of animation.currentExecution) {
  const member = gateArchive.members[execution.name]
  const raw = Buffer.from(member.data, member.encoding)
  assert.equal(hash(raw), execution.sha256)
  const lines = raw
    .toString()
    .split('\n')
    .filter((line) => line.includes('SpriteFrameWorkbench.animation-boundary.test.tsx'))
  assert.deepEqual(lines, execution.matchingLines)
  assert.equal(lines.length, 1)
  assert.match(lines[0], /\(1 test\)/)
}
assert.equal(gate.coverage.actualCollections, 1)
assert.equal(gate.coverage.cases, 20040)
assert.deepEqual(gate.coverage.strictProtected.strictAgainstFinalBaseline.regressions, [])
assert.deepEqual(gate.coverage.strictProtected.againstProtectedMain.regressions, [])
for (const diagnostics of [gate.wholeCheck.diagnostics, gate.coverage.diagnostics]) {
  assert(Object.values(diagnostics).every((value) => value === 0))
}

const { proof } = ownership
const previous = gitBlob(proof.base, proof.file)
const current = read(proof.file)
assert.equal(hash(previous), proof.oldSha256)
assert.equal(hash(current), proof.currentSha256)
const parse = (bytes) =>
  ts
    .createPrinter({ removeComments: true })
    .printFile(
      ts.createSourceFile(
        proof.file,
        bytes.toString(),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      ),
    )
const emit = (bytes) =>
  ts.transpileModule(bytes.toString(), {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      removeComments: true,
    },
  }).outputText
assert.equal(parse(previous), parse(current))
assert.equal(emit(previous), emit(current))
const changedCode = execFileSync(
  'git',
  ['diff', '--name-only', proof.base, '--', 'packages', 'scripts', '.github', 'pnpm-lock.yaml'],
  { cwd: repo, encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean)
assert.deepEqual(changedCode, [proof.file], 'reused gate source scope changed')

const comparison = json(`${evidence}92/${engineering.sourceComparison}`)
assert.equal(comparison.files.length, 30)
for (const file of comparison.files) {
  assert.equal(hash(gitBlob(file.closureCommit, file.path)), file.closureSha256)
  assert.equal(hash(read(file.path)), file.currentSha256, `stale comparison: ${file.path}`)
  assert.equal(file.byteIdentical, file.closureSha256 === file.currentSha256)
}
assert.equal(comparison.files.filter((file) => file.byteIdentical).length, 8)
const cards = json(`${evidence}all-cards.json`)
for (const id of ['3c', '92']) {
  assert.equal(
    cards.cards.find((card) => card.id === id)?.currentAcceptance,
    true,
    `unaccepted ${id}`,
  )
}
const staticGate = json(`${evidence}3c/closeout-gates.json`)
assert.deepEqual(staticGate.pendingRuns, [])
assert.deepEqual(
  staticGate.runs.map((run) => run.id),
  ['final-docs-r2', 'final-lint-r2', 'final-ledger', 'final-quick', 'final-diff'],
)
const staticArchive = JSON.parse(gunzipSync(pinned(staticGate.nativeArchive)))
for (const run of staticGate.runs) {
  const execution = JSON.parse(
    Buffer.from(staticArchive.members[`${run.id}.execution.json`].data, 'base64'),
  )
  assert.equal(execution.exit, 0, run.id)
  assert.equal(execution.signal, null, run.id)
  assert.equal(execution.spawnError ?? execution.error ?? null, null, run.id)
  assert.equal(execution.observerTimeout ?? false, false, run.id)
  const stdout = Buffer.from(staticArchive.members[run.stdoutMember].data, 'base64')
  const stderr = Buffer.from(staticArchive.members[run.stderrMember].data, 'base64')
  assert.equal(hash(stdout), run.stdoutSha256, run.id)
  assert.equal(hash(stderr), run.stderrSha256, run.id)
  assert.equal(stderr.length, 0, run.id)
}
console.log(
  JSON.stringify({
    status: 'matched specified sources, native controls, current gate and comment-only delta',
    animation: 'one unchanged identity; three archived single business failures',
    engineering: '30 compared,8 identical/22 changed; no automatic source acceptance',
    wholeWorkbench: 'review; this script does not certify its remaining lifecycle',
    battleUnknowns: 'unchanged; no production reachability/equivalence claim',
    limits:
      'Read-only identity/evidence verification,not tests,coverage,network or automatic promotion.',
  }),
)
