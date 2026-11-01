import { lstatSync } from 'node:fs'
import { join } from 'node:path'
import { isDeepStrictEqual as same } from 'node:util'
import { nativeArtifactContentIssues } from './historical-native-artifact.mjs'
import { nativeArtifactContracts } from './historical-native-artifact-admission.mjs'
import {
  assertIncrementalPreservation,
  incrementalDigest,
} from './incremental-document-candidates.mjs'
import { incrementalReviewAdmission as admission } from './incremental-review-admission.mjs'
import {
  incrementalContentHash,
  incrementalEntryOffset,
  incrementalQualificationIssues,
  incrementalQualifiedContent,
  incrementalReviewPath,
  incrementalTargetCount,
} from './incremental-review-content.mjs'
import {
  assertReviewRecordSourceUnchanged,
  readReviewRecordObject,
} from './review-record-storage.mjs'
import { inspectRollforwardCohort, priorRollforwardRecord } from './rollforward-review.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const snapshots = new WeakMap()
const demand = (ok, message) => {
  if (!ok) throw new Error(`incremental review: ${message}`)
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) freeze(item)
    Object.freeze(value)
  }
  return value
}
const originalRow = (row) => {
  const value = structuredClone(row)
  delete value.afterSha256
  delete value.maintenanceDeltas
  return value
}

/** Exact original owners, plus the one admitted member extension in an existing owner. */
export function assertIncrementalOwnerSet(records) {
  demand(
    records.size === admission.originalLogicalOwners &&
      incrementalContentHash([...records.keys()].sort()) === admission.ownerSetSha256,
    'unknown, replaced or missing logical owner',
  )
}

export function inspectIncrementalCohort(records) {
  assertIncrementalOwnerSet(records)
  const current = records.get(incrementalReviewPath)
  const rollforward = inspectRollforwardCohort(records)
  const record = priorRollforwardRecord(current, rollforward)
  demand(record && Array.isArray(record.entries), 'single semantic owner missing')
  if (record.entries.length === incrementalEntryOffset) return undefined
  demand(
    record.entries.length === incrementalEntryOffset + incrementalTargetCount,
    'exact original28 plus1916 semantic rows required',
  )
  const header = { ...record }
  delete header.entries
  delete header.maintenanceHistory
  demand(
    incrementalContentHash(header) === admission.originalSemanticHeaderSha256 &&
      incrementalContentHash(record.entries.slice(0, incrementalEntryOffset).map(originalRow)) ===
        admission.originalSemanticEntriesSha256,
    'original semantic header or prior28 content changed',
  )
  const rows = record.entries.slice(incrementalEntryOffset)
  demand(
    incrementalContentHash(rows.map(incrementalQualifiedContent)) ===
      admission.acceptedContentSha256,
    'accepted per-document content, order or adopted body hash changed',
  )
  demand(
    incrementalContentHash(rows.map((row) => row.primarySource[0])) === admission.sourceRowsSha256,
    'fixed main source identities changed',
  )
  const byPath = new Map()
  for (const [index, row] of rows.entries()) {
    demand(!byPath.has(row.path), 'duplicate cohort member')
    demand(
      same(row.fieldRoles.governance, [
        `${incrementalReviewPath}#entries/${index + incrementalEntryOffset}`,
      ]),
      'row governance location changed',
    )
    demand(
      row.contentReviewStatus === 'content-reviewed' &&
        row.templateCompliance === 'template-compliant' &&
        incrementalQualificationIssues(row).length === 0,
      `invalid grant: ${row.path}`,
    )
    byPath.set(row.path, { row, index: index + incrementalEntryOffset })
  }
  for (const [owner, value] of records)
    for (const [index, row] of value.entries.entries())
      if (byPath.has(row.path))
        demand(
          owner === incrementalReviewPath && index === byPath.get(row.path).index,
          'cohort member has another current owner',
        )
  demand(
    rows.filter((row) => row.path.endsWith('.json')).length === admission.nativeCount,
    'native/prose partition changed',
  )
  return { record: current, rows, byPath }
}

