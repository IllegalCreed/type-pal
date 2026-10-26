/** Read-only evidence identity/result check; design judgments remain in review.json. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import ts from 'typescript'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const read = (path) => readFileSync(resolve(root, path))
const json = (path) => JSON.parse(read(path).toString('utf8'))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
// All current native packets use UTF-8 string members with the same byte contract.
function readNativePacket(native) {
  const compressed = read(native.path)
  assert.equal(sha(compressed), native.sha256)
  const decoded = gunzipSync(compressed)
  assert.equal(sha(decoded), native.decodedSha256)
  const receipts = JSON.parse(decoded)
  for (const member of native.members) {
    assert.equal(sha(receipts[member.name]), member.sha256, member.name)
    assert.equal(Buffer.byteLength(receipts[member.name]), member.bytes, member.name)
  }
  return receipts
}
const directory = 'docs/ops/evidence/QUALITY-REVIEW-52-CLOSEOUT-1/'
const scope = json(`${directory}scope.json`)
const review = json(`${directory}review.json`)
if (review.approvedRemainder) {
  assert.equal(sha(read(review.approvedRemainder.path)), review.approvedRemainder.sha256)
  const current = json(review.approvedRemainder.path)
  assert.equal(current.files.length, 5)
  for (const binding of [
    ...current.files,
    ...current.extras,
    ...current.bindings,
    ...(current.existingAcceptedVersionBridges ?? []),
  ]) {
    assert.equal(sha(read(binding.path)), binding.sha256, binding.path)
    if (binding.dimensions)
      for (const axis of 'ABCDEFGH') assert(binding.dimensions[axis]?.length > 20)
  }
  const receipts = readNativePacket(current.native)
  for (const run of current.runs) {
    const result = JSON.parse(receipts[`${run.id}.native.json`])
    assert.deepEqual(
      [
        result.testResults.length,
        result.numPassedTests,
        result.numFailedTests,
        result.numPendingTests,
      ],
      [run.files, run.passed, 0, 0],
    )
    assert.equal(JSON.parse(receipts[`${run.id}.execution.json`]).exit, 0)
    assert.equal(receipts[`${run.id}.stderr.raw`], '')
  }
  const red = JSON.parse(receipts['migration-legacy-red-r2.native.json'])
  assert.deepEqual([red.numPassedTests, red.numFailedTests], [6, 1])
  assert(
    red.testResults
      .flatMap((suite) => suite.assertionResults)
      .filter((test) => test.status === 'failed')
      .every((test) => test.failureMessages.some((message) => message.includes('AssertionError:'))),
  )
  for (const id of ['approved-game-types-r5', 'approved-adjacent-types']) {
    assert.equal(JSON.parse(receipts[`${id}.execution.json`]).exit, 0)
    assert.equal(receipts[`${id}.stderr.raw`], '')
  }
  const delta = JSON.parse(receipts['approved-delta-proof.json'])
  for (const file of delta.files) {
    assert.equal(sha(read(file.path)), file.sha256, file.path)
    assert.equal(
      sha(execFileSync('git', ['show', `${delta.base}:${file.path}`], { cwd: root })),
      file.beforeSha256,
      file.path,
    )
  }
}
if (review.workbench) {
  assert.equal(sha(read(review.workbench.path)), review.workbench.sha256)
  const module = json(review.workbench.path)
  for (const binding of module.bindings)
    assert.equal(sha(read(binding.path)), binding.sha256, binding.path)
  const receipts = readNativePacket(module.native)
  for (const [id, files, passed, failed] of [
    ['workbench-focus-red-r2', 1, 0, 2],
    ['workbench-focus-green', 5, 21, 0],
    ['workbench-focus-final', 2, 7, 0],
  ]) {
    const result = JSON.parse(receipts[`${id}.native.json`])
    assert.deepEqual(
      [
        result.testResults.length,
        result.numPassedTests,
        result.numFailedTests,
        result.numPendingTests,
      ],
      [files, passed, failed, 0],
    )
    for (const test of result.testResults.flatMap((suite) => suite.assertionResults))
      if (test.status === 'failed')
        assert(test.failureMessages.some((message) => message.startsWith('AssertionError:')))
    assert.equal(JSON.parse(receipts[`${id}.execution.json`]).exit, failed ? 1 : 0)
    if (!failed) assert.equal(receipts[`${id}.stderr.raw`], '')
  }
  assert.equal(JSON.parse(receipts['workbench-editor-types.execution.json']).exit, 0)
  assert.equal(
    receipts['workbench-editor-types.stdout.raw'] + receipts['workbench-editor-types.stderr.raw'],
    '',
  )
}
if (review.tooling) {
  assert.equal(sha(read(review.tooling.path)), review.tooling.sha256)
  const module = json(review.tooling.path)
  for (const binding of module.bindings)
    assert.equal(sha(read(binding.path)), binding.sha256, binding.path)
  const receipts = readNativePacket(module.native)
  for (const [id, passed, failed] of [
    ['governance-tools', 118, 0],
    ['coverage-coordinator-baseline', 3, 0],
    ['coordinator-failure-red', 3, 2],
    ['coordinator-failure-green', 105, 0],
  ]) {
    const raw = receipts[`${id}.stdout.raw`]
    assert(raw.includes(`# pass ${passed}\n`))
    assert(raw.includes(`# fail ${failed}\n`))
    for (const label of ['cancelled', 'skipped', 'todo']) assert(raw.includes(`# ${label} 0\n`))
    assert.equal(receipts[`${id}.stderr.raw`], '')
    assert.equal(JSON.parse(receipts[`${id}.execution.json`]).exit, failed ? 1 : 0)
  }
  assert.equal(
    (receipts['coordinator-failure-red.stdout.raw'].match(/code: 'ERR_ASSERTION'/g) ?? []).length,
    2,
  )
  const audit = JSON.parse(receipts['tools-data-audit.json'])
  assert.equal(audit.adjustmentCount, 20)
  assert.equal(audit.distinctOldBaselines, 20)
  for (const file of audit.unchanged) {
    if (!module.retirementMaintenance?.files.includes(file.path))
      assert.equal(sha(read(file.path)), file.sha256)
    assert.equal(
      sha(execFileSync('git', ['show', `0e14c184e:${file.path}`], { cwd: root })),
      file.sha256,
    )
  }
  if (module.retirementMaintenance) {
    const freeze = json(module.retirementMaintenance.path)
    assert.equal(sha(read(module.retirementMaintenance.path)), module.retirementMaintenance.sha256)
    const { approvedTestRetirements } = await import(
      '../../../../scripts/coverage/approved-test-retirements.mjs'
    )
    assert.equal(approvedTestRetirements.length, 74)
    for (const change of freeze.changes) {
      assert.equal(sha(read(change.file)), change.fileSha256)
      const current = approvedTestRetirements.find((row) => row.file === change.file)
      for (const key of [
        'previous',
        'current',
        'previousIdentityDigest',
        'currentIdentityDigest',
        'fileSha256',
      ])
        assert.equal(current[key], change[key], `${change.file}:${key}`)
    }
    const historical = execFileSync(
      'git',
      ['show', `0e14c184e:scripts/coverage/approved-test-retirements.mjs`],
      { cwd: root, encoding: 'utf8' },
    )
    const { approvedTestRetirements: original } = await import(
      `data:text/javascript;base64,${Buffer.from(historical).toString('base64')}`
    )
    for (const row of original) {
      if (freeze.changes.some((change) => change.file === row.file)) continue
      assert.deepEqual(
        approvedTestRetirements.find((current) => current.file === row.file),
        row,
      )
    }
  }
}
if (review.presentation) {
  assert.equal(sha(read(review.presentation.path)), review.presentation.sha256)
  const module = json(review.presentation.path)
  for (const binding of module.bindings)
    assert.equal(sha(read(binding.path)), binding.sha256, binding.path)
  const receipts = readNativePacket(module.native)
  const run = JSON.parse(receipts['present-current.native.json'])
  assert.deepEqual(
    [run.testResults.length, run.numPassedTests, run.numFailedTests, run.numPendingTests],
    [6, 92, 0, 0],
  )
  assert.equal(receipts['present-current.stderr.raw'], '')
  assert.equal(JSON.parse(receipts['present-current.execution.json']).exit, 0)
  const proof = JSON.parse(receipts['present-body-proof.json'])
  const before = execFileSync('git', ['show', `${proof.base}:${proof.path}`], {
    cwd: root,
    encoding: 'utf8',
  })
  const canonical = (source) =>
    ts
      .transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          removeComments: true,
        },
      })
      .outputText.replace('../core/scene-system.js', '../core/scene-collision.js')
  assert.equal(sha(before), proof.beforeSha256)
  assert.equal(sha(read(proof.path)), proof.currentSha256)
  assert.equal(canonical(before), canonical(read(proof.path).toString()))
  assert.equal(sha(canonical(before)), proof.normalizedJavaScriptSha256)
}
assert.equal(scope.files.length, 52)
assert.equal(new Set(scope.files.map((entry) => entry.path)).size, 52)
assert.equal(review.files.length, review.resolved)
assert.equal(review.remaining + review.resolved, 52)
for (const entry of review.files) {
  assert(
    scope.files.some((item) => item.path === entry.path),
    entry.path,
  )
  assert.equal(sha(read(entry.path)), entry.sha256, `stale source: ${entry.path}`)
  assert.equal(sha(read(entry.prior.path)), entry.prior.sha256, `stale prior: ${entry.path}`)
  for (const axis of 'ABCDEFGH')
    assert(entry.dimensions[axis]?.length > 20, `${entry.path}:${axis}`)
}
for (const binding of review.bindings)
  assert.equal(sha(read(binding.path)), binding.sha256, `stale dependency: ${binding.path}`)
for (const adjacent of review.adjacent)
  assert.equal(sha(read(adjacent.path)), adjacent.sha256, `stale adjacent: ${adjacent.path}`)
for (const reference of review.modules ?? []) {
  assert.equal(sha(read(reference.path)), reference.sha256)
  const module = json(reference.path)
  for (const binding of module.bindings)
    assert.equal(
      sha(read(binding.path)),
      binding.sha256,
      `stale module dependency: ${binding.path}`,
    )
  const receipts = readNativePacket(module.native)
  for (const [id, passed] of [
    ['extract-remaining', 110],
    ['extract-approved-green', 27],
  ]) {
    const native = JSON.parse(receipts[`${id}.native.json`])
    assert.equal(native.numPassedTests, passed)
    assert.equal(native.numFailedTests + native.numPendingTests, 0)
    assert.equal(receipts[`${id}.stderr.raw`], '')
    assert.equal(JSON.parse(receipts[`${id}.execution.json`]).exit, 0)
  }
  for (const [id, failed] of [
    ['scene-audit-red-r2', 2],
    ['video-ownership-red', 3],
  ]) {
    const native = JSON.parse(receipts[`${id}.native.json`])
    assert.equal(native.numFailedTests, failed)
    for (const suite of native.testResults)
      for (const test of suite.assertionResults.filter((test) => test.status === 'failed'))
        assert(test.failureMessages.some((message) => message.includes('AssertionError:')))
  }
  const emitted = JSON.parse(receipts['extract-emitted-final.json'])
  for (const entry of emitted.results) {
    assert.equal(entry.equal, true)
    assert.equal(sha(read(entry.path)), entry.currentSha256, entry.path)
    const current = ts.transpileModule(read(entry.path).toString('utf8'), {
      fileName: entry.path,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        removeComments: true,
      },
    }).outputText
    assert.equal(sha(current), entry.javascriptSha256, entry.path)
  }
  const retained = JSON.parse(receipts['retained-test-body-proof.json'])
  assert.equal(
    retained.results.reduce((n, entry) => n + entry.previous - entry.current, 0),
    4,
  )
  for (const entry of retained.results) {
    assert.equal(entry.keptBodiesEqual, true)
    assert.equal(sha(read(entry.path)), entry.currentSha256)
  }
}
for (const reference of review.gameModules ?? []) {
  assert.equal(sha(read(reference.path)), reference.sha256)
  const module = json(reference.path)
  for (const binding of [...module.bindings, ...module.priorBindings])
    assert.equal(sha(read(binding.path)), binding.sha256, `stale game binding: ${binding.path}`)
  const receipts = readNativePacket(module.native)
  for (const run of module.runs) {
    const native = JSON.parse(receipts[`${run.id}.native.json`])
    assert.equal(native.numPassedTests, run.passed)
    assert.equal(native.testResults.length, run.fileCount)
    assert.equal(native.numFailedTests + native.numPendingTests, 0)
    assert.equal(receipts[`${run.id}.stderr.raw`], '')
    assert.equal(JSON.parse(receipts[`${run.id}.execution.json`]).exit, 0)
  }
  const red = JSON.parse(receipts['harness-rng-red.native.json'])
  assert.equal(red.numPassedTests, 1)
  assert.equal(red.numFailedTests, 6)
  for (const prefix of ['equipment-counter', 'equipment-budget-counter']) {
    const summary = JSON.parse(receipts[`${prefix}-summary.json`])
    assert.equal(summary.temporaryRemoved, true)
    assert.equal(summary.rootStatusEqual, true)
    assert.deepEqual(
      summary.results.map((result) => result.failed),
      [0, 1, 0],
    )
    assert.equal(summary.results[1].failedNames[0].kind, 'AssertionError')
  }
}
if (review.phase2) {
  assert.equal(sha(read(review.phase2.path)), review.phase2.sha256)
  const module = json(review.phase2.path)
  for (const binding of [...module.bindings, ...module.priorBindings])
    assert.equal(sha(read(binding.path)), binding.sha256, `stale phase2 binding: ${binding.path}`)
  const receipts = readNativePacket(module.native)
  const red = JSON.parse(receipts['bgm-fade-red.native.json'])
  assert.deepEqual([red.numPassedTests, red.numFailedTests], [2, 2])
  for (const test of red.testResults.flatMap((suite) => suite.assertionResults))
    if (test.status === 'failed')
      assert(test.failureMessages.some((message) => message.startsWith('AssertionError:')))
  const green = JSON.parse(receipts['bgm-fade-green.native.json'])
  assert.deepEqual(
    [green.numPassedTests, green.numFailedTests, green.numPendingTests, green.testResults.length],
    [26, 0, 0, 5],
  )
  for (const id of ['bgm-fade-green', 'reforge-typecheck']) {
    assert.equal(JSON.parse(receipts[`${id}.execution.json`]).exit, 0)
    assert.equal(receipts[`${id}.stderr.raw`], '')
  }
  const proof = JSON.parse(receipts['body-proof.json'])
  assert.equal(sha(read(proof.content.path)), proof.content.currentSha256)
  const javascript = ts.transpileModule(read(proof.content.path).toString('utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      removeComments: true,
    },
  }).outputText
  assert.equal(sha(javascript), proof.content.javascriptSha256)
  assert.equal(sha(read(module.adjacent.path)), proof.bgmTest.currentSha256)
  const prior = JSON.parse(gunzipSync(read(module.reuse.uniform)))
  const member = (name) => {
    const entry = prior[name]
    const bytes = Buffer.from(entry.base64, 'base64')
    assert.equal(sha(bytes), entry.sha256, name)
    assert.equal(bytes.length, entry.bytes, name)
    return bytes.toString('utf8')
  }
  assert.equal(JSON.parse(member('whole-check-r3.execution.json')).exit, 0)
  assert.equal(member('whole-check-r3.stderr.raw'), '')
  const output = member(module.reuse.rawMember)
  for (const run of module.reusedRuns) assert(output.includes(run.rawLine), run.path)
}
if (review.magicModule) {
  assert.equal(sha(read(review.magicModule.path)), review.magicModule.sha256)
  const module = json(review.magicModule.path)
  for (const binding of [...module.bindings, ...module.priorBindings, ...module.files])
    assert.equal(sha(read(binding.path)), binding.sha256, `stale magic binding: ${binding.path}`)
  const receipts = readNativePacket(module.native)
  const identities = (id) => {
    const native = JSON.parse(receipts[`${id}.native.json`])
    assert.deepEqual(
      [
        native.testResults.length,
        native.numPassedTests,
        native.numFailedTests,
        native.numPendingTests,
      ],
      [14, 226, 0, 0],
    )
    assert.equal(receipts[`${id}.stderr.raw`], '')
    assert.equal(JSON.parse(receipts[`${id}.execution.json`]).exit, 0)
    return native.testResults
      .flatMap((suite) => suite.assertionResults.map((test) => `${suite.name} :: ${test.fullName}`))
      .sort()
  }
  assert.deepEqual(identities('magic-module-baseline'), identities('magic-module-after'))
  const proof = JSON.parse(receipts['magic-split-proof.json'])
  const original = execFileSync(
    'git',
    ['show', `${proof.permanentOriginalSourceBase}:${module.originalFixedPath}`],
    { cwd: root, encoding: 'utf8' },
  )
  assert.equal(sha(original), proof.beforeSha256)
  const canonical = (source) => {
    const javascript = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        removeComments: true,
      },
    }).outputText
    return execFileSync(
      resolve(root, 'node_modules/.bin/biome'),
      ['format', '--stdin-file-path=proof.js'],
      {
        cwd: root,
        input: javascript,
        encoding: 'utf8',
      },
    )
  }
  const before = ts.createSourceFile('magic.ts', original, ts.ScriptTarget.Latest, true)
  const functionText = (source, name) =>
    source.statements
      .find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name)
      .getText(source)
  assert.equal(proof.movedFunctions.length, 7)
  for (const moved of proof.movedFunctions) {
    const current = ts.createSourceFile(
      moved.afterPath,
      read(moved.afterPath).toString('utf8'),
      ts.ScriptTarget.Latest,
      true,
    )
    const oldText = functionText(before, moved.name).replaceAll(
      'OFF_MAGIC_TYPES.has(',
      'isOffensiveMagicType(',
    )
    const currentText = functionText(current, moved.name)
    assert.equal(sha(canonical(oldText)), moved.canonicalJavaScriptSha256, moved.name)
    assert.equal(sha(canonical(currentText)), moved.canonicalJavaScriptSha256, moved.name)
  }
  const counter = JSON.parse(receipts['magic-type-counter.json'])
  assert.equal(counter.temporaryRemoved, true)
  assert.equal(counter.rootStatusEqual, true)
  assert.equal(counter.results[0].exit, 2)
  assert.equal(counter.results[1].exit, 0)
  const diagnostic = receipts['magic-owner-types-red.stdout.raw']
  assert.equal((diagnostic.match(/error TS2344:/g) ?? []).length, 1)
  assert.equal((diagnostic.match(/error TS\d+:/g) ?? []).length, 1)
  assert.equal(
    receipts['magic-owner-types-restored.stdout.raw'] +
      receipts['magic-owner-types-restored.stderr.raw'],
    '',
  )
  assert.equal(JSON.parse(receipts['magic-contract-types.execution.json']).exit, 0)
  assert.equal(
    receipts['magic-contract-types.stdout.raw'] + receipts['magic-contract-types.stderr.raw'],
    '',
  )
}
if (review.entrySource) {
  assert.equal(sha(read(review.entrySource.path)), review.entrySource.sha256)
  const module = json(review.entrySource.path)
  for (const binding of [...module.bindings, ...module.priorBindings])
    assert.equal(sha(read(binding.path)), binding.sha256, `stale entry binding: ${binding.path}`)
  const receipts = readNativePacket(module.native)
  for (const run of module.runs) {
    const native = JSON.parse(receipts[`${run.id}.native.json`])
    assert.deepEqual(
      [
        native.testResults.length,
        native.numPassedTests,
        native.numFailedTests,
        native.numPendingTests,
      ],
      [run.files, run.passed, 0, 0],
    )
    assert.equal(JSON.parse(receipts[`${run.id}.execution.json`]).exit, 0)
    assert.equal(receipts[`${run.id}.stderr.raw`], '')
  }
  const types = JSON.parse(receipts['migrate-typecheck.execution.json'])
  assert.equal(types.exit, 0)
  assert.equal(
    receipts['migrate-typecheck.stdout.raw'] + receipts['migrate-typecheck.stderr.raw'],
    '',
  )
  const hooks = JSON.parse(receipts['main-hooks-proof.json'])
  assert.equal(hooks.rows.length, 3)
  assert(hooks.rows.every((hook) => hook.equal))
  assert.equal(sha(read(module.extra.path)), module.extra.sha256)
}
const packet = read(review.native.path)
assert.equal(sha(packet), review.native.sha256)
const raw = gunzipSync(packet)
assert.equal(sha(raw), review.native.decodedSha256)
const members = JSON.parse(raw)
for (const member of review.native.members) {
  const bytes = Buffer.from(members[member.name])
  assert.equal(bytes.length, member.bytes, member.name)
  assert.equal(sha(bytes), member.sha256, member.name)
}
const result = JSON.parse(members['extract-foundation-r2.native.json'])
assert.equal(result.success, true)
assert.equal(result.numPassedTests, 136)
assert.equal(result.numFailedTests + result.numPendingTests, 0)
assert.equal(result.testResults.length, 8)
for (const id of ['extract-foundation-r2', 'shared-typecheck-r2', 'extract-typecheck']) {
  const execution = JSON.parse(members[`${id}.execution.json`])
  assert.equal(execution.exit, 0)
  assert.equal(execution.signal, null)
  assert.equal(execution.spawnError, null)
  assert.equal(members[`${id}.stderr.raw`], '')
}
for (const id of ['extract-foundation', 'shared-typecheck']) {
  assert.equal(JSON.parse(members[`${id}.execution.json`]).spawnError.code, 'ENOENT')
}
const body = JSON.parse(members['comment-body-proof.json'])
assert.equal(body.allEqual, true)
assert.equal(body.base, scope.base)
const canonical = (source, path) =>
  ts
    .createPrinter({ removeComments: true })
    .printFile(ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true))
for (const item of body.results) {
  const before = execFileSync('git', ['show', `${scope.base}:${item.path}`], {
    cwd: root,
    encoding: 'utf8',
  })
  const current = canonical(read(item.path).toString('utf8'), item.path)
  assert.equal(canonical(before, item.path), current, item.path)
  assert.equal(sha(current), item.canonicalSha256, item.path)
}
const oldRoot = 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/'
const enemy = json(`${oldRoot}codex-enemy-role.json`).artifact
assert.equal(sha(read(enemy.path)), enemy.sha256)
const enemyRaw = gunzipSync(read(enemy.path))
assert.equal(sha(enemyRaw), enemy.decodedSha256)
const enemyMembers = JSON.parse(enemyRaw)
for (const item of enemy.members) assert.equal(sha(enemyMembers[item.name]), item.sha256, item.name)
for (const [id, count] of [
  ['directed', 11],
  ['adjacent', 89],
]) {
  const native = JSON.parse(enemyMembers[`${id}.native.json`])
  assert.equal(native.numPassedTests, count)
  assert.equal(native.numFailedTests + native.numPendingTests, 0)
  assert.equal(enemyMembers[`${id}.stderr`], '')
}
for (const id of ['object-fields', 'zero-roles']) {
  assert.equal(JSON.parse(enemyMembers[`${id}-old.native.json`]).numPassedTests, 1)
  assert.equal(JSON.parse(enemyMembers[`${id}-new.native.json`]).numFailedTests, 1)
}
const word = json(`${oldRoot}codex-stage3-word.json`)
assert.equal(sha(read(word.input.path)), word.input.sha256)
for (const item of word.attachments) {
  assert.equal(sha(read(item.path)), item.gzipSha256)
  const bytes = gunzipSync(read(item.path))
  assert.equal(sha(bytes), item.originalSha256)
  const native = JSON.parse(bytes)
  assert.deepEqual(
    [native.numTotalTests, native.numPassedTests, native.numFailedTests, native.numPendingTests],
    [item.total, item.passed, item.failed, item.pending],
  )
}
const compiler = json(`${oldRoot}codex-stage2-rework.json`).typeCounterAndRestore
assert.equal(sha(read(compiler.source)), compiler.sourceSha256)
assert.equal(compiler.mutation.exitCode, 2)
assert.equal((compiler.mutation.stdout.match(/error TS2344:/g) ?? []).length, 1)
assert.equal(compiler.restored.exitCode, 0)
assert.equal(compiler.restored.stdout + compiler.restored.stderr, '')
assert.equal(compiler.temporaryFileRemoved, true)
console.log(
  `review52: ${review.resolved}/52 code-accepted; ${review.remaining} remain; identities/native/comment-body PASS; uniform gates/publication separate`,
)
