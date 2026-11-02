import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { before, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { historicalVitestCohort } from './historical-vitest-cohort.mjs'
import { migrateReceiptReviewStorage } from './migrate-receipt-review-storage.mjs'
import {
  inspectReceiptReviewStorage,
  prepareReceiptReviewStorage,
  publishReceiptReviewStorage,
  receiptReadbackPaths,
  receiptReviewSources,
} from './receipt-review-storage-writer.mjs'
import {
  inspectPublishedReviewSemanticDelta,
  prepareReviewSemanticDelta,
} from './review-record-semantic-writer.mjs'
import { loadReviewRecordFromGit, reviewDirRelative } from './review-record-storage.mjs'

const repository = fileURLToPath(new URL('../../', import.meta.url))
const sourceRevision = '32045c93ba9eac481142c06bde35c720592e2272'
const r92 = `${reviewDirRelative}/20261017-r92-phase-governance-artifacts.json`
const r94 = `${reviewDirRelative}/20261017-r94-final-machine-artifacts.json`
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const files = new Map()
const originals = new Map()
const oldPhysical = new Set()
const git = (args, cwd = repository, options = {}) =>
  execFileSync('git', args, {
    cwd,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  })
const fixed = (path) => {
  if (!files.has(path)) files.set(path, git(['cat-file', 'blob', `${sourceRevision}:${path}`]))
  return files.get(path)
}

before(() => {
  assert.deepEqual(
    receiptReviewSources.map((entry) => entry.entryCount),
    [94, 50, 94, 37],
  )
  assert.equal(new Set(receiptReadbackPaths).size, 13)
  for (const path of receiptReadbackPaths) {
    const logical = loadReviewRecordFromGit({
      root: repository,
      revision: sourceRevision,
      logicalPath: path,
    })
    originals.set(path, logical.record)
    fixed(path)
    for (const entry of logical.record.entries) fixed(entry.path)
    if (logical.storage) {
      oldPhysical.add(path)
      for (const descriptor of logical.storage.shards) {
        const physical = `${reviewDirRelative}/${descriptor.path}`
        oldPhysical.add(physical)
        fixed(physical)
      }
    }
  }
  for (const entry of historicalVitestCohort.protectedNative) fixed(entry.path)
  for (const path of ['biome.json', '.gitignore']) fixed(path)
  assert.equal(oldPhysical.size, 31)
  assert.equal(historicalVitestCohort.protectedNative.length, 302)
})

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-receipt-storage-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  git(['init', '-q'], directory)
  const common = git(['rev-parse', '--path-format=absolute', '--git-common-dir']).toString().trim()
  mkdirSync(join(directory, '.git/objects/info'), { recursive: true })
  writeFileSync(join(directory, '.git/objects/info/alternates'), `${join(common, 'objects')}\n`)
  const put = (path, bytes) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), bytes)
  }
  for (const [path, bytes] of files) put(path, bytes)
  return {
    directory,
    put,
    read: (path) => readFileSync(join(directory, path)),
    prepare: (revision = sourceRevision) =>
      prepareReceiptReviewStorage({ root: directory, sourceRevision: revision }),
    inspect: () => inspectReceiptReviewStorage({ root: directory, sourceRevision }),
  }
}

// Deliberately independent of the production loader: rebuild every entry by its position.
function reconstruct(f, path) {
  const parsed = JSON.parse(f.read(path))
  if (!Object.hasOwn(parsed, '_reviewStorage')) return parsed
  const storage = parsed._reviewStorage
  const entries = new Array(storage.totalEntries)
  const positions = new Set()
  for (const descriptor of storage.shards) {
    const bytes = f.read(`${reviewDirRelative}/${descriptor.path}`)
    assert.equal(sha(bytes), descriptor.sha256)
    assert(bytes.length < 512 * 1024)
    const shard = JSON.parse(bytes)
    assert.equal(shard.logicalPath, path)
    assert.equal(shard.generation, storage.logicalSha256)
    assert.equal(shard.key, descriptor.key)
    assert.equal(shard.entries.length, descriptor.total)
    for (let i = 0; i < shard.entries.length; i++) {
      const position = shard.positions[i]
      assert(!positions.has(position), `duplicate independent position: ${path}#${position}`)
      positions.add(position)
      entries[position] = shard.entries[i]
    }
  }
  assert.equal(positions.size, storage.totalEntries)
  assert.equal(sha(JSON.stringify(entries)), storage.orderedEntriesSha256)
  const logical = Object.fromEntries(
    storage.logicalKeys.map((key) => [key, key === 'entries' ? entries : parsed[key]]),
  )
  assert.equal(sha(JSON.stringify(logical)), storage.logicalSha256)
  return logical
}

function inventory(directory) {
  const result = {}
  const walk = (path, prefix = '') => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (!prefix && entry.name === '.git') continue
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(join(path, entry.name), relative)
      else result[relative] = sha(readFileSync(join(path, entry.name)))
    }
  }
  walk(directory)
  return result
}

