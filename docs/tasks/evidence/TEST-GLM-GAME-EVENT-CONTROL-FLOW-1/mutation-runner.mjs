/**
 * TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 三态反控 runner(r2)。
 *
 * r2 返工(Codex 一审:r1 判据误收):进程层门(exit/signal/spawnError/timeout)、
 * 红相位恰一失败且零 pending/skip/todo/runtime、唯一失败 fullName 必须精确命中
 * point.targetContract、红相位执行集与状态同原始相位逐集合核对、恢复相位 identity
 * 与原始完全一致 + 产品源 sha 一致。判据实现与 r1 旧判据都在 mutation-lib.mjs;
 * 合成反例误收证明见 mutation-selftest.mjs / selftest-results.json。
 *
 * 每注入点 3 相位(原始绿 / 变异红 / 恢复绿),同一 vitest 命令 spawnSync 执行;完整保留
 * argv/cwd/env 快照/stdout/stderr(规整后全文落盘 + bytes/sha256 按落盘字节)/exitCode/
 * signal/spawnError/JSON 摘要/逐套件 status/全量 identitySet 与 executionSet。
 *
 * 落盘纪律:stdout/stderr trimEof 去尾空白 + 恰好一个换行;bytes/sha256 按规整后落盘字节;
 * mutation-results.json 末尾恰好一个换行。
 */

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  digest,
  executionSet,
  failedAssertions,
  identitySet,
  parseReporter,
  trimEof,
  validateNeedleR1,
  validateNeedleR2,
} from './mutation-lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..', '..', '..')
const cfg = JSON.parse(readFileSync(join(here, 'mutation-points.json'), 'utf8'))
const points = cfg.points
const targetRel = cfg.targetFile
const targetPath = join(repoRoot, targetRel)
/** vitest cwd = packages/game,测试路径相对包目录(repo 相对路径仅作记录)。 */
const testArg = 'src/core/event-system.glm-event-control-flow.test.ts'
const logDir = join(here, 'mutation-logs')

const sha256 = (buf) => `sha256:${createHash('sha256').update(buf).digest('hex')}`

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
  const detail = parsed.parsed ? digest(parsed.json) : null
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
    detail,
    jsonSummary: detail && {
      reporterFieldsPresent: detail.reporterFieldsPresent,
      missingReporterFields: detail.missingReporterFields,
      numTotalTests: detail.numTotalTests,
      numPassedTests: detail.numPassedTests,
      numFailedTests: detail.numFailedTests,
      numPendingTests: detail.numPendingTests,
      success: detail.success,
      suiteStatuses: detail.suites.map((s) => ({
        name: s.name,
        status: s.status,
        assertions: s.assertionResults.length,
      })),
      numRuntimeErrorTestSuites: detail.numRuntimeErrorTestSuites,
    },
    identitySet: detail ? identitySet(detail) : [],
    executionSet: detail ? executionSet(detail) : [],
    failedAssertions: detail ? failedAssertions(detail) : [],
    failedFullNames: detail
      ? detail.suites.flatMap((s) =>
          s.assertionResults
            .filter((a) => a.status === 'failed')
            .map((a) => `${s.name} :: ${a.fullName}`),
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
  if (!p.targetContract) {
    results.push({
      id: p.id,
      valid: false,
      invalidReasons: ['point-missing-targetContract'],
    })
    allValid = false
    continue
  }
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

  const verdictR2 = validateNeedleR2({
    point: p,
    original,
    mutated,
    restored,
    targetShaOriginal: originalSha,
    targetShaRestored: restoredSha,
  })
  // r1 旧判据只作并排记录(误收对照),不再作为门。
  const verdictR1 = validateNeedleR1({
    original,
    mutated,
    restored,
    targetShaOriginal: originalSha,
    targetShaRestored: restoredSha,
  })
  if (!verdictR2.valid) allValid = false

  results.push({
    id: p.id,
    line: p.line,
    targetContract: p.targetContract,
    intent: p.intent,
    carrier: p.carrier,
    find: p.find,
    replaceWith: p.replaceWith,
    targetShaOriginal: originalSha,
    targetShaRestored: restoredSha,
    executions: { original, mutated, restored },
    redFailedAssertions: mutated.failedAssertions.map((f) => ({
      file: f.file,
      fullName: f.fullName,
      firstMessage: f.failureMessages[0]?.split('\n')[0] ?? null,
    })),
    verdictR2,
    verdictR1RecordedForComparison: verdictR1,
    valid: verdictR2.valid,
    invalidReasons: verdictR2.invalidReasons,
  })
}

const finalBytes = readFileSync(targetPath)
const report = {
  card: 'TEST-GLM-GAME-EVENT-CONTROL-FLOW-1',
  criteriaRevision: 'r2 (Codex 一审返工;判据库 mutation-lib.mjs,自测 mutation-selftest.mjs)',
  generatedAt: new Date().toISOString(),
  targetFile: targetRel,
  testFile: cfg.testFile,
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
  `mutation-results.json: ${report.summary.valid}/${report.summary.points} VALID (r2 criteria), cleanupRestored=${report.cleanupProof.targetRestoredToOriginal}`,
)
process.exitCode = allValid ? 0 : 1
