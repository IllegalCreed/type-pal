#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
/**
 * TEST-COVERAGE85-GLM-GAME-1 三态反控 runner(r1 返工版):
 *   原始(绿) → 变异产品源(定向测试必须红,业务 AssertionError) → 恢复(绿)。
 *
 * 返工要求:每次执行保留完整 command(argv)、cwd、env、stdout、stderr、exit code、
 * signal、spawn error 与解析出的 vitest JSON 摘要;**任何必需 JSON 字段缺失即判 INVALID**
 * (不做 ?? 0 兜底)。stdout/stderr 全文写入 mutation-logs/(JSON 内存 sha256+bytes+路径)。
 * 拒收判据:零执行(exit 0 且 success)、collection/runtime error、pending/skip、
 * 非业务断言失败、恢复后 sha 不一致。
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = '/Users/zhangxu/illegal/type-pal-cov85-game/packages/game'
const VITEST = '/Users/zhangxu/illegal/type-pal-cov85-game/node_modules/.bin/vitest'
const LOG_DIR = resolve(HERE, 'mutation-logs')
mkdirSync(LOG_DIR, { recursive: true })

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

/** 每个注入点跑前固定 env 快照(全量保留,证明执行环境)。 */
const ENV_SNAPSHOT = { ...process.env }

/**
 * reporter 必需字段(vitest 4.1.7 JSON 实测提供;缺任一 → 证据 INVALID,不兜底)。
 * 注意:vitest 4.1.7 JSON reporter **不输出** jest 的 numRuntimeErrorTestSuites ——
 * 该项不进 required 集(否则全部恒 INVALID),改为 presentInReporter:false +
 * 从 testResults[].status 显式推导(suite failed 且无 assertionResults = runtime/collection
 * error),推导公式与逐套件 status 全量落盘,不用 ?? 0 掩盖。
 */
const REQUIRED_JSON_FIELDS = [
  'numTotalTests',
  'numPassedTests',
  'numFailedTests',
  'numPendingTests',
  'success',
  'testResults',
]

const parseVitestJson = (stdout) => {
  const start = stdout.indexOf('{"numTotalTestSuites"')
  if (start < 0) return { parsed: false, missingFields: REQUIRED_JSON_FIELDS, json: null }
  let depth = 0
  for (let i = start; i < stdout.length; i++) {
    if (stdout[i] === '{') depth++
    else if (stdout[i] === '}') {
      depth--
      if (depth === 0) {
        try {
          const json = JSON.parse(stdout.slice(start, i + 1))
          const missingFields = REQUIRED_JSON_FIELDS.filter((f) => json[f] === undefined)
          return { parsed: true, missingFields, json }
        } catch {
          return { parsed: false, missingFields: REQUIRED_JSON_FIELDS, json: null }
        }
      }
    }
  }
  return { parsed: false, missingFields: REQUIRED_JSON_FIELDS, json: null }
}

const runOnce = (id, phase, testFile) => {
  const argv = [VITEST, 'run', testFile, '--reporter=json', '--reporter=default']
  const proc = spawnSync(argv[0], argv.slice(1), {
    cwd: ROOT,
    env: { ...ENV_SNAPSHOT },
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  })
  const stdoutFile = resolve(LOG_DIR, `${id}.${phase}.stdout.txt`)
  const stderrFile = resolve(LOG_DIR, `${id}.${phase}.stderr.txt`)
  writeFileSync(stdoutFile, proc.stdout ?? '')
  writeFileSync(stderrFile, proc.stderr ?? '')
  const { parsed, missingFields, json } = parseVitestJson(proc.stdout ?? '')
  const suiteStatuses = (json?.testResults ?? []).map((tr) => ({
    file: tr.name,
    status: tr.status,
    assertionCount: (tr.assertionResults ?? []).length,
  }))
  // 推导 runtime/collection error 套件:status==='failed' 且零断言结果(测试体没跑成)
  const derivedRuntimeErrorSuites = (json?.testResults ?? []).filter(
    (tr) => tr.status === 'failed' && (tr.assertionResults ?? []).length === 0,
  ).length
  const failed = []
  // 窄返工#1:每次执行保留**完整** file×fullName×status 身份集合(含绿色相位,不只失败项)
  const tests = []
  for (const tr of json?.testResults ?? []) {
    const file = tr.name.replace(`${ROOT}/`, '')
    for (const a of tr.assertionResults ?? []) {
      tests.push({ file, fullName: a.fullName, status: a.status })
      if (a.status === 'failed') {
        failed.push({
          fullName: a.fullName,
          file: tr.name,
          message: (a.failureMessages ?? [])[0] ?? '',
        })
      }
    }
  }
  return {
    command: argv,
    cwd: ROOT,
    env: '<ENV_SNAPSHOT>', // 完整 env 快照见 results 顶层 envSnapshot(单例,全部执行共用同一份)
    exitCode: proc.status,
    signal: proc.signal,
    spawnError: proc.error ? { name: proc.error.name, message: proc.error.message } : null,
    spawnTimedOut: proc.error?.code === 'ETIMEDOUT',
    stdout: {
      file: stdoutFile,
      bytes: (proc.stdout ?? '').length,
      sha256: sha256(proc.stdout ?? ''),
    },
    stderr: {
      file: stderrFile,
      bytes: (proc.stderr ?? '').length,
      sha256: sha256(proc.stderr ?? ''),
    },
    vitestJson: {
      parsed,
      missingFields,
      summary: parsed
        ? {
            numTotalTests: json.numTotalTests,
            numPassedTests: json.numPassedTests,
            numFailedTests: json.numFailedTests,
            numPendingTests: json.numPendingTests,
            success: json.success,
            numRuntimeErrorTestSuites: {
              presentInReporter: json.numRuntimeErrorTestSuites !== undefined,
              valueFromReporter:
                json.numRuntimeErrorTestSuites === undefined
                  ? null
                  : json.numRuntimeErrorTestSuites,
              derivedFromSuiteStatuses: derivedRuntimeErrorSuites,
            },
          }
        : null,
      suiteStatuses,
      identitySet: tests, // 全量 file×fullName×status(绿/红相位都在)
      failedTests: failed,
    },
  }
}

