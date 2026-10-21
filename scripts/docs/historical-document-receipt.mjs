import { parseTerminalJson } from './terminal-json.mjs'

const directory = 'docs/ops/archive/evidence/DOC-IA-2/'
export const historicalDocumentReceipts = Object.freeze({
  [`${directory}additional-attachments.json`]: 'historical-document-relocation-v1',
  [`${directory}relocation.json`]: 'historical-document-relocation-v1',
  [`${directory}preservation-report.json`]: 'historical-document-preservation-v1',
})
export const historicalReceiptKind = 'historical-document-receipt-v1'
const governanceKeys = [
  'templateId',
  'templateVersion',
  'variant',
  'lifecycle',
  'lastReviewed',
  'owner',
  'sourceGitRevision',
  'sourceGitObject',
  'sourceSha256',
  'reviewRecord',
  'currentAudit',
  'stopLine',
  'nextStep',
]
const auditKeys = [
  'identity',
  'sourceAndInputs',
  'oracle',
  'result',
  'limits',
  'runtimeExecutionPerformed',
  'historicClaimsReexecuted',
  'unverifiedClaims',
]
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0
const exact = (value, keys) =>
  object(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key))

/** Fixed pilot identities cannot be reapproved by changing their candidate routing. */
export function historicalDocumentReceiptIssues(text, doc, template, contract, options) {
  const variant = historicalDocumentReceipts[doc.path]
  if (
    !variant &&
    !Object.values(historicalDocumentReceipts).includes(doc.variant) &&
    contract?.preservedSource?.kind !== historicalReceiptKind
  )
    return undefined
  if (
    !variant ||
    doc.templateId !== 'evidence-receipt-v1' ||
    doc.variant !== variant ||
    doc.historyOverlay ||
    template.templateId !== 'evidence-receipt-v1' ||
    contract?.format !== 'json' ||
    contract.templateVersion !== '1.0.0' ||
    contract.preservedSource?.kind !== historicalReceiptKind
  )
    return ['historical document receipt requires its fixed native path/variant/version contract']
  let value
  try {
    const bytes = options.readBuffer?.(doc.path)
    value = parseTerminalJson(bytes)
    if (!bytes.equals(Buffer.from(text))) return ['historical receipt text/byte reader mismatch']
  } catch (error) {
    return [`historical receipt JSON bytes invalid: ${error.message}`]
  }
  const metadata = value?._governance
  if (!exact(metadata, governanceKeys)) return ['historical receipt governance shape invalid']
  const issues = []
  if (
    metadata.templateId !== 'evidence-receipt-v1' ||
    metadata.templateVersion !== '1.0.0' ||
    metadata.variant !== variant ||
    metadata.lifecycle !== 'historical' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(metadata.lastReviewed) ||
    !nonempty(metadata.owner) ||
    metadata.reviewRecord !== '20261017-r37-ops-json-evidence.json' ||
    !nonempty(metadata.stopLine) ||
    !nonempty(metadata.nextStep)
  )
    issues.push('historical receipt identity/lifecycle declarations invalid')
  const audit = metadata.currentAudit
  if (!exact(audit, auditKeys)) return [...issues, 'historical receipt current audit shape invalid']
  if (
    ['identity', 'sourceAndInputs', 'result', 'limits'].some((key) => !nonempty(audit[key])) ||
    !Array.isArray(audit.oracle) ||
    !audit.oracle.length ||
    !audit.oracle.every(nonempty)
  )
    issues.push('historical receipt five evidence sections need concrete content')
  if (audit.runtimeExecutionPerformed !== false || audit.historicClaimsReexecuted !== false)
    issues.push('historical receipt cannot grant current or repeated historical execution')
  const expected = doc.path === `${directory}relocation.json` ? [1, 58] : []
  if (
    !Array.isArray(audit.unverifiedClaims) ||
    audit.unverifiedClaims.length !== expected.length ||
    !audit.unverifiedClaims.every(
      (claim, index) =>
        exact(claim, ['entry', 'status', 'reason']) &&
        claim.entry === expected[index] &&
        claim.status === 'unverified' &&
        nonempty(claim.reason),
    )
  )
    issues.push('historical receipt unverified source claims cannot be dropped or certified')
  return issues
}
