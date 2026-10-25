import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../../../../..')
const report = JSON.parse(fs.readFileSync(path.join(dir, 'review.json')))
const read = (p) => fs.readFileSync(path.join(root, p))
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex')
const pins = [
  ...report.files,
  ...report.deltaOnly,
  ...report.context,
  ...report.inheritedReports,
  report.runtimeTool,
]
const stale = pins.filter((p) => hash(read(p.path)) !== p.sha256)
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', paths: [...new Set(stale.map((p) => p.path))] }))
  process.exitCode = 2
} else {
  function unpack(base, receipt) {
    const compressed = fs.readFileSync(path.join(base, receipt.path))
    assert.equal(hash(compressed), receipt.sha256)
    const archive = JSON.parse(gunzipSync(compressed))
    assert.equal(Object.keys(archive).length, receipt.entries)
    return Object.fromEntries(
      Object.entries(archive).map(([name, item]) => {
        const bytes = Buffer.from(item.base64, 'base64')
        assert.equal(bytes.length, item.bytes, name)
        assert.equal(hash(bytes), item.sha256, name)
        return [name, bytes]
      }),
    )
  }
  const raw = unpack(dir, report.receipts)
  const json = (name) => JSON.parse(raw[name])
  const execution = (id, exit) => {
    const r = json(`${id}.execution.json`)
    assert.equal(r.exit, exit, id)
    assert.equal(r.signal, null, id)
    assert.equal(r.spawnError, null, id)
    assert.equal(raw[`${id}.stdout.raw`].length, r.stdoutBytes, id)
    assert.equal(raw[`${id}.stderr.raw`].length, r.stderrBytes, id)
  }
  const native = (id, passed, failed, count) => {
    execution(id, failed ? 1 : 0)
    const r = json(`${id}.vitest.json`)
    assert.equal(r.numPassedTests, passed, id)
    assert.equal(r.numFailedTests, failed, id)
    assert.equal(r.numPendingTests, 0, id)
    assert.equal(r.testResults.length, count, id)
    if (!failed) {
      assert.equal(raw[`${id}.stderr.raw`].length, 0)
      assert(!/\b(?:stdout|stderr)\s*\|/.test(raw[`${id}.stdout.raw`].toString()))
    } else
      for (const f of r.testResults
        .flatMap((f) => f.assertionResults)
        .filter((f) => f.status === 'failed')) {
        assert(f.failureMessages.length > 0)
        assert(f.failureMessages.every((m) => m.startsWith('AssertionError:')))
      }
    return r.testResults
  }
  const current = native('combined-adjacent', 509, 0, 14)
  const oldReplay = native('old-replay-baseline', 1, 0, 1)
  native('replay-checkpoint-red', 0, 1, 1)
  native('replay-fixed', 1, 0, 1)
  native('search-old', 1, 0, 1)
  native('search-new', 0, 1, 1)
  const restore = json('replay-counter.json')
  assert.equal(restore.sourceRestored, true)
  assert.equal(restore.testRestored, true)
  assert.equal(hash(read('packages/game/src/core/scene-system.ts')), restore.sourceSha256)
  assert.equal(hash(read('packages/game/src/e2e.test.ts')), restore.testSha256)
  assert.equal(
    raw['replay-search.patch']
      .toString()
      .split('\n')
      .filter((l) => l.startsWith('@@')).length,
    1,
  )
  const currentReplay = current.find((f) => f.name.endsWith('/src/e2e.test.ts'))
  assert.deepEqual(
    currentReplay.assertionResults.map((a) => a.fullName),
    oldReplay[0].assertionResults.map((a) => a.fullName),
  )
  for (const id of ['tc-final', 'lint-code-final', 'node-bridges']) {
    execution(id, 0)
    assert.equal(raw[`${id}.stderr.raw`].length, 0, id)
  }
  assert.match(raw['lint-code-final.stdout.raw'].toString(), /0 errors \/ 0 warnings \/ 0 infos/)
  const node = raw['node-bridges.stdout.raw'].toString()
  for (const [k, v] of [
    ['tests', 69],
    ['pass', 69],
    ['fail', 0],
    ['skipped', 0],
    ['cancelled', 0],
  ])
    assert.match(node, new RegExp(`^# ${k} ${v}$`, 'm'))
  const inherited = Object.fromEntries(
    report.inheritedReports.map((p) => [
      path.basename(path.dirname(p.path)),
      JSON.parse(read(p.path)),
    ]),
  )
  for (const [name, r] of Object.entries(inherited)) {
    for (const receipt of r.rawArchive
      ? [r.rawArchive]
      : [r.receipts, ...(r.additionalReceipts ?? [])])
      unpack(path.join(root, 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1', name), receipt)
    for (const f of r.files) assert.deepEqual(Object.keys(f.dimensions), [...'ABCDEFGH'])
  }
  const sceneNames = new Set(
    current
      .filter((f) => /\/core\/scene-(?:system|loading|collision)\.test\.ts$/.test(f.name))
      .flatMap((f) =>
        f.assertionResults.map(
          (a) =>
            `${f.name.split('/type-pal/').at(-1)}\0${[...a.ancestorTitles, a.title].join(' > ')}`,
        ),
      ),
  )
  assert.equal(sceneNames.size, 107)
  const inheritedNames = new Set(
    inherited['scene-quality'].identityMapping.mapping
      .filter((r) => r.after)
      .map((r) => `${r.after.file}\0${r.after.name}`),
  )
  assert.deepEqual(sceneNames, inheritedNames)
  const eventNames = current
    .find((f) => f.name.endsWith('/core/event-system.test.ts'))
    .assertionResults.map((a) => a.fullName)
    .sort()
  assert.deepEqual(
    eventNames,
    inherited['event-quality'].identityMapping.map((r) => r.after).sort(),
  )
  const require = createRequire(import.meta.url)
  const ts = createRequire(path.join(root, 'package.json'))('typescript')
  const { runtime } = require(path.join(root, report.runtimeTool.path))
  const git = (rev, p) =>
    execFileSync('git', ['show', `${rev}:${p}`], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    })
  const edits = json('edits.json'),
    finish = json('finishing.json')
  for (const row of edits.files) {
    let source = git(edits.base, row.path)
    assert.equal(hash(source), row.beforeSha256)
    for (const edit of [...row.edits, ...(row.unusedBusEdits ?? [])]) {
      assert.equal(source.slice(edit.start, edit.end), edit.before)
      source = source.slice(0, edit.start) + edit.text + source.slice(edit.end)
    }
    for (const edit of finish.imports.filter((e) => e.file === row.path))
      source = source.replace(edit.before, edit.after)
    const ast = ts.createSourceFile(row.path, source, ts.ScriptTarget.Latest, true),
      removals = []
    function visit(n) {
      if (ts.isVariableStatement(n) && n.declarationList.declarations.length === 1) {
        const d = n.declarationList.declarations[0],
          line = ast.getLineAndCharacterOfPosition(d.getStart(ast)).line + 1
        if (
          finish.removed.some(
            (e) => e.file === row.path && e.line === line && e.name === d.name.getText(ast),
          )
        )
          removals.push([n.getStart(ast), n.end])
      }
      ts.forEachChild(n, visit)
    }
    visit(ast)
    assert.equal(removals.length, finish.removed.filter((e) => e.file === row.path).length)
    for (const [start, end] of removals.sort((a, b) => b[0] - a[0]))
      source = source.slice(0, start) + source.slice(end)
    const after =
      row.path === 'packages/game/src/e2e.test.ts'
        ? git(report.commits.interface, row.path)
        : read(row.path).toString()
    assert.equal(runtime(source), runtime(after), row.path)
    const bound = report.interfaceProof.rows.find((r) => r.path === row.path)
    assert.equal(hash(after), bound.afterSha256)
    assert.equal(hash(runtime(after)), bound.approvedNormalizedRuntimeSha256)
  }
  const eventPath = 'packages/game/src/core/event-system.ts'
  const priorEvent = inherited['event-quality'].files.find((f) => f.path === eventPath)
  const frozenEvent = git('a82a739f8', eventPath)
  assert.equal(hash(frozenEvent), priorEvent.sha256)
  assert.equal(
    runtime(frozenEvent),
    runtime(read(eventPath).toString()),
    'later event delta is comment-only',
  )
  const priorDependency = inherited['battle-core-fade-quality'].files.find((f) =>
    f.path.endsWith('/dependency-ownership.test.ts'),
  )
  const oldDependency = git('e9930dc06', priorDependency.path)
  assert.equal(hash(oldDependency), priorDependency.sha256)
  const newDependency = oldDependency
    .replace(
      "expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })",
      "expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 101, wPoisonScript: 0 })",
    )
    .replace(
      "expect(gs.rgPoisonStatus['1_0']).toEqual({ wPoisonID: 101, wPoisonScript: 0 })",
      "expect(gs.rgPoisonStatus['1_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })",
    )
  assert.equal(newDependency, read(priorDependency.path).toString(), 'approved Wear delta only')
  const binding = report.retirementBinding
  const previousPolicy = git(binding.baseRevision, binding.path)
  assert.equal(hash(previousPolicy), binding.beforeSha256)
  assert.equal(previousPolicy.split(binding.oldFileSha256).length, 2)
  assert.equal(
    previousPolicy.replace(binding.oldFileSha256, binding.newFileSha256),
    read(binding.path).toString(),
  )
  assert.equal(hash(read('packages/game/src/core/scene-system.test.ts')), binding.newFileSha256)
  execution('retirement-binding', 0)
  assert.equal(raw['retirement-binding.stderr.raw'].length, 0)
  const retirementText = raw['retirement-binding.stdout.raw'].toString()
  assert.match(retirementText, new RegExp(`^# pass ${report.gates.retirementTool.passed}$`, 'm'))
  assert.match(retirementText, /^# fail 0$/m)
  const statics = JSON.parse(fs.readFileSync(path.join(dir, 'static.json')))
  assert.equal(statics.state, 'PASS')
  const staticRaw = unpack(dir, statics.receipts)
  for (const r of statics.checks) {
    const original = JSON.parse(staticRaw[`${r.id}.execution.json`])
    assert.deepEqual(r, original)
    assert.equal(r.exit, 0, r.id)
    assert.equal(r.stderrBytes, 0, r.id)
    assert.equal(staticRaw[`${r.id}.stderr.raw`].length, 0, r.id)
  }
  assert.match(staticRaw['lint-publish.stdout.raw'].toString(), /0 errors \/ 0 warnings \/ 0 infos/)
  assert.match(
    staticRaw['ledger-final.stdout.raw'].toString(),
    /3424 files; 438 closed \/ 97 review \/ 2889 pending/,
  )
  for (const f of report.files) assert.deepEqual(Object.keys(f.dimensions), [...'ABCDEFGH'])
  console.log(
    JSON.stringify({
      state: 'MATCH',
      codeAccepted: report.acceptance.cards,
      reviewedFiles: report.files.length,
      interfaceFiles: edits.files.length,
      adjacent: 509,
      nodeTools: 69,
      sceneIdentities: 107,
      eventIdentities: 324,
      replayCounter: 'old green/new AssertionError',
      unifiedGates: 'DEFERRED',
    }),
  )
}
