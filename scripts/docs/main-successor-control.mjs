import assert from 'node:assert/strict'
import { isDeepStrictEqual as same } from 'node:util'
import { summarizeDocumentRegistry } from './document-registry.mjs'
import { mainSuccessorAdmission as admission } from './main-successor-admission.mjs'

export const mainSuccessorRegistryPartition = Object.freeze({
  key: 'ops-main-successor',
  phase: 'ops',
  path: 'document-registry.ops-main-successor.json',
  positionRange: Object.freeze([4530, 4542]),
})

export function isMainSuccessorRegistryLayout(shards, previousLayout) {
  return (
    Array.isArray(shards) &&
    shards.length === 11 &&
    previousLayout(shards.slice(0, 10)) &&
    ['key', 'phase', 'path', 'positionRange'].every((key) =>
      same(shards[10][key], mainSuccessorRegistryPartition[key]),
    )
  )
}

export function projectMainSuccessorControls({ registry, routing, cohort }) {
  assert.equal(registry.entries.length, admission.predecessorRows)
  assert.equal(registry.shards.length, 10)
  assert.equal(routing.migratedDocuments.length, admission.predecessorRows - 6)
  const next = structuredClone(registry),
    routes = structuredClone(routing)
  const changes = new Map(cohort.changes.map((change) => [change.path, change]))
  assert.equal(changes.size, admission.changes)
  const registryRow = (change) => {
    const row = cohort.byPath.get(change.path).row
    return {
      docType: row.docType,
      templateId: row.templateId,
      templateVersion: row.templateVersion,
      templateCompliance: row.templateCompliance,
      reviewStatus: row.contentReviewStatus,
      reviewRecord: change.owner.split('/').at(-1),
      ...(row.templateVariant ? { templateVariant: row.templateVariant } : {}),
      ...(row.historyOverlay ? { historyOverlay: true } : {}),
    }
  }
  const routeRow = (change) => {
    const row = cohort.byPath.get(change.path).row
    return {
      path: row.path,
      templateId: row.templateId,
      ...(row.templateVariant ? { variant: row.templateVariant } : {}),
      historyOverlay: Boolean(row.historyOverlay),
    }
  }
  next.entries = next.entries.map((row) => {
    const change = changes.get(row.path)
    if (!change) return row
    assert(change.beforeSha256 !== null, 'successor addition collides with predecessor')
    const value = { ...row }
    delete value.templateVariant
    delete value.historyOverlay
    return { ...value, ...registryRow(change) }
  })
  const additions = cohort.changes.filter((change) => change.beforeSha256 === null)
  assert.equal(additions.length, admission.additions)
  next.entries.push(
    ...additions.map((change) => ({ path: change.path, phase: 'ops', ...registryRow(change) })),
  )
  next.shards.push(structuredClone(mainSuccessorRegistryPartition))
  next.structuralRoots.push({
    path: `docs/phase-governance/${mainSuccessorRegistryPartition.path}`,
    kind: 'document-registry-storage-part',
    owner: 'Codex',
    reason:
      'Exact successor positions4530..4541 in the existing single registry; no new semantic owner.',
    retention: 'Retain only while referenced by the single registry manifest.',
    credit: 'Physical ownership only; zero child or runtime credit.',
  })
  next.summary = summarizeDocumentRegistry(next.entries)
  routes.migratedDocuments = routes.migratedDocuments.map((row) =>
    changes.has(row.path) ? routeRow(changes.get(row.path)) : row,
  )
  routes.migratedDocuments.push(...additions.map(routeRow))
  assert.equal(new Set(next.entries.map((row) => row.path)).size, admission.registeredRows)
  assert.equal(
    new Set(routes.migratedDocuments.map((row) => row.path)).size,
    admission.registeredRows - 6,
  )
  assert.deepEqual(
    next.entries.slice(0, admission.predecessorRows).map((row) => row.path),
    registry.entries.map((row) => row.path),
  )
  assert.deepEqual(next.shards.slice(0, 10), registry.shards)
  assert.deepEqual(next.nativeArtifactRetirements, registry.nativeArtifactRetirements)
  return { registry: next, routing: routes }
}
