import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkDocumentModel } from './document-model.mjs'
import { readGitDocumentSource } from './git-document-source.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (path) => {
  const absolute = resolve(root, path)
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : undefined
}
const config = JSON.parse(read('docs/phase-governance/routing.json'))
const registry = JSON.parse(read('docs/phase-governance/templates/registry.json'))
const issues = checkDocumentModel(config, registry, read, {
  readSource: (pin) => readGitDocumentSource(root, pin),
})
for (const issue of issues) console.error(`- ${issue}`)
console.log(
  `document model: ${issues.length ? 'FAIL' : 'PASS'} (${config.routes.length} routes; ${config.migratedDocuments.length} body contracts; ${issues.length} issues; structure only)`,
)
if (issues.length) process.exitCode = 1
