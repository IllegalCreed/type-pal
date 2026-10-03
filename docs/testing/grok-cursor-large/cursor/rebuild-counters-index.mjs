#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = process.cwd()
const dir = resolve(root, 'docs/testing/grok-cursor-large/cursor/counters')
const counters = []
for (const id of readdirSync(dir)) {
  const receiptPath = join(dir, id, 'receipt.json')
  if (!existsSync(receiptPath)) continue
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'))
  const classification =
    receipt.classification ??
    (receipt.countsTowardNetNewTargets === false ? 'existing-proof-cross-check' : 'net-new-target')
  const countsTowardNetNewTargets =
    receipt.countsTowardNetNewTargets ?? classification !== 'existing-proof-cross-check'
  counters.push({
    id: receipt.id ?? id,
    productFile: receipt.productFile,
    expectFullname: receipt.expectFullname,
    classification,
    countsTowardNetNewTargets,
    dir: `docs/testing/grok-cursor-large/cursor/counters/${id}`,
  })
}
counters.sort((a, b) => a.id.localeCompare(b.id))
const distinctTargets = new Set(counters.map((c) => c.expectFullname)).size
const netNewTargets = counters.filter((c) => c.countsTowardNetNewTargets).length
const crossCheck = counters.filter((c) => !c.countsTowardNetNewTargets).length
const payload = {
  generatedAt: new Date().toISOString(),
  valid: counters.length,
  distinctTargets,
  netNewTargets,
  existingProofCrossCheck: crossCheck,
  counters,
}
writeFileSync(
  resolve(root, 'docs/testing/grok-cursor-large/cursor/counters.json'),
  `${JSON.stringify(payload, null, 2)}\n`,
)
console.log(
  JSON.stringify({
    valid: counters.length,
    distinctTargets,
    netNewTargets,
    existingProofCrossCheck: crossCheck,
  }),
)
