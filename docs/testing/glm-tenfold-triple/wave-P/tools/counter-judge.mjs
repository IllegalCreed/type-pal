/**
 * Wave-P 反控判据（可单测；r3.5 预审 P-R2-01 收紧版）。
 *
 * 严格唯一判定：
 * - 每条叶子测试逐条核对状态：clean 相必须全部 'passed'；mutant 相只允许
 *   'passed'|'failed'（pending/todo/skipped 一律拒收）。
 * - 完整 file×fullName 多重执行身份集合比较（同数量不同身份 → 拒收）。
 * - 顶层与 suite 级收集/运行错误：numRuntimeErrorTestSuites 计数、status=failed
 *   且 assertionResults 为空的 suite、suite.message 收集错误、未处理异常/raw
 *   harness 错误文本。numFailedTestSuites 是 vitest 的聚合口径（含套件聚合层，
 *   与叶子失败数不等属正常），不作为独立判据。
 * - signal/spawn 失败与正常退出分开：spawnError/signal 任一存在即拒收。
 * - Vitest rejects 断言红的首行可能是 `Error: promise resolved ...`（真实构造
 *   来自 AssertionError），保留原文并按 assertionLike 放行，不因前缀一刀拒收。
 */

const HARNESS_RED =
  /(Test timed out|Skeleton|Skipped|todo|Cannot find module|SyntaxError|Transform failed|Unhandled Error|SerializationError|Vitest caught|No test files found|ENOTFOUND|ECONNREFUSED|navigation to another Document)/i

