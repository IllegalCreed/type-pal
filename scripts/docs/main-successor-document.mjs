import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual as same } from 'node:util'
import { readPinnedGitDocuments } from './git-document-batch.mjs'
import { assertPreservedMarkdownSpans } from './incremental-document-candidates.mjs'
import { mainSuccessorAdmission } from './main-successor-admission.mjs'
import { inspectMainSuccessor } from './main-successor-review.mjs'
import {
  assertReviewRecordSourceUnchanged,
  readReviewRecordObject,
} from './review-record-storage.mjs'
import { rollforwardNativeContentIssues } from './rollforward-document-contract.mjs'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const physical = new WeakSet()
const sources = new WeakMap()

export function readMainSuccessorSources(root, cohort) {
  assert.equal(cohort.byPath.size, mainSuccessorAdmission.changes)
  const pins = [...cohort.byPath.values()].map(({ row }) => {
    const pin = row.primarySource[0]
    assert(
      pin.path === row.path && pin.revision === mainSuccessorAdmission.carrierRevision,
      'successor source namespace differs',
    )
    return pin
  })
  return readPinnedGitDocuments(root, pins)
}

/** An exact successor member is handled before legacy cohorts. All other
 * documents still traverse their existing source and acceptance contracts. */
export function mainSuccessorDocumentIssues(doc, template, read, options, checkBody) {
  if (typeof options.reviewGroupReader !== 'function') return undefined
  const group = options.reviewGroupReader()
  if (
    ![...group.records.values()].some((record) =>
      record.entries.some((row) => row.path === doc.path && row.successorIntake),
    )
  )
    return undefined
  try {
    const cohort = inspectMainSuccessor(group.records),
      item = cohort?.byPath.get(doc.path)
    assert(item, 'successor qualified member missing')
    assertReviewRecordSourceUnchanged(group.loadedSource)
    if (!physical.has(group)) {
      for (const owner of new Set([...cohort.byPath.values()].map((row) => row.owner)))
        assert(
          same(group.records.get(owner), readReviewRecordObject(owner, options)),
          'successor logical view differs from actual storage',
        )
      physical.add(group)
    }
    const row = item.row
    assert(
      typeof options.readBuffer === 'function' && typeof options.root === 'string',
      'successor real byte provider required',
    )
    assert(
      doc.templateId === row.templateId &&
        doc.variant === row.templateVariant &&
        Boolean(doc.historyOverlay) === Boolean(row.historyOverlay) &&
        template?.docType === row.docType,
      'successor template/role differs',
    )
    const bytes = options.readBuffer(doc.path),
      pin = row.primarySource[0]
    if (!options.readSuccessorSourceBuffer && !sources.has(group))
      sources.set(group, readMainSuccessorSources(options.root, cohort))
    const source = (options.readSuccessorSourceBuffer ?? sources.get(group))(pin)
    assert(
      source?.mode === '100644' &&
        source.path === pin.path &&
        source.revision === pin.revision &&
        source.gitObject === pin.gitObject &&
        hash(source.buffer) === pin.sha256,
      'successor fixed carrier source differs',
    )
    assert(
      Buffer.isBuffer(bytes) &&
        hash(bytes) === row.afterSha256 &&
        hash(bytes) === row.successorIntake.acceptedBodySha256 &&
        read(doc.path) === bytes.toString('utf8'),
      'successor body identity differs',
    )
    if (doc.path.endsWith('.md')) assertPreservedMarkdownSpans(bytes, source.buffer)
    else {
      assert(bytes.equals(source.buffer), 'successor native carrier changed')
      assert.deepEqual(
        rollforwardNativeContentIssues(row, item, template, bytes.toString('utf8'), checkBody),
        [],
      )
    }
    assertReviewRecordSourceUnchanged(group.loadedSource)
    return []
  } catch (error) {
    return [`main successor document: ${error.message}`]
  }
}
