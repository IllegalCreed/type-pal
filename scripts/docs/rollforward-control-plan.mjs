// Logical control projection only. The existing registry writer remains the IO owner.
import assert from 'node:assert/strict'
import { summarizeDocumentRegistry } from './document-registry.mjs'

export const rollforwardRegistryPartition = Object.freeze({
  key: 'ops-main-rollforward',
  phase: 'ops',
  path: 'document-registry.ops-main-rollforward.json',
  positionRange: [4351, 4530],
})
const registryFields = (change) => {
  const row = change.after
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
const routeFields = (row) => ({
  path: row.path,
  templateId: row.templateId,
  ...(row.templateVariant ? { variant: row.templateVariant } : {}),
  ...(Object.hasOwn(row, 'historyOverlay') ? { historyOverlay: row.historyOverlay } : {}),
})

export function projectRollforwardControls({ registry, routing, plan }) {
  assert.equal(registry.entries.length, 4351, 'fixed old4351 registry required')
  assert.equal(registry.shards.length, 9, 'fixed old9 physical registry parts required')
  assert.equal(routing.migratedDocuments.length, 4345, 'six retired routes must already be absent')
  assert.equal(plan.changes.length, 205, 'exact205 planned changes required')
  const value = structuredClone(registry),
    routes = structuredClone(routing)
  const additions = plan.changes.filter((change) => change.beforeSha256 === null)
  assert.equal(additions.length, 179, 'only179 new registry members allowed')
  const byPath = new Map(plan.changes.map((change) => [change.path, change]))
  assert.equal(byPath.size, 205, 'duplicate planned member')
  const beforePaths = new Set(value.entries.map((row) => row.path))
  for (const change of additions)
    assert(
      !beforePaths.has(change.path) && change.path.startsWith('docs/ops/'),
      'addition collides with an original identity or phase',
    )
  value.entries = value.entries.map((entry) => {
    const change = byPath.get(entry.path)
    if (!change) return entry
    assert(change.beforeSha256 !== null, 'addition masquerades as amendment')
    const next = { ...entry }
    delete next.templateVariant
    delete next.historyOverlay
    return { ...next, ...registryFields(change) }
  })
  value.entries.push(
    ...additions.map((change) => ({ path: change.path, phase: 'ops', ...registryFields(change) })),
  )
  value.summary = summarizeDocumentRegistry(value.entries)
  assert(
    !value.shards.some(
      (d) =>
        d.key === rollforwardRegistryPartition.key || d.path === rollforwardRegistryPartition.path,
    ),
    'new part already exists',
  )
  value.shards.push(structuredClone(rollforwardRegistryPartition))
  value.structuralRoots.push({
    path: `docs/phase-governance/${rollforwardRegistryPartition.path}`,
    kind: 'document-registry-storage-part',
    owner: 'Codex',
    reason:
      'Exact positions4351..4529 in the one current registry; bounded physical ownership, not another semantic document.',
    retention: 'Retain only while referenced by the single registry manifest.',
    credit: 'Storage ownership only; zero child, document or runtime credit.',
  })
  routes.migratedDocuments = routes.migratedDocuments.map((entry) => {
    const change = byPath.get(entry.path)
    return change ? routeFields(change.after) : entry
  })
  routes.migratedDocuments.push(...additions.map((change) => routeFields(change.after)))
  const retired = new Set(registry.nativeArtifactRetirements.entries.map((entry) => entry.path))
  assert.equal(retired.size, 6, 'six declared retirements required')
  assert.equal(new Set(value.entries.map((row) => row.path)).size, 4530)
  assert.equal(new Set(routes.migratedDocuments.map((row) => row.path)).size, 4524)
  assert(
    routes.migratedDocuments.every((row) => !retired.has(row.path)),
    'retired route reintroduced',
  )
  assert.deepEqual(
    value.entries.slice(0, 4351).map((row) => row.path),
    registry.entries.map((row) => row.path),
    'old registry positions changed',
  )
  assert.deepEqual(
    value.shards.slice(0, 9),
    registry.shards,
    'old physical partition ownership changed',
  )
  assert.deepEqual(value.nativeArtifactRetirements, registry.nativeArtifactRetirements)
  return { registry: value, routing: routes }
}
