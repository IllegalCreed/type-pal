import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import {
  nativeFamilyAdmission,
  nativeFamilyCarrierRevision,
  nativeFamilyContracts,
} from './historical-native-family-admission.mjs'
import { nativeFamilyQualificationIssues } from './historical-native-family-qualification.mjs'
import { nativeFamilyReading } from './historical-native-family-reading.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const text = (value) => typeof value === 'string' && value.trim().length > 0
const texts = (value) => Array.isArray(value) && value.length > 0 && value.every(text)
const textList = (value) => Array.isArray(value) && value.every(text)
const variants = new Set(Object.values(nativeFamilyContracts).map((item) => item.variant))

function hasPointer(value, pointer) {
  if (pointer === '') return true
  if (typeof pointer !== 'string' || !pointer.startsWith('/') || /~(?![01])/u.test(pointer))
    return false
  let current = value
  for (const token of pointer.slice(1).split('/')) {
    const key = token.replaceAll('~1', '/').replaceAll('~0', '~')
    if (current === null || typeof current !== 'object') return false
    if (Array.isArray(current) && !/^(0|[1-9]\d*)$/u.test(key)) return false
    if (!Object.hasOwn(current, key)) return false
    current = current[key]
  }
  return true
}

function rolePointers(value, native) {
  return Array.isArray(value) && value.length > 0 && value.every((p) => hasPointer(native, p))
}

function sourceMatches(source, pin) {
  return (
    source?.path === pin.path &&
    source.revision === pin.revision &&
    source.mode === '100644' &&
    source.gitObject === pin.gitObject &&
    Buffer.isBuffer(source.buffer) &&
    digest(source.buffer) === pin.sha256
  )
}

/** Exact original carrier + one existing review: no payload rewrite or new sidecar. */
export function historicalNativeFamilyIssues(doc, template, contract, read, options = {}) {
  const pilot = nativeFamilyAdmission(doc.path)
  // The established Vitest cohort retains its own admission and implementation.
  if (!pilot && doc.variant === 'historical-vitest-native-v1') return undefined
  if (!pilot && !variants.has(doc.variant)) return undefined
  const definition = pilot && nativeFamilyContracts[pilot.family]
  if (
    !pilot ||
    doc.templateId !== definition.templateId ||
    doc.variant !== definition.variant ||
    doc.historyOverlay ||
    template?.templateId !== definition.templateId ||
    contract?.format !== 'json-native' ||
    contract.templateVersion !== definition.templateVersion ||
    contract.metadataLocation !== definition.metadataLocation ||
    (doc.variant !== 'historical-vitest-native-v1' &&
      contract.sourceCarrierRevision !== nativeFamilyCarrierRevision)
  )
    return ['native family requires its exact pilot/path/variant/version contract']
  if (
    typeof options.readBuffer !== 'function' ||
    typeof options.readSourceBuffer !== 'function' ||
    typeof options.reviewReader !== 'function'
  )
    return ['native family requires original byte providers and protected reviewReader']
  const bytes = options.readBuffer(doc.path)
  let native
  let reading
  try {
    native = parseTerminalJson(bytes)
    reading = nativeFamilyReading(native, pilot.family)
  } catch (error) {
    return [`native family JSON/shape invalid: ${error.message}`]
  }
  const pin = {
    path: pilot.path,
    revision: nativeFamilyCarrierRevision,
    gitObject: pilot.carrierGitObject,
    sha256: pilot.carrierSha256,
  }
  const source = options.readSourceBuffer(pin)
  if (!sourceMatches(source, pin)) return ['native family fixed Git carrier mismatch']
  if (!bytes.equals(source.buffer) || read(doc.path) !== bytes.toString('utf8'))
    return ['native family original carrier bytes changed']
  let entries
  try {
    entries = options.reviewReader(pilot.reviewRecord)?.entries
  } catch (error) {
    return [`native family protected review unavailable: ${error.message}`]
  }
  if (
    !Array.isArray(entries) ||
    entries.filter((row) => row?.path === doc.path).length !== 1 ||
    entries[pilot.reviewIndex]?.path !== doc.path
  )
    return ['native family requires one fixed current-review position']
  const row = entries[pilot.reviewIndex]
  const issues = []
  if (
    row.docType !== definition.templateId.replace(/-v1$/u, '') ||
    row.templateId !== doc.templateId ||
    row.templateVariant !== doc.variant ||
    row.templateVersion !== definition.templateVersion ||
    row.historyOverlay !== false ||
    row.artifactOnly !== false ||
    row.documentStatus !== 'historical' ||
    row.sourceSha256 !== pilot.sourceSha256 ||
    row.sourceGitRevision !== pilot.sourceGitRevision ||
    row.afterSha256 !== pin.sha256 ||
    row.revision?.currentSha !== pin.sha256
  )
    issues.push('native family current-review identity or historical source axes mismatch')
  if (
    !text(row.owner) ||
    !text(row.coreConclusion) ||
    /^(Status|Owner|Template)\b/u.test(row.coreConclusion) ||
    !texts(row.truthAnchors) ||
    !text(row.readDomain?.actual) ||
    !textList(row.readDomain?.reusedFrom) ||
    !texts(row.readDomain?.notRead) ||
    !text(row.historyBoundary) ||
    !text(row.stopLine) ||
    !text(row.nextStep)
  )
    issues.push('native family specific review sections/read domain missing')
  if (
    !rolePointers(row.fieldRoles?.identity, native) ||
    !rolePointers(row.fieldRoles?.results, native) ||
    !isDeepStrictEqual(row.fieldRoles?.governance, [
      `${pilot.reviewRecord}#entries/${pilot.reviewIndex}`,
    ])
  )
    issues.push('native family field roles must resolve native fields and the fixed review row')
  if (
    !Array.isArray(row.primarySource) ||
    !row.primarySource.some((item) => isDeepStrictEqual(item, pin)) ||
    !isDeepStrictEqual(row.legalInputs, [{ kind: 'fixed-native-carrier', ...pin }])
  )
    issues.push('native family primary source/legal input must bind the fixed carrier, not results')
  if (
    row.businessOracle?.type !== 'historical-native-document' ||
    row.businessOracle.currentExecution !== false ||
    !texts(row.businessOracle.assertions) ||
    row.evidence?.kind !== 'historical-native-family' ||
    row.evidence.family !== pilot.family ||
    !isDeepStrictEqual(row.evidence.nativeReading, reading)
  )
    issues.push('native family oracle or complete native semantic reading mismatch')
  if (
    row.evidence?.runtimeExecutionPerformed !== false ||
    row.evidence?.historicClaimsReexecuted !== false ||
    row.evidence?.creditGranted !== 0
  )
    issues.push('native family evidence cannot grant execution or completion credit')
  issues.push(...nativeFamilyQualificationIssues(row, pilot))
  return issues
}
