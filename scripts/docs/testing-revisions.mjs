import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCatalog } from './check-testing.mjs'
import { loadCatalog, repoRoot } from './generate-testing-index.mjs'

const shaPattern = /^[a-f\d]{40}$/
const digestPattern = /^[a-f\d]{64}$/

// Matching is limited to declared boundaries. A different HEAD alone is not evidence of drift.
export function compareEvidenceRevision(entry, current) {
  const revision = entry.revision ?? {}
  const candidates = revision.currentSha ? [revision.currentSha] : (revision.currentShas ?? [])
  const differences = []
  const missing = []
  if (!candidates.length || !candidates.every((sha) => shaPattern.test(sha)))
    missing.push('recorded candidate SHA')
  if (!shaPattern.test(current.head ?? '')) missing.push('current HEAD')
  for (const field of ['contentVersion', 'minimumSaveVersion']) {
    if (!Number.isInteger(revision[field]) || !Number.isInteger(current[field])) missing.push(field)
    else if (revision[field] !== current[field])
      differences.push({ field, recorded: revision[field], current: current[field] })
  }
  if (!entry.sourceRefs?.length) missing.push('sourceRefs')
  for (const ref of entry.sourceRefs ?? []) {
    const actual = current.sourceHashes.get(ref.path)
    if (!digestPattern.test(ref.sha256 ?? '') || !digestPattern.test(actual ?? ''))
      missing.push(`source:${ref.path}`)
    else if (ref.sha256 !== actual)
      differences.push({ field: `source:${ref.path}`, recorded: ref.sha256, current: actual })
  }
  return {
    id: entry.id,
    publicationStatus: entry.status,
    lastVerified: entry.lastVerified,
    recorded: {
      candidates,
      contentVersion: revision.contentVersion,
      minimumSaveVersion: revision.minimumSaveVersion,
    },
    current: {
      head: current.head,
      contentVersion: current.contentVersion,
      minimumSaveVersion: current.minimumSaveVersion,
    },
    candidateMatches: candidates.includes(current.head),
    comparison: differences.length ? 'changed' : missing.length ? 'unknown' : 'matching',
    differences,
    missing,
    scope: 'Declared version/source boundaries only; not a new runtime, E2E or visual result.',
  }
}

function readVersion(source, name) {
  const match = new RegExp(`^export const ${name} = (\\d+) as const$`, 'm').exec(source)
  if (!match) throw new Error(`Cannot read current ${name} from content/character.ts`)
  return Number(match[1])
}

export function readEvidenceRevisions(root = repoRoot, ids = []) {
  const testing = resolve(root, 'docs/testing')
  const catalog = loadCatalog(testing)
  const issues = validateCatalog(catalog, testing)
  if (issues.length) throw new Error(issues.join('\n'))
  for (const id of ids)
    if (!catalog.entries.some((entry) => entry.id === id))
      throw new Error(`Unknown testing catalog ID: ${id}`)
  const entries = catalog.entries.filter((entry) =>
    ids.length ? ids.includes(entry.id) : entry.kind === 'e2e-stage',
  )
  const source = readFileSync(resolve(root, 'packages/content/src/character.ts'), 'utf8')
  const current = {
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    contentVersion: readVersion(source, 'CONTENT_VERSION'),
    minimumSaveVersion: readVersion(source, 'CURRENT_PROJECT_MINIMUM_SAVE_VERSION'),
    sourceHashes: new Map(),
  }
  for (const entry of entries)
    for (const ref of entry.sourceRefs) {
      if (current.sourceHashes.has(ref.path)) continue
      if (
        isAbsolute(ref.path) ||
        ref.path.includes('\\') ||
        ref.path.split('/').some((part) => !part || part === '..' || part === '.')
      )
        throw new Error(`Unsafe sourceRef path: ${ref.path}`)
      try {
        current.sourceHashes.set(
          ref.path,
          createHash('sha256')
            .update(readFileSync(resolve(root, ref.path)))
            .digest('hex'),
        )
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
        current.sourceHashes.set(ref.path, null)
      }
    }
  return entries.map((entry) => compareEvidenceRevision(entry, current))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(readEvidenceRevisions(repoRoot, process.argv.slice(2)), null, 2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
