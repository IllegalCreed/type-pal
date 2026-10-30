import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { isTaskDocument, taskInfo } from './check.mjs'
import { checkMigratedDocument } from './document-model.mjs'
import { nativeArtifactReviewIssues, nativeArtifactShape } from './historical-native-artifact.mjs'
import { nativeArtifactContracts } from './historical-native-artifact-admission.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

export const incrementalCandidateProtocol = 'document-incremental-candidates/1.0.0'
export const incrementalSourceMarker = '<!-- incremental-original-source:start -->'
const endMarker = '<!-- incremental-original-source:end -->'
export const incrementalReviewOwner =
  'docs/phase-governance/reviews/20261030-main-incremental-candidates.json'
export const incrementalDigest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const demand = (yes, message) => {
  if (!yes) throw new Error(`incremental candidate: ${message}`)
}
const text = (v) => typeof v === 'string' && v.trim().length > 0
const sourceFence = (original) =>
  '`'.repeat([...original.matchAll(/`+/gu)].reduce((max, m) => Math.max(max, m[0].length), 2) + 1)

/** This is an author-candidate contract, not a new template or an acceptance table. */
export function renderIncrementalMarkdown(prefix, source) {
  demand(Buffer.isBuffer(source), 'original source must be bytes')
  demand(text(prefix) && prefix.endsWith('\n'), 'complete prose prefix with final LF required')
  demand(!prefix.includes(incrementalSourceMarker), 'source marker is builder-owned')
  const original = source.toString('utf8')
  demand(Buffer.from(original).equals(source), 'lossless UTF8 source required')
  const fence = sourceFence(original)
  // The separator is outside the source span. Preserve a missing final LF, too.
  const separator = source.at(-1) === 10 ? '' : '\n'
  const intro = `\n## 原文保全\n\n固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 ${source.length}B / SHA-256 ${incrementalDigest(source)}；原字节不 trim、不替换、不解码。\n\n${incrementalSourceMarker}\n${fence}markdown\n`
  return Buffer.concat([
    Buffer.from(prefix + intro),
    source,
    Buffer.from(`${separator}${fence}\n${endMarker}\n`),
  ])
}

export function assertIncrementalPreservation(candidate, source) {
  const original = source.toString('utf8')
  const fence = sourceFence(original)
  const opening = Buffer.from(`${incrementalSourceMarker}\n${fence}markdown\n`)
  const start = candidate.indexOf(opening)
  demand(
    start >= 0 && start === candidate.lastIndexOf(opening),
    'one exact source opening required',
  )
  const offset = start + opening.length
  demand(
    candidate.subarray(offset, offset + source.length).equals(source),
    'original bytes changed',
  )
  const separator = source.at(-1) === 10 ? '' : '\n'
  demand(
    candidate
      .subarray(offset + source.length)
      .equals(Buffer.from(`${separator}${fence}\n${endMarker}\n`)),
    'source boundary or suffix changed',
  )
}

/** Source identities and state fields are derived, never supplied as author hashes. */
export function prepareIncrementalCandidate({ draft, admission, source, registry, read }) {
  demand(draft.path === admission.path, 'draft/admission path mismatch')
  demand(
    incrementalDigest(source) === admission.sourceSha256 && source.length === admission.bytes,
    'source byte identity changed',
  )
  const template = registry.types.find((t) => t.templateId === draft.templateId)
  demand(template, 'existing registered template required')
  const authored = draft.review
  demand(authored && text(authored.coreConclusion), 'specific authored conclusion required')
  demand(
    !/^(Status|Owner|Template)\b/u.test(authored.coreConclusion),
    'metadata is not a conclusion',
  )
  demand(
    authored.readDomain?.coverage === 'full-file' &&
      text(authored.readDomain.actual) &&
      Array.isArray(authored.readDomain.reusedFrom) &&
      Array.isArray(authored.readDomain.notRead),
    'declare actual complete-file read domain and limits; automation cannot certify that reading',
  )
  for (const key of ['truthAnchors', 'dependencies', 'publicCallers', 'unresolved'])
    demand(Array.isArray(authored[key]), `${key} array required`)
  for (const key of ['owner', 'provenance', 'historyBoundary', 'stopLine', 'nextStep'])
    demand(text(authored[key]), `${key} required`)
  demand(Array.isArray(authored.businessOracle?.assertions), 'document oracle required')
  demand(Array.isArray(authored.dedupe?.against) && text(authored.dedupe.result), 'dedupe required')
  demand(authored.runtimeExecutionPerformed === false, 'no new execution credit')
  const pin = {
    path: admission.path,
    revision: admission.sourceRevision,
    gitObject: admission.sourceGitObject,
    sha256: admission.sourceSha256,
  }
  let body = source
  let variant
  let evidence
  let version = template.templateVersion
  if (admission.format === 'json') {
    const native = parseTerminalJson(source)
    const contract = nativeArtifactContracts[draft.templateId]
    demand(
      contract && !draft.prefix && !draft.historyOverlay,
      'native carrier uses an existing native artifact contract',
    )
    variant = contract.variant
    version = contract.templateVersion
    demand(
      Array.isArray(authored.nativeWitnesses) && authored.nativeWitnesses.length > 0,
      'native conclusion requires concrete value/count/substring witnesses',
    )
    evidence = {
      kind: 'historical-native-artifact',
      path: admission.path,
      family: draft.family,
      nativeShape: nativeArtifactShape(native),
      witnesses: authored.nativeWitnesses,
      runtimeExecutionPerformed: false,
      historicClaimsReexecuted: false,
      creditGranted: 0,
    }
  } else {
    demand(template.format === 'markdown', 'Markdown requires a Markdown template')
    const original = source.toString('utf8')
    const front = /^---\s*\n[\s\S]*?\n---\s*\n/u.exec(original)?.[0] ?? ''
    const testing = /<!-- testing-meta\s*\n[\s\S]*?\n-->/u.exec(original)?.[0] ?? ''
    demand(!/^---\s*\n/u.test(draft.prefix), 'builder retains original live front matter')
    demand(
      !draft.prefix.includes('<!-- testing-meta'),
      'builder retains original live testing metadata',
    )
    const prefix = `${front}${testing ? `\n${testing}\n\n` : ''}${draft.prefix}`
    body = renderIncrementalMarkdown(prefix, source)
    assertIncrementalPreservation(body, source)
    const originalTitle = /^# (.+)$/mu.exec(source.toString('utf8'))?.[1]
    if (originalTitle)
      demand(
        /^# (.+)$/mu.exec(draft.prefix)?.[1] === originalTitle,
        'original title must remain verbatim',
      )
    if (isTaskDocument(draft.path)) {
      demand(draft.templateId === 'task-card-v1', 'task consumer requires the task-card template')
      const oldStatus = taskInfo(draft.path, source.toString('utf8')).status
      const newStatus = taskInfo(draft.path, draft.prefix).status
      if (oldStatus)
        demand(newStatus === oldStatus, 'task status cannot be changed by document migration')
    }
    const issues = checkMigratedDocument(
      { path: draft.path, templateId: draft.templateId, historyOverlay: !!draft.historyOverlay },
      registry,
      (path) => (path === draft.path ? body.toString('utf8') : read(path)),
    )
    demand(issues.length === 0, `body contract: ${issues.join('; ')}`)
    evidence = {
      kind: 'incremental-preserved-markdown',
      originalBytes: source.length,
      originalSha256: pin.sha256,
    }
  }
  const row = {
    ...structuredClone(authored),
    path: admission.path,
    docType: template.docType,
    templateId: template.templateId,
    ...(variant ? { templateVariant: variant } : {}),
    templateVersion: version,
    documentStatus:
      admission.format === 'json' ? 'historical' : /^Status: ([a-z-]+)/mu.exec(draft.prefix)?.[1],
    sourceGitRevision: admission.sourceRevision,
    sourceSha256: admission.sourceSha256,
    afterSha256: incrementalDigest(body),
    primarySource: [pin],
    legalInputs: [
      {
        kind: admission.format === 'json' ? 'fixed-native-carrier' : 'fixed-markdown-source',
        ...pin,
      },
    ],
    fieldRoles: {
      governance: [`${incrementalReviewOwner}#entries/${admission.index}`],
      nativePointers: authored.fieldRoles?.nativePointers ?? [],
    },
    evidence,
    revision: { currentSha: admission.sourceSha256, history: [] },
    historyOverlay: admission.format === 'json' ? false : !!draft.historyOverlay,
    artifactOnly: false,
    contentReviewStatus: 'partial-review-unknown',
    templateCompliance: 'needs-migration',
    nonAuthorReviewer: false,
    creditGranted: 0,
  }
  delete row.nativeWitnesses
  delete row.currentIndependentAcceptance
  if (admission.format === 'json') {
    demand(text(draft.family), 'content-specific family required')
    const binding = {
      path: admission.path,
      carrierRevision: admission.sourceRevision,
      carrierGitObject: admission.sourceGitObject,
      carrierSha256: admission.sourceSha256,
      historicalSource: {
        sourceSha256: admission.sourceSha256,
        sourceGitRevision: admission.sourceRevision,
      },
      family: draft.family,
      rootShape: evidence.nativeShape,
      reviewRecord: incrementalReviewOwner,
      reviewIndex: admission.index,
      requiredWitnesses: [],
    }
    const issues = nativeArtifactReviewIssues(row, binding, parseTerminalJson(source))
    demand(issues.length === 0, `native candidate contract: ${issues.join('; ')}`)
    demand(isDeepStrictEqual(row.primarySource, [pin]), 'source axes must remain exact')
  }
  return { body, row, productionAdmission: false, semanticAcceptanceGranted: false }
}
