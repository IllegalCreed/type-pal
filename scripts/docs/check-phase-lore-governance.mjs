import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const docsRoot = resolve(repoRoot, 'docs')
const catalogPath = resolve(docsRoot, 'phase-governance/catalog.json')
const roots = ['lore', 'phase1', 'phase2', 'phase3']
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const issues = []
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))
const expected = []
function walk(root) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const file = resolve(root, entry.name)
    if (entry.isDirectory()) walk(file)
    else if (entry.name.endsWith('.md'))
      expected.push(`docs/${relative(docsRoot, file).replaceAll('\\', '/')}`)
  }
}
for (const root of roots) walk(resolve(docsRoot, root))
const seen = new Set()
for (const entry of catalog.entries ?? []) {
  if (seen.has(entry.path)) issues.push(`duplicate catalog path: ${entry.path}`)
  seen.add(entry.path)
  for (const field of [
    'id',
    'path',
    'phase',
    'module',
    'capability',
    'status',
    'reviewStatus',
    'owner',
    'sourceSha256',
    'afterSha256',
    'sourceRefs',
    'publicCallers',
    'legalInputs',
    'businessOracle',
    'dedupe',
    'revision',
    'evidence',
    'history',
    'supersedes',
    'stopLine',
    'lastReviewed',
  ])
    if (entry[field] === undefined || entry[field] === null || entry[field] === '')
      issues.push(`${entry.path}: missing ${field}`)
  const absolute = resolve(repoRoot, entry.path)
  if (!existsSync(absolute)) issues.push(`catalog path missing: ${entry.path}`)
  else if (digest(absolute) !== entry.afterSha256) issues.push(`after SHA drift: ${entry.path}`)
  if (!/^[a-f\d]{64}$/.test(entry.sourceSha256) || !/^[a-f\d]{64}$/.test(entry.afterSha256))
    issues.push(`invalid SHA: ${entry.path}`)
  if (!Array.isArray(entry.sourceRefs) || !entry.sourceRefs.length)
    issues.push(`sourceRefs empty: ${entry.path}`)
  if (!Array.isArray(entry.history) || !entry.history.length)
    issues.push(`history empty: ${entry.path}`)
  if (!entry.businessOracle?.assertions?.length) issues.push(`businessOracle empty: ${entry.path}`)
  if (!entry.dedupe?.result) issues.push(`dedupe missing: ${entry.path}`)
}
for (const path of expected)
  if (!seen.has(path)) issues.push(`document missing from phase/lore catalog: ${path}`)
for (const path of seen)
  if (!expected.includes(path)) issues.push(`catalog points outside phase/lore roots: ${path}`)
if (catalog.summary?.total !== expected.length)
  issues.push(`catalog summary total ${catalog.summary?.total} != ${expected.length}`)
console.log(
  `phase/lore governance: ${issues.length ? 'FAIL' : 'PASS'} (${expected.length} documents)`,
)
for (const issue of issues) console.error(`- ${issue}`)
if (issues.length) process.exitCode = 1
