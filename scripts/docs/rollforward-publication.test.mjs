import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { readPinnedGitDocuments } from './git-document-batch.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { inspectIncrementalCohort } from './incremental-review.mjs'
import {
  readRollforwardPublicationPlan,
  runRollforwardPublication,
} from './publish-rollforward-documents.mjs'
import { rollforwardNativeContentIssues } from './rollforward-document-contract.mjs'
import { readRollforwardGitSource } from './rollforward-git-source.mjs'
import { publishRollforwardPublication } from './rollforward-publication.mjs'
import { rollforwardFixture, rollforwardTestRoot } from './rollforward-publication.test-support.mjs'
import {
  grantRollforwardPlan,
  inspectRollforwardCohort,
  priorRollforwardRecord,
  snapshotRollforwardCohort,
} from './rollforward-review.mjs'

test('the real accepted205 grants retain all4351 prior reviews and the original1916 signature root', () => {
  const { records, plan } = rollforwardFixture(),
    saved = structuredClone(records)
  const next = grantRollforwardPlan(plan),
    cohort = inspectRollforwardCohort(next)
  assert.equal(cohort.byPath.size, 205)
  assert.equal(inspectIncrementalCohort(next).rows.length, 1916)
  assert.deepEqual(records, saved)
  assert.deepEqual(
    new Map([...next].map(([path, record]) => [path, priorRollforwardRecord(record, cohort)])),
    records,
  )
  assert.deepEqual(
    [...cohort.byPath.values()].reduce((counts, { row }) => {
      const author = row.currentIndependentAcceptance.basis.author
      counts[author] = (counts[author] ?? 0) + 1
      return counts
    }, {}),
    { GLM: 200, Codex: 5 },
  )
})

test('late semantic/source/body/signature mutations and unrelated old content are refused', () => {
  const { plan } = rollforwardFixture(),
    original = grantRollforwardPlan(plan)
  const example = inspectRollforwardCohort(original).byPath.values().next().value
  for (const mutate of [
    (row) => {
      row.coreConclusion += ' forged-tail'
    },
    (row) => {
      row.afterSha256 = '0'.repeat(64)
    },
    (row) => {
      row.primarySource[0].gitObject = '0'.repeat(40)
    },
    (row) => {
      row.currentIndependentAcceptance.basis.reviewer =
        row.currentIndependentAcceptance.basis.author
    },
    (row) => {
      row.rollforwardPrior.fields.at(-1).present = !row.rollforwardPrior.fields.at(-1).present
    },
  ]) {
    const bad = structuredClone(original)
    mutate(bad.get(example.owner).entries[example.index])
    assert.throws(() => inspectRollforwardCohort(bad))
  }
  const bad = structuredClone(original)
  const unchanged = [...bad.values()].flatMap((r) => r.entries).find((r) => !r.rollforwardIntake)
  unchanged.coreConclusion += ' silently replaced'
  assert.throws(() => inspectRollforwardCohort(bad), /unaffected original review content/)
  const tail = structuredClone(plan)
  tail.changes.at(-1).after.nextStep += ' forged-tail'
  assert.throws(() => grantRollforwardPlan(tail), /accepted normalized plan/)
})

test('published snapshot reuse cannot bypass logical owner or mutable-row protection', () => {
  const records = grantRollforwardPlan(rollforwardFixture().plan)
  const snapshot = snapshotRollforwardCohort(records),
    example = snapshot.byPath.values().next().value
  assert.throws(() => {
    example.row.coreConclusion += ' mutation'
  }, TypeError)
  records.set(example.owner, structuredClone(records.get(example.owner)))
  assert.throws(() => snapshotRollforwardCohort(records), /owner object replaced/)
})

test('fixed Markdown sources resolve real blobs without broadening the old JSON-only reader', () => {
  const pin = {
    path: 'docs/ops/code-quality.md',
    revision: '7273d7aa5a8bbe96ddebcb437765e2e8f7f3e911',
  }
  const actual = readRollforwardGitSource(rollforwardTestRoot, pin)
  assert.equal(actual.mode, '100644')
  assert.deepEqual(
    actual.buffer,
    execFileSync('git', ['cat-file', 'blob', `${pin.revision}:${pin.path}`], {
      cwd: rollforwardTestRoot,
    }),
  )
  assert.equal(readGitDocumentSnapshot(rollforwardTestRoot, pin), undefined)
  for (const bad of [
    { ...pin, revision: '0'.repeat(40) },
    { ...pin, path: 'docs/../AGENTS.md' },
    { ...pin, path: 'docs/ops/missing.md' },
  ])
    assert.equal(readRollforwardGitSource(rollforwardTestRoot, bad), undefined)
})

