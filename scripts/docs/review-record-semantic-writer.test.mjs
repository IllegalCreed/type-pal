import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkMigratedDocument } from './document-model.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { historicalVitestAdmission, historicalVitestCohort } from './historical-vitest-cohort.mjs'
import {
  prepareReviewSemanticDelta,
  publishReviewSemanticDelta,
} from './review-record-semantic-writer.mjs'
import {
  FROZEN_REVIEW_STORAGE_SOURCES,
  loadReviewRecordFromGit,
  loadReviewRecords,
  reviewDirRelative,
} from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url)),
  baseRevision = '19b583a0c07de64ad81b03241844b5df9acf768c'
const sha = (b) => createHash('sha256').update(b).digest('hex'),
  canonical = (v) => sha(JSON.stringify(v))
const reviewPaths = [
  ...FROZEN_REVIEW_STORAGE_SOURCES.map((e) => e.path),
  `${reviewDirRelative}/20261017-r92-phase-governance-artifacts.json`,
  `${reviewDirRelative}/20261017-r94-final-machine-artifacts.json`,
]
// Fixed Git fixtures survive subsequent real central publication and administrative pins.
const fixedFiles = new Map()
const fixed = (path) => {
  if (!fixedFiles.has(path)) {
    const tree = execFileSync('git', ['ls-tree', '-z', baseRevision, '--', path], {
      cwd: root,
      encoding: 'utf8',
    })
    const match = /^100644 blob ([a-f\d]{40})\t([^\0]+)\0$/.exec(tree)
    assert.equal(match?.[2], path, `fixed ordinary Git fixture: ${path}`)
    fixedFiles.set(
      path,
      execFileSync('git', ['cat-file', 'blob', match[1]], {
        cwd: root,
        maxBuffer: 16 * 1024 * 1024,
      }),
    )
  }
  return fixedFiles.get(path)
}
const source = { records: new Map(), storages: new Map() }
for (const path of reviewPaths) {
  const result = loadReviewRecordFromGit({ root, revision: baseRevision, logicalPath: path })
  source.records.set(path, result.record)
  source.storages.set(path, result.storage)
  fixed(path)
  for (const descriptor of result.storage?.shards ?? [])
    fixed(`${reviewDirRelative}/${descriptor.path}`)
}
const selected = [...new Set(historicalVitestCohort.entries.map((e) => e.runPhase))].map((phase) =>
  historicalVitestCohort.entries.find((e) => e.runPhase === phase),
)
const pending = historicalVitestCohort.entries.filter((e) => e.runPhase === 'green-with-pending')
const multiple = historicalVitestCohort.entries.filter(
  (e) => JSON.parse(fixed(e.path)).numFailedTests === 4,
)
const samples = [
  ...new Map([...selected, ...pending, ...multiple].map((e) => [e.path, e])).values(),
]

function expectedSets(native) {
  const counters = {},
    assertionStatuses = {},
    failedAssertions = [],
    pendingAssertions = []
  for (const key of Object.keys(native)) if (key.startsWith('num')) counters[key] = native[key]
  for (let i = 0; i < native.testResults.length; i++)
    for (let j = 0; j < native.testResults[i].assertionResults.length; j++) {
      const a = native.testResults[i].assertionResults[j]
      assertionStatuses[a.status] = (assertionStatuses[a.status] ?? 0) + 1
      const identity = {
        pointer: `#/testResults/${i}/assertionResults/${j}`,
        fullName: a.fullName,
        status: a.status,
      }
      if (a.status === 'failed') failedAssertions.push(identity)
      else if (a.status !== 'passed') pendingAssertions.push(identity)
    }
  return {
    files: native.testResults.length,
    counters,
    assertionStatuses: Object.fromEntries(Object.entries(assertionStatuses).sort()),
    failedAssertions,
    pendingAssertions,
  }
}

