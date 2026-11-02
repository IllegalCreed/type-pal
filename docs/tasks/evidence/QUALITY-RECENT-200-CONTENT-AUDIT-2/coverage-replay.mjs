import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Reuse one official collection. Only --ratchet permits its original atomic writer.
const repoRoot = process.cwd()
assert.equal(
  process.env.TYPE_PAL_COVERAGE_BASE_REF,
  '6ebca402ae2c419ad9922f8d29097b45ea6a0df6',
  'pin this receipt to the actually fetched protected base',
)
const ratchet = process.argv.slice(2).includes('--ratchet')
assert(process.argv.slice(2).every((arg) => arg === '--ratchet'))
const allowScopeRemoval = ratchet
const { baselinePath } = await import(pathToFileURL(resolve('scripts/coverage/config.mjs')))
const { preciseCoverageEnvironment } = await import(
  pathToFileURL(resolve('scripts/coverage/environment.mjs'))
)
const { compareCoverage } = await import(pathToFileURL(resolve('scripts/coverage/metrics.mjs')))
const { auditScope } = await import(pathToFileURL(resolve('scripts/coverage/inventory.mjs')))
const { adjustApprovedBaseline } = await import(
  pathToFileURL(resolve('scripts/coverage/approved-baseline-adjustments.mjs'))
)
const { isApprovedTestRetirement } = await import(
  pathToFileURL(resolve('scripts/coverage/approved-test-retirements.mjs'))
)
const { classifyProtectedBaseline } = await import(
  pathToFileURL(resolve('scripts/coverage/protected-baseline.mjs'))
)
const ts = createRequire(resolve('package.json'))('typescript')
const source = await readFile('scripts/coverage/run.mjs', 'utf8')
const ast = ts.createSourceFile('run.mjs', source, ts.ScriptTarget.Latest, true)
const declarations = new Map()
for (const statement of ast.statements) {
  if (ts.isFunctionDeclaration(statement))
    declarations.set(statement.name.text, statement.getText(ast))
  if (ts.isVariableStatement(statement))
    for (const declaration of statement.declarationList.declarations)
      declarations.set(declaration.name.getText(ast), `const ${declaration.getText(ast)}`)
}
const names = [
  'readJson',
  'childEnvironment',
  'spawnCommand',
  'spawnCapture',
  'gitPathExists',
  'normalizeRepoPath',
  'baselineView',
  'writeBaseline',
  'assertComparableProvider',
  'assertSafeRatchetScope',
  'readBaselineFromGit',
  'assertCandidateDoesNotLowerProtectedBaseline',
  'approvedComparisonBaseline',
]
const bodies = names.map((name) => {
  assert(declarations.has(name), `missing official declaration ${name}`)
  return declarations.get(name)
})
const main = ast.statements.find(
  (statement) => ts.isFunctionDeclaration(statement) && statement.name.text === 'main',
)
const first = main.body.statements.findIndex(
  (statement) =>
    ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.some((item) => item.name.getText(ast) === 'baseline'),
)
assert(first >= 0)
const tail = main.body.statements
  .slice(first)
  .map((statement) => statement.getText(ast))
  .join('\n')
const result = JSON.parse(await readFile('coverage/fast/summary.json', 'utf8'))
const bindingPath = fileURLToPath(new URL('./coverage-bindings.json', import.meta.url))
const binding = JSON.parse(await readFile(bindingPath, 'utf8'))
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
assert.equal(digest(await readFile('coverage/fast/summary.json')), binding.reportSha256)
assert.equal(digest(source), binding.runnerSha256)
for (const pin of binding.inputs)
  assert.equal(digest(await readFile(resolve(pin.path))), pin.sha256, pin.path)
assert.equal(result.profile, 'fast')
assert.equal(result.sourceFileCount, 810)
const environment = {
  spawn,
  createHash,
  existsSync,
  readFile,
  rename,
  rm,
  writeFile,
  dirname,
  relative,
  resolve,
  repoRoot,
  baselinePath,
  preciseCoverageEnvironment,
  compareCoverage,
  auditScope,
  adjustApprovedBaseline,
  isApprovedTestRetirement,
  classifyProtectedBaseline,
  ratchet,
  allowScopeRemoval,
  result,
}
// The tail and every guard/writer below are extracted verbatim, not reimplemented.
await Function(
  ...Object.keys(environment),
  `return (async () => {${bodies.join('\n;\n')}\n${tail}\n})()`,
)(...Object.values(environment))
const hash = (value) => createHash('sha256').update(value).digest('hex')
console.log(
  JSON.stringify({
    mode: ratchet ? 'same-report-ratchet' : 'same-report-protected-fast',
    collectionsStarted: 0,
    runnerSha256: hash(source),
    extractedTailSha256: hash(tail),
    declarations: names.map((name, index) => ({ name, sha256: hash(bodies[index]) })),
    reportSha256: hash(await readFile('coverage/fast/summary.json')),
    baselineSha256: hash(await readFile(baselinePath)),
    sourceFileCount: result.sourceFileCount,
    testCount: result.testCount,
  }),
)
