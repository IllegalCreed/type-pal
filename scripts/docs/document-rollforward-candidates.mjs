import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { nativeArtifactWitnessMatches } from './historical-native-artifact.mjs'
import {
  incrementalDigest,
  prepareIncrementalCandidate,
} from './incremental-document-candidates.mjs'
import { markdownLinks } from './markdown.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

// Author-candidate contract only. The S78 production admission, signatures, source
// roots and 4351 accepted records are deliberately outside this writer's authority.
export const rollforwardContract = Object.freeze({
  protocol: 'document-rollforward-candidates/1.0.0',
  accepted: '511c59b13fec67839b9f6fb7dcfd109d42a747dd',
  previousMain: '72db417255d8ca4227522420e9185ef468462aa7',
  main: '5e66fa6b6291f94330fb5d7fc9828062e0eb8a51',
  integration: '43403a826edcaf40509f55b51e6f6214723252ed',
  acceptedDocuments: 4351,
  newDocuments: 179,
  changedDocuments: 50,
  ownerControls: 22,
  authorTargets: 207,
  metadataLocation: 'external-candidate-bundle',
  productionAdmission: false,
  semanticAcceptanceGranted: false,
  creditGranted: 0,
})

const ownerControls = new Set([
  'docs/ops/board.md',
  'docs/ops/tasks/index.md',
  'docs/testing/catalog.json',
  'docs/testing/indexes/by-stage.md',
  'docs/testing/indexes/by-status.md',
])
export const rollforwardOwnerPilotPaths = Object.freeze([
  'docs/ops/code-quality.md',
  'docs/ops/evidence/QUALITY-GAME-PRESENT-HOST-TESTS-1/README.md',
  'docs/ops/evidence/QUALITY-PENDING-100-3/base-main-ci.json',
  'docs/ops/tasks/GAME-INPUT-KEYMAP-OWN-KEY-1.md',
  'docs/testing/domains/phase1-runtime/control-rotation/evidence.json',
])
const candidate = (path) => /^docs\/.*\.(md|json|html)$/u.test(path)
const ownerOnly = (path) =>
  ownerControls.has(path) || /^docs\/phase-governance\/reviews\/[^/]+\.json$/u.test(path)

/** Trees are exact Git inventories. A new task directory cannot expand authority. */
export function deriveRollforwardScope({ previous, incoming, accepted }) {
  const additions = [],
    changes = [],
    artifacts = []
  for (const [path, object] of incoming) {
    if (previous.get(path)?.oid === object.oid) continue
    if (!candidate(path)) {
      artifacts.push(path)
      continue
    }
    assert.equal(object.mode, '100644', `non-ordinary source: ${path}`)
    assert.equal(object.type, 'blob', `non-blob source: ${path}`)
    if (!previous.has(path)) {
      assert(!accepted.has(path), `new source already governed: ${path}`)
      additions.push(path)
    } else {
      assert(accepted.has(path), `changed source absent from accepted tree: ${path}`)
      changes.push(path)
    }
  }
  for (const path of previous.keys())
    assert(incoming.has(path), `upstream removal requires separate disposition: ${path}`)
  const controls = changes.filter(ownerOnly).sort()
  const author = [...additions, ...changes.filter((p) => !ownerOnly(p))].sort()
  assert.equal(additions.length, rollforwardContract.newDocuments, 'new-document census changed')
  assert.equal(
    changes.length,
    rollforwardContract.changedDocuments,
    'changed-document census changed',
  )
  assert.equal(controls.length, rollforwardContract.ownerControls, 'Owner-control census changed')
  assert.equal(author.length, rollforwardContract.authorTargets, 'author-target census changed')
  return {
    additions: additions.sort(),
    changes: changes.sort(),
    controls,
    author,
    artifacts: artifacts.sort(),
  }
}

export function rollforwardSourceRows(scope, integrationRevision, readSource) {
  assert.equal(
    integrationRevision,
    rollforwardContract.integration,
    'frozen integration commit required',
  )
  const additions = new Set(scope.additions)
  return scope.author.map((path, index) => {
    const kind = additions.has(path) ? 'addition' : 'amendment'
    const sourceRevision = kind === 'addition' ? rollforwardContract.main : integrationRevision
    const source = readSource(sourceRevision, path)
    const upstream = readSource(rollforwardContract.main, path)
    const previous =
      kind === 'amendment' ? readSource(rollforwardContract.accepted, path) : undefined
    assert.equal(source.mode, '100644', `ordinary integration source required: ${path}`)
    assert.equal(upstream.mode, '100644', `ordinary upstream source required: ${path}`)
    assert(source.buffer.length > 0, `empty source requires explicit design: ${path}`)
    assert(!path.endsWith('.html'), 'HTML requires a separate carrier contract')
    return {
      index,
      path,
      kind,
      format: path.endsWith('.json') ? 'json' : 'markdown',
      sourceRevision,
      sourceGitObject: source.oid,
      sourceSha256: incrementalDigest(source.buffer),
      bytes: source.buffer.length,
      upstream: {
        revision: rollforwardContract.main,
        gitObject: upstream.oid,
        sha256: incrementalDigest(upstream.buffer),
      },
      ...(previous
        ? {
            priorAccepted: {
              revision: rollforwardContract.accepted,
              gitObject: previous.oid,
              sha256: incrementalDigest(previous.buffer),
            },
          }
        : {}),
    }
  })
}

