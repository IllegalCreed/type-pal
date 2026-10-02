#!/usr/bin/env node
/**
 * R2-01：用修后唯一 judge 重判六针原 JSON/raw（不重采、不改业务字节）。
 * 回写各 receipt 的 judge 字段，并落 cleanup-evidence/rejudge-r3.json。
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { judgeClean, judgeMutant } from './counter-judge.mjs'

const root = process.cwd()
const base = join(root, 'docs/testing/medium-triple-20261002/cursor')
const counters = JSON.parse(readFileSync(join(base, 'counters.json'), 'utf8'))
const ids = counters.counters?.map((c) => c.id) ?? counters.ids ?? []

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function loadJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null
}

const out = { at: new Date().toISOString(), needles: [], allValid: true }

for (const id of ids) {
  const dir = join(base, 'counters', id)
  const receipt = loadJson(join(dir, 'receipt.json'))
  if (!receipt) throw new Error(`missing receipt ${id}`)
  const declared =
    receipt.declaredFullNames ?? loadJson(join(dir, 'positive.scope.json'))?.declaredFullNames ?? []
  const targetFile = receipt.testSpec
  const targetFullName = receipt.expectFullname
  const identity = [`${targetFile}×${targetFullName}`]

  const phases = {}
  for (const phase of ['positive', 'mutated', 'restored']) {
    const jsonPath = join(dir, `${phase}.json`)
    const rawPath = join(dir, `${phase}.raw.txt`)
    const jsonBytes = sha256File(jsonPath)
    const rawBytes = sha256File(rawPath)
    const json = loadJson(jsonPath)
    const raw = readFileSync(rawPath, 'utf8')
    const exitCode = receipt[phase]?.exitCode
    let judge
    if (phase === 'mutated') {
      judge = judgeMutant({
        exitCode,
        json,
        targetFile,
        targetFullName,
        positiveExecuted: receipt.positive?.executed ?? 1,
        expectedIdentitySet: identity,
        declaredFullNames: declared,
        rawOutput: raw,
      })
    } else {
      judge = judgeClean({
        exitCode,
        json,
        expectedExecuted: receipt.positive?.executed ?? 1,
        expectedIdentitySet: identity,
        declaredFullNames: declared,
        label: phase === 'positive' ? 'clean' : 'restored',
        rawOutput: raw,
      })
    }
    phases[phase] = {
      valid: judge.valid,
      reasons: judge.reasons,
      executed: judge.executed,
      identitySet: judge.identitySet,
      jsonSha256: jsonBytes,
      rawSha256: rawBytes,
      ...(judge.target ? { target: judge.target } : {}),
    }
    if (!judge.valid) out.allValid = false
    // Rewrite judge on receipt only; keep original JSON/raw bytes.
    receipt[phase] = {
      ...receipt[phase],
      judge: {
        valid: judge.valid,
        reasons: judge.reasons,
        executed: judge.executed,
        identitySet: judge.identitySet,
        ...(judge.target ? { target: judge.target } : {}),
      },
    }
  }

  // old-on-mutated if present — rejudge without declared filter (full old suite)
  if (receipt.oldOnMutated && existsSync(join(dir, 'old-on-mutated.json'))) {
    const json = loadJson(join(dir, 'old-on-mutated.json'))
    const raw = readFileSync(join(dir, 'old-on-mutated.raw.txt'), 'utf8')
    const judge = judgeClean({
      exitCode: receipt.oldOnMutated.exitCode,
      json,
      expectedExecuted: receipt.oldOnMutated.executed,
      expectedIdentitySet: receipt.oldOnMutated.judge?.identitySet,
      declaredFullNames: null,
      label: 'old-on-mutated',
      rawOutput: raw,
    })
    phases.oldOnMutated = {
      valid: judge.valid,
      reasons: judge.reasons,
      executed: judge.executed,
      identitySet: judge.identitySet,
      jsonSha256: sha256File(join(dir, 'old-on-mutated.json')),
      rawSha256: sha256File(join(dir, 'old-on-mutated.raw.txt')),
    }
    if (!judge.valid) out.allValid = false
    receipt.oldOnMutated = {
      ...receipt.oldOnMutated,
      judge: {
        valid: judge.valid,
        reasons: judge.reasons,
        executed: judge.executed,
        identitySet: judge.identitySet,
      },
    }
  }

  receipt.r2RejudgeAt = out.at
  writeFileSync(join(dir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  out.needles.push({ id, phases })
}

writeFileSync(
  join(base, 'cleanup-evidence', 'rejudge-r3.json'),
  `${JSON.stringify(out, null, 2)}\n`,
)
console.log(JSON.stringify({ ok: out.allValid, count: out.needles.length }, null, 2))
process.exitCode = out.allValid ? 0 : 1
