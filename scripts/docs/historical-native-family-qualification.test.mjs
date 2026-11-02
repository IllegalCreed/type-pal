import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { checkMigratedDocument } from './document-model.mjs'
import { saveDocumentRegistryFixture } from './document-registry.test-support.mjs'
import { frozenDocumentBaseline } from './frozen-document-source.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import {
  nativeFamilyCarrierRevision,
  nativeFamilyContentAcceptance,
  nativeFamilyPilots,
} from './historical-native-family-admission.mjs'
import { historicalVitestContract } from './historical-vitest-native.mjs'
import {
  assertReviewRecordSourceUnchanged,
  FROZEN_REVIEW_SOURCE_REVISION,
  FROZEN_REVIEW_STORAGE_SOURCES,
  loadReviewRecordFromGit,
  loadReviewRecords,
} from './review-record-storage.mjs'
import { packReviewStorageRecord } from './review-record-storage-packing.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const beforeRevision = '52cc1bd530998990dbfeff18b347b854a37796ae'
const templatePath = 'docs/phase-governance/templates/registry.json'
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const readBuffer = (path) => readFileSync(join(root, path))
const source = (pin) => readGitDocumentSnapshot(root, pin)
const templates = () => JSON.parse(readBuffer(templatePath))
// Independent statement of the accepted proposal's nineteen-field digest schema.
const contentKeys = [
  'owner',
  'coreConclusion',
  'truthAnchors',
  'readDomain',
  'primarySource',
  'legalInputs',
  'fieldRoles',
  'businessOracle',
  'evidence',
  'versionScope',
  'publicCallers',
  'dedupe',
  'historyBoundary',
  'unresolved',
  'stopLine',
  'nextStep',
  'readMethod',
  'reviewDepth',
  'reviewedLines',
]
function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered)
  if (value === null || typeof value !== 'object') return value
  const result = {}
  for (const key of Object.keys(value).sort()) result[key] = ordered(value[key])
  return result
}
function contentDigest(row) {
  const selected = {}
  for (const key of contentKeys) {
    assert(Object.hasOwn(row, key), key)
    selected[key] = row[key]
  }
  return hash(JSON.stringify(ordered(selected)))
}
function containsExact(value, expected) {
  if (isDeepStrictEqual(value, expected)) return true
  if (value === null || typeof value !== 'object') return false
  return Object.values(value).some((item) => containsExact(item, expected))
}
function acceptedRows() {
  const group = loadReviewRecords({
    root,
    logicalPaths: [...new Set(nativeFamilyPilots.map((pilot) => pilot.reviewRecord))],
  })
  const rows = nativeFamilyPilots.map((pilot) => {
    const row = group.records.get(pilot.reviewRecord).entries[pilot.reviewIndex]
    assert.equal(row.path, pilot.path)
    return structuredClone(row)
  })
  assertReviewRecordSourceUnchanged(group.loadedSource)
  return rows
}
function check(pilot, row) {
  const entries = Array.from({ length: pilot.reviewIndex + 1 }, (_, index) => ({
    path: `docs/qualification-fixture-${index}.md`,
  }))
  entries[pilot.reviewIndex] = row
  return checkMigratedDocument(
    { path: pilot.path, templateId: pilot.templateId, variant: pilot.variant },
    templates(),
    (path) => readBuffer(path).toString('utf8'),
    {
      readBuffer,
      readSourceBuffer: source,
      reviewReader: (path) => (path === pilot.reviewRecord ? { entries } : undefined),
    },
  )
}

