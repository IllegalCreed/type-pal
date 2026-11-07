import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { validateCanonicalEvidence, validateCatalog } from './check-testing.mjs'
import { checkMigratedDocument } from './document-model.mjs'
import {
  assertTestingAcquisitionSourceBridge,
  testingAcquisitionSourceBase,
} from './testing-acquisition-source-bridge.mjs'
import {
  assertTestingBattleEvidence,
  assertTestingBattlePublication,
  isTestingBattleEvidencePath,
  testingBattlePublicationBase,
} from './testing-battle-publication.mjs'

const repository = fileURLToPath(new URL('../../', import.meta.url))
const catalogPath = 'docs/testing/catalog.json'
const evidencePath = 'docs/testing/domains/cross-phase/battle-foundation/evidence.json'
const bytes = (value) => Buffer.from(JSON.stringify(value))
const hash = (value) => createHash('sha256').update(value).digest('hex')
const fixed = new Map()
function readFixed(revision, path) {
  const key = `${revision}:${path}`
  if (!fixed.has(key))
    fixed.set(
      key,
      execFileSync('git', ['show', key], { cwd: repository, maxBuffer: 16 * 1024 * 1024 }),
    )
  return fixed.get(key)
}

function fixture() {
  const before = JSON.parse(readFixed(testingBattlePublicationBase, catalogPath))
  const entry = {
    id: 'q2-battle-foundation',
    kind: 'report',
    title: 'Synthetic battle publication validator fixture; no gameplay credit',
    status: 'verified',
    phase: ['phase1', 'phase2'],
    engines: ['game', 'reforge'],
    owner: 'Fixture',
    provenance: ['Synthetic validator input, not an engine acceptance receipt'],
    domain: 'cross-phase',
    module: 'battle-foundation',
    canonical: 'domains/cross-phase/battle-foundation/report.md',
    index: 'domains/cross-phase/battle-foundation/README.md',
    evidence: 'domains/cross-phase/battle-foundation/evidence.json',
    tags: ['battle-foundation'],
    lastVerified: '2026-11-07',
    dependsOn: [],
    sourceRefs: [
      {
        path: 'caller.mjs',
        lines: '1',
        anchor: 'export function selectLivingTarget',
        role: 'fixture-caller',
        sha256: hash(source),
      },
    ],
    publicCallers: ['selectLivingTarget([{ id: 1, hp: 1 }])'],
    legalInputs: ['One living fixture target; this validates publication, not battle behavior'],
    businessOracle: {
      type: 'fixture',
      assertions: ['Native receipt remains paired and byte-bound'],
    },
    dedupe: { result: 'reviewed', against: ['Existing native stage publication contract'] },
    revision: {
      currentSha: testingBattlePublicationBase,
      contentVersion: 23,
      minimumSaveVersion: 12,
      history: [{ action: 'synthetic-publication-fixture', runtimeCredit: false }],
    },
  }
  const current = structuredClone(before)
  current.entries.push(entry)
  current._governance.entryReadings.push({
    id: entry.id,
    conclusion: 'Synthetic schema-only fixture; no new engine execution or coverage acceptance.',
  })
  const additions = new Map(
    [
      [entry.canonical, 'test-domain-report-v1'],
      [entry.index, 'governance-index-v1'],
      [entry.evidence, 'test-machine-evidence-v1'],
    ].map(([path, templateId]) => [`docs/testing/${path}`, { templateId }]),
  )
  const evidence = {
    schemaVersion: 2,
    id: entry.id,
    kind: 'runtime-execution',
    status: entry.status,
    candidateSha: entry.revision.currentSha,
    versions: { content: 23, minimumSave: 12 },
    execution: {
      commands: [['node', 'caller.mjs']],
      cwd: '/synthetic-validator-fixture',
      exitCode: 0,
      signal: null,
      scope: 'Parser fixture only; this object is not published as engine execution',
    },
    ...Object.fromEntries(
      ['sourceRefs', 'publicCallers', 'legalInputs', 'businessOracle', 'dedupe'].map((key) => [
        key,
        structuredClone(entry[key]),
      ]),
    ),
    steps: [{ id: 'fixture', result: 'recorded' }],
    hashes: { fixture: hash(raw) },
    artifacts: [{ path: 'fixture.raw', sha256: hash(raw) }],
    runtimeExecution: { performed: true },
    claims: [{ id: 'fixture', result: 'runtime-backed', evidence: ['fixture.raw'] }],
    findings: [],
    failures: [],
    cleanup: { userStateWritten: false },
    history: structuredClone(entry.revision.history),
    _governance: {
      templateId: 'test-machine-evidence-v1',
      templateVersion: '1.5.0',
      variant: 'execution',
      lastReviewed: '2026-11-07',
      owner: 'Fixture',
      provenance: ['Synthetic parser input only'],
      sourceSha256: hash(source),
      sourceGitObject: 'a'.repeat(40),
      scope: 'No actual engine execution or runtime acceptance is asserted by this unit fixture',
      beforeAfter: 'One appended synthetic record; predecessor unchanged',
      stopLine: 'No gameplay credit',
      nextStep: 'Actual engine evidence belongs to the separately reviewed Q2 report',
    },
  }
  return {
    before,
    current,
    entry,
    evidence,
    additions,
    check: () => assertTestingBattlePublication(bytes(before), bytes(current), additions),
  }
}

