import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  currentDocumentPath,
  documentLocationManifest,
  loadDocumentLocations,
} from './document-location.mjs'
import { checkMigratedDocument } from './document-model.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { loadReviewRecords } from './review-record-storage.mjs'
import {
  assertTestingSourceMaintenance,
  assertTestingSourceMaintenanceOwner,
} from './testing-source-maintenance.mjs'
import { testingSourceMaintenanceAdmissions } from './testing-source-maintenance-admission.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const sourceRevision = 'ca16167540d1f0f2030ebaf126d7533037f8d0b7'
const priorRevision = '43403a826edcaf40509f55b51e6f6214723252ed'
const plugin = 'scripts/e2e/opening-trace-plugin.mjs'
const finding =
  '2026-11-04 source applicability: ca16167540d1f0f2030ebaf126d7533037f8d0b7 only adds s001/e25 to RF001 actor snapshots and updates the existing real projection test fixture/assertion. Older RF001 recordings retain their missing-e25 limitation; do not infer that pose from script bodies or another visit. The Game branch and prior render contract source remain unchanged, so their evidence retains its original bounded applicability. Only the changed plugin file pin is updated; historical candidate/versions, execution numbers, raw artifacts and runtimeExecution=false stay intact. No new RF001 execution is accepted by this document update.'
const catalogNote =
  ' 2026-11-04 source applicability at ca16167540d1f0f2030ebaf126d7533037f8d0b7: RF001 s001 actor snapshots now include e25; older RF001 data cannot prove its first-command pose. The Game observation branch and existing render contracts remain unchanged. This source-pin update accepts no new RF001 runtime, preview or checkpoint result.'
const cases = [
  ['e2e-001', '264934dae710e736bfc01bd8a58c6cde2c4eb32392c2eb80f5a8bd17ca5efb0b'],
  ['e2e-common-issues', 'a958da3c07141ba0cd2f6fda9de19d6d12c211cbe945f181c398ee9e2c0d7c04'],
]
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const gitCache = new Map()
function pinned(path, revision = sourceRevision) {
  const key = `${revision}:${path}`
  if (!gitCache.has(key))
    gitCache.set(
      key,
      execFileSync('git', ['show', key], { cwd: root, maxBuffer: 32 * 1024 * 1024 }),
    )
  return gitCache.get(key)
}
const registry = JSON.parse(
  readFileSync(resolve(root, 'docs/phase-governance/templates/registry.json')),
)
const group = loadReviewRecords({ root })
const originalReviews = JSON.stringify([...group.records])
const locationManifest = JSON.parse(pinned(documentLocationManifest))
const locations = {
  currentPath: currentDocumentPath,
  manifest: locationManifest,
  additions: new Map(locationManifest.additions.map((row) => [row.path, row])),
  changes: new Map(locationManifest.documents.map((row) => [row.path, row])),
}

