#!/usr/bin/env node
/**
 * 拒收自测：唯一 judge 必须拒收五类假绿，并忠实接受单红正样本。
 * 同时保留旧 legacyFocusJson 复合 collection 误收对照。
 */
import {
  judgeClean,
  judgeMutant,
  legacyFocusJsonDroppingCollectionErrors,
} from './counter-judge.mjs'

const targetFullName = 'C1 cursor-mid-1 demo C1-01 previewCursorKey null'
const targetFile = 'src/core/script-flow-preview.cursor-mid-1.test.ts'
const outsideFullName = 'outside sibling assertion'

const leaf = (fullName, status, message = '') => ({
  fullName,
  status,
  failureMessages: message ? [message] : [],
})

const fileResult = (file, assertionResults, status = 'passed', message) => ({
  name: `/tmp/pkg/packages/editor/${file}`,
  status,
  ...(message ? { message } : {}),
  assertionResults,
})

const report = {
  rejects: {},
  accepts: {},
}

// --- 1) two passed same file×fullName, expectedExecuted 1 ---
{
  const json = {
    numTotalTests: 2,
    numPassedTests: 2,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    numRuntimeErrorTestSuites: 0,
    success: true,
    testResults: [
      fileResult(targetFile, [leaf(targetFullName, 'passed'), leaf(targetFullName, 'passed')]),
    ],
  }
  const r = judgeClean({
    exitCode: 0,
    json,
    expectedExecuted: 1,
    expectedIdentitySet: [`${targetFile}×${targetFullName}`],
    declaredFullNames: [targetFullName],
  })
  report.rejects.twoPassedExpectedOne = !r.valid
  report.rejects.twoPassedReasons = r.reasons
}

// --- 2) declared red + same-identity pending ---
{
  const json = {
    numTotalTests: 2,
    numPassedTests: 0,
    numFailedTests: 1,
    numPendingTests: 1,
    numTodoTests: 0,
    numRuntimeErrorTestSuites: 0,
    success: false,
    testResults: [
      fileResult(
        targetFile,
        [
          leaf(targetFullName, 'failed', 'AssertionError: expected undefined to be null'),
          leaf(targetFullName, 'pending'),
        ],
        'failed',
      ),
    ],
  }
  const r = judgeMutant({
    exitCode: 1,
    json,
    targetFile,
    targetFullName,
    positiveExecuted: 1,
    expectedIdentitySet: [`${targetFile}×${targetFullName}`],
    declaredFullNames: [targetFullName],
    rawOutput: 'AssertionError: expected undefined to be null\n',
  })
  report.rejects.redPlusPendingSameIdentity = !r.valid
  report.rejects.redPlusPendingReasons = r.reasons
}

// --- 3) two declared reds (same identity) ---
{
  const json = {
    numTotalTests: 2,
    numPassedTests: 0,
    numFailedTests: 2,
    numPendingTests: 0,
    numTodoTests: 0,
    numRuntimeErrorTestSuites: 0,
    success: false,
    testResults: [
      fileResult(
        targetFile,
        [
          leaf(targetFullName, 'failed', 'AssertionError: a'),
          leaf(targetFullName, 'failed', 'AssertionError: b'),
        ],
        'failed',
      ),
    ],
  }
  const r = judgeMutant({
    exitCode: 1,
    json,
    targetFile,
    targetFullName,
    positiveExecuted: 1,
    expectedIdentitySet: [`${targetFile}×${targetFullName}`],
    declaredFullNames: [targetFullName],
    rawOutput: 'AssertionError: a\n',
  })
  report.rejects.twoDeclaredReds = !r.valid
  report.rejects.twoDeclaredRedsReasons = r.reasons
}

// --- 4) target red + undeclared extra AssertionError ---
{
  const json = {
    numTotalTests: 2,
    numPassedTests: 0,
    numFailedTests: 2,
    numPendingTests: 0,
    numTodoTests: 0,
    numRuntimeErrorTestSuites: 0,
    success: false,
    testResults: [
      fileResult(
        targetFile,
        [leaf(targetFullName, 'failed', 'AssertionError: expected undefined to be null')],
        'failed',
      ),
      fileResult(
        'src/core/other.test.ts',
        [leaf(outsideFullName, 'failed', 'AssertionError: boom')],
        'failed',
      ),
    ],
  }
  const r = judgeMutant({
    exitCode: 1,
    json,
    targetFile,
    targetFullName,
    positiveExecuted: 1,
    expectedIdentitySet: [`${targetFile}×${targetFullName}`],
    declaredFullNames: [targetFullName],
    rawOutput: 'AssertionError: expected undefined to be null\n',
  })
  report.rejects.targetPlusExtraRed = !r.valid
  report.rejects.targetPlusExtraRedReasons = r.reasons
}

