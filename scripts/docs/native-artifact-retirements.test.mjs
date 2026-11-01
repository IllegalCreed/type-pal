import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { inspectCurrentNativeControl } from './current-native-control.mjs'
import { loadDocumentRegistry } from './document-registry.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { incrementalControlProjection } from './incremental-control-view.mjs'
import {
  nativeRetirementContract as contract,
  inspectNativeArtifactRetirements,
  readNativeArtifactRetirements,
} from './native-artifact-retirements.mjs'
import { loadReviewRecordFromGit, loadReviewRecords } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const registry = loadDocumentRegistry({
  manifestPath: join(root, 'docs/phase-governance/document-registry.json'),
}).registry
const group = loadReviewRecords({ root })
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const prefix = 'docs/ops/evidence/'
const pairPaths = [
  ['CODE-QUALITY-88/mutation-raw/mutation-results.json', 'CODE-QUALITY-88/mutation-results.json'],
  ['CODE-QUALITY-89/mutation-raw/mutation-results.json', 'CODE-QUALITY-89/mutation-results.json'],
  [
    'CODE-QUALITY-90/mutation-raw-legal-script-id/mutation-results.json',
    'CODE-QUALITY-90/mutation-legal-script-id-result.json',
  ],
  ['CODE-QUALITY-90/mutation-raw/mutation-results.json', 'CODE-QUALITY-90/mutation-results.json'],
  ['CODE-QUALITY-91/mutation-raw/mutation-results.json', 'CODE-QUALITY-91/mutation-results.json'],
  [
    'QUALITY-PRE94-RETROSPECTIVE-1/3h/fetch-retry/initial-real-abort-proof.json',
    'QUALITY-PRE94-RETROSPECTIVE-1/3h/fetch-retry/real-abort-proof.json',
  ],
].map((pair) => pair.map((path) => prefix + path))
const snapshots = new Map(
  pairPaths
    .flat()
    .map((path) => [
      path,
      readGitDocumentSnapshot(root, { path, revision: contract.sourceRevision }),
    ]),
)

function fixture() {
  const value = structuredClone(registry)
  const entries = pairPaths.map(([path, replacement]) => {
    const a = snapshots.get(path),
      b = snapshots.get(replacement)
    assert.ok(a.buffer.equals(b.buffer))
    return {
      path,
      replacement,
      sha256: hash(a.buffer),
      bytes: a.buffer.length,
      sourceGitObject: a.gitObject,
      replacementGitObject: b.gitObject,
    }
  })
  value.nativeArtifactRetirements = {
    schemaVersion: 1,
    contract: contract.id,
    sourceRevision: contract.sourceRevision,
    authorization: { task: contract.task, section: contract.section },
    retiredOn: '2026-11-01',
    entries,
    semantics:
      'Registered identities and original review claims remain historical provenance; only the replacement is an active carrier. Retirement grants no semantic, migration or runtime credit.',
  }
  const routing = JSON.parse(readFileSync(join(root, 'docs/phase-governance/routing.json')))
  const paths = new Set(entries.map((entry) => entry.path))
  routing.migratedDocuments = routing.migratedDocuments.filter((entry) => !paths.has(entry.path))
  const files = new Map(
    entries.map((entry) => [entry.replacement, snapshots.get(entry.replacement).buffer]),
  )
  files.set(
    contract.task,
    Buffer.from(`# Task\n\n### ${contract.section}\n\nUser-approved actual retirement.\n`),
  )
  const options = {
    readBuffer: (path) =>
      path === 'docs/phase-governance/routing.json'
        ? Buffer.from(JSON.stringify(routing))
        : files.get(path),
    present: (path) => files.has(path),
    readSourceBuffer: ({ path, revision }) =>
      revision === contract.sourceRevision ? snapshots.get(path) : undefined,
    reviewReader: (path) => group.records.get(path),
  }
  return {
    value,
    routing,
    files,
    options,
    inspect: () => inspectNativeArtifactRetirements(value, options),
  }
}

test('six independently pinned duplicate blobs retire without changing review claims or the 1838 cohort', () => {
  const f = fixture(),
    before = JSON.stringify(f.value)
  const result = f.inspect()
  assert.deepEqual(result.issues, [])
  assert.equal(result.entries.length, 6)
  assert.equal(
    result.entries.reduce((sum, entry) => sum + entry.bytes, 0),
    114432,
  )
  assert.equal(JSON.stringify(f.value), before)
  assert.deepEqual(f.value.documentRetirements, registry.documentRetirements)
  assert.deepEqual(inspectNativeArtifactRetirements({ entries: [] }, {}), {
    entries: [],
    issues: [],
  })
})

