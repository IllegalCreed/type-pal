import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { gunzipSync, gzipSync } from 'node:zlib'
import { loadArtifactRetirements, readArtifactRetirementRows } from './artifact-retirement.mjs'
import { fileState } from './review-record-storage-io.mjs'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
function fixture(t, { sourceMode = '100644', nested = false } = {}) {
  const root = mkdtempSync('/tmp/type-pal-artifact-retirement-')
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const path = 'docs/ops/evidence/CASE/input.source.gz'
  const receipt = 'docs/ops/evidence/CASE/transport.json.gz'
  const text = Buffer.from('fixed original staged input\n')
  const payload = nested ? gzipSync(text) : text
  const bytes = gzipSync(payload)
  const native = gzipSync(
    JSON.stringify({
      owner: 'original author',
      input: path,
      exit: 1,
      fullRead: false,
      storedSha256: hash(bytes),
      payloadSha256: hash(payload),
    }),
  )
  const physicalPath = (name) => name.replace(/^docs\/ops\/evidence\//u, 'docs/tasks/evidence/')
  const write = (name, body) => {
    mkdirSync(dirname(join(root, name)), { recursive: true })
    writeFileSync(join(root, name), body)
  }
  write(path, bytes)
  write(receipt, native)
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  git('init', '-q')
  git('add', '.')
  if (sourceMode !== '100644')
    git('update-index', '--cacheinfo', `${sourceMode},${git('hash-object', path)},${path}`)
  git(
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-qm',
    'base',
  )
  const revision = git('rev-parse', 'HEAD')
  const entries = new Map(
    git('ls-tree', '-rlz', '--full-tree', revision)
      .split('\0')
      .filter(Boolean)
      .map((line) => {
        const [, mode, type, object, length, name] =
          /^(\d{6}) (\w+) ([a-f\d]{40}) +(\d+)\t(.+)$/u.exec(line)
        return [name, { mode, type, object, bytes: Number(length) }]
      }),
  )
  const source = {
    entries,
    read: (name) =>
      entries.has(name)
        ? execFileSync('git', ['show', `${revision}:${name}`], { cwd: root })
        : undefined,
  }
  for (const name of entries.keys()) {
    mkdirSync(dirname(join(root, physicalPath(name))), { recursive: true })
    renameSync(join(root, name), join(root, physicalPath(name)))
  }
  rmSync(join(root, physicalPath(path)))
  const row = {
    path,
    sourceBlob: entries.get(path).object,
    sha256: hash(bytes),
    bytes: bytes.length,
  }
  const safePath = (name) =>
    assert(
      typeof name === 'string' &&
        !/[:\\]/u.test(name) &&
        [...name].every((character) => character.codePointAt(0) > 31) &&
        name.split('/').every((part) => part && !['.', '..', '.git'].includes(part)),
      'unsafe test path',
    )
  const readState = (name, parents) => fileState(root, name, parents, '')
  const load = (rows = [row], reservedPaths = new Set()) =>
    loadArtifactRetirements({
      rows,
      source,
      physicalPath,
      readState,
      safePath,
      reservedPaths,
    })
  return {
    root,
    row,
    bytes,
    native,
    receipt,
    text,
    payload,
    revision,
    write,
    physicalPath,
    load,
    readState,
    safePath,
  }
}

test('an exact positive retirement preserves source identity and separate execution metadata', (t) => {
  const f = fixture(t)
  const retired = f.load()
  assert.deepEqual(retired.entries, [f.row])
  assert.equal(retired.get(f.physicalPath(f.row.path)).path, f.row.path)
  assert.equal(retired.get('docs/ops/evidence/other.gz'), undefined)
  assert(Object.isFrozen(retired.entries) && Object.isFrozen(retired.entries[0]))
  assert.deepEqual(readFileSync(join(f.root, f.physicalPath(f.receipt))), f.native)
  retired.assertUnchanged()
})

test('explicit Git recovery outside the retired path preserves nested gzip input identity', (t) => {
  const f = fixture(t, { nested: true })
  const retired = f.load()
  const restored = execFileSync('git', ['show', `${f.revision}:${f.row.path}`], { cwd: f.root })
  const temporary = join(f.root, 'recovered-input.gz')
  writeFileSync(temporary, restored)
  const container = readFileSync(temporary)
  assert.equal(container.length, f.row.bytes)
  assert.equal(hash(container), f.row.sha256)
  const payload = gunzipSync(container, { maxOutputLength: f.payload.length })
  assert.deepEqual(payload, f.payload)
  assert.notDeepEqual(payload, f.text)
  assert.deepEqual(gunzipSync(payload), f.text)
  retired.assertUnchanged()
})

test('each declared source field and the historical attachment boundary are enforced', async (t) => {
  const f = fixture(t)
  f.load().assertUnchanged()
  for (const [name, delta, message] of [
    ['wrong blob', { sourceBlob: '0'.repeat(40) }, /fixed source identity/u],
    ['wrong extent', { bytes: f.row.bytes + 1 }, /fixed source identity/u],
    ['wrong content', { sha256: '0'.repeat(64) }, /fixed source bytes/u],
    ['unknown source', { path: 'docs/ops/evidence/CASE/unknown.gz' }, /fixed source identity/u],
    ['governed JSON', { path: 'docs/ops/evidence/CASE/result.json' }, /only declared historical/u],
    [
      'current review storage',
      { path: 'docs/phase-governance/reviews/input.gz' },
      /only declared historical/u,
    ],
    ['unsafe parent', { path: 'docs/ops/evidence/../input.gz' }, /unsafe test path/u],
    ['new field', { revision: f.revision }, /unexpected fields/u],
  ])
    await t.test(name, () => assert.throws(() => f.load([{ ...f.row, ...delta }]), message))
  for (const value of [null, 'path', 1, []])
    assert.throws(() => f.load([value]), /member must be an object/u)
  assert.throws(() => f.load(null), /invalid list/u)
})

test('real Git executable and symlink modes cannot qualify even with identical blob bytes', async (t) => {
  for (const sourceMode of ['100755', '120000'])
    await t.test(sourceMode, (sub) => {
      const f = fixture(sub, { sourceMode })
      assert.throws(() => f.load(), /ordinary mode differs/u)
    })
})

test('reserved logical or physical identities and duplicate members cannot retire', (t) => {
  const f = fixture(t)
  for (const path of [f.row.path, f.physicalPath(f.row.path)])
    assert.throws(() => f.load([f.row], new Set([path])), /overlaps another/u)
  assert.throws(() => f.load([f.row, f.row]), /duplicate or colliding identity/u)
})

test('a reappearing carrier at either path fails initial and final absence checks', (t) => {
  const f = fixture(t)
  const retired = f.load()
  for (const path of [f.row.path, f.physicalPath(f.row.path)]) {
    f.write(path, Buffer.alloc(0))
    assert.throws(() => f.load(), /retired physical carrier reappeared/u)
    assert.throws(() => retired.assertUnchanged(), /retired physical carrier reappeared/u)
    rmSync(join(f.root, path))
    retired.assertUnchanged()
  }
})

test('dangling retired leaves and symlink parents are rejected rather than counted absent', (t) => {
  const f = fixture(t)
  const retired = f.load()
  const current = f.physicalPath(f.row.path)
  symlinkSync('missing-target', join(f.root, current))
  assert.throws(() => f.load(), /not an ordinary file/u)
  assert.throws(() => retired.assertUnchanged(), /not an ordinary file/u)
  rmSync(join(f.root, current))
  const parent = dirname(join(f.root, current))
  const saved = join(f.root, 'saved-parent')
  renameSync(parent, saved)
  symlinkSync(saved, parent)
  assert.throws(() => f.load(), /parent not an ordinary directory/u)
  assert.throws(() => retired.assertUnchanged(), /parent not an ordinary directory/u)
  rmSync(parent)
  renameSync(saved, parent)
  retired.assertUnchanged()
})

function listFixture(t) {
  const f = fixture(t)
  const path = 'docs/tasks/evidence/REPO-SLIM-PLAN-1-retired-artifacts.json.gz'
  let decoded, packed, descriptor, artifacts
  const setBytes = (bytes, frame = gzipSync(bytes)) => {
    decoded = bytes
    packed = frame
    descriptor = {
      codec: 'gzip',
      path,
      storedSha256: hash(packed),
      storedBytes: packed.length,
      decodedSha256: hash(decoded),
      decodedBytes: decoded.length,
      entries: 1,
    }
    artifacts = [{ path, sha256: hash(packed), bytes: packed.length, purpose: 'Finite member set' }]
    f.write(path, packed)
  }
  setBytes(Buffer.from(`${JSON.stringify([f.row])}\n`))
  return {
    ...f,
    path,
    setBytes,
    get packed() {
      return packed
    },
    get decoded() {
      return decoded
    },
    get descriptor() {
      return descriptor
    },
    get artifacts() {
      return artifacts
    },
    readList: (declaration = descriptor, registrations = artifacts) =>
      readArtifactRetirementRows({
        declaration,
        artifacts: registrations,
        readState: f.readState,
        safePath: f.safePath,
      }),
  }
}

test('one registered gzip member set feeds the unchanged per-member source and absence validator', (t) => {
  const f = listFixture(t)
  const list = f.readList()
  assert.deepEqual(list.rows, [f.row])
  f.load(list.rows).assertUnchanged()
  list.assertUnchanged()
  f.write(f.physicalPath(f.row.path), f.bytes)
  assert.throws(() => f.load(list.rows), /retired physical carrier reappeared/u)
  rmSync(join(f.root, f.physicalPath(f.row.path)))
  f.setBytes(
    Buffer.from(`${JSON.stringify([{ ...f.row, semanticDecision: 'not a member field' }])}\n`),
  )
  assert.throws(() => f.load(f.readList().rows), /unexpected fields/u)
})

test('the gzip descriptor has one fixed path, closed fields, bounded counts and matching ordinary registration', async (t) => {
  const f = listFixture(t)
  for (const [name, declaration, registrations, message] of [
    [
      'extra field',
      { ...f.descriptor, semanticDecision: 'report' },
      f.artifacts,
      /unexpected descriptor/u,
    ],
    [
      'wrong path',
      { ...f.descriptor, path: 'docs/tasks/evidence/other.json.gz' },
      f.artifacts,
      /fixed carrier/u,
    ],
    ['wrong codec', { ...f.descriptor, codec: 'zip' }, f.artifacts, /fixed carrier/u],
    ['stored cap', { ...f.descriptor, storedBytes: 1_048_577 }, f.artifacts, /budget differs/u],
    ['decoded cap', { ...f.descriptor, decodedBytes: 4_194_305 }, f.artifacts, /budget differs/u],
    ['row cap', { ...f.descriptor, entries: 16_385 }, f.artifacts, /budget differs/u],
    ['zero rows', { ...f.descriptor, entries: 0 }, f.artifacts, /budget differs/u],
    ['unregistered', f.descriptor, [], /registration differs/u],
    [
      'duplicate registration',
      f.descriptor,
      [...f.artifacts, ...f.artifacts],
      /registration differs/u,
    ],
    [
      'registered digest',
      f.descriptor,
      [{ ...f.artifacts[0], sha256: '0'.repeat(64) }],
      /registration differs/u,
    ],
    [
      'registered extent',
      f.descriptor,
      [{ ...f.artifacts[0], bytes: f.packed.length + 1 }],
      /registration differs/u,
    ],
  ])
    await t.test(name, () => assert.throws(() => f.readList(declaration, registrations), message))
  chmodSync(join(f.root, f.path), 0o755)
  assert.throws(() => f.readList(), /nonordinary/u)
  chmodSync(join(f.root, f.path), 0o644)
  f.readList().assertUnchanged()
})

test('stored and decoded identity, gzip bounds and strict original JSON bytes fail independently', async (t) => {
  const cases = [
    [
      'stored digest',
      (f) => {
        f.descriptor.storedSha256 = '0'.repeat(64)
        f.artifacts[0].sha256 = f.descriptor.storedSha256
      },
      /stored carrier/u,
    ],
    [
      'stored extent',
      (f) => {
        f.descriptor.storedBytes++
        f.artifacts[0].bytes = f.descriptor.storedBytes
      },
      /stored carrier/u,
    ],
    [
      'decoded digest',
      (f) => {
        f.descriptor.decodedSha256 = '0'.repeat(64)
      },
      /decoded identity/u,
    ],
    [
      'inflate bound',
      (f) => {
        f.descriptor.decodedBytes--
      },
      /larger than/u,
    ],
    [
      'decoded extent',
      (f) => {
        f.descriptor.decodedBytes++
      },
      /decoded identity/u,
    ],
    [
      'damaged gzip',
      (f) => {
        const frame = Buffer.from(f.packed)
        frame[frame.length - 8] ^= 1
        f.setBytes(f.decoded, frame)
      },
      /incorrect data check/u,
    ],
    ['invalid UTF8', (f) => f.setBytes(Buffer.from([255])), /UTF8/u],
    ['BOM', (f) => f.setBytes(Buffer.concat([Buffer.from([239, 187, 191]), f.decoded])), /BOM/u],
    [
      'duplicate keys',
      (f) => f.setBytes(Buffer.from('[{"path":"one","path":"two"}]\n')),
      /duplicate decoded key/u,
    ],
    [
      'escaped duplicate keys',
      (f) => f.setBytes(Buffer.from('[{"path":"one","p\\u0061th":"two"}]\n')),
      /duplicate decoded key/u,
    ],
    [
      'trailing JSON',
      (f) => f.setBytes(Buffer.concat([f.decoded, Buffer.from('{}')])),
      /trailing input/u,
    ],
    [
      'semantic wrapper',
      (f) => f.setBytes(Buffer.from(JSON.stringify({ retiredArtifacts: [f.row] }))),
      /member array/u,
    ],
    [
      'wrong row count',
      (f) => {
        f.descriptor.entries = 2
      },
      /member array or count/u,
    ],
  ]
  for (const [name, mutate, message] of cases)
    await t.test(name, (sub) => {
      const f = listFixture(sub)
      mutate(f)
      assert.throws(() => f.readList(), message)
    })
})

test('the administrative carrier and parent identities stay fixed through the final read', (t) => {
  const f = listFixture(t)
  const list = f.readList()
  const absolute = join(f.root, f.path)
  const replacement = join(f.root, 'replacement.gz')
  writeFileSync(replacement, f.packed)
  renameSync(replacement, absolute)
  assert.throws(() => list.assertUnchanged(), /carrier identity changed/u)
  const fresh = f.readList()
  const saved = join(f.root, 'saved-evidence')
  const parent = dirname(absolute)
  renameSync(parent, saved)
  symlinkSync(saved, parent)
  assert.throws(() => fresh.assertUnchanged(), /parent not an ordinary directory/u)
  rmSync(parent)
  renameSync(saved, parent)
  fresh.assertUnchanged()
  renameSync(absolute, replacement)
  symlinkSync(replacement, absolute)
  assert.throws(() => f.readList(), /not an ordinary file/u)
  rmSync(absolute)
  assert.throws(() => f.readList(), /stored carrier missing/u)
})

test('bounded physical shards reject mixed rows, duplicates, orphan declarations and aggregate overflow', (t) => {
  const f = listFixture(t)
  const secondPath = f.path.replace('.json.gz', '-2.json.gz')
  f.write(secondPath, f.packed)
  const second = { ...f.descriptor, path: secondPath }
  const registrations = [...f.artifacts, { ...f.artifacts[0], path: secondPath }]
  const list = f.readList([f.descriptor, second], registrations)
  assert.deepEqual(list.rows, [f.row, f.row])
  assert.throws(() => f.load(list.rows), /duplicate or colliding identity/u)
  list.assertUnchanged()
  for (const [declarations, artifacts, message] of [
    [[f.descriptor, f.row], registrations, /mixed members/u],
    [[f.descriptor, f.descriptor], registrations, /duplicate shard/u],
    [Array(5).fill(f.descriptor), registrations, /shard count exceeds four/u],
    [
      [
        { ...f.descriptor, entries: 9000 },
        { ...second, entries: 9000 },
      ],
      registrations,
      /aggregate budget/u,
    ],
    [f.descriptor, registrations, /undeclared administrative shard/u],
    [[], registrations, /undeclared administrative shard/u],
    [
      f.descriptor,
      [...f.artifacts, { ...f.artifacts[0], path: f.path.replace('.json.gz', '-5.json.gz') }],
      /undeclared administrative shard/u,
    ],
  ])
    assert.throws(() => f.readList(declarations, artifacts), message)
  const replacement = join(f.root, 'second-replacement.gz')
  writeFileSync(replacement, f.packed)
  renameSync(replacement, join(f.root, secondPath))
  assert.throws(() => list.assertUnchanged(), /carrier identity changed/u)
})
