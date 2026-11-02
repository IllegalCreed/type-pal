import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { currentDocumentPath } from './document-location.mjs'
import { checkMigratedDocument } from './document-model.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import {
  nativeArtifactReviewIssues,
  nativeArtifactWitnessMatches,
} from './historical-native-artifact.mjs'
import { nativeArtifactBindings } from './historical-native-artifact-admission.mjs'
import { nativeArtifactCarrierRevision } from './historical-native-artifact-bindings.mjs'
import {
  nativeArtifactContentSha256,
  nativeArtifactQualificationIssues,
} from './historical-native-artifact-qualification.mjs'
import {
  composeNativeArtifactRow,
  nativeArtifactEntryHash,
  validateNativeArtifactChanges,
  writeNativeArtifactCandidate,
} from './native-artifact-candidate.mjs'
import { loadReviewRecordFromGit } from './review-record-storage.mjs'
import { biomeFormat } from './review-record-storage-packing.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const readBuffer = (p) => readFileSync(new URL(`../../${currentDocumentPath(p)}`, import.meta.url))
// Legitimate future publication cannot mutate this isolated partial-input fixture.
const group = {
  records: new Map(
    [...new Set(nativeArtifactBindings.map((b) => b.reviewRecord))].map((logicalPath) => [
      logicalPath,
      loadReviewRecordFromGit({ root, revision: nativeArtifactCarrierRevision, logicalPath })
        .record,
    ]),
  ),
}
const templates = parseTerminalJson(readBuffer('docs/phase-governance/templates/registry.json'))
const cache = new Map()
const source = (pin) => {
  const k = `${pin.revision}:${pin.path}`
  if (!cache.has(k)) cache.set(k, readGitDocumentSnapshot(root, pin))
  return cache.get(k)
}
function fixture(binding = nativeArtifactBindings.find((b) => !b.existingVariant)) {
  const before = group.records.get(binding.reviewRecord).entries[binding.reviewIndex]
  // This isolated tool fixture makes only a source-document assertion, not historical test success.
  const seed = {
    semantic: {
      coreConclusion: `Fixed historical ${binding.family} carrier with ${binding.rootShape.type} root; no current execution.`,
      businessOracle: {
        assertions: [
          'Each provided pointer must equal the fixed native value; the original run is not repeated.',
        ],
      },
    },
    nativeWitnesses: binding.requiredWitnesses.map((w) => ({
      claim: `Recorded source pointer ${w.pointer}`,
      witnesses: [w],
    })),
    contentSource: { path: binding.path },
    readDomain: { notRead: ['Historical tests not repeated'] },
  }
  const row = composeNativeArtifactRow(before, binding, seed, {
    baseRevision: '7ffb2b83e562d76ace19e2a6be8c41f41e661e6d',
    actor: 'isolated document-tool fixture',
  })
  const options = {
    readBuffer,
    readSourceBuffer: source,
    reviewReader: (p) =>
      p === binding.reviewRecord
        ? {
            ...group.records.get(p),
            entries: group.records
              .get(p)
              .entries.map((r, i) => (i === binding.reviewIndex ? row : r)),
          }
        : group.records.get(p),
  }
  const doc = {
    path: binding.path,
    templateId: row.templateId,
    variant: row.templateVariant,
    historyOverlay: false,
  }
  const change = {
    path: binding.path,
    reviewRecord: binding.reviewRecord,
    index: binding.reviewIndex,
    beforeEntrySha256: nativeArtifactEntryHash(before),
    after: row,
  }
  return {
    binding,
    before,
    row,
    options,
    doc,
    change,
    check: () =>
      checkMigratedDocument(doc, templates, (p) => options.readBuffer(p).toString('utf8'), options),
  }
}

test('public model admits fixed object/array carriers and keeps candidate status and unknown historical provenance separate', () => {
  const cases = [
    nativeArtifactBindings.find((b) => !b.existingVariant && b.rootShape.type === 'object'),
    nativeArtifactBindings.find((b) => b.rootShape.type === 'array'),
  ]
  for (const b of cases) {
    const f = fixture(b)
    assert.deepEqual(f.check(), [])
    assert.equal(f.row.contentReviewStatus, 'partial-review-unknown')
    assert.equal(f.row.templateCompliance, 'needs-migration')
    assert.equal(f.row.sourceSha256, f.before.sourceSha256)
    assert.deepEqual(f.row.claimCorrection, f.before.claimCorrection)
    assert.deepEqual(validateNativeArtifactChanges([f.change], group.records, readBuffer), {
      targets: 1,
      existingContractReused: 0,
      creditGranted: 0,
    })
  }
})

test('native edits, fake Git identities and borrowed review positions are rejected by the real public consumer', () => {
  for (const mutate of [
    (f) => {
      const read = f.options.readBuffer
      f.options.readBuffer = (p) =>
        p === f.doc.path ? Buffer.concat([read(p), Buffer.from('\n')]) : read(p)
    },
    (f) => {
      f.options.readSourceBuffer = (pin) => ({ ...source(pin), gitObject: '0'.repeat(40) })
    },
    (f) => {
      f.row.path = nativeArtifactBindings.at(-1).path
    },
    (f) => {
      f.doc.path = 'docs/unknown-not-admitted.json'
      f.options.readBuffer = () => Buffer.from('{}')
    },
    (f) => {
      f.options.readBuffer = () => Buffer.from('{"x":1,"x":2}')
    },
    (f) => {
      f.options.readBuffer = () => Buffer.from([0x7b, 0x22, 0xff, 0x22, 0x3a, 0x31, 0x7d])
    },
  ]) {
    const f = fixture()
    mutate(f)
    assert(f.check().length > 0)
  }
})

