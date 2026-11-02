import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { readPinnedGitDocuments } from './git-document-batch.mjs'
import { mainSuccessorAdmission, mainSuccessorTargets } from './main-successor-admission.mjs'
import {
  isCodeLedgerInventoryProjection,
  matchesMaintainedCodeLedgerInventory,
} from './main-successor-document.mjs'
import { priorSuccessorRecord } from './main-successor-review.mjs'
import { loadReviewRecordFromGit } from './review-record-storage.mjs'
import { rollforwardHistoryEvent } from './rollforward-review.mjs'
import { reviewPlanHash } from './rollforward-review-plan.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const target = mainSuccessorTargets.find(
  (entry) => entry.path === 'docs/ops/audits/code-quality-file-ledger.md',
)
const currentRevision = 'd77831b2a9f26c024c8231c222bfbfebb3dfa968'
const read = (revision) =>
  loadReviewRecordFromGit({ root, revision, logicalPath: target.owner }).record

function maintainedRecord() {
  const record = read(currentRevision)
  const row = record.entries[target.index]
  assert.equal(row.path, target.path)
  assert.equal(Object.hasOwn(row, 'maintenanceDeltas'), false)
  row.maintenanceDeltas = [
    {
      kind: 'S89-single-job-and-final-evidence/1.0.0',
      beforeSha256: row.afterSha256,
      afterSha256: 'f'.repeat(64),
      newSemanticCredit: 0,
      runtimeCredit: false,
    },
  ]
  row.afterSha256 = 'f'.repeat(64)
  return record
}
const cohort = { byPath: new Map([[target.path, target]]) }

test('first administrative maintenance restores the exact signed predecessor from fixed Git', () => {
  const record = maintainedRecord()
  const originalInput = structuredClone(record)
  const expected = read(mainSuccessorAdmission.predecessorRevision).entries[target.index]
  // S87 recorded this already accepted publication observation before capturing
  // the prior view. It changes no original signature or content claim.
  expected.history = [rollforwardHistoryEvent(expected)]
  assert.equal(
    reviewPlanHash(expected),
    '97cc3ae00088e292618da5c2fff99c310c8f86e8d67860a5e828ba5346e282a2',
  )
  const restored = priorSuccessorRecord(record, cohort).entries[target.index]
  assert.deepEqual(restored, expected)
  assert.equal(JSON.stringify(restored), JSON.stringify(expected))
  assert.deepEqual(record, originalInput)
})

test('administrative projection still rejects an unrecorded governance field', () => {
  const record = maintainedRecord()
  record.entries[target.index].unrecordedGovernanceClaim = 'not in the accepted sparse inverse'
  assert.throws(() => priorSuccessorRecord(record, cohort), /inverse key inventory/)
})

test('only balanced current inventory counts may change; signatures, table and historical bytes stay fixed', () => {
  const row = read(currentRevision).entries[target.index]
  const accepted = execFileSync(
    'git',
    ['show', `${row.currentIndependentAcceptance.reviewedCandidate}:${target.path}`],
    { cwd: root, maxBuffer: 4 * 1024 * 1024 },
  )
  const text = accepted.toString('utf8')
  const projected = text
    .replace('当前 tracked 清单：3,621。', '当前 tracked 清单：3,623。')
    .replace(
      '尚未逐文件核验：2,775；合计未闭合：2,775。',
      '尚未逐文件核验：2,777；合计未闭合：2,777。',
    )
  assert.notEqual(projected, text)
  assert.equal(isCodeLedgerInventoryProjection(target.path, Buffer.from(projected), accepted), true)
  for (const changed of [
    projected.replace('当前已闭合核验：846', '当前已闭合核验：847'),
    projected.replace('当前 tracked 清单：3,623。', '当前 tracked 清单：3,624。'),
    projected.replace('Owner: Codex', 'Owner: someone else'),
    `${projected}\nUnreviewed new claim.\n`,
    projected.replace('<!-- original-source-fenced:start -->', '<!-- altered-history -->'),
  ])
    assert.equal(
      isCodeLedgerInventoryProjection(target.path, Buffer.from(changed), accepted),
      false,
    )
  assert.equal(
    isCodeLedgerInventoryProjection('docs/ops/board.md', Buffer.from(projected), accepted),
    false,
  )
  assert.equal(isCodeLedgerInventoryProjection(target.path, Buffer.from([0xff]), accepted), false)
})

test('the real Markdown primary carrier needs an unbroken zero-credit maintenance chain', () => {
  const record = read(currentRevision),
    row = record.entries[target.index],
    pin = row.primarySource[0]
  const source = readPinnedGitDocuments(root, [pin])(pin)
  assert.equal(pin.sha256, row.successorIntake.acceptedBodySha256)
  const bytes = Buffer.from(
    source.buffer
      .toString('utf8')
      .replace('当前 tracked 清单：3,621。', '当前 tracked 清单：3,623。')
      .replace(
        '尚未逐文件核验：2,775；合计未闭合：2,775。',
        '尚未逐文件核验：2,777；合计未闭合：2,777。',
      ),
  )
  row.afterSha256 = createHash('sha256').update(bytes).digest('hex')
  row.maintenanceDeltas = [
    {
      beforeSha256: pin.sha256,
      afterSha256: row.afterSha256,
      newSemanticCredit: 0,
      runtimeCredit: false,
    },
  ]
  assert.equal(matchesMaintainedCodeLedgerInventory(row, bytes, source), true)
  for (const delta of [
    { beforeSha256: '0'.repeat(64) },
    { afterSha256: '0'.repeat(64) },
    { newSemanticCredit: 1 },
    { runtimeCredit: true },
  ]) {
    const changed = structuredClone(row)
    Object.assign(changed.maintenanceDeltas[0], delta)
    assert.equal(matchesMaintainedCodeLedgerInventory(changed, bytes, source), false)
  }
  assert.equal(matchesMaintainedCodeLedgerInventory(row, bytes, undefined), false)
})
