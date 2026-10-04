import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const testingRoot = resolve(repoRoot, 'docs/testing')
const outputPath = resolve(testingRoot, 'archive/migrations/testing-layout-closeout-20261004.json')
const allowedRoot = new Set([
  'README.md',
  '_templates',
  'archive',
  'catalog.json',
  'domains',
  'e2e',
  'governance.md',
  'indexes',
  'legacy-flat-classification.json',
  'legacy-flat.json',
])
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const manifest = JSON.parse(readFileSync(resolve(testingRoot, 'legacy-flat.json'), 'utf8'))
const classification = JSON.parse(
  readFileSync(resolve(testingRoot, 'legacy-flat-classification.json'), 'utf8'),
)
const classificationByPath = new Map(classification.entries.map((entry) => [entry.path, entry]))
const fullPlan = JSON.parse(
  readFileSync(resolve(testingRoot, 'archive/migrations/legacy-full-closeout-plan.json'), 'utf8'),
)
const fullEntries = (fullPlan.entryFiles ?? []).flatMap(
  (file) => JSON.parse(readFileSync(resolve(testingRoot, file), 'utf8')).entries,
)
const fullByPath = new Map(fullEntries.map((entry) => [entry.path, entry]))

function walk(root, prefix = '') {
  const files = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const child = join(root, entry.name)
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...walk(child, rel))
    else files.push(rel)
  }
  return files
}

const roots = readdirSync(testingRoot, { withFileTypes: true }).filter(
  (entry) => !allowedRoot.has(entry.name),
)
const toolEntries = manifest.entries.filter((entry) => entry.kind === 'tool')
const toolTargets = new Map()
for (const entry of toolEntries) {
  const classificationEntry = classificationByPath.get(entry.path)
  if (!classificationEntry) throw new Error(`Missing classification for ${entry.path}`)
  const target = `domains/${classificationEntry.domain}/${classificationEntry.module}/tools/${classificationEntry.capability}${extname(entry.path)}`
  if (toolTargets.has(target)) throw new Error(`Tool target collision: ${target}`)
  toolTargets.set(target, entry.path)
}

const entries = []
const directories = {}
for (const root of roots) {
  if (root.isDirectory()) {
    directories[`docs/testing/${root.name}`] = `docs/testing/archive/legacy/batches/${root.name}`
    for (const file of walk(join(testingRoot, root.name))) {
      const from = `docs/testing/${root.name}/${file}`
      const absolute = resolve(repoRoot, from)
      entries.push({
        from,
        to: `docs/testing/archive/legacy/batches/${root.name}/${file}`,
        sha256: digest(readFileSync(absolute)),
        kind: 'batch-history',
        domain: 'ops',
        module: 'testing-records',
        capability: root.name,
        resolution: 'archive-history',
        stopLine: 'history only; never use as a current contract or runtime/coverage proof',
        governanceTask: 'docs/ops/archive/tasks/done/TESTING-DOC-GOVERNANCE-1-depth.md',
      })
    }
    continue
  }
  const classificationEntry = classificationByPath.get(root.name)
  if (!classificationEntry || classificationEntry.kind !== 'tool')
    throw new Error(`Unclassified root file outside whitelist: ${root.name}`)
  const manifestEntry = manifest.entries.find((entry) => entry.path === root.name)
  const fullEntry = fullByPath.get(root.name)
  const target = `domains/${classificationEntry.domain}/${classificationEntry.module}/tools/${classificationEntry.capability}${extname(root.name)}`
  entries.push({
    from: `docs/testing/${root.name}`,
    to: `docs/testing/${target}`,
    sha256: digest(readFileSync(resolve(testingRoot, root.name))),
    kind: 'tool',
    domain: classificationEntry.domain,
    module: classificationEntry.module,
    capability: classificationEntry.capability,
    sourceSha: classificationEntry.sourceSha,
    publicCallers: fullEntry?.publicCallers ?? [],
    toolImports: fullEntry?.toolImports ?? [],
    toolAudit: fullEntry?.toolAudit ?? null,
    legalInputs: fullEntry?.legalInputs ?? [],
    businessOracle: fullEntry?.businessOracle ?? null,
    dedupe: fullEntry?.dedupe ?? null,
    revision: fullEntry?.revision ?? null,
    supersedes: fullEntry?.supersedes ?? [`docs/testing/${root.name}`],
    retentionDeadline: manifestEntry?.migrateBy ?? null,
    governanceTask: 'docs/ops/archive/tasks/done/TESTING-DOC-GOVERNANCE-1-depth.md',
    resolution: 'migrate-canonical-tool',
    stopLine:
      'do not claim runtime success from relocation; verify imports, cwd, runner, temporary tree and cleanup after move',
  })
}

const output = {
  schemaVersion: 1,
  id: 'testing-layout-closeout-20261004',
  generatedBy: 'scripts/docs/build-testing-layout-closeout.mjs',
  sourceRevision: '12247f7e389bad300e3b20388ae8a9196386e191',
  policy:
    'Root-level legacy tools move to domain/module/tools; Agent/batch directories move to archive/legacy/batches. No file is deleted.',
  rootWhitelist: [...allowedRoot].sort(),
  summary: {
    rootEntriesBefore: roots.length,
    files: entries.length,
    tools: entries.filter((entry) => entry.kind === 'tool').length,
    batchHistory: entries.filter((entry) => entry.kind === 'batch-history').length,
  },
  directories,
  entries,
}
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(JSON.stringify(output.summary, null, 2))
