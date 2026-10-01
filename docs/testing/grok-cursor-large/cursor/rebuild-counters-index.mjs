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
  counters.push({
    id: receipt.id ?? id,
    productFile: receipt.productFile,
    expectFullname: receipt.expectFullname,
    dir: `docs/testing/grok-cursor-large/cursor/counters/${id}`,
  })
}
counters.sort((a, b) => a.id.localeCompare(b.id))
writeFileSync(
  resolve(root, 'docs/testing/grok-cursor-large/cursor/counters.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), valid: counters.length, counters }, null, 2)}\n`,
)
console.log(JSON.stringify({ valid: counters.length }))
