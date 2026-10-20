import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { gunzipSync } from 'node:zlib'

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const dir = dirname(fileURLToPath(import.meta.url))
const receipt = JSON.parse(readFileSync(join(dir, 'present-speedrun-local.json')))
const hash = (b) => createHash('sha256').update(b).digest('hex')
const read = (p) => readFileSync(resolve(root, p))
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
for (const row of [...receipt.files, ...receipt.bindings])
  assert.equal(hash(read(row.path)), row.sha256, `stale input; inspect relevant delta: ${row.path}`)
for (const row of receipt.files)
  for (const axis of 'ABCDEFGH') assert(row.dimensions[axis], `missing ${axis}: ${row.path}`)
const packed = read(receipt.nativeArtifact.path)
assert.equal(hash(packed), receipt.nativeArtifact.sha256)
const { members } = JSON.parse(gunzipSync(packed))
assert.equal(Object.keys(members).length, receipt.nativeArtifact.members.length)
for (const row of receipt.nativeArtifact.members) {
  assert.equal(Buffer.byteLength(members[row.name]), row.bytes, row.name)
  assert.equal(hash(members[row.name]), row.sha256, row.name)
}
for (const row of receipt.runs) {
  const run = JSON.parse(members[row.member])
  assert.equal(run.exit, row.exit, row.id)
  assert.equal(run.signal, null, row.id)
  assert.equal(run.spawnError, null, row.id)
  for (const kind of ['stdout', 'stderr']) {
    assert.equal(Buffer.byteLength(members[run[kind].member]), run[kind].bytes)
    assert.equal(hash(members[run[kind].member]), run[kind].sha256)
  }
  const text = members[`${row.id}.native.json`]
  if (!text) continue
  const native = JSON.parse(text)
  const failed = native.testResults.flatMap((f) =>
    f.assertionResults.filter((t) => t.status === 'failed').map((t) => t.fullName),
  )
  assert.deepEqual(failed.sort(), row.failed.map((f) => f.fullName).sort(), row.id)
  assert.equal(native.numFailedTests, row.expectedFailures, row.id)
  assert.equal(native.numRuntimeErrorTestSuites ?? 0, 0, row.id)
  assert.equal(native.numPendingTests, 0, row.id)
  assert.equal(run.exit, row.expectedFailures > 0 ? 1 : 0, row.id)
  if (row.expectedFailures > 0)
    for (const item of row.failed)
      assert(
        item.messages.some((m) => m.includes('AssertionError:')),
        row.id,
      )
  else {
    assert.equal(run.stderr.bytes, 0, row.id)
    assert(!/^(stdout|stderr) \|/m.test(members[run.stdout.member]), row.id)
  }
}
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const emit = (s) =>
  ts.transpileModule(s, {
    compilerOptions: { removeComments: true, target: ts.ScriptTarget.ES2022 },
  }).outputText
const oldSource = (p) => git('show', `${receipt.base}:${p}`)
const canonical = (source) =>
  ts
    .createPrinter({ removeComments: true })
    .printFile(ts.createSourceFile('input.ts', source, ts.ScriptTarget.Latest, true))
