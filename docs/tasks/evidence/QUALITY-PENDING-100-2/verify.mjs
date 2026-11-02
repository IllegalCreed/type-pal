import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

assert.equal(process.argv.length, 2, 'read-only verifier takes no arguments')
const directory = dirname(fileURLToPath(import.meta.url))
const root = resolve(directory, '../../../..')
const json = (name) => JSON.parse(readFileSync(resolve(directory, name), 'utf8'))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const review = json('review.json')
assert.equal(review.primaryCount, 100)
assert.equal(review.files.length + review.priorPrimary.count, 100)
assert.equal(new Set(review.files.map((file) => file.path)).size, review.files.length)
for (const file of [...review.files, ...review.ancillary, ...review.previouslyAcceptedReplay]) {
  const bytes = readFileSync(resolve(root, file.path))
  assert.equal(hash(bytes), file.sha256, `stale ${file.path}`)
  assert.equal(bytes.toString('utf8').trimEnd().split('\n').length, file.lines, file.path)
  for (const axis of 'ABCDEFGH') assert.ok(file.axes[axis]?.length > 15, `${file.path}/${axis}`)
}
execFileSync(
  process.execPath,
  [resolve(directory, '../QUALITY-GAME-PRESENT-HOST-TESTS-1/verify.mjs')],
  { cwd: root, stdio: 'pipe' },
)
for (const dependency of review.dependencyFingerprints) {
  assert.equal(
    hash(readFileSync(resolve(root, dependency.path))),
    dependency.sha256,
    `stale caller ${dependency.path}`,
  )
}
const prior = JSON.parse(readFileSync(resolve(directory, review.priorPrimary.evidence), 'utf8'))
const primaryPaths = [...review.files, ...prior.primaryFullReads].map((file) => file.path)
assert.equal(new Set(primaryPaths).size, 100)
const oldLedger = execFileSync(
  'git',
  ['show', `${review.base}:docs/ops/audits/code-quality-file-ledger.md`],
  { cwd: root, encoding: 'utf8' },
)
for (const path of primaryPaths) {
  const row = oldLedger.split('\n').find((line) => line.startsWith(`| \`${path}\` |`))
  assert.ok(
    !row || !['已验证', '保留'].includes(row.split('|')[3].trim()),
    `already closed ${path}`,
  )
}
const manifest = json('native-index.json')
const archive = readFileSync(resolve(directory, 'native.json.gz'))
assert.equal(hash(archive), manifest.sha256)
const entries = JSON.parse(gunzipSync(archive))
assert.deepEqual(Object.keys(entries).sort(), manifest.members.map((m) => m.name).sort())
for (const member of manifest.members) {
  const bytes = Buffer.from(entries[member.name], 'utf8')
  assert.equal(bytes.length, member.bytes, member.name)
  assert.equal(hash(bytes), member.sha256, member.name)
}
const native = (name) => JSON.parse(entries[name])
const cases = (name) =>
  native(`${name}.vitest.json`).testResults.flatMap((file) =>
    file.assertionResults.map((test) => ({
      path: file.name.split('/type-pal/').at(-1),
      name: test.fullName,
    })),
  )
const key = (row) => JSON.stringify([row.path, row.name])
const latestFiles = new Map()
for (const batch of review.batches) {
  for (const id of [batch.after, ...(batch.adjacent ?? [])].filter(Boolean)) {
    const run = native(`${id}.execution.json`)
    assert.equal(run.exit, 0, id)
    assert.equal(run.signal, null, id)
    assert.equal(run.spawnError, null, id)
    assert.equal(entries[`${id}.stderr.raw`], '', id)
    assert.doesNotMatch(
      entries[`${id}.stdout.raw`],
      /stderr\s*\||not wrapped in act|does not support act/,
      id,
    )
    const result = native(`${id}.vitest.json`)
    assert.equal(result.numFailedTests, 0, id)
    assert.equal(result.numPendingTests, 0, id)
    for (const item of cases(id)) {
      const previous = latestFiles.get(item.path)
      if (!previous || run.end > previous.end)
        latestFiles.set(item.path, { end: run.end, identities: new Set() })
      const latest = latestFiles.get(item.path)
      if (run.end === latest.end) latest.identities.add(key(item))
    }
  }
}
const current = new Set([...latestFiles.values()].flatMap((file) => [...file.identities]))
const identities = json('identities.json').rows
for (const batch of review.batches.filter((batch) => batch.before)) {
  assert.deepEqual(
    new Set(identities.filter((row) => row.before === batch.before).map((row) => key(row.old))),
    new Set(cases(batch.before).map(key)),
    batch.before,
  )
}
for (const row of identities) {
  assert.ok(row.reason.length > 15)
  assert.ok(row.current.length > 0)
  for (const target of row.current) assert.ok(current.has(key(target)), key(target))
}
for (const id of ['content-types-freeze', 'game-types-freeze']) {
  assert.equal(native(`${id}.execution.json`).exit, 0)
  assert.equal(entries[`${id}.stdout.raw`], '')
  assert.equal(entries[`${id}.stderr.raw`], '')
}
assert.equal(native('enemy-any-old.vitest.json').numFailedTests, 0)
const failed = native('enemy-any-new.vitest.json').testResults.flatMap((f) =>
  f.assertionResults.filter((t) => t.status === 'failed'),
)
assert.equal(failed.length, 1)
assert.equal(failed[0].fullName, 'evalAiCond 组合子 all/any/not')
assert.ok(failed[0].failureMessages.every((message) => message.includes('AssertionError')))
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const printer = ts.createPrinter({ removeComments: true })
const body = (path, source) =>
  printer.printFile(ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true))
for (const name of ['ambience', 'enemy-ai', 'grid', 'tileset']) {
  const path = `packages/content/src/${name}.ts`
  const old = execFileSync('git', ['show', `${review.base}:${path}`], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(
    body(path, readFileSync(resolve(root, path), 'utf8')),
    body(path, old),
    `product changed ${path}`,
  )
}
console.log(
  'PASS: 100 unique primaries, one uncounted host, prior acceptance excluded; raw bytes, identity mappings, directed greens, any single-red and product-body conservation. Uniform gates/publication remain separate.',
)
