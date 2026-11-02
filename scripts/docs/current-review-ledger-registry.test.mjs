import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { currentReviewLedgerPilots } from './current-review-ledger-admission.mjs'
import { projectCurrentLedgerControls } from './current-review-ledger-candidate.mjs'
import { applyCurrentLedgerGrant } from './current-review-ledger-qualification.mjs'
import { reviewCreditIssues } from './document-integrity.mjs'
import { loadReviewRecordFromGit } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url)),
  revision = '6e0723208b722591a83a622ba700d8ecc9f18521',
  cache = new Map(),
  readBuffer = (path) => {
    if (!cache.has(path))
      cache.set(
        path,
        execFileSync('git', ['show', `${revision}:${path}`], {
          cwd: root,
          maxBuffer: 32 * 1024 * 1024,
        }),
      )
    return cache.get(path)
  }

test('real publication projection uses registry reviewStatus and preserves every unrelated registry row', () => {
  const b = currentReviewLedgerPilots[0],
    before = loadReviewRecordFromGit({ root, revision, logicalPath: b.reviewRecord }).record
      .entries[b.index],
    after = applyCurrentLedgerGrant(before, b),
    outputs = projectCurrentLedgerControls(root, [{ path: b.path, after }], readBuffer, true),
    manifest = JSON.parse(readBuffer('docs/phase-governance/document-registry.json'))
  let targets = 0
  for (const descriptor of manifest.shards) {
    const path = `docs/phase-governance/${descriptor.path}`,
      old = JSON.parse(readBuffer(path)),
      now = JSON.parse(outputs.find((o) => o.path === path)?.bytes ?? readBuffer(path))
    assert.equal(old.entries.length, now.entries.length)
    for (const [i, row] of now.entries.entries()) {
      if (row.path !== b.path) {
        assert.deepEqual(row, old.entries[i])
        continue
      }
      targets++
      assert.deepEqual(reviewCreditIssues(row, after), [])
      assert.equal(row.reviewStatus, 'content-reviewed')
      assert.equal(row.templateCompliance, 'template-compliant')
      assert.equal(Object.hasOwn(row, 'contentReviewStatus'), false)
      const expected = structuredClone(old.entries[i])
      expected.reviewStatus = 'content-reviewed'
      expected.templateCompliance = 'template-compliant'
      assert.deepEqual(row, expected)
    }
  }
  assert.equal(targets, 1)
})
