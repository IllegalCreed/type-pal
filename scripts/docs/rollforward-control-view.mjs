// A new administrative observation cannot replace an older semantic signature.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual as same } from 'node:util'
import { inspectNativeArtifactRetirements } from './native-artifact-retirements.mjs'
import { fileState } from './review-record-storage-io.mjs'
import {
  projectRollforwardControls,
  rollforwardRegistryPartition,
} from './rollforward-control-plan.mjs'
import { inspectRollforwardCohort, rollforwardPublication } from './rollforward-review.mjs'
import { rollforwardReviewContract } from './rollforward-review-plan.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const base = 'docs/phase-governance/'
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const bytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`)
const cache = new WeakMap()
export function isRollforwardRegistryLayout(shards, isOldLayout) {
  return (
    Array.isArray(shards) &&
    shards.length === 10 &&
    isOldLayout(shards.slice(0, 9)) &&
    ['key', 'phase', 'path', 'positionRange'].every((key) =>
      same(shards[9][key], rollforwardRegistryPartition[key]),
    )
  )
}
function expectedBuffers(options, cohort) {
  const get = (path) => {
    const pin = options.readSourceBuffer({ path, revision: rollforwardReviewContract.acceptedBase })
    assert(
      pin?.mode === '100644' &&
        pin.path === path &&
        pin.revision === rollforwardReviewContract.acceptedBase &&
        Buffer.isBuffer(pin.buffer),
      'real accepted control Git source required',
    )
    return pin.buffer
  }
  const rootPath = `${base}document-registry.json`,
    root = parseTerminalJson(get(rootPath)),
    entries = [],
    assignment = new Map()
  for (const d of root.shards) {
    const raw = get(base + d.path)
    assert.equal(hash(raw), d.sha256, 'accepted control descriptor differs')
    const value = parseTerminalJson(raw)
    for (const [i, row] of value.entries.entries()) {
      entries[value.positions[i]] = row
      assignment.set(row.path, d.key)
    }
  }
  const changes = cohort.changes.map((change) => ({
    ...change,
    after: cohort.byPath.get(change.path).row,
  }))
  const projected = projectRollforwardControls({
    registry: { ...root, entries },
    routing: parseTerminalJson(get(`${base}routing.json`)),
    plan: { changes },
  })
  const parts = projected.registry.shards.map((d) => ({
    descriptor: d,
    value: { schemaVersion: 1, phase: d.phase, positions: [], entries: [] },
  }))
  for (const [position, row] of projected.registry.entries.entries()) {
    const part =
      parts.find((p) => p.descriptor.key === assignment.get(row.path)) ??
      parts.find(
        (p) =>
          p.descriptor.phase === row.phase &&
          p.descriptor.positionRange &&
          position >= p.descriptor.positionRange[0] &&
          position < p.descriptor.positionRange[1],
      )
    assert(part, 'new control position has no exact physical owner')
    part.value.positions.push(position)
    part.value.entries.push(row)
  }
  const buffers = new Map()
  for (const { descriptor, value } of parts) {
    const raw = bytes(value)
    buffers.set(base + descriptor.path, raw)
    descriptor.sha256 = hash(raw)
    descriptor.total = value.entries.length
  }
  const { entries: _entries, ...header } = projected.registry
  buffers.set(rootPath, bytes(header))
  buffers.set(`${base}routing.json`, bytes(projected.routing))
  buffers.set('docs/testing/catalog.json', get('docs/testing/catalog.json'))
  return { buffers, registry: projected.registry }
}
export function rollforwardControlProjection(path, options, inspect) {
  const group = options.reviewGroupReader(),
    cohort = inspectRollforwardCohort(group.records)
  if (!cohort) return undefined
  const identity = group.records.get('docs/phase-governance/reviews/20261018-semantic-rework.json')
  let expected = cache.get(identity)
  if (!expected) {
    expected = expectedBuffers(options, cohort)
    cache.set(identity, expected)
  }
  if (!expected.buffers.has(path)) return undefined
  // Only immutable expected buffers are cached. Validate the six physical
  // retirements and their unchanged replacements on every caller invocation.
  const ordinary = (p) => fileState(options.root, p, undefined, 'docs/').buffer
  const view = (p) => expected.buffers.get(p) ?? options.readBuffer(p)
  const life = inspectNativeArtifactRetirements(expected.registry, {
    readBuffer: (p) => expected.buffers.get(p) ?? ordinary(p),
    present: (p) => ordinary(p) !== null,
    readSourceBuffer: options.readSourceBuffer,
    reviewReader: (p) => group.records.get(p),
  })
  assert.deepEqual(life.issues, [], 'rollforward retirement lifecycle differs')
  const observed = inspect(path, view)
  return {
    kind: 'accepted-rollforward-control-projection/1.0.0',
    cohortContentSha256: rollforwardPublication.normalizedChangesSha256,
    sourceRevision: rollforwardReviewContract.acceptedBase,
    structureSha256: observed.structureSha256,
    membershipSha256: observed.membershipSha256,
    observed: observed.observed,
    actor: 'Codex',
    newIndependentSemanticAcceptanceClaimed: false,
    runtimeCredit: false,
    childSemanticCredit: false,
  }
}
