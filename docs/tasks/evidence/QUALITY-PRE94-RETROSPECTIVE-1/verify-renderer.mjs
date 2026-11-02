import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { gunzipSync } from 'node:zlib'

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const dir = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(resolve(root, p))
const hash = (b) => createHash('sha256').update(b).digest('hex')
const json = (p) => JSON.parse(readFileSync(resolve(dir, p)))
const receipt = json('renderer-local.json')
const options = process.argv.slice(2)
assert(options.length === 0 || (options.length === 1 && options[0] === '--local'))
for (const row of [...receipt.files, ...receipt.bindings])
  assert.equal(hash(read(row.path)), row.sha256, `STALE: ${row.path}; inspect this delta`)
for (const row of receipt.files)
  for (const axis of 'ABCDEFGH') assert(row.dimensions[axis], `${row.path}/${axis}`)
function unpack(artifact) {
  const data = read(artifact.path)
  assert.equal(hash(data), artifact.sha256, artifact.path)
  const { members } = JSON.parse(gunzipSync(data))
  assert.equal(Object.keys(members).length, artifact.members.length)
  for (const row of artifact.members) {
    assert.equal(Buffer.byteLength(members[row.name]), row.bytes, row.name)
    assert.equal(hash(members[row.name]), row.sha256, row.name)
  }
  return members
}
function execution(members, id) {
  const run = JSON.parse(members[`${id}.execution.json`])
  assert.equal(run.signal, null, id)
  assert.equal(run.spawnError, null, id)
  for (const stream of [run.stdout, run.stderr]) {
    assert.equal(Buffer.byteLength(members[stream.member]), stream.bytes, id)
    assert.equal(hash(members[stream.member]), stream.sha256, id)
  }
  return run
}
async function assertRecountData(gate, originals) {
  assert.equal(gate.postCheckDataOnly?.record, 'renderer-recount.json')
  assert.equal(
    hash(readFileSync(resolve(dir, 'renderer-recount.json'))),
    gate.postCheckDataOnly.recordSha256,
  )
  const record = json('renderer-recount.json')
  const proof = record.programInvariance
  assert.equal(proof.path, 'scripts/coverage/approved-baseline-adjustments.mjs')
  const before = execFileSync('git', ['show', `${record.base}:${proof.path}`], { encoding: 'utf8' })
  const after = read(proof.path).toString()
  assert.equal(hash(before), proof.beforeSha256)
  assert.equal(hash(after), proof.afterSha256)
  const ts = createRequire(resolve(root, 'package.json'))('typescript')
  const parse = (s) =>
    ts.createSourceFile('input.mjs', s, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const printer = ts.createPrinter({ removeComments: true })
  function literal(node) {
    if (ts.isStringLiteral(node)) return node.text
    if (ts.isNumericLiteral(node)) return Number(node.text)
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal)
    assert(ts.isObjectLiteralExpression(node), 'approval must contain literal data only')
    const pairs = node.properties.map((property) => {
      assert(ts.isPropertyAssignment(property))
      assert(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
      return [property.name.text, literal(property.initializer)]
    })
    assert.equal(new Set(pairs.map(([key]) => key)).size, pairs.length)
    return Object.fromEntries(pairs)
  }
  let count = 0
  const result = ts.transform(parse(after), [
    (context) => {
      const visit = (node) => {
        if (ts.isVariableDeclaration(node) && node.name.text === 'approvedAdjustments') {
          assert(ts.isArrayLiteralExpression(node.initializer))
          assert.deepEqual(literal(node.initializer.elements[0]), record.approval)
          count++
          const rest = ts.factory.createNodeArray(
            node.initializer.elements.slice(1),
            node.initializer.elements.hasTrailingComma,
          )
          return ts.factory.updateVariableDeclaration(
            node,
            node.name,
            node.exclamationToken,
            node.type,
            ts.factory.updateArrayLiteralExpression(node.initializer, rest),
          )
        }
        return ts.visitEachChild(node, visit, context)
      }
      return (node) => ts.visitNode(node, visit)
    },
  ])
  assert.equal(count, 1)
  assert.equal(printer.printFile(result.transformed[0]), printer.printFile(parse(before)))
  result.dispose()
  for (const row of record.approval.sources) assert.equal(hash(read(row.path)), row.sha256)
  const baseline = JSON.parse(originals['baseline-before.json'])
  const measured = JSON.parse(originals['renderer-ratchet.coverage-summary.json'])
  assert.equal(hash(JSON.stringify(baseline)), record.approval.baselineSha256)
  assert.deepEqual(baseline.packages.game.metrics, record.approval.packages.game.before)
  assert.deepEqual(measured.packages.game.metrics, record.approval.packages.game.after)
  for (const id of Object.keys(baseline.packages).filter((id) => id !== 'game'))
    assert.deepEqual(measured.packages[id].metrics, baseline.packages[id].metrics)
  const { adjustApprovedBaseline } = await import(resolve(root, proof.path))
  const adjusted = await adjustApprovedBaseline(baseline, read)
  assert.deepEqual(adjusted.applied, [record.approval.id])
  assert.deepEqual(adjusted.baseline.total, measured.total)
  await assert.rejects(
    () => adjustApprovedBaseline(baseline, () => Buffer.from('source drift')),
    /源码已变化/,
  )
  const tools = execution(originals, record.postCheckDataCoordination.validationRun)
  assert.equal(tools.role, 'coverage-tools')
  assert.equal(tools.exit, 0)
  assert.equal(tools.stderr.bytes, 0)
  assert.equal(tools.codeChanges.find((row) => row.path === proof.path)?.sha256, proof.afterSha256)
  assert.match(originals[tools.stdout.member], /^# fail 0$/m)
  return record
}
const members = unpack(receipt.nativeArtifact)
const assets = JSON.parse(members[receipt.localAssetScan.member])
assert.equal(assets.maps, 223)
assert.equal(assets.reads.length, 223)
assert.equal(assets.missing.length, 0)
assert.equal(assets.errors.length, 0)
assert.deepEqual(
  readdirSync(resolve(root, 'data/extracted/data/tilemap'))
    .filter((p) => p.endsWith('.json'))
    .sort(),
  assets.reads.map((r) => r.map.split('/').at(-1)).sort(),
  'local asset set changed; recheck input-domain claim',
)
for (const row of assets.reads) {
  assert.equal(hash(read(row.map)), row.sha256, `local map changed: ${row.map}`)
  assert.equal(hash(read(row.blob)), row.blobSha256, `local tileset changed: ${row.blob}`)
}
const counters = {
  'opening-constant-old-v2': 0,
  'opening-constant-new-v2': 1,
  'opening-clear-old-v2': 0,
  'opening-clear-new-v2': 1,
  'opening-truncate-old-v2': 1,
  'opening-truncate-new-v2': 1,
  'stack-reverse-old': 0,
  'stack-reverse-final': 1,
  'shared-color-constant': 1,
}
for (const row of receipt.runs) {
  const run = execution(members, row.id)
  assert.equal(run.exit, row.exit, row.id)
  const nativeText = members[`${row.id}.native.json`]
  if (!nativeText) continue // Startup errors retain no test/counter credit.
  const n = JSON.parse(nativeText)
  assert.equal(n.numRuntimeErrorTestSuites ?? 0, 0, row.id)
  assert.equal(n.numPendingTests, 0, row.id)
  assert.equal(n.numTotalTests, row.testCount, row.id)
  const failures = n.testResults.flatMap((f) =>
    f.assertionResults.filter((t) => t.status === 'failed'),
  )
  assert.deepEqual(
    failures.map((f) => f.fullName).sort(),
    row.failed.map((f) => f.fullName).sort(),
    row.id,
  )
  if (Object.hasOwn(counters, row.id)) assert.equal(n.numFailedTests, counters[row.id], row.id)
  for (const f of failures)
    assert(
      f.failureMessages.some((m) => m.includes('AssertionError:')),
      row.id,
    )
  assert.equal(run.exit, failures.length ? 1 : 0, row.id)
  if (!failures.length) {
    assert.equal(run.stderr.bytes, 0, row.id)
    assert(!/^(stdout|stderr) \|/m.test(members[run.stdout.member]), row.id)
  }
}
for (const id of Object.keys(counters))
  assert(
    receipt.runs.some((r) => r.id === id),
    id,
  )
const restored = JSON.parse(members['renderer-directed-final.native.json'])
assert.equal(restored.numTotalTests, 170)
assert.equal(restored.testResults.length, 18)
assert.equal(restored.numFailedTests, 0)
const snapshot = execution(members, 'renderer-directed-final')
for (const row of [
  ...receipt.files,
  ...receipt.bindings.filter((row) => row.path.endsWith('.test.ts')),
]) {
  const changed = snapshot.codeChanges.find((r) => r.path === row.path)
  const sha = changed?.sha256 ?? hash(execFileSync('git', ['show', `${snapshot.head}:${row.path}`]))
  assert.equal(sha, row.sha256, `final test candidate: ${row.path}`)
}
for (const name of ['prove-ui-extraction-replay.cjs', 'prove-renderer-delta.cjs']) {
  const result = spawnSync(process.execPath, ['-e', members[name]], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  assert.equal(result.status, 0, `${name}: ${result.stderr}`)
  JSON.parse(result.stdout)
}
if (options[0] === '--local') {
  process.stdout.write(
    'renderer LOCAL MATCH: identities/raw/native/structure; uniform gates not certified\n',
  )
} else {
  const gate = json('renderer-gates.json')
  assert.equal(gate.status, 'accepted', 'uniform gates pending; no closure credit')
  const queue = json('all-cards.json')
  for (const card of receipt.cards) {
    const current = queue.cards.find((row) => row.id === card.id)
    assert.equal(current?.currentAcceptance, true, `card not accepted: ${card.id}`)
    assert.equal(current.currentReview, 'accept', card.id)
  }
  const changed = execFileSync(
    'git',
    ['diff', '--name-only', receipt.base, '--', 'packages', 'scripts'],
    { cwd: root, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .sort()
  assert.deepEqual(changed, gate.sourceBindings.map((row) => row.path).sort())
  assert.equal(
    execFileSync(
      'git',
      ['ls-files', '--others', '--exclude-standard', '--', 'packages', 'scripts'],
      {
        cwd: root,
        encoding: 'utf8',
      },
    ).trim(),
    '',
    'untracked code not covered by the recorded gate candidate',
  )
  const originals = unpack(gate.artifact)
  const recount = await assertRecountData(gate, originals)
  const ratchet = gate.uniformGates.find((entry) => entry.role === 'ratchet')
  const measuredBaseline = JSON.parse(originals[`${ratchet.id}.coverage-summary.json`])
  const baseline = JSON.parse(read('scripts/coverage/baseline.fast.json'))
  assert.equal(baseline.generatedAt, measuredBaseline.generatedAt)
  assert.equal(baseline.sourceFileCount, measuredBaseline.sourceFileCount)
  assert.equal(baseline.testCount, measuredBaseline.testCount)
  assert.deepEqual(baseline.total, measuredBaseline.total)
  for (const [id, expected] of Object.entries(measuredBaseline.packages)) {
    assert.deepEqual(baseline.packages[id].metrics, expected.metrics)
    assert.equal(baseline.packages[id].scopeDigest, expected.scopeDigest)
    assert.deepEqual(
      baseline.packages[id].fastTests.fileEntries,
      expected.selectedTests.fileEntries,
    )
  }
  for (const row of gate.sourceBindings)
    assert.equal(hash(read(row.path)), row.sha256, `stale gate input: ${row.path}`)
  const rules = [
    /event-system: skip raw opcode=/gi,
    /not wrapped in act\(/g,
    /not configured to support act/g,
    /^\s*stderr \|/gm,
    /\bWarning:|\[warn(?:ing)?\]/gi,
    /You provided a `value` prop to a form field without an `onChange` handler/g,
    /Not implemented: navigation/gi,
    /AudioContext 不可用/g,
    /\berror TS\d+/g,
    /Unhandled (?:Error|Rejection|Exception)|Vitest caught \d+ unhandled/gi,
    /^not ok /gm,
  ]
  for (const entry of [...gate.uniformGates, ...gate.finalStatic]) {
    const run = execution(originals, entry.id)
    assert.equal(run.exit, 0, entry.id)
    assert.equal(run.stderr.bytes, 0, entry.id)
    const text = stripVTControlCharacters(originals[run.stdout.member])
    for (const rule of rules) assert.equal((text.match(rule) ?? []).length, 0, entry.id)
    if (['check', 'ratchet', 'protected'].includes(entry.role)) {
      for (const row of gate.sourceBindings) {
        if (row.path === 'scripts/coverage/baseline.fast.json') continue
        const changed = run.codeChanges.find((r) => r.path === row.path)
        const sha =
          changed?.sha256 ?? hash(execFileSync('git', ['show', `${run.head}:${row.path}`]))
        if (entry.role === 'check' && row.path === recount.programInvariance.path) {
          assert.equal(sha, recount.programInvariance.beforeSha256)
          assert.equal(row.sha256, recount.programInvariance.afterSha256)
        } else assert.equal(sha, row.sha256, `${entry.id}: candidate ${row.path}`)
      }
    }
    if (['ratchet', 'protected'].includes(entry.role)) {
      const summary = JSON.parse(originals[`${entry.id}.coverage-summary.json`])
      assert(summary.generatedAt >= run.start && summary.generatedAt <= run.end)
      assert.equal(summary.sourceFileCount, gate.coverage.sourceFileCount)
      assert.equal(summary.testCount, gate.coverage.testCount)
    }
  }
  for (const role of ['check', 'ratchet', 'protected', 'lint', 'ledger', 'docs'])
    assert(
      [...gate.uniformGates, ...gate.finalStatic].some((r) => r.role === role),
      role,
    )
  process.stdout.write(
    'renderer MATCH: four-card evidence/current inputs/complete zero-diagnostic gates; default read-only, no tests or coverage rerun\n',
  )
}
