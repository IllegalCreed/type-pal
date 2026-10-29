import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { currentLedgerContentAcceptance } from './current-review-ledger-acceptance.mjs'
import {
  currentReviewLedgerAdmissions,
  currentReviewLedgerBaseline,
} from './current-review-ledger-admission.mjs'
import {
  currentLedgerEntryHash,
  validateCurrentLedgerChanges,
  validateCurrentLedgerPublication,
} from './current-review-ledger-candidate.mjs'
import {
  applyCurrentLedgerGrant,
  currentLedgerContentSha256,
  currentLedgerQualificationIssues,
} from './current-review-ledger-qualification.mjs'
import { loadReviewRecordFromGit } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url)),
  revision = '963ff5492956372d12a8ac7295dd1be944cde95d',
  binding = currentReviewLedgerAdmissions.find((b) =>
    b.path.endsWith('20261004-lore-phase3-batch1.json'),
  ),
  record = loadReviewRecordFromGit({ root, revision, logicalPath: binding.reviewRecord }).record,
  original = record.entries[binding.index]

// Isolated pure-validator input. These synthetic reports never enter the compiled table or writer.
function fixture() {
  const before = structuredClone(original),
    acceptance = {
      path: binding.path,
      reviewer: 'scoped independent fixture reviewers',
      nonAuthorReviewer: true,
      contentSha256: currentLedgerContentSha256(before),
      reportSha256: 'a'.repeat(64),
      reviewedCandidate: revision,
      task: 'isolated qualification fixture',
      date: '2026-10-29',
      basis: [
        {
          author: 'GLM',
          reviewer: 'Codex',
          nonAuthorReviewer: true,
          scope: 'Synthetic original contributor scope; no actual acceptance',
          reportSha256: 'b'.repeat(64),
          candidate: '12d90b4da6e2cc36c94ceab6577828cd79c7698e',
        },
        {
          author: 'Codex',
          reviewer: 'GLM',
          nonAuthorReviewer: true,
          scope: 'Synthetic Owner delta scope; no actual acceptance',
          reportSha256: 'c'.repeat(64),
          candidate: revision,
        },
      ],
    },
    row = structuredClone(before)
  delete row.claimCorrection
  row.contentReviewStatus = 'content-reviewed'
  row.templateCompliance = 'template-compliant'
  row.currentIndependentAcceptance = {
    protocol: 'document-delivery-acceptance/1.0.0',
    path: binding.path,
    reviewer: acceptance.reviewer,
    nonAuthorReviewer: true,
    verdict: 'accept',
    contentSha256: acceptance.contentSha256,
    reportSha256: acceptance.reportSha256,
    reviewedCandidate: revision,
    basis: structuredClone(acceptance.basis),
    controlIdentity: {
      baselineRevision: currentReviewLedgerBaseline,
      headerSha256: binding.headerSha256,
      membershipSha256: binding.membershipSha256,
      reviewRecord: binding.reviewRecord,
      index: binding.index,
    },
    ownerDecision: {
      actor: 'Codex',
      task: acceptance.task,
      currentBodyReview: true,
      currentTemplateMigration: true,
      oldClaimRestored: false,
      runtimeCredit: false,
      childSemanticAcceptanceGranted: false,
    },
  }
  row.history.push({
    kind: 'current-ledger-publication',
    task: acceptance.task,
    date: acceptance.date,
    reviewedCandidate: revision,
    contentSha256: acceptance.contentSha256,
    priorClaimCorrection: structuredClone(before.claimCorrection ?? null),
    oldClaimRestored: false,
    runtimeCredit: false,
    childSemanticAcceptanceGranted: false,
  })
  return {
    before,
    row,
    acceptance,
    issues: () => currentLedgerQualificationIssues(row, binding, acceptance),
  }
}

test('scoped qualification preserves the reviewed content and exact prior withdrawal through a grant', () => {
  const f = fixture()
  assert(f.before.claimCorrection)
  assert.deepEqual(f.issues(), [])
  assert.equal(currentLedgerContentSha256(f.row), currentLedgerContentSha256(f.before))
  assert.deepEqual(f.row.history.at(-1).priorClaimCorrection, f.before.claimCorrection)
  assert.deepEqual(f.row.history.slice(0, -1), f.before.history)
  assert.equal(
    f.row.currentIndependentAcceptance.ownerDecision.childSemanticAcceptanceGranted,
    false,
  )
})

