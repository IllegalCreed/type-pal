import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { reviewCreditIssues } from './document-integrity.mjs'
import { loadDocumentRegistry } from './document-registry.mjs'
import { readDocumentRetirements } from './document-retirements.mjs'
import { assertReviewRecordSourceUnchanged, loadReviewRecords } from './review-record-storage.mjs'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const registryPath = resolve(repoRoot, 'docs/phase-governance/document-registry.json')
const templateRegistryPath = resolve(repoRoot, 'docs/phase-governance/templates/registry.json')
const strict = process.argv.includes('--strict')
const { registry } = loadDocumentRegistry({ manifestPath: registryPath })
const templates = JSON.parse(readFileSync(templateRegistryPath, 'utf8'))
const templateMap = new Map(templates.types.map((entry) => [entry.docType, entry]))
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const retirements = readDocumentRetirements(repoRoot, registry)
const issues = retirements.issues
const retiredNative = new Set(retirements.nativeEntries.map((entry) => entry.path))
const activeEntries = registry.entries.filter((entry) => !retiredNative.has(entry.path))
const add = (message) => issues.push(message)

for (const root of registry.structuralRoots ?? []) {
  if (!root.path || !root.reason || !root.kind || !root.owner)
    add('structural root declaration incomplete')
  else if (!existsSync(resolve(repoRoot, root.path))) add(`structural root missing: ${root.path}`)
}

const matrixPath = resolve(repoRoot, 'docs/phase-governance/cross-phase-matrix.json')
if (!existsSync(matrixPath)) add('cross-phase matrix missing')
else {
  const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'))
  if (
    !matrix.acceptance?.allRelationshipsExplained ||
    !matrix.acceptance?.unresolvedItemsAreExplicit
  )
    add('cross-phase matrix acceptance flags incomplete')
  for (const row of matrix.rows ?? []) {
    if (!['resolved', 'guarded', 'blocked'].includes(row.status))
      add(`cross-phase matrix ${row.id}: invalid status`)
    if (!row.evidence?.length) add(`cross-phase matrix ${row.id}: evidence missing`)
    if (row.status !== 'resolved' && !row.unresolved?.length)
      add(`cross-phase matrix ${row.id}: unresolved reason missing`)
  }
}
for (const template of templates.types)
  if (!existsSync(resolve(repoRoot, 'docs/phase-governance/templates', template.template)))
    add(`template missing: ${template.template}`)

for (const entry of activeEntries) {
  const template = templateMap.get(entry.docType)
  if (!template) add(`${entry.path}: unknown docType ${entry.docType}`)
  else if (entry.templateId !== template.templateId) add(`${entry.path}: templateId mismatch`)
  if (!existsSync(resolve(repoRoot, entry.path))) add(`${entry.path}: registry path missing`)
  if (
    !['template-compliant', 'governed-legacy', 'legacy-canonical', 'needs-migration'].includes(
      entry.templateCompliance,
    )
  )
    add(`${entry.path}: invalid templateCompliance`)
}

const reviewGroup = loadReviewRecords({ root: repoRoot })
const reviewEntries = new Map()
const reviewDir = resolve(repoRoot, 'docs/phase-governance/reviews')
for (const file of readdirSync(reviewDir).filter((name) => name.endsWith('.json'))) {
  const document = reviewGroup.records.get(`docs/phase-governance/reviews/${file}`)
  for (const entry of document.entries ?? []) {
    if (reviewEntries.has(entry.path)) add(`${entry.path}: duplicate content review record`)
    reviewEntries.set(entry.path, { ...entry, record: file })
  }
}

