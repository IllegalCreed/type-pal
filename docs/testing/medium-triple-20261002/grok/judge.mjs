/**
 * 唯一反控判据。run-counters.mjs 与 judge.selftest.mjs 都 import 本模块。
 * 路径只去掉临时 root 前缀，保留 packages/game/ 子路径。
 */
export function canonicalTestPath(fileName, tempRoot) {
  let path = String(fileName ?? '').replaceAll('\\', '/')
  if (tempRoot) {
    const root = String(tempRoot).replaceAll('\\', '/').replace(/\/+$/, '')
    if (root && (path === root || path.startsWith(`${root}/`))) {
      path = path.slice(root.length).replace(/^\/+/, '')
    }
  }
  const marker = 'packages/game/'
  const at = path.lastIndexOf(marker)
  if (at >= 0) return path.slice(at)
  if (path.startsWith('src/')) return `${marker}${path}`
  return path
}

export function leafRows(report) {
  const rows = []
  for (const file of report?.testResults ?? []) {
    for (const assertion of file?.assertionResults ?? []) {
      rows.push({
        file: file?.name ?? '',
        fullName: String(assertion?.fullName ?? ''),
        status: String(assertion?.status ?? ''),
        failureMessages: assertion?.failureMessages ?? [],
      })
    }
  }
  return rows
}

export function identityMultiset(report, tempRoot) {
  return leafRows(report)
    .map((leaf) => `${canonicalTestPath(leaf.file, tempRoot)}\t${leaf.fullName}`)
    .sort()
}

const RAW_UNHANDLED = /Unhandled Errors|Uncaught Exception|Unhandled Rejection/i

export function rawUnhandled(stdout, stderr) {
  return RAW_UNHANDLED.test(`${stdout ?? ''}\n${stderr ?? ''}`)
}

function exitReasons(run, expected) {
  const reasons = []
  if (run?.signal) reasons.push(`signal ${run.signal}`)
  if (run?.exitCode == null) reasons.push('spawn error')
  else if (run.exitCode !== expected) reasons.push(`exit ${run.exitCode}`)
  return reasons
}

function summarize(report) {
  const reasons = []
  const leaves = leafRows(report)
  if (leaves.length === 0) reasons.push('zero leaf executions')
  let passed = 0
  let failed = 0
  let pending = 0
  let todo = 0
  let other = 0
  for (const leaf of leaves) {
    if (leaf.status === 'passed') passed += 1
    else if (leaf.status === 'failed') failed += 1
    else if (leaf.status === 'pending' || leaf.status === 'skipped') pending += 1
    else if (leaf.status === 'todo') todo += 1
    else other += 1
  }
  if ((report?.numTotalTests ?? 0) !== leaves.length) reasons.push('numTotalTests does not close')
  if ((report?.numPassedTests ?? 0) !== passed) reasons.push('numPassedTests does not close')
  if ((report?.numFailedTests ?? 0) !== failed) reasons.push('numFailedTests does not close')
  if ((report?.numPendingTests ?? 0) !== pending) reasons.push('numPendingTests does not close')
  if ((report?.numTodoTests ?? 0) !== todo) reasons.push('numTodoTests does not close')
  if (pending !== 0 || todo !== 0) reasons.push('pending or todo')
  if (other !== 0) reasons.push('unexpected leaf status')
  for (const file of report?.testResults ?? []) {
    const assertions = file?.assertionResults ?? []
    if (file?.status === 'failed' && assertions.length === 0) reasons.push('collection failure')
  }
  if ((report?.numRuntimeErrorTestSuites ?? 0) !== 0) reasons.push('runtime error suite')
  return { reasons, leaves, failed }
}

export function judgeClean(report, run) {
  const reasons = [...exitReasons(run, 0)]
  if (rawUnhandled(run?.stdout, run?.stderr)) reasons.push('unhandled error')
  const summary = summarize(report)
  reasons.push(...summary.reasons)
  if (summary.failed !== 0) reasons.push(`failed ${summary.failed}`)
  return reasons
}

