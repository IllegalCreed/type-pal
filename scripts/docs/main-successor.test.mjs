import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { mainSuccessorAdmission, mainSuccessorTargets } from './main-successor-admission.mjs'
import {
  isMainSuccessorRegistryLayout,
  mainSuccessorRegistryPartition,
} from './main-successor-control.mjs'
import { readMainSuccessorSources } from './main-successor-document.mjs'
import { publishMainSuccessor } from './main-successor-publication.mjs'
import { inspectMainSuccessor } from './main-successor-review.mjs'
import { runMainSuccessorPublication } from './publish-main-successor-documents.mjs'
import { rollforwardFixture, rollforwardTestRoot } from './rollforward-publication.test-support.mjs'
import {
  grantRollforwardPlan,
  inspectRollforwardCohort,
  repairRollforwardPublicationHistory,
} from './rollforward-review.mjs'
import { plannedReviewInverse, restorePlannedReview } from './rollforward-review-plan.mjs'

const git = (...args) =>
  execFileSync('git', args, {
    cwd: rollforwardTestRoot,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')

test('the unchanged205/1916 predecessor needs no successor marker; injected rows or headers cannot extend its credit', () => {
  const records = repairRollforwardPublicationHistory(
    grantRollforwardPlan(rollforwardFixture().plan),
  ).records
  assert.equal(inspectMainSuccessor(records), undefined)
  assert.equal(inspectRollforwardCohort(records).byPath.size, 205)
  const mixed = structuredClone(records)
  mixed.get(mainSuccessorAdmission.semanticOwner).entries[0].successorIntake = {
    generationId: mainSuccessorAdmission.generationId,
  }
  assert.throws(() => inspectMainSuccessor(mixed), /mixed or unqualified/)
  const phantom = structuredClone(records)
  phantom.get(mainSuccessorAdmission.semanticOwner).mainSuccessorPublication =
    structuredClone(mainSuccessorAdmission)
  assert.throws(() => inspectMainSuccessor(phantom), /inventory|state/)
  assert.throws(
    () => publishMainSuccessor({ semanticGrants: 16 }, { allowWrite: true }),
    /original unmodified successor capability/,
  )
})

test('a real prior signed row restores exact values, missing keys and insertion order through the shared sparse axis', () => {
  const records = grantRollforwardPlan(rollforwardFixture().plan)
  const original = inspectRollforwardCohort(records).byPath.values().next().value.row
  const candidate = {
    path: original.path,
    coreConclusion: 'An amended source-specific claim awaiting acceptance.',
    afterSha256: '0'.repeat(64),
    contentReviewStatus: 'partial-review-unknown',
  }
  candidate.successorPrior = plannedReviewInverse(original, candidate)
  const restored = restorePlannedReview(candidate, 'successorPrior')
  assert.deepEqual(restored, original)
  assert.equal(JSON.stringify(restored), JSON.stringify(original))
  const bad = structuredClone(candidate)
  bad.successorPrior.fields.find((field) => field.present).value = 'forged-prior'
  assert.throws(() => restorePlannedReview(bad, 'successorPrior'), /fingerprint|inventory/)
})

test('all16 main carrier pins resolve real blobs; forged OID, revision, namespace and returned-buffer aliasing are rejected', () => {
  const byPath = new Map(
    mainSuccessorTargets.map((target) => {
      const pin = {
        path: target.path,
        revision: mainSuccessorAdmission.carrierRevision,
        gitObject: git('rev-parse', `${mainSuccessorAdmission.carrierRevision}:${target.path}`)
          .toString()
          .trim(),
        sha256: hash(
          git('cat-file', 'blob', `${mainSuccessorAdmission.carrierRevision}:${target.path}`),
        ),
      }
      return [target.path, { row: { path: target.path, primarySource: [pin] } }]
    }),
  )
  const read = readMainSuccessorSources(rollforwardTestRoot, { byPath })
  for (const { row } of byPath.values()) {
    const pin = row.primarySource[0],
      expected = git('cat-file', 'blob', `${pin.revision}:${pin.path}`)
    assert.deepEqual(read(pin).buffer, expected)
    const alias = read(pin).buffer
    alias[0] ^= 1
    assert.deepEqual(read(pin).buffer, expected)
  }
  const first = byPath.values().next().value.row.primarySource[0]
  assert.equal(read({ ...first, gitObject: '0'.repeat(40) }), undefined)
  assert.equal(read({ ...first, path: 'docs/ops/outside-successor.json' }), undefined)
  const wrong = structuredClone(byPath)
  wrong.values().next().value.row.primarySource[0].revision = mainSuccessorAdmission.mainRevision
  assert.throws(
    () => readMainSuccessorSources(rollforwardTestRoot, { byPath: wrong }),
    /source namespace/,
  )
})

test('only the exact eleventh physical range can extend an independently validated ten-part registry', () => {
  const old = Array.from({ length: 10 }, (_, index) => ({ key: `prior-${index}` }))
  const previous = (parts) => JSON.stringify(parts) === JSON.stringify(old)
  const next = [...old, structuredClone(mainSuccessorRegistryPartition)]
  assert.equal(isMainSuccessorRegistryLayout(next, previous), true)
  for (const parts of [
    old,
    [...next, { key: 'extra' }],
    [...old, { ...mainSuccessorRegistryPartition, positionRange: [4529, 4542] }],
    [...old, { ...mainSuccessorRegistryPartition, path: 'foreign.json' }],
  ])
    assert.equal(isMainSuccessorRegistryLayout(parts, previous), false)
  assert.equal(
    isMainSuccessorRegistryLayout(next, () => false),
    false,
  )
})

test('false plans, mode conflicts, in-repository outputs and overwritten receipts fail without changing repository inputs', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'main-successor-cli-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const path = join(directory, 'false.json'),
    output = join(directory, 'existing.json')
  writeFileSync(path, '{"carrierRevision":"forged","upstreamRevision":"forged","rows":[]}\n')
  writeFileSync(output, 'preserved receipt\n')
  const before = git('status', '--porcelain', '--untracked-files=all')
  assert.throws(
    () => runMainSuccessorPublication(['--plan', path, '--publish', '--write']),
    /mutually exclusive/,
  )
  assert.throws(
    () =>
      runMainSuccessorPublication([
        '--plan',
        path,
        '--out',
        join(rollforwardTestRoot, 'unsafe-result.json'),
      ]),
    /outside repository/,
  )
  assert.throws(() => runMainSuccessorPublication(['--plan', path]), /source revisions differ/)
  assert.throws(
    () => runMainSuccessorPublication(['--plan', path, '--write', '--out', output]),
    /EEXIST/,
  )
  assert.throws(() => runMainSuccessorPublication(['--inspect', '--plan', path]), /exclusive/)
  assert.deepEqual(git('status', '--porcelain', '--untracked-files=all'), before)
  assert.equal(readFileSync(output, 'utf8'), 'preserved receipt\n')
})
