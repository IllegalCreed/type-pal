import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const dir = dirname(fileURLToPath(import.meta.url))
const receipt = JSON.parse(readFileSync(resolve(dir, 'menu-core-closeout.json')))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const read = (path) => readFileSync(resolve(root, path))
const ts = createRequire(resolve(root, 'package.json'))('typescript')

for (const row of [...receipt.files, ...receipt.bindings])
  assert.equal(hash(read(row.path)), row.sha256, `stale claim: ${row.path}`)
for (const row of receipt.files)
  for (const axis of 'ABCDEFGH') assert(row.dimensions[axis], `${row.path}: missing ${axis}`)

const packed = read(receipt.nativeArtifact.path)
assert.equal(hash(packed), receipt.nativeArtifact.sha256, 'native bundle changed')
const { members } = JSON.parse(gunzipSync(packed))
for (const row of receipt.nativeArtifact.members) {
  assert.equal(Buffer.byteLength(members[row.name]), row.bytes, row.name)
  assert.equal(hash(members[row.name]), row.sha256, row.name)
}
for (const [name, text] of Object.entries(members)) {
  if (name.endsWith('.native.json')) {
    const native = JSON.parse(text)
    assert.equal(native.numFailedTests, 0, name)
    assert.equal(native.numPendingTests, 0, name)
    assert.equal(native.numRuntimeErrorTestSuites ?? 0, 0, name)
    assert(native.testResults.every((f) => f.assertionResults.every((t) => t.status === 'passed')))
  }
  if (name.endsWith('.execution.json')) {
    const run = JSON.parse(text)
    assert.equal(run.exit, 0, name)
    assert.equal(run.signal, null, name)
    assert.equal(run.spawnError, null, name)
  }
  if (name.endsWith('.scan.json'))
    assert(
      Object.values(JSON.parse(text).diagnostics).every((v) => v === 0),
      name,
    )
}

