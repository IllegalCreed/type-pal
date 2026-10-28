import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { currentReviewLedgerAdmissions } from './current-review-ledger-admission.mjs'
import { checkDocumentModel, checkMigratedDocument } from './document-model.mjs'
import { loadDocumentRegistry } from './document-registry.mjs'
import { readDocumentRetirements } from './document-retirements.mjs'
import { frozenDocumentBaseline, inspectFrozenDocumentBaseline } from './frozen-document-source.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { readGitDocumentSource } from './git-document-source.mjs'
import { readGitHtmlSnapshot } from './git-html-snapshot.mjs'
import { gitInventory } from './git-inventory.mjs'
import {
  historicalDeliveryContract,
  historicalDeliveryPilots,
} from './historical-document-delivery-native.mjs'
import { historicalHtmlAdmissions } from './historical-html-admission.mjs'
import { nativeArtifactBindings } from './historical-native-artifact-admission.mjs'
import { nativeFamilyAdmissions } from './historical-native-family-admission.mjs'
import { historicalVitestContract } from './historical-vitest-native.mjs'
import { assertReviewRecordSourceUnchanged, loadReviewRecords } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const readBuffer = (path) => {
  try {
    return readFileSync(resolve(root, path))
  } catch {
    return undefined
  }
}
const read = (path) => readBuffer(path)?.toString('utf8')
const json = (path) => JSON.parse(read(path))
const digest = (text) => createHash('sha256').update(text).digest('hex')
let reviewGroup
const reviewReader = (path) => {
  reviewGroup ??= loadReviewRecords({
    root,
    ...(routing.migratedDocuments.some((doc) =>
      currentReviewLedgerAdmissions.some((p) => p.path === doc.path),
    )
      ? {}
      : { logicalPaths: [...requiredReviews] }),
  })
  return reviewGroup.records.get(path)
}
const sourceOptions = {
  reviewGroupReader: () => {
    reviewGroup ??= loadReviewRecords({ root })
    return reviewGroup
  },
  reviewReader,
  readSource: (pin) => readGitDocumentSource(root, pin),
  readBuffer,
  readSourceBuffer: (pin) => readGitDocumentSnapshot(root, pin),
  readHtmlSourceBuffer: (pin) => readGitHtmlSnapshot(root, pin),
}
const baseline = inspectFrozenDocumentBaseline(read, sourceOptions.readSource, sourceOptions)
const cohort = new Set(baseline.entries.map((entry) => entry.path))
const candidates = gitInventory(root, ['docs']).filter((path) => /\.(md|json|html)$/.test(path))
const { registry } = loadDocumentRegistry({
  manifestPath: resolve(root, 'docs/phase-governance/document-registry.json'),
})
const retirements = readDocumentRetirements(root, registry)
const retired = new Set(retirements.entries.map((entry) => entry.path))
const structuralRoots = new Set(
  (registry.structuralRoots ?? []).map((entry) => entry.path).filter(Boolean),
)
const templateRegistry = json('docs/phase-governance/templates/registry.json')
const templates = new Map(templateRegistry.types.map((entry) => [entry.templateId, entry]))
const records = new Map()
const routing = json('docs/phase-governance/routing.json')
const requiredReviews = new Set(
  registry.entries
    .filter((entry) => entry.templateCompliance === 'template-compliant' && !entry.artifactOnly)
    .map((entry) => `docs/phase-governance/reviews/${entry.reviewRecord}`),
)
if (routing.migratedDocuments.some((doc) => doc.variant === historicalVitestContract.variant))
  requiredReviews.add(historicalVitestContract.reviewRecord)
for (const pilot of [
  ...nativeFamilyAdmissions,
  ...historicalHtmlAdmissions,
  ...nativeArtifactBindings.filter((entry) => !entry.existingVariant),
])
  if (routing.migratedDocuments.some((doc) => doc.path === pilot.path))
    requiredReviews.add(pilot.reviewRecord)
for (const pilot of historicalDeliveryPilots)
  if (
    routing.migratedDocuments.some(
      (doc) => doc.path === pilot.path && doc.variant === historicalDeliveryContract.variant,
    )
  )
    requiredReviews.add(pilot.reviewRecord)
const issues = [
  ...baseline.issues,
  ...retirements.issues,
  ...checkDocumentModel(routing, templateRegistry, read, sourceOptions),
]
const completed = []
if (
  registry.entries.some((entry) => entry.historyOverlay) &&
  !templates.get(templateRegistry.historyOverlayTemplateId)?.requiredSections?.length
)
  issues.push('history overlay contract missing')
