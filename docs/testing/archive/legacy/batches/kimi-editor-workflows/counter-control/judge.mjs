/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 反控唯一正式判据（run.mjs 与 selftest.mjs 共用同一函数，
 * 不允许在别处另写等价谓词）。输入是一次注入（或控制）运行的全部一手事实，
 * 输出 invalid 原因列表；空列表 = valid。
 *
 * @typedef {Object} JudgeInjectionItem
 * @property {string} label
 * @property {boolean} [control]
 * @property {readonly string[]} tests
 * @property {readonly string[]} [expectFailed]
 *
 * @typedef {Object} JudgeReportAssertion
 * @property {string} fullName
 * @property {string} status
 * @property {string[]} failureMessages
 *
 * @typedef {Object} JudgeReportFile
 * @property {string} name
 * @property {JudgeReportAssertion[]} assertionResults
 *
 * @typedef {Object} JudgeReport
 * @property {number} numTotalTests
 * @property {number} numPendingTests
 * @property {number} numTodoTests
 * @property {JudgeReportFile[]} testResults
 *
 * @typedef {Object} JudgeInput
 * @property {JudgeInjectionItem} item
 * @property {readonly string[]} expectedTestFiles 期望失败的 fullName 所属测试文件（绝对路径集合）。
 * @property {number | null} exitCode
 * @property {string | null} signal
 * @property {string} [spawnError]
 * @property {string} stdout
 * @property {JudgeReport | null} report
 * @property {number} [controlExecuted] 同文件集控制针的实际执行数；无控制基线时跳过比对。
 * @property {boolean} mutationHitExpected 注入针要求 MUTATION_HIT 见证；控制针要求无该见证。
 * @property {boolean} productHashChanged
 * @property {number} findOccurrences
 */

const ERROR_NAME_PATTERN =
  /\b(?:TypeError|ReferenceError|SyntaxError|RangeError|EvalError|URIError|AggregateError|TestTimeoutError)\b/
const TIMEOUT_PATTERN = /\b(?:timed out|timeout|TestTimeoutError)\b/i

/**
 * 唯一正式判据：返回 invalid 原因；空数组 = valid（控制绿/注入红）。
 * @param {JudgeInput} input
 * @returns {string[]}
 */
export function judgeRun(input) {
  const reasons = []
  const { item } = input

  if (input.findOccurrences !== 1 && !item.control)
    reasons.push(`invalid:find-occurrences=${input.findOccurrences}`)
  if (input.spawnError) reasons.push(`invalid:spawn=${input.spawnError}`)
  if (input.signal) reasons.push(`invalid:signal=${input.signal}`)

  const expectedExit = item.control ? 0 : 1
  if (input.exitCode !== expectedExit) reasons.push(`invalid:exit=${String(input.exitCode)}`)

  if (input.mutationHitExpected && !input.stdout.includes(`MUTATION_HIT ${item.label}`))
    reasons.push('invalid:mutation-not-loaded')
  if (!input.mutationHitExpected && input.stdout.includes('MUTATION_HIT'))
    reasons.push('invalid:control-loaded-mutation')
  if (input.productHashChanged) reasons.push('invalid:product-hash-changed')

  const { report } = input
  if (!report) {
    reasons.push('invalid:no-json-report')
    return reasons
  }

  // skip/pending/todo/未运行一律 invalid（全运行口径）。
  if (report.numPendingTests !== 0 || report.numTodoTests !== 0)
    reasons.push(`invalid:pending=${report.numPendingTests}+todo=${report.numTodoTests}`)

  const allAssertions = report.testResults.flatMap((file) =>
    file.assertionResults.map((assertion) => ({ file: file.name, ...assertion })),
  )
  const skippedAssertions = allAssertions.filter(
    (assertion) => assertion.status !== 'failed' && assertion.status !== 'passed',
  )
  if (skippedAssertions.length)
    reasons.push(
      `invalid:skipped-status=${skippedAssertions.map((assertion) => assertion.status).join(',')}`,
    )

  const failed = allAssertions.filter((assertion) => assertion.status === 'failed')

  if (item.control) {
    if (failed.length)
      reasons.push(`invalid:control-red=${failed.map((assertion) => assertion.fullName).join('|')}`)
  } else {
    // 失败记录必须落在声明的测试文件（绝对路径绑定）。
    const allowedFiles = new Set(input.expectedTestFiles)
    const wrongFile = failed.filter((assertion) => !allowedFiles.has(assertion.file))
    if (wrongFile.length)
      reasons.push(
        `invalid:failure-file=${wrongFile.map((assertion) => `${assertion.file}#${assertion.fullName}`).join('|')}`,
      )

    const expectedSet = [...(item.expectFailed ?? [])].sort()
    const actualSet = failed.map((assertion) => assertion.fullName).sort()
    if (JSON.stringify(actualSet) !== JSON.stringify(expectedSet))
      reasons.push(`invalid:failed-set=${actualSet.join('|') || '(empty)'}`)

    for (const assertion of failed) {
      if (assertion.failureMessages.length === 0) {
        reasons.push(`invalid:no-failure-message@${assertion.fullName}`)
        continue
      }
      for (const message of assertion.failureMessages) {
        // 只扫描首行：堆栈帧必含 vitest 定时器（Timeout.checkCallback/listOnTimeout），
        // 全串扫描会把正常 AssertionError 误判为超时。
        const firstLine = message.split('\n', 1)[0] ?? ''
        if (!firstLine.startsWith('AssertionError'))
          reasons.push(`invalid:non-assertion-failure@${assertion.fullName}`)
        if (TIMEOUT_PATTERN.test(firstLine)) reasons.push(`invalid:timeout@${assertion.fullName}`)
        if (ERROR_NAME_PATTERN.test(firstLine))
          reasons.push(`invalid:mixed-error@${assertion.fullName}`)
      }
    }
  }

  if (input.controlExecuted !== undefined && report.numTotalTests !== input.controlExecuted)
    reasons.push(`invalid:executed=${report.numTotalTests}!=control=${input.controlExecuted}`)

  return reasons
}
