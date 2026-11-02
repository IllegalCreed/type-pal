import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../../../../..')
const report = JSON.parse(fs.readFileSync(path.join(dir, 'review.json')))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const stale = report.pins.filter(
  (pin) =>
    !fs.existsSync(path.join(root, pin.path)) ||
    hash(fs.readFileSync(path.join(root, pin.path))) !== pin.sha256,
)
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', paths: stale.map((pin) => pin.path) }))
  process.exitCode = 2
} else {
  const ts = createRequire(path.join(root, 'package.json'))('typescript')
  const printer = ts.createPrinter({ removeComments: true })
  const body = (text) =>
    printer.printFile(ts.createSourceFile('checkpoints.ts', text, ts.ScriptTarget.Latest, true))
  const before = execFileSync('git', ['show', `${report.base}:${report.file.path}`], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(body(before), body(fs.readFileSync(path.join(root, report.file.path), 'utf8')))
  assert.deepEqual(Object.keys(report.file.dimensions), [...'ABCDEFGH'])
  const archive = fs.readFileSync(path.join(dir, report.receipts.path))
  assert.equal(hash(archive), report.receipts.sha256)
  const entries = JSON.parse(gunzipSync(archive))
  assert.equal(Object.keys(entries).length, report.receipts.entries)
  for (const [name, entry] of Object.entries(entries)) {
    const bytes = Buffer.from(entry.base64, 'base64')
    assert.equal(bytes.length, entry.bytes, name)
    assert.equal(hash(bytes), entry.sha256, name)
  }
  const bytes = (name) => Buffer.from(entries[name].base64, 'base64')
  const json = (name) => JSON.parse(bytes(name))
  const source = bytes('paltimer-source.stdout.raw')
  assert.equal(
    createHash('sha1').update(`blob ${source.length}\0`).update(source).digest('hex'),
    report.palTimer.blob,
  )
  const primary = json('primary-raw-pins.json')
  const raw = fs.readFileSync(path.join(root, primary.source))
  assert.equal(hash(raw), primary.sha256)
  for (const record of [...primary.bytecode, ...primary.objects, ...primary.scenes]) {
    assert.deepEqual(
      record.words,
      record.words.map((_, i) => raw.readUInt16LE(record.byteOffset + i * 2)),
    )
  }
  const ci = json('post-main-ci.json')
  assert.equal(ci.head, report.base)
  assert.equal(ci.checks.length, 2)
  for (const check of ci.checks) {
    assert.equal(check.head_sha, report.base)
    assert.equal(check.status, 'completed')
    assert.equal(check.conclusion, 'success')
    assert.equal(check.appId, 15368)
    assert.equal(check.annotations, 0)
  }
  assert.equal(hash(bytes('post-main-coverage-job.raw')), ci.coverage.sha256)
  assert.equal(hash(bytes('post-main-docs-full.stdout.raw')), ci.documentation.sha256)
  const getCase = (file, id) => {
    const item = json(file).cases.find((c) => c.id === id)
    assert(item, id)
    assert.equal(item.failure, undefined, id)
    assert.deepEqual(item.errors, [], id)
    assert.deepEqual(
      item.console.filter((c) => ['warning', 'error'].includes(c.type)),
      [],
      id,
    )
    return item.rows
  }
  const expectTransition = (rows, scene, x, y, nextStep) => {
    assert.equal(rows[0].detected, false)
    assert.equal(rows[0].split, null)
    assert(
      rows.some(
        (r) =>
          r.scene === scene &&
          r.x === x &&
          r.y === y &&
          r.detected &&
          r.step === nextStep &&
          r.split !== null,
      ),
    )
  }
  const stele = getCase('local-calibration.json', 'stele')
  expectTransition(stele, 19, 1856, 496, 1)
  assert(stele.some((r) => r.ip === 5182 && r.mode === 'event'))
  expectTransition(getCase('local-calibration.json', 'biohazard'), 62, 1312, 1376, 6)
  expectTransition(getCase('local-route-calibration.json', 'sword'), 146, 464, 1160, 15)
  expectTransition(getCase('local-final-calibration.json', 'tower-valid-side'), 164, 672, 704, 14)
  expectTransition(getCase('local-final-calibration.json', 'boat-valid-side'), 6, 1280, 1216, 3)
  const tower = getCase('local-final-calibration.json', 'tower-pan')
  assert.deepEqual([...new Set(tower.map((r) => r.scene))], [164, 165, 147])
  const kungfu = getCase('local-signal-calibration.json', 'kungfu')
  assert.equal(kungfu[0].detected, false)
  assert(kungfu.some((r) => r.music === 86 && r.ip === 2239 && r.step === 2 && r.split !== null))
  const pray = json('pray-calibration.json')
  assert.deepEqual(pray.errors, [])
  assert.deepEqual(
    pray.console.filter((c) => ['warning', 'error'].includes(c.type)),
    [],
  )
  assert(pray.inputs.some((input) => input.key === 'Enter' && input.state.menu.includes('opening')))
  assert(
    pray.states.some(
      (r) =>
        r.scene === 228 &&
        r.x === 1152 &&
        r.y === 1040 &&
        r.ip === 32044 &&
        r.step === 20 &&
        r.split !== null,
    ),
  )
  for (const id of report.runs) {
    const execution = json(`${id}.execution.json`)
    assert.equal(execution.exit, 0, id)
    assert.equal(execution.signal, null, id)
    assert.equal(execution.spawnError, null, id)
    assert.equal(bytes(`${id}.stderr.raw`).length, 0, id)
  }
  console.log(
    JSON.stringify({
      state: 'MATCH',
      localSignals: 7,
      unchangedBody: true,
      fullStoryE2e: false,
      receipts: Object.keys(entries).length,
    }),
  )
}
