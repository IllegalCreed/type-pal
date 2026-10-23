import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { saveDocumentRegistryFixture } from './document-registry.test-support.mjs'
import { frozenDocumentBaseline } from './frozen-document-source.mjs'
import {
  assertReviewRecordSourceUnchanged,
  loadReviewRecord,
  loadReviewRecordFromGit,
  materializeReviewRecord,
  reviewDirRelative,
} from './review-record-storage.mjs'
import { buildSmallShardedRecord } from './review-record-storage.test-support.mjs'
import {
  FROZEN_REVIEW_SOURCE_REVISION,
  FROZEN_REVIEW_STORAGE_SOURCES,
} from './review-record-storage-writer.mjs'

const root = fileURLToPath(new URL('../..', import.meta.url)),
  sha = (b) => createHash('sha256').update(b).digest('hex')
const git = (dir, ...args) =>
  execFileSync('git', ['-C', dir, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    .toString()
    .trim()
function fixture() {
  const dir = fs.mkdtempSync(join(tmpdir(), 'rrs-owner-reader-')),
    built = buildSmallShardedRecord(3)
  const write = (path, bytes) => {
    fs.mkdirSync(dirname(join(dir, path)), { recursive: true })
    fs.writeFileSync(join(dir, path), bytes)
  }
  git(dir, 'init', '-q')
  write(built.logicalPath, Buffer.from(JSON.stringify(built.logical)))
  git(dir, 'add', 'docs')
  git(
    dir,
    '-c',
    'user.name=fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-qm',
    'original flat',
  )
  const revision = git(dir, 'rev-parse', 'HEAD'),
    gitObject = git(dir, 'rev-parse', `HEAD:${built.logicalPath}`)
  for (const [path, bytes] of built.files) {
    if (path !== built.logicalPath) write(path, bytes)
    else {
      const manifest = JSON.parse(bytes)
      manifest._reviewStorage.source = {
        revision,
        path,
        gitObject,
        sha256: sha(fs.readFileSync(join(dir, path))),
      }
      write(path, Buffer.from(JSON.stringify(manifest)))
    }
  }
  return {
    dir,
    built,
    write,
    close: () => fs.rmSync(dir, { recursive: true, force: true }),
    readBuffer: (p) => fs.readFileSync(join(dir, p)),
  }
}

test('pure materialization and protected real-Git fixture preserve object/order and report exact artifact facts', () => {
  const f = fixture()
  try {
    assert.deepStrictEqual(materializeReviewRecord(f.built.logicalPath, f).record, f.built.logical)
    const loaded = loadReviewRecord({ root: f.dir, logicalPath: f.built.logicalPath })
    assert.deepStrictEqual(loaded.record, f.built.logical)
    assert.equal(JSON.stringify(loaded.record), JSON.stringify(f.built.logical))
    for (const artifact of loaded.loadedSource.artifactSet) {
      assert.equal(artifact.sha256, sha(f.readBuffer(artifact.path)))
      assert.equal(artifact.bytes, f.readBuffer(artifact.path).length)
      assert.equal(artifact.caller, f.built.logicalPath)
      assert.equal(artifact.credit, 0)
      assert.deepEqual(artifact.positions, JSON.parse(f.readBuffer(artifact.path)).positions)
    }
    assertReviewRecordSourceUnchanged(loaded.loadedSource)
    assert.throws(
      () => assertReviewRecordSourceUnchanged({ ...loaded.loadedSource }),
      /actual protected read snapshot/,
    )
  } finally {
    f.close()
  }
})

test('saved original shard bytes cannot be substituted between materialization and final verification', () => {
  const f = fixture(),
    path = f.built.files.find(([p]) => p.includes('part-'))[0],
    absolute = join(f.dir, path),
    original = fs.readFileSync
  let calls = 0
  try {
    fs.readFileSync = function (file, ...args) {
      if (String(file) === absolute && ++calls === 2) {
        const value = JSON.parse(original(absolute))
        value.entries[0].path = 'docs/substituted.md'
        fs.writeFileSync(absolute, JSON.stringify(value))
      }
      return original.call(this, file, ...args)
    }
    syncBuiltinESMExports()
    assert.throws(
      () => loadReviewRecord({ root: f.dir, logicalPath: f.built.logicalPath }),
      /input bytes or identity changed/,
    )
    assert.equal(calls, 2)
  } finally {
    fs.readFileSync = original
    syncBuiltinESMExports()
    f.close()
  }
})

test('same-byte symlink leaf and parent are rejected by production reader, not by a checksum accident', () => {
  for (const parent of [false, true]) {
    const f = fixture(),
      shard = f.built.files.find(([p]) => p.includes('part-'))[0],
      path = parent ? dirname(join(f.dir, shard)) : join(f.dir, shard),
      backup = join(f.dir, 'owned-backup')
    try {
      fs.renameSync(path, backup)
      fs.symlinkSync(backup, path, parent ? 'dir' : 'file')
      assert.throws(
        () => loadReviewRecord({ root: f.dir, logicalPath: f.built.logicalPath }),
        /ordinary file|ordinary directory/,
      )
    } finally {
      f.close()
    }
  }
})

test('whole inventory rejects unknown stem and orphan even when active generation is otherwise valid', () => {
  for (const kind of ['stem', 'orphan']) {
    const f = fixture(),
      shard = f.built.files.find(([p]) => p.includes('part-'))[0]
    try {
      const path =
        kind === 'stem'
          ? `${reviewDirRelative}/shards/unowned/file.json`
          : `${dirname(shard)}/part-999.json`
      f.write(path, Buffer.from('{}'))
      assert.throws(
        () => loadReviewRecord({ root: f.dir, logicalPath: f.built.logicalPath }),
        /unknown shard stem|orphan shard/,
      )
    } finally {
      f.close()
    }
  }
})

test('descriptor filename binding and original Git pin have actual production rejection oracles', () => {
  for (const kind of ['filename', 'original-pin', 'key-order']) {
    const f = fixture()
    try {
      let manifest = JSON.parse(f.readBuffer(f.built.logicalPath))
      if (kind === 'filename') {
        const descriptor = manifest._reviewStorage.shards[0],
          old = descriptor.path
        descriptor.path = old.replace('part-001.json', 'other.json')
        f.write(
          `${reviewDirRelative}/${descriptor.path}`,
          f.readBuffer(`${reviewDirRelative}/${old}`),
        )
      } else if (kind === 'original-pin') manifest._reviewStorage.source.gitObject = '1'.repeat(40)
      else {
        const { schemaVersion, ...rest } = manifest
        manifest = { ...rest, schemaVersion }
      }
      f.write(f.built.logicalPath, Buffer.from(JSON.stringify(manifest)))
      assert.throws(
        () => loadReviewRecord({ root: f.dir, logicalPath: f.built.logicalPath }),
        /shard path outside|source pin mismatch|top-level keys/,
      )
    } finally {
      f.close()
    }
  }
})

test('returned snapshot rechecks both changed bytes and a later lock', () => {
  const f = fixture()
  try {
    const loaded = loadReviewRecord({ root: f.dir, logicalPath: f.built.logicalPath })
    const lock = `${reviewDirRelative}/.storage.lock`
    f.write(lock, Buffer.from('owned test lock'))
    assert.throws(() => assertReviewRecordSourceUnchanged(loaded.loadedSource), /lock present/)
    fs.rmSync(join(f.dir, lock))
    const shard = f.built.files.find(([p]) => p.includes('part-'))[0]
    f.write(shard, Buffer.from('{}'))
    assert.throws(
      () => assertReviewRecordSourceUnchanged(loaded.loadedSource),
      /input bytes or identity changed/,
    )
  } finally {
    f.close()
  }
})

test('Git uses the declared commit for every shard, even when a missing committed shard is live in worktree', () => {
  const f = fixture()
  try {
    git(f.dir, 'add', 'docs')
    git(
      f.dir,
      '-c',
      'user.name=fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-qm',
      'manifest',
    )
    const revision = git(f.dir, 'rev-parse', 'HEAD')
    assert.deepStrictEqual(
      loadReviewRecordFromGit({ root: f.dir, revision, logicalPath: f.built.logicalPath }).record,
      f.built.logical,
    )
    const shard = f.built.files.find(([p]) => p.includes('part-'))[0]
    git(f.dir, 'rm', '--cached', '--', shard)
    git(
      f.dir,
      '-c',
      'user.name=fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-qm',
      'missing shard',
    )
    assert.ok(fs.existsSync(join(f.dir, shard)))
    assert.throws(
      () =>
        loadReviewRecordFromGit({
          root: f.dir,
          revision: git(f.dir, 'rev-parse', 'HEAD'),
          logicalPath: f.built.logicalPath,
        }),
      /Git review missing/,
    )
  } finally {
    f.close()
  }
})

test('progress lists only verified physical artifacts; ordinary JSON stays pending and an orphan blocks the census', () => {
  const f = fixture()
  try {
    const common = git(root, 'rev-parse', '--path-format=absolute', '--git-common-dir')
    f.write('.git/objects/info/alternates', Buffer.from(`${join(common, 'objects')}\n`))
    fs.mkdirSync(join(f.dir, 'scripts/docs'), { recursive: true })
    for (const name of fs.readdirSync(join(root, 'scripts/docs')))
      if (name.endsWith('.mjs') && !name.includes('.test'))
        fs.copyFileSync(join(root, 'scripts/docs', name), join(f.dir, 'scripts/docs', name))
    f.write(frozenDocumentBaseline.path, fs.readFileSync(join(root, frozenDocumentBaseline.path)))
    f.write('AGENTS.md', Buffer.from('# Fixture\n\n## Routes\n'))
    f.write(
      'docs/phase-governance/routing.json',
      Buffer.from(
        JSON.stringify({
          entry: 'AGENTS.md',
          entrySection: 'Routes',
          routes: [],
          forwardingEntries: [],
          migratedDocuments: [],
        }),
      ),
    )
    f.write(
      'docs/phase-governance/templates/registry.json',
      fs.readFileSync(join(root, 'docs/phase-governance/templates/registry.json')),
    )
    saveDocumentRegistryFixture(f.dir, [])
    const run = () =>
      execFileSync(process.execPath, ['scripts/docs/report-governance-progress.mjs', '--json'], {
        cwd: f.dir,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    const initial = JSON.parse(run())
    const artifacts = loadReviewRecord({ root: f.dir, logicalPath: f.built.logicalPath })
      .loadedSource.artifactSet
    assert.deepStrictEqual(initial.reviewStorageArtifacts, artifacts)
    const raw = git(
      f.dir,
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '-z',
      'docs',
    ).split('\0')
    const candidates = new Set(raw.filter((p) => /\.(md|json|html)$/.test(p)))
    assert.equal(initial.currentCandidates, candidates.size - artifacts.length)
    assert.equal(initial.currentPending, initial.currentCandidates)
    assert.equal(initial.approvedCohort, 1838)
    assert.equal(initial.cohortMigrated, 0)
    assert.deepEqual(initial.issues, [])
    f.write('docs/ordinary.json', Buffer.from('{}'))
    const ordinary = JSON.parse(run())
    assert.equal(ordinary.currentPending, initial.currentPending + 1)
    assert.deepStrictEqual(ordinary.reviewStorageArtifacts, artifacts)
    f.write(`${dirname(artifacts[0].path)}/part-999.json`, Buffer.from('{}'))
    assert.throws(run, (error) => {
      assert.match(error.stderr.toString(), /review-record-storage: orphan shard:/)
      return true
    })
  } finally {
    f.close()
  }
})

test('flat marker text is ordinary data; CLI dry-run derives the real fixed group without publishing', () => {
  const f = fixture()
  try {
    f.write(
      f.built.logicalPath,
      Buffer.from(JSON.stringify({ entries: [], note: '_reviewStorage literal text' })),
    )
    fs.rmSync(join(f.dir, reviewDirRelative, 'shards'), { recursive: true, force: true })
    assert.equal(loadReviewRecord({ root: f.dir, logicalPath: f.built.logicalPath }).storage, null)
    // This S28 contract runs against its fixed original source in an owned tree;
    // later central semantic updates are not the initial flat migration fixture.
    fs.cpSync(join(root, 'scripts/docs'), join(f.dir, 'scripts/docs'), { recursive: true })
    fs.symlinkSync(join(root, 'node_modules'), join(f.dir, 'node_modules'), 'dir')
    const common = git(root, 'rev-parse', '--path-format=absolute', '--git-common-dir')
    f.write('.git/objects/info/alternates', Buffer.from(`${join(common, 'objects')}\n`))
    for (const path of [
      ...FROZEN_REVIEW_STORAGE_SOURCES.map((entry) => entry.path),
      `${reviewDirRelative}/20261017-r92-phase-governance-artifacts.json`,
      `${reviewDirRelative}/20261017-r94-final-machine-artifacts.json`,
    ])
      f.write(
        path,
        execFileSync(
          'git',
          ['-C', root, 'cat-file', 'blob', `${FROZEN_REVIEW_SOURCE_REVISION}:${path}`],
          {
            maxBuffer: 16 * 1024 * 1024,
          },
        ),
      )
    for (const path of ['biome.json', '.gitignore'])
      f.write(path, fs.readFileSync(join(root, path)))
    const result = JSON.parse(
      execFileSync('node', [join(f.dir, 'scripts/docs/migrate-review-record-storage.mjs')], {
        env: { ...process.env, RAYON_NUM_THREADS: '1' },
      }),
    )
    assert.equal(result.mode, 'dry-run')
    assert.equal(result.manifests, 8)
    assert.equal(result.shards, 19)
    assert.equal(result.totalEntries, 599)
  } finally {
    f.close()
  }
})
