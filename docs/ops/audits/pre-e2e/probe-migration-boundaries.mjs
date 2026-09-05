// Audit baseline 09ee6e3c only. Every filesystem operation used by these modules is
// redirected to virtual maps; nonvirtual path access is rejected. Never call the CLI here.
// Run: node --import tsx docs/ops/audits/pre-e2e/probe-migration-boundaries.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { dirname } from 'node:path'
import {
  serializeMigrationJson,
  sha256,
} from '../../../../packages/migrate/src/migration-baseline.ts'
import { createMigrationPlan, snapshotOf } from '../../../../packages/migrate/src/migration-plan.ts'
import {
  assertProjectSnapshotCurrent,
  loadProjectMigrationSnapshot,
} from '../../../../packages/migrate/src/migration-project-io.ts'
import { commitMigrationTransaction } from '../../../../packages/migrate/src/migration-transaction.ts'
import { buildMigrationTransactionChanges } from '../../../../packages/migrate/src/migration-write-plan.ts'
import { materializePalAssets } from '../../../../packages/migrate/src/pal-assets.ts'

const repo = '/virtual-migrate-audit'
const files = new Map(),
  dirs = new Set([repo]),
  links = new Map(),
  calls = []
function pathOf(path) {
  let out = String(path)
  if (out !== repo && !out.startsWith(`${repo}/`) && !out.startsWith('/virtual-outside/'))
    throw new Error(`Refusing nonvirtual filesystem access: ${out}`)
  for (const [source, target] of links)
    if (out === source || out.startsWith(`${source}/`)) out = target + out.slice(source.length)
  return out
}
function addDir(path) {
  for (let p = path; p !== '/'; p = dirname(p)) dirs.add(p)
}
function put(path, bytes) {
  path = pathOf(path)
  addDir(dirname(path))
  files.set(path, Buffer.from(bytes))
}
function get(path, encoding) {
  path = pathOf(path)
  if (!files.has(path)) throw new Error(`ENOENT ${path}`)
  const bytes = Buffer.from(files.get(path))
  return encoding ? bytes.toString(encoding) : bytes
}
const replacements = {
  existsSync(path) {
    path = pathOf(path)
    return files.has(path) || dirs.has(path)
  },
  readFileSync: get,
  mkdirSync(path) {
    addDir(pathOf(path))
  },
  writeFileSync(path, bytes) {
    calls.push(['write', pathOf(path)])
    put(path, bytes)
  },
  renameSync(from, to) {
    from = pathOf(from)
    to = pathOf(to)
    if (!files.has(from)) throw new Error(`ENOENT ${from}`)
    calls.push(['rename', to])
    put(to, files.get(from))
    files.delete(from)
  },
  unlinkSync(path) {
    if (!files.delete(pathOf(path))) throw new Error(`ENOENT ${path}`)
  },
  rmSync(path, options) {
    path = pathOf(path)
    files.delete(path)
    if (options?.recursive)
      for (const key of [...files.keys()]) if (key.startsWith(`${path}/`)) files.delete(key)
  },
  openSync(path) {
    pathOf(path)
    return 123
  },
  closeSync() {},
  fsyncSync() {},
  lstatSync(path) {
    pathOf(path)
    return { isSymbolicLink: () => links.has(String(path)) }
  },
}
const originals = {}
for (const [name, replacement] of Object.entries(replacements)) {
  originals[name] = fs[name]
  fs[name] = replacement
}
syncBuiltinESMExports()
try {
  const file = 'content/items.json',
    target = `${repo}/projects/pal/${file}`
  const before = [{ id: 'a', name: 'old', desc: [], buyPrice: 50, sellPrice: 25, sellable: true }]
  const upstream = [{ ...before[0], buyPrice: 60 }]
  put(target, serializeMigrationJson(before, file))
  const base = snapshotOf({ files: new Map([[file, before]]), managedFiles: new Set([file]) })
  const ours = loadProjectMigrationSnapshot(repo, new Set([file]))
  const theirs = { files: new Map([[file, upstream]]), managedFiles: new Set([file]) }
  const plan = createMigrationPlan(base, ours, theirs)
  assertProjectSnapshotCurrent(repo, ours, theirs.managedFiles)
  put(target, serializeMigrationJson([{ ...before[0], name: 'AUTHOR_SAVED_AFTER_CHECK' }], file))
  const changes = buildMigrationTransactionChanges({
    repo,
    plan,
    previousBaseline: base,
    nextBaseline: snapshotOf(theirs),
  })
  commitMigrationTransaction(repo, changes)
  const replay = createMigrationPlan(
    snapshotOf(theirs),
    loadProjectMigrationSnapshot(repo, new Set([file])),
    theirs,
  )
  const lost = !get(target, 'utf8').includes('AUTHOR_SAVED_AFTER_CHECK')
  assert.equal(lost, true)
  console.log(
    JSON.stringify({
      id: 'A-08',
      authorEditLost: lost,
      final: JSON.parse(get(target, 'utf8')),
      replay: {
        writes: replay.writes.size,
        deletes: replay.deletes.length,
        conflicts: replay.conflicts.length,
      },
    }),
  )

  links.set(`${repo}/projects/pal/assets/migrated/videos`, '/virtual-outside/videos')
  const bytes = Buffer.from('NEW')
  const record = {
    kind: 'video',
    path: 'assets/migrated/videos/a.mp4',
    mediaType: 'video/mp4',
    bytes: bytes.length,
    sha256: sha256(bytes),
    origin: { kind: 'legacy-migrated' },
  }
  put('/virtual-outside/videos/a.mp4', 'OUTSIDE_ORIGINAL')
  const result = materializePalAssets({
    repo,
    catalog: { version: 1, assets: { 'video.a': record } },
    binaries: [{ id: 'video.a', record, bytes }],
  })
  assert.equal(get('/virtual-outside/videos/a.mp4', 'utf8'), 'NEW')
  console.log(
    JSON.stringify({
      id: 'A-09',
      written: result.written,
      outsideFinal: get('/virtual-outside/videos/a.mp4', 'utf8'),
      outsideWrites: calls.filter(([, path]) => path.startsWith('/virtual-outside/')),
    }),
  )
} finally {
  for (const [name, original] of Object.entries(originals)) fs[name] = original
  syncBuiltinESMExports()
}
