/**
 * Cursor script-preview medium 反控唯一判据（runner 与拒收自测共用）。
 *
 * - collection/runtime 与顶层计数始终对照**完整原始 JSON**。
 * - 声明范围用全叶筛选（多重 file×fullName），禁止 find 只取第一条。
 * - 完整 failureMessages 数组/全文参与判定；业务红叠 hook/额外 failure 拒收。
 * - Pending/Todo 分别与真实叶状态闭合；范围外 skip 可忽略。
 * - mutant：exit 恰 1、恰一 AssertionError、身份多重集合与 positive 一致。
 */

const HARNESS_RED =
  /(Test timed out|Skeleton|Skipped|todo|Cannot find module|SyntaxError|Transform failed|Unhandled Error|Unhandled Errors|Uncaught Exception|Unhandled Rejection|SerializationError|Vitest caught|No test files found|ENOTFOUND|ECONNREFUSED|navigation to another Document)/i

const RAW_UNHANDLED =
  /Unhandled Errors|Uncaught Exception|Unhandled Rejection|Unhandled Error|Vitest caught/i

const isAssertionMessage = (text) =>
  /^(AssertionError|expect\(|Error: promise resolved)/i.test(text) ||
  text.includes('AssertionError')

export const leavesOf = (json) => {
  const files = json?.testResults ?? []
  return files.flatMap((f) =>
    (f.assertionResults ?? []).map((a) => {
      const failureMessages = Array.isArray(a.failureMessages)
        ? a.failureMessages.map((m) => String(m))
        : []
      const messageHeads = failureMessages.map((m) => m.split('\n')[0] ?? '')
      return {
        fullName: a.fullName,
        status: a.status,
        failureMessages,
        messageHeads,
        /** First head kept for target display; never the sole verdict input. */
        message: messageHeads[0] ?? '',
        failureText: failureMessages.join('\n---\n'),
        file: f.name.replace(/^.*packages\/editor\//, ''),
      }
    }),
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

/** Multiset of file×fullName (duplicates preserved). */
export const identitySetOf = (tests) => tests.map((t) => `${t.file}×${t.fullName}`).sort()

function rawReasons(rawOutput, label) {
  if (typeof rawOutput !== 'string' || !rawOutput) return []
  if (RAW_UNHANDLED.test(rawOutput)) return [`${label}:raw-unhandled`]
  return []
}

/** Vitest buckets filtered/unselected skips into numPendingTests; status remains "skipped". */
function pendingLikeCount(allLeaves) {
  return allLeaves.filter((t) => t.status === 'pending' || t.status === 'skipped').length
}

function todoCount(allLeaves) {
  return allLeaves.filter((t) => t.status === 'todo').length
}

function topLevelCountReasons(json, allLeaves, label) {
  const reasons = []
  if (!json) return reasons
  const leafCount = allLeaves.length
  if (typeof json.numTotalTests === 'number' && json.numTotalTests !== leafCount)
    reasons.push(`${label}:numTotalTests-${json.numTotalTests}!==leaves-${leafCount}`)
  const parts =
    (json.numPassedTests ?? 0) +
    (json.numFailedTests ?? 0) +
    (json.numPendingTests ?? 0) +
    (json.numTodoTests ?? 0)
  if (typeof json.numTotalTests === 'number' && parts > 0 && json.numTotalTests !== parts)
    reasons.push(`${label}:top-count-parts-${parts}!==numTotalTests-${json.numTotalTests}`)
  const passedLeaves = allLeaves.filter((t) => t.status === 'passed').length
  const failedLeaves = allLeaves.filter((t) => t.status === 'failed').length
  const pendingLeaves = pendingLikeCount(allLeaves)
  const todos = todoCount(allLeaves)
  if (typeof json.numPassedTests === 'number' && json.numPassedTests !== passedLeaves)
    reasons.push(`${label}:numPassedTests-${json.numPassedTests}!==${passedLeaves}`)
  if (typeof json.numFailedTests === 'number' && json.numFailedTests !== failedLeaves)
    reasons.push(`${label}:numFailedTests-${json.numFailedTests}!==${failedLeaves}`)
  if (typeof json.numPendingTests === 'number' && json.numPendingTests !== pendingLeaves)
    reasons.push(`${label}:numPendingTests-${json.numPendingTests}!==${pendingLeaves}`)
  if (typeof json.numTodoTests === 'number' && json.numTodoTests !== todos)
    reasons.push(`${label}:numTodoTests-${json.numTodoTests}!==${todos}`)
  const runtimeSuites = json.numRuntimeErrorTestSuites ?? 0
  const expectedSuccess = failedLeaves === 0 && runtimeSuites === 0
  if (typeof json.success === 'boolean' && json.success !== expectedSuccess)
    reasons.push(`${label}:success-${json.success}!==expected-${expectedSuccess}`)
  return reasons
}

/** Reject stacked hook/runtime/extra failures on a failed leaf (full array, not [0] only). */
function failedLeafMessageReasons(leaf, label) {
  const reasons = []
  if (leaf.status !== 'failed') return reasons
  const msgs = leaf.failureMessages ?? []
  if (msgs.length === 0) {
    reasons.push(`${label}:failed-without-messages:${leaf.fullName}`)
    return reasons
  }
  if (msgs.length > 1)
    reasons.push(`${label}:multi-failure-messages:${msgs.length}:${leaf.fullName}`)
  for (let i = 0; i < msgs.length; i++) {
    const head = leaf.messageHeads?.[i] ?? msgs[i].split('\n')[0] ?? ''
    if (HARNESS_RED.test(head) || HARNESS_RED.test(msgs[i]))
      reasons.push(`${label}:harness-in-failure:${head.slice(0, 60)}`)
    // Secondary entries that are plain Error / hook failures are never a clean single red.
    if (i > 0 && !isAssertionMessage(head))
      reasons.push(`${label}:stacked-non-assertion-failure:${head.slice(0, 60)}`)
  }
  return reasons
}

/**
 * @param {object} options
 * @param {string[] | null | undefined} options.declaredFullNames
 */
export function commonChecks({ json, spawnError, signal, label, rawOutput, declaredFullNames }) {
  const reasons = []
  if (spawnError) reasons.push(`${label}:spawn-error`)
  if (signal) reasons.push(`${label}:signal-${signal}`)
  if (!json) reasons.push(`${label}:no-json`)
  const allLeaves = json ? leavesOf(json) : []
  reasons.push(...topLevelCountReasons(json, allLeaves, label))
  const collection = json ? collectionErrors(json) : []
  reasons.push(...collection.map((x) => `${label}:${x}`))
  reasons.push(...rawReasons(rawOutput, label))
  for (const leaf of allLeaves) reasons.push(...failedLeafMessageReasons(leaf, label))

  let tests
  if (Array.isArray(declaredFullNames) && declaredFullNames.length > 0) {
    const declaredSet = new Set(declaredFullNames)
    // Full multiset of declared leaves — never find()-first-only.
    tests = allLeaves.filter((t) => declaredSet.has(t.fullName))
    for (const name of declaredFullNames) {
      const matches = allLeaves.filter((t) => t.fullName === name)
      if (matches.length === 0) reasons.push(`${label}:missing-declared:${name}`)
      for (const match of matches) {
        if (match.status !== 'passed' && match.status !== 'failed')
          reasons.push(`${label}:declared-non-passfail:${match.status}`)
      }
    }
    for (const leaf of allLeaves) {
      if (declaredSet.has(leaf.fullName)) continue
      // Unselected skips outside scope are allowed; executed extras are not.
      if (leaf.status === 'skipped') continue
      if (leaf.status === 'failed')
        reasons.push(`${label}:extra-failed-outside-scope:${leaf.file}×${leaf.fullName}`)
      else if (leaf.status !== 'passed')
        reasons.push(`${label}:extra-nonpassfail-outside-scope:${leaf.status}`)
    }
    if (tests.length === 0) reasons.push(`${label}:zero-executed`)
  } else {
    tests = allLeaves
    if (tests.length === 0) reasons.push(`${label}:zero-executed`)
    for (const t of tests)
      if (t.status !== 'passed' && t.status !== 'failed')
        reasons.push(`${label}:non-passfail-status:${t.status}`)
  }
  return { reasons, tests, allLeaves }
}

export function judgeClean({
  exitCode,
  json,
  expectedExecuted,
  expectedIdentitySet,
  declaredFullNames,
  label = 'clean',
  spawnError,
  signal,
  rawOutput,
}) {
  const { reasons, tests } = commonChecks({
    json,
    spawnError,
    signal,
    label,
    rawOutput,
    declaredFullNames,
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

export function judgeMutant({
  exitCode,
  json,
  targetFile,
  targetFullName,
  positiveExecuted,
  expectedIdentitySet,
  declaredFullNames,
  spawnError,
  signal,
  rawOutput,
}) {
  const { reasons, tests } = commonChecks({
    json,
    spawnError,
    signal,
    label: 'mutated',
    rawOutput,
    declaredFullNames,
  })
  const failed = tests.filter((t) => t.status === 'failed')
  const first = failed[0] ?? null
  const target =
    first === null
      ? null
      : {
          fullName: first.fullName,
          message: first.message,
          failureMessages: first.failureMessages,
          file: first.file,
        }
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
    const msgs = first.failureMessages ?? []
    if (msgs.length !== 1) reasons.push(`mutated:failure-message-count-${msgs.length}`)
    else {
      const head = first.messageHeads?.[0] ?? first.message
      if (!isAssertionMessage(head) && !isAssertionMessage(msgs[0]))
        reasons.push('not-assertion-red')
      else if (HARNESS_RED.test(head) || HARNESS_RED.test(msgs[0])) reasons.push('harness-red')
    }
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

/**
 * 旧 focusJson 缺陷复现：删掉空断言 failed suite 后再判，会误收
 * 「恰一 AssertionError + 另一文件 SyntaxError collection」复合红。
 */
export function legacyFocusJsonDroppingCollectionErrors(json) {
  if (!json) return json
  const testResults = (json.testResults ?? [])
    .map((fileResult) => {
      const assertionResults = (fileResult.assertionResults ?? []).filter(
        (leaf) => leaf.status === 'passed' || leaf.status === 'failed',
      )
      return { ...fileResult, assertionResults }
    })
    .filter((fileResult) => fileResult.assertionResults.length > 0)
  const numPassed = testResults.reduce(
    (sum, fileResult) =>
      sum + fileResult.assertionResults.filter((leaf) => leaf.status === 'passed').length,
    0,
  )
  const numFailed = testResults.reduce(
    (sum, fileResult) =>
      sum + fileResult.assertionResults.filter((leaf) => leaf.status === 'failed').length,
    0,
  )
  return {
    ...json,
    testResults,
    numPassedTests: numPassed,
    numFailedTests: numFailed,
    numPendingTests: 0,
    numTodoTests: 0,
    numTotalTests: numPassed + numFailed,
    numRuntimeErrorTestSuites: 0,
    success: numFailed === 0,
  }
}