function fixture([id, expectedSha256] = cases[0]) {
  const path = `docs/testing/e2e/evidence/${id}.json`
  const before = pinned(path, priorRevision)
  const prior = JSON.parse(before)
  const priorPluginSha = prior.sourceRefs.find((ref) => ref.path === plugin).sha256
  const bytes = Buffer.from(
    before
      .toString('utf8')
      .replace(priorPluginSha, hash(pinned(plugin)))
      .replace('"findings": [\n', `"findings": [\n    ${JSON.stringify(finding)},\n`),
  )
  assert.equal(
    hash(bytes),
    expectedSha256,
    'fixture must reconstruct the independently frozen bytes',
  )
  const sources = new Map(prior.sourceRefs.map((ref) => [ref.path, pinned(ref.path)]))
  const doc = {
    path,
    templateId: 'test-machine-evidence-v1',
    variant: 'document-audit-v2',
    historyOverlay: false,
  }
  return { path, before, bytes, sources, doc }
}
function catalogFixture() {
  const admission = testingSourceMaintenanceAdmissions.find(
    (entry) => entry.kind === 'testing-catalog',
  )
  const { path, source, afterSha256 } = admission
  const before = pinned(path, source.revision)
  const prior = JSON.parse(before)
  const entries = prior.entries.filter((entry) => cases.some(([id]) => id === entry.id))
  let text = before.toString('utf8')
  for (const entry of entries) {
    const sha = entry.sourceRefs.find((ref) => ref.path === plugin).sha256
    const start = text.indexOf(`"id": ${JSON.stringify(entry.id)}`)
    assert(start >= 0)
    text =
      text.slice(0, start) +
      text
        .slice(start)
        .replace(sha, hash(pinned(plugin)))
        .replace(
          JSON.stringify(entry.reviewScope),
          JSON.stringify(
            entry.reviewScope + (entry.reviewScope.endsWith('.') ? '' : '.') + catalogNote,
          ),
        )
  }
  const bytes = Buffer.from(text)
  assert.equal(hash(bytes), afterSha256, 'catalog fixture must reproduce the admitted bytes')
  return {
    path,
    before,
    bytes,
    sources: new Map(
      entries.flatMap((entry) => entry.sourceRefs.map((ref) => [ref.path, pinned(ref.path)])),
    ),
    doc: {
      path,
      templateId: 'governance-index-v1',
      variant: 'current-governance-control-native-v1',
      historyOverlay: false,
    },
  }
}
function consume(f, overrides = new Map(), doc = f.doc) {
  const readBuffer = (path) =>
    overrides.get(path) ??
    (path === f.path ? f.bytes : f.sources.get(path)) ??
    readFileSync(resolve(root, path))
  return checkMigratedDocument(doc, registry, (path) => readBuffer(path).toString('utf8'), {
    root,
    readBuffer,
    reviewGroupReader: () => group,
    readSourceBuffer: (pin) => readGitDocumentSnapshot(root, pin),
    locations,
  })
}

function mutate(f, edit) {
  const value = JSON.parse(f.bytes)
  edit(value)
  return new Map([[f.path, Buffer.from(`${JSON.stringify(value, null, 2)}\n`)]])
}

function locationFixture(t) {
  const directory = mkdtempSync('/tmp/type-pal-testing-source-maintenance-')
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const write = (path, bytes) => {
    mkdirSync(dirname(resolve(directory, path)), { recursive: true })
    writeFileSync(resolve(directory, path), bytes)
  }
  const fixtures = [...cases.map(fixture), catalogFixture()]
  for (const f of fixtures) {
    write(f.path, f.before)
    for (const [path, bytes] of f.sources) write(path, bytes)
  }
  const other = 'docs/testing/e2e/evidence/unadmitted.json'
  write(other, '{"runtimeExecution":{"performed":false}}\n')
  const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim()
  git('init', '-q')
  git('add', '.')
  git(
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-qm',
    'fixed originals',
  )
  const baseRevision = git('rev-parse', 'HEAD')
  const manifest = Buffer.from(
    `${JSON.stringify({
      schemaVersion: 1,
      kind: 'document-location-migration',
      baseRevision,
      documents: [],
      additions: [],
      retired: [],
      routing: {
        entry: 'AGENTS.md',
        entrySection: '操作与必读',
        forwardingEntries: [],
        routes: [],
      },
    })}\n`,
  )
  write(documentLocationManifest, manifest)
  for (const f of fixtures) write(f.path, f.bytes)
  return {
    write,
    fixtures,
    other,
    locations: loadDocumentLocations(directory, { baseRevision, manifestSha256: hash(manifest) }),
  }
}

test('the real document consumer accepts admitted source maintenance without changing signed history', () => {
  for (const item of cases) assert.deepEqual(consume(fixture(item)), [])
  assert.deepEqual(consume(catalogFixture()), [])
  assert.equal(JSON.stringify([...group.records]), originalReviews)
})

test('document audits reject new execution, claim/governance edits and replacement of old findings', () => {
  const f = fixture()
  for (const [edit, error] of [
    [
      (v) => {
        v.runtimeExecution.performed = true
      },
      /cannot grant execution/u,
    ],
    [
      (v) => {
        v.claims = ['invented acceptance']
      },
      /fields outside sourceRefs and findings/u,
    ],
    [
      (v) => {
        v._governance.owner = 'Changed'
      },
      /fields outside sourceRefs and findings/u,
    ],
    [
      (v) => {
        v.findings[v.findings.length - 1] = 'rewritten history'
      },
      /exact suffix/u,
    ],
    [
      (v) => {
        v.sourceRefs[0].anchor = 'another anchor'
      },
      /only sourceRefs sha256/u,
    ],
  ])
    assert.match(consume(f, mutate(f, edit)).join('\n'), error)
})