test('missing, borrowed and self-author review evidence cannot authorize current-ledger promotion', () => {
  for (const mutate of [
    (f) => {
      f.acceptance.path = 'borrowed.json'
    },
    (f) => {
      f.acceptance.nonAuthorReviewer = false
    },
    (f) => {
      f.acceptance.reportSha256 = '0'.repeat(64)
    },
    (f) => {
      f.acceptance.basis = []
    },
    (f) => {
      f.acceptance.basis[0].reviewer = f.acceptance.basis[0].author
    },
    (f) => {
      f.row.currentIndependentAcceptance.controlIdentity.index++
    },
  ]) {
    const f = fixture()
    mutate(f)
    assert(f.issues().length > 0)
  }
})

test('changed semantics, source or history and restored old/runtime/child credit reject', () => {
  for (const mutate of [
    (r) => {
      r.coreConclusion += ' different conclusion'
    },
    (r) => {
      r.sourceSha256 = '0'.repeat(64)
    },
    (r) => {
      r.history[0].changed = true
    },
    (r) => {
      r.history.at(-1).priorClaimCorrection.scope += ' rewritten'
    },
    (r) => {
      r.history.push(structuredClone(r.history.at(-1)))
    },
    (r) => {
      r.currentIndependentAcceptance.ownerDecision.oldClaimRestored = true
    },
    (r) => {
      r.currentIndependentAcceptance.ownerDecision.runtimeCredit = true
    },
    (r) => {
      r.currentIndependentAcceptance.ownerDecision.childSemanticAcceptanceGranted = true
    },
  ]) {
    const f = fixture()
    mutate(f.row)
    f.row.afterSha256 = '0'.repeat(64)
    assert(f.issues().length > 0)
  }
})

test('administrative observation changes are separate from content acceptance and raw-byte verification', () => {
  const f = fixture(),
    before = currentLedgerContentSha256(f.row)
  f.row.afterSha256 = '0'.repeat(64)
  f.row.maintenanceDeltas ??= []
  f.row.maintenanceDeltas.push({ newSemanticCredit: 0, newTemplateMigrationCredit: 0 })
  assert.equal(currentLedgerContentSha256(f.row), before)
  assert.deepEqual(f.issues(), [])
  // This pure qualification does not certify raw bytes: the existing public ledger guard does so.
})

test('missing compiled scope and caller-forged grants cannot authorize publication or author state edits', () => {
  for (const path of Object.keys(currentLedgerContentAcceptance))
    assert(currentReviewLedgerAdmissions.some((b) => b.path === path))
  assert.throws(
    () =>
      applyCurrentLedgerGrant(original, {
        ...binding,
        path: 'docs/phase-governance/reviews/unadmitted-qualification-fixture.json',
      }),
    /lacks compiled scoped/u,
  )
  const f = fixture(),
    changes = [
      {
        path: binding.path,
        reviewRecord: binding.reviewRecord,
        index: binding.index,
        beforeEntrySha256: currentLedgerEntryHash(original),
        after: f.row,
      },
    ],
    records = new Map([[binding.reviewRecord, record]])
  assert.throws(() => validateCurrentLedgerChanges(changes, records), /immutable field/u)
  assert.throws(
    () => validateCurrentLedgerPublication(changes, records),
    /lacks compiled scoped|no other body edits/u,
  )
  assert(currentLedgerQualificationIssues(f.row, binding).length > 0)
})

test('the real CLI rejects an author plan with the Owner publication flag without repository mutation', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-ledger-publication-cli-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const input = join(directory, 'plan.json'),
    git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }),
    before = git('status', '--porcelain', '--untracked-files=all')
  writeFileSync(
    input,
    JSON.stringify({
      kind: 'current-ledger-candidate/1.0.0',
      baseRevision: git('rev-parse', 'HEAD').trim(),
      creditGranted: 0,
      date: '2026-10-29',
      changes: [],
    }),
  )
  const result = spawnSync(
    process.execPath,
    ['scripts/docs/update-current-ledger-candidates.mjs', '--plan', input, '--publish'],
    { cwd: root, encoding: 'utf8' },
  )
  assert.equal(result.status, 1)
  assert.match(result.stderr, /distinct explicit flag/u)
  assert.equal(git('status', '--porcelain', '--untracked-files=all'), before)
})