for (const entry of registry.entries) {
  if (entry.templateCompliance !== 'template-compliant') continue
  // Storage flags are not approved native-format/semantic completion contracts.
  if (entry.artifactOnly) continue
  if (!records.has(entry.reviewRecord))
    records.set(
      entry.reviewRecord,
      reviewReader(`docs/phase-governance/reviews/${entry.reviewRecord}`).entries,
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
  const document = {
    path: entry.path,
    templateId: entry.templateId,
    variant: entry.templateVariant,
    historyOverlay: entry.historyOverlay,
  }
  const bodyIssues = checkMigratedDocument(document, templateRegistry, read, sourceOptions)
  const routes = routing.migratedDocuments.filter((route) => route.path === entry.path)
  if (
    routes.length !== 1 ||
    routes[0].templateId !== document.templateId ||
    routes[0].variant !== document.variant ||
    Boolean(routes[0].historyOverlay) !== Boolean(document.historyOverlay)
  )
    bodyIssues.push('completed review requires one matching migrated route')
  const afterBytes = entry.path === frozenDocumentBaseline.path ? readBuffer(entry.path) : text
  const afterDigest = afterBytes === undefined ? undefined : digest(afterBytes)
  if (afterDigest !== record.afterSha256 || bodyIssues.length) {
    if (afterDigest !== record.afterSha256) issues.push(`${entry.path}: completed review SHA drift`)
    issues.push(...bodyIssues.map((issue) => `${entry.path}: ${issue}`))
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
// Only the protected loader's exact, fully reconciled physical set is a storage
// artifact. A directory prefix alone never removes a document from the census.
reviewGroup ??= loadReviewRecords({ root, logicalPaths: [...requiredReviews] })
const reviewStorageArtifacts = reviewGroup.loadedSource.artifactSet
const artifactPaths = new Set(reviewStorageArtifacts.map((entry) => entry.path))
for (const path of artifactPaths)
  if (cohort.has(path) || registry.entries.some((entry) => entry.path === path))
    issues.push(`${path}: storage artifact conflicts with a governed document identity`)
const allCandidates = [...new Set(candidates)]
const governedCandidates = allCandidates.filter(
  (path) => !structuralRoots.has(path) && !retired.has(path) && !artifactPaths.has(path),
)
const pending = governedCandidates.filter((path) => !done.has(path))
const templateIds = [...templates.keys()]
const exercised = new Set(completed.map((entry) => entry.templateId))
const report = {
  schemaVersion: 1,
  kind: 'derived-migration-progress',
  policy:
    'Read-only projection of reviewed migrations and verified lifecycle retirements, counted separately against the unchanged cohort. Retirement grants no content/template migration credit. Progress is not full acceptance or runtime/E2E/visual/coverage proof; every current candidate and the final semantic audit remain required.',
  approvedCohort: frozenDocumentBaseline.denominator,
  cohortMigrated: cohortDone,
  cohortRetired: retired.size,
  cohortPending: frozenDocumentBaseline.denominator - cohortDone - retired.size,
  currentCandidates: governedCandidates.length,
  currentPending: pending.length,
  reviewStorageArtifacts,
  incrementalMigrated: completed.length - cohortDone,
  exercisedTemplates: [...exercised].sort(),
  pendingTemplates: templateIds.filter((id) => !exercised.has(id)),
  completed,
  retired: retirements.entries.map((entry) => ({ path: entry.path, source: entry.source })),
  issues,
}
const args = process.argv.slice(2)
if (args.some((arg) => !['--json', '--require-complete'].includes(arg)))
  throw new Error(
    'Usage: node scripts/docs/report-governance-progress.mjs [--json] [--require-complete]',
  )
if (reviewGroup) assertReviewRecordSourceUnchanged(reviewGroup.loadedSource)
if (args.includes('--json')) console.log(JSON.stringify(report, null, 2))
else
  console.log(
    `migration progress: ${cohortDone}/${frozenDocumentBaseline.denominator} baseline migrated, ${retired.size} explicitly retired + ${completed.length - cohortDone} incremental; ${pending.length} current candidates pending; ${exercised.size}/${templateIds.length} templates exercised; ${issues.length} integrity issues; not full acceptance`,
  )
if (issues.length) process.exitCode = 1
if (
  args.includes('--require-complete') &&
  (cohortDone + retired.size !== frozenDocumentBaseline.denominator ||
    pending.length ||
    report.pendingTemplates.length)
) {
  console.error(
    'full governance incomplete: unread/unmigrated candidates or unexercised templates remain',
  )
  process.exitCode = 1
}
