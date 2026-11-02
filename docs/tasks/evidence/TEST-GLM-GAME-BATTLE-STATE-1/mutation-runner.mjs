/**
 * TEST-GLM-GAME-BATTLE-STATE-1 三态反控 runner(多目标文件版)。
 *
 * 每注入点 3 相位(原始绿 / 变异红 / 恢复绿),同一 vitest 命令 spawnSync 执行;完整保留
 * argv/cwd/env 快照/stdout/stderr(规整后全文落盘 + bytes/sha256 按落盘字节)/exitCode/
 * signal/spawnError/JSON 摘要/逐套件 status/全量 identitySet(file×fullName×status)/
 * 每相位 identitySha。
 *
 * 判据(任一命中即 INVALID):
 *  - reporter 必需字段缺失 → missing-reporter-field(不静默兜底)。
 *  - 零执行 / red-json-unparsable / red-pending>0 / red-runtime-error>0 /
 *    red-no-business-assertion / red-not-single-target(failed≠1 或未命中目标 it)/
 *    original-not-green / restored-not-green / restore-sha-mismatch / green-identity-drift。
 *
 * 落盘纪律:stdout/stderr trimEof 去尾空白 + 恰好一个换行;bytes/sha256 按规整后落盘字节;
 * mutation-results.json 末尾恰好一个换行。针跨 4 个目标文件,逐针读原文件、变异、按字节恢复。
 */

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..', '..', '..')
const cfg = JSON.parse(readFileSync(join(here, 'mutation-points.json'), 'utf8'))
const points = cfg.points
const testArg = cfg.testArg
const logDir = join(here, 'mutation-logs')

const sha256 = (buf) => `sha256:${createHash('sha256').update(buf).digest('hex')}`

/** trimEof:去尾部空白,保留恰好一个换行终止符。 */
function trimEof(text) {
  const trimmed = text.replace(/\s+$/u, '')
  return trimmed.length === 0 ? '' : `${trimmed}\n`
}

const REQUIRED_FIELDS = [
  'numTotalTests',
  'numPassedTests',
  'numFailedTests',
  'numPendingTests',
  'success',
  'testResults',
]

function parseReporter(stdout) {
  const start = stdout.indexOf('{')
  const end = stdout.lastIndexOf('}')
  if (start < 0 || end <= start) return { parsed: false, reason: 'no-json-object-in-stdout' }
  try {
    return { parsed: true, json: JSON.parse(stdout.slice(start, end + 1)) }
  } catch (err) {
    return { parsed: false, reason: `json-parse-error: ${err.message}` }
  }
}

function digest(json) {
  const missing = REQUIRED_FIELDS.filter((f) => json[f] === undefined)
  const suites = (json.testResults ?? []).map((s) => ({
    name: s.name,
    status: s.status,
    assertionResults: (s.assertionResults ?? []).map((a) => ({
      fullName: a.fullName,
      status: a.status,
      failureMessages: a.failureMessages ?? [],
    })),
  }))
  const derivedRuntimeErrorSuites = suites.filter(
    (s) => s.status === 'failed' && s.assertionResults.length === 0,
  ).length
  return {
    reporterFieldsPresent: missing.length === 0,
    missingReporterFields: missing,
    numTotalTests: json.numTotalTests,
    numPassedTests: json.numPassedTests,
    numFailedTests: json.numFailedTests,
    numPendingTests: json.numPendingTests,
    success: json.success,
    suites,
    numRuntimeErrorTestSuites: {
      presentInReporter: json.numRuntimeErrorTestSuites !== undefined,
      valueFromReporter: json.numRuntimeErrorTestSuites ?? null,
      derivedFromSuiteStatuses: derivedRuntimeErrorSuites,
    },
  }
}

function identitySet(d) {
  const rows = []
  for (const s of d.suites) {
    for (const a of s.assertionResults) rows.push(`${s.name} :: ${a.fullName} :: ${a.status}`)
  }
  return rows.sort()
}

