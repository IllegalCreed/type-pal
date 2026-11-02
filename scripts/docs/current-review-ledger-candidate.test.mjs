import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { currentLedgerTransfers, ledgerIdentity } from './current-review-ledger.mjs'
import {
  currentReviewLedgerAdmissions,
  currentReviewLedgerBaseline,
  currentReviewLedgerPilots,
} from './current-review-ledger-admission.mjs'
import {
  currentLedgerEntryHash,
  validateCurrentLedgerChanges,
  writeCurrentLedgerCandidate,
} from './current-review-ledger-candidate.mjs'
import { currentLedgerStorageUpgrade } from './current-review-ledger-storage-admission.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { loadReviewRecordFromGit } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url)),
  cache = new Map(),
  record = (logicalPath) => {
    if (!cache.has(logicalPath))
      cache.set(
        logicalPath,
        loadReviewRecordFromGit({
          root,
          logicalPath,
          revision: currentReviewLedgerBaseline,
        }).record,
      )
    return cache.get(logicalPath)
  }

test('111 exact ledger bindings preserve the accepted three and resolve original logical identities', () => {
  assert.equal(currentReviewLedgerAdmissions.length, 111)
  assert.equal(new Set(currentReviewLedgerAdmissions.map((b) => b.path)).size, 111)
  for (const b of currentReviewLedgerAdmissions) {
    const native = record(b.path)
    assert.deepEqual(
      ledgerIdentity(native),
      {
        headerSha256: b.headerSha256,
        membershipSha256: b.membershipSha256,
      },
      b.path,
    )
    assert.equal(native.entries.length, b.entryCount)
    assert.equal((native.currentRecordTransfers ?? []).length, b.transfers)
    assert.equal(record(b.reviewRecord).entries[b.index].path, b.path)
  }
  for (const b of currentReviewLedgerPilots)
    assert.strictEqual(
      currentReviewLedgerAdmissions.find((v) => v.path === b.path),
      b,
    )
})

function fixture() {
  const b = currentReviewLedgerAdmissions.find((v) => !currentReviewLedgerPilots.includes(v)),
    before = record(b.reviewRecord).entries[b.index],
    after = structuredClone(before),
    records = new Map([[b.reviewRecord, record(b.reviewRecord)]]),
    change = {
      path: b.path,
      reviewRecord: b.reviewRecord,
      index: b.index,
      beforeEntrySha256: currentLedgerEntryHash(before),
      after,
    }
  after.coreConclusion =
    'Isolated proposal: current ownership and historical member claims remain separate.'
  after.history ??= []
  after.history.push({
    kind: 'current-ledger-candidate',
    priorEntrySha256: change.beforeEntrySha256,
  })
  return { change, records }
}

test('author metadata can change with a prior locator while credit, source and correction fields cannot', () => {
  const f = fixture()
  assert.deepEqual(validateCurrentLedgerChanges([f.change], f.records), {
    targets: 1,
    creditGranted: 0,
  })
  for (const mutate of [
    (c) => {
      c.after.contentReviewStatus = 'content-reviewed'
    },
    (c) => {
      c.after.templateCompliance = 'template-compliant'
    },
    (c) => {
      c.after.afterSha256 = '0'.repeat(64)
    },
    (c) => {
      c.after.sourceSha256 = '0'.repeat(64)
    },
    (c) => {
      c.after.currentIndependentAcceptance = { reviewer: 'self' }
    },
    (c) => {
      delete c.after.claimCorrection
    },
    (c) => {
      c.after.revision.currentSha = '0'.repeat(64)
    },
    (c) => {
      c.after.history[0] = { replaced: true }
    },
  ]) {
    const x = fixture()
    mutate(x.change)
    assert.throws(
      () => validateCurrentLedgerChanges([x.change], x.records),
      /immutable field|prefix changed/u,
    )
  }
})

test('candidate plans reject stale before rows, borrowed positions, duplicates and missing prior locators', () => {
  for (const mutate of [
    (f) => {
      f.change.beforeEntrySha256 = '0'.repeat(64)
    },
    (f) => {
      f.change.index++
    },
    (f) => {
      f.change.path = 'docs/phase-governance/routing.json'
    },
    (f) => {
      f.change.after.history.pop()
    },
  ]) {
    const f = fixture()
    mutate(f)
    assert.throws(() => validateCurrentLedgerChanges([f.change], f.records))
  }
  const f = fixture()
  assert.throws(() => validateCurrentLedgerChanges([f.change, f.change], f.records), /duplicate/u)
})

test('serializable plans are not write capabilities', () => {
  assert.throws(
    () => writeCurrentLedgerCandidate({ kind: 'current-ledger-candidate/1.0.0' }),
    /unmodified in-process prepare capability/u,
  )
})

test('the single R93 storage upgrade resolves its exact pre-upgrade flat Git source', () => {
  const source = readGitDocumentSnapshot(root, currentLedgerStorageUpgrade)
  assert.equal(source.mode, '100644')
  assert.equal(source.gitObject, currentLedgerStorageUpgrade.gitObject)
  assert.equal(
    createHash('sha256').update(source.buffer).digest('hex'),
    currentLedgerStorageUpgrade.sha256,
  )
  const flat = JSON.parse(source.buffer)
  assert.equal(Object.hasOwn(flat, '_reviewStorage'), false)
  assert.equal(flat.entries.length, 91)
  const binding = currentReviewLedgerAdmissions.find(
    (b) => b.path === currentLedgerStorageUpgrade.path,
  )
  assert.equal(binding.initialStorage, 'flat')
  assert.deepEqual(ledgerIdentity(flat), {
    headerSha256: binding.headerSha256,
    membershipSha256: binding.membershipSha256,
  })
})

test('all20 transfer subjects resolve exact old Git members and unique current destinations', () => {
  let subjects = 0
  for (const b of currentReviewLedgerAdmissions) {
    const native = record(b.path)
    for (const transfer of currentLedgerTransfers(native)) {
      const pin = transfer.completePrior,
        source = readGitDocumentSnapshot(root, pin)
      assert.equal(source.gitObject, pin.gitObject)
      assert.equal(createHash('sha256').update(source.buffer).digest('hex'), pin.fileSha256)
      assert.equal(
        JSON.parse(source.buffer).entries.filter((e) => e.path === transfer.path).length,
        1,
      )
      assert.equal(pin.selector['entries.path'], transfer.path)
      assert.equal(pin.selector.uniqueMatches, 1)
      assert.equal(
        record(transfer.destination).entries.filter((e) => e.path === transfer.path).length,
        1,
      )
      assert.equal(native.entries.filter((e) => e.path === transfer.path).length, 0)
      subjects++
    }
  }
  assert.equal(subjects, 20)
  assert.throws(
    () => currentLedgerTransfers({ currentRecordTransfers: [{ subjects: [], path: 'mixed' }] }),
    /ambiguous/u,
  )
})