function snapshot(options) {
  const group = options.reviewGroupReader()
  const current = group.records.get(incrementalReviewPath)
  if (!current || current.entries.length <= incrementalEntryOffset) return undefined
  demand(typeof options.root === 'string', 'protected current root required')
  try {
    lstatSync(join(options.root, 'docs/phase-governance/reviews/.storage.lock'))
    throw new Error('active review publication lock')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const saved = snapshots.get(group)
  if (saved) {
    assertIncrementalOwnerSet(group.records)
    for (const [owner, record] of saved.owners)
      demand(group.records.get(owner) === record, 'protected logical object replaced during use')
    return saved.cohort
  }
  const cohort = inspectIncrementalCohort(group.records)
  if (!cohort) return undefined
  assertReviewRecordSourceUnchanged(group.loadedSource)
  demand(
    same(cohort.record, readReviewRecordObject(incrementalReviewPath, options)),
    'cohort differs from actual materialized native storage',
  )
  // Consumers own the protected read lifetime and revalidate loadedSource on exit.
  // Seal all in-memory objects so caching does not permit a mutable-row bypass.
  for (const record of group.records.values()) freeze(record)
  freeze(cohort.rows)
  snapshots.set(group, { cohort, owners: new Map(group.records) })
  return cohort
}

/** undefined leaves all original contracts untouched; new members get source and grant checks. */
export function incrementalDocumentIssues(doc, template, contract, read, options) {
  if (typeof options.reviewGroupReader !== 'function') return undefined
  try {
    const record = options.reviewGroupReader().records.get(incrementalReviewPath)
    if (!record?.entries.slice(incrementalEntryOffset).some((row) => row.path === doc.path))
      return undefined
    const cohort = snapshot(options)
    const item = cohort?.byPath.get(doc.path)
    if (!item) return undefined
    demand(
      typeof options.readBuffer === 'function' &&
        typeof options.readIncrementalSourceBuffer === 'function',
      'real body/source byte providers required',
    )
    const { row, index } = item
    demand(
      doc.templateId === row.templateId &&
        doc.variant === row.templateVariant &&
        Boolean(doc.historyOverlay) === row.historyOverlay,
      'template, native variant or history role relabelled',
    )
    const bytes = options.readBuffer(doc.path)
    demand(
      Buffer.isBuffer(bytes) &&
        incrementalDigest(bytes) === row.afterSha256 &&
        read(doc.path) === bytes.toString('utf8'),
      'accepted body byte identity differs',
    )
    const pin = row.primarySource[0]
    const source = options.readIncrementalSourceBuffer(pin)
    demand(
      source?.mode === '100644' &&
        source.path === doc.path &&
        source.revision === admission.sourceRevision &&
        source.gitObject === pin.gitObject &&
        incrementalDigest(source.buffer) === pin.sha256,
      'actual fixed main Git source identity differs',
    )
    if (doc.path.endsWith('.md')) {
      assertIncrementalPreservation(bytes, source.buffer)
      return []
    }
    demand(bytes.equals(source.buffer), 'native JSON carrier rewritten')
    const definition = nativeArtifactContracts[row.templateId]
    demand(
      same(contract, definition) && template.templateId === row.templateId,
      'native contract changed',
    )
    return nativeArtifactContentIssues(
      row,
      {
        path: row.path,
        carrierRevision: admission.sourceRevision,
        carrierGitObject: pin.gitObject,
        carrierSha256: pin.sha256,
        historicalSource: { sourceSha256: pin.sha256, sourceGitRevision: pin.revision },
        family: row.evidence.family,
        rootShape: row.evidence.nativeShape,
        reviewRecord: incrementalReviewPath,
        reviewIndex: index,
        requiredWitnesses: [],
      },
      parseTerminalJson(bytes),
    )
  } catch (error) {
    return [`incremental document: ${error.message}`]
  }
}
