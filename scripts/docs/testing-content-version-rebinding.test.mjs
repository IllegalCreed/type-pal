import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { loadTestingContentVersionRebinding } from './testing-content-version-rebinding.mjs'

const versionPath = 'packages/content/src/character.ts'
const catalogPath = 'docs/testing/catalog.json'
const reportPath = 'docs/testing/e2e/contract.md'
const evidencePath = 'docs/testing/e2e/evidence/e2e-contract.json'
const receiptPath = 'docs/tasks/cards/CONTENT-ACTOR-WORLD-INITIAL-SKILLS-1.md'
const original = Buffer.from(
  'export const CONTENT_VERSION = 23\nexport const CURRENT_PROJECT_MINIMUM_SAVE_VERSION = 12\nold code\n',
)
const changedImplementation = Buffer.from(original.toString().replace('old code', 'new code'))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const json = (value) => Buffer.from(JSON.stringify(value))
const report = (metadata, prose = '# Contract') =>
  Buffer.from(`${prose}\n\n<!-- testing-meta\n${JSON.stringify(metadata)}\n-->\n`)

function setup(current = changedImplementation) {
  const version = {
    path: versionPath,
    anchor: 'export const CONTENT_VERSION =',
    role: 'version',
    lines: '1-2',
    sha256: hash(original),
  }
  const published = {
    id: 'e2e-contract',
    canonical: 'e2e/contract.md',
    evidence: 'e2e/evidence/e2e-contract.json',
    sourceRefs: [version],
    revision: { contentVersion: 23, history: [{ action: 'publish' }] },
  }
  const evidence = {
    id: published.id,
    sourceRefs: [version],
    history: published.revision.history,
    runtimeExecution: { performed: false },
  }
  const baseRevision = 'a'.repeat(40)
  const date = '2026-11-19'
  const predecessor = new Map([
    [versionPath, original],
    [catalogPath, json({ entries: [published] })],
    [reportPath, report(published)],
    [evidencePath, json(evidence)],
  ])
  const live = new Map([
    [versionPath, current],
    [receiptPath, Buffer.from('# Corroborated source')],
  ])
  const event = {
    action: 'content-version-source-rebinding',
    base: baseRevision,
    date,
    evidence: receiptPath,
    previousSourceRefs: [version],
    scope: '仅更新未变的内容与存档版本声明指纹，沿用原执行、输入和结论。',
  }
  const updatedVersion = { ...version, sha256: hash(current) }
  const updatedReport = {
    ...published,
    sourceRefs: [updatedVersion],
    revision: { contentVersion: 23, history: [{ action: 'publish' }, event] },
  }
  const updatedEvidence = {
    ...evidence,
    sourceRefs: [updatedVersion],
    history: [{ action: 'publish' }, event],
  }
  return {
    bindings: () =>
      loadTestingContentVersionRebinding({
        admission: { afterSha256: hash(current), date, baseRevision, entries: 1 },
        readCurrent: (path) => live.get(path),
        readPredecessor: (path) => predecessor.get(path),
      }),
    live,
    predecessor,
    updatedReport,
    updatedEvidence,
  }
}

test('replays the original publication only after verifying new version references and history', () => {
  const fixture = setup()
  const bindings = fixture.bindings()
  assert.deepEqual(bindings.readPredecessorSource(versionPath), original)
  for (const [path, bytes] of [
    [catalogPath, json({ entries: [fixture.updatedReport] })],
    [reportPath, report(fixture.updatedReport)],
    [evidencePath, json(fixture.updatedEvidence)],
  ]) {
    assert.deepEqual(bindings.restore(path, bytes), fixture.predecessor.get(path))
  }
  fixture.live.set(versionPath, Buffer.from('changed during validation'))
  assert.throws(() => bindings.assertUnchanged(), /source changed during read/u)
})

test('rejects changed version declarations, published report text and evidence claims', () => {
  const alteredVersion = Buffer.from(original.toString().replace('= 12', '= 13'))
  assert.throws(() => setup(alteredVersion).bindings(), /version declaration changed/u)
  const fixture = setup()
  const bindings = fixture.bindings()
  assert.throws(
    () => bindings.restore(reportPath, report(fixture.updatedReport, '# Changed contract')),
    /report text changed/u,
  )
  assert.throws(
    () =>
      bindings.restore(
        evidencePath,
        json({ ...fixture.updatedEvidence, runtimeExecution: { performed: true } }),
      ),
    /evidence changed outside the admitted binding/u,
  )
  const { revision, ...entry } = fixture.updatedReport
  assert.throws(
    () =>
      bindings.restore(
        catalogPath,
        json({
          entries: [
            { ...entry, revision: { ...revision, history: revision.history.slice(0, -1) } },
          ],
        }),
      ),
    /catalog changed outside the admitted binding/u,
  )
})
