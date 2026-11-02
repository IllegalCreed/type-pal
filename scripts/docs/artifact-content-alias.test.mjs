import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { loadArtifactContentAliases } from './artifact-content-alias.mjs'

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
function fixture(t) {
  const root = mkdtempSync('/tmp/type-pal-content-alias-')
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const prefix = 'docs/ops/evidence/CASE'
  const physicalPath = (path) => path.replace(/^docs\/ops\/evidence\//u, 'docs/tasks/evidence/')
  const body = Buffer.from('file\tcontract\tpassed\n')
  const write = (path, bytes) => {
    mkdirSync(join(root, path, '..'), { recursive: true })
    writeFileSync(join(root, path), bytes)
  }
  const path = `${prefix}/counterproof-raw/final-replay.identity.tsv`
  const retained = `${prefix}/counterproof-raw/baseline.identity.tsv`
  const receipt = `${prefix}/counterproof.json`
  const descriptor = (name) => ({
    path: `counterproof-raw/${name}.identity.tsv`,
    bytes: body.length,
    sha256: sha(body),
  })
  const receiptBody = JSON.stringify({
    baseline: { label: 'baseline', exitCode: 0, identity: { artifact: descriptor('baseline') } },
    finalReplay: {
      phase: {
        label: 'final-replay',
        exitCode: 0,
        identity: { artifact: descriptor('final-replay') },
      },
    },
  })
  write(path, body)
  write(retained, body)
  write(receipt, receiptBody)
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  git('init', '-q')
  git('add', '-f', '.')
  git(
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-qm',
    'source',
  )
  const entries = new Map(
    git('ls-tree', '-r', 'HEAD')
      .split('\n')
      .map((line) => {
        const [metadata, name] = line.split('\t')
        const [mode, type, object] = metadata.split(' ')
        return [name, { mode, type, object }]
      }),
  )
  const source = {
    entries,
    read: (name) =>
      entries.has(name)
        ? execFileSync('git', ['cat-file', 'blob', entries.get(name).object], { cwd: root })
        : undefined,
  }
  for (const name of [path, retained, receipt]) {
    const target = join(root, physicalPath(name))
    mkdirSync(join(target, '..'), { recursive: true })
    renameSync(join(root, name), target)
  }
  rmSync(join(root, physicalPath(path)))
  const row = {
    path,
    retained,
    receipt,
    pointer: '/finalReplay/phase/identity/artifact',
    bytes: body.length,
    sha256: sha(body),
    sourceBlob: entries.get(path).object,
  }
  const readCurrent = (name) => {
    try {
      assert(lstatSync(join(root, name)).isFile(), 'ordinary file required')
      return readFileSync(join(root, name))
    } catch (error) {
      if (error.code === 'ENOENT') return undefined
      throw error
    }
  }
  const safePath = (name) =>
    assert(
      typeof name === 'string' &&
        !name.startsWith('/') &&
        !name.includes('\\') &&
        name.split('/').every((part) => part && part !== '.' && part !== '..'),
      'unsafe path',
    )
  const load = (rows = [row]) =>
    loadArtifactContentAliases({ rows, source, physicalPath, readCurrent, safePath })
  return { root, row, body, receiptBody, load, write, physicalPath }
}

test('content sharing retains distinct immutable phase descriptors and fixed Git bytes', (t) => {
  const f = fixture(t),
    aliases = f.load()
  assert.equal(aliases.resolve(f.row.path), f.physicalPath(f.row.retained))
  assert.equal(aliases.resolve(f.physicalPath(f.row.path)), f.physicalPath(f.row.retained))
  assert.equal(
    aliases.resolve('docs/ops/evidence/unrelated.log'),
    'docs/tasks/evidence/unrelated.log',
  )
  const receipt = JSON.parse(readFileSync(join(f.root, f.physicalPath(f.row.receipt)), 'utf8'))
  assert.notEqual(receipt.baseline.label, receipt.finalReplay.phase.label)
  assert.notEqual(
    receipt.baseline.identity.artifact.path,
    receipt.finalReplay.phase.identity.artifact.path,
  )
  assert.equal(
    receipt.baseline.identity.artifact.sha256,
    receipt.finalReplay.phase.identity.artifact.sha256,
  )
  aliases.assertUnchanged()
})

test('admitted data cannot substitute a wrong descriptor, source, group or content identity', (t) => {
  const f = fixture(t)
  for (const [delta, expected] of [
    [{ pointer: '/baseline/identity/artifact' }, /execution descriptor/u],
    [{ pointer: '/missing/identity/artifact' }, /pointer missing/u],
    [{ sha256: '0'.repeat(64) }, /fixed content identity/u],
    [{ sourceBlob: '0'.repeat(40) }, /fixed sources differ/u],
    [{ bytes: f.body.length + 1 }, /fixed content identity/u],
    [{ retained: f.row.retained.replace('/CASE/', '/OTHER/') }, /same-task/u],
    [{ extra: true }, /unexpected fields/u],
  ])
    assert.throws(() => f.load([{ ...f.row, ...delta }]), expected)
  assert.throws(() => f.load([f.row, f.row]), /duplicate identity/u)
})

test('missing or changed retained bytes and changed receipts fail both initial and exit checks', (t) => {
  const f = fixture(t),
    aliases = f.load()
  const retained = f.physicalPath(f.row.retained)
  f.write(retained, 'wrong')
  assert.throws(() => aliases.assertUnchanged(), /retained content/u)
  assert.throws(() => f.load(), /retained content/u)
  rmSync(join(f.root, retained))
  assert.throws(() => f.load(), /retained content/u)
  f.write(retained, f.body)
  f.write(
    f.physicalPath(f.row.receipt),
    f.receiptBody.replace('final-replay', 'invented-execution'),
  )
  assert.throws(() => aliases.assertUnchanged(), /immutable execution receipt/u)
})

test('a reappearing retired copy cannot silently coexist with its alias', (t) => {
  const f = fixture(t),
    aliases = f.load()
  f.write(f.physicalPath(f.row.path), f.body)
  assert.throws(() => aliases.assertUnchanged(), /retired physical copy/u)
  assert.throws(() => f.load(), /retired physical copy/u)
})
