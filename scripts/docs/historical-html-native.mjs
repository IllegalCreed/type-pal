import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import {
  historicalHtmlAdmissions,
  historicalHtmlCarrierRevision,
  historicalHtmlContentAcceptance,
  historicalHtmlContracts,
} from './historical-html-admission.mjs'
import { historicalHtmlExpansionContentAcceptance } from './historical-html-expansion-admission.mjs'
import { readHistoricalHtml, readHtmlResources } from './historical-html-reading.mjs'
import { nativeFamilyContentSha256 } from './historical-native-family-qualification.mjs'

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const text = (value) => typeof value === 'string' && value.trim().length > 0
const texts = (value) => Array.isArray(value) && value.length > 0 && value.every(text)
const variants = new Set(Object.values(historicalHtmlContracts).map((entry) => entry.variant))
const same = isDeepStrictEqual
function sourceMatches(source, pin) {
  return (
    source?.path === pin.path &&
    source.revision === pin.revision &&
    source.mode === '100644' &&
    source.gitObject === pin.gitObject &&
    Buffer.isBuffer(source.buffer) &&
    sha(source.buffer) === pin.sha256
  )
}

export function htmlSourceWitnesses(reading) {
  return [
    { selector: 'title', quote: reading.titleSource, representation: 'source-substring' },
    ...reading.scripts
      .filter((script) => script.src !== null)
      .map((script) => ({
        selector: 'script-source',
        quote: script.src,
        representation: 'source-substring',
      })),
  ]
}

