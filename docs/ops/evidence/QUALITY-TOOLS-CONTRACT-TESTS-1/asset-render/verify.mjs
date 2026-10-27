import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../../../..')
const read = (p) => fs.readFileSync(path.resolve(root, p))
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex')
const review = JSON.parse(fs.readFileSync(path.join(here, 'review.json')))
const parent = JSON.parse(fs.readFileSync(path.join(here, '../review.json')))
const native = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(here, 'native.json.gz'))))
assert.equal(review.primaryFiles.length, 30)
assert.equal(parent.actualPrimaryFilesReviewed, 100)
for (const item of review.primaryFiles) {
  assert.equal(hash(read(item.path)), item.sha256, `${item.path} stale source`)
  const claim = parent.files.find((x) => x.path === item.path)
  assert(claim && claim.readExtent === 'full' && claim.decision === 'code-accepted')
  assert.equal(claim.sha256, item.sha256)
  assert.deepEqual(Object.keys(claim.axes).sort(), 'ABCDEFGH'.split(''))
  for (const key of 'ABCDEFGH') assert(claim.axes[key].length > 15, `${item.path} empty ${key}`)
}
for (const item of review.dependencies)
  assert.equal(hash(read(item.path)), item.sha256, `${item.path} stale dependency`)
for (const item of review.inputs.files)
  assert.equal(hash(read(item.path)), item.sha256, `${item.path} stale input`)
for (const item of review.inputs.selectors) {
  const files = fs
    .readdirSync(path.resolve(root, item.directory))
    .filter((file) => file.startsWith(item.prefix) && file.endsWith('.rle'))
    .sort()
    .slice(0, item.count)
  assert.deepEqual(files, item.files, `${item.directory} changed sample membership`)
}
for (const item of review.retiredFiles)
  assert(!fs.existsSync(path.resolve(root, item.path)), `${item.path} returned`)
for (const item of review.native) {
  const bytes = Buffer.from(native.members[item.name], 'utf8')
  assert.equal(hash(bytes), item.sha256, item.name)
  assert.equal(bytes.length, item.bytes)
}
const report = (name) => JSON.parse(native.members[name])
const identities = (r) =>
  r.testResults.flatMap((s) =>
    s.assertionResults.map((a) => ({
      file: path.relative(root, s.name).replaceAll('\\', '/'),
      fullName: a.fullName,
      status: a.status,
    })),
  )
const old = identities(report('asset-render-baseline.vitest.json'))
const current = identities(report('asset-render-current.vitest.json'))
assert.equal(old.length, 118)
assert.equal(current.length, 137)
assert(current.every((x) => x.status === 'passed'))
const oldCounter = identities(report('asset-render-padding-old.vitest.json'))
assert.equal(oldCounter.length, 2)
assert(oldCounter.every((x) => x.status === 'passed'))
const counter = report('asset-render-child-evidence/changed-rng-padding.json')
const failed = counter.testResults
  .flatMap((s) => s.assertionResults)
  .filter((x) => x.status === 'failed')
assert.equal(failed.length, 1)
assert.equal(failed[0].title, review.counter.expectedFailedTitle)
assert(failed[0].failureMessages.join('').includes('AssertionError'))
const restoration = report('asset-render-padding-restoration.json')
assert.equal(restoration.current, restoration.restored)
assert.equal(restoration.current, hash(read(restoration.path)))
assert.equal(review.identities.mapping.length, old.length)
const available = new Set(review.identities.currentComposite.map((x) => `${x.file}\0${x.fullName}`))
for (const m of review.identities.mapping) {
  assert(m.current.length > 0)
  for (const dest of m.current) assert(available.has(`${dest.file}\0${dest.fullName}`))
}
for (const line of fs
  .readFileSync(path.join(here, 'checksums.sha256'), 'utf8')
  .trim()
  .split('\n')) {
  const [, sha, file] = /^([a-f0-9]{64}) {2}(.+)$/.exec(line) ?? []
  assert(file, 'invalid pin')
  assert.equal(hash(read(file)), sha, `${file} stale`)
}
process.stdout.write(
  'PASS:30 full A-H +100 window;118 mapped identities;137 current identities;single business failure;native bytes and dependencies match. Semantic judgments remain review evidence.\n',
)