test('actual four-source transaction independently preserves thirteen objects and all protected carriers', (t) => {
  const f = fixture(t)
  const initial = f.inspect()
  assert.deepEqual(
    Object.fromEntries(
      ['state', 'logicalRecords', 'totalEntries', 'manifestCount', 'shardCount'].map((key) => [
        key,
        initial[key],
      ]),
    ),
    { state: 'original', logicalRecords: 13, totalEntries: 275, manifestCount: 8, shardCount: 23 },
  )
  const handle = f.prepare()
  assert.equal(handle.controlEdges.length, 4)
  assert.throws(() => publishReceiptReviewStorage(handle), /explicit|allowWrite|authoriz/i)
  const result = publishReceiptReviewStorage(handle, { allowWrite: true })
  assert.equal(result.retired, 0)
  assert.equal(result.totalEntries, 275)
  assert.equal(result.lockReleased, true)
  const expected = new Map([...originals].map(([path, value]) => [path, structuredClone(value)]))
  for (const i of [20, 21, 22]) {
    const edge = expected.get(r92).entries[i]
    assert.equal(edge.afterSha256, sha(fixed(edge.path)), 'independent before-pin oracle')
    edge.afterSha256 = sha(f.read(edge.path))
  }
  assert.equal(expected.get(r94).entries[6].path, r92)
  expected.get(r94).entries[6].afterSha256 = sha(f.read(r92))
  for (const path of receiptReadbackPaths) {
    const actual = reconstruct(f, path)
    assert.deepEqual(actual, expected.get(path), path)
    assert.equal(JSON.stringify(actual), JSON.stringify(expected.get(path)), path)
  }
  for (const { path } of receiptReviewSources) {
    const manifest = JSON.parse(f.read(path))
    assert(f.read(path).length < 512 * 1024)
    assert.equal(manifest._reviewStorage.source.revision, sourceRevision)
    assert.equal(manifest._reviewStorage.source.path, path)
    assert.equal(manifest._reviewStorage.source.sha256, sha(fixed(path)))
    assert.equal(
      manifest._reviewStorage.source.gitObject,
      git(['rev-parse', `${sourceRevision}:${path}`])
        .toString()
        .trim(),
    )
  }
  for (const path of oldPhysical) assert(f.read(path).equals(fixed(path)), path)
  for (const { path } of historicalVitestCohort.protectedNative)
    assert(f.read(path).equals(fixed(path)), path)
  const after = f.inspect()
  assert.equal(after.state, 'published')
  assert.equal(after.logicalRecords, 13)
  assert.equal(after.manifestCount, 12)
  assert.equal(after.shardCount, 30)
  const beforeReplay = inventory(f.directory)
  assert.equal(publishReceiptReviewStorage(handle, { allowWrite: true }).idempotent, true)
  assert.deepEqual(inventory(f.directory), beforeReplay)
})

test('real Git source identity and a false R94 before-pin reject before any publication', (t) => {
  const f = fixture(t)
  const before = inventory(f.directory)
  assert.throws(() => f.prepare('0'.repeat(40)), /Git|source|commit|revision/i)
  assert.deepEqual(inventory(f.directory), before)
  const wrong = JSON.parse(f.read(r94))
  wrong.entries[6].afterSha256 = '0'.repeat(64)
  const bytes = Buffer.from(`${JSON.stringify(wrong, null, 2)}\n`)
  f.put(r94, bytes)
  git(['read-tree', sourceRevision], f.directory)
  const blob = git(['hash-object', '-w', '--stdin'], f.directory, { input: bytes })
    .toString()
    .trim()
  git(['update-index', '--cacheinfo', `100644,${blob},${r94}`], f.directory)
  const tree = git(['write-tree'], f.directory).toString().trim()
  const revision = git(['commit-tree', tree, '-p', sourceRevision], f.directory, {
    input: 'Owned false-before-pin fixture\n',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Storage fixture',
      GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
      GIT_COMMITTER_NAME: 'Storage fixture',
      GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
    },
  })
    .toString()
    .trim()
  const falsePinState = inventory(f.directory)
  assert.throws(() => f.prepare(revision), /before pin mismatch/)
  assert.deepEqual(inventory(f.directory), falsePinState)
  assert(!existsSync(join(f.directory, reviewDirRelative, '.storage.lock')))
})

test('captured input changes and forged handles cannot write a valid prefix', (t) => {
  const f = fixture(t)
  const handle = f.prepare()
  assert.throws(
    () => publishReceiptReviewStorage({ ...handle }, { allowWrite: true }),
    /handle|prepare|plan/i,
  )
  const native = historicalVitestCohort.protectedNative[0].path
  f.put(native, Buffer.concat([f.read(native), Buffer.from('\n')]))
  const before = inventory(f.directory)
  assert.throws(
    () => publishReceiptReviewStorage(handle, { allowWrite: true }),
    /changed|drift|input/i,
  )
  assert.deepEqual(inventory(f.directory), before)
  assert(!existsSync(join(f.directory, reviewDirRelative, '.storage.lock')))
})