function rowFor(binding) {
  const before = source.records.get(binding.reviewRecord).entries[binding.reviewIndex],
    after = structuredClone(before),
    native = JSON.parse(fixed(binding.path)),
    results = expectedSets(native)
  const contextPath = 'docs/ops/evidence/TEST-EDITOR-ALCHEMY-BOUNDARIES-1/README.md',
    context = fixed(contextPath)
  Object.assign(after, {
    docType: 'test-machine-evidence',
    templateId: 'test-machine-evidence-v1',
    templateVersion: '1.0.0',
    templateVariant: 'historical-vitest-native-v1',
    historyOverlay: false,
    artifactOnly: false,
    sourceGitRevision: historicalVitestCohort.sourceRevision,
    documentStatus: 'historical',
    reviewDepth: 'structured-content',
    readMethod:
      'Contract fixture from actual immutable reporter and source context; not a semantic acceptance.',
    reviewedLines:
      'Fixture actual reporter fields/complete identities and one context anchor only.',
    readDomain: {
      actual: 'Test fixture construction; not an author reading claim',
      reusedFrom: [],
    },
    coreConclusion: `Fixture preserves ${native.numTotalTests} historical assertion results without running tests or granting semantic credit.`,
    unresolved: ['Historical execution is not authenticated by this fixture.'],
    legalInputs: ['Frozen reporter bytes, not claimed original product test inputs.'],
    businessOracle: {
      type: 'historical-native-preservation',
      assertions: [
        'Exact historical reporter identity and counts',
        ...results.failedAssertions.map((a) => a.fullName),
      ],
    },
    primarySource: [
      {
        path: binding.path,
        revision: historicalVitestCohort.sourceRevision,
        sha256: binding.sourceSha256,
      },
    ],
    versionScope: { ...after.versionScope, runPhase: binding.runPhase },
    nativeWitnesses: [
      { pointer: '#/numTotalTests', quote: String(native.numTotalTests) },
      {
        pointer: '#/testResults/0/assertionResults/0/fullName',
        quote: native.testResults[0].assertionResults[0].fullName,
      },
    ],
    contextReferences: [
      {
        path: contextPath,
        sha256: sha(context),
        lines: [1, 1],
        quote: context.toString('utf8').split('\n')[0],
      },
    ],
    evidence: {
      kind: 'historical-native-vitest-cohort',
      byteStable: true,
      nativeResults: results,
      currentAudit: { runtimeExecutionPerformed: false, historicClaimsReexecuted: false },
    },
  })
  after.history.push({
    revision: baseRevision,
    scope:
      'Fixture updates only this admitted row; original remains in fixed Git. No semantic credit.',
  })
  after.provenance.push('Owned test fixture, not a real governance acceptance.')
  return {
    path: binding.path,
    reviewRecord: binding.reviewRecord,
    index: binding.reviewIndex,
    beforeEntrySha256: binding.beforeEntrySha256,
    after,
  }
}

function fixture(t, bindings = [selected[0]]) {
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-semantic-writer-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  execFileSync('git', ['init', '-q'], { cwd: directory })
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
  mkdirSync(join(directory, '.git/objects/info'), { recursive: true })
  writeFileSync(join(directory, '.git/objects/info/alternates'), `${join(common, 'objects')}\n`)
  const put = (path, bytes) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), bytes)
  }
  for (const [path, bytes] of fixedFiles) put(path, bytes)
  const changes = bindings.map(rowFor)
  for (const path of new Set([
    'docs/phase-governance/templates/registry.json',
    'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json',
    ...historicalVitestCohort.protectedNative.map((e) => e.path),
    ...changes.flatMap((e) => e.after.contextReferences.map((p) => p.path)),
  ]))
    put(path, fixed(path))
  for (const path of ['biome.json', '.gitignore']) put(path, readFileSync(join(root, path)))
  const prepare = () =>
    prepareReviewSemanticDelta({
      root: directory,
      baseRevision,
      changes,
      changesSha256: canonical(changes),
    })
  return { directory, changes, prepare, put }
}

