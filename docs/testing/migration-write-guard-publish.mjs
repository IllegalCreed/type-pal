import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  constants,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const temp = mkdtempSync(join(tmpdir(), 'type-pal-mwg-publication-'))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const json = (value) => `${JSON.stringify(value, null, 2)}\n`
function snapshot(base, rel = '', out = {}) {
  for (const entry of readdirSync(join(base, rel), { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = rel ? `${rel}/${entry.name}` : entry.name
    assert.equal(
      entry.isSymbolicLink(),
      false,
      `publication input must be physically contained: ${path}`,
    )
    if (entry.isDirectory()) snapshot(base, path, out)
    else out[path] = sha(readFileSync(join(base, path)))
  }
  return out
}
const sourceProject = snapshot(join(root, 'projects/pal'))
const sourceBaseline = snapshot(join(root, 'packages/migrate/baselines/pal'))
for (const path of [
  'packages/migrate/src',
  'packages/migrate/scripts',
  'packages/migrate/baselines/pal',
  'projects/pal',
]) {
  mkdirSync(dirname(join(temp, path)), { recursive: true })
  cpSync(join(root, path), join(temp, path), { recursive: true, mode: constants.COPYFILE_FICLONE })
}
for (const path of [
  'node_modules',
  'packages/migrate/node_modules',
  'packages/reforge/public',
  'data/raw',
  'data/extracted',
]) {
  mkdirSync(dirname(join(temp, path)), { recursive: true })
  symlinkSync(join(root, path), join(temp, path), 'dir')
}
// A current-format older source asset in the owned copy forces actual JSON and binary writes.
// Flip only one PCM data bit; RIFF headers, data size and all structural metadata remain valid.
const catalogPath = 'assets/index.json'
const catalog = JSON.parse(readFileSync(join(temp, 'projects/pal', catalogPath), 'utf8'))
const [id, record] =
  Object.entries(catalog.assets).find(
    ([, r]) => r.kind === 'sound' && r.origin.kind === 'legacy-migrated' && r.path.endsWith('.wav'),
  ) ?? []
assert.ok(id, 'a real source-backed WAV is required')
const bytes = readFileSync(join(temp, 'projects/pal', record.path))
assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
assert.equal(bytes.toString('ascii', 8, 12), 'WAVE')
let data = -1
for (let at = 12; at + 8 <= bytes.length; ) {
  const length = bytes.readUInt32LE(at + 4)
  assert.ok(at + 8 + length <= bytes.length)
  if (bytes.toString('ascii', at, at + 4) === 'data' && length > 0) {
    data = at + 8
    break
  }
  at += 8 + length + (length % 2)
}
assert.ok(data >= 0)
bytes[data] ^= 1
record.sha256 = sha(bytes)
assert.equal(record.bytes, bytes.length)
writeFileSync(join(temp, 'projects/pal', record.path), bytes)
writeFileSync(join(temp, 'projects/pal', catalogPath), json(catalog))
const baselineRoot = join(temp, 'packages/migrate/baselines/pal')
const baselineCatalog = JSON.parse(readFileSync(join(baselineRoot, catalogPath), 'utf8'))
assert.equal(baselineCatalog.assets[id].path, record.path)
baselineCatalog.assets[id].sha256 = record.sha256
writeFileSync(join(baselineRoot, catalogPath), json(baselineCatalog))
const state = JSON.parse(readFileSync(join(baselineRoot, '_state.json'), 'utf8'))
state.files[catalogPath] = sha(json(baselineCatalog))
writeFileSync(join(baselineRoot, '_state.json'), json(state))

const receipts = []
for (const pass of [1, 2]) {
  const run = spawnSync(
    process.execPath,
    [
      join(root, 'node_modules/tsx/dist/cli.mjs'),
      join(temp, 'packages/migrate/scripts/migrate-content.mts'),
      '--write',
    ],
    { cwd: temp, encoding: 'utf8', timeout: 300_000, maxBuffer: 32 * 1024 * 1024 },
  )
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`
  writeFileSync(join(temp, `publish-${pass}.log`), output)
  assert.equal(run.signal, null, `interrupted: ${temp}`)
  assert.equal(run.status, 0, `publish-${pass}: ${temp}`)
  assert.match(output, /replay writes=0 deletes=0 conflicts=0 asset-deletes=0/)
  if (pass === 1) {
    assert.match(output, /current plan:.*writes=[1-9]/)
    assert.match(output, /assets:.*written=1\b/)
  } else {
    assert.match(output, /current plan:.*writes=0 deletes=0 conflicts=0/)
    assert.match(output, /transaction-changes=0/)
  }
  assert.deepEqual(
    snapshot(join(temp, 'projects/pal')),
    sourceProject,
    'published project must equal frozen bytes, including unmanaged files',
  )
  assert.deepEqual(
    snapshot(baselineRoot),
    sourceBaseline,
    'published baseline must equal frozen bytes',
  )
  receipts.push({ pass, exit: run.status, log: `publish-${pass}.log`, sha256: sha(output) })
}
assert.deepEqual(snapshot(join(root, 'projects/pal')), sourceProject, 'source project untouched')
assert.deepEqual(
  snapshot(join(root, 'packages/migrate/baselines/pal')),
  sourceBaseline,
  'source baseline untouched',
)
writeFileSync(
  join(temp, 'receipt.json'),
  json({
    sourceRoot: root,
    fixtureAsset: id,
    projects: Object.keys(sourceProject).length,
    baselines: Object.keys(sourceBaseline).length,
    receipts,
  }),
)
console.log(temp)
