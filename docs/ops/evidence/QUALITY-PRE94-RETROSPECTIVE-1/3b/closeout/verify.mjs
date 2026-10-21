// Read-only fingerprints, original results and identity mapping; not a design certificate.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import ts from 'typescript'

const dir = dirname(fileURLToPath(import.meta.url))
const root = resolve(dir, '../../../../../..')
const read = (p) => fs.readFileSync(resolve(root, p))
const hash = (b) => createHash('sha256').update(b).digest('hex')
const gitRead = (revision, p) => execFileSync('git', ['show', `${revision}:${p}`], { cwd: root })
try {
  const r = JSON.parse(fs.readFileSync(resolve(dir, 'evidence.json'), 'utf8'))
  for (const f of [...r.files, ...r.pins, ...r.priorEvidence, ...r.tools]) {
    assert.equal(
      hash(f.revision ? gitRead(f.revision, f.path) : read(f.path)),
      f.sha256,
      `STALE ${f.path}`,
    )
  }
  const packed = read(r.artifact.path)
  assert.equal(hash(packed), r.artifact.sha256, 'archive')
  const { members } = JSON.parse(gunzipSync(packed))
  assert.deepEqual(Object.keys(members).sort(), r.artifact.members.map((m) => m.name).sort())
  for (const m of r.artifact.members) {
    assert.equal(Buffer.byteLength(members[m.name]), m.bytes, m.name)
    assert.equal(hash(members[m.name]), m.sha256, m.name)
  }
  for (const entry of r.relatedReviews ?? []) {
    assert.equal(hash(read(entry.path)), entry.sha256, `STALE review ${entry.path}`)
    const review = JSON.parse(read(entry.path))
    for (const f of review.files) {
      assert.equal(hash(read(f.path)), f.sha256, `STALE related source ${f.path}`)
      assert.deepEqual(Object.keys(f.dimensions).sort(), [...'ABCDEFGH'])
    }
    if (review.fixtureSource)
      assert.equal(hash(read(review.fixtureSource.path)), review.fixtureSource.sha256)
    if (review.context) assert.equal(hash(read(review.context.path)), review.context.sha256)
  }
  for (const [id, passed, failed] of [
    ['png-missing-before', 13, 0],
    ['png-missing-final', 12, 1],
    ['manifest-before', 6, 0],
    ['manifest-after', 5, 1],
    ['host-no-wait', 2, 1],
    ['host-no-wait-r3', 2, 1],
  ]) {
    const n = JSON.parse(members[`${id}.native.json`])
    assert.equal(n.numPassedTests, passed, id)
    assert.equal(n.numFailedTests, failed, id)
    assert.equal(n.numPendingTests, 0, id)
    for (const f of n.testResults)
      for (const t of f.assertionResults.filter((t) => t.status === 'failed'))
        assert(t.failureMessages[0].startsWith('AssertionError:'), id)
  }
  const proof = JSON.parse(members['annotation-refactor-proof.json'])
  assert.equal(proof.status, 'MATCH')
  assert.equal(hash(read(proof.path)), proof.afterSha256)
  assert.equal(hash(gitRead(proof.base, proof.path)), proof.beforeSha256)
  const children = [
    'cli-error-exits.kimi-r1.test.ts.children.json',
    'cli-isolated.glm-q.test.ts.children.json',
    'cli-font-lookup.glm-q.test.ts.children.json',
  ]
  for (let i = 0; i < children.length; i++) {
    const capture = JSON.parse(members[children[i]])
    const executions = Array.isArray(capture) ? capture : capture.executions
    assert.equal(executions.length, [9, 6, 2][i], children[i])
    for (const e of executions) {
      assert.equal(e.signal, null)
      assert.equal(typeof e.stdout, 'string')
      assert.equal(typeof e.stderr, 'string')
    }
  }
  const overlay = JSON.parse(members['host-overlay-proof.json'])
  assert.equal(hash(read(overlay.path)), overlay.currentSha256)
  assert.equal(hash(members[overlay.beforeSourceMember]), overlay.beforeGlobalCheckSha256)
  const oldSource = ts.createSourceFile(
    'x.ts',
    members[overlay.beforeSourceMember],
    ts.ScriptTarget.Latest,
    true,
  )
  const currentSource = ts.createSourceFile(
    'x.ts',
    read(overlay.path).toString(),
    ts.ScriptTarget.Latest,
    true,
  )
  const matcherPrinter = ts.createPrinter({ removeComments: true })
  function matchers(ast) {
    const result = []
    function rootOf(n) {
      while (ts.isCallExpression(n) || ts.isPropertyAccessExpression(n)) n = n.expression
      return ts.isIdentifier(n) ? n.text : null
    }
    function visit(n) {
      if (
        ts.isCallExpression(n) &&
        ts.isPropertyAccessExpression(n.expression) &&
        rootOf(n) === 'expect'
      )
        result.push(matcherPrinter.printNode(ts.EmitHint.Unspecified, n, ast))
      ts.forEachChild(n, visit)
    }
    visit(ast)
    return result.sort()
  }
  assert.deepEqual(matchers(oldSource), matchers(currentSource))
  assert.equal(matchers(currentSource).length, overlay.assertionsPreserved)
  const cancellation = JSON.parse(members['host-cancel.proof.json'])
  assert.equal(cancellation.sourceSha256, overlay.currentSha256)
  assert(cancellation.treeRemoved && cancellation.childGone)
  assert.equal(cancellation.timeoutUnchanged, 5000)
  if (r.gateSourceChanges) {
    const paths = execFileSync(
      'git',
      ['diff', '--name-only', r.base, '--', 'packages', 'scripts'],
      { cwd: root, encoding: 'utf8' },
    )
      .trim()
      .split('\n')
      .filter(Boolean)
      .sort()
    assert.deepEqual(
      paths,
      r.gateSourceChanges.map((f) => f.path).sort(),
      'global gate source set drift',
    )
    for (const f of r.gateSourceChanges)
      assert.equal(hash(read(f.path)), f.sha256, `global gate source drift: ${f.path}`)
  }
  for (const f of r.finalStateBindings ?? []) assert.equal(hash(read(f.path)), f.sha256, f.path)
  if (r.cards) {
    const cards = JSON.parse(read('docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.json'))
    assert.deepEqual(cards.currentReviewCounts, r.cards)
    assert.equal(cards.cards.filter((c) => c.currentReview === 'accept').length, r.cards.accept)
    for (const id of ['3b', '3d', '3f'])
      assert.equal(cards.cards.find((c) => c.id === id).currentAcceptance, true)
    assert.equal(cards.cards.find((c) => c.id === '3g').currentReview, 'partial')
  }
  const identities = (n) =>
    n.testResults
      .flatMap((f) => f.assertionResults.map((t) => `${f.name.split('/').at(-1)}::${t.fullName}`))
      .sort()
  for (const run of r.runs) {
    const e = JSON.parse(members[`${run.id}.execution.json`])
    assert.equal(e.exit, run.exit, run.id)
    assert.equal(e.signal, null, run.id)
    assert.equal(e.spawnError, null, run.id)
    for (const stream of ['stdout', 'stderr'])
      assert.equal(hash(members[e[stream].member]), e[stream].sha256, run.id)
    if (run.passed === undefined) continue
    const n = JSON.parse(members[`${run.id}.native.json`])
    assert.equal(n.numPassedTests, run.passed, run.id)
    assert.equal(n.numFailedTests, run.failed, run.id)
    assert.equal(n.numPendingTests, 0, run.id)
    const failed = n.testResults.flatMap((f) =>
      f.assertionResults
        .filter((t) => t.status === 'failed')
        .map((t) => {
          if (run.id === 'host-cancel')
            assert.match(members['host-cancel.stderr.raw'], /Error: Test timed out in 5000ms/)
          else assert(t.failureMessages[0]?.startsWith('AssertionError:'), run.id)
          return { file: f.name, fullName: t.fullName }
        }),
    )
    assert.deepEqual(failed, run.failures, run.id)
  }
  const before = JSON.parse(members['before.native.json'])
  const restored = JSON.parse(members['restore.native.json'])
  const oldIds = identities(before)
  const newIds = identities(restored)
  assert.equal(oldIds.length, 13)
  assert.equal(newIds.length, 14)
  assert(oldIds.every((id) => newIds.includes(id)))
  assert.deepEqual(
    newIds.filter((id) => !oldIds.includes(id)),
    r.identityMapping.addedFileFullNames,
  )
  // Preserve every old assertion; only the named new test is removed for this comparison.
  const title = '解析后的结构数组独立于输入；字节码借用原输入的精确范围'
  const counterNative = JSON.parse(members['ownership-mutant.native.json'])
  assert.equal(counterNative.numPassedTests, 13)
  assert.equal(counterNative.numFailedTests, 1)
  const counterFailures = counterNative.testResults.flatMap((f) =>
    f.assertionResults.filter((t) => t.status === 'failed'),
  )
  assert.equal(counterFailures.length, 1)
  assert(counterFailures[0].fullName.endsWith(title))
  const source = read(r.counter.path).toString()
  assert.equal(source.split(r.counter.needle).length, 2)
  assert.equal(
    hash(source.replace(r.counter.needle, r.counter.replacement)),
    r.counter.mutantSha256,
  )
  const printer = ts.createPrinter({ removeComments: true })
  const ast = (s) => ts.createSourceFile('x.ts', s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const fixture = r.postFullCheckCommentOnly.path
  assert.equal(
    printer.printFile(ast(read(fixture).toString())),
    printer.printFile(ast(gitRead(r.base, fixture).toString())),
    'fixture comments changed after full check; executable body must remain equal',
  )
  for (const f of r.files.filter((f) => !f.path.endsWith('/sss.ts'))) {
    let current = ast(read(f.path).toString())
    if (f.path.endsWith('/sss.boundaries.test.ts')) {
      let removed = 0
      const result = ts.transform(current, [
        (context) => {
          const visit = (node) => {
            if (
              ts.isExpressionStatement(node) &&
              ts.isCallExpression(node.expression) &&
              ts.isIdentifier(node.expression.expression) &&
              node.expression.expression.text === 'test' &&
              ts.isStringLiteral(node.expression.arguments[0]) &&
              node.expression.arguments[0].text === title
            ) {
              removed++
              return undefined
            }
            return ts.visitEachChild(node, visit, context)
          }
          return (node) => ts.visitNode(node, visit)
        },
      ])
      current = result.transformed[0]
      assert.equal(removed, 1)
      result.dispose()
    }
    assert.equal(
      printer.printFile(current),
      printer.printFile(ast(gitRead(r.base, f.path).toString())),
      f.path,
    )
  }
  // Historical mutation records are checked at their exact source/test snapshots.
  for (const group of r.historicalProofs) {
    const proof = JSON.parse(read(group.path))
    const folder = dirname(group.path)
    for (const run of proof.runs) {
      for (const [suffix, shaKey] of [
        ['raw.gz', 'rawSha256'],
        ['runner.json.gz', 'runnerSha256'],
      ]) {
        const bytes = gunzipSync(read(`${folder}/${proof.phase}-${run.name}.${suffix}`))
        assert.equal(hash(bytes), run[shaKey], `${group.path} ${run.name}`)
      }
      const n = JSON.parse(gunzipSync(read(`${folder}/${proof.phase}-${run.name}.runner.json.gz`)))
      assert.equal(n.numPassedTests, run.passed)
      assert.equal(n.numFailedTests, run.failed)
      assert.equal(n.numPendingTests, 0)
    }
  }
  const oracle = JSON.parse(members['raw-oracle-recheck.json'])
  assert.deepEqual(oracle.result, JSON.parse(read(r.rawOraclePath)))
  for (const [key, gate] of Object.entries(r.gates)) {
    if (key === 'state' || !gate.id) continue
    const e = JSON.parse(members[`${gate.id}.execution.json`])
    const scan = JSON.parse(members[`${gate.id}.diagnostics.json`])
    assert.equal(e.exit, 0, key)
    assert.equal(e.stderr.bytes, 0, key)
    assert(
      Object.values(scan.diagnostics).every((n) => n === 0),
      key,
    )
    if (gate.tests) assert.equal(scan.vitestTotal, gate.tests, key)
  }
  assert.equal(hash(read(r.counter.path)), r.counter.beforeSha256)
  if (r.baseline) assert.equal(hash(read(r.baseline.path)), r.baseline.sha256, 'STALE baseline')
  console.log(
    JSON.stringify({
      status: r.gates.state === 'passed' ? 'MATCH' : 'MATCH_GATES_PENDING',
      files: r.files.length,
      relatedReviewedFiles: r.relatedReviews?.length ?? 0,
      acceptedFiles: r.acceptance?.acceptedFiles.length ?? 0,
      scope:
        'Fingerprints, complete raw/native identities, unchanged old test AST, historical frozen receipts; no tests, compiler, mutation, writes, network or semantic certification.',
    }),
  )
} catch (error) {
  console.error(error.code === 'ENOENT' ? `MISSING: ${error.message}` : error.message)
  process.exitCode = 1
}
