import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runRollforwardReviewPlan } from './prepare-rollforward-review-plan.mjs'
import { projectRollforwardControls } from './rollforward-control-plan.mjs'
import {
  normalizeRollforwardReview,
  prepareRollforwardReviewPlan,
  restorePlannedReview,
  rollforwardReviewContract,
} from './rollforward-review-plan.mjs'

const candidate = (path = 'docs/ops/example.md') => ({
  path,
  coreConclusion:
    'The visible rule keeps the active task closed; the cited old run is not replayed.',
  contentReviewStatus: 'partial-review-unknown',
  templateCompliance: 'needs-migration',
  nonAuthorReviewer: false,
  creditGranted: 0,
  runtimeExecutionPerformed: false,
  fieldRoles: { governance: ['external-candidate-bundle#entries/0'], nativePointers: [] },
  provenance: 'Contributor fixed source reading',
  readDomain: {
    actual: 'Programmatic full parsing plus a stated semantic check; no product code audit.',
    reusedFrom: [],
    notRead: ['No original run replay.'],
  },
  phaseAnchor: 'ops/current documentation',
  applicability: 'The fixed candidate source only',
  evidence: { kind: 'source-preservation' },
  revision: { currentSha: 'b'.repeat(64), history: [] },
  history: [{ kind: 'original-claim', result: 'historic failure retained' }],
  templateId: 'test-machine-evidence-v1',
  templateVersion: '1.0.0',
  templateVariant: 'historical-test-machine-evidence-artifact-native-v1',
  documentStatus: 'historical',
  docType: 'test-machine-evidence',
  historyOverlay: false,
})
const location = {
  owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
  index: 1944,
}

test('normalization keeps actual read scope and pending state, relocates one owner and restores all candidate fields', () => {
  const before = candidate(),
    saved = structuredClone(before)
  const row = normalizeRollforwardReview(before, location)
  assert.deepEqual(before, saved)
  assert.deepEqual(row.readDomain, saved.readDomain)
  assert.equal(row.reviewDepth, 'partial-semantic')
  assert.equal(row.revision.currentSha, rollforwardReviewContract.authorCandidate)
  assert.equal(row.revision.history[0].value, 'b'.repeat(64))
  assert.equal(row.fieldRoles.governance[0], `${location.owner}#entries/1944`)
  assert.equal(row.contentReviewStatus, 'partial-review-unknown')
  assert.equal(row.nonAuthorReviewer, false)
  assert.equal(row.creditGranted, 0)
  assert.deepEqual(restorePlannedReview(row, 'rollforwardIntake'), saved)
  assert.equal(
    JSON.stringify(restorePlannedReview(row, 'rollforwardIntake')),
    JSON.stringify(saved),
  )
})

test('an amended row preserves the complete prior signature, withdrawal and absent-key identity in its sparse inverse', () => {
  const current = candidate(),
    prior = {
      path: current.path,
      afterSha256: 'a'.repeat(64),
      currentIndependentAcceptance: {
        candidate: 'c'.repeat(40),
        basis: { reviewer: 'GLM', report: 'original' },
      },
      claimCorrection: { withdrawn: true, originalClaim: 'do not restore old semantic credit' },
      contentReviewStatus: 'content-reviewed',
      revision: { currentSha: 'd'.repeat(40), history: [] },
      history: [{ date: 'old' }],
    }
  const row = normalizeRollforwardReview(current, location, prior)
  assert.equal(row.currentIndependentAcceptance, undefined)
  assert.equal(row.claimCorrection, undefined)
  assert.deepEqual(restorePlannedReview(row, 'rollforwardPrior'), prior)
  const bad = structuredClone(row)
  bad.rollforwardPrior.fields.find(
    (f) => f.key === 'currentIndependentAcceptance',
  ).value.basis.report = 'forged'
  assert.throws(() => restorePlannedReview(bad, 'rollforwardPrior'), /fingerprint differs/)
})

test('three missing statuses are explicitly documentation lifecycle, without importing YAML verified or rework', () => {
  for (const path of [
    'docs/testing/e2e/stages/001-opening/README.md',
    'docs/testing/e2e/stages/001-opening/report.md',
    'docs/testing/e2e/stages/006-doctor-boat/README.md',
  ]) {
    const row = candidate(path)
    delete row.documentStatus
    const planned = normalizeRollforwardReview(row, location)
    assert.equal(planned.documentStatus, 'current')
    assert.match(planned.documentationStatusBasis, /lifecycle only/)
    assert.equal(planned.runtimeExecutionPerformed, false)
    assert.equal(planned.creditGranted, 0)
    assert.equal(
      Object.hasOwn(restorePlannedReview(planned, 'rollforwardIntake'), 'documentStatus'),
      false,
    )
  }
})

test('a paired machine publication keeps its live original variant instead of being relabelled historical', () => {
  const path = 'docs/testing/domains/phase1-runtime/dependencies/dependency-ownership/evidence.json'
  const row = candidate(path),
    prior = {
      path,
      templateId: 'test-machine-evidence-v1',
      templateVersion: '1.5.0',
      templateVariant: 'document-audit-v2',
      documentStatus: 'current-publication/source-scope',
      docType: 'test-machine-evidence',
      historyOverlay: false,
    }
  const planned = normalizeRollforwardReview(row, location, prior)
  assert.equal(planned.templateVariant, 'document-audit-v2')
  assert.equal(planned.templateVersion, '1.5.0')
  assert.equal(planned.documentStatus, prior.documentStatus)
  assert.deepEqual(restorePlannedReview(planned, 'rollforwardIntake'), row)
  assert.deepEqual(restorePlannedReview(planned, 'rollforwardPrior'), prior)
  assert.throws(() => normalizeRollforwardReview(row, location), /existing production binding/)
})

