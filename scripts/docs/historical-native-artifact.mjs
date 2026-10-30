import { createHash } from 'node:crypto'
import { isDeepStrictEqual as same } from 'node:util'
import {
  nativeArtifactAdmission,
  nativeArtifactContracts,
} from './historical-native-artifact-admission.mjs'
import { nativeArtifactCarrierRevision } from './historical-native-artifact-bindings.mjs'
import { nativeArtifactQualificationIssues } from './historical-native-artifact-qualification.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

export const nativeArtifactHash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const text = (v) => typeof v === 'string' && v.trim().length > 0
const texts = (v) => Array.isArray(v) && v.length > 0 && v.every(text)
const type = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)
const variants = new Set(Object.values(nativeArtifactContracts).map((c) => c.variant))
export function nativeArtifactPointer(value, pointer) {
  if (pointer === '') return value
  if (typeof pointer !== 'string' || !pointer.startsWith('/') || /~(?![01])/u.test(pointer))
    throw new Error('invalid native pointer')
  let v = value
  for (const raw of pointer.slice(1).split('/')) {
    const key = raw.replaceAll('~1', '/').replaceAll('~0', '~')
    if (
      v === null ||
      typeof v !== 'object' ||
      !Object.hasOwn(v, key) ||
      (Array.isArray(v) && !/^(0|[1-9]\d*)$/u.test(key))
    )
      throw new Error(`unresolved native pointer: ${pointer}`)
    v = v[key]
  }
  return v
}
export function nativeArtifactShape(value) {
  return Array.isArray(value)
    ? { type: 'array', length: value.length, itemTypes: [...new Set(value.map(type))].sort() }
    : { type: 'object', fields: Object.entries(value).map(([k, v]) => [k, type(v)]) }
}

/** Compact factual witnesses avoid copying whole native reports merely to prove counts. */
export function nativeArtifactWitnessMatches(native, witness) {
  const value = nativeArtifactPointer(native, witness.pointer)
  if (Buffer.byteLength(JSON.stringify(witness.value)) > 4096)
    throw new Error('native witness exceeds4096 bytes; cite a specific field/count/substring')
  switch (witness.op ?? 'equals') {
    case 'equals':
      return same(value, witness.value)
    case 'array-length':
      return (
        Array.isArray(value) &&
        Number.isSafeInteger(witness.value) &&
        value.length === witness.value
      )
    case 'object-keys':
      return type(value) === 'object' && same(Object.keys(value), witness.value)
    case 'object-key-count':
      return (
        type(value) === 'object' &&
        Number.isSafeInteger(witness.value) &&
        Object.keys(value).length === witness.value
      )
    case 'string-contains':
      return typeof value === 'string' && text(witness.value) && value.includes(witness.value)
    default:
      throw new Error(`unsupported native witness operation: ${witness.op}`)
  }
}