test('unknown owners and incomplete published generations are rejected without repair writes', (t) => {
  const f = fixture(t)
  const foreign = `${reviewDirRelative}/shards/unknown-owner/unknown-generation/part-001.json`
  f.put(foreign, Buffer.from('{}'))
  const withForeign = inventory(f.directory)
  assert.throws(f.prepare, /unknown|orphan|owner|inventory/i)
  assert.deepEqual(inventory(f.directory), withForeign)
  rmSync(join(f.directory, reviewDirRelative, 'shards/unknown-owner'), { recursive: true })
  const handle = f.prepare()
  const oldManifest = [...oldPhysical].find((path) => !path.includes('/shards/'))
  const existingShard = JSON.parse(f.read(oldManifest))._reviewStorage.shards[0].path
  const sibling = join(dirname(dirname(existingShard)), 'unknown-generation', 'part-001.json')
  f.put(`${reviewDirRelative}/${sibling}`, Buffer.from('{}'))
  const withSibling = inventory(f.directory)
  assert.throws(
    () => publishReceiptReviewStorage(handle, { allowWrite: true }),
    /unknown sibling generation|input changed|inventory|generation/i,
  )
  assert.deepEqual(inventory(f.directory), withSibling)
  rmSync(join(f.directory, reviewDirRelative, dirname(sibling)), { recursive: true })
  publishReceiptReviewStorage(f.prepare(), { allowWrite: true })
  const source = receiptReviewSources[0].path
  const descriptor = JSON.parse(f.read(source))._reviewStorage.shards[0]
  rmSync(join(f.directory, reviewDirRelative, descriptor.path))
  const missing = inventory(f.directory)
  assert.throws(f.inspect, /missing|set differs|ENOENT|shard/i)
  assert.deepEqual(inventory(f.directory), missing)
})

test('public CLI is read-only by default and legacy ten-source inspection refuses the new owner set', (t) => {
  const f = fixture(t)
  const before = inventory(f.directory)
  const dry = migrateReceiptReviewStorage(['--source-revision', sourceRevision], f.directory)
  assert.equal(dry.mode, 'dry-run')
  assert.deepEqual(inventory(f.directory), before)
  publishReceiptReviewStorage(f.prepare(), { allowWrite: true })
  const published = inventory(f.directory)
  const binding = historicalVitestCohort.entries[0]
  const changes = [
    {
      path: binding.path,
      reviewRecord: binding.reviewRecord,
      index: binding.reviewIndex,
      beforeEntrySha256: binding.beforeEntrySha256,
      after: originals.get(binding.reviewRecord).entries[binding.reviewIndex],
    },
  ]
  const legacyRequest = {
    root: f.directory,
    baseRevision: sourceRevision,
    changes,
    changesSha256: sha(JSON.stringify(changes)),
  }
  assert.throws(
    () => inspectPublishedReviewSemanticDelta(legacyRequest),
    /unexpected sharded owner|ten-source|flat R92\/R94|legacy/i,
  )
  assert.throws(
    () => prepareReviewSemanticDelta(legacyRequest),
    /unexpected sharded owner|ten-source|flat R92\/R94|legacy/i,
  )
  assert.deepEqual(inventory(f.directory), published)
})

test('a real rename failure under lock retains recovery and all five before-images', (t) => {
  const f = fixture(t)
  const module = pathToFileURL(join(repository, 'scripts/docs/receipt-review-storage-writer.mjs'))
  const target = join(f.directory, receiptReviewSources[0].path)
  const code = `
    import fs from 'node:fs';
    import {syncBuiltinESMExports} from 'node:module';
    const rename=fs.renameSync;
    fs.renameSync=(from,to)=>{if(to===process.argv[2])throw new Error('owned rename failure');return rename(from,to)};
    syncBuiltinESMExports();
    const {prepareReceiptReviewStorage,publishReceiptReviewStorage}=await import(${JSON.stringify(module.href)});
    const handle=prepareReceiptReviewStorage({root:process.argv[1],sourceRevision:${JSON.stringify(sourceRevision)}});
    try {publishReceiptReviewStorage(handle,{allowWrite:true});process.exitCode=2}
    catch(error){process.stdout.write(error.message)};
  `
  const error = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', code, f.directory, target],
    {
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    },
  )
  assert.match(error, /owned rename failure/)
  assert.match(error, /lock\+recovery preserved/)
  assert(existsSync(join(f.directory, reviewDirRelative, '.storage.lock')))
  const stage = error.match(/preserved at ([^)]+)\)/)?.[1]
  assert(stage, error)
  assert(existsSync(join(stage, 'recovery.json')))
  for (const path of [...receiptReviewSources.map((entry) => entry.path), r92]) {
    assert(f.read(path).equals(fixed(path)), path)
    assert(readFileSync(join(stage, 'before', path)).equals(fixed(path)), path)
  }
  assert.throws(f.inspect, /lock/i)
})
