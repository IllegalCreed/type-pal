// Deterministic administrative projections. They do not replace old semantic signatures.
import { createHash } from 'node:crypto'
import { isDeepStrictEqual as same } from 'node:util'
import { summarizeDocumentRegistry } from './document-registry.mjs'
import { inspectIncrementalCohort } from './incremental-review.mjs'
import { incrementalReviewAdmission as admission } from './incremental-review-admission.mjs'
import { incrementalContentHash, incrementalReviewPath } from './incremental-review-content.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const base = 'docs/phase-governance/'
const phases = ['ops', 'lore', 'phase1', 'phase2', 'phase3', 'phase-governance', 'testing']
const cache = new WeakMap()
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex')
const bytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`)
const demand = (condition, reason) => {
  if (!condition) throw new Error(`incremental control view: ${reason}`)
}

export const incrementalRegistryEntry = (row) => ({
  path: row.path,
  phase: row.path.startsWith('docs/testing/') ? 'testing' : 'ops',
  docType: row.docType,
  templateId: row.templateId,
  templateCompliance: row.templateCompliance,
  reviewStatus: row.contentReviewStatus,
  reviewRecord: incrementalReviewPath.split('/').at(-1),
  templateVersion: row.templateVersion,
  ...(row.templateVariant ? { templateVariant: row.templateVariant } : {}),
  ...(row.historyOverlay ? { historyOverlay: true } : {}),
})

export const incrementalRoute = (row) => ({
  path: row.path,
  templateId: row.templateId,
  ...(row.templateVariant ? { variant: row.templateVariant } : {}),
  historyOverlay: row.historyOverlay,
})

export const incrementalRegistryStructuralRoots = admission.registryPartitions.map((part) => ({
  path: `${base}${part.path}`,
  kind: 'document-registry-storage-part',
  owner: 'Codex',
  reason:
    'Bounded positions in the verified registry manifest; physical storage, not a second document or self-certified semantic claim.',
  retention:
    'Retain while referenced by the one current registry manifest; no orphan or prefix-only exclusion.',
  credit: 'Physical ownership only; no document/runtime/E2E/coverage credit.',
}))

export function isIncrementalRegistryLayout(shards) {
  return (
    Array.isArray(shards) &&
    shards.length === 9 &&
    phases.every(
      (phase, index) =>
        shards[index].phase === phase &&
        shards[index].key === phase &&
        shards[index].path === `document-registry.${phase}.json` &&
        shards[index].positionRange === undefined,
    ) &&
    admission.registryPartitions.every((part, i) =>
      ['key', 'phase', 'path', 'positionRange'].every((key) => same(part[key], shards[i + 7][key])),
    )
  )
}

/** Make the exact permissible new logical registry from a fixed, real pre-publication source. */
export function extendIncrementalRegistry(registry, rows) {
  demand(
    registry.entries.length === 2435 && registry.shards.length === 7,
    'original2435/7 registry required',
  )
  const value = structuredClone(registry)
  const oldPaths = new Set(value.entries.map((entry) => entry.path))
  demand(
    rows.length === 1916 && rows.every((row) => !oldPaths.has(row.path)),
    'new1916 must be distinct',
  )
  value.entries.push(...rows.map(incrementalRegistryEntry))
  value.summary = summarizeDocumentRegistry(value.entries)
  value.shards.push(...structuredClone(admission.registryPartitions))
  value.structuralRoots.push(...structuredClone(incrementalRegistryStructuralRoots))
  return value
}

function expectedBuffers(options, cohort) {
  const oldRootPath = `${base}document-registry.json`
  const get = (path) => {
    const source = options.readSourceBuffer({ path, revision: admission.integrationSourceRevision })
    demand(
      source?.mode === '100644' &&
        source.path === path &&
        source.revision === admission.integrationSourceRevision &&
        Buffer.isBuffer(source.buffer),
      `fixed integration source missing: ${path}`,
    )
    return source.buffer
  }
  const manifest = parseTerminalJson(get(oldRootPath)),
    oldEntries = [],
    oldAssignment = new Map()
  for (const part of manifest.shards) {
    const raw = get(base + part.path)
    demand(hash(raw) === part.sha256, 'fixed registry descriptor differs')
    const shard = parseTerminalJson(raw)
    for (const [i, entry] of shard.entries.entries()) {
      oldEntries[shard.positions[i]] = entry
      oldAssignment.set(entry.path, part.key)
    }
  }
  const registry = extendIncrementalRegistry({ ...manifest, entries: oldEntries }, cohort.rows)
  const parts = registry.shards.map((descriptor) => ({
    descriptor,
    value: { schemaVersion: 1, phase: descriptor.phase, positions: [], entries: [] },
  }))
  for (const [position, entry] of registry.entries.entries()) {
    const target =
      parts.find((part) => part.descriptor.key === oldAssignment.get(entry.path)) ??
      parts.find(
        ({ descriptor }) =>
          descriptor.phase === entry.phase &&
          descriptor.positionRange &&
          position >= descriptor.positionRange[0] &&
          position < descriptor.positionRange[1],
      ) ??
      parts.find(({ descriptor }) => descriptor.phase === entry.phase && !descriptor.positionRange)
    demand(target, 'expected registry position has no owner')
    target.value.positions.push(position)
    target.value.entries.push(entry)
  }
  const buffers = new Map()
  for (const { descriptor, value } of parts) {
    const raw = bytes(value)
    buffers.set(base + descriptor.path, raw)
    descriptor.sha256 = hash(raw)
    descriptor.total = value.entries.length
  }
  const { entries: _entries, ...root } = registry
  buffers.set(oldRootPath, bytes(root))
  const routing = parseTerminalJson(get(`${base}routing.json`))
  demand(routing.migratedDocuments.length === 2435, 'original routing count changed')
  routing.migratedDocuments.push(...cohort.rows.map(incrementalRoute))
  buffers.set(`${base}routing.json`, bytes(routing))
  buffers.set('docs/testing/catalog.json', get('docs/testing/catalog.json'))
  return buffers
}

/** Checks the new projection, not whether an old report reviewed this new membership. */
export function incrementalControlProjection(path, options, inspect) {
  const group = options.reviewGroupReader()
  const cohort = inspectIncrementalCohort(group.records)
  if (!cohort) return undefined
  let buffers = cache.get(cohort.record)
  if (!buffers) {
    buffers = expectedBuffers(options, cohort)
    cache.set(cohort.record, buffers)
  }
  if (!buffers.has(path)) return undefined
  const view = inspect(path, (p) => buffers.get(p) ?? options.readBuffer(p))
  return {
    kind: 'accepted-incremental-control-projection/1.0.0',
    cohortContentSha256: admission.acceptedContentSha256,
    sourceRevision: admission.integrationSourceRevision,
    structureSha256: view.structureSha256,
    membershipSha256: view.membershipSha256,
    observed: view.observed,
    actor: 'Codex',
    newIndependentSemanticAcceptanceClaimed: false,
    runtimeCredit: false,
    childSemanticCredit: false,
  }
}

export function incrementalControlMaintenanceMatches(row, actual, expected) {
  if (
    !expected ||
    actual.structureSha256 !== expected.structureSha256 ||
    actual.membershipSha256 !== expected.membershipSha256
  )
    return false
  const events = (row.maintenanceDeltas ?? []).filter((event) => event.kind === expected.kind)
  return events.length === 1 && same(events[0], expected)
}

export function incrementalControlProjectionHash(view) {
  return incrementalContentHash(view)
}