test('author-provided credit or a modified tail cannot enter the closed planning boundary', () => {
  for (const mutate of [
    (r) => {
      r.creditGranted = 1
    },
    (r) => {
      r.nonAuthorReviewer = true
    },
    (r) => {
      r.runtimeExecutionPerformed = true
    },
    (r) => {
      r.currentIndependentAcceptance = {}
    },
  ]) {
    const bad = candidate()
    mutate(bad)
    assert.throws(() => normalizeRollforwardReview(bad, location), /rejected/)
  }
  const rows = [candidate(), { ...candidate('docs/ops/last.md'), lateField: 'forged' }]
  assert.throws(
    () => prepareRollforwardReviewPlan({ rows, sources: [], records: new Map() }),
    /changed, truncated or reordered/,
  )
})

test('the public CLI rejects repository outputs, duplicate flags and a false intake before any output creation', (t) => {
  const external = mkdtempSync(join(tmpdir(), 'rollforward-plan-test-'))
  t.after(() => rmSync(external, { recursive: true, force: true }))
  const input = join(external, 'input.json')
  writeFileSync(input, '{"shards":[]}\n')
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const saved = readFileSync(input)
  assert.throws(
    () => runRollforwardReviewPlan(['--input', input, '--out', join(root, 'forbidden-plan')]),
    /repository output/,
  )
  assert.throws(
    () => runRollforwardReviewPlan(['--input', input, '--out', join(external, 'never-created')]),
    /intake index differs/,
  )
  assert.throws(
    () =>
      runRollforwardReviewPlan(['--input', input, '--out', external, '--rehearse', '--rehearse']),
    /duplicate flag/,
  )
  for (const flag of ['--publish', '--write', '--grants'])
    assert.throws(
      () => runRollforwardReviewPlan(['--input', input, '--out', external, flag]),
      /unknown, duplicate or incomplete option/,
    )
  assert.deepEqual(readFileSync(input), saved)
  assert.throws(() => readFileSync(join(external, 'never-created', 'index.json')), {
    code: 'ENOENT',
  })
})

test('control projection preserves retired identities and old positions while allocating one exact new storage part', () => {
  const entries = Array.from({ length: 4351 }, (_, i) => ({
    path: `docs/ops/old-${i}.json`,
    phase: 'ops',
    docType: 'evidence-receipt',
    retainedMetadata: `original-${i}`,
  }))
  const registry = {
    entries,
    shards: Array.from({ length: 9 }, (_, i) => ({
      key: `original-${i}`,
      positionRange: [i, i + 1],
    })),
    structuralRoots: [],
    nativeArtifactRetirements: { entries: entries.slice(0, 6).map((r) => ({ path: r.path })) },
  }
  const routing = {
    migratedDocuments: entries
      .slice(6)
      .map((r) => ({ path: r.path, templateId: 'evidence-receipt-v1' })),
  }
  const change = (path, beforeSha256) => ({
    path,
    beforeSha256,
    owner: location.owner,
    after: {
      path,
      docType: 'evidence-receipt',
      templateId: 'evidence-receipt-v1',
      templateVersion: '1.0.0',
      contentReviewStatus: 'partial-review-unknown',
      templateCompliance: 'needs-migration',
      historyOverlay: false,
    },
  })
  const plan = {
    changes: [
      ...Array.from({ length: 179 }, (_, i) => change(`docs/ops/new-${i}.json`, null)),
      ...entries.slice(6, 32).map((r) => change(r.path, 'b'.repeat(64))),
    ],
  }
  const saved = structuredClone({ registry, routing, plan })
  const projected = projectRollforwardControls({ registry, routing, plan })
  assert.deepEqual({ registry, routing, plan }, saved)
  assert.deepEqual(
    projected.registry.entries.slice(0, 4351).map((r) => r.path),
    entries.map((r) => r.path),
  )
  assert.equal(projected.registry.entries[6].retainedMetadata, 'original-6')
  assert.deepEqual(projected.registry.shards.at(-1).positionRange, [4351, 4530])
  assert.deepEqual(projected.registry.nativeArtifactRetirements, registry.nativeArtifactRetirements)
  assert.equal(projected.routing.migratedDocuments.length, 4524)
  assert.equal(
    projected.routing.migratedDocuments.some((r) => r.path === 'docs/ops/old-0.json'),
    false,
  )
  assert.equal(projected.registry.entries[4351].reviewStatus, 'partial-review-unknown')
  const bad = structuredClone(plan)
  bad.changes[0].path = entries[40].path
  assert.throws(() => projectRollforwardControls({ registry, routing, plan: bad }), /collides/)
  assert.throws(
    () =>
      projectRollforwardControls({
        registry,
        routing: { migratedDocuments: [...routing.migratedDocuments, { path: entries[0].path }] },
        plan,
      }),
    /six retired routes/,
  )
})