const required = [
  'path',
  'contentReviewStatus',
  'docType',
  'templateId',
  'templateCompliance',
  'coreConclusion',
  'truthAnchors',
  'unresolved',
  'nextStep',
  'owner',
  'provenance',
  'publicCallers',
  'legalInputs',
  'businessOracle',
  'dedupe',
  'revision',
  'evidence',
  'history',
  'supersedes',
  'stopLine',
  'sourceSha256',
  'afterSha256',
  'reviewedLines',
]
const allowedStatuses = new Set(['content-reviewed', 'partial-review-unknown', 'unread', 'blocked'])
for (const item of activeEntries) {
  const entry = reviewEntries.get(item.path)
  if (!entry) {
    add(`${item.path}: missing content review record`)
    continue
  }
  for (const issue of reviewCreditIssues(item, entry)) add(`${item.path}: ${issue}`)
  for (const field of required)
    if (entry[field] === undefined || entry[field] === null || entry[field] === '')
      add(`${item.path}: missing ${field}`)
  if (!allowedStatuses.has(entry.contentReviewStatus))
    add(`${item.path}: invalid contentReviewStatus`)
  if (!['deep-semantic', 'structured-content', 'partial-semantic'].includes(entry.reviewDepth))
    add(`${item.path}: invalid reviewDepth`)
  if (entry.docType !== item.docType || entry.templateId !== item.templateId)
    add(`${item.path}: review type/template disagrees with registry`)
  if (
    !['template-compliant', 'governed-legacy', 'legacy-canonical', 'needs-migration'].includes(
      entry.templateCompliance,
    )
  )
    add(`${item.path}: invalid review templateCompliance`)
  const absolute = resolve(repoRoot, item.path)
  if (existsSync(absolute)) {
    const current = digest(absolute)
    if (entry.afterSha256 !== current) add(`${item.path}: after SHA drift`)
    if (!/^[a-f\d]{64}$/.test(entry.sourceSha256) || !/^[a-f\d]{64}$/.test(entry.afterSha256))
      add(`${item.path}: invalid content review SHA`)
  }
  if (!Array.isArray(entry.truthAnchors) || !entry.truthAnchors.length)
    add(`${item.path}: truthAnchors empty`)
  if (!Array.isArray(entry.unresolved)) add(`${item.path}: unresolved must be an array`)
  if (!Array.isArray(entry.provenance) || !entry.provenance.length)
    add(`${item.path}: provenance empty`)
  if (!Array.isArray(entry.publicCallers) || !entry.publicCallers.length)
    add(`${item.path}: publicCallers empty`)
  if (!Array.isArray(entry.legalInputs) || !entry.legalInputs.length)
    add(`${item.path}: legalInputs empty`)
  if (
    !entry.businessOracle?.type ||
    !Array.isArray(entry.businessOracle.assertions) ||
    !entry.businessOracle.assertions.length
  )
    add(`${item.path}: businessOracle incomplete`)
  if (!entry.dedupe?.result || !Array.isArray(entry.dedupe.against))
    add(`${item.path}: dedupe incomplete`)
  if (!entry.revision?.currentSha || !Array.isArray(entry.revision.history))
    add(`${item.path}: revision incomplete`)
  if (!entry.evidence?.kind || !entry.evidence?.path) add(`${item.path}: evidence incomplete`)
  if (!Array.isArray(entry.history) || !entry.history.length) add(`${item.path}: history empty`)
  if (!Array.isArray(entry.supersedes)) add(`${item.path}: supersedes must be an array`)
  if (typeof entry.stopLine !== 'string' || !entry.stopLine.trim())
    add(`${item.path}: stopLine empty`)
  if (strict && entry.contentReviewStatus !== 'content-reviewed')
    add(`${item.path}: strict review status is ${entry.contentReviewStatus}`)
  if (strict && entry.templateCompliance === 'needs-migration')
    add(`${item.path}: strict template migration pending`)
}
for (const path of reviewEntries.keys())
  if (!registry.entries.some((entry) => entry.path === path))
    add(`${path}: review record outside governed registry`)

assertReviewRecordSourceUnchanged(reviewGroup.loadedSource)
const counts = {}
for (const entry of activeEntries) {
  const status = reviewEntries.get(entry.path)?.contentReviewStatus ?? 'missing'
  counts[status] = (counts[status] ?? 0) + 1
}
if (strict) {
  const reviewPending = new Set()
  const migrationPending = new Set()
  for (const item of activeEntries) {
    const entry = reviewEntries.get(item.path)
    if (entry?.contentReviewStatus !== 'content-reviewed') reviewPending.add(item.path)
    if (entry?.templateCompliance === 'needs-migration') migrationPending.add(item.path)
  }
  const affected = new Set([...reviewPending, ...migrationPending])
  const both = [...reviewPending].filter((path) => migrationPending.has(path)).length
  console.log(
    `strict workload: ${affected.size} distinct documents; ${reviewPending.size} review pending; ${migrationPending.size} migration pending; ${both} in both groups; ${issues.length} diagnostics (not document count)`,
  )
}
console.log(
  `content review: ${issues.length ? 'FAIL' : 'PASS'} (${activeEntries.length} active documents; ${retiredNative.size} retired native identities; ${registry.summary.total} registered identities; ${JSON.stringify(counts)})`,
)
for (const issue of issues) console.error(`- ${issue}`)
if (strict && (issues.length || counts['content-reviewed'] !== activeEntries.length))
  process.exitCode = 1
else if (!strict && issues.length) process.exitCode = 1
