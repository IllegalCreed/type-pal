import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const dir = path.dirname(fileURLToPath(import.meta.url)),
  root = path.resolve(dir, '../../../../..')
const r = JSON.parse(fs.readFileSync(path.join(dir, 'review.json'))),
  sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
const stale = [...r.files, ...r.context].filter(
  (p) =>
    !fs.existsSync(path.join(root, p.path)) ||
    sha(fs.readFileSync(path.join(root, p.path))) !== p.sha256,
)
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', files: stale.map((p) => p.path) }))
  process.exitCode = 2
} else {
  for (const p of r.files) assert.deepEqual(Object.keys(p.dimensions), [...'ABCDEFGH'])
  const packed = fs.readFileSync(path.join(dir, r.receipts.path))
  assert.equal(sha(packed), r.receipts.sha256)
  const archive = new Map()
  for (const [name, item] of Object.entries(JSON.parse(gunzipSync(packed)))) {
    const b = Buffer.from(item.base64, 'base64')
    assert.equal(b.length, item.bytes, name)
    assert.equal(sha(b), item.sha256, name)
    archive.set(name, b)
  }
  assert.equal(archive.size, r.receipts.entries)
  const raw = (name) => {
      assert(archive.has(name), name)
      return archive.get(name)
    },
    json = (name) => JSON.parse(raw(name))
  const run = (id, exit) => {
    const e = json(`${id}.execution.json`)
    assert.equal(e.exit, exit, id)
    assert.equal(e.signal, null)
    assert.equal(e.spawnError, null)
    assert.equal(raw(`${id}.stdout.raw`).length, e.stdoutBytes)
    assert.equal(raw(`${id}.stderr.raw`).length, e.stderrBytes)
  }
  for (const [id, passed, files] of [
    ['opcode-baseline', 62, 2],
    ['opcode-corrected', 62, 2],
    ['opcode-adjacent', r.gates.adjacent.passed, 5],
  ]) {
    run(id, 0)
    const n = json(`${id}.vitest.json`)
    assert.equal(n.numPassedTests, passed)
    assert.equal(n.numFailedTests, 0)
    assert.equal(n.numPendingTests, 0)
    assert.equal(n.testResults.length, files)
    assert.equal(raw(`${id}.stderr.raw`).length, 0)
    assert(!/\b(?:stdout|stderr)\s*\|/.test(raw(`${id}.stdout.raw`).toString()))
  }
  const ids = (id) =>
    json(`${id}.vitest.json`).testResults.flatMap((f) =>
      f.assertionResults.map((t) => ({
        path: f.name.slice(f.name.indexOf('/packages/') + 1),
        fullName: t.fullName,
      })),
    )
  const old = ids('opcode-baseline'),
    now = ids('opcode-corrected')
  assert.equal(old.length, 62)
  assert.equal(now.length, 62)
  const mapped = old.map((x) => {
    const m = r.identity.renamed.find((m) => m.path === x.path && m.before === x.fullName)
    return m ? { path: x.path, fullName: m.after } : x
  })
  const sort = (a) => a.map((x) => JSON.stringify(x)).sort()
  assert.deepEqual(sort(mapped), sort(now))
  assert.equal(r.identity.renamed.length, 7)
  for (const c of r.counters.valid) {
    for (const [id, exit] of [
      [c.old, 0],
      [c.new, 1],
    ]) {
      run(id, exit)
      const n = json(`${id}.vitest.json`)
      assert.equal(n.numPassedTests, exit ? 0 : 1)
      assert.equal(n.numFailedTests, exit)
      const failed = n.testResults
        .flatMap((f) => f.assertionResults)
        .filter((t) => t.status === 'failed')
      if (exit) {
        assert.equal(failed.length, 1)
        assert(failed[0].failureMessages.every((m) => m.startsWith('AssertionError:')))
      }
    }
  }
  const restored = json('counters-corrected.json')
  assert(restored.sourceRestored && restored.testRestored)
  assert.equal(sha(fs.readFileSync(path.join(root, r.files[0].path))), restored.testSha256)
  assert.equal(sha(raw('counter-candidate.test.ts')), restored.testSha256)
  const sourcePath = 'packages/game/src/core/battle/battle-opcodes.ts',
    source = fs.readFileSync(path.join(root, sourcePath))
  assert.equal(sha(source), restored.sourceSha256)
  assert.equal(
    sha(
      execFileSync('git', ['show', `${r.base}:${sourcePath}`], {
        cwd: root,
        maxBuffer: 2 * 1024 * 1024,
      }),
    ),
    restored.sourceSha256,
  )
  for (const n of ['throw', 'poison-self'])
    assert.equal((raw(`${n}.patch`).toString().match(/^@@/gm) || []).length, 1)
  const ts = createRequire(path.join(root, 'package.json'))('typescript')
  const normalize = (s) => {
    const scan = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, s),
      a = []
    for (;;) {
      const k = scan.scan()
      if (k === ts.SyntaxKind.EndOfFileToken) break
      a.push([k, scan.getTokenText()])
    }
    return JSON.stringify(a)
  }
  const glmPath = r.files[1].path,
    before = execFileSync('git', ['show', `${r.base}:${glmPath}`], { cwd: root, encoding: 'utf8' }),
    after = fs.readFileSync(path.join(root, glmPath), 'utf8')
  const title = (s) =>
    s.replaceAll('script.c:3267-3269 / 3428-3430', 'script.c:3267-3271 / 3428-3432')
  assert.equal(normalize(title(before)), normalize(after), 'GLM test only anchor/title delta')
  for (const id of ['typecheck-final', ...r.staticReceipts]) {
    run(id, 0)
    assert.equal(raw(`${id}.stderr.raw`).length, 0, id)
  }
  console.log(
    JSON.stringify({
      state: 'MATCH',
      files: 2,
      identities: 62,
      renamed: 7,
      validBusinessCounters: 2,
      adjacent: r.gates.adjacent.passed,
      rawEntries: archive.size,
      unified: 'DEFERRED',
    }),
  )
}