export function assertRollforwardManifest(manifest, scope, rows) {
  assert.deepEqual(manifest.contract, rollforwardContract, 'frozen contract changed')
  assert.deepEqual(manifest.scope, scope, 'source-derived scope changed')
  assert.deepEqual(manifest.rows, rows, 'source-derived identities changed')
  assert.equal(manifest.semanticAcceptanceGranted, false)
  assert.equal(manifest.creditGranted, 0)
}

/** Freeze the current rules in the visible body; the source fence alone is insufficient. */
export function assertVisiblePolicy(path, prefix, source) {
  if (path !== 'docs/ops/code-quality.md') return
  const live = source.toString('utf8').split('\n## 原文保全\n')[0].trimEnd()
  assert(
    prefix.startsWith(live),
    'current code-quality policy must remain verbatim in visible prose',
  )
}

/** The builder retains live metadata. Existing historical spans stay in the draft. */
export function rollforwardDraftPrefix(source) {
  const original = source.toString('utf8')
  const front = /^---\s*\n[\s\S]*?\n---\s*\n/u.exec(original)?.[0] ?? ''
  const testing = /<!-- testing-meta\s*\n[\s\S]*?\n-->/u.exec(original)?.[0] ?? ''
  return original.slice(front.length).replace(testing, '')
}

export function prepareRollforwardCandidate({ draft, admission, source, registry, read }) {
  assert(
    !Object.hasOwn(draft.review ?? {}, 'currentIndependentAcceptance'),
    'author cannot supply acceptance',
  )
  assert.equal(
    draft.review?.semanticAssessment?.perFileChecked,
    true,
    'per-file semantic check required',
  )
  assert(
    Array.isArray(draft.review.semanticAssessment.claims) &&
      draft.review.semanticAssessment.claims.length > 0,
    'specific source-supported claims required',
  )
  assert(
    Array.isArray(draft.review.linkDisposition),
    'explicit live/historical link dispositions required',
  )
  assert(draft.review.readDomain?.notRead?.length > 0, 'execution/reading limits required')
  if (admission.format === 'json') {
    const native = parseTerminalJson(source)
    for (const claim of draft.review.semanticAssessment.claims)
      assert(
        typeof claim.claim === 'string' &&
          claim.claim.trim() &&
          nativeArtifactWitnessMatches(native, claim),
        'per-file semantic claim must resolve to its actual native value',
      )
  } else {
    const original = source.toString('utf8')
    for (const claim of draft.review.semanticAssessment.claims)
      assert(
        typeof claim.claim === 'string' &&
          claim.claim.trim() &&
          typeof claim.sourceQuote === 'string' &&
          claim.sourceQuote.trim() &&
          original.includes(claim.sourceQuote),
        'per-file semantic claim requires an exact source quote',
      )
    const links = [...new Set(markdownLinks(original).map((l) => l.target))].sort()
    assert.deepEqual(
      draft.review.linkDisposition.map((l) => l.source).sort(),
      links,
      'every source link requires one explicit disposition',
    )
    const visible = new Set(markdownLinks(draft.prefix).map((l) => l.target))
    for (const link of draft.review.linkDisposition) {
      assert(
        ['live', 'historical-fixed-git', 'superseded'].includes(link.kind),
        'explicit link role required',
      )
      assert(
        visible.has(link.target),
        'necessary navigation cannot exist only inside the source fence',
      )
      if (link.kind === 'live') assert.equal(link.target, link.source, 'live link target changed')
      else
        assert(
          typeof link.reason === 'string' && link.reason.trim(),
          'historical or superseded link requires a reason',
        )
    }
  }
  assertVisiblePolicy(draft.path, draft.prefix ?? '', source)
  const result = prepareIncrementalCandidate({
    draft,
    admission,
    source,
    registry,
    read,
    markdownMode:
      admission.kind === 'amendment' ? 'existing-template-amendment' : 'fixed-source-fence',
  })
  // A prospective location is not an additional central owner or a new sidecar.
  result.row.fieldRoles.governance = [`external-candidate-bundle#entries/${admission.index}`]
  result.row.proposedBinding = {
    docType: result.row.docType,
    templateId: result.row.templateId,
    templateVersion: result.row.templateVersion,
    ...(result.row.templateVariant ? { templateVariant: result.row.templateVariant } : {}),
    productionRoutingChanged: false,
  }
  result.row.rollforward = {
    kind: admission.kind,
    upstream: structuredClone(admission.upstream),
    priorAccepted: structuredClone(admission.priorAccepted ?? null),
    priorCreditReusedForUnchangedContentOnly: true,
    currentPublicationOrExecutionStatusUnchanged: true,
  }
  // These are historical carrier explanations. A live paired publication's ID,
  // status and runtime fields remain authoritative in the native carrier, not here.
  if (admission.format === 'json') {
    result.row.carrierRole =
      admission.kind === 'amendment'
        ? 'amended-paired-native-carrier; production binding decided by Owner'
        : 'fixed-native-carrier'
  }
  return result
}

/** One comparator for seed reuse and its equal/tail-mutation counterexamples. */
export function rollforwardSeedMatches(expected, actual) {
  return isDeepStrictEqual(expected, actual)
}