const MUTATIONS = JSON.parse(readFileSync(resolve(HERE, 'mutation-points.json'), 'utf8'))

const results = []
for (const m of MUTATIONS) {
  const file = `${ROOT}/${m.file}`
  const original = readFileSync(file, 'utf8')
  const shaOriginal = sha256(original)
  const problems = []
  if (!original.includes(m.find)) {
    results.push({ ...m, status: 'INVALID', reason: 'anchor not found in source' })
    continue
  }

  const greenBefore = runOnce(m.id, 'green-original', m.testFile)
  const greenBeforeOk =
    greenBefore.exitCode === 0 &&
    greenBefore.vitestJson.parsed &&
    greenBefore.vitestJson.missingFields.length === 0 &&
    greenBefore.vitestJson.summary.success === true
  if (!greenBeforeOk) problems.push('original-not-green-or-json-incomplete')

  writeFileSync(file, original.replace(m.find, m.replace))
  const shaMutated = sha256(readFileSync(file, 'utf8'))
  const red = runOnce(m.id, 'red-mutated', m.testFile)
  writeFileSync(file, original)
  const shaRestored = sha256(readFileSync(file, 'utf8'))
  const greenAfter = runOnce(m.id, 'green-restored', m.testFile)
  const greenAfterOk =
    greenAfter.exitCode === 0 &&
    greenAfter.vitestJson.parsed &&
    greenAfter.vitestJson.missingFields.length === 0 &&
    greenAfter.vitestJson.summary.success === true

  // 严格判据:任何必需 JSON 字段缺失 → 证据无效(不兜底)
  if (!red.vitestJson.parsed) problems.push('red-json-unparsable')
  if (red.vitestJson.missingFields.length > 0)
    problems.push(`red-json-missing:${red.vitestJson.missingFields.join(',')}`)
  if (red.spawnError) problems.push('red-spawn-error')
  if (red.exitCode === 0) problems.push('red-zero-execution')
  if (red.vitestJson.summary) {
    if (red.vitestJson.summary.numPendingTests !== 0) problems.push('red-pending>0')
    const runtimeErr =
      red.vitestJson.summary.numRuntimeErrorTestSuites.valueFromReporter ??
      red.vitestJson.summary.numRuntimeErrorTestSuites.derivedFromSuiteStatuses
    if (runtimeErr !== 0) problems.push('red-runtime-error')
    if (red.vitestJson.summary.numFailedTests === 0) problems.push('red-no-failed-test')
  }
  const businessFails = red.vitestJson.failedTests.filter((f) =>
    /AssertionError|expected|toBe|toEqual|toMatchObject|Received/.test(f.message),
  )
  if (businessFails.length === 0) problems.push('red-no-business-assertion')
  const redIdentity = red.vitestJson.identitySet
  if (redIdentity.length === 0) problems.push('red-empty-identity-set')
  for (const f of red.vitestJson.failedTests) {
    if (!redIdentity.some((t) => t.fullName === f.fullName && t.status === 'failed'))
      problems.push(`red-identity-missing:${f.fullName.slice(0, 40)}`)
  }
  const greenBeforeIdentity = greenBefore.vitestJson.identitySet
  const greenAfterIdentity = greenAfter.vitestJson.identitySet
  if (greenBeforeIdentity.length === 0 || greenAfterIdentity.length === 0)
    problems.push('green-empty-identity-set')
  if (
    JSON.stringify(greenBeforeIdentity) !== JSON.stringify(greenAfterIdentity) &&
    greenBeforeOk &&
    greenAfterOk
  )
    problems.push('green-identity-drift-before-vs-after')
  if (!greenAfterOk) problems.push('restored-not-green-or-json-incomplete')
  if (shaOriginal !== shaRestored) problems.push('restore-sha-mismatch')

  results.push({
    id: m.id,
    file: m.file,
    line: m.line,
    mutation: `${m.find} => ${m.replace}`,
    shaOriginal,
    shaMutated,
    shaRestored,
    restoredEqualsOriginal: shaOriginal === shaRestored,
    execution: { greenBefore, red, greenAfter },
    red: {
      failedFullNames: red.vitestJson.failedTests.map((f) => f.fullName),
      assertionErrors: businessFails.map((f) => f.message.split('\n').slice(0, 4).join(' | ')),
    },
    status: problems.length === 0 ? 'VALID' : 'INVALID',
    reason: problems.join(';'),
  })
}
writeFileSync(
  resolve(HERE, 'mutation-results.json'),
  JSON.stringify(
    {
      note: '每次执行(原始/变异/恢复)含完整 command/cwd/env引用/stdout/stderr(hash+路径)/JSON 摘要/exit/signal/spawn 与全量 file×fullName×status 身份集合(identitySet)',
      envSnapshot: ENV_SNAPSHOT,
      results,
    },
    null,
    2,
  ),
)
console.log(
  results.map((r) => `${r.id}: ${r.status}${r.reason ? ` (${r.reason})` : ''}`).join('\n'),
)