test('catalog maintenance preserves all other entries, governance, claims and old review scopes', () => {
  const f = catalogFixture()
  for (const [edit, error] of [
    [
      (v) => {
        v._governance.runtimeExecutionPerformed = true
      },
      /catalog governance/u,
    ],
    [
      (v) => {
        v.entries[0].status = 'verified'
      },
      /unadmitted catalog entry/u,
    ],
    [
      (v) => {
        v.entries.find((e) => e.id === 'e2e-001').lastVerified = '2026-11-05'
      },
      /catalog fields outside/u,
    ],
    [
      (v) => {
        v.entries.find((e) => e.id === 'e2e-001').reviewScope = 'replacement'
      },
      /exact prefix/u,
    ],
  ])
    assert.match(consume(f, mutate(f, edit)).join('\n'), error)
})

test('an otherwise allowed new prefix is not a new independently admitted candidate', () => {
  const f = fixture()
  assert.match(
    consume(
      f,
      mutate(f, (v) => v.findings.unshift('Another source note')),
    ).join('\n'),
    /candidate bytes are not independently admitted/u,
  )
})

test('actual source bytes are required by both document consumers, independent of declared pins', () => {
  for (const f of [fixture(), catalogFixture()]) {
    const stale = new Map([[plugin, pinned(plugin, priorRevision)]])
    assert.match(consume(f, stale).join('\n'), /source bytes differ/u)
  }
})

test('owner, position, source and variant cannot borrow the exact path admission', () => {
  const f = fixture()
  const a = testingSourceMaintenanceAdmissions[0]
  const original = {
    doc: f.doc,
    row: group.records.get(a.owner).entries[a.index],
    owner: a.owner,
    index: a.index,
    template: registry.types.find((entry) => entry.templateId === f.doc.templateId),
  }
  for (const edit of [
    (v) => {
      v.owner = 'another-owner'
    },
    (v) => {
      v.index += 1
    },
    (v) => {
      v.row.primarySource[0].revision = sourceRevision
    },
    (v) => {
      v.doc.variant = 'execution-v1'
    },
    (v) => {
      v.doc.path = 'docs/testing/e2e/evidence/another.json'
    },
  ]) {
    const candidate = structuredClone(original)
    edit(candidate)
    assert.throws(
      () => assertTestingSourceMaintenanceOwner(candidate),
      /testing source maintenance/u,
    )
  }
  assert.match(
    consume(f, new Map(), { ...f.doc, variant: 'execution-v1' }).join('\n'),
    /template\/variant\/role differs/u,
  )
  assert.throws(
    () =>
      assertTestingSourceMaintenance({
        path: f.path,
        before: Buffer.from('{}'),
        current: f.bytes,
        readBuffer: (path) => f.sources.get(path),
      }),
    /actual original bytes differ/u,
  )
})

test('the actual filesystem location consumer retains old review pins and revalidates sources', (t) => {
  const f = locationFixture(t)
  for (const candidate of f.fixtures) {
    const result = f.locations.assertCurrent(candidate.path, hash(candidate.before))
    assert(result.previous.equals(candidate.before))
    assert(result.current.equals(candidate.bytes))
    assert.throws(
      () => f.locations.assertCurrent(candidate.path, '0'.repeat(64)),
      /historical review\/source drift/u,
    )
  }
  f.locations.assertUnchanged()
  f.write(plugin, pinned(plugin, priorRevision))
  assert.throws(() => f.locations.assertUnchanged(), /source bytes differ/u)
})

test('location admission cannot cover other carriers or unaccepted candidate bytes', (t) => {
  const f = locationFixture(t)
  f.write(f.other, '{"runtimeExecution":{"performed":true}}\n')
  assert.throws(() => f.locations.assertCurrent(f.other), /unreviewed body drift/u)
  const candidate = f.fixtures[0]
  f.write(candidate.path, Buffer.concat([candidate.bytes, Buffer.from('\n')]))
  assert.throws(
    () => f.locations.assertCurrent(candidate.path),
    /candidate bytes are not independently admitted/u,
  )
})