test('publication requires an original in-process capability and a closed external plan', (t) => {
  assert.throws(
    () => publishRollforwardPublication({ grants: 205 }, { allowWrite: true }),
    /original unmodified publication capability/,
  )
  const directory = mkdtempSync(join(tmpdir(), 'rollforward-publication-test-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const input = join(directory, 'false.json')
  writeFileSync(input, '{"kind":"forged"}\n')
  const before = readFileSync(input)
  assert.throws(() => readRollforwardPublicationPlan(input), /closed pending plan/)
  assert.throws(() => runRollforwardPublication(['--publish', '--inspect']), /mutually exclusive/)
  assert.throws(
    () =>
      runRollforwardPublication([
        '--plan',
        input,
        '--out',
        join(rollforwardTestRoot, 'forbidden-result.json'),
      ]),
    /outside repository/,
  )
  assert.deepEqual(readFileSync(input), before)
})

test('a pinned Git batch preserves real object and SHA256 identity and isolates returned buffers', () => {
  const { plan } = rollforwardFixture()
  const pins = [
    plan.changes[0].after.primarySource[0],
    ...plan.changes
      .filter((c) => c.path.endsWith('.json'))
      .slice(0, 2)
      .map((c) => c.after.primarySource[0]),
  ]
  const read = readPinnedGitDocuments(rollforwardTestRoot, [...pins, structuredClone(pins[0])])
  for (const pin of pins) {
    const actual = read(pin),
      expected = execFileSync('git', ['cat-file', 'blob', `${pin.revision}:${pin.path}`], {
        cwd: rollforwardTestRoot,
      })
    assert.deepEqual(actual.buffer, expected)
    actual.buffer[0] ^= 1
    assert.deepEqual(read(pin).buffer, expected)
  }
  assert.equal(read({ ...pins[0], sha256: '0'.repeat(64) }), undefined)
  assert.equal(read({ ...pins[0], path: 'docs/ops/not-in-the-closed-batch.md' }), undefined)
  assert.throws(
    () => readPinnedGitDocuments(rollforwardTestRoot, [{ ...pins[0], gitObject: '0'.repeat(40) }]),
    /real Git mode\/object/,
  )
  assert.throws(
    () => readPinnedGitDocuments(rollforwardTestRoot, [{ ...pins[0], sha256: '0'.repeat(64) }]),
    /fixed source SHA256/,
  )
})

test('a real native artifact uses its JSON contract while rejecting changed witnesses or a Markdown relabel', () => {
  const records = grantRollforwardPlan(rollforwardFixture().plan)
  const item = inspectRollforwardCohort(records).byPath.get(
      'docs/testing/domains/phase1-runtime/control-rotation/evidence.json',
    ),
    row = item.row
  const registry = JSON.parse(
    execFileSync(
      'git',
      [
        'cat-file',
        'blob',
        '69abb48a8742d9e3ef6f819f4695f1786e1e2293:docs/phase-governance/templates/registry.json',
      ],
      { cwd: rollforwardTestRoot },
    ),
  )
  const template = registry.types.find((t) => t.templateId === row.templateId),
    pin = row.primarySource[0]
  const text = execFileSync('git', ['cat-file', 'blob', `${pin.revision}:${pin.path}`], {
    cwd: rollforwardTestRoot,
  }).toString()
  const markdownTrap = () => {
    throw new Error('Markdown headings must not be checked for a JSON-native artifact')
  }
  assert.deepEqual(rollforwardNativeContentIssues(row, item, template, text, markdownTrap), [])
  const changed = JSON.parse(text)
  changed.id = 'wrong-publication'
  assert.notDeepEqual(
    rollforwardNativeContentIssues(row, item, template, JSON.stringify(changed), markdownTrap),
    [],
  )
  const wrong = structuredClone(template)
  wrong.variants[row.templateVariant].format = 'markdown'
  assert.deepEqual(rollforwardNativeContentIssues(row, item, wrong, text, markdownTrap), [
    'native production contract requires JSON format',
  ])
})
