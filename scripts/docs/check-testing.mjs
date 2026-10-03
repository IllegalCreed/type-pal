import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog, renderIndexes } from './generate-testing-index.mjs'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const testingRoot = resolve(repoRoot, 'docs/testing')
const statuses = new Set([
  'draft',
  'active',
  'verified',
  'rework',
  'superseded',
  'archived',
  'proposal',
  'current',
])
const allowedRootFiles = new Set(['README.md', 'catalog.json', 'governance.md', 'legacy-flat.json'])

const fail = (issues, message) => issues.push(message)
const read = (path) => JSON.parse(readFileSync(path, 'utf8'))

export function validateCatalog(
  catalog,
  root = testingRoot,
  today = new Date().toISOString().slice(0, 10),
) {
  const issues = []
  if (catalog.schemaVersion !== 1) fail(issues, 'catalog.schemaVersion must be 1')
  const seen = new Set()
  for (const entry of catalog.entries ?? []) {
    if (!entry.id || seen.has(entry.id))
      fail(issues, `duplicate or missing id: ${entry.id ?? '<missing>'}`)
    seen.add(entry.id)
    for (const field of [
      'kind',
      'title',
      'status',
      'phase',
      'engines',
      'owner',
      'canonical',
      'index',
      'tags',
      'lastVerified',
      'reviewBy',
      'dependsOn',
    ])
      if (entry[field] === undefined) fail(issues, `${entry.id}: missing ${field}`)
    if (!statuses.has(entry.status)) fail(issues, `${entry.id}: invalid status ${entry.status}`)
    for (const path of [entry.canonical, entry.index])
      if (!path || !existsSync(resolve(root, path)))
        fail(issues, `${entry.id}: missing path ${path}`)
    if (entry.reviewBy < today && !['archived', 'superseded'].includes(entry.status))
      fail(issues, `${entry.id}: reviewBy ${entry.reviewBy} is before ${today}`)
    const stageReadme = resolve(root, entry.index ?? '')
    if (
      entry.kind === 'e2e-stage' &&
      (!existsSync(stageReadme) || !readFileSync(stageReadme, 'utf8').includes(`id: ${entry.id}`))
    )
      fail(issues, `${entry.id}: stage README metadata does not match catalog`)
  }
  const ids = new Set(catalog.entries.map((entry) => entry.id))
  for (const entry of catalog.entries)
    for (const dep of entry.dependsOn ?? [])
      if (!ids.has(dep)) fail(issues, `${entry.id}: unknown dependency ${dep}`)
  return issues
}

export function validateIndexes(catalog, root = testingRoot) {
  const issues = []
  for (const [name, expected] of Object.entries(renderIndexes(catalog))) {
    const path = resolve(root, 'indexes', name)
    if (!existsSync(path)) issues.push(`missing generated index ${relative(repoRoot, path)}`)
    else if (readFileSync(path, 'utf8') !== expected)
      issues.push(`stale generated index ${relative(repoRoot, path)}`)
  }
  return issues
}

export function validateLegacyFlat(
  root = testingRoot,
  today = new Date().toISOString().slice(0, 10),
) {
  const issues = []
  const manifestPath = resolve(root, 'legacy-flat.json')
  if (!existsSync(manifestPath)) return ['missing docs/testing/legacy-flat.json']
  const manifest = read(manifestPath)
  const listed = new Map((manifest.entries ?? []).map((entry) => [entry.path, entry]))
  for (const name of readdirSync(root, { withFileTypes: true })) {
    if (!name.isFile() || allowedRootFiles.has(name.name)) continue
    const entry = listed.get(name.name)
    if (!entry) issues.push(`new flat testing file is not registered: ${name.name}`)
    else if (!entry.migrateBy || entry.migrateBy < today)
      issues.push(`legacy flat file needs migration review: ${name.name}`)
  }
  for (const entry of manifest.entries ?? [])
    if (!existsSync(resolve(root, entry.path)))
      issues.push(`legacy manifest points to missing file: ${entry.path}`)
  return issues
}

export function auditTestingDocs({ root = testingRoot, today } = {}) {
  const catalog = loadCatalog(root)
  return [
    ...validateCatalog(catalog, root, today),
    ...validateIndexes(catalog, root),
    ...validateLegacyFlat(root, today),
  ]
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const issues = auditTestingDocs()
  console.log(`testing docs: ${issues.length ? 'FAIL' : 'PASS'} (${issues.length} issues)`)
  for (const issue of issues) console.error(`- ${issue}`)
  if (issues.length) process.exitCode = 1
}
