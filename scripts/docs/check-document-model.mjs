import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkDocumentModel } from './document-model.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { readGitDocumentSource } from './git-document-source.mjs'
import { assertReviewRecordSourceUnchanged, loadReviewRecords } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const readBuffer = (path) => {
  try {
    return readFileSync(resolve(root, path))
  } catch {
    return undefined
  }
}
const read = (path) => {
  const absolute = resolve(root, path)
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : undefined
}
const config = JSON.parse(read('docs/phase-governance/routing.json'))
const registry = JSON.parse(read('docs/phase-governance/templates/registry.json'))
// C04: protected review reader — materializes flat or sharded reviews through the safe loader
let reviewGroup
const reviewReader = (logicalPath) => {
  reviewGroup ??= loadReviewRecords({ root, logicalPaths: [logicalPath] })
  return reviewGroup.records.get(logicalPath)
}
const issues = checkDocumentModel(config, registry, read, {
  readSource: (pin) => readGitDocumentSource(root, pin),
  readBuffer,
  readSourceBuffer: (pin) => readGitDocumentSnapshot(root, pin),
  reviewReader,
})
if (reviewGroup) assertReviewRecordSourceUnchanged(reviewGroup.loadedSource)
for (const issue of issues) console.error(`- ${issue}`)
console.log(
  `document model: ${issues.length ? 'FAIL' : 'PASS'} (${config.routes.length} routes; ${config.migratedDocuments.length} body contracts; ${issues.length} issues; structure only)`,
)
if (issues.length) process.exitCode = 1