// --- 5) clean numTotalTests 99 but actual 1 leaf ---
{
  const json = {
    numTotalTests: 99,
    numPassedTests: 1,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    numRuntimeErrorTestSuites: 0,
    success: true,
    testResults: [fileResult(targetFile, [leaf(targetFullName, 'passed')])],
  }
  const r = judgeClean({
    exitCode: 0,
    json,
    expectedExecuted: 1,
    expectedIdentitySet: [`${targetFile}×${targetFullName}`],
    declaredFullNames: [targetFullName],
  })
  report.rejects.numTotal99Actual1 = !r.valid
  report.rejects.numTotal99Reasons = r.reasons
}

// --- positive: single AssertionError mutant still accepted ---
{
  const json = {
    numTotalTests: 1,
    numPassedTests: 0,
    numFailedTests: 1,
    numPendingTests: 0,
    numTodoTests: 0,
    numRuntimeErrorTestSuites: 0,
    success: false,
    testResults: [
      fileResult(
        targetFile,
        [leaf(targetFullName, 'failed', "AssertionError: expected undefined to be 'null'")],
        'failed',
      ),
    ],
  }
  const r = judgeMutant({
    exitCode: 1,
    json,
    targetFile,
    targetFullName,
    positiveExecuted: 1,
    expectedIdentitySet: [`${targetFile}×${targetFullName}`],
    declaredFullNames: [targetFullName],
    rawOutput: "AssertionError: expected undefined to be 'null'\n",
  })
  report.accepts.singleAssertion = r.valid
  report.accepts.singleAssertionReasons = r.reasons
}

// --- positive: outside skip ignored (Vitest often buckets skip as pending) ---
{
  const json = {
    numTotalTests: 2,
    numPassedTests: 1,
    numFailedTests: 0,
    numPendingTests: 1,
    numTodoTests: 0,
    numRuntimeErrorTestSuites: 0,
    success: true,
    testResults: [
      fileResult(targetFile, [leaf(targetFullName, 'passed'), leaf(outsideFullName, 'skipped')]),
    ],
  }
  const r = judgeClean({
    exitCode: 0,
    json,
    expectedExecuted: 1,
    expectedIdentitySet: [`${targetFile}×${targetFullName}`],
    declaredFullNames: [targetFullName],
  })
  report.accepts.outsideSkipOk = r.valid
  report.accepts.outsideSkipReasons = r.reasons
}

// --- legacy composite collection still rejected by current / accepted by legacy focus ---
const compositeRed = {
  numTotalTestSuites: 2,
  numTotalTests: 1,
  numPassedTests: 0,
  numFailedTests: 1,
  numPendingTests: 0,
  numTodoTests: 0,
  numRuntimeErrorTestSuites: 1,
  success: false,
  testResults: [
    fileResult(
      targetFile,
      [leaf(targetFullName, 'failed', "AssertionError: expected undefined to be 'null'")],
      'failed',
    ),
    {
      name: '/tmp/pkg/packages/editor/src/core/broken-sibling.test.ts',
      status: 'failed',
      message: 'SyntaxError: Unexpected token',
      assertionResults: [],
    },
  ],
}
const current = judgeMutant({
  exitCode: 1,
  json: compositeRed,
  targetFile,
  targetFullName,
  positiveExecuted: 1,
  expectedIdentitySet: [`${targetFile}×${targetFullName}`],
  declaredFullNames: [targetFullName],
  rawOutput: "AssertionError: expected undefined to be 'null'\n",
})
const legacy = judgeMutant({
  exitCode: 1,
  json: legacyFocusJsonDroppingCollectionErrors(compositeRed),
  targetFile,
  targetFullName,
  positiveExecuted: 1,
  expectedIdentitySet: [`${targetFile}×${targetFullName}`],
  declaredFullNames: [targetFullName],
  rawOutput: "AssertionError: expected undefined to be 'null'\n",
})
report.rejects.compositeCollection = !current.valid
report.accepts.legacyWouldAcceptComposite = legacy.valid

const fail = (msg) => {
  console.error(msg)
  console.error(JSON.stringify(report, null, 2))
  process.exit(1)
}

if (!report.rejects.twoPassedExpectedOne) fail('FAIL: must reject two passed / expected 1')
if (!report.rejects.redPlusPendingSameIdentity) fail('FAIL: must reject red+pending same identity')
if (!report.rejects.twoDeclaredReds) fail('FAIL: must reject two declared reds')
if (!report.rejects.targetPlusExtraRed) fail('FAIL: must reject target + extra undeclared red')
if (!report.rejects.numTotal99Actual1) fail('FAIL: must reject numTotalTests 99 vs 1 leaf')
if (!report.accepts.singleAssertion) fail('FAIL: single AssertionError must still be accepted')
if (!report.accepts.outsideSkipOk) fail('FAIL: outside skip must still be accepted')
if (!report.rejects.compositeCollection) fail('FAIL: composite collection must be rejected')
if (!report.accepts.legacyWouldAcceptComposite)
  fail('FAIL: legacy focus repro no longer demonstrates the bug')

console.log(JSON.stringify({ ok: true, ...report }, null, 2))