test('all admitted phases use fixed sources and exact review bindings; phase, identity and witness counterexamples reject', (t) => {
  const f = fixture(t, samples),
    records = new Map([...source.records].map(([p, v]) => [p, structuredClone(v)])),
    readBuffer = (p) => readFileSync(join(f.directory, p))
  for (const c of f.changes) records.get(c.reviewRecord).entries[c.index] = c.after
  const registry = JSON.parse(readBuffer('docs/phase-governance/templates/registry.json'))
  const check = (change, routeOverride = {}) =>
    checkMigratedDocument(
      {
        path: change.path,
        templateId: 'test-machine-evidence-v1',
        variant: 'historical-vitest-native-v1',
        ...routeOverride,
      },
      registry,
      (p) => readBuffer(p).toString('utf8'),
      {
        readBuffer,
        readSourceBuffer: (pin) => readGitDocumentSnapshot(f.directory, pin),
        reviewReader: (p) => records.get(p),
      },
    )
  for (const c of f.changes) assert.deepEqual(check(c), [], c.path)
  assert.equal(historicalVitestCohort.entries.length, 269)
  assert.equal(new Set(historicalVitestCohort.entries.map((e) => e.reviewRecord)).size, 8)
  assert.equal(historicalVitestAdmission(pending[2].path).reviewIndex, 17)
  for (const c of f.changes.filter((c) => c.after.versionScope.runPhase === 'green-with-pending'))
    assert.equal(
      c.after.evidence.nativeResults.pendingAssertions.length,
      JSON.parse(readBuffer(c.path)).numPendingTests,
    )
  for (const c of f.changes.filter((c) => multiple.some((e) => e.path === c.path)))
    assert.equal(c.after.evidence.nativeResults.failedAssertions.length, 4)
  const c = f.changes[0],
    original = structuredClone(c.after)
  for (const mutate of [
    (r) => {
      r.versionScope.runPhase = 'different-phase'
    },
    (r) => {
      r.evidence.nativeResults.failedAssertions = []
    },
    (r) => {
      r.nativeWitnesses[0].quote = 'not-original'
    },
    (r) => {
      r.contextReferences[0].sha256 = '0'.repeat(64)
    },
  ]) {
    records.get(c.reviewRecord).entries[c.index] = structuredClone(original)
    mutate(records.get(c.reviewRecord).entries[c.index])
    assert(check(c).length > 0)
  }
  records.get(c.reviewRecord).entries[c.index] = original
  assert(
    check(c, { templateId: 'archive-record-v1', variant: undefined }).some((issue) =>
      issue.includes('fixed path/variant/version'),
    ),
  )
  const wrong = records.get(c.reviewRecord).entries
  ;[wrong[c.index], wrong[c.index + 1]] = [wrong[c.index + 1], wrong[c.index]]
  assert(check(c).some((e) => e.includes('identity/source/phase')))
})

test('prepare and publish replace current generations with exact logical deltas, retire old fragments and replay without writes', (t) => {
  const f = fixture(t, [selected[0], pending[2]]),
    plan = f.prepare(),
    before = new Map([...source.records].map(([p, v]) => [p, structuredClone(v)]))
  for (const c of f.changes) before.get(c.reviewRecord).entries[c.index] = c.after
  assert.throws(() => publishReviewSemanticDelta(plan), /explicit Owner/)
  const actual = publishReviewSemanticDelta(plan, { allowWrite: true })
  assert.equal(actual.totalEntries, 599)
  assert(actual.retired > 0)
  assert.equal(actual.lockReleased, true)
  const group = loadReviewRecords({ root: f.directory, logicalPaths: reviewPaths })
  for (const { path } of FROZEN_REVIEW_STORAGE_SOURCES) {
    assert.deepStrictEqual(group.records.get(path), before.get(path))
    assert.equal(JSON.stringify(group.records.get(path)), JSON.stringify(before.get(path)))
    assert.deepStrictEqual(group.storages.get(path).source, source.storages.get(path).source)
  }
  for (const edge of plan.edges)
    assert.equal(
      group.records.get(edge.record).entries[edge.index].afterSha256,
      sha(readFileSync(join(f.directory, edge.path))),
    )
  for (const retired of plan.retiredFiles) assert(!existsSync(join(f.directory, retired.path)))
  assert.deepEqual(publishReviewSemanticDelta(plan, { allowWrite: true }), {
    written: 0,
    retired: 0,
    totalEntries: 599,
    idempotent: true,
    lockReleased: true,
  })
})

