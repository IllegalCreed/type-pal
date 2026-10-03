#!/usr/bin/env node
/**
 * 判据变、源/身份未变：对已有存档三态 JSON 重判并写回 receipt.judge；不重跑 vitest。
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { judgeClean, judgeMutant } from './counter-judge.mjs'

const root = resolve(process.cwd(), 'docs/testing/grok-cursor-large/cursor/counters')
const results = []
for (const id of readdirSync(root).sort()) {
  const dir = join(root, id)
  let receipt
  try {
    receipt = JSON.parse(readFileSync(join(dir, 'receipt.json'), 'utf8'))
  } catch {
    continue
  }
  const positive = JSON.parse(readFileSync(join(dir, 'positive.json'), 'utf8'))
  const mutated = JSON.parse(readFileSync(join(dir, 'mutated.json'), 'utf8'))
  const restored = JSON.parse(readFileSync(join(dir, 'restored.json'), 'utf8'))
  const positiveRaw = readFileSync(join(dir, 'positive.raw.txt'), 'utf8')
  const mutatedRaw = readFileSync(join(dir, 'mutated.raw.txt'), 'utf8')
  const restoredRaw = readFileSync(join(dir, 'restored.raw.txt'), 'utf8')

  const positiveJudge = judgeClean({
    exitCode: receipt.positive.exitCode,
    json: positive,
    label: 'positive',
    rawOutput: positiveRaw,
  })
  const mutantJudge = judgeMutant({
    exitCode: receipt.mutated.exitCode,
    json: mutated,
    targetFile: receipt.testSpec,
    targetFullName: receipt.expectFullname,
    positiveExecuted: receipt.positive.executed,
    expectedIdentitySet: positiveJudge.identitySet,
    rawOutput: mutatedRaw,
  })
  const restoredJudge = judgeClean({
    exitCode: receipt.restored.exitCode,
    json: restored,
    expectedExecuted: receipt.mutated.executed,
    expectedIdentitySet: positiveJudge.identitySet,
    label: 'restored',
    rawOutput: restoredRaw,
  })
  receipt.positive.judge = positiveJudge
  receipt.mutated.judge = {
    valid: mutantJudge.valid,
    reasons: mutantJudge.reasons,
    identitySet: mutantJudge.identitySet,
  }
  receipt.mutated.target = mutantJudge.target
  receipt.restored.judge = restoredJudge
  writeFileSync(join(dir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  results.push({
    id,
    ok: positiveJudge.valid && mutantJudge.valid && restoredJudge.valid,
    reasons: [
      ...(!positiveJudge.valid ? positiveJudge.reasons.map((r) => `p:${r}`) : []),
      ...(!mutantJudge.valid ? mutantJudge.reasons.map((r) => `m:${r}`) : []),
      ...(!restoredJudge.valid ? restoredJudge.reasons.map((r) => `r:${r}`) : []),
    ],
  })
}
const failed = results.filter((r) => !r.ok)
writeFileSync(
  resolve(process.cwd(), 'docs/testing/grok-cursor-large/cursor/rejudge-counters.json'),
  `${JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2)}\n`,
)
console.log(
  JSON.stringify(
    { total: results.length, failed: failed.length, failedIds: failed.map((f) => f.id) },
    null,
    2,
  ),
)
if (failed.length) process.exit(1)
