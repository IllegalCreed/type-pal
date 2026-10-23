import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import {
  historicalDeliveryIntegritySource,
  historicalDeliveryPilots,
  historicalDeliveryReadDomain,
} from './historical-document-delivery-admission.mjs'
import { readReviewRecordObject } from './review-record-storage.mjs'
import { canonicalTerminalJson, parseTerminalJson } from './terminal-json.mjs'

export { historicalDeliveryIntegritySource, historicalDeliveryPilots, historicalDeliveryReadDomain }
export const historicalDeliveryContract = Object.freeze({
  templateId: 'evidence-receipt-v1',
  variant: 'historical-document-delivery-native-v1',
  version: '1.0.0',
  metadataLocation: 'existing-current-review',
  sourceRevision: 'd9a3a0a0a7c45fc75f922ae3dffd13a68ca29a5e',
})
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0
const strings = (value) => Array.isArray(value) && value.length > 0 && value.every(nonempty)
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

function canonicalDigest(value) {
  try {
    return digest(canonicalTerminalJson(value))
  } catch {
    return undefined
  }
}

// RFC6901 only; no implicit flattening, prototype traversal, trimming or type coercion.
function pointerValue(native, pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/') || /~(?![01])/u.test(pointer))
    return undefined
  let value = native
  for (const token of pointer.slice(1).split('/')) {
    const key = token.replaceAll('~1', '/').replaceAll('~0', '~')
    if (!object(value) && !Array.isArray(value)) return undefined
    if (Array.isArray(value) && !/^(0|[1-9]\d*)$/u.test(key)) return undefined
    if (!Object.hasOwn(value, key)) return undefined
    value = value[key]
  }
  return value
}

function witnessIssues(witnesses, native, pilot) {
  if (!Array.isArray(witnesses) || witnesses.length === 0)
    return ['native delivery witnesses missing']
  const seen = new Set()
  const issues = []
  for (const witness of witnesses) {
    if (!object(witness)) {
      issues.push('native delivery witness invalid')
      continue
    }
    const value = pointerValue(native, witness.pointer)
    const rendered =
      witness.representation === 'parsed-string' && typeof value === 'string'
        ? value
        : witness.representation === 'json-stringify' && value !== undefined
          ? JSON.stringify(value)
          : undefined
    const key = JSON.stringify([witness.pointer, witness.representation, witness.quote])
    if (
      !nonempty(witness.quote) ||
      !nonempty(witness.meaning) ||
      typeof rendered !== 'string' ||
      !rendered.includes(witness.quote) ||
      seen.has(key)
    )
      issues.push('native delivery witness pointer/representation/quote mismatch')
    seen.add(key)
  }
  const required = pilot.requiredWitnessPointers
  if (required.some((pointer) => !witnesses.some((witness) => witness?.pointer === pointer)))
    issues.push('native delivery role-specific witnesses missing')
  return issues
}

function contextIssues(contexts, readSourceBuffer) {
  if (!Array.isArray(contexts) || contexts.length !== 1)
    return ['native delivery requires one fixed integrity context']
  const context = contexts[0]
  const pin = historicalDeliveryIntegritySource
  if (
    !object(context) ||
    context.path !== pin.path ||
    context.revision !== pin.revision ||
    context.sha256 !== pin.sha256
  )
    return ['native delivery context source mismatch']
  const source = readSourceBuffer(pin)
  if (
    !source ||
    source.path !== pin.path ||
    source.revision !== pin.revision ||
    source.mode !== '100644' ||
    !Buffer.isBuffer(source.buffer) ||
    digest(source.buffer) !== pin.sha256
  )
    return ['native delivery context Git bytes unavailable']
  try {
    parseTerminalJson(source.buffer)
  } catch (error) {
    return [`native delivery context JSON invalid: ${error.message}`]
  }
  const lines = source.buffer.toString('utf8').split('\n')
  if (
    !Number.isSafeInteger(context.lineStart) ||
    !Number.isSafeInteger(context.lineEnd) ||
    context.lineStart < 1 ||
    context.lineEnd < context.lineStart ||
    context.lineEnd > lines.length ||
    !nonempty(context.quote) ||
    !lines
      .slice(context.lineStart - 1, context.lineEnd)
      .join('\n')
      .includes(context.quote)
  )
    return ['native delivery context line/quote mismatch']
  return []
}

