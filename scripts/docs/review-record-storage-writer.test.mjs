import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkMigratedDocument } from './document-model.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { readGitDocumentSource } from './git-document-source.mjs'
import { historicalVitestContract, historicalVitestPilots } from './historical-vitest-native.mjs'
import { loadReviewRecord } from './review-record-storage.mjs'
import {
  FROZEN_REVIEW_SOURCE_REVISION,
  FROZEN_REVIEW_STORAGE_SOURCES,
  prepareReviewStorageGroup,
  publishReviewStorageGroup,
} from './review-record-storage-writer.mjs'

const root = fileURLToPath(new URL('../..', import.meta.url)),
  sha = (b) => createHash('sha256').update(b).digest('hex')
const r92 = 'docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json'
const r94 = 'docs/phase-governance/reviews/20261017-r94-final-machine-artifacts.json'
const read = (p, at = root) => readFileSync(join(at, p))
const sourceSnapshot = (pin) => readGitDocumentSnapshot(root, pin)
const group = (at = root) => ({
  records: FROZEN_REVIEW_STORAGE_SOURCES.map((r) => ({
    ...r,
    beforeSHA256: sha(read(r.path, at)),
    sourceRevision: FROZEN_REVIEW_SOURCE_REVISION,
  })),
  r92Buffer: read(r92, at),
  r94Buffer: read(r94, at),
  readBuffer: (p) => read(p, at),
  context: { repoRoot: at },
})
let prepared
before(() => {
  prepared = prepareReviewStorageGroup(group())
})
const temp = () => mkdtempSync(join(tmpdir(), 'rrs-owner-writer-'))
const publish = (dir) => publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: read })
const files = (dir) => {
  const result = {}
  const walk = (p) => {
    for (const entry of readdirSync(p, { withFileTypes: true })) {
      const path = join(p, entry.name)
      if (entry.isDirectory()) walk(path)
      else result[path.slice(dir.length)] = sha(readFileSync(path))
    }
  }
  walk(dir)
  return result
}
function cleanupRecovery(error) {
  const stage = error.message.match(/lock\+staging preserved at ([^)]+)/)?.[1]
  assert.ok(stage, 'failure must identify recovery staging')
  const recovery = JSON.parse(readFileSync(join(stage, 'recovery.json')))
  assert.deepEqual(recovery.written, [])
  rmSync(stage, { recursive: true, force: true })
}

