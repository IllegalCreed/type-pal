// The adopted bytes, fixed sources and field-scoped grant must agree. This is
// document governance only; native success/exit/status never certifies a new run.
import { createHash } from 'node:crypto'
import { isDeepStrictEqual as same } from 'node:util'
import {
  nativeArtifactContentIssues,
  nativeArtifactShape,
  nativeArtifactWitnessMatches,
} from './historical-native-artifact.mjs'
import { nativeArtifactContracts } from './historical-native-artifact-admission.mjs'
import {
  assertIncrementalPreservation,
  assertPreservedMarkdownSpans,
} from './incremental-document-candidates.mjs'
import {
  assertReviewRecordSourceUnchanged,
  readReviewRecordObject,
} from './review-record-storage.mjs'
import { readRollforwardGitSource } from './rollforward-git-source.mjs'
import { snapshotRollforwardCohort } from './rollforward-review.mjs'
import { parseTerminalJson } from './terminal-json.mjs'
import {
  assertTestingSourceMaintenance,
  assertTestingSourceMaintenanceOwner,
} from './testing-source-maintenance.mjs'

const hash = (b) => createHash('sha256').update(b).digest('hex')
const physicalSnapshots = new WeakSet()
const demand = (ok, message) => {
  if (!ok) throw new Error(message)
}
export function rollforwardDocumentIssues(doc, template, read, options = {}, checkBody) {
  if (typeof options.reviewGroupReader !== 'function') return undefined
  try {
    const group = options.reviewGroupReader()
    const cohort = snapshotRollforwardCohort(group.records)
    const item = cohort?.byPath.get(doc.path)
    if (!item) return undefined
    assertReviewRecordSourceUnchanged(group.loadedSource)
    if (cohort && !physicalSnapshots.has(group)) {
      for (const owner of new Set([...cohort.byPath.values()].map((entry) => entry.owner)))
        demand(
          same(group.records.get(owner), readReviewRecordObject(owner, options)),
          'accepted review differs from actual materialized storage',
        )
      physicalSnapshots.add(group)
    }
    const row = item.row
    demand(
      typeof options.readBuffer === 'function' && typeof options.root === 'string',
      'actual adopted body reader/root required',
    )
    demand(
      doc.templateId === row.templateId &&
        doc.variant === row.templateVariant &&
        Boolean(doc.historyOverlay) === Boolean(row.historyOverlay) &&
        template?.docType === row.docType,
      'accepted production template/variant/role differs',
    )
    const bytes = options.readBuffer(doc.path),
      pin = row.primarySource[0]
    const source = (
      options.readRollforwardSourceBuffer ?? ((p) => readRollforwardGitSource(options.root, p))
    )(pin)
    demand(
      source?.mode === '100644' &&
        source.path === pin.path &&
        source.revision === pin.revision &&
        source.gitObject === pin.gitObject &&
        hash(source.buffer) === pin.sha256,
      'actual fixed Git source differs',
    )
    demand(
      Buffer.isBuffer(bytes) && read(doc.path) === bytes.toString('utf8'),
      'adopted byte/text identity differs',
    )
    const maintained = hash(bytes) !== row.afterSha256
    if (maintained) {
      assertTestingSourceMaintenanceOwner({ doc, ...item, template })
      assertTestingSourceMaintenance({
        path: doc.path,
        before: source.buffer,
        current: bytes,
        readBuffer: options.readBuffer,
      })
    }
    if (doc.path.endsWith('.md')) {
      if (row.rollforward.kind === 'addition') assertIncrementalPreservation(bytes, source.buffer)
      else assertPreservedMarkdownSpans(bytes, source.buffer)
    } else {
      demand(maintained || bytes.equals(source.buffer), 'native carrier changed')
      // Old witnesses certify only the original carrier. The new source audit
      // separately traverses the live JSON/publication contract below.
      const issues = rollforwardNativeContentIssues(
        row,
        item,
        template,
        source.buffer.toString('utf8'),
        checkBody,
      )
      demand(issues.length === 0, issues.join('; '))
      if (maintained) {
        const currentIssues = checkBody(bytes.toString('utf8'), template, {
          variant: row.templateVariant,
        })
        demand(currentIssues.length === 0, currentIssues.join('; '))
      }
      demand(
        row.evidence.runtimeExecutionPerformed === false &&
          row.evidence.historicClaimsReexecuted === false &&
          row.evidence.creditGranted === 0,
        'borrowed native execution credit',
      )
    }
    assertReviewRecordSourceUnchanged(group.loadedSource)
    return []
  } catch (error) {
    return [`rollforward document: ${error.message}`]
  }
}

/** Native formats have their own contract. Markdown parent headings never apply. */
export function rollforwardNativeContentIssues(row, location, template, text, checkBody) {
  try {
    const native = parseTerminalJson(Buffer.from(text)),
      pin = row.primarySource[0]
    demand(same(nativeArtifactShape(native), row.evidence.nativeShape), 'native shape differs')
    for (const witness of [...row.evidence.witnesses, ...row.semanticAssessment.claims])
      demand(
        nativeArtifactWitnessMatches(native, witness),
        `native witness differs: ${witness.pointer}`,
      )
    const contract = row.templateVariant ? template.variants?.[row.templateVariant] : template
    if (contract?.format === 'json-native') {
      demand(
        same(contract, nativeArtifactContracts[row.templateId]),
        'registered native artifact contract differs',
      )
      return nativeArtifactContentIssues(
        row,
        {
          path: row.path,
          carrierRevision: pin.revision,
          carrierGitObject: pin.gitObject,
          carrierSha256: pin.sha256,
          historicalSource: {
            sourceSha256: row.sourceSha256,
            sourceGitRevision: row.sourceGitRevision,
          },
          family: row.evidence.family,
          rootShape: row.evidence.nativeShape,
          reviewRecord: location.owner,
          reviewIndex: location.index,
          requiredWitnesses: [],
        },
        native,
      )
    }
    demand(contract?.format === 'json', 'native production contract requires JSON format')
    return checkBody(text, template, { variant: row.templateVariant })
  } catch (error) {
    return [error.message]
  }
}
