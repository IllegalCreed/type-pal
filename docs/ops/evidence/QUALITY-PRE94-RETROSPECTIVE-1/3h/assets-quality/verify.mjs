import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: here,
  encoding: 'utf8',
}).trim()
const record = JSON.parse(readFileSync(resolve(here, 'quality.json'), 'utf8'))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const blob = (id) => execFileSync('git', ['cat-file', 'blob', id], { cwd: root })
for (const entry of record.artifacts) {
  const compressed = readFileSync(resolve(here, entry.file))
  const raw = gunzipSync(compressed)
  assert.equal(sha(compressed), entry.gzipSha256, entry.file)
  assert.equal(raw.length, entry.bytes, entry.file)
  assert.equal(sha(raw), entry.sha256, entry.file)
}
for (const entry of [
  ...record.sourceSnapshots,
  ...record.files.filter((file) => file.gitBlobSha1),
  ...record.pins,
]) {
  assert.equal(sha(blob(entry.gitBlobSha1)), entry.sha256, entry.path)
}
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const body = (bytes) =>
  ts
    .createPrinter({ removeComments: true })
    .printFile(
      ts.createSourceFile(
        'source.ts',
        bytes.toString(),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      ),
    )
for (const entry of record.sourceSnapshots)
  assert.equal(body(blob(entry.previousBlob)), body(blob(entry.gitBlobSha1)))
assert.deepEqual(record.tests.before, { passed: 43, failed: 0, pending: 0 })
assert.deepEqual(record.tests.after, { passed: 40, failed: 0, pending: 0 })
assert.deepEqual(
  record.tests.controls.map((round) => [round.passed, round.failed.length]),
  [
    [17, 0],
    [10, 4],
    [17, 0],
    [13, 1],
  ],
)
assert(record.tests.controls.every((round) => round.failed.every((test) => test.assertionError)))
assert(Object.values(record.tests.controlRestoration).every(Boolean))
assert.equal(record.ci.conclusion, 'success')
assert.equal(record.ci.head, record.base)
assert.equal(record.ci.runtimeStderrBlocks, 0)
assert.equal(record.ci.actWarnings, 0)
assert.equal(record.ci.platformDeprecationWarnings, 6)
assert.equal(record.ci.platformWarningAnnotations, 1)
process.stdout.write(
  'MATCH: frozen quality slice, originals, 40 green, 4+1 business controls, c427 CI success; no whole-CODE3h acceptance.\n',
)
