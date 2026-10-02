#!/usr/bin/env node
/**
 * 拒收自测：唯一 judge 必须拒收「恰一 AssertionError + 另一文件空断言 collection/SyntaxError」。
 * 旧 legacyFocusJsonDroppingCollectionErrors 会误收；现行 judgeMutant 必须 invalid。
 */
import { judgeMutant, legacyFocusJsonDroppingCollectionErrors } from './counter-judge.mjs'

const targetFullName = 'C1 cursor-mid-1 demo C1-01 previewCursorKey null'
const targetFile = 'src/core/script-flow-preview.cursor-mid-1.test.ts'

const compositeRed = {
  numTotalTestSuites: 2,
  numPassedTests: 0,
  numFailedTests: 1,
  numRuntimeErrorTestSuites: 1,
  success: false,
  testResults: [
    {
      name: `/tmp/pkg/packages/editor/${targetFile}`,
      status: 'failed',
      assertionResults: [
        {
          fullName: targetFullName,
          status: 'failed',
          failureMessages: [
            "AssertionError: expected undefined to be 'null' // Object.is equality",
          ],
        },
      ],
    },
    {
      name: '/tmp/pkg/packages/editor/src/core/broken-sibling.test.ts',
      status: 'failed',
      message: 'SyntaxError: Unexpected token',
      assertionResults: [],
    },
  ],
}

const declared = [targetFullName]
const current = judgeMutant({
  exitCode: 1,
  json: compositeRed,
  targetFile,
  targetFullName,
  positiveExecuted: 1,
  expectedIdentitySet: [`${targetFile}×${targetFullName}`],
  declaredFullNames: declared,
  spawnError: null,
  signal: null,
  rawOutput: "AssertionError: expected undefined to be 'null'\n",
})

const legacyJson = legacyFocusJsonDroppingCollectionErrors(compositeRed)
const legacy = judgeMutant({
  exitCode: 1,
  json: legacyJson,
  targetFile,
  targetFullName,
  positiveExecuted: 1,
  expectedIdentitySet: [`${targetFile}×${targetFullName}`],
  declaredFullNames: declared,
  spawnError: null,
  signal: null,
  rawOutput: "AssertionError: expected undefined to be 'null'\n",
})

const cleanOk = judgeMutant({
  exitCode: 1,
  json: {
    numTotalTestSuites: 1,
    numPassedTests: 0,
    numFailedTests: 1,
    numRuntimeErrorTestSuites: 0,
    success: false,
    testResults: [compositeRed.testResults[0]],
  },
  targetFile,
  targetFullName,
  positiveExecuted: 1,
  expectedIdentitySet: [`${targetFile}×${targetFullName}`],
  declaredFullNames: declared,
  spawnError: null,
  signal: null,
  rawOutput: "AssertionError: expected undefined to be 'null'\n",
})

const report = {
  currentRejectsComposite: !current.valid,
  currentReasons: current.reasons,
  legacyWouldAccept: legacy.valid,
  legacyReasons: legacy.reasons,
  singleAssertionStillAccepted: cleanOk.valid,
}

if (!report.currentRejectsComposite) {
  console.error('FAIL: current judge must reject composite collection+assertion red')
  console.error(JSON.stringify(report, null, 2))
  process.exit(1)
}
if (!report.legacyWouldAccept) {
  console.error('FAIL: legacy focus repro no longer demonstrates the bug (fixture stale)')
  console.error(JSON.stringify(report, null, 2))
  process.exit(1)
}
if (!report.singleAssertionStillAccepted) {
  console.error('FAIL: single AssertionError mutant must still be accepted')
  console.error(JSON.stringify(report, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, ...report }, null, 2))
