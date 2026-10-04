import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const registryPath = resolve(repoRoot, 'docs/phase-governance/document-registry.json')
const templateRegistryPath = resolve(repoRoot, 'docs/phase-governance/templates/registry.json')
const strict = process.argv.includes('--strict')
const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
const templates = JSON.parse(readFileSync(templateRegistryPath, 'utf8'))
const templateMap = new Map(templates.types.map((entry) => [entry.docType, entry]))
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const issues = []
const add = (message) => issues.push(message)

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

for (const entry of registry.entries ?? []) {
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

const reviewEntries = new Map()
const reviewDir = resolve(repoRoot, 'docs/phase-governance/reviews')
for (const file of readdirSync(reviewDir).filter((name) => name.endsWith('.json'))) {
  const document = JSON.parse(readFileSync(resolve(reviewDir, file), 'utf8'))
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
for (const item of registry.entries ?? []) {
  const entry = reviewEntries.get(item.path)
  if (!entry) {
    add(`${item.path}: missing content review record`)
    continue
  }
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

const counts = {}
for (const entry of registry.entries ?? []) {
  const status = reviewEntries.get(entry.path)?.contentReviewStatus ?? 'missing'
  counts[status] = (counts[status] ?? 0) + 1
}
console.log(
  `content review: ${issues.length ? 'FAIL' : 'PASS'} (${registry.summary.total} documents; ${JSON.stringify(counts)})`,
)
for (const issue of issues) console.error(`- ${issue}`)
if (strict && (issues.length || counts['content-reviewed'] !== registry.summary.total))
  process.exitCode = 1
else if (!strict && issues.length) process.exitCode = 1
