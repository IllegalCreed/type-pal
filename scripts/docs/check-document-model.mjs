import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { currentReviewLedgerAdmissions } from './current-review-ledger-admission.mjs'
import { loadDocumentLocations } from './document-location.mjs'
import { checkDocumentModel } from './document-model.mjs'
import { cacheGitSnapshots, createGitDocumentSnapshotReader } from './git-document-snapshot.mjs'
import { readGitDocumentSource } from './git-document-source.mjs'
import { readGitHtmlSnapshot } from './git-html-snapshot.mjs'
import { historicalHtmlAdmissions } from './historical-html-admission.mjs'
import { nativeArtifactBindings } from './historical-native-artifact-admission.mjs'
import { nativeFamilyAdmissions } from './historical-native-family-admission.mjs'
import { createIncrementalGitSourceReader } from './incremental-git-source.mjs'
import { inspectIncrementalCohort } from './incremental-review.mjs'
import { assertReviewRecordSourceUnchanged, loadReviewRecords } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const locations = loadDocumentLocations(root)
const readBuffer = (path) => {
  if (locations) return locations.readBuffer(path)
  try {
    return readFileSync(resolve(root, path))
  } catch {
    return undefined
  }
}
const read = (path) => readBuffer(path)?.toString('utf8')
const config = JSON.parse(read('docs/phase-governance/routing.json'))
const registry = JSON.parse(read('docs/phase-governance/templates/registry.json'))
const pilotReviews = [
  ...nativeFamilyAdmissions,
  ...historicalHtmlAdmissions,
  ...nativeArtifactBindings.filter((entry) => !entry.existingVariant),
]
  .filter((pilot) => config.migratedDocuments.some((doc) => doc.path === pilot.path))
  .map((pilot) => pilot.reviewRecord)
// C04: protected review reader — materializes flat or sharded reviews through the safe loader
let reviewGroup
const reviewReader = (logicalPath) => {
  reviewGroup ??= loadReviewRecords({
    root,
    ...(config.migratedDocuments.some((doc) =>
      currentReviewLedgerAdmissions.some((p) => p.path === doc.path),
    )
      ? {}
      : { logicalPaths: [...new Set([logicalPath, ...pilotReviews])] }),
  })
  return reviewGroup.records.get(logicalPath)
}
const reviewGroupReader = () => {
  reviewGroup ??= loadReviewRecords({ root })
  return reviewGroup
}
const issues = checkDocumentModel(config, registry, read, {
  root,
  locations,
  readSource: (pin) => readGitDocumentSource(root, pin),
  readBuffer,
  readSourceBuffer: cacheGitSnapshots(createGitDocumentSnapshotReader(root)),
  readIncrementalSourceBuffer: createIncrementalGitSourceReader(root, () =>
    inspectIncrementalCohort(reviewGroupReader().records)?.rows.map((row) => row.primarySource[0]),
  ),
  readHtmlSourceBuffer: cacheGitSnapshots((pin) => readGitHtmlSnapshot(root, pin)),
  reviewReader,
  reviewGroupReader,
})
locations?.assertUnchanged()
if (reviewGroup) assertReviewRecordSourceUnchanged(reviewGroup.loadedSource)
for (const issue of issues) console.error(`- ${issue}`)
console.log(
  `document model: ${issues.length ? 'FAIL' : 'PASS'} (${locations?.manifest.routing.routes.length ?? config.routes.length} routes; ${config.migratedDocuments.length} inherited body contracts; ${locations?.additions.size ?? 0} additions; ${issues.length} issues; structure only)`,
)
if (issues.length) process.exitCode = 1