function runPhase(label) {
  const argv = [
    'pnpm',
    '--filter',
    '@type-pal/game',
    'exec',
    'vitest',
    'run',
    testArg,
    '--reporter=json',
  ]
  const res = spawnSync(argv[0], argv.slice(1), {
    cwd: repoRoot,
    encoding: 'buffer',
    timeout: 300000,
  })
  const stdout = trimEof(res.stdout ? res.stdout.toString('utf8') : '')
  const stderr = trimEof(res.stderr ? res.stderr.toString('utf8') : '')
  const stdoutPath = join(logDir, `${label}.stdout.log`)
  const stderrPath = join(logDir, `${label}.stderr.log`)
  writeFileSync(stdoutPath, stdout, 'utf8')
  writeFileSync(stderrPath, stderr, 'utf8')
  const parsed = parseReporter(stdout)
  const d = parsed.parsed ? digest(parsed.json) : null
  const identity = d ? identitySet(d) : []
  return {
    command: argv,
    cwd: repoRoot,
    stdout: {
      bytes: Buffer.byteLength(stdout, 'utf8'),
      sha256: sha256(Buffer.from(stdout, 'utf8')),
      path: stdoutPath,
    },
    stderr: {
      bytes: Buffer.byteLength(stderr, 'utf8'),
      sha256: sha256(Buffer.from(stderr, 'utf8')),
      path: stderrPath,
    },
    exitCode: res.status,
    signal: res.signal,
    spawnError: res.error ? String(res.error) : null,
    spawnTimedOut: res.error?.code === 'ETIMEDOUT',
    jsonSummary: d && {
      reporterFieldsPresent: d.reporterFieldsPresent,
      missingReporterFields: d.missingReporterFields,
      numTotalTests: d.numTotalTests,
      numPassedTests: d.numPassedTests,
      numFailedTests: d.numFailedTests,
      numPendingTests: d.numPendingTests,
      success: d.success,
      suiteStatuses: d.suites.map((s) => ({
        name: s.name,
        status: s.status,
        assertions: s.assertionResults.length,
      })),
      numRuntimeErrorTestSuites: d.numRuntimeErrorTestSuites,
    },
    identitySet: identity,
    identitySha: identity.length > 0 ? sha256(Buffer.from(identity.join('\n'), 'utf8')) : null,
    failedFullNames: d
      ? d.suites.flatMap((s) =>
          s.assertionResults.filter((a) => a.status === 'failed').map((a) => a.fullName),
        )
      : [],
    failedAssertionMessages: d
      ? d.suites.flatMap((s) =>
          s.assertionResults
            .filter((a) => a.status === 'failed')
            .map((a) => ({ fullName: a.fullName, messages: a.failureMessages })),
        )
      : [],
    parseError: parsed.parsed ? null : parsed.reason,
  }
}

const envSnapshot = { ...process.env }
const originalBytesByFile = new Map()
for (const p of points) {
  if (!originalBytesByFile.has(p.file)) {
    originalBytesByFile.set(p.file, readFileSync(join(repoRoot, p.file)))
  }
}

const results = []
let allValid = true