const source = 'export function selectLivingTarget(targets) { return targets[0].id }\n'
const raw = 'Synthetic schema validator fixture; no gameplay execution credit.\n'
const registry = JSON.parse(
  readFileSync(join(repository, 'docs/phase-governance/templates/registry.json')),
)

function pairedFixture(t) {
  const f = fixture()
  const root = mkdtempSync(join(tmpdir(), 'type-pal-battle-publication-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const testingRoot = join(root, 'docs/testing')
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  write('caller.mjs', source)
  write('fixture.raw', raw)
  write(`docs/testing/${f.entry.index}`, '# Synthetic fixture index\n')
  const publish = () => {
    write(
      `docs/testing/${f.entry.canonical}`,
      `---\ntestingSchema: 2\nid: ${f.entry.id}\nevidence: ${f.entry.evidence}\n---\n\n<!-- testing-meta\n${JSON.stringify({ schemaVersion: 2, ...f.entry })}\n-->\n# Synthetic fixture report\n`,
    )
    write(evidencePath, bytes(f.evidence))
  }
  const modelIssues = () => {
    const current = bytes(f.evidence)
    const doc = { path: evidencePath, templateId: 'test-machine-evidence-v1' }
    return checkMigratedDocument(doc, registry, () => current.toString('utf8'), {
      locations: {
        additions: new Map([[doc.path, doc]]),
        changes: new Map(),
        assertCurrent: () => ({ current }),
      },
    })
  }
  publish()
  return { ...f, root, testingRoot, write, publish, modelIssues }
}

test('the single append preserves the complete accepted catalog and uses existing native metadata contracts', (t) => {
  const f = pairedFixture(t)
  const original = bytes(f.before)
  const candidate = bytes(f.current)
  f.check()
  assert.deepEqual(bytes(f.before), original)
  assert.deepEqual(bytes(f.current), candidate)
  assert.deepEqual(validateCatalog({ schemaVersion: 2, entries: [f.entry] }, f.testingRoot), [])
  assert.deepEqual(validateCanonicalEvidence(f.entry, f.testingRoot, f.root), [])
  assertTestingBattleEvidence(evidencePath, bytes(f.evidence))
  assert.deepEqual(f.modelIssues(), [])
})

test('the real accepted acquisition bridge remains required and still rejects the new member itself', () => {
  const f = fixture()
  const previous = readFixed(testingAcquisitionSourceBase, catalogPath)
  const current = readFixed(testingBattlePublicationBase, catalogPath)
  const read = (path) => readFixed(testingBattlePublicationBase, path)
  const fixed = {
    revision: testingAcquisitionSourceBase,
    readSource: (path) => readFixed(testingAcquisitionSourceBase, path),
  }
  assertTestingAcquisitionSourceBridge(catalogPath, previous, current, read, fixed)
  assert.throws(
    () =>
      assertTestingAcquisitionSourceBridge(catalogPath, previous, bytes(f.current), read, fixed),
    /catalog membership changed/,
  )
})

for (const [name, mutate] of [
  [
    'publication status',
    (f) => {
      f.current.entries[0].status = 'draft'
    },
  ],
  [
    'version',
    (f) => {
      f.current.entries[0].revision.contentVersion++
    },
  ],
  [
    'source identity',
    (f) => {
      f.current.entries[0].sourceRefs[0].sha256 = 'f'.repeat(64)
    },
  ],
  [
    'execution history',
    (f) => {
      f.current.entries[0].revision.history.push({ exitCode: 0 })
    },
  ],
  [
    'entry order',
    (f) => {
      ;[f.current.entries[0], f.current.entries[1]] = [f.current.entries[1], f.current.entries[0]]
    },
  ],
  [
    'reading',
    (f) => {
      f.current._governance.entryReadings[0].conclusion = 'changed'
    },
  ],
  [
    'catalog governance',
    (f) => {
      f.current._governance.runtimeExecutionPerformed = true
    },
  ],
]) {
  test(`publication rejects changing the old ${name}`, () => {
    const f = fixture()
    mutate(f)
    assert.throws(f.check, /battle publication changed existing catalog facts/)
  })
}

for (const [name, mutate] of [
  [
    'extra member',
    (f) => {
      f.current.entries.push({ ...f.entry, id: 'q2-extra' })
    },
  ],
  [
    'duplicate new ID',
    (f) => {
      f.current.entries.push(structuredClone(f.entry))
    },
  ],
  [
    'duplicate old ID',
    (f) => {
      f.entry.id = f.before.entries[0].id
    },
  ],
  [
    'wrong kind',
    (f) => {
      f.entry.kind = 'e2e-stage'
    },
  ],
  [
    'wrong canonical path',
    (f) => {
      f.entry.canonical = 'domains/cross-phase/other/report.md'
    },
  ],
  [
    'wrong index path',
    (f) => {
      f.entry.index = 'domains/cross-phase/other/README.md'
    },
  ],
  [
    'wrong evidence path',
    (f) => {
      f.entry.evidence = 'domains/cross-phase/other/evidence.json'
    },
  ],
]) {
  test(`publication rejects ${name}`, () => {
    const f = fixture()
    mutate(f)
    assert.throws(f.check, /only the admitted battle foundation entry may be appended/)
  })
}

test('each report/index/evidence pair must use its existing admitted template', () => {
  for (const [path] of fixture().additions) {
    const f = fixture()
    f.additions.delete(path)
    assert.throws(f.check, /battle publication requires an admitted pair/)
    f.additions.set(path, { templateId: 'guide-runbook-v1' })
    assert.throws(f.check, /battle publication requires an admitted pair/)
  }
})

test('the appended reading cannot be missing, duplicated, mismatched or empty', () => {
  for (const mutate of [
    (f) => f.current._governance.entryReadings.pop(),
    (f) => f.current._governance.entryReadings.push({ id: f.entry.id, conclusion: 'duplicate' }),
    (f) => {
      f.current._governance.entryReadings.at(-1).id = 'another-record'
    },
    (f) => {
      f.current._governance.entryReadings.at(-1).conclusion = '  '
    },
  ]) {
    const f = fixture()
    mutate(f)
    assert.throws(f.check, /battle publication requires/)
  }
})

test('native evidence is admitted only at the exact new path and identity', () => {
  const f = fixture()
  for (const path of [evidencePath.replace('battle-foundation', 'other'), `${evidencePath}.bak`]) {
    assert.equal(isTestingBattleEvidencePath(path), false)
    assert.throws(() => assertTestingBattleEvidence(path, bytes(f.evidence)), /unadmitted/)
  }
  f.evidence.id = 'e2e-010'
  assert.throws(
    () => assertTestingBattleEvidence(evidencePath, bytes(f.evidence)),
    /evidence identity differs/,
  )
})

test('a document audit or unperformed/source-only receipt cannot masquerade as native execution', () => {
  for (const mutate of [
    (e) => {
      e.schemaVersion = 1
    },
    (e) => {
      e.kind = 'document-audit'
    },
    (e) => {
      e.runtimeExecution.performed = false
    },
    (e) => {
      e._governance.variant = 'document-audit-v2'
    },
    (e) => {
      e.claims[0].result = 'source-backed'
    },
  ]) {
    const { evidence } = fixture()
    mutate(evidence)
    assert.throws(
      () => assertTestingBattleEvidence(evidencePath, bytes(evidence)),
      /must declare its actual native execution/,
    )
  }
})

test('shared validators still reject missing execution, unbound artifacts and source drift', (t) => {
  const f = pairedFixture(t)
  delete f.evidence.execution
  assert.deepEqual(f.modelIssues(), ['missing machine field: execution'])
  f.evidence.artifacts = []
  f.publish()
  assert.ok(
    validateCanonicalEvidence(f.entry, f.testingRoot, f.root).some((issue) =>
      issue.includes('runtime claim lacks actual execution/artifacts'),
    ),
  )
  f.evidence.artifacts = [{ path: 'fixture.raw', sha256: 'f'.repeat(64) }]
  f.publish()
  assert.ok(
    validateCanonicalEvidence(f.entry, f.testingRoot, f.root).some((issue) =>
      issue.includes('runtime artifact hash mismatch'),
    ),
  )
  f.write('caller.mjs', `${source}// source drift\n`)
  assert.ok(
    validateCanonicalEvidence(f.entry, f.testingRoot, f.root).some((issue) =>
      issue.includes('sourceRef hash mismatch'),
    ),
  )
})
