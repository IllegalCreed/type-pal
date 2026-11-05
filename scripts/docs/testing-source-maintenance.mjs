import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual as same } from 'node:util'
import { decodeTerminalUtf8, parseTerminalJson } from './terminal-json.mjs'
import { testingSourceMaintenanceAdmissions } from './testing-source-maintenance-admission.mjs'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const demand = (ok, message) => assert(ok, `testing source maintenance: ${message}`)
function admitted(path) {
  const admission = testingSourceMaintenanceAdmissions.find((entry) => entry.path === path)
  demand(admission, 'path is not admitted')
  return admission
}

/** The current body does not replace the original owner's signed acceptance. */
export function assertTestingSourceMaintenanceOwner({ doc, row, owner, index, template }) {
  const admission = admitted(doc.path)
  demand(
    owner === admission.owner &&
      index === admission.index &&
      row.path === admission.path &&
      row.afterSha256 === admission.source.sha256,
    'original owner, position or source differs',
  )
  const audit = admission.kind === 'document-audit'
  const templateId = audit ? 'test-machine-evidence-v1' : 'governance-index-v1'
  const docType = audit ? 'test-machine-evidence' : 'governance-index'
  const variant = audit ? 'document-audit-v2' : 'current-governance-control-native-v1'
  const version = audit ? '1.5.0' : '1.0.0'
  demand(
    doc.templateId === templateId &&
      row.templateId === templateId &&
      template?.templateId === templateId &&
      row.docType === docType &&
      template.docType === docType &&
      doc.variant === variant &&
      row.templateVariant === variant &&
      row.templateVersion === version &&
      (template.variants?.[variant]?.templateVersion ?? template.templateVersion) === version &&
      template.variants?.[variant]?.format === (audit ? 'json' : 'json-native') &&
      !doc.historyOverlay &&
      !row.historyOverlay,
    'original template/variant contract differs',
  )
  if (audit)
    demand(same(row.primarySource, [admission.source]), 'original audit source pin differs')
  return admission
}

function assertSourceRefs(before, after, readBuffer) {
  demand(
    Array.isArray(before) &&
      before.length > 0 &&
      Array.isArray(after) &&
      after.length === before.length,
    'source inventory changed',
  )
  for (const [index, ref] of after.entries()) {
    const prior = before[index]
    demand(
      ref &&
        /^[a-f\d]{64}$/u.test(ref.sha256 ?? '') &&
        same({ ...ref, sha256: prior.sha256 }, prior),
      'only sourceRefs sha256 values may change',
    )
    // Addresses/ranges are fixed by the original carrier, never caller-supplied additions.
    const actual = readBuffer(ref.path)
    demand(
      Buffer.isBuffer(actual) && hash(actual) === ref.sha256,
      `source bytes differ: ${ref.path}`,
    )
    const lines = decodeTerminalUtf8(actual).trimEnd().split('\n')
    const range = /^(\d+)-(\d+)$/u.exec(ref.lines ?? '')
    const start = Number(range?.[1])
    const end = Number(range?.[2])
    demand(
      Number.isSafeInteger(start) &&
        Number.isSafeInteger(end) &&
        start >= 1 &&
        end >= start &&
        end <= lines.length &&
        typeof ref.anchor === 'string' &&
        ref.anchor.length > 0 &&
        lines
          .slice(start - 1, end)
          .join('\n')
          .includes(ref.anchor),
      `source range or anchor differs: ${ref.path}`,
    )
  }
}

function assertAudit(before, after, readBuffer) {
  demand(
    before?.kind === 'document-audit' &&
      after?.kind === 'document-audit' &&
      before.runtimeExecution?.performed === false &&
      after.runtimeExecution?.performed === false,
    'source maintenance cannot grant execution',
  )
  demand(
    Array.isArray(before.findings) &&
      Array.isArray(after.findings) &&
      after.findings.length > before.findings.length &&
      after.findings.every((finding) => typeof finding === 'string' && finding.trim()) &&
      same(after.findings.slice(after.findings.length - before.findings.length), before.findings),
    'original findings must remain an exact suffix',
  )
  demand(
    same({ ...after, sourceRefs: before.sourceRefs, findings: before.findings }, before),
    'fields outside sourceRefs and findings changed',
  )
  assertSourceRefs(before.sourceRefs, after.sourceRefs, readBuffer)
}

function assertCatalog(before, after, readBuffer) {
  demand(
    before.schemaVersion === 2 &&
      before._governance?.runtimeExecutionPerformed === false &&
      after._governance?.runtimeExecutionPerformed === false &&
      Array.isArray(before.entries) &&
      Array.isArray(after.entries) &&
      after.entries.length === before.entries.length &&
      same({ ...after, entries: before.entries }, before),
    'catalog governance, shape or execution changed',
  )
  let reviewed = 0
  for (const [index, prior] of before.entries.entries()) {
    const entry = after.entries[index]
    if (!['e2e-001', 'e2e-common-issues'].includes(prior.id)) {
      demand(same(entry, prior), `unadmitted catalog entry changed: ${prior.id}`)
      continue
    }
    reviewed += 1
    demand(
      typeof prior.reviewScope === 'string' &&
        typeof entry.reviewScope === 'string' &&
        entry.reviewScope.length > prior.reviewScope.length &&
        entry.reviewScope.startsWith(prior.reviewScope),
      'original reviewScope must remain an exact prefix',
    )
    demand(
      same({ ...entry, sourceRefs: prior.sourceRefs, reviewScope: prior.reviewScope }, prior),
      'catalog fields outside sourceRefs and reviewScope changed',
    )
    assertSourceRefs(prior.sourceRefs, entry.sourceRefs, readBuffer)
  }
  demand(reviewed === 2, 'exact two catalog identities required')
}

/** A closed, byte-pinned source applicability update, never new execution credit.
 * All consumers share this gate; other native carriers retain their original freeze. */
export function assertTestingSourceMaintenance({ path, before, current, readBuffer }) {
  const admission = admitted(path)
  demand(
    Buffer.isBuffer(before) && hash(before) === admission.source.sha256,
    'actual original bytes differ',
  )
  demand(
    Buffer.isBuffer(current) && typeof readBuffer === 'function',
    'actual byte readers required',
  )
  const prior = parseTerminalJson(before)
  const next = parseTerminalJson(current)
  if (admission.kind === 'document-audit') assertAudit(prior, next, readBuffer)
  else assertCatalog(prior, next, readBuffer)
  demand(hash(current) === admission.afterSha256, 'candidate bytes are not independently admitted')
}