/** Checks a historical explanation. It deliberately does not certify human reading or old execution. */
export function nativeArtifactReviewIssues(row, binding, native) {
  const issues = []
  if (
    row.path !== binding.path ||
    !nativeArtifactContracts[row.templateId] ||
    row.docType !== row.templateId.replace(/-v1$/u, '') ||
    row.templateVariant !==
      (binding.existingVariant ?? nativeArtifactContracts[row.templateId].variant) ||
    row.templateVersion !== '1.0.0' ||
    row.historyOverlay !== false ||
    row.artifactOnly !== false ||
    row.artifactEnvelope === true ||
    row.documentStatus !== 'historical' ||
    row.afterSha256 !== binding.carrierSha256 ||
    row.sourceSha256 !== binding.historicalSource.sourceSha256 ||
    (row.sourceGitRevision ?? null) !== binding.historicalSource.sourceGitRevision
  )
    issues.push('native artifact identity/type/source axes mismatch')
  issues.push(...nativeArtifactQualificationIssues(row, binding))
  if (
    !text(row.coreConclusion) ||
    /^(Status|Owner|Template)\b/u.test(row.coreConclusion) ||
    !text(row.owner) ||
    !texts(row.truthAnchors) ||
    !text(row.readDomain?.actual) ||
    !Array.isArray(row.readDomain?.reusedFrom) ||
    !texts(row.readDomain?.notRead) ||
    !texts(row.publicCallers) ||
    !text(row.historyBoundary) ||
    !text(row.stopLine) ||
    !text(row.nextStep) ||
    !texts(row.businessOracle?.assertions) ||
    row.businessOracle.currentExecution !== false ||
    row.businessOracle.type !== 'historical-native-document'
  )
    issues.push('native artifact concrete content/read domain/history/oracle incomplete')
  const pin = {
    path: binding.path,
    revision: binding.carrierRevision ?? nativeArtifactCarrierRevision,
    gitObject: binding.carrierGitObject,
    sha256: binding.carrierSha256,
  }
  if (
    !Array.isArray(row.primarySource) ||
    !row.primarySource.some((p) => same(p, pin)) ||
    !same(row.legalInputs, [{ kind: 'fixed-native-carrier', ...pin }])
  )
    issues.push(
      'native artifact legal input must bind its carrier, not a result or execution claim',
    )
  const e = row.evidence
  if (
    e?.kind !== 'historical-native-artifact' ||
    e.path !== binding.path ||
    e.family !== binding.family ||
    e.runtimeExecutionPerformed !== false ||
    e.historicClaimsReexecuted !== false ||
    e.creditGranted !== 0 ||
    !same(e.nativeShape, binding.rootShape) ||
    !same(nativeArtifactShape(native), binding.rootShape)
  )
    issues.push('native artifact native shape/family/execution boundary mismatch')
  if (
    !same(row.fieldRoles?.governance, [`${binding.reviewRecord}#entries/${binding.reviewIndex}`]) ||
    !Array.isArray(row.fieldRoles?.nativePointers) ||
    !row.fieldRoles.nativePointers.length
  )
    issues.push(
      'native artifact field roles must bind native pointers and the one current-review position',
    )
  try {
    for (const p of row.fieldRoles?.nativePointers ?? []) nativeArtifactPointer(native, p)
    if (!Array.isArray(e?.witnesses) || e.witnesses.length < binding.requiredWitnesses.length)
      throw new Error('missing source witnesses')
    for (const w of e.witnesses) {
      if (!text(w.claim) || !nativeArtifactWitnessMatches(native, w))
        throw new Error(`native claim witness mismatch: ${w.pointer}`)
    }
    for (const required of binding.requiredWitnesses)
      if (
        !e.witnesses.some(
          (w) =>
            w.pointer === required.pointer &&
            (w.op ?? 'equals') === 'equals' &&
            same(w.value, required.value),
        )
      )
        throw new Error('original claim witness removed')
  } catch (error) {
    issues.push(error.message)
  }
  return issues
}

export function historicalNativeArtifactIssues(doc, template, contract, read, options = {}) {
  const binding = nativeArtifactAdmission(doc.path)
  // Six existing DOC-IA-2/Vitest pilots retain their original, more specific guards.
  if (binding?.existingVariant) return undefined
  if (!binding && !variants.has(doc.variant)) return undefined
  const definition = nativeArtifactContracts[doc.templateId]
  if (
    !binding ||
    !same(contract, definition) ||
    template?.templateId !== doc.templateId ||
    doc.variant !== definition.variant ||
    doc.historyOverlay
  )
    return ['native artifact requires its exact admitted path and frozen role/variant contract']
  if (
    typeof options.readBuffer !== 'function' ||
    typeof options.readSourceBuffer !== 'function' ||
    typeof options.reviewReader !== 'function'
  )
    return ['native artifact requires original byte providers and a protected reviewReader']
  try {
    const bytes = options.readBuffer(doc.path),
      native = parseTerminalJson(bytes)
    const source = options.readSourceBuffer({
      path: doc.path,
      revision: nativeArtifactCarrierRevision,
    })
    if (
      source?.path !== doc.path ||
      source.revision !== nativeArtifactCarrierRevision ||
      source.mode !== '100644' ||
      source.gitObject !== binding.carrierGitObject ||
      !Buffer.isBuffer(source.buffer) ||
      nativeArtifactHash(source.buffer) !== binding.carrierSha256 ||
      !bytes.equals(source.buffer) ||
      read(doc.path) !== bytes.toString('utf8')
    )
      return ['native artifact fixed carrier Git identity/bytes mismatch']
    const record = options.reviewReader(binding.reviewRecord)
    if (
      record?.entries?.filter((r) => r.path === doc.path).length !== 1 ||
      record.entries[binding.reviewIndex]?.path !== doc.path
    )
      return ['native artifact requires its one protected current-review position']
    return nativeArtifactReviewIssues(record.entries[binding.reviewIndex], binding, native)
  } catch (error) {
    return [`native artifact unavailable: ${error.message}`]
  }
}