test('wrong native witness, erased source witness, stale input and self-granted acceptance fail before any write', () => {
  for (const mutate of [
    (f) => {
      f.row.evidence.witnesses[0].value = { invented: true }
    },
    (f) => {
      f.row.evidence.witnesses = []
    },
    (f) => {
      f.row.publicCallers = []
    },
    (f) => {
      f.row.evidence.runtimeExecutionPerformed = true
    },
    (f) => {
      f.row.contentReviewStatus = 'content-reviewed'
      f.row.templateCompliance = 'template-compliant'
    },
    (f) => {
      f.row.sourceSha256 = '0'.repeat(64)
    },
    (f) => {
      f.row.provenance = []
    },
    (f) => {
      f.change.beforeEntrySha256 = '0'.repeat(64)
    },
  ]) {
    const f = fixture()
    mutate(f)
    assert.throws(() => validateNativeArtifactChanges([f.change], group.records, readBuffer))
  }
  const f = fixture()
  assert(
    nativeArtifactReviewIssues(f.row, f.binding, parseTerminalJson(readBuffer(f.doc.path)))
      .length === 0,
  )
  assert.throws(
    () => writeNativeArtifactCandidate({ kind: 'native-artifact-candidate/1.0.0' }),
    /capability/u,
  )
})

test('an Owner control cannot enter the473 cohort and existing DOC-IA-2 source gaps/content cannot be rewritten', () => {
  const f = fixture()
  f.change.path = 'docs/testing/catalog.json'
  assert.throws(
    () => validateNativeArtifactChanges([f.change], group.records, readBuffer),
    /out-of-scope/u,
  )
  const b = nativeArtifactBindings.find((e) => e.existingVariant),
    before = group.records.get(b.reviewRecord).entries[b.reviewIndex]
  const change = {
    path: b.path,
    reviewRecord: b.reviewRecord,
    index: b.reviewIndex,
    beforeEntrySha256: nativeArtifactEntryHash(before),
    after: structuredClone(before),
  }
  assert.equal(
    validateNativeArtifactChanges([change], group.records, readBuffer).existingContractReused,
    1,
  )
  change.after.coreConclusion += ' Unaccepted extra claim.'
  assert.throws(
    () => validateNativeArtifactChanges([change], group.records, readBuffer),
    /reused unchanged/u,
  )
})

test('formatting preserves warning-symbol value and is idempotent without weakening JSON checks', () => {
  const value = {
    note: String.fromCodePoint(0x26a0),
    nested: ['historical warning remains a warning'],
  }
  const bytes = biomeFormat(value, 'fixture.json', { repoRoot: root })
  assert.deepEqual(parseTerminalJson(bytes), value)
  assert(bytes.equals(biomeFormat(parseTerminalJson(bytes), 'fixture.json', { repoRoot: root })))
})

test('compact witnesses distinguish native counts, keys and message fragments without copying raw subtrees', () => {
  const native = {
    phases: [{ id: 'green' }, { id: 'red' }],
    result: { passed: 3, failed: 1 },
    message: 'expected ghost-b4,ghost-b4 to be ghost-b4',
  }
  for (const witness of [
    { pointer: '/phases', op: 'array-length', value: 2 },
    { pointer: '/result', op: 'object-keys', value: ['passed', 'failed'] },
    { pointer: '/result', op: 'object-key-count', value: 2 },
    { pointer: '/message', op: 'string-contains', value: 'ghost-b4,ghost-b4' },
    { pointer: '/result/failed', value: 1 },
  ])
    assert(nativeArtifactWitnessMatches(native, witness))
  assert.equal(
    nativeArtifactWitnessMatches(native, { pointer: '/phases', op: 'array-length', value: 3 }),
    false,
  )
  assert.equal(
    nativeArtifactWitnessMatches(native, {
      pointer: '/message',
      op: 'string-contains',
      value: 'all passed',
    }),
    false,
  )
  assert.throws(
    () =>
      nativeArtifactWitnessMatches(native, {
        pointer: '/result',
        op: 'hash-only',
        value: '0'.repeat(64),
      }),
    /unsupported/u,
  )
  assert.throws(
    () =>
      nativeArtifactWitnessMatches(
        { payload: 'x'.repeat(5000) },
        { pointer: '/payload', value: 'x'.repeat(5000) },
      ),
    /4096/u,
  )
})

test('the Owner qualification seam binds exact external content while the public dormant table refuses self-signing', () => {
  const f = fixture()
  f.row.contentReviewStatus = 'content-reviewed'
  f.row.templateCompliance = 'template-compliant'
  delete f.row.claimCorrection
  const grant = {
    reviewer: 'isolated non-author fixture',
    nonAuthorReviewer: true,
    task: 'fixture-only',
    reportSha256: 'a'.repeat(64),
    contentSha256: nativeArtifactContentSha256(f.row),
  }
  f.row.currentIndependentAcceptance = {
    protocol: 'document-delivery-acceptance/1.0.0',
    path: f.binding.path,
    reviewer: grant.reviewer,
    nonAuthorReviewer: true,
    verdict: 'accept',
    afterSha256: f.binding.carrierSha256,
    contentSha256: grant.contentSha256,
    reportSha256: grant.reportSha256,
    ownerDecision: {
      actor: 'Codex',
      task: grant.task,
      currentBodyReview: true,
      currentTemplateMigration: true,
      oldClaimRestored: false,
      runtimeCredit: false,
    },
  }
  assert.deepEqual(nativeArtifactQualificationIssues(f.row, f.binding, grant), [])
  assert(f.check().some((issue) => issue.includes('external content acceptance')))
  f.row.coreConclusion += ' A new unaccepted fact.'
  assert(nativeArtifactQualificationIssues(f.row, f.binding, grant).length > 0)
})
