import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import {
  currentReviewLedgerAdmissions,
  currentReviewLedgerBaseline,
  currentReviewLedgerContract,
} from './current-review-ledger-admission.mjs'
import { currentLedgerQualificationIssues } from './current-review-ledger-qualification.mjs'
import { currentLedgerStorageUpgrade } from './current-review-ledger-storage-admission.mjs'
import {
  assertReviewRecordSourceUnchanged,
  readReviewRecordObject,
} from './review-record-storage.mjs'
import { inspectRollforwardCohort, priorRollforwardRecord } from './rollforward-review.mjs'
import { canonicalTerminalJson, parseTerminalJson } from './terminal-json.mjs'

const digest = (value) => createHash('sha256').update(canonicalTerminalJson(value)).digest('hex')
const byteDigest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const text = (v) => typeof v === 'string' && v.trim().length > 0
const texts = (v) => Array.isArray(v) && v.length > 0 && v.every(text)
export function ledgerIdentity(record) {
  const header = { ...record }
  delete header.entries
  delete header.maintenanceHistory
  return {
    headerSha256: digest(header),
    membershipSha256: digest(
      record.entries.map((entry) => ({
        path: entry.path,
        sourceSha256: entry.sourceSha256 ?? null,
        sourceGitRevision: entry.sourceGitRevision ?? null,
      })),
    ),
  }
}

/** Existing grouped lore transfers and single-subject phase transfers have the same identity proof. */
export function currentLedgerTransfers(record) {
  return (record.currentRecordTransfers ?? []).flatMap((transfer) => {
    if (transfer.subjects === undefined) return [transfer]
    if (
      !Array.isArray(transfer.subjects) ||
      transfer.subjects.length === 0 ||
      transfer.path !== undefined ||
      transfer.completePrior !== undefined
    )
      throw new Error('ambiguous grouped historical transfer')
    return transfer.subjects.map((subject) => ({
      path: subject.path,
      destination: transfer.destination,
      completePrior: subject.completeOriginalCurrent,
    }))
  })
}