test('unapproved row, immutable source, discarded history and unqualified reviewed promotion reject before publication', (t) => {
  const f = fixture(t)
  const original = structuredClone(f.changes[0])
  for (const mutate of [
    (c) => {
      c.index++
    },
    (c) => {
      c.beforeEntrySha256 = '0'.repeat(64)
    },
    (c) => {
      c.after.sourceSha256 = '0'.repeat(64)
    },
    (c) => {
      c.after.history = []
    },
    (c) => {
      c.after.contentReviewStatus = 'content-reviewed'
    },
    (c) => {
      c.after.coreConclusion = NaN
    },
  ]) {
    f.changes[0] = structuredClone(original)
    mutate(f.changes[0])
    assert.throws(
      f.prepare,
      /binding|position differs|fingerprint|immutable|preserved|acceptance|lossy/,
    )
  }
  assert(!existsSync(join(f.directory, reviewDirRelative, '.storage.lock')))
})

test('prepared output tampering, native drift, same-byte symlink and orphan generations cannot write a prefix', (t) => {
  const f = fixture(t),
    plan = f.prepare(),
    manifest = FROZEN_REVIEW_STORAGE_SOURCES[0].path,
    prior = readFileSync(join(f.directory, manifest))
  const output = plan.outputs[0],
    originalOutput = Buffer.from(plan.outputs[0].bytes)
  output.bytes = Buffer.from('{}')
  assert.throws(
    () => publishReviewSemanticDelta(plan, { allowWrite: true }),
    /unmodified semantic prepare/,
  )
  output.bytes = originalOutput
  const fresh = f.prepare(),
    nativePath = f.changes[0].path,
    native = readFileSync(join(f.directory, nativePath))
  f.put(nativePath, Buffer.concat([native, Buffer.from('\n')]))
  assert.throws(() => publishReviewSemanticDelta(fresh, { allowWrite: true }), /input changed/)
  assert(readFileSync(join(f.directory, manifest)).equals(prior))
  f.put(nativePath, native)
  const again = f.prepare(),
    link = join(f.directory, nativePath),
    saved = `${link}.saved`
  renameForTest(link, saved)
  symlinkSync(saved, link)
  assert.throws(() => publishReviewSemanticDelta(again, { allowWrite: true }), /ordinary file/)
  rmSync(link)
  renameForTest(saved, link)
  const partial = f.prepare()
  const future = partial.outputs.find(
    (o) => o.kind === 'shard' && !existsSync(join(f.directory, o.path)),
  )
  assert(future)
  f.put(future.path, future.bytes)
  assert.throws(() => publishReviewSemanticDelta(partial, { allowWrite: true }), /input changed/)
  rmSync(join(f.directory, dirname(future.path)), { recursive: true })
  const protectedOnly = historicalVitestCohort.protectedNative.find(
    (e) => !historicalVitestAdmission(e.path),
  )
  const extraPlan = f.prepare(),
    extraBytes = readFileSync(join(f.directory, protectedOnly.path))
  f.put(protectedOnly.path, Buffer.concat([extraBytes, Buffer.from(' ')]))
  assert.throws(() => publishReviewSemanticDelta(extraPlan, { allowWrite: true }), /input changed/)
  f.put(protectedOnly.path, extraBytes)
  const last = f.prepare(),
    orphan = `${reviewDirRelative}/shards/unknown/foreign/part-001.json`
  f.put(orphan, Buffer.from('{}'))
  assert.throws(() => publishReviewSemanticDelta(last, { allowWrite: true }), /unknown shard stem/)
  assert(readFileSync(join(f.directory, manifest)).equals(prior))
  assert(!existsSync(join(f.directory, reviewDirRelative, '.storage.lock')))
})

