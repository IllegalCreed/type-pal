/**
 * Cursor asset UI large 反控唯一判据（runner 与拒收自测共用）。
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
 * - mutant 退出码必须恰为 1（exit 2 / 其它非 1 拒收）。
 * - Vitest rejects 断言红的首行可能是 `Error: promise resolved ...`（真实构造
 *   来自 AssertionError），保留原文并按 assertionLike 放行，不因前缀一刀拒收。
 */

const HARNESS_RED =
  /(Test timed out|Skeleton|Skipped|todo|Cannot find module|SyntaxError|Transform failed|Unhandled Error|Unhandled Errors|Uncaught Exception|Unhandled Rejection|SerializationError|Vitest caught|No test files found|ENOTFOUND|ECONNREFUSED|navigation to another Document)/i

const RAW_UNHANDLED =
  /Unhandled Errors|Uncaught Exception|Unhandled Rejection|Unhandled Error|Vitest caught/i

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

function rawReasons(rawOutput, label) {
  if (typeof rawOutput !== 'string' || !rawOutput) return []
  // 只核真实未处理异常横幅；勿对整段 JSON/reporter 套用含 todo 的 HARNESS_RED（会误伤 numTodoTests）。
  if (RAW_UNHANDLED.test(rawOutput)) return [`${label}:raw-unhandled`]
  return []
}

function commonChecks({ json, spawnError, signal, label, rawOutput }) {
  const reasons = []
  if (spawnError) reasons.push(`${label}:spawn-error`)
  if (signal) reasons.push(`${label}:signal-${signal}`)
  if (!json) reasons.push(`${label}:no-json`)
  const tests = json ? leavesOf(json) : []
  if (tests.length === 0) reasons.push(`${label}:zero-executed`)
  const collection = json ? collectionErrors(json) : []
  reasons.push(...collection.map((x) => `${label}:${x}`))
  reasons.push(...rawReasons(rawOutput, label))
  for (const t of tests)
    if (t.status !== 'passed' && t.status !== 'failed')
      reasons.push(`${label}:non-passfail-status:${t.status}`)
  return { reasons, tests }
}

/**
 * 清洁相（positive/restored）：exit=0 且无 signal/spawn、每条叶子 passed、
 * 无收集/运行错误、零执行拒收、执行数一致、file×fullName 身份集合与
 * expectedIdentitySet（一般取 positive 的集合）完全一致；raw 叠未处理异常拒收。
 */
export function judgeClean({
  exitCode,
  json,
  expectedExecuted,
  expectedIdentitySet,
  label = 'clean',
  spawnError,
  signal,
  rawOutput,
}) {
  const { reasons, tests } = commonChecks({
    exitCode,
    json,
    spawnError,
    signal,
    label,
    rawOutput,
  })
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
 * 变异相：exit 恰为 1、无 signal/spawn、只允许 passed/failed、
 * 无收集/运行错误、恰一红、红所在 file×fullName 逐字等于登记目标、断言原文
 * （AssertionError 或其 rejects 序列化形态）、执行数与 positive 一致、
 * 完整身份集合与 positive 一致；raw 叠未处理异常拒收。
 */
export function judgeMutant({
  exitCode,
  json,
  targetFile,
  targetFullName,
  positiveExecuted,
  expectedIdentitySet,
  spawnError,
  signal,
  rawOutput,
}) {
  const { reasons, tests } = commonChecks({
    exitCode,
    json,
    spawnError,
    signal,
    label: 'mutated',
    rawOutput,
  })
  const failed = tests.filter((t) => t.status === 'failed')
  const first = failed[0] ?? null
  const target =
    first === null ? null : { fullName: first.fullName, message: first.message, file: first.file }
  if (exitCode !== 1) reasons.push(`mutated:exit-${exitCode}`)
  if (failed.length === 0) reasons.push('no-failed')
  if (failed.length > 1) reasons.push(`multi-failed:${failed.length}`)
  if (typeof positiveExecuted === 'number' && tests.length !== positiveExecuted)
    reasons.push(`executed-set-changed:${tests.length}!==${positiveExecuted}`)
  if (Array.isArray(expectedIdentitySet)) {
    const actual = identitySetOf(tests)
    const expected = [...expectedIdentitySet].sort()
    if (actual.join('\u0000') !== expected.join('\u0000'))
      reasons.push('mutated:identity-set-mismatch')
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
  return {
    valid: reasons.length === 0,
    reasons,
    target,
    failed,
    executed: tests.length,
    identitySet: identitySetOf(tests),
  }
}
