// Closed, byte-identical carrier retirements. Old identities are provenance, not active documents.
import { createHash } from 'node:crypto'
import { lstatSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isDeepStrictEqual as same } from 'node:util'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { assertReviewRecordSourceUnchanged, loadReviewRecords } from './review-record-storage.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

export const nativeRetirementContract = Object.freeze({
  id: 'duplicate-native-artifact-retirement/1.0.0',
  sourceRevision: 'c72c498f014fe1bcdfdee986c9ec0336f8807bd9',
  scopeSha256: '43174d1e3bd12f175dd5c56b3ada67b10a521a466f6041138ac68c0b469a7279',
  task: 'docs/ops/tasks/DOCS-FULL-TEMPLATE-1.md',
  section: 'S82 六份重复原生载体实际退役',
})
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const demand = (ok, why) => {
  if (!ok) throw new Error(`native artifact retirement: ${why}`)
}

/** All-or-nothing: a bad declaration must never hide a missing file or grant an exclusion. */
export function inspectNativeArtifactRetirements(registry, options) {
  const empty = { entries: [], issues: [] }
  const declaration = registry.nativeArtifactRetirements
  if (declaration === undefined) return empty
  try {
    const contract = nativeRetirementContract
    demand(
      same(Object.keys(declaration), [
        'schemaVersion',
        'contract',
        'sourceRevision',
        'authorization',
        'retiredOn',
        'entries',
        'semantics',
      ]) &&
        declaration.schemaVersion === 1 &&
        declaration.contract === contract.id &&
        declaration.sourceRevision === contract.sourceRevision &&
        same(declaration.authorization, { task: contract.task, section: contract.section }) &&
        declaration.retiredOn === '2026-11-01' &&
        declaration.semantics ===
          'Registered identities and original review claims remain historical provenance; only the replacement is an active carrier. Retirement grants no semantic, migration or runtime credit.',
      'unapproved contract/authorization or credit boundary',
    )
    demand(
      hash(Buffer.from(JSON.stringify(declaration.entries))) === contract.scopeSha256,
      'exact approved six-member scope required',
    )
    const task = options.readBuffer(contract.task)?.toString('utf8')
    demand(task?.includes(`### ${contract.section}\n`), 'authorization section missing')
    const routing = parseTerminalJson(options.readBuffer('docs/phase-governance/routing.json'))
    const sources = new Set(declaration.entries.map((entry) => entry.path))
    for (const entry of declaration.entries) {
      demand(!options.present(entry.path), `retired carrier reappeared: ${entry.path}`)
      demand(!sources.has(entry.replacement), `replacement is retired: ${entry.replacement}`)
      const snapshot = (path, gitObject) => {
        const source = options.readSourceBuffer({ path, revision: contract.sourceRevision })
        demand(
          source?.path === path &&
            source.revision === contract.sourceRevision &&
            source.mode === '100644' &&
            source.gitObject === gitObject &&
            Buffer.isBuffer(source.buffer) &&
            source.buffer.length === entry.bytes &&
            hash(source.buffer) === entry.sha256,
          `fixed Git identity mismatch: ${path}`,
        )
        return source.buffer
      }
      const original = snapshot(entry.path, entry.sourceGitObject)
      const replacement = snapshot(entry.replacement, entry.replacementGitObject)
      const current = options.readBuffer(entry.replacement)
      demand(
        original.equals(replacement) && current?.equals(original),
        `replacement bytes differ or missing: ${entry.replacement}`,
      )
      const retiredRows = routing.migratedDocuments.filter((row) => row.path === entry.path)
      const routes = routing.migratedDocuments.filter((row) => row.path === entry.replacement)
      demand(
        retiredRows.length === 0 && routes.length === 1,
        `active route not redirected: ${entry.path}`,
      )
      for (const path of [entry.path, entry.replacement]) {
        const identities = registry.entries.filter((row) => row.path === path)
        demand(identities.length === 1, `registered historical identity missing/duplicate: ${path}`)
        const owner = `docs/phase-governance/reviews/${identities[0].reviewRecord}`
        const rows = options.reviewReader(owner)?.entries?.filter((row) => row.path === path)
        demand(
          rows?.length === 1 && rows[0].afterSha256 === entry.sha256,
          `original review pin missing or changed: ${path}`,
        )
      }
    }
    return { entries: declaration.entries, issues: [] }
  } catch (error) {
    return { entries: [], issues: [error.message] }
  }
}

/** Filesystem adapter refuses symlinks, including dangling retired leaves and replacement parents. */
export function readNativeArtifactRetirements(root, registry, group, locations) {
  if (registry.nativeArtifactRetirements === undefined) return { entries: [], issues: [] }
  const state = (path) => {
    if (locations) return locations.readBuffer(path)
    const parts = path.split('/')
    demand(
      parts[0] === 'docs' && parts.every((p) => p && p !== '.' && p !== '..'),
      'ordinary docs path required',
    )
    let absolute = root
    for (const [i, part] of parts.entries()) {
      absolute = join(absolute, part)
      let stat
      try {
        stat = lstatSync(absolute)
      } catch (error) {
        if (error.code === 'ENOENT') return undefined
        throw error
      }
      demand(
        i === parts.length - 1 ? stat.isFile() : stat.isDirectory(),
        `non-ordinary path: ${path}`,
      )
    }
    return readFileSync(absolute)
  }
  const loaded = group ?? loadReviewRecords({ root })
  const sourceCache = new Map()
  const result = inspectNativeArtifactRetirements(registry, {
    readBuffer: state,
    present: (path) => state(path) !== undefined,
    readSourceBuffer: (pin) => {
      if (!sourceCache.has(pin.path)) sourceCache.set(pin.path, readGitDocumentSnapshot(root, pin))
      return sourceCache.get(pin.path)
    },
    reviewReader: (path) => loaded.records.get(path),
  })
  assertReviewRecordSourceUnchanged(loaded.loadedSource)
  return result
}
