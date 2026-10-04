import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const testingRoot = resolve(repoRoot, 'docs/testing')
const catalogPath = resolve(testingRoot, 'catalog.json')
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))

function metadata(path) {
  const text = readFileSync(resolve(testingRoot, path), 'utf8')
  const match = /<!-- testing-meta\s*\n([\s\S]*?)\n-->/m.exec(text)
  return match ? JSON.parse(match[1]) : null
}

let changed = 0
for (const entry of catalog.entries) {
  const meta = metadata(entry.canonical)
  if (!meta) continue
  const next = JSON.stringify(meta.dedupe)
  if (JSON.stringify(entry.dedupe) === next) continue
  entry.dedupe = meta.dedupe
  const evidencePath = resolve(testingRoot, entry.evidence)
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'))
  evidence.dedupe = meta.dedupe
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)
  changed++
}
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(`testing catalog references synchronized: ${changed}`)
