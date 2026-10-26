import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkMigratedDocument } from './document-model.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { nativeFamilyExpansionContentAcceptance } from './historical-native-family-completion-admission.mjs'
import { nativeFamilyExpansion } from './historical-native-family-expansion-admission.mjs'
import { loadReviewRecords } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const readBuffer = (p) => readFileSync(new URL(`../../${p}`, import.meta.url))
const templates = JSON.parse(readBuffer('docs/phase-governance/templates/registry.json'))

test('27 corrected native metadata candidates remain partial and cannot borrow prior S54 content acceptance for promotion', () => {
  const g = loadReviewRecords({ root })
  assert.equal(Object.keys(nativeFamilyExpansionContentAcceptance.contentByPath).length, 0)
  assert.equal(nativeFamilyExpansionContentAcceptance.reportSha256, null)
  for (const t of nativeFamilyExpansion) {
    const record = g.records.get(t.reviewRecord)
    const row = record.entries[t.reviewIndex]
    assert.equal(row.contentReviewStatus, 'partial-review-unknown')
    assert.equal(row.templateCompliance, 'needs-migration')
    assert.equal(row.reviewDepth, 'partial-semantic')
    assert.equal(row.evidence.path, t.path)
    assert(row.publicCallers.length > 0)
    for (const p of row.publicCallers) assert(readBuffer(p).length > 0)
    assert.equal(row.currentIndependentAcceptance, undefined)
    const check = (r) =>
      checkMigratedDocument(
        { path: t.path, templateId: t.templateId, variant: t.variant, historyOverlay: false },
        templates,
        (p) => readBuffer(p).toString('utf8'),
        {
          readBuffer,
          readSourceBuffer: (pin) => readGitDocumentSnapshot(root, pin),
          reviewReader: (p) =>
            p === t.reviewRecord
              ? { ...record, entries: record.entries.map((v, n) => (n === t.reviewIndex ? r : v)) }
              : g.records.get(p),
        },
      )
    assert.deepEqual(check(row), [], t.path)
    const changed = structuredClone(row)
    changed.contentReviewStatus = 'content-reviewed'
    changed.templateCompliance = 'template-compliant'
    changed.currentIndependentAcceptance = {
      reviewer: 'GLM',
      nonAuthorReviewer: true,
      verdict: 'accept',
      path: t.path,
      reportSha256: 'b330793bb3675eb78b0c92500c23915249ee987bcd25a86d19b15cee2829a7ce',
    }
    assert(
      check(changed).some((issue) => issue.includes('status promotion')),
      t.path,
    )
  }
})
