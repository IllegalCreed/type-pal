import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const testingRoot = resolve(repoRoot, 'docs/testing')
const digest = (path) =>
  createHash('sha256')
    .update(readFileSync(resolve(repoRoot, path)))
    .digest('hex')
const sourceRefs = [
  {
    path: 'scripts/docs/classify-testing-legacy.mjs',
    lines: '24-45',
    anchor: 'const domainRules = [',
    role: 'classification rules',
    sha256: digest('scripts/docs/classify-testing-legacy.mjs'),
  },
  {
    path: 'docs/testing/legacy-flat.json',
    lines: '1-20',
    anchor: '"schemaVersion": 1',
    role: 'legacy manifest',
    sha256: digest('docs/testing/legacy-flat.json'),
  },
  {
    path: 'packages/content/src/character.ts',
    lines: '168-170',
    anchor: 'export const CONTENT_VERSION =',
    role: 'current version',
    sha256: digest('packages/content/src/character.ts'),
  },
  {
    path: 'docs/testing/archive/migrations/legacy-full-closeout-plan.json',
    lines: '1-16',
    anchor: '"id": "legacy-full-closeout-plan"',
    role: 'full closeout plan',
    sha256: digest('docs/testing/archive/migrations/legacy-full-closeout-plan.json'),
  },
  {
    path: 'docs/testing/archive/migrations/legacy-full-closeout-relocation.json',
    lines: '1-16',
    anchor: '"id": "legacy-full-closeout-relocation"',
    role: 'relocation plan',
    sha256: digest('docs/testing/archive/migrations/legacy-full-closeout-relocation.json'),
  },
]

const canonicalPath = resolve(testingRoot, 'domains/ops/testing-governance/legacy-flat-audit.md')
const evidencePath = resolve(testingRoot, 'domains/ops/testing-governance/legacy-flat-audit.json')
const catalogPath = resolve(testingRoot, 'catalog.json')
const canonicalText = readFileSync(canonicalPath, 'utf8')
const metadataMatch = /<!-- testing-meta\s*\n([\s\S]*?)\n-->/m.exec(canonicalText)
if (!metadataMatch) throw new Error('legacy-flat-audit canonical metadata missing')
const metadata = JSON.parse(metadataMatch[1])
metadata.sourceRefs = sourceRefs
metadata.dedupe = {
  result: 'reviewed',
  against: [
    'docs/testing/legacy-flat-classification.json',
    'docs/testing/archive/migrations/legacy-full-closeout-plan.json',
    'docs/testing/archive/migrations/legacy-full-closeout-relocation.json',
    'docs/testing/catalog.json',
  ],
  notes:
    'The closeout plan is the complete 331-item decision ledger; archive moves preserve source SHA, while tools remain only with explicit stop lines.',
}
const closeoutHistoryEntry = {
  revision: 'fecf1dab93468b40752667987c7c75a29fe9af6b',
  date: '2026-10-04',
  action: 'legacy full closeout: 209 archive moves + 122 tool stop-lines',
  notRun: ['product runtime', 'old tests', 'coverage'],
}
metadata.revision = {
  ...metadata.revision,
  currentSha: 'fecf1dab93468b40752667987c7c75a29fe9af6b',
  history: [...(metadata.revision?.history ?? [])].filter(
    (item, index, values) =>
      index === values.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(item)),
  ),
}
if (!metadata.revision.history.some((item) => item.action === closeoutHistoryEntry.action))
  metadata.revision.history.push(closeoutHistoryEntry)
const nextCanonical = canonicalText.replace(metadataMatch[1], JSON.stringify(metadata))
writeFileSync(canonicalPath, nextCanonical)

const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'))
evidence.sourceRefs = sourceRefs
evidence.dedupe = metadata.dedupe
evidence.candidateSha = metadata.revision.currentSha
evidence.history = metadata.revision.history
evidence.claims = [
  {
    id: 'full-census',
    result: 'source-backed',
    evidence: ['scripts/docs/classify-testing-legacy.mjs:24-45'],
  },
  {
    id: 'closeout-plan',
    result: 'source-backed',
    evidence: ['docs/testing/archive/migrations/legacy-full-closeout-plan.json:1-16'],
  },
  {
    id: 'archive-moves',
    result: 'source-backed',
    evidence: ['docs/testing/archive/migrations/legacy-full-closeout-relocation.json:1-16'],
  },
]
evidence.artifacts = [
  { path: 'legacy-flat-classification.json', kind: 'classification-ledger' },
  { path: 'archive/migrations/legacy-full-closeout-plan.json', kind: 'closeout-plan' },
  { path: 'archive/migrations/legacy-full-closeout-relocation.json', kind: 'relocation-plan' },
]
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))
const entry = catalog.entries.find((candidate) => candidate.id === 'legacy-flat-audit')
if (!entry) throw new Error('legacy-flat-audit catalog entry missing')
entry.sourceRefs = sourceRefs
entry.dedupe = metadata.dedupe
entry.revision = metadata.revision
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log('legacy-flat-audit metadata refreshed')
