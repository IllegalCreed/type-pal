// Dependency packing has no publication authority or repository writes.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { biomeFormat, packReviewStorageRecord } from './review-record-storage-packing.mjs'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
export function packReviewDependencyClosure({
  root,
  baseRevision,
  group,
  records,
  dependencies,
  pinKind,
}) {
  const next = new Map([...records].map(([owner, record]) => [owner, structuredClone(record)]))
  const dirty = new Set(
    [...next]
      .filter(([owner, record]) => !isDeepStrictEqual(record, group.records.get(owner)))
      .map(([owner]) => owner),
  )
  let size = -1
  while (size !== dirty.size) {
    size = dirty.size
    for (const [owner, record] of next)
      if (record.entries.some((row) => dirty.has(row.path) || dependencies.has(row.path)))
        dirty.add(owner)
  }
  const built = new Map(),
    visiting = new Set(),
    pinDeltas = [],
    upgrades = []
  function build(owner) {
    if (built.has(owner)) return built.get(owner)
    assert(!visiting.has(owner), `review dependency cycle: ${owner}`)
    visiting.add(owner)
    const record = next.get(owner)
    for (const [index, row] of record.entries.entries())
      if (dirty.has(row.path) || dependencies.has(row.path)) {
        const bytes =
          dependencies.get(row.path) ??
          build(row.path).find((output) => output.path === row.path).bytes
        const after = hash(bytes)
        if (after === row.afterSha256) continue
        pinDeltas.push({
          owner,
          index,
          path: row.path,
          beforeSha256: row.afterSha256,
          afterSha256: after,
          priorMaintenanceLength: row.maintenanceDeltas?.length ?? null,
        })
        row.maintenanceDeltas ??= []
        row.maintenanceDeltas.push({
          kind: pinKind,
          beforeSha256: row.afterSha256,
          afterSha256: after,
          newSemanticCredit: 0,
          runtimeCredit: false,
        })
        row.afterSha256 = after
      }
    const storage = group.storages.get(owner)
    let sourcePin = storage?.source
    // Any formerly-flat owner that exceeds the old cap needs an explicit real
    // Git source upgrade proposal; never borrow another owner's source pin.
    if (!sourcePin && Buffer.byteLength(JSON.stringify(record, null, 2)) >= 950000) {
      const source = readGitDocumentSnapshot(root, { path: owner, revision: baseRevision })
      assert(source?.mode === '100644', 'real original flat owner source required')
      sourcePin = {
        revision: baseRevision,
        path: owner,
        gitObject: source.gitObject,
        sha256: hash(source.buffer),
      }
      upgrades.push(sourcePin)
    }
    const outputs = sourcePin
      ? packReviewStorageRecord({
          logicalPath: owner,
          record,
          sourcePin,
          context: { repoRoot: root },
        }).outputs
      : [{ path: owner, kind: 'review', bytes: biomeFormat(record, owner, { repoRoot: root }) }]
    for (const output of outputs)
      assert(
        output.bytes.length < (sourcePin ? 524288 : 1048576),
        `capacity exceeded: ${output.path}`,
      )
    visiting.delete(owner)
    built.set(owner, outputs)
    return outputs
  }
  for (const owner of dirty) build(owner)
  return { records: next, built, dirty, pinDeltas, upgrades }
}