function renameForTest(from, to) {
  execFileSync(process.execPath, [
    '-e',
    "require('fs').renameSync(process.argv[1],process.argv[2])",
    from,
    to,
  ])
}

test('a real input change under the publication lock keeps recovery and blocks readers', async (t) => {
  const f = fixture(t),
    plan = f.prepare(),
    lock = join(f.directory, reviewDirRelative, '.storage.lock'),
    input = join(f.directory, f.changes[0].path)
  const watcher = spawn(
    process.execPath,
    [
      '-e',
      `const fs=require('fs');process.stdout.write('ready\\n');const until=Date.now()+5000;while(!fs.existsSync(process.argv[1])&&Date.now()<until){};if(!fs.existsSync(process.argv[1]))process.exit(2);fs.appendFileSync(process.argv[2],' ');`,
      lock,
      input,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  t.after(() => watcher.kill())
  await once(watcher.stdout, 'data')
  assert.throws(
    () => publishReviewSemanticDelta(plan, { allowWrite: true }),
    /lock\+recovery preserved.*input changed/,
  )
  assert(existsSync(lock))
  const held = JSON.parse(readFileSync(lock))
  assert(existsSync(join(held.stage, 'recovery.json')))
  assert.throws(
    () => loadReviewRecords({ root: f.directory, logicalPaths: reviewPaths }),
    /publication lock present/,
  )
  await once(watcher, 'close')
})

test('public Owner CLI defaults to dry-run and refuses publication from a dirty candidate', (t) => {
  const f = fixture(t)
  execFileSync('git', ['update-ref', 'refs/heads/codex/s29-fixture', baseRevision], {
    cwd: f.directory,
  })
  execFileSync('git', ['symbolic-ref', 'HEAD', 'refs/heads/codex/s29-fixture'], {
    cwd: f.directory,
  })
  const planPath = join(f.directory, 'plan.json')
  writeFileSync(
    planPath,
    JSON.stringify({
      schemaVersion: 'native-vitest-semantic-plan/1.0.0',
      baseRevision,
      changesSha256: canonical(f.changes),
      changes: f.changes,
    }),
  )
  const cli = join(root, 'scripts/docs/update-native-vitest-reviews.mjs')
  const before = readFileSync(join(f.directory, reviewPaths[0]))
  const result = JSON.parse(
    execFileSync(process.execPath, [cli, '--plan', planPath], {
      cwd: f.directory,
      encoding: 'utf8',
    }),
  )
  assert.equal(result.mode, 'dry-run')
  assert.equal(result.changedRows, 1)
  assert.equal(result.logicalEntries, 599)
  assert.equal(result.dependencyPins, 9)
  assert.throws(
    () =>
      execFileSync(process.execPath, [cli, '--plan', planPath, '--publish'], {
        cwd: f.directory,
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    (error) => error.stderr.toString().includes('clean committed candidate'),
  )
  assert(readFileSync(join(f.directory, reviewPaths[0])).equals(before))
  assert(!existsSync(join(f.directory, reviewDirRelative, '.storage.lock')))
  publishReviewSemanticDelta(f.prepare(), { allowWrite: true })
  const bytesAfter = readFileSync(join(f.directory, reviewPaths[0]))
  const restarted = JSON.parse(
    execFileSync(process.execPath, [cli, '--plan', planPath, '--publish'], {
      cwd: f.directory,
      encoding: 'utf8',
    }),
  )
  assert.equal(restarted.mode, 'already-published')
  assert.equal(restarted.written, 0)
  assert.equal(restarted.logicalObjectsExact, true)
  assert(readFileSync(join(f.directory, reviewPaths[0])).equals(bytesAfter))
})