for (const p of points) {
  const targetPath = join(repoRoot, p.file)
  const originalBytes = originalBytesByFile.get(p.file)
  const originalSha = sha256(originalBytes)
  const src = originalBytes.toString('utf8')
  const count = src.split(p.find).length - 1
  if (count !== 1) {
    results.push({
      id: p.id,
      file: p.file,
      valid: false,
      invalidReasons: [`find-string-count=${count} (须恰好 1)`],
    })
    allValid = false
    continue
  }

  const original = runPhase(`${p.id}-original`)
  writeFileSync(targetPath, src.replace(p.find, p.replaceWith), 'utf8')
  const mutatedSha = sha256(readFileSync(targetPath))
  const mutated = runPhase(`${p.id}-mutated`)
  writeFileSync(targetPath, originalBytes)
  const restoredSha = sha256(readFileSync(targetPath))
  const restored = runPhase(`${p.id}-restored`)

  const reasons = []
  if (!original.jsonSummary?.reporterFieldsPresent) reasons.push('original-missing-reporter-field')
  if (original.parseError) reasons.push(`original-json-unparsable:${original.parseError}`)
  if (!mutated.parseError && !mutated.jsonSummary?.reporterFieldsPresent)
    reasons.push('red-missing-reporter-field')
  if (mutated.parseError) reasons.push(`red-json-unparsable:${mutated.parseError}`)
  if (restored.parseError) reasons.push(`restored-json-unparsable:${restored.parseError}`)
  if (
    original.jsonSummary &&
    !(
      original.jsonSummary.success &&
      original.jsonSummary.numFailedTests === 0 &&
      original.jsonSummary.numPendingTests === 0 &&
      original.jsonSummary.numTotalTests > 0
    )
  )
    reasons.push('original-not-green')
  if (
    mutated.jsonSummary &&
    !(mutated.jsonSummary.success === false && mutated.jsonSummary.numFailedTests > 0)
  )
    reasons.push('red-not-red')
  if (mutated.jsonSummary?.numPendingTests > 0) reasons.push('red-pending>0')
  if ((mutated.jsonSummary?.numRuntimeErrorTestSuites.derivedFromSuiteStatuses ?? 0) > 0)
    reasons.push('red-runtime-error')
  if (mutated.jsonSummary && mutated.failedFullNames.length === 0)
    reasons.push('red-no-failed-test')
  // 精确命中:failed 恰 1 且为目标合同
  if (mutated.jsonSummary && mutated.jsonSummary.numFailedTests !== 1)
    reasons.push(`red-not-single-target:failed=${mutated.jsonSummary.numFailedTests}`)
  if (
    mutated.failedFullNames.length > 0 &&
    !mutated.failedFullNames.some((f) => f.includes(p.targetIt))
  )
    reasons.push('red-missed-target-it')
  if (
    mutated.failedAssertionMessages.length > 0 &&
    !mutated.failedAssertionMessages.some((f) =>
      f.messages.some((m) => m.includes('AssertionError')),
    )
  )
    reasons.push('red-no-business-assertion')
  if (
    restored.jsonSummary &&
    !(
      restored.jsonSummary.success &&
      restored.jsonSummary.numFailedTests === 0 &&
      restored.jsonSummary.numPendingTests === 0
    )
  )
    reasons.push('restored-not-green')
  if (restoredSha !== originalSha) reasons.push('restore-sha-mismatch')
  if (original.identitySet.length === 0 || restored.identitySet.length === 0)
    reasons.push('empty-identity-set')
  if (
    mutated.failedFullNames.length > 0 &&
    !mutated.failedFullNames.every((f) =>
      mutated.identitySet.some((row) => row.includes(f) && row.endsWith(':: failed')),
    )
  )
    reasons.push('red-identity-set-missing-failed')
  if (JSON.stringify(original.identitySet) !== JSON.stringify(restored.identitySet))
    reasons.push('green-identity-drift')
  if (original.identitySha !== restored.identitySha) reasons.push('green-identitysha-drift')

  const valid = reasons.length === 0
  if (!valid) allValid = false
  results.push({
    id: p.id,
    file: p.file,
    sourceAnchor: p.sourceAnchor,
    targetIt: p.targetIt,
    intent: p.intent,
    find: p.find,
    replaceWith: p.replaceWith,
    targetShaOriginal: originalSha,
    mutatedSha,
    targetShaRestored: restoredSha,
    verdict: valid ? 'VALID' : 'INVALID',
    red: {
      exitCode: mutated.exitCode,
      failedTotal: mutated.jsonSummary?.numFailedTests ?? null,
      failedFullNames: mutated.failedFullNames,
      firstBusinessAssertion:
        mutated.failedAssertionMessages[0]?.messages
          .find((m) => m.includes('AssertionError'))
          ?.split('\n')
          .slice(0, 2)
          .join('\n') ?? null,
    },
    restoredGreen: {
      exitCode: restored.exitCode,
      tests: restored.jsonSummary?.numTotalTests ?? null,
    },
    identitySha: {
      original: original.identitySha,
      red: mutated.identitySha,
      restored: restored.identitySha,
    },
    executions: { original, mutated, restored },
    valid,
    invalidReasons: reasons,
  })
}

const cleanupFiles = [...originalBytesByFile.entries()].map(([file, bytes]) => {
  const after = sha256(readFileSync(join(repoRoot, file)))
  return { file, restored: after === sha256(bytes), shaAfter: after }
})
const report = {
  card: cfg.card,
  generatedAt: new Date().toISOString(),
  testFile: cfg.testFile,
  mutationPointsFile: 'mutation-points.json',
  filesTouched: [...originalBytesByFile.keys()],
  cleanupProof: {
    allFilesRestoredToOriginal: cleanupFiles.every((f) => f.restored),
    files: cleanupFiles,
    logsWritten: results.filter((r) => r.executions).length * 3 * 2,
  },
  envSnapshot,
  summary: {
    points: results.length,
    valid: results.filter((r) => r.valid).length,
    allValid,
  },
  results,
}
writeFileSync(join(here, 'mutation-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(
  `mutation-results.json: ${report.summary.valid}/${report.summary.points} VALID, allFilesRestored=${report.cleanupProof.allFilesRestoredToOriginal}`,
)
process.exitCode = allValid ? 0 : 1