test('retirement projection names the frozen contract; unchanged registry parts retain their acceptance scope', () => {
  const f = fixture()
  const frozenGroup = {
    records: new Map(
      [...group.records.keys()].map((logicalPath) => [
        logicalPath,
        loadReviewRecordFromGit({
          root,
          revision: '737b7cb58fc8a131b92df92aae23516bc0072e06',
          logicalPath,
        }).record,
      ]),
    ),
  }
  const { entries: _entries, ...manifest } = f.value
  const retired = new Set(pairPaths.map(([path]) => path))
  const readBuffer = (path) => {
    if (retired.has(path)) return undefined
    if (path === 'docs/phase-governance/document-registry.json')
      return Buffer.from(JSON.stringify(manifest))
    return f.options.readBuffer(path) ?? readFileSync(join(root, path))
  }
  const options = {
    readBuffer,
    readSourceBuffer: (pin) => readGitDocumentSnapshot(root, pin),
    reviewGroupReader: () => frozenGroup,
  }
  const projected = incrementalControlProjection(
    'docs/phase-governance/document-registry.json',
    options,
    inspectCurrentNativeControl,
  )
  assert.equal(projected.retirementContract, contract.id)
  assert.equal(projected.kind, 'accepted-native-retirement-control-projection/1.0.0')
  const unchanged = incrementalControlProjection(
    'docs/phase-governance/document-registry.lore.json',
    options,
    inspectCurrentNativeControl,
  )
  assert.equal(unchanged.kind, 'accepted-incremental-control-projection/1.0.0')
  assert.equal(unchanged.retirementContract, undefined)
})

test('the same validator rejects another scope, forged Git identity and unapproved credit', () => {
  for (const mutate of [
    (f) => f.value.nativeArtifactRetirements.entries.pop(),
    (f) => {
      f.value.nativeArtifactRetirements.entries[0].replacement = pairPaths[1][1]
    },
    (f) => {
      f.options.readSourceBuffer = () => ({
        ...snapshots.get(pairPaths[0][0]),
        gitObject: '0'.repeat(40),
      })
    },
    (f) => {
      f.value.nativeArtifactRetirements.runtimeCredit = true
    },
    (f) => f.files.delete(contract.task),
  ]) {
    const f = fixture()
    mutate(f)
    const result = f.inspect()
    assert.equal(result.entries.length, 0)
    assert.equal(result.issues.length, 1)
  }
})

test('missing or changed canonical bytes and reappeared retired carriers fail closed', () => {
  for (const mutate of [
    (f) => f.files.delete(pairPaths[0][1]),
    (f) => f.files.set(pairPaths[0][1], Buffer.from('{}\n')),
    (f) => f.files.set(pairPaths[0][0], snapshots.get(pairPaths[0][0]).buffer),
  ]) {
    const f = fixture()
    mutate(f)
    const result = f.inspect()
    assert.equal(result.entries.length, 0)
    assert.match(result.issues[0], /replacement bytes differ|reappeared/)
  }
})

test('active old routes, missing replacement routes and altered historic after pins are rejected', () => {
  for (const mutate of [
    (f) => f.routing.migratedDocuments.push({ path: pairPaths[0][0] }),
    (f) => {
      f.routing.migratedDocuments = f.routing.migratedDocuments.filter(
        (row) => row.path !== pairPaths[0][1],
      )
    },
    (f) => {
      f.options.reviewReader = () => ({ entries: [] })
    },
  ]) {
    const f = fixture()
    mutate(f)
    assert.equal(f.inspect().entries.length, 0)
    assert.match(f.inspect().issues[0], /route not redirected|original review pin/)
  }
})

test('filesystem consumer accepts real Git pins and rejects dangling leaves or symlink parents', (t) => {
  const f = fixture(),
    scratch = mkdtempSync(join(tmpdir(), 'native-carrier-retirement-'))
  t.after(() => rmSync(scratch, { recursive: true, force: true }))
  const write = (path, bytes) => {
    mkdirSync(dirname(join(scratch, path)), { recursive: true })
    writeFileSync(join(scratch, path), bytes)
  }
  // Only cat-file/ls-tree reads use this Git identity. No Git writer is invoked.
  write('.git', readFileSync(join(root, '.git')))
  for (const [path, bytes] of f.files) write(path, bytes)
  write('docs/phase-governance/routing.json', JSON.stringify(f.routing))
  assert.deepEqual(readNativeArtifactRetirements(scratch, f.value, group).issues, [])
  const retired = pairPaths[0][0]
  mkdirSync(dirname(join(scratch, retired)), { recursive: true })
  symlinkSync('missing.json', join(scratch, retired))
  assert.match(
    readNativeArtifactRetirements(scratch, f.value, group).issues[0],
    /non-ordinary path/,
  )
  rmSync(join(scratch, retired))
  const canonical = pairPaths[0][1],
    parent = dirname(join(scratch, canonical))
  const moved = `${parent}-outside`
  mkdirSync(moved)
  writeFileSync(join(moved, 'mutation-results.json'), snapshots.get(canonical).buffer)
  rmSync(parent, { recursive: true })
  symlinkSync(moved, parent)
  assert.match(
    readNativeArtifactRetirements(scratch, f.value, group).issues[0],
    /non-ordinary path/,
  )
})
