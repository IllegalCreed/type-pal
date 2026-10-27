import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { validateTestingOrphans } from './check-testing.mjs'
import { checkMigratedDocument } from './document-model.mjs'
import { testingEvidenceLineageIssues } from './testing-evidence-lineage.mjs'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

test('a pinned former machine publication remains paired without acquiring current status', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'testing-lineage-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'e2e/evidence'), { recursive: true })
  const old = JSON.stringify({
    schemaVersion: 2,
    id: 'stage-a',
    status: 'rework',
    candidateSha: 'a'.repeat(40),
  })
  const historical = {
    evidence: 'e2e/evidence/old.json',
    sha256: digest(old),
    status: 'rework',
    candidateSha: 'a'.repeat(40),
  }
  const entry = {
    id: 'stage-a',
    status: 'verified',
    evidence: 'e2e/evidence/current.json',
    historical: {
      evidence: historical.evidence,
      publication: {
        sha256: historical.sha256,
        status: historical.status,
        candidateSha: historical.candidateSha,
      },
    },
  }
  const current = JSON.stringify({
    schemaVersion: 2,
    id: entry.id,
    status: 'verified',
    supersedes: historical,
  })
  writeFileSync(join(root, historical.evidence), old)
  writeFileSync(join(root, entry.evidence), current)
  const read = (path) => readFileSync(join(root, path))
  assert.deepEqual(testingEvidenceLineageIssues(entry, read), [])
  assert.deepEqual(validateTestingOrphans({ entries: [entry] }, root), [])
  const originalBytes = read(historical.evidence)
  const unregistered = structuredClone(entry)
  delete unregistered.historical.publication
  assert(
    validateTestingOrphans({ entries: [unregistered] }, root).some((issue) =>
      issue.includes('orphan evidence'),
    ),
  )
  for (const change of [
    (e) => {
      e.historical.publication.sha256 = '0'.repeat(64)
    },
    (e) => {
      e.historical.publication.status = 'verified'
    },
    (e) => {
      e.historical.publication.candidateSha = 'b'.repeat(40)
    },
    (e) => {
      e.historical.evidence = '../old.json'
    },
    (e) => {
      e.historical.evidence = e.evidence
    },
    (e) => {
      e.historical.publication = null
    },
  ]) {
    const copy = structuredClone(entry)
    change(copy)
    assert(testingEvidenceLineageIssues(copy, read).length)
    assert(validateTestingOrphans({ entries: [copy] }, root).length)
  }
  writeFileSync(
    join(root, entry.evidence),
    JSON.stringify({ schemaVersion: 2, id: entry.id, status: 'verified' }),
  )
  assert(
    testingEvidenceLineageIssues(entry, read).includes(
      'replacement evidence requires exact historical backlink',
    ),
  )
  writeFileSync(join(root, entry.evidence), current)
  const template = {
    templateId: 'fixture',
    templateVersion: '1',
    format: 'json',
    requiredFields: [],
    statuses: ['rework', 'verified'],
    statusPolicy: { axis: 'catalog-publication', catalog: 'docs/testing/catalog.json' },
  }
  // Production publication status dispatch, with an intentionally minimal IO
  // template; original-source preservation is independently enforced elsewhere.
  const docs = {
    'docs/testing/catalog.json': JSON.stringify({ entries: [entry] }),
    [`docs/testing/${historical.evidence}`]: JSON.stringify({
      ...JSON.parse(old),
      _governance: { templateId: 'fixture', templateVersion: '1' },
    }),
    [`docs/testing/${entry.evidence}`]: current,
  }
  const oldWithMetadata = docs[`docs/testing/${historical.evidence}`]
  entry.historical.publication.sha256 = digest(oldWithMetadata)
  docs[`docs/testing/${entry.evidence}`] = JSON.stringify({
    ...JSON.parse(current),
    supersedes: { evidence: historical.evidence, ...entry.historical.publication },
  })
  docs['docs/testing/catalog.json'] = JSON.stringify({ entries: [entry] })
  const doc = {
    path: `docs/testing/${historical.evidence}`,
    templateId: 'fixture',
    templateVersion: '1',
  }
  assert.deepEqual(
    checkMigratedDocument(doc, { types: [template] }, (path) => docs[path]),
    [],
  )
  const impostor = { ...doc, path: 'docs/testing/not-the-historical-file.json' }
  docs[impostor.path] = oldWithMetadata
  assert(
    checkMigratedDocument(impostor, { types: [template] }, (path) => docs[path]).includes(
      'publication status differs from catalog',
    ),
  )
  assert.deepEqual(
    read(historical.evidence),
    originalBytes,
    'status dispatch must never rewrite old evidence',
  )
})
