import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const folder = dirname(fileURLToPath(import.meta.url))
const root = resolve(folder, '../../../../../..')
const ts = createRequire(`${root}/package.json`)('typescript')
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const json = (name) => JSON.parse(readFileSync(resolve(folder, name), 'utf8'))
const review = json('review.json')
const identities = json('identities.json')
const invariant = json('body-invariance.json')
assert.equal(ts.version, invariant.typescript, 'STALE TypeScript producer version')
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
const read = (file) => readFileSync(resolve(root, file), 'utf8')
const sourceFile = (source) =>
  ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest, true)
const print = (source) => ts.createPrinter({ removeComments: true }).printFile(sourceFile(source))
const emit = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      removeComments: true,
    },
  }).outputText

for (const pin of [...review.files, ...review.pins]) {
  assert.equal(sha(readFileSync(resolve(root, pin.path))), pin.sha256, `STALE ${pin.path}`)
}
for (const input of review.inputs ?? []) {
  const file = resolve(root, input.path)
  assert.ok(existsSync(file), `UNAVAILABLE input-specific claim: ${input.path}`)
  const bytes = readFileSync(file)
  assert.equal(bytes.length, input.bytes, input.path)
  assert.equal(sha(bytes), input.sha256, `STALE input-specific claim: ${input.path}`)
}
for (const file of review.files) {
  assert.deepEqual(Object.keys(file.dimensions).sort(), [...'ABCDEFGH'])
}
for (const artifact of review.artifacts) {
  const gzip = readFileSync(resolve(folder, artifact.file))
  const bytes = gunzipSync(gzip)
  assert.equal(sha(gzip), artifact.gzipSha256, artifact.file)
  assert.equal(sha(bytes), artifact.sha256, artifact.file)
  assert.equal(bytes.length, artifact.bytes, artifact.file)
}
const raw = (name) => gunzipSync(readFileSync(resolve(folder, `${name}.gz`))).toString()
const native = (name) => JSON.parse(raw(`${name}.native.json`))
const nativeSets = (id) => {
  const execution = JSON.parse(raw(`${id}.execution.json`))
  return Object.fromEntries(
    native(id).testResults.map((file) => {
      const name = relative(execution.cwd, file.name)
      return [
        name,
        file.assertionResults.map((test) => ({
          identity: `${name} :: project root :: ${[...test.ancestorTitles, test.title].join(' > ')}`,
          fullName: test.fullName,
          status: test.status,
          title: test.title,
          ancestors: test.ancestorTitles,
        })),
      ]
    }),
  )
}
assert.deepEqual(identities.before, { ...nativeSets('before'), ...nativeSets('dialog-before') })
assert.deepEqual(identities.after, { ...nativeSets('after'), ...nativeSets('dialog-final-r3') })
for (const [id, passed, failed] of [
  ['before', 38, 0],
  ['after', 35, 0],
  ['helper-callers', 147, 0],
  ['dialog-before', 26, 0],
  ['dialog-final', 23, 0],
  ['dialog-final-r2', 24, 0],
  ['dialog-final-r3', 24, 0],
  ['global-before', 9, 1],
  ['global-after', 9, 0],
  ['warning-old', 1, 0],
  ['warning-new', 0, 1],
  ['warning-new-r2', 0, 1],
]) {
  const result = native(id)
  assert.equal(result.numPassedTests, passed, id)
  assert.equal(result.numFailedTests, failed, id)
  const execution = JSON.parse(raw(`${id}.execution.json`))
  assert.equal(execution.exit, failed ? 1 : 0, id)
  assert.equal(execution.signal, null, id)
  assert.equal(execution.spawnError, null, id)
  if (!failed) assert.equal(raw(`${id}.stderr.raw`), '', id)
  if (failed) assert.match(raw(`${id}.stderr.raw`), /AssertionError:/, id)
}
for (const product of invariant.products) {
  const before = git('show', `${review.base}:${product.path}`)
  const current = read(product.path)
  assert.equal(print(before), print(current), product.path)
  assert.equal(emit(before), emit(current), product.path)
}
function normalizedHelper(source) {
  const node = sourceFile(source)
  const statements = node.statements.map((statement) =>
    ts.isFunctionDeclaration(statement) &&
    invariant.helper.retiredExports.includes(statement.name?.text)
      ? ts.factory.updateFunctionDeclaration(
          statement,
          statement.modifiers?.filter((m) => m.kind !== ts.SyntaxKind.ExportKeyword),
          statement.asteriskToken,
          statement.name,
          statement.typeParameters,
          statement.parameters,
          statement.type,
          statement.body,
        )
      : statement,
  )
  const emitted = emit(
    ts
      .createPrinter({ removeComments: true })
      .printFile(ts.factory.updateSourceFile(node, statements)),
  )
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.Standard,
    emitted,
  )
  const tokens = []
  let kind = scanner.scan()
  while (kind !== ts.SyntaxKind.EndOfFileToken) {
    tokens.push([kind, scanner.getTokenText()])
    kind = scanner.scan()
  }
  return JSON.stringify(tokens)
}
assert.equal(
  normalizedHelper(git('show', `${review.base}:${invariant.helper.path}`)),
  normalizedHelper(read(invariant.helper.path)),
)
for (const control of [
  'warning-control.json',
  'global-probe-restoration.json',
  'global-after-restoration.json',
]) {
  // Preserve the source-specific restoration receipt, not merely the final green count.
  assert.ok(
    review.artifacts.some((a) => a.file === `${control}.gz`),
    control,
  )
}
for (const id of ['global-probe-restoration', 'global-after-restoration']) {
  const control = JSON.parse(raw(`${id}.json`))
  assert.equal(control.before, control.after, id)
}
for (const control of JSON.parse(raw('warning-control.json')).restored) {
  assert.equal(control.sha256, control.actual, control.path)
}
for (const control of JSON.parse(raw('warning-control-r2.json')).restored) {
  assert.equal(control.sha256, control.actual, control.path)
  assert.equal(control.actual, sha(readFileSync(resolve(root, control.path))), control.path)
}
const exports = (source) =>
  sourceFile(source)
    .statements.filter(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword),
    )
    .map((statement) => statement.name.text)
    .sort()