/** Immutable source and static explanation only; no HTML script is ever executed. */
export function historicalHtmlIssues(doc, template, contract, read, options = {}) {
  const pilot = historicalHtmlAdmissions.find((entry) => entry.path === doc.path)
  if (!pilot && !variants.has(doc.variant)) return undefined
  const definition = pilot && historicalHtmlContracts[pilot.family]
  if (
    !pilot ||
    doc.templateId !== definition.templateId ||
    doc.variant !== definition.variant ||
    doc.historyOverlay ||
    doc.artifactOnly ||
    doc.artifactEnvelope ||
    template?.templateId !== definition.templateId ||
    !same(contract, definition)
  )
    return ['HTML native requires its exact admitted path/type/variant/version']
  if (
    typeof options.readBuffer !== 'function' ||
    typeof options.readHtmlSourceBuffer !== 'function' ||
    typeof options.reviewReader !== 'function'
  )
    return ['HTML native requires raw bytes, HTML Git provider and protected reviewReader']
  const pin = {
    path: doc.path,
    revision: historicalHtmlCarrierRevision,
    gitObject: pilot.carrierGitObject,
    sha256: pilot.carrierSha256,
  }
  const originalPin = {
    path: doc.path,
    revision: pilot.historicalSourceRevision,
    gitObject: pilot.historicalSourceGitObject,
    sha256: pilot.historicalSourceSha256,
  }
  const bytes = options.readBuffer(doc.path)
  if (
    !sourceMatches(options.readHtmlSourceBuffer(pin), pin) ||
    !sourceMatches(options.readHtmlSourceBuffer(originalPin), originalPin)
  )
    return ['HTML native fixed carrier or original Git source mismatch']
  if (!Buffer.isBuffer(bytes) || sha(bytes) !== pin.sha256)
    return ['HTML native original bytes changed']
  let reading
  try {
    reading = readHistoricalHtml(bytes)
  } catch {
    return ['HTML native source is not a readable UTF-8 document']
  }
  if (read(doc.path) !== bytes.toString('utf8')) return ['HTML text and byte readers differ']
  const record = options.reviewReader(pilot.reviewRecord)
  const row = record?.entries?.[pilot.reviewIndex]
  if (
    row?.path !== pilot.path ||
    record.entries.filter((entry) => entry.path === pilot.path).length !== 1
  )
    return ['HTML native requires its unique existing review position']
  const issues = []
  if (
    row.docType !== definition.templateId.replace(/-v1$/u, '') ||
    row.templateId !== definition.templateId ||
    row.templateVariant !== definition.variant ||
    row.templateVersion !== definition.templateVersion ||
    row.historyOverlay !== false ||
    row.artifactOnly !== false ||
    row.documentStatus !== 'historical' ||
    row.afterSha256 !== pin.sha256 ||
    row.sourceSha256 !== originalPin.sha256 ||
    row.sourceGitRevision !== originalPin.revision
  )
    issues.push('HTML native review identity/source/lifecycle mismatch')
  if (
    !text(row.owner) ||
    !text(row.coreConclusion) ||
    !texts(row.truthAnchors) ||
    !text(row.readDomain?.actual) ||
    !Array.isArray(row.readDomain?.reusedFrom) ||
    !texts(row.readDomain?.notRead) ||
    !text(row.historyBoundary) ||
    !text(row.versionScope) ||
    !text(row.readMethod) ||
    !text(row.reviewedLines) ||
    !Array.isArray(row.unresolved) ||
    !text(row.stopLine) ||
    !text(row.nextStep) ||
    !Array.isArray(row.publicCallers) ||
    !row.publicCallers.every((path) => text(path) && read(path) !== undefined) ||
    !text(row.dedupe?.result) ||
    !Array.isArray(row.dedupe?.against)
  )
    issues.push('HTML native concrete body/read-domain/history sections missing')
  if (
    !row.primarySource?.some((source) => same(source, pin)) ||
    !same(row.legalInputs, [{ kind: 'fixed-html-source', ...pin }]) ||
    row.businessOracle?.type !== 'historical-html-document' ||
    row.businessOracle.currentExecution !== false ||
    !texts(row.businessOracle.assertions)
  )
    issues.push('HTML native source/legal input/static oracle mismatch')
  const evidence = row.evidence
  const resources = readHtmlResources(doc.path, reading, read)
  const missing = resources.filter((entry) => entry.present === false).map((entry) => entry.value)
  if (
    !same(missing, pilot.expectedMissingReferences) ||
    (pilot.archivedBuildSource && read(pilot.archivedBuildSource) === undefined)
  )
    issues.push('HTML native dependency presence or archived build boundary changed')
  if (
    evidence?.kind !== 'historical-html-native' ||
    evidence.metadataLocation !== 'existing-current-review' ||
    evidence.runtimeExecutionPerformed !== false ||
    evidence.historicClaimsReexecuted !== false ||
    evidence.creditGranted !== 0 ||
    evidence.callerBoundary?.activeExecutionVerified !== false ||
    !text(evidence.callerBoundary?.scope) ||
    !same(evidence.htmlReading, reading) ||
    !same(evidence.resourceReading, resources) ||
    !same(evidence.nativeWitnesses, htmlSourceWitnesses(reading))
  )
    issues.push('HTML native actual DOM/resources/witnesses or execution boundary mismatch')
  if (
    !same(row.fieldRoles, {
      representation: 'derived-static-html/1',
      identity: ['/title'],
      results: ['/canvases', '/scripts', '/references'],
      governance: [`${pilot.reviewRecord}#entries/${pilot.reviewIndex}`],
    })
  )
    issues.push('HTML native derived-field roles/current governance binding mismatch')
  if (pilot.family === 'mockup' && (reading.scripts.length || reading.canvases.length))
    issues.push('HTML mockup pilot is static DOM, not a script/canvas host')
  const partial =
    row.contentReviewStatus === 'partial-review-unknown' &&
    row.templateCompliance === 'needs-migration' &&
    row.currentIndependentAcceptance === undefined
  if (!partial) {
    const accepted = Object.hasOwn(historicalHtmlContentAcceptance.contentByPath, doc.path)
      ? historicalHtmlContentAcceptance
      : historicalHtmlExpansionContentAcceptance
    const contentSha256 = accepted.contentByPath[doc.path]
    if (
      !/^[a-f\d]{64}$/u.test(contentSha256 ?? '') ||
      !/^[a-f\d]{64}$/u.test(accepted.reportSha256 ?? '') ||
      nativeFamilyContentSha256(row) !== contentSha256 ||
      !same(row.currentIndependentAcceptance, {
        protocol: 'document-delivery-acceptance/1.0.0',
        reviewer: accepted.reviewer,
        nonAuthorReviewer: true,
        verdict: 'accept',
        path: pilot.path,
        afterSha256: pilot.carrierSha256,
        contentSha256,
        reportSha256: accepted.reportSha256,
        ownerDecision: {
          actor: 'Codex',
          task: accepted.task ?? 'DOCS-FULL-TEMPLATE-1/S59',
          currentBodyReview: true,
          currentTemplateMigration: true,
          oldClaimRestored: false,
          runtimeCredit: false,
        },
      }) ||
      row.contentReviewStatus !== 'content-reviewed' ||
      row.templateCompliance !== 'template-compliant' ||
      row.claimCorrection !== undefined
    )
      issues.push('HTML native promotion requires its exact external content acceptance')
  }
  return issues
}
