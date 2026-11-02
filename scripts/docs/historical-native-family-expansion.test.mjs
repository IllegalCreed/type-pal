import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { currentDocumentPath } from './document-location.mjs'
import { checkMigratedDocument } from './document-model.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import {
  nativeFamilyAdmission,
  nativeFamilyCarrierRevision,
  nativeFamilyContentAcceptance,
  nativeFamilyContracts,
  nativeFamilyPilots,
} from './historical-native-family-admission.mjs'
import { nativeFamilyExpansion } from './historical-native-family-expansion-admission.mjs'
import { nativeFamilyReading } from './historical-native-family-reading.mjs'
import { loadReviewRecords } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const readBuffer = (path) =>
  readFileSync(new URL(`../../${currentDocumentPath(path)}`, import.meta.url))
const source = (pin) => readGitDocumentSnapshot(root, pin)
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const templates = JSON.parse(readBuffer('docs/phase-governance/templates/registry.json'))

// These fixtures exercise admission, not semantic acceptance. The existing reader
// suite tests native reading; no generated conclusion here receives content credit.
function fixture(entry) {
  const pin = {
    path: entry.path,
    revision: nativeFamilyCarrierRevision,
    gitObject: entry.carrierGitObject,
    sha256: entry.carrierSha256,
  }
  const row = {
    path: entry.path,
    docType: 'test-machine-evidence',
    templateId: entry.templateId,
    templateVariant: entry.variant,
    templateVersion: '1.0.0',
    historyOverlay: false,
    artifactOnly: false,
    documentStatus: 'historical',
    sourceSha256: entry.sourceSha256,
    sourceGitRevision: entry.sourceGitRevision,
    afterSha256: entry.carrierSha256,
    revision: { currentSha: entry.carrierSha256, history: [] },
    owner: 'Document-tool fixture',
    coreConclusion: `Admission-only fixture for ${entry.id}; no content acceptance.`,
    truthAnchors: ['Fixed carrier identity'],
    readDomain: { actual: 'Native shape fixture', reusedFrom: [], notRead: ['Product sources'] },
    historyBoundary: 'No historical execution certification.',
    stopLine: 'Do not promote without new independent content acceptance.',
    nextStep: 'Independent content review outside this test.',
    fieldRoles: {
      identity: [''],
      results: [''],
      governance: [`${entry.reviewRecord}#entries/${entry.reviewIndex}`],
    },
    primarySource: [pin],
    legalInputs: [{ kind: 'fixed-native-carrier', ...pin }],
    businessOracle: {
      type: 'historical-native-document',
      currentExecution: false,
      assertions: ['Native structure only; this fixture is not content approval.'],
    },
    evidence: {
      kind: 'historical-native-family',
      family: entry.family,
      nativeReading: nativeFamilyReading(JSON.parse(readBuffer(entry.path)), entry.family),
      runtimeExecutionPerformed: false,
      historicClaimsReexecuted: false,
      creditGranted: 0,
    },
    contentReviewStatus: 'partial-review-unknown',
    templateCompliance: 'needs-migration',
  }
  const check = (value = row, provider = source, path = entry.path) => {
    const entries = Array.from({ length: entry.reviewIndex + 1 }, (_, index) => ({
      path: `docs/expansion-fixture-${index}.md`,
    }))
    entries[entry.reviewIndex] = value
    return checkMigratedDocument(
      { path, templateId: entry.templateId, variant: entry.variant },
      templates,
      (p) => readBuffer(p).toString('utf8'),
      {
        readBuffer,
        readSourceBuffer: provider,
        reviewReader: (p) => (p === entry.reviewRecord ? { entries } : undefined),
      },
    )
  }
  return { row, check }
}

test('only the 27 admitted carrier/source/position identities extend the unchanged eight pilots', () => {
  assert.equal(nativeFamilyExpansion.length, 27)
  assert.equal(nativeFamilyPilots.length, 8)
  assert.equal(Object.keys(nativeFamilyContentAcceptance.contentByPath).length, 8)
  const counts = {}
  const identities = new Set()
  const group = loadReviewRecords({ root })
  for (const entry of nativeFamilyExpansion) {
    assert(Object.isFrozen(entry))
    assert(!identities.has(entry.path))
    identities.add(entry.path)
    assert(!nativeFamilyPilots.some((pilot) => pilot.path === entry.path))
    assert.equal(nativeFamilyContentAcceptance.contentByPath[entry.path], undefined)
    assert.equal(nativeFamilyAdmission(entry.path), entry)
    assert.equal(nativeFamilyAdmission(`${entry.path}.unadmitted`), undefined)
    assert.equal(entry.variant, nativeFamilyContracts[entry.family].variant)
    const carrier = source({ path: entry.path, revision: nativeFamilyCarrierRevision })
    assert.equal(carrier.gitObject, entry.carrierGitObject)
    assert.equal(hash(carrier.buffer), entry.carrierSha256)
    assert(readBuffer(entry.path).equals(carrier.buffer))
    const historical = source({ path: entry.path, revision: entry.sourceGitRevision })
    assert.equal(hash(historical.buffer), entry.sourceSha256)
    const rows = group.records.get(entry.reviewRecord).entries
    assert.equal(rows[entry.reviewIndex].path, entry.path)
    assert.equal(rows.filter((row) => row.path === entry.path).length, 1)
    assert.deepEqual(fixture(entry).check(), [], entry.path)
    counts[entry.family] = (counts[entry.family] ?? 0) + 1
  }
  assert.deepEqual(counts, {
    'raw-reporter': 21,
    'distilled-reporter': 1,
    'test-identity-array': 3,
    'totals-summary': 2,
  })
})

test('an expansion cannot borrow S50 acceptance or self-certify a matching native reading', () => {
  for (const family of [
    'raw-reporter',
    'distilled-reporter',
    'totals-summary',
    'test-identity-array',
  ]) {
    const entry = nativeFamilyExpansion.find((item) => item.family === family)
    const { row, check } = fixture(entry)
    for (const fakeAcceptance of [
      undefined,
      {
        protocol: 'document-delivery-acceptance/1.0.0',
        nonAuthorReviewer: true,
        verdict: 'accept',
        reviewer: nativeFamilyContentAcceptance.reviewer,
        reportSha256: nativeFamilyContentAcceptance.reportSha256,
        path: entry.path,
        afterSha256: entry.carrierSha256,
      },
    ]) {
      const promoted = structuredClone(row)
      promoted.contentReviewStatus = 'content-reviewed'
      promoted.templateCompliance = 'template-compliant'
      if (fakeAcceptance) promoted.currentIndependentAcceptance = fakeAcceptance
      assert(
        check(promoted).some((issue) => /status promotion/u.test(issue)),
        family,
      )
    }
  }
})

test('new path admission still rejects source-provider substitution and cross-row governance', () => {
  const entry = nativeFamilyExpansion[0]
  const { row, check } = fixture(entry)
  const wrongSource = (pin) => ({ ...source(pin), gitObject: '0'.repeat(40) })
  assert(check(row, wrongSource).some((issue) => /fixed Git carrier/u.test(issue)))
  const wrongGovernance = structuredClone(row)
  wrongGovernance.fieldRoles.governance = ['docs/phase-governance/reviews/other.json#entries/0']
  assert(check(wrongGovernance).some((issue) => /field roles/u.test(issue)))
  const wrongHistory = structuredClone(row)
  wrongHistory.sourceGitRevision = nativeFamilyCarrierRevision
  assert(check(wrongHistory).some((issue) => /historical source axes/u.test(issue)))
})