for (const row of receipt.commentOnlyOverrides) {
  const before = members[row.beforeMember]
  const after = read(row.path).toString()
  assert.equal(hash(before), row.beforeSha256)
  assert.equal(hash(after), row.afterSha256)
  assert.equal(canonical(before), canonical(after), row.path)
}
const cast = receipt.castElision
const beforeCast = members[cast.beforeCommentMember].replace(cast.after, cast.before)
assert.equal(hash(beforeCast), cast.beforeSha256)
assert.equal(emit(beforeCast), emit(read(cast.path).toString()), 'redundant cast elision')
const timer = 'packages/game/src/tools/speedrun/timer.ts'
assert.equal(emit(read(timer).toString()), emit(oldSource(timer)), 'timer executable body')
const detectors = 'packages/game/src/tools/speedrun/detectors.ts'
const beforeDetector = oldSource(detectors).replace(
  'cur.battle != null && cur.battle.enemyIds.has(enemyId)',
  'cur.battle?.enemyIds.has(enemyId) ?? false',
)
assert.equal(emit(read(detectors).toString()), emit(beforeDetector), 'only boolean rewrite allowed')
for (const row of receipt.identityOnlyOverrides) {
  const before = oldSource(row.path)
  const current = read(row.path).toString()
  assert(before.includes(row.before) && current.includes(row.after))
  assert.equal(
    emit(before.replace(row.before, '<identity>')),
    emit(current.replace(row.after, '<identity>')),
  )
}
const pure = JSON.parse(members['playerinfo-refactor-proof.json'])
for (const row of pure.files) assert.equal(hash(read(row.path)), row.sha256, row.path)
assert.equal(hash(members['playerinfo-refactor.patch']), pure.patchSha256)
const functionAst = (s, name) => {
  const file = ts.createSourceFile('input.ts', s, ts.ScriptTarget.Latest, true)
  const declaration = file.statements.find(
    (n) => ts.isFunctionDeclaration(n) && n.name?.text === name,
  )
  assert(declaration, name)
  return ts
    .createPrinter({ removeComments: true })
    .printNode(ts.EmitHint.Unspecified, declaration, file)
}
assert.equal(
  functionAst(
    oldSource('packages/game/src/present/battle/draw-battle-ui.ts'),
    'computePlayerFaceColor',
  ),
  functionAst(
    read('packages/game/src/present/player-info-box.ts').toString(),
    'computePlayerFaceColor',
  ),
)
const option = process.argv.slice(2)
const gate = JSON.parse(readFileSync(join(dir, 'present-speedrun-gates.json')))
if (gate.artifact) {
  const bytes = read(gate.artifact.path)
  assert.equal(hash(bytes), gate.artifact.sha256)
  const originals = JSON.parse(gunzipSync(bytes)).members
  assert.equal(Object.keys(originals).length, gate.artifact.members.length)
  for (const row of gate.artifact.members) {
    assert.equal(Buffer.byteLength(originals[row.name]), row.bytes, row.name)
    assert.equal(hash(originals[row.name]), row.sha256, row.name)
  }
  for (const row of gate.sourceBindings) assert.equal(hash(read(row.path)), row.sha256, row.path)
  git('merge-base', '--is-ancestor', receipt.base, 'HEAD')
  const changed = git('diff', '--name-only', receipt.base, '--', 'packages', 'scripts')
  assert.deepEqual(
    changed.trim().split('\n').filter(Boolean).sort(),
    gate.sourceBindings.map((r) => r.path).sort(),
  )
  assert.equal(
    git('ls-files', '--others', '--exclude-standard', '--', 'packages', 'scripts').trim(),
    '',
  )
  const rules = {
    unimplementedOpcode: /event-system: skip raw opcode=0x[0-9a-f]+/gi,
    reactAct: /not wrapped in act\(/g,
    controlledInput: /You provided a `value` prop to a form field without an `onChange` handler/g,
    actEnvironment: /not configured to support act/g,
    testStderrBlocks: /^\s*stderr \|/gm,
    warnings: /\bWarning:|\[warn(?:ing)?\]/gi,
    navigation: /Not implemented: navigation/gi,
    audioContextUnavailable: /AudioContext 不可用/g,
    staticDiagnosticPrefix: /^\s*(?:Error|Warning|Info)(?:\[|:)/gm,
    tsErrors: /\berror TS\d+/g,
    unhandled: /Unhandled (?:Error|Rejection|Exception)|Vitest caught \d+ unhandled/gi,
    failedTap: /^not ok /gm,
  }
  for (const role of ['check', 'ratchet', 'protected']) {
    const entry = gate.uniformGates.find((r) => r.role === role)
    assert(entry, role)
    const run = JSON.parse(originals[`${entry.id}.execution.json`])
    assert.equal(run.exit, 0, entry.id)
    assert.equal(run.signal, null, entry.id)
    assert.equal(run.spawnError, null, entry.id)
    const frozen = new Map(run.codeChanges.map((r) => [r.path, r.sha256]))
    for (const row of gate.sourceBindings) {
      if (row.path === 'scripts/coverage/baseline.fast.json') continue
      const before = frozen.get(row.path) ?? hash(git('show', `${run.head}:${row.path}`))
      assert.equal(before, row.sha256, `${entry.id}/${row.path}`)
    }
    for (const stream of [run.stdout, run.stderr]) {
      assert.equal(Buffer.byteLength(originals[stream.member]), stream.bytes)
      assert.equal(hash(originals[stream.member]), stream.sha256)
    }
    assert.equal(run.stderr.bytes, 0, entry.id)
    const text = stripVTControlCharacters(originals[run.stdout.member])
    for (const [name, rule] of Object.entries(rules))
      assert.equal((text.match(rule) ?? []).length, 0, `${entry.id}/${name}`)
    if (role !== 'check') {
      const summary = JSON.parse(originals[`${entry.id}.coverage-summary.json`])
      assert(summary.generatedAt >= run.start && summary.generatedAt <= run.end, entry.id)
      assert.equal(summary.sourceFileCount, 742)
      assert.equal(summary.testCount, 19979)
    }
  }
  for (const entry of gate.finalStatic ?? []) {
    const run = JSON.parse(originals[`${entry.id}.execution.json`])
    assert.equal(run.role, entry.role)
    assert.equal(run.exit, 0, entry.id)
    assert.equal(run.signal, null, entry.id)
    assert.equal(run.spawnError, null, entry.id)
    assert.equal(run.stderr.bytes, 0, entry.id)
    for (const stream of [run.stdout, run.stderr]) {
      assert.equal(Buffer.byteLength(originals[stream.member]), stream.bytes)
      assert.equal(hash(originals[stream.member]), stream.sha256)
    }
    const text = originals[run.stdout.member]
    if (entry.role === 'docs') assert(text.includes('docs: PASS (0 issues)'))
    if (entry.role === 'lint') assert(text.includes('0 errors / 0 warnings / 0 infos'))
    if (entry.role === 'ledger') assert(text.includes('277 closed / 173 review / 2875 pending'))
  }
  const delta = gate.baselineOfficialDelta
  assert.equal(hash(read(delta.path)), delta.afterSha256)
  assert.equal(hash(originals[delta.beforeMember]), delta.beforeSha256)
  assert.equal(hash(originals[delta.afterMember]), delta.afterSha256)
  assert.deepEqual(
    JSON.parse(
      execFileSync(process.execPath, ['-e', members['restore-assertion-proof.cjs']], {
        cwd: root,
        encoding: 'utf8',
      }),
    ),
    gate.diagnosticRepair.assertionPreservation,
  )
  const erratumBytes = read(gate.erratum.archive)
  assert.equal(hash(erratumBytes), gate.erratum.archiveSha256)
  const historical = JSON.parse(gunzipSync(erratumBytes)).members
  for (const row of gate.erratum.rows) {
    const text = historical[row.member]
    assert.equal(hash(text), row.sha256)
    assert.equal((text.match(rules.unimplementedOpcode) ?? []).length, row.restoreDiagnostics)
  }
}
if (option.length) {
  assert.equal(option.length, 1, 'use --replay=<run-id>; default mode writes nothing')
  assert(option[0].startsWith('--replay='))
  const id = option[0].slice('--replay='.length)
  assert(receipt.replayAllowed.includes(id), 'unsupported replay')
  const run = JSON.parse(members[`${id}.execution.json`])
  const work = mkdtempSync(join(tmpdir(), 'type-pal-pre94-replay-'))
  const oldRoot = run.cwd.slice(0, -'/packages/game'.length)
  const oldDir = dirname(
    run.args.find((a) => a.startsWith('--outputFile=')).slice('--outputFile='.length),
  )
  const configDir = dirname(run.args[run.args.indexOf('--config') + 1])
  const translate = (s) =>
    s.replaceAll(oldRoot, root).replaceAll(oldDir, work).replaceAll(configDir, work)
  for (const [name, source] of Object.entries(members))
    if (name.endsWith('.config.mjs') || name === 'timer-counter-factory.mjs')
      writeFileSync(join(work, name), translate(source), { flag: 'wx' })
  const status = git('status', '--porcelain')
  const productDiff = hash(git('diff', '--binary', '--', 'packages', 'scripts'))
  const result = spawnSync(join(root, 'node_modules/.bin/vitest'), run.args.map(translate), {
    cwd: join(root, 'packages/game'),
    env: { ...process.env },
    stdio: 'inherit',
  })
  assert.equal(result.status, run.exit)
  const native = JSON.parse(readFileSync(join(work, `${id}.native.json`)))
  const failed = native.testResults.flatMap((f) =>
    f.assertionResults.filter((t) => t.status === 'failed').map((t) => t.fullName),
  )
  assert.deepEqual(
    failed.sort(),
    receipt.runs
      .find((r) => r.id === id)
      .failed.map((t) => t.fullName)
      .sort(),
  )
  assert.equal(native.numRuntimeErrorTestSuites ?? 0, 0)
  assert.equal(native.numPendingTests, 0)
  assert.equal(git('status', '--porcelain'), status)
  assert.equal(hash(git('diff', '--binary', '--', 'packages', 'scripts')), productDiff)
  console.log(`Replay originals: ${work}`)
}
console.log(
  `36 file bindings/A–H entries and ${receipt.runs.length} complete local run originals match; pure extraction and exact body/identity proofs match. Semantic review is not machine-certified. Unified-gate state: ${receipt.status}`,
)
