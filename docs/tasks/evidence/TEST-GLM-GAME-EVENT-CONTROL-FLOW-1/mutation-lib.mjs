/**
 * TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 反控判据库(r2)。
 *
 * r1 判据被 Codex 验收否决(误收):只看 jsonSummary 汇总数、不核 exit/signal/spawn、
 * 不要求恰一失败、不核失败落点是否目标合同、不比对红相位与原始相位执行集。
 * r2 拆成可复用库,同时保留 r1 旧判据(validateNeedleR1)原样转录,供 selftest
 * 用合成反例证明旧判据确实误收、新判据全部拒绝。
 *
 * 相位对象契约(runPhase/mutation-selftest 的 makePhase 都按此产出):
 *   exitCode/signal/spawnError/spawnTimedOut/parseError/jsonSummary/detail/
 *   identitySet(file :: fullName :: status 升序)/executionSet(file :: fullName 升序)/
 *   failedAssertions([{file, fullName, status, failureMessages}])。
 */

export const REQUIRED_FIELDS = [
  'numTotalTests',
  'numPassedTests',
  'numFailedTests',
  'numPendingTests',
  'success',
  'testResults',
]

/** trimEof:去尾部空白,保留恰好一个换行终止符。 */
export function trimEof(text) {
  const trimmed = text.replace(/\s+$/u, '')
  return trimmed.length === 0 ? '' : `${trimmed}\n`
}

export function parseReporter(stdout) {
  const start = stdout.indexOf('{')
  const end = stdout.lastIndexOf('}')
  if (start < 0 || end <= start) return { parsed: false, reason: 'no-json-object-in-stdout' }
  try {
    return { parsed: true, json: JSON.parse(stdout.slice(start, end + 1)) }
  } catch (err) {
    return { parsed: false, reason: `json-parse-error: ${err.message}` }
  }
}

