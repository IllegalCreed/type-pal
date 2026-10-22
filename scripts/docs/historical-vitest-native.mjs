import { createHash } from 'node:crypto'
import { frozenDocumentBaseline, inspectFrozenDocumentBaseline } from './frozen-document-source.mjs'
import { readReviewRecordObject } from './review-record-storage.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const folder = 'docs/ops/evidence/TEST-EDITOR-ALCHEMY-BOUNDARIES-1/'
export const historicalVitestPilots = Object.freeze({
  [`${folder}adjacent.json`]: 'adjacent-green',
  [`${folder}directed.json`]: 'directed-green',
  [`${folder}counterproof-runs/N-B4-missing-reference-dedup.json`]: 'counterexample-red',
})
export const historicalVitestContract = Object.freeze({
  variant: 'historical-vitest-native-v1',
  version: '1.0.0',
  reviewRecord: 'docs/phase-governance/reviews/20261017-r85-testing-archive.json',
})
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0
const strings = (value) => Array.isArray(value) && value.length > 0 && value.every(nonempty)
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

/** Immutable reporter bytes use the existing current review, never an added payload or sidecar. */
export function historicalVitestNativeIssues(doc, template, contract, read, options) {
  const phase = historicalVitestPilots[doc.path]
  if (
    !phase &&
    doc.variant !== historicalVitestContract.variant &&
    contract?.format !== 'json-native'
  )
    return undefined
  if (
    !phase ||
    doc.templateId !== 'test-machine-evidence-v1' ||
    doc.variant !== historicalVitestContract.variant ||
    doc.historyOverlay ||
    template?.templateId !== doc.templateId ||
    contract?.format !== 'json-native' ||
    contract.templateVersion !== historicalVitestContract.version ||
    contract.metadataLocation !== 'current-review' ||
    contract.sourceBaseline !== frozenDocumentBaseline.path
  )
    return [
      'native Vitest pilot requires its fixed path/variant/version and current-review contract',
    ]
  if (typeof options.readBuffer !== 'function' || typeof options.readSourceBuffer !== 'function')
    return ['native Vitest pilot requires original byte readers']
  const baseline = inspectFrozenDocumentBaseline(read, options.readSource, options)
  if (baseline.issues.length) return baseline.issues
  const bindings = baseline.entries.filter((entry) => entry.path === doc.path)
  const source = options.readSourceBuffer({
    path: doc.path,
    revision: frozenDocumentBaseline.revision,
  })
  const bytes = options.readBuffer(doc.path)
  if (
    bindings.length !== 1 ||
    !source ||
    !Buffer.isBuffer(source.buffer) ||
    source.revision !== frozenDocumentBaseline.revision ||
    source.path !== doc.path ||
    source.mode !== '100644' ||
    !/^[a-f\d]{40}$/.test(source.gitObject) ||
    digest(source.buffer) !== bindings[0].sourceSha256
  )
    return ['native Vitest source differs from the independently frozen cohort']
  try {
    parseTerminalJson(bytes)
  } catch (error) {
    return [`native Vitest JSON bytes invalid: ${error.message}`]
  }
  if (!bytes.equals(source.buffer) || read(doc.path) !== bytes.toString('utf8'))
    return ['native Vitest original bytes changed']
  let entries
  try {
    entries = readReviewRecordObject(historicalVitestContract.reviewRecord, {
      readBuffer: (path) => Buffer.from(read(path), 'utf8'),
    }).entries
  } catch {
    return ['native Vitest current review unavailable']
  }
  const rows = Array.isArray(entries) ? entries.filter((entry) => entry?.path === doc.path) : []
  if (rows.length !== 1) return ['native Vitest requires one current review entry']
  const row = rows[0]
  const issues = []
  if (
    row.templateId !== doc.templateId ||
    row.templateVariant !== doc.variant ||
    row.templateVersion !== historicalVitestContract.version ||
    row.docType !== 'test-machine-evidence' ||
    row.historyOverlay !== false ||
    row.artifactOnly ||
    row.sourceSha256 !== bindings[0].sourceSha256 ||
    row.afterSha256 !== digest(bytes) ||
    row.revision?.currentSha !== digest(bytes) ||
    row.sourceGitRevision !== frozenDocumentBaseline.revision ||
    row.documentStatus !== 'historical' ||
    row.versionScope?.runPhase !== phase
  )
    issues.push('native Vitest review identity/source/phase mismatch')
  if (
    !nonempty(row.owner) ||
    !nonempty(row.coreConclusion) ||
    !nonempty(row.readMethod) ||
    !nonempty(row.reviewedLines) ||
    !strings(row.truthAnchors) ||
    !strings(row.legalInputs) ||
    !strings(row.publicCallers) ||
    !Array.isArray(row.primarySource) ||
    !row.primarySource.some(
      (pin) =>
        pin?.path === doc.path &&
        pin.revision === frozenDocumentBaseline.revision &&
        pin.sha256 === bindings[0].sourceSha256,
    ) ||
    !nonempty(row.businessOracle?.type) ||
    !strings(row.businessOracle?.assertions) ||
    !strings(row.unresolved) ||
    !nonempty(row.stopLine) ||
    !nonempty(row.nextStep)
  )
    issues.push('native Vitest five evidence sections incomplete in current review')
  if (
    row.evidence?.kind !== 'historical-native-vitest-pilot' ||
    row.evidence.byteStable !== true ||
    row.evidence.currentAudit?.runtimeExecutionPerformed !== false ||
    row.evidence.currentAudit?.historicClaimsReexecuted !== false
  )
    issues.push('native Vitest cannot grant current or repeated historical execution')
  return issues
}
