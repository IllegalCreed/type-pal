#!/usr/bin/env node
/**
 * CURSOR-R1-02：唯一 judge 拒收自测（模块直调 + 真实 CTR-C03-02 三态存档 + 真实 Vitest unhandled raw）。
 * 期望：四反例全部拒收；正常 CTR-C03-02 mutant/clean 仍收。
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { judgeClean, judgeMutant } from './counter-judge.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ctr = join(here, 'counters', 'CTR-C03-02')
const positive = JSON.parse(readFileSync(join(ctr, 'positive.json'), 'utf8'))
const mutated = JSON.parse(readFileSync(join(ctr, 'mutated.json'), 'utf8'))
const receipt = JSON.parse(readFileSync(join(ctr, 'receipt.json'), 'utf8'))
const rawUnhandled = readFileSync(join(here, 'fixtures', 'vitest-unhandled-probe.stderr'), 'utf8')

const idSet = judgeClean({
  json: positive,
  exitCode: 0,
  rawOutput: readFileSync(join(ctr, 'positive.raw.txt'), 'utf8'),
}).identitySet

const baselineMutant = judgeMutant({
  json: mutated,
  exitCode: 1,
  targetFile: receipt.testSpec,
  targetFullName: receipt.expectFullname,
  positiveExecuted: receipt.positive.executed,
  expectedIdentitySet: idSet,
  rawOutput: readFileSync(join(ctr, 'mutated.raw.txt'), 'utf8'),
})

const cases = []

{
  const r = structuredClone(mutated)
  for (const f of r.testResults) {
    const t = f.assertionResults.find((a) => a.status === 'passed')
    if (t) {
      t.fullName += ' WRONG NEIGHBOR'
      break
    }
  }
  const j = judgeMutant({
    json: r,
    exitCode: 1,
    targetFile: receipt.testSpec,
    targetFullName: receipt.expectFullname,
    positiveExecuted: receipt.positive.executed,
    expectedIdentitySet: idSet,
  })
  cases.push({ label: 'same-count-different-neighbor', accepted: j.valid, reasons: j.reasons })
}

{
  const j = judgeMutant({
    json: mutated,
    exitCode: 2,
    targetFile: receipt.testSpec,
    targetFullName: receipt.expectFullname,
    positiveExecuted: receipt.positive.executed,
    expectedIdentitySet: idSet,
  })
  cases.push({ label: 'exit-2', accepted: j.valid, reasons: j.reasons })
}

{
  const j = judgeMutant({
    json: mutated,
    exitCode: 1,
    targetFile: receipt.testSpec,
    targetFullName: receipt.expectFullname,
    positiveExecuted: receipt.positive.executed,
    expectedIdentitySet: idSet,
    rawOutput: rawUnhandled,
  })
  cases.push({ label: 'raw-real-unhandled-probe', accepted: j.valid, reasons: j.reasons })
}

{
  const j = judgeClean({
    json: positive,
    exitCode: 0,
    rawOutput: rawUnhandled,
  })
  cases.push({
    label: 'clean-raw-real-unhandled-probe',
    accepted: j.valid,
    reasons: j.reasons,
  })
}

const allRejected = cases.every((c) => c.accepted === false)
const baselineOk = baselineMutant.valid === true
const report = {
  generatedAt: new Date().toISOString(),
  baselineMutantOk: baselineOk,
  baselineReasons: baselineMutant.reasons,
  rejects: cases,
  allFourRejected: allRejected,
  pass: allRejected && baselineOk,
}
const outPath = join(here, 'judge-selftest.json')
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`)
// Biome formats short arrays inline; keep generated report lint-clean without manual pre-commit.
execFileSync('pnpm', ['exec', 'biome', 'format', '--write', outPath], {
  cwd: join(here, '../../../..'),
  stdio: ['ignore', 'pipe', 'pipe'],
})
console.log(readFileSync(outPath, 'utf8'))
if (!report.pass) process.exit(1)
