import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkDocumentModel, checkTemplateBody } from './document-model.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const json = (path) => JSON.parse(read(path))
const digest = (text) => createHash('sha256').update(text).digest('hex')
const cohort = new Set(
  json('docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json').entries.map(
    (entry) => entry.path,
  ),
)
const candidates = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z', 'docs'],
  { cwd: root, encoding: 'utf8' },
)
  .split('\0')
  .filter((path) => /\.(md|json|html)$/.test(path))
const registry = json('docs/phase-governance/document-registry.json')
const templateRegistry = json('docs/phase-governance/templates/registry.json')
const templates = new Map(templateRegistry.types.map((entry) => [entry.templateId, entry]))
const records = new Map()
const issues = checkDocumentModel(
  json('docs/phase-governance/routing.json'),
  templateRegistry,
  read,
)
const completed = []
if (
  registry.entries.some((entry) => entry.historyOverlay) &&
  !templates.get(templateRegistry.historyOverlayTemplateId)?.requiredSections?.length
)
  issues.push('history overlay contract missing')
for (const entry of registry.entries) {
  if (entry.templateCompliance !== 'template-compliant') continue
  if (!records.has(entry.reviewRecord))
    records.set(
      entry.reviewRecord,
      json(`docs/phase-governance/reviews/${entry.reviewRecord}`).entries,
    )
  const record = records.get(entry.reviewRecord).find((value) => value.path === entry.path)
  if (
    !record ||
    record.contentReviewStatus !== 'content-reviewed' ||
    record.templateCompliance !== 'template-compliant'
  ) {
    issues.push(`${entry.path}: missing matching completed review`)
    continue
  }
  const text = read(entry.path)
  const template = templates.get(entry.templateId)
  if (!template) {
    issues.push(`${entry.path}: unknown template`)
    continue
  }
  const bodyIssues = checkTemplateBody(text, template, {
    variant: entry.templateVariant,
    additionalSections: entry.historyOverlay
      ? (templates.get(templateRegistry.historyOverlayTemplateId)?.requiredSections ?? [])
      : [],
  })
  if (digest(text) !== record.afterSha256 || bodyIssues.length) {
    issues.push(`${entry.path}: completed review SHA or body contract drift`)
    continue
  }
  completed.push({
    path: entry.path,
    templateId: entry.templateId,
    reviewRecord: entry.reviewRecord,
    afterSha256: record.afterSha256,
    cohort: cohort.has(entry.path) ? 'approved-baseline' : 'incremental',
  })
}
const done = new Set(completed.map((entry) => entry.path))
const cohortDone = completed.filter((entry) => cohort.has(entry.path)).length
const allCandidates = [...new Set(candidates)]
const pending = allCandidates.filter((path) => !done.has(path))
const templateIds = [...templates.keys()]
const exercised = new Set(completed.map((entry) => entry.templateId))
const report = {
  schemaVersion: 1,
  kind: 'derived-migration-progress',
  policy:
    'Read-only projection of explicit reviewed migrations, SHA and body contracts. Progress is not full acceptance or runtime/E2E/visual/coverage proof. require-complete also demands every current candidate; final semantic audit remains mandatory.',
  approvedCohort: cohort.size,
  cohortMigrated: cohortDone,
  cohortPending: cohort.size - cohortDone,
  currentCandidates: allCandidates.length,
  currentPending: pending.length,
  incrementalMigrated: completed.length - cohortDone,
  exercisedTemplates: [...exercised].sort(),
  pendingTemplates: templateIds.filter((id) => !exercised.has(id)),
  completed,
  issues,
}
const args = process.argv.slice(2)
if (args.some((arg) => !['--json', '--require-complete'].includes(arg)))
  throw new Error(
    'Usage: node scripts/docs/report-governance-progress.mjs [--json] [--require-complete]',
  )
if (args.includes('--json')) console.log(JSON.stringify(report, null, 2))
else
  console.log(
    `migration progress: ${cohortDone}/${cohort.size} baseline + ${completed.length - cohortDone} incremental; ${pending.length} current candidates pending; ${exercised.size}/${templateIds.length} templates exercised; ${issues.length} integrity issues; not full acceptance`,
  )
if (issues.length) process.exitCode = 1
if (
  args.includes('--require-complete') &&
  (cohortDone !== cohort.size || pending.length || report.pendingTemplates.length)
) {
  console.error(
    'full governance incomplete: unread/unmigrated candidates or unexercised templates remain',
  )
  process.exitCode = 1
}
