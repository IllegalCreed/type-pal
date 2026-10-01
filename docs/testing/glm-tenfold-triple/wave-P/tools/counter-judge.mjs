/**
 * Wave-P 反控判据（可单测）。
 *
 * 严格单目标业务红判定（r2 P-R2-01）：
 * - mutated 恰有一条 failed；其 file 必须等于 --test 指向的测试文件，
 *   fullName 必须逐字等于命令行登记的目标 fullName。
 * - 拒收：零红、多红、错目标、todo/skipped、collection/环境错误、超时、
 *   未处理异常（Unhandled Error/SerializationError 等 harness 红）、JSON 缺失。
 * - Vitest rejects 断言红的首行可能是 `Error: promise resolved ...`（其真实
 *   构造来自 AssertionError），保留原文并按 assertionLike 放行，不因前缀改写。
 * - positive 与 restored 必须 exit=0、零 failed，且执行 fullName 集合与
 *   mutated 的执行集合完全一致（不过滤邻居、不少跑）。
 */

const HARNESS_RED =
  /(Test timed out|Skeleton|Skipped|todo|Cannot find module|SyntaxError|Transform failed|Unhandled Error|SerializationError|Vitest caught|No test files found|ENOTFOUND|ECONNREFUSED|navigation to another Document)/i

/**
 * @param {{
 *   exitCode: number,
 *   json: object|null,
 *   targetFile: string,
 *   targetFullName: string,
 *   positiveExecuted: number,
 * }} run 变异相实跑产物
 * @returns {{ valid: boolean, reasons: string[], target: {fullName:string,message:string,file:string}|null, failed: Array, executed: number }}
 */
export function judgeMutant({ exitCode, json, targetFile, targetFullName, positiveExecuted }) {
  const reasons = []
  if (!json) reasons.push('no-json')
  const executedFiles = json?.testResults ?? []
  const tests = executedFiles.flatMap((f) =>
    (f.assertionResults ?? []).map((a) => ({
      ...a,
      file: f.name.replace(/^.*packages\/editor\//, ''),
    })),
  )
  const executed = tests.length
  const failed = tests.filter((t) => t.status === 'failed')
  const skipped = tests.filter((t) => t.status === 'skipped' || t.status === 'todo')
  const first = failed[0] ?? null
  const target =
    first === null
      ? null
      : {
          fullName: first.fullName,
          message: first.failureMessages?.[0]?.split('\n')[0] ?? '',
          file: first.file,
        }
  if (executed === 0) reasons.push('zero-executed')
  if (exitCode === 0) reasons.push('mutated-exit-0')
  if (failed.length === 0) reasons.push('no-failed')
  if (failed.length > 1) reasons.push(`multi-failed:${failed.length}`)
  if (skipped.length > 0) reasons.push(`skipped-or-todo:${skipped.length}`)
  if (typeof positiveExecuted === 'number' && executed !== positiveExecuted)
    reasons.push(`executed-set-changed:${executed}!==${positiveExecuted}`)
  if (first !== null) {
    if (target.file !== targetFile) reasons.push(`wrong-file:${target.file}`)
    if (target.fullName !== targetFullName) reasons.push('wrong-fullName')
    const message = target.message
    if (HARNESS_RED.test(message)) reasons.push('harness-red')
    const assertionLike =
      /^(AssertionError|expect\(|Error: promise resolved)/i.test(message) ||
      message.includes('AssertionError')
    if (!assertionLike) reasons.push('not-assertion-red')
  }
  return { valid: reasons.length === 0, reasons, target, failed, executed }
}

/**
 * 正控/恢复相判定：exit=0、零 failed/skipped、执行数与变异相一致。
 */
export function judgeClean({ exitCode, json, expectedExecuted, label }) {
  const reasons = []
  if (!json) reasons.push(`${label}:no-json`)
  const tests = (json?.testResults ?? []).flatMap((f) => f.assertionResults ?? [])
  const failed = tests.filter((t) => t.status === 'failed')
  const skipped = tests.filter((t) => t.status === 'skipped' || t.status === 'todo')
  if (exitCode !== 0) reasons.push(`${label}:exit-${exitCode}`)
  if (failed.length > 0) reasons.push(`${label}:failed-${failed.length}`)
  if (skipped.length > 0) reasons.push(`${label}:skipped-${skipped.length}`)
  if (typeof expectedExecuted === 'number' && tests.length !== expectedExecuted)
    reasons.push(`${label}:executed-${tests.length}!==${expectedExecuted}`)
  return { valid: reasons.length === 0, reasons, executed: tests.length }
}
