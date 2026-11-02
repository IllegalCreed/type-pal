/**
 * TEST-GLM-GAME-EVENT-CONTRACTS-1 三态反控 runner。
 *
 * 每注入点 3 相位(原始绿 / 变异红 / 恢复绿),同一 vitest 命令 spawnSync 执行;完整保留
 * argv/cwd/env 快照/stdout/stderr(规整后全文落盘 + bytes/sha256 按落盘字节)/exitCode/
 * signal/spawnError/JSON 摘要/逐套件 status/全量 identitySet(file×fullName×status)。
 *
 * 判据(任一命中即 INVALID):
 *  - reporter 必需字段(numTotalTests/numPassedTests/numFailedTests/numPendingTests/
 *    success/testResults)缺失 → missing-reporter-field(不做静默兜底)。
 *  - 零执行(numTotalTests===0)/ red-json-unparsable / red-pending>0 /
 *    red-runtime-error(套件 failed 且零断言)>0 / red-no-business-assertion(存在失败
 *    用例但其 failureMessages 无 AssertionError)/ original-not-green / restored-not-green /
 *    restore-sha-mismatch。
 *  - identitySet:空集合 INVALID;红相位必须覆盖全部 failed fullName;绿前/绿后零漂移。
 *
 * 落盘纪律(r6/r7 判例):stdout/stderr trimEof 去尾空白 + 恰好一个换行;bytes/sha256 按
 * 规整后落盘字节;mutation-results.json 末尾恰好一个换行。
 */

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..', '..', '..')
const points = JSON.parse(readFileSync(join(here, 'mutation-points.json'), 'utf8')).points
const cfg = JSON.parse(readFileSync(join(here, 'mutation-points.json'), 'utf8'))
const targetRel = cfg.targetFile
const testRel = cfg.testFile
/** vitest cwd = packages/game,测试路径须相对包目录(repo 相对路径仅作记录)。 */
const testArg = 'src/core/event-system.glm-event-contracts.test.ts'
const targetPath = join(repoRoot, targetRel)
const logDir = join(here, 'mutation-logs')

const sha256 = (buf) => `sha256:${createHash('sha256').update(buf).digest('hex')}`

/** trimEof:去尾部空白,保留恰好一个换行终止符(r6 判例)。 */
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
  // vitest 4.1.7 JSON reporter 无 numRuntimeErrorTestSuites 字段(实测 MISSING,不兜底);
  // 推导:status==='failed' 且零断言结果的套件数。
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
    identitySet: d ? identitySet(d) : [],
    failedFullNames: d
      ? d.suites.flatMap((s) =>
          s.assertionResults
            .filter((a) => a.status === 'failed')
            .map((a) => `${s.name} :: ${a.fullName}`),
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

const originalBytes = readFileSync(targetPath)
const originalSha = sha256(originalBytes)
const envSnapshot = { ...process.env }
const results = []
let allValid = true

for (const p of points) {
  const src = readFileSync(targetPath, 'utf8')
  const count = src.split(p.find).length - 1
  if (count !== 1) {
    results.push({
      id: p.id,
      valid: false,
      invalidReasons: [`find-string-count=${count} (须恰好 1)`],
    })
    allValid = false
    continue
  }

  const original = runPhase(`${p.id}-original`)
  const mutatedSrc = src.replace(p.find, p.replaceWith)
  writeFileSync(targetPath, mutatedSrc, 'utf8')
  const mutated = runPhase(`${p.id}-mutated`)
  writeFileSync(targetPath, originalBytes)
  const restoredBytes = readFileSync(targetPath)
  const restoredSha = sha256(restoredBytes)
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
    !mutated.failedFullNames.every((f) => mutated.identitySet.includes(`${f} :: failed`))
  )
    reasons.push('red-identity-set-missing-failed')
  if (
    original.identitySet.length > 0 &&
    restored.identitySet.length > 0 &&
    JSON.stringify(original.identitySet) !== JSON.stringify(restored.identitySet)
  )
    reasons.push('green-identity-drift')

  const valid = reasons.length === 0
  if (!valid) allValid = false
  results.push({
    id: p.id,
    line: p.line,
    intent: p.intent,
    carrier: p.carrier,
    find: p.find,
    replaceWith: p.replaceWith,
    targetShaOriginal: originalSha,
    targetShaRestored: restoredSha,
    executions: { original, mutated, restored },
    redFailedFullNames: mutated.failedFullNames,
    redFailedAssertionExcerpts: mutated.failedAssertionMessages.map((f) => ({
      fullName: f.fullName,
      firstMessage: f.messages[0]?.split('\n')[0] ?? null,
    })),
    valid,
    invalidReasons: reasons,
  })
}

const finalBytes = readFileSync(targetPath)
const report = {
  card: 'TEST-GLM-GAME-EVENT-CONTRACTS-1',
  generatedAt: new Date().toISOString(),
  targetFile: targetRel,
  testFile: testRel,
  targetShaBefore: originalSha,
  targetShaAfter: sha256(finalBytes),
  cleanupProof: {
    targetRestoredToOriginal: sha256(finalBytes) === originalSha,
    logsWritten: results.length * 3 * 2,
  },
  envSnapshot,
  summary: { points: results.length, valid: results.filter((r) => r.valid).length, allValid },
  results,
}
writeFileSync(join(here, 'mutation-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(
  `mutation-results.json: ${report.summary.valid}/${report.summary.points} VALID, cleanupRestored=${report.cleanupProof.targetRestoredToOriginal}`,
)
process.exitCode = allValid ? 0 : 1