/** Validates ledger ownership and history; never accepts its child document claims. */
export function currentReviewLedgerIssues(doc, template, contract, read, options = {}) {
  const binding = currentReviewLedgerAdmissions.find((entry) => entry.path === doc.path)
  if (!binding && doc.variant !== currentReviewLedgerContract.variant) return undefined
  if (
    !binding ||
    doc.templateId !== currentReviewLedgerContract.templateId ||
    template?.templateId !== doc.templateId ||
    doc.variant !== currentReviewLedgerContract.variant ||
    doc.historyOverlay ||
    !isDeepStrictEqual(contract, currentReviewLedgerContract)
  )
    return ['current review ledger requires its exact current contract and admitted identity']
  if (
    typeof options.reviewGroupReader !== 'function' ||
    typeof options.readBuffer !== 'function' ||
    typeof options.readSourceBuffer !== 'function'
  )
    return ['current review ledger requires protected full-group and Git byte providers']
  try {
    const group = options.reviewGroupReader()
    assertReviewRecordSourceUnchanged(group.loadedSource)
    const raw = options.readBuffer(doc.path)
    parseTerminalJson(raw)
    if (read(doc.path) !== raw.toString('utf8')) throw new Error('text/byte view mismatch')
    const live = group.records.get(doc.path)
    if (!live || !isDeepStrictEqual(live, readReviewRecordObject(doc.path, options)))
      throw new Error('logical object differs from protected current storage')
    const originalBuffer = (path) => {
      const pin = options.readSourceBuffer({ path, revision: currentReviewLedgerBaseline })
      if (
        !pin ||
        pin.path !== path ||
        pin.revision !== currentReviewLedgerBaseline ||
        pin.mode !== '100644' ||
        !/^[a-f\d]{40}$/u.test(pin.gitObject ?? '') ||
        !Buffer.isBuffer(pin.buffer)
      )
        throw new Error('original control Git snapshot unavailable')
      return pin.buffer
    }
    const original = readReviewRecordObject(doc.path, { readBuffer: originalBuffer })
    const fixed = ledgerIdentity(original)
    if (
      fixed.headerSha256 !== binding.headerSha256 ||
      fixed.membershipSha256 !== binding.membershipSha256 ||
      !isDeepStrictEqual(
        ledgerIdentity(priorRollforwardRecord(live, inspectRollforwardCohort(group.records))),
        fixed,
      )
    )
      throw new Error('control header or ordered membership/source identity changed')
    const history = original.maintenanceHistory ?? []
    if (!isDeepStrictEqual((live.maintenanceHistory ?? []).slice(0, history.length), history))
      throw new Error('control maintenance history prefix changed')
    const beforeStorage = parseTerminalJson(originalBuffer(doc.path))._reviewStorage
    const currentStorage = group.storages.get(doc.path)
    if (beforeStorage && !isDeepStrictEqual(currentStorage?.source, beforeStorage.source))
      throw new Error('original storage source pin changed')
    if (
      !beforeStorage &&
      currentStorage &&
      (doc.path !== currentLedgerStorageUpgrade.path ||
        !isDeepStrictEqual(currentStorage.source, currentLedgerStorageUpgrade))
    )
      throw new Error('unadmitted current ledger storage upgrade')
    const memberPaths = new Set(live.entries.map((entry) => entry.path))
    if (memberPaths.size !== live.entries.length) throw new Error('duplicate current member path')
    const owners = [...group.records].flatMap(([owner, record]) =>
      record.entries.filter((entry) => entry.path === doc.path).map((row) => ({ owner, row })),
    )
    const row = group.records.get(binding.reviewRecord)?.entries[binding.index]
    if (owners.length !== 1 || owners[0].owner !== binding.reviewRecord || owners[0].row !== row)
      throw new Error('current control requires one exact review owner/position')
    if (
      row?.path !== doc.path ||
      row.afterSha256 !== byteDigest(raw) ||
      row.templateId !== doc.templateId ||
      row.templateVariant !== doc.variant ||
      row.templateVersion !== '1.0.0' ||
      row.documentStatus !== 'current' ||
      row.historyOverlay !== false ||
      row.artifactOnly !== false ||
      row.artifactEnvelope === true
    )
      throw new Error('current control review identity/observed byte pin mismatch')
    const qualificationIssues = currentLedgerQualificationIssues(row, binding)
    if (qualificationIssues.length) throw new Error(qualificationIssues.join('; '))
    if (
      !text(row.coreConclusion) ||
      !texts(row.truthAnchors) ||
      !text(row.owner) ||
      !text(row.readDomain?.actual) ||
      !texts(row.readDomain?.notRead) ||
      !texts(row.publicCallers) ||
      !texts(row.fieldRoles?.logical) ||
      !texts(row.fieldRoles?.physical) ||
      !isDeepStrictEqual(row.fieldRoles?.governance, [
        `${binding.reviewRecord}#entries/${binding.index}`,
      ]) ||
      !texts(row.legalInputs) ||
      !text(row.historyBoundary) ||
      !text(row.stopLine) ||
      !text(row.nextStep) ||
      row.businessOracle?.type !== 'current-review-ledger-integrity' ||
      !texts(row.businessOracle.assertions)
    )
      throw new Error('current control concrete authority/input/oracle/history sections incomplete')
    if (
      row.evidence?.kind !== 'current-review-ledger-pilot' ||
      row.evidence.path !== doc.path ||
      row.evidence.baselineRevision !== currentReviewLedgerBaseline ||
      row.evidence.headerSha256 !== binding.headerSha256 ||
      row.evidence.membershipSha256 !== binding.membershipSha256 ||
      row.evidence.runtimeExecutionPerformed !== false ||
      row.evidence.historicClaimsReexecuted !== false ||
      row.evidence.childSemanticAcceptanceGranted !== false
    )
      throw new Error('current ledger integrity must not grant child semantics or execution credit')
    for (const transfer of currentLedgerTransfers(live)) {
      const prior = transfer.completePrior
      const source = options.readSourceBuffer({ path: prior?.path, revision: prior?.revision })
      if (
        !source ||
        source.path !== prior.path ||
        source.revision !== prior.revision ||
        source.mode !== '100644' ||
        source.gitObject !== prior.gitObject ||
        byteDigest(source.buffer) !== prior.fileSha256
      )
        throw new Error('historical transfer Git identity mismatch')
      const record = parseTerminalJson(source.buffer)
      const oldRows = record.entries?.filter((entry) => entry.path === transfer.path)
      const destination = group.records.get(transfer.destination)
      const currentRows = destination?.entries?.filter((entry) => entry.path === transfer.path)
      const all = [...group.records.values()].flatMap((r) =>
        r.entries.filter((e) => e.path === transfer.path),
      )
      if (
        prior.selector?.['entries.path'] !== transfer.path ||
        prior.selector.uniqueMatches !== 1 ||
        oldRows?.length !== 1 ||
        currentRows?.length !== 1 ||
        all.length !== 1 ||
        memberPaths.has(transfer.path)
      )
        throw new Error('historical transfer prior/destination membership mismatch')
    }
    assertReviewRecordSourceUnchanged(group.loadedSource)
    return []
  } catch (error) {
    return [`current review ledger: ${error.message}`]
  }
}