const leavesOf = (json) => {
  const files = json?.testResults ?? []
  return files.flatMap((f) =>
    (f.assertionResults ?? []).map((a) => ({
      fullName: a.fullName,
      status: a.status,
      message: a.failureMessages?.[0]?.split('\n')[0] ?? '',
      file: f.name.replace(/^.*packages\/editor\//, ''),
    })),
  )
}

/** suite 级收集/运行错误：failed suite 且无叶子断言，或顶层 runtime 错误计数。 */
export function collectionErrors(json) {
  const errors = []
  for (const f of json?.testResults ?? []) {
    const leafCount = (f.assertionResults ?? []).length
    if (f.status === 'failed' && leafCount === 0)
      errors.push(
        `suite-collection-error:${f.name.replace(/^.*packages\/editor\//, '')}:${String(f.message ?? '').slice(0, 80)}`,
      )
    else if (typeof f.message === 'string' && f.message && HARNESS_RED.test(f.message))
      errors.push(`suite-message-harness-red:${f.name.replace(/^.*packages\/editor\//, '')}`)
  }
  if ((json?.numRuntimeErrorTestSuites ?? 0) > 0) errors.push('runtime-error-suites')
  return errors
}

const identitySetOf = (tests) => tests.map((t) => `${t.file}×${t.fullName}`).sort()

function commonChecks({ json, spawnError, signal, label }) {
  const reasons = []
  if (spawnError) reasons.push(`${label}:spawn-error`)
  if (signal) reasons.push(`${label}:signal-${signal}`)
  if (!json) reasons.push(`${label}:no-json`)
  const tests = json ? leavesOf(json) : []
  if (tests.length === 0) reasons.push(`${label}:zero-executed`)
  const collection = json ? collectionErrors(json) : []
  reasons.push(...collection.map((x) => `${label}:${x}`))
  for (const t of tests)
    if (t.status !== 'passed' && t.status !== 'failed')
      reasons.push(`${label}:non-passfail-status:${t.status}`)
  return { reasons, tests }
}

/**
 * 清洁相（positive/restored）：exit=0 且无 signal/spawn、每条叶子 passed、
 * 无收集/运行错误、零执行拒收、执行数一致、file×fullName 身份集合与
 * expectedIdentitySet（一般取 positive 的集合）完全一致。
 */
export function judgeClean({
  exitCode,
  json,
  expectedExecuted,
  expectedIdentitySet,
  label = 'clean',
  spawnError,
  signal,
}) {
  const { reasons, tests } = commonChecks({ exitCode, json, spawnError, signal, label })
  if (exitCode !== 0) reasons.push(`${label}:exit-${exitCode}`)
  const failed = tests.filter((t) => t.status === 'failed')
  if (failed.length > 0) reasons.push(`${label}:failed-${failed.length}`)
  if (typeof expectedExecuted === 'number' && tests.length !== expectedExecuted)
    reasons.push(`${label}:executed-${tests.length}!==${expectedExecuted}`)
  if (Array.isArray(expectedIdentitySet)) {
    const actual = identitySetOf(tests)
    const expected = [...expectedIdentitySet].sort()
    if (actual.join('\u0000') !== expected.join('\u0000'))
      reasons.push(`${label}:identity-set-mismatch`)
  }
  return {
    valid: reasons.length === 0,
    reasons,
    executed: tests.length,
    identitySet: identitySetOf(tests),
  }
}

/**
 * 变异相：有效正常退出（exit>0 才可能是真业务红；负值/未知为无效退出）、
 * 无 signal/spawn、只允许 passed/failed（无 pending/todo/skipped）、
 * 无收集/运行错误（含真实未处理异常：runner 传入的 raw 中 Vitest caught
 * unhandled error 区段——该版本 JSON 不一定有计数字段）、恰一红、
 * 完整 file×fullName 多重身份集合与 positive 一致（同数量换身份也拒）、
 * 红所在 file×fullName 逐字等于登记目标、断言原文（AssertionError 或其
 * rejects 序列化形态）。
 */
export function judgeMutant({
  exitCode,
  json,
  targetFile,
  targetFullName,
  positiveExecuted,
  expectedIdentitySet,
  rawOutput,
  spawnError,
  signal,
}) {
  const { reasons, tests } = commonChecks({ json, spawnError, signal, label: 'mutated' })
  const failed = tests.filter((t) => t.status === 'failed')
  const first = failed[0] ?? null
  const target =
    first === null ? null : { fullName: first.fullName, message: first.message, file: first.file }
  // 有效正常退出：spawn 成功时 exit 必须为正数业务红；0/负值/未知都非有效退出。
  if (!spawnError && !signal && !(Number.isInteger(exitCode) && exitCode > 0))
    reasons.push(`mutated-invalid-exit:${exitCode}`)
  if (failed.length === 0) reasons.push('no-failed')
  if (failed.length > 1) reasons.push(`multi-failed:${failed.length}`)
  if (typeof positiveExecuted === 'number' && tests.length !== positiveExecuted)
    reasons.push(`executed-set-changed:${tests.length}!==${positiveExecuted}`)
  // 完整多重身份集合：与 positive 逐项比对（同数量换身份即拒）。
  if (Array.isArray(expectedIdentitySet)) {
    const actual = identitySetOf(tests)
    const expected = [...expectedIdentitySet].sort()
    if (actual.join('\u0000') !== expected.join('\u0000'))
      reasons.push('mutated:identity-set-mismatch')
  }
  // 真实未处理异常/raw harness 区段：该版本 JSON 缺 numRuntimeErrorTestSuites 字段，
  // 必须扫 runner 实捕获的 raw 输出（不扫业务标题里的 pending/todo 词）。
  if (typeof rawOutput === 'string') {
    if (/Vitest caught \d+ unhandled error/i.test(rawOutput))
      reasons.push('mutated:unhandled-error')
    if (/CODEX_UNHANDLED_REJECTION|Unhandled Rejection/i.test(rawOutput))
      reasons.push('mutated:unhandled-rejection')
    for (const m of rawOutput.matchAll(/Unhandled Error[^\n]*/gi))
      reasons.push(`mutated:unhandled-error:${m[0].slice(0, 80)}`)
  }
  if (first !== null) {
    if (target.file !== targetFile) reasons.push(`wrong-file:${target.file}`)
    if (target.fullName !== targetFullName) reasons.push('wrong-fullName')
    const assertionLike =
      /^(AssertionError|expect\(|Error: promise resolved)/i.test(target.message) ||
      target.message.includes('AssertionError')
    if (!assertionLike) reasons.push('not-assertion-red')
    else if (HARNESS_RED.test(target.message)) reasons.push('harness-red')
  }
  return { valid: reasons.length === 0, reasons, target, failed, executed: tests.length }
}