/** reporter → 判据消费的结构(套件/断言两级 + 汇总数 + runtime/collection 推导)。 */
export function digest(json) {
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

export function identitySet(detail) {
  const rows = []
  for (const s of detail.suites) {
    for (const a of s.assertionResults) rows.push(`${s.name} :: ${a.fullName} :: ${a.status}`)
  }
  return rows.sort()
}

export function executionSet(detail) {
  const rows = []
  for (const s of detail.suites) {
    for (const a of s.assertionResults) rows.push(`${s.name} :: ${a.fullName}`)
  }
  return rows.sort()
}

export function failedAssertions(detail) {
  const rows = []
  for (const s of detail.suites) {
    for (const a of s.assertionResults) {
      if (a.status === 'failed') {
        rows.push({
          file: s.name,
          fullName: a.fullName,
          status: a.status,
          failureMessages: a.failureMessages,
        })
      }
    }
  }
  return rows
}

/** skipped/todo 用例数(断言级状态,不依赖 reporter 汇总字段口径)。 */
export function skippedTodoCount(detail) {
  let n = 0
  for (const s of detail.suites) {
    for (const a of s.assertionResults) {
      if (a.status === 'todo' || a.status === 'skipped' || a.status === 'skipped-suite') n++
    }
  }
  return n
}

function statusMap(detail) {
  const map = new Map()
  for (const s of detail.suites) {
    for (const a of s.assertionResults) map.set(`${s.name} :: ${a.fullName}`, a.status)
  }
  return map
}

function sameArray(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** 进程层门:exit/signal/spawn。kind: 'green'(须 exit 0)| 'red'(须 exit≠0 且为数字)。 */
function spawnGates(phase, label, kind) {
  const reasons = []
  if (phase.parseError) reasons.push(`${label}-json-unparsable:${phase.parseError}`)
  if (!phase.jsonSummary?.reporterFieldsPresent) reasons.push(`${label}-missing-reporter-field`)
  if (kind === 'green') {
    if (phase.exitCode !== 0) reasons.push(`${label}-exit-not-zero:${phase.exitCode}`)
  } else {
    if (typeof phase.exitCode !== 'number' || phase.exitCode === 0) {
      reasons.push(`${label}-exit-invalid:${phase.exitCode}`)
    }
  }
  if (phase.signal !== null && phase.signal !== undefined)
    reasons.push(`${label}-signal:${phase.signal}`)
  if (phase.spawnError !== null) reasons.push(`${label}-spawn-error:${phase.spawnError}`)
  if (phase.spawnTimedOut) reasons.push(`${label}-timeout`)
  return reasons
}

function greenGates(phase, label) {
  const reasons = spawnGates(phase, label, 'green')
  const js = phase.jsonSummary
  if (
    js &&
    !(
      js.success === true &&
      js.numFailedTests === 0 &&
      js.numPendingTests === 0 &&
      js.numTotalTests > 0
    )
  )
    reasons.push(`${label}-not-green`)
  if (js && phase.detail && js.numFailedTests !== failedAssertions(phase.detail).length)
    reasons.push(`${label}-reporter-count-mismatch`)
  if (phase.detail && skippedTodoCount(phase.detail) > 0) reasons.push(`${label}-skip-todo`)
  return reasons
}

/**
 * r2 判据(验收口径):
 *  - 三相位进程层全查(exit/signal/spawnError/timeout);
 *  - 红相位恰一 failed、零 pending/skip/todo、零 runtime/collection error;
 *  - 唯一失败 fullName 必须精确等于 point.targetContract 且失败消息含 AssertionError;
 *  - 红相位执行集与原始相位逐集合核对(拒绝额外文件/额外用例/状态漂移);
 *  - 恢复相位 identity 与原始完全一致 + 产品源 sha 与原始一致。
 */
export function validateNeedleR2({
  point,
  original,
  mutated,
  restored,
  targetShaOriginal,
  targetShaRestored,
}) {
  const reasons = [...greenGates(original, 'original')]

  const originalStatus = statusMap(original.detail)
  const targetKey = [...originalStatus.keys()].find((k) =>
    k.endsWith(` :: ${point.targetContract}`),
  )
  if (targetKey === undefined || originalStatus.get(targetKey) !== 'passed') {
    reasons.push('original-target-contract-missing-or-not-passed')
  }

  reasons.push(...spawnGates(mutated, 'red', 'red'))
  const rjs = mutated.jsonSummary
  if (rjs) {
    if (rjs.success !== false) reasons.push('red-success-not-false')
    if (rjs.numPendingTests !== 0) reasons.push('red-pending>0')
    const rt = rjs.numRuntimeErrorTestSuites
    if ((rt.derivedFromSuiteStatuses ?? 0) > 0 || (rt.valueFromReporter ?? 0) > 0) {
      reasons.push('red-runtime-or-collection-error')
    }
  }
  const redFailed = mutated.detail ? failedAssertions(mutated.detail) : []
  if (rjs && redFailed.length !== 1) reasons.push('red-not-exactly-one-failed')
  if (rjs && rjs.numFailedTests !== 1) reasons.push('red-not-exactly-one-failed-reporter')
  if (rjs && rjs.numFailedTests !== redFailed.length) reasons.push('red-reporter-count-mismatch')
  if (mutated.detail && skippedTodoCount(mutated.detail) > 0) reasons.push('red-skip-todo')
  if (redFailed.length === 1) {
    if (redFailed[0].fullName !== point.targetContract) reasons.push('red-wrong-target-contract')
    if (!redFailed[0].failureMessages.some((m) => m.includes('AssertionError'))) {
      reasons.push('red-no-business-assertion')
    }
  } else if (
    redFailed.length > 1 &&
    !redFailed.some((f) => f.failureMessages.some((m) => m.includes('AssertionError')))
  ) {
    reasons.push('red-no-business-assertion')
  }
  if (original.detail && mutated.detail) {
    if (!sameArray(executionSet(original.detail), executionSet(mutated.detail))) {
      reasons.push('red-execution-set-drift')
    } else {
      const redStatus = statusMap(mutated.detail)
      const diffs = []
      for (const [key, status] of redStatus) {
        if (originalStatus.get(key) !== status)
          diffs.push(`${key}: ${originalStatus.get(key)} -> ${status}`)
      }
      const targetWasPassed =
        targetKey !== undefined &&
        originalStatus.get(targetKey) === 'passed' &&
        redStatus.get(targetKey) === 'failed'
      const onlyTargetChanged = diffs.length === 1 && targetWasPassed
      if (!onlyTargetChanged) reasons.push('red-status-drift-beyond-target')
    }
  }

  reasons.push(...greenGates(restored, 'restored'))
  if (
    original.detail &&
    restored.detail &&
    !sameArray(identitySet(original.detail), identitySet(restored.detail))
  )
    reasons.push('restored-identity-drift')
  if (targetShaRestored !== targetShaOriginal) reasons.push('restore-sha-mismatch')

  const valid = reasons.length === 0
  return { valid, invalidReasons: reasons }
}

/**
 * r1 旧判据原样转录(仅作 selftest 误收证明,不再作为门):jsonSummary 汇总级,
 * 不查 exit/signal/spawn,不要求恰一失败,不核目标合同,不比对红/原始执行集。
 */
export function validateNeedleR1({
  original,
  mutated,
  restored,
  targetShaOriginal,
  targetShaRestored,
}) {
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
  if (mutated.jsonSummary && (mutated.failedFullNames ?? []).length === 0)
    reasons.push('red-no-failed-test')
  const failedMessages = mutated.failedAssertions ?? []
  if (
    failedMessages.length > 0 &&
    !failedMessages.some((f) => (f.failureMessages ?? []).some((m) => m.includes('AssertionError')))
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
  if (targetShaRestored !== targetShaOriginal) reasons.push('restore-sha-mismatch')
  if ((original.identitySet ?? []).length === 0 || (restored.identitySet ?? []).length === 0)
    reasons.push('empty-identity-set')
  if (
    (mutated.failedFullNames ?? []).length > 0 &&
    !(mutated.failedFullNames ?? []).every((f) => mutated.identitySet.includes(`${f} :: failed`))
  )
    reasons.push('red-identity-set-missing-failed')
  if (
    (original.identitySet ?? []).length > 0 &&
    (restored.identitySet ?? []).length > 0 &&
    !sameArray(original.identitySet, restored.identitySet)
  )
    reasons.push('green-identity-drift')
  const valid = reasons.length === 0
  return { valid, invalidReasons: reasons }
}