assert.deepEqual(exports(read(invariant.helper.path)), invariant.helper.currentExports)
assert.deepEqual(
  invariant.helper.oldExports.filter((name) => !invariant.helper.currentExports.includes(name)),
  [...invariant.helper.retiredExports].sort(),
)
const { approvedTestRetirements } = await import(
  resolve(root, 'scripts/coverage/approved-test-retirements.mjs')
)
for (const entry of identities.retirementEntries) {
  const digest = (rows) =>
    sha(JSON.stringify(rows.map((r) => r.identity).sort((a, b) => a.localeCompare(b))))
  assert.equal(digest(identities.before[entry.file]), entry.previousIdentityDigest)
  assert.equal(digest(identities.after[entry.file]), entry.currentIdentityDigest)
  assert.equal(sha(readFileSync(resolve(root, entry.file))), entry.fileSha256)
  assert.deepEqual(
    approvedTestRetirements.find((row) => row.file === entry.file),
    entry,
  )
}
if (review.integration.official?.exit === 0) {
  for (const id of [
    'module-check',
    'module-ratchet',
    'module-protected',
    'post-freeze-typecheck',
    'post-freeze-tools',
    'final-docs',
    'final-lint',
    'final-ledger',
    'final-diff',
  ]) {
    const run = JSON.parse(raw(`${id}.execution.json`))
    assert.equal(run.exit, 0, id)
    assert.equal(run.signal, null, id)
    assert.equal(run.spawnError, null, id)
    assert.equal(raw(`${id}.stderr.raw`), '', id)
  }
  const protectedReport = JSON.parse(raw('module-protected-report.json'))
  assert.deepEqual(protectedReport.strict.regressions, [])
  assert.deepEqual(protectedReport.scope.changes, [])
  assert.deepEqual(protectedReport.protectedMetrics.regressions, [])
  assert.equal(protectedReport.testCount, review.integration.official.testCount)
  assert.equal(protectedReport.sourceFileCount, review.integration.official.sourceFileCount)
  assert.equal(sha(raw('module-baseline.after.json')), protectedReport.baselineAfterSha256)
  assert.deepEqual(
    protectedReport.protectedScope.removals.map((r) => r.value).sort(),
    identities.retirementEntries.map((r) => r.file).sort(),
  )
}
console.log(
  `MATCH ${review.files.length} A-H files; complete raw/native proofs and body invariance. ${relative(root, folder)}; semantic conclusions and integration gate state remain in review.json.`,
)
