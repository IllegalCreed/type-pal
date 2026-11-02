import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { currentNativeControlAcceptance } from './current-native-control-acceptance.mjs'
import { currentNativeControlAdmissions } from './current-native-control-admission.mjs'
import {
  applyCurrentNativeControlGrant,
  currentNativeControlContentSha256,
  currentNativeControlQualificationIssues,
} from './current-native-control-qualification.mjs'
import {
  currentLedgerEntryHash,
  validateCurrentNativeControlChanges,
  validateCurrentNativeControlPublication,
} from './current-review-ledger-candidate.mjs'
import { loadReviewRecordFromGit } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const acceptedCandidate = 'c4a4295d8b6002e8b3f73c7abe8adc0bd45b8a08'
const reportSha256 = '94db1d0fe3683c6d9866e50755b17b6da48e769ad8aac7a29b41df115312384c'
const renewedPath = 'docs/phase-governance/routing.json'
const renewedCandidate = '5cea276459404bf1dec59641901b8617d29dd5f1'
const renewedReportSha256 = '3dd1c37f55d6c44ee833102c70300263ecd594927eb55da286976c98eb1e2435'
const records = new Map()
let renewedRowLoaded = false
function beforeRow(b) {
  if (!records.has(b.reviewRecord))
    records.set(
      b.reviewRecord,
      loadReviewRecordFromGit({ root, revision: acceptedCandidate, logicalPath: b.reviewRecord })
        .record,
    )
  // Per-entry frozen sources; this fixture is not a whole-record historical snapshot.
  if (b.path === renewedPath && !renewedRowLoaded) {
    records.get(b.reviewRecord).entries[b.index] = loadReviewRecordFromGit({
      root,
      revision: renewedCandidate,
      logicalPath: b.reviewRecord,
    }).record.entries[b.index]
    renewedRowLoaded = true
  }
  return records.get(b.reviewRecord).entries[b.index]
}
function changes() {
  return currentNativeControlAdmissions.map((b) => {
    const before = beforeRow(b)
    return {
      path: b.path,
      reviewRecord: b.reviewRecord,
      index: b.index,
      beforeEntrySha256: currentLedgerEntryHash(before),
      after: applyCurrentNativeControlGrant(before, b),
    }
  })
}

test('all22 compiled signatures bind their fixed accepted Git bodies to GLM while keeping prior withdrawals', () => {
  assert.deepEqual(
    Object.keys(currentNativeControlAcceptance),
    currentNativeControlAdmissions.map((b) => b.path),
  )
  for (const b of currentNativeControlAdmissions) {
    const before = beforeRow(b),
      untouched = structuredClone(before)
    const a = currentNativeControlAcceptance[b.path]
    assert.equal(a.author, 'Codex')
    assert.equal(a.reviewer, 'GLM')
    assert.equal(a.nonAuthorReviewer, true)
    assert.equal(a.reportSha256, b.path === renewedPath ? renewedReportSha256 : reportSha256)
    assert.equal(a.reviewedCandidate, b.path === renewedPath ? renewedCandidate : acceptedCandidate)
    assert.equal(a.contentSha256, currentNativeControlContentSha256(before))
    const after = applyCurrentNativeControlGrant(before, b)
    assert.deepEqual(before, untouched)
    assert.equal(currentNativeControlContentSha256(after), a.contentSha256)
    assert.deepEqual(currentNativeControlQualificationIssues(after, b), [])
    assert.equal(after.contentReviewStatus, 'content-reviewed')
    assert.equal(after.templateCompliance, 'template-compliant')
    assert.equal(after.claimCorrection, undefined)
    assert.deepEqual(after.history.slice(0, -1), before.history)
    const event = after.history.at(-1)
    assert.equal(event.kind, 'current-native-control-publication')
    assert.deepEqual(event.priorClaimCorrection, before.claimCorrection ?? null)
    assert.equal(event.oldClaimRestored, false)
    assert.equal(event.runtimeCredit, false)
    assert.equal(event.childSemanticAcceptanceGranted, false)
  }
})

test('the real publication validator rejects body edits, forged report basis, duplicate paths and author grants', () => {
  const valid = changes()
  assert.deepEqual(validateCurrentNativeControlPublication(valid, records), {
    targets: 22,
    grantsPrepared: 22,
    creditGranted: 0,
  })
  for (const change of [
    (c) => {
      c[0].after.coreConclusion += ' unsupported edit'
    },
    (c) => {
      c[0].after.currentIndependentAcceptance.reportSha256 = '0'.repeat(64)
    },
    (c) => {
      c[0].index++
    },
    (c) => {
      c[1] = structuredClone(c[0])
    },
  ]) {
    const altered = structuredClone(valid)
    change(altered)
    assert.throws(() => validateCurrentNativeControlPublication(altered, records))
  }
  assert.throws(() => validateCurrentNativeControlChanges(valid, records), /immutable field/)
})
