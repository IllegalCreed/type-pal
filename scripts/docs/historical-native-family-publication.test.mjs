import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkMigratedDocument } from './document-model.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { nativeFamilyExpansionContentAcceptance } from './historical-native-family-completion-admission.mjs'
import { nativeFamilyExpansion } from './historical-native-family-expansion-admission.mjs'
import { nativeFamilyContentSha256 } from './historical-native-family-qualification.mjs'
import { loadReviewRecords } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const readBuffer = (p) => readFileSync(new URL(`../../${p}`, import.meta.url))
const templates = JSON.parse(readBuffer('docs/phase-governance/templates/registry.json'))
const group = loadReviewRecords({ root })
const pilot = nativeFamilyExpansion[0]
const record = group.records.get(pilot.reviewRecord)
const row = record.entries[pilot.reviewIndex]
const check = (candidate) =>
  checkMigratedDocument(
    {
      path: pilot.path,
      templateId: pilot.templateId,
      variant: pilot.variant,
      historyOverlay: false,
    },
    templates,
    (p) => readBuffer(p).toString('utf8'),
    {
      readBuffer,
      readSourceBuffer: (pin) => readGitDocumentSnapshot(root, pin),
      reviewReader: (p) =>
        p === pilot.reviewRecord
          ? {
              ...record,
              entries: record.entries.map((value, index) =>
                index === pilot.reviewIndex ? candidate : value,
              ),
            }
          : group.records.get(p),
    },
  )

// The older partial-input regression stays pinned to S56; this checks today's public consumer.
test('the exact 27 externally accepted current documents pass their real native contracts', () => {
  assert.equal(nativeFamilyExpansionContentAcceptance.reviewer, 'GLM')
  assert.equal(
    nativeFamilyExpansionContentAcceptance.reportSha256,
    '1f3c0cc95229cb3e6a40ef7c173d54ab44a947528738546de0bdf3d1b06293bb',
  )
  assert.deepEqual(
    Object.keys(nativeFamilyExpansionContentAcceptance.contentByPath).sort(),
    nativeFamilyExpansion.map((entry) => entry.path).sort(),
  )
  for (const entry of nativeFamilyExpansion) {
    const current = group.records.get(entry.reviewRecord).entries[entry.reviewIndex]
    assert.equal(current.contentReviewStatus, 'content-reviewed')
    assert.equal(current.templateCompliance, 'template-compliant')
    assert.equal(
      nativeFamilyContentSha256(current),
      nativeFamilyExpansionContentAcceptance.contentByPath[entry.path],
    )
    assert.deepEqual(
      checkMigratedDocument(
        {
          path: entry.path,
          templateId: entry.templateId,
          variant: entry.variant,
          historyOverlay: false,
        },
        templates,
        (p) => readBuffer(p).toString('utf8'),
        {
          readBuffer,
          readSourceBuffer: (pin) => readGitDocumentSnapshot(root, pin),
          reviewReader: (p) => group.records.get(p),
        },
      ),
      [],
      entry.path,
    )
  }
})

test('a changed conclusion cannot obtain acceptance by refreshing its self-reported digest', () => {
  const changed = structuredClone(row)
  changed.coreConclusion += ' Additional unaccepted claim.'
  changed.currentIndependentAcceptance.contentSha256 = nativeFamilyContentSha256(changed)
  assert(check(changed).some((issue) => issue.includes('status promotion')))
})

test('an old S54 report cannot authorize the corrected current metadata', () => {
  const changed = structuredClone(row)
  changed.currentIndependentAcceptance.reportSha256 =
    'b330793bb3675eb78b0c92500c23915249ee987bcd25a86d19b15cee2829a7ce'
  assert(check(changed).some((issue) => issue.includes('status promotion')))
})

test('current document acceptance does not allow a runtime grant', () => {
  const changed = structuredClone(row)
  changed.currentIndependentAcceptance.ownerDecision.runtimeCredit = true
  assert(check(changed).some((issue) => issue.includes('status promotion')))
})
