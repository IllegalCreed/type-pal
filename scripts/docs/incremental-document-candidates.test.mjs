import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  assertIncrementalPreservation,
  incrementalDigest,
  prepareIncrementalCandidate,
  renderIncrementalMarkdown,
} from './incremental-document-candidates.mjs'

const registry = JSON.parse(
  readFileSync(new URL('../../docs/phase-governance/templates/registry.json', import.meta.url)),
)
function fixture(value = { command: 'node verify.mjs', exit: 1, failed: ['missing input'] }) {
  const source = Buffer.from(`${JSON.stringify(value)}\n`)
  const admission = {
    path: 'docs/ops/evidence/example/result.json',
    format: 'json',
    index: 7,
    bytes: source.length,
    sourceRevision: 'a'.repeat(40),
    sourceGitObject: 'b'.repeat(40),
    sourceSha256: incrementalDigest(source),
  }
  const draft = {
    path: admission.path,
    templateId: 'evidence-receipt-v1',
    family: 'command-failure-receipt',
    review: {
      owner: 'GLM',
      provenance: 'Author reads the complete fixed source; not an independent acceptance.',
      coreConclusion:
        'The preserved command exits1 with missing-input failure; it does not establish a passing run.',
      readDomain: {
        coverage: 'full-file',
        actual: 'Entire three-field JSON object',
        reusedFrom: [],
        notRead: ['No original command or browser reexecution'],
      },
      truthAnchors: ['/command', '/exit', '/failed/0'],
      dependencies: [],
      publicCallers: ['Historical node verify.mjs invocation'],
      unresolved: [],
      historyBoundary: 'Captured source identity only; old execution remains at its recorded time.',
      businessOracle: {
        type: 'historical-native-document',
        assertions: ['Command exit is1 and named failure remains present.'],
        currentExecution: false,
      },
      dedupe: {
        result: 'One distinct command receipt, not merged with neighboring runs.',
        against: [],
      },
      fieldRoles: { nativePointers: ['/command', '/exit', '/failed'] },
      nativeWitnesses: [{ pointer: '/exit', value: 1, claim: 'The recorded invocation failed.' }],
      stopLine: 'Changed source or contradictory witness blocks this claim.',
      nextStep: 'Owner independently receives the author candidate.',
      runtimeExecutionPerformed: false,
    },
  }
  return { source, admission, draft, registry, read: () => undefined }
}

test('original span retains CRLF, nested fences and a missing final LF without codec transforms', () => {
  for (const source of [
    Buffer.from('one\r\n```\r\ntwo\n'),
    Buffer.from('no final LF'),
    Buffer.alloc(0),
  ]) {
    const body = renderIncrementalMarkdown('# History\n', source)
    assertIncrementalPreservation(body, source)
    assert(body.includes(source))
  }
})

test('byte edits and extra source separators fail preservation instead of trimming', () => {
  const source = Buffer.from('history with trailing space '),
    body = renderIncrementalMarkdown('# Record\n', source)
  const changed = Buffer.from(body)
  changed[body.indexOf(source)] = 88
  assert.throws(() => assertIncrementalPreservation(changed, source), /original bytes changed/)
  assert.throws(
    () => assertIncrementalPreservation(Buffer.concat([body, Buffer.from('\n')]), source),
    /boundary or suffix/,
  )
})

test('new fixed carrier revision is used by the reusable native contract; the original bytes stay intact', () => {
  const f = fixture(),
    result = prepareIncrementalCandidate(f)
  assert(result.body.equals(f.source))
  assert.equal(result.row.primarySource[0].revision, f.admission.sourceRevision)
  assert.equal(result.row.evidence.witnesses[0].value, 1)
  assert.equal(result.row.fieldRoles.governance[0].split('/').at(-1), '7')
})

test('a red result relabelled as success and an unresolved witness cannot pass the candidate contract', () => {
  const wrong = fixture()
  wrong.draft.review.nativeWitnesses[0].value = 0
  assert.throws(() => prepareIncrementalCandidate(wrong), /witness mismatch/)
  wrong.draft.review.nativeWitnesses[0] = { pointer: '/absent', value: 0, claim: 'invented result' }
  assert.throws(() => prepareIncrementalCandidate(wrong), /unresolved native pointer/)
})

test('author input cannot grant acceptance or turn a candidate into reviewed/compliant', () => {
  const f = fixture()
  Object.assign(f.draft.review, {
    contentReviewStatus: 'content-reviewed',
    templateCompliance: 'template-compliant',
    nonAuthorReviewer: true,
    creditGranted: 99,
    currentIndependentAcceptance: { verdict: 'accept' },
  })
  const { row } = prepareIncrementalCandidate(f)
  assert.equal(row.contentReviewStatus, 'partial-review-unknown')
  assert.equal(row.templateCompliance, 'needs-migration')
  assert.equal(row.nonAuthorReviewer, false)
  assert.equal(row.creditGranted, 0)
  assert.equal(row.currentIndependentAcceptance, undefined)
})

test('a changed Git carrier fails before any authored conclusion is considered', () => {
  const f = fixture()
  f.source = Buffer.from('different carrier\n')
  assert.throws(() => prepareIncrementalCandidate(f), /source byte identity changed/)
})

test('task migration cannot reopen an original done card through its prose prefix', () => {
  const f = fixture()
  f.source = Buffer.from('# CLOSED-1\n\nStatus: done\n\nOriginal dated decision.\n')
  Object.assign(f.admission, {
    format: 'markdown',
    path: 'docs/ops/archive/tasks/done/CLOSED-1.md',
    bytes: f.source.length,
    sourceSha256: incrementalDigest(f.source),
  })
  Object.assign(f.draft, {
    path: f.admission.path,
    templateId: 'task-card-v1',
    prefix: '# CLOSED-1\n\nStatus: build\n',
  })
  assert.throws(() => prepareIncrementalCandidate(f), /task status cannot be changed/)
})

test('published report retains live front matter and testing metadata outside its historical source fence', () => {
  const f = fixture()
  f.source = Buffer.from(
    '---\ntestingSchema: 2\nid: sample\nevidence: evidence.json\n---\n\n<!-- testing-meta\n{"schemaVersion":2,"id":"sample"}\n-->\n\n# Sample report\n\nStatus: active\n',
  )
  Object.assign(f.admission, {
    format: 'markdown',
    path: 'docs/testing/domains/sample/report.md',
    bytes: f.source.length,
    sourceSha256: incrementalDigest(f.source),
  })
  const template = registry.types.find((t) => t.templateId === 'test-domain-report-v1')
  Object.assign(f.draft, {
    path: f.admission.path,
    templateId: template.templateId,
    prefix:
      '# Sample report\n\nStatus: active\nOwner: GLM\nLast reviewed: 2026-10-30\nTemplate: test-domain-report-v1 / 1.1.0\n\n' +
      template.requiredSections
        .map((s) => `## ${s}\n\nOriginal publication boundary retained; no execution rerun.\n`)
        .join('\n'),
  })
  f.read = (path) =>
    path === 'docs/testing/catalog.json'
      ? JSON.stringify({ entries: [{ id: 'sample', status: 'active' }] })
      : undefined
  const result = prepareIncrementalCandidate(f)
  const visible = result.body
    .subarray(0, result.body.indexOf('<!-- incremental-original-source:start -->'))
    .toString('utf8')
  assert(visible.startsWith('---\ntestingSchema: 2\n'))
  assert(visible.includes('<!-- testing-meta\n{"schemaVersion":2,"id":"sample"}\n-->'))
  assertIncrementalPreservation(result.body, f.source)
})