test('prepare deterministic; actual publish preserves eight full JSON objects and nine independent byte pins', () => {
  const second = prepareReviewStorageGroup(group())
  assert.deepEqual(prepared.outputs, second.outputs)
  const dir = temp()
  try {
    assert.deepEqual(publish(dir), {
      written: 29,
      lockReleased: true,
      totalEntries: 599,
      edgeCount: 9,
    })
    for (const { path } of FROZEN_REVIEW_STORAGE_SOURCES) {
      const original = JSON.parse(read(path)),
        actual = loadReviewRecord({
          root: dir,
          logicalPath: path,
          readSourceSnapshot: sourceSnapshot,
        }).record
      assert.deepStrictEqual(actual, original)
      assert.equal(JSON.stringify(actual), JSON.stringify(original))
    }
    const a = JSON.parse(read(r92, dir)),
      b = JSON.parse(read(r94, dir))
    for (const i of [4, 5, 6, 7, 16, 17, 18, 19])
      assert.equal(a.entries[i].afterSha256, sha(read(a.entries[i].path, dir)))
    assert.equal(b.entries[6].afterSha256, sha(read(r92, dir)))
    const prior = files(dir)
    publish(dir)
    assert.deepEqual(files(dir), prior)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('original before-state copy migrates; foreign target refuses without writing a valid prefix', () => {
  const dir = temp()
  try {
    for (const path of Object.keys(prepared.expectedSourceSnapshot)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true })
      writeFileSync(join(dir, path), read(path))
    }
    const first = prepared.outputs.find((o) => o.kind === 'manifest').path
    writeFileSync(join(dir, first), 'foreign target')
    const before = files(dir)
    assert.throws(() => publish(dir), /target has foreign bytes/)
    assert.deepEqual(files(dir), before)
    writeFileSync(join(dir, first), read(first))
    assert.equal(publish(dir).totalEntries, 599)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('actual prepared plan rejects extra shard/review and substituted ten-key snapshot before any filesystem write', () => {
  for (const kind of ['shard', 'review', 'source-set']) {
    const dir = temp(),
      snapshot = prepared.expectedSourceSnapshot
    try {
      if (kind === 'source-set') prepared.expectedSourceSnapshot = { ...snapshot, [r94]: undefined }
      else
        prepared.outputs.push({
          kind,
          path: 'docs/phase-governance/reviews/shards/foreign/x/part-001.json',
          bytes: Buffer.from('{}'),
        })
      assert.throws(() => publish(dir), /source set changed|complete prepared output set changed/)
      assert.deepEqual(files(dir), {})
    } finally {
      if (kind !== 'source-set') prepared.outputs.pop()
      prepared.expectedSourceSnapshot = snapshot
      rmSync(dir, { recursive: true, force: true })
    }
  }
})

test('whole physical inventory rejects unknown stem, sibling with active generation, and orphan without overwriting', () => {
  for (const variant of ['stem', 'sibling', 'orphan']) {
    const dir = temp()
    try {
      publish(dir)
      const shard = prepared.outputs.find((o) => o.kind === 'shard').path
      const foreign =
        variant === 'stem'
          ? join(dir, 'docs/phase-governance/reviews/shards/unknown/part.json')
          : variant === 'sibling'
            ? join(dirname(dirname(join(dir, shard))), 'unknown-generation/part.json')
            : join(dirname(join(dir, shard)), 'part-999.json')
      mkdirSync(dirname(foreign), { recursive: true })
      writeFileSync(foreign, 'unowned bytes')
      const before = files(dir)
      assert.throws(
        () => publish(dir),
        /unknown shard stem|unknown sibling generation|immutable generation file set/,
      )
      assert.deepEqual(files(dir), before)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }
})

test('target changed under lock is preserved, with lock/recovery and zero placed prefix', () => {
  const dir = temp(),
    path = prepared.outputs.find((o) => o.kind === 'manifest').path
  let reads = 0
  try {
    const reader = (p) => {
      if (p === r94 && ++reads === 2) {
        mkdirSync(dirname(join(dir, path)), { recursive: true })
        writeFileSync(join(dir, path), 'appeared under lock')
      }
      return read(p)
    }
    assert.throws(
      () => publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: reader }),
      (error) => {
        assert.match(error.message, /target changed under publication lock/)
        assert.equal(read(path, dir).toString(), 'appeared under lock')
        assert.ok(readFileSync(join(dir, 'docs/phase-governance/reviews/.storage.lock')).length)
        cleanupRecovery(error)
        return true
      },
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('source changes under lock are refused before any output and retain recovery', () => {
  const dir = temp()
  let reads = 0
  try {
    const reader = (p) => (p === r94 && ++reads === 2 ? Buffer.from('changed source') : read(p))
    assert.throws(
      () => publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: reader }),
      (error) => {
        assert.match(error.message, /source changed/)
        cleanupRecovery(error)
        return true
      },
    )
    const names = Object.keys(files(dir))
    assert.deepEqual(names, ['/docs/phase-governance/reviews/.storage.lock'])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('explicit Owner in-place mode works on a new isolated Git/object-sharing rehearsal; default refuses', () => {
  const dir = temp()
  try {
    execFileSync('git', ['-C', dir, 'init', '-q'])
    const common = execFileSync('git', [
      '-C',
      root,
      'rev-parse',
      '--path-format=absolute',
      '--git-common-dir',
    ])
      .toString()
      .trim()
    mkdirSync(join(dir, '.git/objects/info'), { recursive: true })
    writeFileSync(join(dir, '.git/objects/info/alternates'), `${join(common, 'objects')}\n`)
    for (const path of Object.keys(prepared.expectedSourceSnapshot)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true })
      writeFileSync(join(dir, path), read(path))
    }
    const own = prepareReviewStorageGroup(group(dir)),
      before = files(dir)
    assert.throws(
      () => publishReviewStorageGroup(own, dir, { sourceReadBuffer: (p) => read(p, dir) }),
      /explicit Owner mode/,
    )
    assert.deepEqual(files(dir), before)
    assert.equal(
      publishReviewStorageGroup(own, dir, {
        sourceReadBuffer: (p) => read(p, dir),
        allowInPlace: true,
      }).totalEntries,
      599,
    )
    const published = files(dir)
    publishReviewStorageGroup(own, dir, {
      sourceReadBuffer: (p) => read(p, dir),
      allowInPlace: true,
    })
    assert.deepEqual(files(dir), published)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('real native/model fixture reaches and obeys a rejecting protected reader', () => {
  const document = {
    path: Object.keys(historicalVitestPilots)[0],
    templateId: 'test-machine-evidence-v1',
    variant: historicalVitestContract.variant,
  }
  const registry = JSON.parse(read('docs/phase-governance/templates/registry.json'))
  const options = {
    readBuffer: read,
    readSource: (pin) => readGitDocumentSource(root, pin),
    readSourceBuffer: sourceSnapshot,
  }
  assert.deepEqual(
    checkMigratedDocument(document, registry, (p) => read(p).toString('utf8'), options),
    [],
  )
  let calls = 0
  const issues = checkMigratedDocument(document, registry, (p) => read(p).toString('utf8'), {
    ...options,
    reviewReader: () => {
      calls++
      throw new Error('publication lock')
    },
  })
  assert.equal(calls, 1)
  assert.deepEqual(issues, ['native Vitest current review unavailable'])
})