for (const row of receipt.invariance.files) {
  const old = execFileSync('git', ['show', `${receipt.base}:${row.path}`], { encoding: 'utf8' })
  assert.equal(hash(old), row.beforeSha256, row.path)
  const emit = (source) =>
    ts.transpileModule(source, {
      compilerOptions: {
        removeComments: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText
  let before = emit(old)
  let current = emit(read(row.path).toString('utf8'))
  if (row.titleMapping) {
    assert(before.includes(row.titleMapping.before) && current.includes(row.titleMapping.after))
    before = before.replace(row.titleMapping.before, '<same-test-identity>')
    current = current.replace(row.titleMapping.after, '<same-test-identity>')
  }
  assert.equal(current, before, `emitted body drift: ${row.path}`)
}
// The embedded reader is frozen by the bundle manifest and defaults to stdout only.
execFileSync(process.execPath, ['-e', members['menu-proof.cjs']], { cwd: root, stdio: 'pipe' })

const gate = JSON.parse(readFileSync(resolve(dir, 'menu-gate-diagnostics.json')))
for (const row of [...gate.sourceBindings, ...gate.reporter.files])
  assert.equal(hash(read(row.path)), row.sha256, `stale gate binding: ${row.path}`)
const gatePacked = read(gate.artifact.path)
assert.equal(hash(gatePacked), gate.artifact.sha256, 'gate originals changed')
const gateMembers = JSON.parse(gunzipSync(gatePacked)).members
for (const row of gate.artifact.members) {
  assert.equal(Buffer.byteLength(gateMembers[row.name]), row.bytes, row.name)
  assert.equal(hash(gateMembers[row.name]), row.sha256, row.name)
}
const finiteApproval = gate.metadataOnlyOverrides?.[0]
if (finiteApproval) {
  assert.equal(gate.metadataOnlyOverrides.length, 1)
  assert.equal(finiteApproval.path, 'scripts/coverage/approved-baseline-adjustments.mjs')
  const before = gateMembers[finiteApproval.beforeMember]
  const after = read(finiteApproval.path).toString('utf8')
  assert.equal(hash(before), finiteApproval.beforeSha256)
  assert.equal(hash(after), finiteApproval.afterSha256)
  const canonical = ts.createPrinter({ removeComments: true })
  function table(source) {
    const sf = ts.createSourceFile('registry.mjs', source, ts.ScriptTarget.Latest, true)
    const matches = []
    function visit(node) {
      if (ts.isVariableDeclaration(node) && node.name.getText(sf) === 'approvedAdjustments')
        matches.push(node.initializer)
      ts.forEachChild(node, visit)
    }
    visit(sf)
    assert.equal(matches.length, 1)
    const value = matches[0]
    assert(value && ts.isArrayLiteralExpression(value))
    const masked = `${source.slice(0, value.getStart(sf))}[]${source.slice(value.end)}`
    return {
      sf,
      value,
      body: canonical.printFile(
        ts.createSourceFile('registry.mjs', masked, ts.ScriptTarget.Latest),
      ),
    }
  }
  const oldTable = table(before)
  const newTable = table(after)
  assert.equal(oldTable.body, newTable.body, 'executable baseline logic changed')
  assert.equal(newTable.value.elements.length, oldTable.value.elements.length + 1)
  const print = (node, sf) => canonical.printNode(ts.EmitHint.Unspecified, node, sf)
  for (let i = 0; i < oldTable.value.elements.length; i++)
    assert.equal(
      print(newTable.value.elements[i + 1], newTable.sf),
      print(oldTable.value.elements[i], oldTable.sf),
      'prior approval changed',
    )
  function literal(node) {
    if (ts.isStringLiteralLike(node)) return node.text
    if (ts.isNumericLiteral(node)) return Number(node.text)
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal)
    assert(ts.isObjectLiteralExpression(node), 'nonliteral approval data')
    const result = {}
    for (const property of node.properties) {
      assert(ts.isPropertyAssignment(property))
      assert(ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name))
      assert(!Object.hasOwn(result, property.name.text))
      result[property.name.text] = literal(property.initializer)
    }
    return result
  }
  assert.deepEqual(literal(newTable.value.elements[0]), finiteApproval.entry)
  for (const source of finiteApproval.entry.sources)
    assert.equal(hash(read(source.path)), source.sha256, source.path)
}
if (gate.baselineOfficialDelta) {
  const delta = gate.baselineOfficialDelta
  const before = gateMembers[delta.previousMember]
  const after = gateMembers[delta.afterMember]
  assert.equal(hash(before), delta.beforeSha256)
  assert.equal(hash(after), delta.afterSha256)
  assert.equal(hash(read(delta.path)), delta.afterSha256, 'current baseline drift')
  assert.equal(
    hash(execFileSync('git', ['show', `${gate.base}:${delta.path}`], { cwd: root })),
    delta.beforeSha256,
  )
  const oldBaseline = JSON.parse(before)
  const newBaseline = JSON.parse(after)
  assert.deepEqual(newBaseline.provider, oldBaseline.provider)
  assert.equal(newBaseline.sourceFileCount, oldBaseline.sourceFileCount)
  assert.equal(newBaseline.testCount, oldBaseline.testCount)
  for (const [id, oldPackage] of Object.entries(oldBaseline.packages)) {
    const current = newBaseline.packages[id]
    assert.deepEqual(current.sourceFiles, oldPackage.sourceFiles, id)
    assert.deepEqual(current.include, oldPackage.include, id)
    assert.deepEqual(current.exclude, oldPackage.exclude, id)
    const change = id === 'game' ? -1 : id === 'reforge' ? 1 : 0
    assert.equal(current.fastTests.testCount, oldPackage.fastTests.testCount + change, id)
  }
  assert.deepEqual(newBaseline.packages.game.metrics, finiteApproval.entry.packages.game.after)
}
// Failed probes and withdrawn reporter runs remain originals, never passed gates.
for (const id of gate.acceptedDirectedRuns) {
  const run = JSON.parse(gateMembers[`${id}.execution.json`])
  assert.equal(run.exit, 0, id)
  assert.equal(run.signal, null, id)
  assert.equal(run.spawnError, null, id)
  assert.equal(Buffer.byteLength(gateMembers[run.stderr.member]), 0, id)
}
if (gate.uniformGates.status === 'passed') {
  assert(gate.baselineOfficialDelta, 'missing official baseline audit')
  for (const role of ['check', 'ratchet', 'protected']) {
    const entry = gate.uniformGates.runs.find((run) => run.role === role)
    assert(entry, `missing uniform gate: ${role}`)
    const run = JSON.parse(gateMembers[`${entry.id}.execution.json`])
    const scan = JSON.parse(gateMembers[`${entry.id}.scan.json`])
    assert.equal(run.role, role)
    assert.equal(run.exit, 0, entry.id)
    assert.equal(run.signal, null, entry.id)
    assert.equal(run.spawnError, null, entry.id)
    assert(
      Object.values(scan.diagnostics).every((value) => value === 0),
      entry.id,
    )
    for (const stream of [run.stdout, run.stderr]) {
      const original = gateMembers[stream.member]
      assert.equal(Buffer.byteLength(original), stream.bytes, stream.member)
      assert.equal(hash(original), stream.sha256, stream.member)
    }
    const frozen = new Map(run.codeChanges.map((row) => [row.path, row.sha256]))
    for (const row of [...gate.sourceBindings, ...gate.reporter.files]) {
      const original =
        frozen.get(row.path) ??
        hash(execFileSync('git', ['show', `${run.head}:${row.path}`], { cwd: root }))
      const finiteDataOnly =
        role === 'check' &&
        finiteApproval?.path === row.path &&
        original === finiteApproval.beforeSha256 &&
        row.sha256 === finiteApproval.afterSha256
      assert(
        original === row.sha256 || finiteDataOnly,
        `gate source drift: ${entry.id}/${row.path}`,
      )
    }
  }
}
const printer = ts.createPrinter({ removeComments: true })
function assertionIdentity(source, file) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const assertions = []
  const identities = []
  const isExpectRoot = (node) =>
    ts.isCallExpression(node)
      ? ts.isIdentifier(node.expression) && node.expression.text === 'expect'
      : ts.isPropertyAccessExpression(node) && isExpectRoot(node.expression)
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      isExpectRoot(node.expression.expression)
    )
      assertions.push(printer.printNode(ts.EmitHint.Unspecified, node, sf))
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ['test', 'it', 'describe'].includes(node.expression.text)
    ) {
      const title = node.arguments[0]
      if (title && ts.isStringLiteralLike(title))
        identities.push(`${node.expression.text}:${title.text}`)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return { assertions: assertions.sort(), identities: identities.sort() }
}
for (const row of gate.editor.assertionInvariance.files) {
  const old = execFileSync('git', ['show', `${gate.base}:${row.file}`], { encoding: 'utf8' })
  assert.equal(hash(old), row.baseSha256, row.file)
  const current = read(row.file)
  assert.equal(hash(current), row.currentSha256, row.file)
  const before = assertionIdentity(old, row.file)
  const after = assertionIdentity(current.toString('utf8'), row.file)
  assert.deepEqual(after, before, `assertion/title drift: ${row.file}`)
  assert.equal(hash(JSON.stringify(after.assertions)), row.assertionFingerprint, row.file)
  assert.equal(hash(JSON.stringify(after.identities)), row.identityFingerprint, row.file)
}
const frameHost = gate.editor.c04Host.assertionInvariance
const oldFrameHost = execFileSync('git', ['show', `${gate.base}:${frameHost.file}`], {
  encoding: 'utf8',
})
assert.equal(hash(oldFrameHost), frameHost.baseSha256)
const currentFrameHost = read(frameHost.file)
assert.equal(hash(currentFrameHost), frameHost.currentSha256)
const frameHostBefore = assertionIdentity(oldFrameHost, frameHost.file)
const frameHostAfter = assertionIdentity(currentFrameHost.toString('utf8'), frameHost.file)
assert.deepEqual(frameHostAfter, frameHostBefore, 'frame host assertion drift')
assert.equal(hash(JSON.stringify(frameHostAfter.assertions)), frameHost.assertionFingerprint)
for (const row of gate.reforge.rootFix.assertions.files) {
  const old = execFileSync('git', ['show', `${gate.base}:${row.path}`], { encoding: 'utf8' })
  assert.equal(hash(old), row.beforeSha256, row.path)
  const current = read(row.path)
  assert.equal(hash(current), row.sha256, row.path)
  const before = assertionIdentity(old, row.path)
  const after = assertionIdentity(current.toString('utf8'), row.path)
  const available = new Map()
  for (const expression of after.assertions)
    available.set(expression, (available.get(expression) ?? 0) + 1)
  for (const expression of before.assertions) {
    const count = available.get(expression) ?? 0
    assert(count > 0, `lost original assertion: ${row.path}`)
    available.set(expression, count - 1)
  }
}
const closeCallers = JSON.parse(gateMembers['host-close-caller-inventory.json'])
for (const row of closeCallers) {
  if (row.file.endsWith('/runtime-shell/dom-host.test.ts')) continue
  const source = read(row.file).toString('utf8')
  const sf = ts.createSourceFile(row.file, source, ts.ScriptTarget.Latest, true)
  let matched = false
  function visit(node) {
    if (ts.isCallExpression(node) && node.getStart(sf) === row.start) {
      assert.equal(node.getText(sf), row.call, row.file)
      assert(ts.isAwaitExpression(node.parent), `unowned close: ${row.file}:${row.line}`)
      matched = true
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  assert(matched, `missing typed close caller: ${row.file}:${row.line}`)
}
const ioCounter = JSON.parse(gateMembers[`${gate.reforge.rootFix.counter}.native.json`])
assert.equal(ioCounter.numFailedTests, 1, 'IO counter must have one real failure')
assert.equal(ioCounter.numRuntimeErrorTestSuites ?? 0, 0, 'IO counter infrastructure failure')
assert.equal(ioCounter.numTotalTests, 1, 'IO counter must execute the one protocol case')
assert(
  !/Unhandled|Uncaught|Hook timed out/.test(
    gateMembers[`${gate.reforge.rootFix.counter}.stderr.raw`],
  ),
  'IO counter leaked an infrastructure error',
)
const failed = ioCounter.testResults.flatMap((file) =>
  file.assertionResults.filter((test) => test.status === 'failed'),
)
assert.equal(failed.length, 1)
assert.equal(
  failed[0].title,
  'close joins a real transaction and its thumbnail continuation before disposing browser IO',
)
assert(failed[0].failureMessages.join('\n').includes("expected 'pending' to be 'decoded'"))
console.log(
  JSON.stringify({
    matchedFiles: receipt.files.length,
    matchedBindings: receipt.bindings.length,
    originalControls: receipt.oldControls.length,
    nativeMembers: receipt.nativeArtifact.members.length,
    gateOriginals: gate.artifact.members.length,
    editorAssertionFiles: gate.editor.assertionInvariance.files.length,
    integration: receipt.integration.status,
    meaning: 'Evidence matches; semantic decisions remain the recorded human review boundary.',
  }),
)