test('eight accepted native documents bind independent content digests and preserve their withdrawn histories', () => {
  const rows = acceptedRows()
  assert.equal(rows.length, 8)
  assert.deepEqual(
    Object.keys(nativeFamilyContentAcceptance.contentByPath).sort(),
    nativeFamilyPilots.map((pilot) => pilot.path).sort(),
  )
  assert.match(nativeFamilyContentAcceptance.reportSha256, /^[a-f\d]{64}$/u)
  assert(nativeFamilyContentAcceptance.reviewer.length > 0)
  for (const [index, pilot] of nativeFamilyPilots.entries()) {
    const row = rows[index]
    const carrier = source({ path: pilot.path, revision: nativeFamilyCarrierRevision })
    assert.equal(carrier.gitObject, pilot.carrierGitObject)
    assert.equal(hash(carrier.buffer), pilot.carrierSha256)
    assert(readBuffer(pilot.path).equals(carrier.buffer))
    assert.equal(contentDigest(row), nativeFamilyContentAcceptance.contentByPath[pilot.path])
    assert.equal(row.contentReviewStatus, 'content-reviewed')
    assert.equal(row.templateCompliance, 'template-compliant')
    assert.equal(row.currentIndependentAcceptance.nonAuthorReviewer, true)
    assert.equal(row.currentIndependentAcceptance.verdict, 'accept')
    assert.equal(
      row.currentIndependentAcceptance.reportSha256,
      nativeFamilyContentAcceptance.reportSha256,
    )
    assert.equal(row.currentIndependentAcceptance.path, pilot.path)
    assert.equal(row.currentIndependentAcceptance.afterSha256, pilot.carrierSha256)
    assert.equal(row.currentIndependentAcceptance.contentSha256, contentDigest(row))
    assert.equal(row.currentIndependentAcceptance.ownerDecision.runtimeCredit, false)
    assert.equal(row.currentIndependentAcceptance.ownerDecision.oldClaimRestored, false)
    const prior = loadReviewRecordFromGit({
      root,
      revision: beforeRevision,
      logicalPath: pilot.reviewRecord,
    }).record.entries[pilot.reviewIndex]
    assert.equal(row.sourceSha256, prior.sourceSha256)
    assert.equal(row.sourceGitRevision, prior.sourceGitRevision)
    assert.deepEqual(row.history.slice(0, prior.history.length), prior.history)
    assert.deepEqual(row.provenance.slice(0, prior.provenance.length), prior.provenance)
    assert.deepEqual(
      row.revision.history.slice(0, prior.revision.history.length),
      prior.revision.history,
    )
    assert.equal(row.claimCorrection, undefined)
    if (prior.claimCorrection)
      assert(
        containsExact(row.history.slice(prior.history.length), prior.claimCorrection),
        pilot.id,
      )
    assert.equal(row.evidence.runtimeExecutionPerformed, false)
    assert.equal(row.evidence.historicClaimsReexecuted, false)
    assert.deepEqual(check(pilot, row), [], pilot.id)
  }
})

test('acceptance cannot be borrowed, refreshed after semantic edits or used to restore withdrawn execution claims', () => {
  const rows = acceptedRows()
  const pilot = nativeFamilyPilots[0]
  const changes = [
    (row) => {
      row.currentIndependentAcceptance = structuredClone(rows[1].currentIndependentAcceptance)
    },
    (row) => {
      row.currentIndependentAcceptance.reportSha256 = '0'.repeat(64)
    },
    (row) => {
      row.currentIndependentAcceptance.afterSha256 = '0'.repeat(64)
    },
    (row) => {
      row.coreConclusion += ' Current product execution is also certified.'
      row.currentIndependentAcceptance.contentSha256 = contentDigest(row)
    },
    (row) => {
      row.businessOracle.unreviewedResult = 'new execution passed'
    },
    (row) => {
      row.evidence.runtimeExecutionPerformed = true
    },
    (row) => {
      row.claimCorrection = { status: 'withdrawn' }
    },
    (row) => {
      row.readMethod = 'structured-mechanical-envelope-only'
    },
    (row) => {
      row.reviewDepth = 'deep-semantic'
      row.currentIndependentAcceptance.contentSha256 = contentDigest(row)
    },
    (row) => {
      row.readMethod = 'Full historical product execution was independently repeated.'
      row.currentIndependentAcceptance.contentSha256 = contentDigest(row)
    },
    (row) => {
      row.currentIndependentAcceptance.ownerDecision.runtimeCredit = true
    },
    (row) => {
      row.currentIndependentAcceptance.nonAuthorReviewer = false
    },
    (row) => {
      delete row.currentIndependentAcceptance
    },
    (row) => {
      delete row.historyBoundary
    },
  ]
  for (const change of changes) {
    const row = structuredClone(rows[0])
    change(row)
    const issues = check(pilot, row)
    assert(
      issues.some((issue) =>
        /status promotion|execution or completion credit|read domain/u.test(issue),
      ),
      JSON.stringify(issues),
    )
  }
})

function publicFixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-native-qualified-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  execFileSync('git', ['clone', '--quiet', '--shared', '--no-checkout', root, directory])
  cpSync(join(root, 'scripts/docs'), join(directory, 'scripts/docs'), { recursive: true })
  const write = (path, bytes) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), bytes)
  }
  const save = (path, value) => write(path, `${JSON.stringify(value, null, 2)}\n`)
  write('AGENTS.md', '# Fixture\n\n## Routes\n\nExact accepted native documents.\n')
  save(templatePath, templates())
  write(frozenDocumentBaseline.path, source(frozenDocumentBaseline).buffer)
  const rows = acceptedRows()
  const registryEntries = rows.map((row) => ({
    path: row.path,
    phase: row.path.startsWith('docs/testing/') ? 'testing' : 'ops',
    docType: row.docType,
    templateId: row.templateId,
    templateVariant: row.templateVariant,
    templateVersion: row.templateVersion,
    templateCompliance: row.templateCompliance,
    reviewStatus: row.contentReviewStatus,
    historyOverlay: false,
    reviewRecord: nativeFamilyPilots
      .find((pilot) => pilot.path === row.path)
      .reviewRecord.split('/')
      .at(-1),
  }))
  const reviews = new Map([
    [
      historicalVitestContract.reviewRecord,
      {
        schemaVersion: 1,
        id: 'existing-raw-cohort-required-reader',
        entries: [{ path: 'docs/fixture-existing-raw-cohort.json' }],
      },
    ],
  ])
  for (const [index, pilot] of nativeFamilyPilots.entries()) {
    if (!reviews.has(pilot.reviewRecord))
      reviews.set(pilot.reviewRecord, {
        schemaVersion: 1,
        id: `qualified-${reviews.size}`,
        entries: [],
      })
    const record = reviews.get(pilot.reviewRecord)
    while (record.entries.length <= pilot.reviewIndex)
      record.entries.push({ path: `docs/fixture-${record.id}-${record.entries.length}.md` })
    record.entries[pilot.reviewIndex] = rows[index]
    write(pilot.path, source({ path: pilot.path, revision: nativeFamilyCarrierRevision }).buffer)
  }
  const publish = () => {
    rmSync(join(directory, 'docs/phase-governance/reviews/shards'), {
      recursive: true,
      force: true,
    })
    for (const [logicalPath, record] of reviews) {
      if (!FROZEN_REVIEW_STORAGE_SOURCES.some((item) => item.path === logicalPath)) {
        save(logicalPath, record)
        continue
      }
      const fixed = source({ path: logicalPath, revision: FROZEN_REVIEW_SOURCE_REVISION })
      const packed = packReviewStorageRecord({
        logicalPath,
        record,
        sourcePin: {
          path: logicalPath,
          revision: FROZEN_REVIEW_SOURCE_REVISION,
          gitObject: fixed.gitObject,
          sha256: hash(fixed.buffer),
        },
        context: { format: (text) => text },
      })
      for (const output of packed.outputs) write(output.path, output.bytes)
    }
    save('docs/phase-governance/routing.json', {
      entry: 'AGENTS.md',
      entrySection: 'Routes',
      routes: [],
      forwardingEntries: [],
      migratedDocuments: nativeFamilyPilots.map((pilot) => ({
        path: pilot.path,
        templateId: pilot.templateId,
        variant: pilot.variant,
      })),
    })
    saveDocumentRegistryFixture(directory, registryEntries)
  }
  const cli = (name) => {
    const result = spawnSync(
      process.execPath,
      [`scripts/docs/${name}.mjs`, ...(name === 'report-governance-progress' ? ['--json'] : [])],
      {
        cwd: directory,
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
      },
    )
    assert.equal(result.error, undefined)
    assert.equal(result.signal, null)
    return {
      ...result,
      report: name === 'report-governance-progress' ? JSON.parse(result.stdout) : undefined,
    }
  }
  publish()
  return { rows, registryEntries, publish, cli }
}

test('public model and progress count exactly eight accepted versions and reject a coordinated registry/review forgery', (t) => {
  const f = publicFixture(t)
  const model = f.cli('check-document-model'),
    progress = f.cli('report-governance-progress')
  assert.equal(model.status, 0, model.stdout + model.stderr)
  assert.equal(progress.status, 0, progress.stdout + progress.stderr)
  assert.deepEqual(
    progress.report.completed.map((row) => row.path).sort(),
    nativeFamilyPilots.map((pilot) => pilot.path).sort(),
  )
  assert.equal(progress.report.completed.length, 8)
  const row = f.rows[0],
    entry = f.registryEntries[0]
  row.coreConclusion += ' Unauthorized claim with a refreshed digest.'
  row.currentIndependentAcceptance.contentSha256 = contentDigest(row)
  row.contentReviewStatus = entry.reviewStatus = 'content-reviewed'
  row.templateCompliance = entry.templateCompliance = 'template-compliant'
  f.publish()
  const badModel = f.cli('check-document-model'),
    badProgress = f.cli('report-governance-progress')
  assert.equal(badModel.status, 1, badModel.stdout + badModel.stderr)
  assert.match(
    badModel.stderr,
    /status promotion requires its exact independently accepted content/u,
  )
  assert.equal(badProgress.status, 1, badProgress.stdout + badProgress.stderr)
  assert(
    badProgress.report.issues.some(
      (issue) => issue.includes(row.path) && /status promotion/u.test(issue),
    ),
  )
  assert.equal(
    badProgress.report.completed.some((item) => item.path === row.path),
    false,
  )
  assert.equal(badProgress.report.completed.length, 7)
})