export function judgeMutant(report, run, registered, options = {}) {
  const reasons = [...exitReasons(run, 1)]
  if (rawUnhandled(run?.stdout, run?.stderr)) {
    reasons.push('unhandled error stacked on assertion')
  }
  const summary = summarize(report)
  reasons.push(...summary.reasons)
  const failed = summary.leaves.filter((leaf) => leaf.status === 'failed')
  const file = canonicalTestPath(registered?.file, options.tempRoot)
  const fullName = registered?.fullName ?? ''
  if (!file || !fullName) reasons.push('missing registered target')
  if (failed.length !== 1) reasons.push(`failed count ${failed.length}`)
  else {
    const only = failed[0]
    const message = (only.failureMessages ?? []).join('\n')
    const gotFile = canonicalTestPath(only.file, options.tempRoot)
    if (gotFile !== file || only.fullName !== fullName) {
      reasons.push(`wrong target ${gotFile} ${only.fullName}`)
    }
    if (!message.includes('AssertionError')) reasons.push('failure is not AssertionError')
    if (/^\s*(TypeError|ReferenceError|SyntaxError|Error:)/m.test(message)) {
      reasons.push('non-assertion exception')
    }
  }
  if (summary.leaves.some((leaf) => leaf.status !== 'failed' && leaf.status !== 'passed')) {
    reasons.push('non-passed sibling')
  }
  if (registered?.oldFile) {
    const oldFile = canonicalTestPath(registered.oldFile, options.tempRoot)
    const oldLeaves = summary.leaves.filter(
      (leaf) => canonicalTestPath(leaf.file, options.tempRoot) === oldFile,
    )
    if (oldLeaves.length === 0) reasons.push('no old leaves')
    else if (oldLeaves.some((leaf) => leaf.status !== 'passed')) reasons.push('old leaf not green')
  }
  return { reasons, assertion: failed.length === 1 ? failed[0] : null }
}

export function judgeHashes(sha) {
  const reasons = []
  const product = sha?.product ?? {}
  const test = sha?.test ?? {}
  for (const state of ['original', 'mutant', 'restored']) {
    if (!product[state]) reasons.push(`missing product sha ${state}`)
    if (!test[state]) reasons.push(`missing test sha ${state}`)
  }
  if (product.original && product.original !== product.restored) {
    reasons.push('restored product bytes differ')
  }
  if (product.original && product.original === product.mutant) {
    reasons.push('mutation did not change product bytes')
  }
  if (test.original && (test.original !== test.mutant || test.original !== test.restored)) {
    reasons.push('test bytes changed')
  }
  return reasons
}

export function judgeTriple(states, registered, options = {}) {
  const tempRoot = options.tempRoot
  const reasons = []
  for (const reason of judgeClean(states.original.report, states.original.run)) {
    reasons.push(`original ${reason}`)
  }
  for (const reason of judgeClean(states.restored.report, states.restored.run)) {
    reasons.push(`restored ${reason}`)
  }
  const mutant = judgeMutant(states.mutant.report, states.mutant.run, registered, options)
  for (const reason of mutant.reasons) reasons.push(`mutant ${reason}`)
  const originalIds = identityMultiset(states.original.report, tempRoot)
  const mutantIds = identityMultiset(states.mutant.report, tempRoot)
  const restoredIds = identityMultiset(states.restored.report, tempRoot)
  if (originalIds.length === 0) reasons.push('empty execution identity')
  if (
    JSON.stringify(originalIds) !== JSON.stringify(mutantIds) ||
    JSON.stringify(originalIds) !== JSON.stringify(restoredIds)
  ) {
    reasons.push('execution identity multiset changed')
  }
  if (registered?.identities) {
    const expected = registered.identities
      .map((row) => `${canonicalTestPath(row.file, tempRoot)}\t${row.fullName}`)
      .sort()
    if (JSON.stringify(originalIds) !== JSON.stringify(expected)) {
      reasons.push('execution identity differs from registration')
    }
  }
  reasons.push(...judgeHashes(options.sha))
  return { reasons, assertion: mutant.assertion, identities: originalIds }
}