/** Carrier fidelity + current historical explanation; never authenticates old execution. */
export function historicalDocumentDeliveryIssues(doc, template, contract, read, options = {}) {
  const pilot = historicalDeliveryPilots.find((entry) => entry.path === doc.path)
  const definition = historicalDeliveryContract
  if (!pilot && doc.variant !== definition.variant) return undefined
  if (
    !pilot ||
    doc.templateId !== definition.templateId ||
    doc.variant !== definition.variant ||
    doc.historyOverlay ||
    template?.templateId !== definition.templateId ||
    contract?.format !== 'json-native' ||
    contract.templateVersion !== definition.version ||
    contract.metadataLocation !== definition.metadataLocation ||
    contract.sourceCarrierRevision !== definition.sourceRevision
  )
    return ['native delivery requires its fixed pilot/path/variant/version contract']
  if (typeof options.readBuffer !== 'function' || typeof options.readSourceBuffer !== 'function')
    return ['native delivery requires original byte readers']
  const bytes = options.readBuffer(doc.path)
  let native
  try {
    native = parseTerminalJson(bytes)
  } catch (error) {
    return [`native delivery JSON bytes invalid: ${error.message}`]
  }
  const source = options.readSourceBuffer({ path: doc.path, revision: definition.sourceRevision })
  if (
    !source ||
    source.path !== doc.path ||
    source.revision !== definition.sourceRevision ||
    source.mode !== '100644' ||
    source.gitObject !== pilot.gitObject ||
    !Buffer.isBuffer(source.buffer) ||
    digest(source.buffer) !== pilot.sourceSha256
  )
    return ['native delivery fixed Git carrier mismatch']
  if (!bytes.equals(source.buffer) || read(doc.path) !== bytes.toString('utf8'))
    return ['native delivery original bytes changed']
  let entries
  try {
    const review = options.reviewReader
      ? options.reviewReader(pilot.reviewRecord)
      : readReviewRecordObject(pilot.reviewRecord, { readBuffer: options.readBuffer })
    entries = review.entries
  } catch {
    return ['native delivery current review unavailable']
  }
  if (
    !Array.isArray(entries) ||
    entries.filter((entry) => entry?.path === doc.path).length !== 1 ||
    entries[pilot.reviewIndex]?.path !== doc.path
  )
    return ['native delivery requires its unique fixed current-review position']
  const row = entries[pilot.reviewIndex]
  const issues = []
  if (
    row.docType !== 'evidence-receipt' ||
    row.templateId !== definition.templateId ||
    row.templateVariant !== definition.variant ||
    row.templateVersion !== definition.version ||
    row.historyOverlay !== false ||
    row.artifactOnly !== false ||
    row.documentStatus !== 'historical' ||
    row.historicalRole !== pilot.historicalRole ||
    row.sourceSha256 !== pilot.historicalSourceSha256 ||
    (row.sourceGitRevision ?? null) !== pilot.historicalSourceGitRevision ||
    row.afterSha256 !== pilot.sourceSha256 ||
    row.revision?.currentSha !== pilot.sourceSha256
  )
    issues.push('native delivery review identity/role/source axes mismatch')
  if (
    !nonempty(row.owner) ||
    !nonempty(row.coreConclusion) ||
    /^(Status|Owner|Template)\b/u.test(row.coreConclusion) ||
    row.coreConclusion.includes('undefined') ||
    !nonempty(row.readMethod) ||
    !nonempty(row.reviewedLines) ||
    !strings(row.truthAnchors) ||
    !nonempty(row.stopLine) ||
    !nonempty(row.nextStep) ||
    !Array.isArray(row.primarySource) ||
    !row.primarySource.some(
      (pin) =>
        pin?.path === doc.path &&
        pin.revision === definition.sourceRevision &&
        pin.gitObject === pilot.gitObject &&
        pin.sha256 === pilot.sourceSha256,
    )
  )
    issues.push('native delivery concrete review/source explanation missing')
  const evidence = row.evidence
  if (!object(evidence)) return [...issues, 'native delivery current evidence missing']
  if (
    evidence.kind !== definition.variant ||
    evidence.metadataLocation !== definition.metadataLocation ||
    evidence.runtimeExecutionPerformed !== false ||
    evidence.historicClaimsReexecuted !== false ||
    evidence.creditGranted !== 0 ||
    canonicalDigest(evidence.historicalBoundary) !== pilot.historicalBoundarySha256
  )
    issues.push('native delivery historical boundary/credit mismatch')
  if (!isDeepStrictEqual(evidence.readDomain, historicalDeliveryReadDomain))
    issues.push('native delivery accepted read domain changed')
  issues.push(...witnessIssues(evidence.nativeWitnesses, native, pilot))
  issues.push(...contextIssues(evidence.contextReferences, options.readSourceBuffer))
  const expectedInputs = [
    {
      kind: 'native-carrier',
      path: doc.path,
      revision: definition.sourceRevision,
      sha256: pilot.sourceSha256,
    },
    { kind: 'historical-context', ...historicalDeliveryIntegritySource },
  ]
  if (!isDeepStrictEqual(row.legalInputs, expectedInputs))
    issues.push('native delivery legal inputs must separate carrier/context from recorded results')
  if (
    row.businessOracle?.type !== 'historical-receipt-content' ||
    row.businessOracle.historicalOnly !== true ||
    !strings(row.businessOracle.assertions)
  )
    issues.push('native delivery historical content oracle missing')
  const roles = evidence.fieldRoles
  if (
    !object(roles) ||
    !strings(roles.identity) ||
    !strings(roles.results) ||
    !isDeepStrictEqual(roles.governance, [`${pilot.reviewRecord}#entries/${pilot.reviewIndex}`])
  )
    issues.push('native delivery field roles/current governance binding mismatch')
  const retention = evidence.retention
  if (
    retention?.recommendation !== 'retain-native' ||
    retention.permanentRetentionProven !== false ||
    retention.completeSubstituteAssessment !== 'not-performed' ||
    !nonempty(retention.reason) ||
    !nonempty(retention.removalPrecondition)
  )
    issues.push('native delivery provisional retention boundary missing')
  return issues
}
