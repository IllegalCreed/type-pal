import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

// Identity/receipt checks only. A match does not certify the recorded design judgments.
const here = dirname(fileURLToPath(import.meta.url))
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: here,
  encoding: 'utf8',
}).trim()
const args = process.argv.slice(2)
if (args.length !== 0 && (args.length !== 2 || args[0] !== '--record'))
  throw new Error('usage: node verify-stage2.mjs [--record path]')
const record = JSON.parse(
  readFileSync(args[1] ? resolve(args[1]) : resolve(here, 'codex-stage2-rework.json'), 'utf8'),
)
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const issues = []
const unavailable = []
function read(path) {
  const full = resolve(root, path)
  if (!full.startsWith(root + sep)) throw new Error(`path escapes repository: ${path}`)
  return readFileSync(full)
}
function check(label, action) {
  try {
    if (!action()) issues.push(label)
  } catch (error) {
    unavailable.push({ label, error: String(error) })
  }
}
for (const binding of [...record.fileReviews, ...record.callerPrimaryBindings])
  check(`current source ${binding.path}`, () => hash(read(binding.path)) === binding.sha256)
for (const row of record.fileReviews)
  check(`eight-axis shape ${row.path}`, () =>
    'ABCDEFGH'.split('').every((axis) => typeof row['A-H'][axis] === 'string'),
  )
for (const row of record.authorModuleIndex)
  check(
    `frozen author receipt ${row.path}`,
    () =>
      hash(execFileSync('git', ['show', `${row.authorSnapshot}:${row.path}`], { cwd: root })) ===
      row.originalSha256,
  )
for (const row of [...record.attachments, ...record.nativeRelocations]) {
  const path = row.currentPath ?? row.path
  check(`lossless native ${path}`, () => {
    const compressed = read(path)
    return (
      hash(compressed) === row.gzipSha256 && hash(gunzipSync(compressed)) === row.originalSha256
    )
  })
}
for (const row of record.attachments)
  check(`current native result ${row.path}`, () => {
    const native = JSON.parse(gunzipSync(read(row.path)))
    const cases = native.testResults.flatMap((file) => file.assertionResults)
    return (
      native.success === true &&
      native.numTotalTests === row.tests &&
      native.numPassedTests === row.passed &&
      native.numFailedTestSuites === 0 &&
      cases.length === row.tests &&
      cases.every((test) => test.status === 'passed')
    )
  })
const identities = (native) =>
  new Set(
    native.testResults.flatMap((file) =>
      file.assertionResults.map((test) => {
        const start = file.name.indexOf('/packages/')
        if (start < 0) throw new Error(`unknown native path: ${file.name}`)
        return `${file.name.slice(start + 1)}\0${test.fullName}`
      }),
    ),
  )
check('exact runtime-to-compiler identity mapping', () => {
  const before = identities(
    JSON.parse(
      read(
        'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/shared-types/directed.json',
      ),
    ),
  )
  const afterFile = record.attachments.find((row) => row.path.endsWith('shared.vitest.json.gz'))
  const after = identities(JSON.parse(gunzipSync(read(afterFile.path))))
  const retired = new Set(
    record.oldRuntimeCaseMapping.map((row) => `${row.oldFile}\0${row.fullName}`),
  )
  return (
    retired.size === 14 &&
    [...before].every((id) => after.has(id) !== retired.has(id)) &&
    [...after].every((id) => before.has(id))
  )
})
check('compiler counter restored and source still matches', () => {
  const proof = record.typeCounterAndRestore
  return (
    proof.mutation.exitCode !== 0 &&
    proof.mutation.stdout.includes('error TS2344') &&
    proof.restored.exitCode === 0 &&
    hash(read(proof.source)) === proof.sourceSha256
  )
})
process.stdout.write(
  `${JSON.stringify({
    outcome: issues.length
      ? 'stale-or-mismatch'
      : unavailable.length
        ? 'cannot-verify'
        : 'identities-match',
    issues,
    unavailable,
    semanticAcceptance:
      'Not certified by this checker; remaining R1 review and unified gates stay open.',
    runtimeCasesMovedToCompiler: record.oldRuntimeCaseMapping.length,
  })}\n`,
)
process.exitCode = issues.length ? 1 : unavailable.length ? 2 : 0
