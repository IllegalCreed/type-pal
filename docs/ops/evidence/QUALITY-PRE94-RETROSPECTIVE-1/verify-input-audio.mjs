import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { gunzipSync } from 'node:zlib'
import ts from 'typescript'
import { adjustApprovedBaseline } from '../../../../scripts/coverage/approved-baseline-adjustments.mjs'
import { auditScope } from '../../../../scripts/coverage/inventory.mjs'
import { compareCoverage } from '../../../../scripts/coverage/metrics.mjs'

const dir = dirname(fileURLToPath(import.meta.url))
const root = resolve(dir, '../../../..')
const hash = (b) => createHash('sha256').update(b).digest('hex')
const read = (p) => readFileSync(resolve(root, p))
class Stale extends Error {}
function pin(p, sha) {
  if (!existsSync(resolve(root, p))) throw new Stale(`missing ${p}`)
  const b = read(p)
  if (hash(b) !== sha) throw new Stale(`changed ${p}`)
  return b
}
const emit = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      removeComments: true,
    },
  }).outputText
function declarations(source) {
  const ast = ts.createSourceFile('file.ts', source, ts.ScriptTarget.Latest, true)
  const printer = ts.createPrinter({ removeComments: true })
  return ast.statements.map((n) => ({
    name:
      n.name?.text ??
      (ts.isVariableStatement(n) ? n.declarationList.declarations[0]?.name.getText(ast) : null),
    body: printer.printNode(ts.EmitHint.Unspecified, n, ast),
  }))
}
function testCases(source) {
  const ast = ts.createSourceFile('file.ts', source, ts.ScriptTarget.Latest, true)
  const printer = ts.createPrinter({ removeComments: true })
  const cases = {}
  function walk(n) {
    if (
      ts.isCallExpression(n) &&
      ['it', 'test'].includes(n.expression.getText(ast)) &&
      ts.isStringLiteralLike(n.arguments[0])
    ) {
      const title = n.arguments[0].text
      assert(!cases[title], title)
      cases[title] = printer.printNode(ts.EmitHint.Unspecified, n, ast)
    }
    ts.forEachChild(n, walk)
  }
  walk(ast)
  return cases
}
try {
  const r = JSON.parse(
    read('docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/input-audio-closeout.json'),
  )
  const archive = pin(r.artifact.path, r.artifact.sha256)
  const members = JSON.parse(gunzipSync(archive)).members
  assert.deepEqual(Object.keys(members).sort(), r.artifact.members.map((m) => m.name).sort())
  for (const m of r.artifact.members) {
    assert.equal(Buffer.byteLength(members[m.name]), m.bytes, m.name)
    assert.equal(hash(members[m.name]), m.sha256, m.name)
  }
  for (const f of r.files) {
    pin(f.path, f.sha256)
    for (const a of 'ABCDEFGH') assert(f.dimensions[a], `${f.path}:${a}`)
  }
  for (const f of [...r.bindings, ...r.reuseAssets]) {
    if (f.sha256 === null) {
      if (existsSync(resolve(root, f.path))) throw new Stale(`retired path reappeared ${f.path}`)
    } else pin(f.path, f.sha256)
  }
  const old = (p) =>
    execFileSync('git', ['show', `${r.base}:${p}`], { cwd: root, encoding: 'utf8' })
  const shell = 'packages/game/src/shell/'
  const active = declarations(old(`${shell}audio.ts`)).filter(
    (n) => !r.proof.removedNodes.includes(n.name),
  )
  assert.deepEqual(active, declarations(read(`${shell}audio.ts`).toString()))
  for (const f of r.proof.commentsOnly)
    assert.equal(emit(old(f.path)), emit(read(f.path).toString()))
  assert.equal(
    emit(
      old(`${shell}bootstrap.ts`)
        .replace('  setOggVolumeScale,\n', '')
        .replace('      setOggVolumeScale(v)\n', ''),
    ),
    emit(read(`${shell}bootstrap.ts`).toString()),
  )
  for (const m of r.proof.unchangedTestCases) {
    const before = testCases(old(m.path))
    const after = testCases(read(m.path).toString())
    for (const title of m.kept) assert.equal(before[title], after[title], title)
    assert.deepEqual(
      Object.keys(before).filter((k) => !after[k]),
      m.removed,
    )
    assert.deepEqual(
      Object.keys(after).filter((k) => !before[k]),
      m.added,
    )
  }
  for (const name of ['ReplayInputSource', 'RecordingInputSource', 'CODE_MAP', 'codeToAbstractKey'])
    assert.deepEqual(
      declarations(old(`${shell}input.ts`)).find((n) => n.name === name),
      declarations(read(`${shell}input.ts`).toString()).find((n) => n.name === name),
    )
  const midi = read(`${shell}audio-midi.ts`)
    .toString()
    .replace(
      "import { type MusicBackend, musicUrl } from './audio.js'",
      "import type { MusicBackend } from './audio.js'",
    )
    .replace(
      'const url = musicUrl(baseUrl, track)',
      old(`${shell}audio-midi.ts`).match(/const url = [^\n]+/)[0],
    )
  assert.equal(emit(old(`${shell}audio-midi.ts`)), emit(midi))
  function execution(id, exit = 0) {
    const e = JSON.parse(members[`${id}.execution.json`])
    assert.equal(e.exit, exit, id)
    assert.equal(e.signal, null, id)
    assert.equal(e.spawnError, null, id)
    for (const stream of ['stdout', 'stderr']) {
      assert.equal(Buffer.byteLength(members[e[stream].member]), e[stream].bytes, id)
      assert.equal(hash(members[e[stream].member]), e[stream].sha256, id)
    }
    return e
  }
  for (const [id, pass, fail] of [
    ['input-red', 17, 3],
    ['input-green', 34, 0],
    ['audio-retirement-green', 52, 0],
    ['midi-url-green', 39, 0],
    ['adjacent-input-audio', 157, 0],
  ]) {
    const n = JSON.parse(members[`${id}.native.json`])
    assert.equal(n.numPassedTests, pass, id)
    assert.equal(n.numFailedTests, fail, id)
    assert.equal(n.numPendingTests, 0, id)
    execution(id, fail ? 1 : 0)
    const failed = n.testResults.flatMap((f) =>
      f.assertionResults.filter((t) => t.status === 'failed'),
    )
    for (const t of failed)
      assert(
        t.failureMessages.some((m) => m.includes('AssertionError')),
        t.fullName,
      )
    if (fail)
      assert.deepEqual(failed.map((t) => t.title).sort(), r.proof.inputAdditions.slice().sort())
  }
  const nativeC = JSON.parse(members['input-direction-cases.json'])
  const primary = read('reference/sdlpal/input.c').toString()
  const block = primary.slice(
    primary.indexOf('static INT\nPAL_GetCurrDirection('),
    primary.indexOf('static VOID\nPAL_UpdateKeyboardState('),
  )
  assert.equal(hash(block), nativeC.blockSha256)
  assert(members['input-direction-cases.c'].includes(block))
  assert.deepEqual(JSON.parse(members['input-direction-cases.stdout.raw']), nativeC.actual)
  assert.deepEqual(nativeC.actual, {
    keyupRight: 1,
    keydownUp: 2,
    repeat: 4,
    nonDirection: 4,
    keyupUnheldUp: 3,
  })
  const observed = members['input-browser-final.ax.raw']
  assert(observed.includes('"success": true') && observed.includes('"walking": true'))
  assert.deepEqual(JSON.parse(members['input-browser-console.json']), [])
  pin(r.browser.screenshot.path, r.browser.screenshot.sha256)
  assert.deepEqual(
    declarations(members[r.publicTypeCommentProof.beforeMember]),
    declarations(read(r.publicTypeCommentProof.path).toString()),
  )
  const c = r.centralDiagnostics
  const centralSource = pin(c.path, c.sha256).toString()
  assert.equal(
    centralSource,
    members['ImageTab-final.tsx'].replaceAll('      await Promise.resolve()\n', ''),
  )
  assert.deepEqual(Object.keys(testCases(old(c.path))), Object.keys(testCases(centralSource)))
  const counter = JSON.parse(members[`${c.counter.id}.native.json`])
  assert.equal(counter.numFailedTests, 1)
  assert.equal(counter.numPassedTests, 0)
  assert.equal(counter.numPendingTests, 2)
  execution(c.counter.id, 1)
  const failure = counter.testResults
    .flatMap((f) => f.assertionResults)
    .find((t) => t.status === 'failed')
  assert(
    failure.failureMessages.some((m) =>
      /^AssertionError: expected <dialog[^\n]+to be null\n/.test(m),
    ),
    'cancel counter must fail because the real dialog remains open',
  )
  assert(
    stripVTControlCharacters(members[`${c.counter.id}.stderr.raw`]).includes(
      "expect(document.querySelector('dialog[open]')).toBeNull()",
    ),
  )
  const production = read(c.counter.production).toString()
  const counterExecution = JSON.parse(members[`${c.counter.id}.execution.json`])
  assert.equal(
    counterExecution.codeChanges.find((f) => f.path === c.counter.production).sha256,
    hash(production.replace(c.counter.find, c.counter.replace)),
  )
  const green = JSON.parse(members[`${c.green}.native.json`])
  assert.equal(green.numPassedTests, 36)
  assert.equal(green.numFailedTests, 0)
  assert.equal(green.numPendingTests, 0)
  assert.equal(execution(c.green).stderr.bytes, 0)
  const png = Buffer.from(centralSource.match(/atob\(\s*'([^']+)'/)[1], 'base64')
  const decoded = JSON.parse(members['image-png-proof.stdout.raw'])
  assert.equal(decoded.sha256, hash(png))
  assert.equal(decoded.bytes, 71)
  assert.equal(decoded.width, 2)
  assert.equal(decoded.height, 2)
  assert.equal(execution('image-png-proof').stderr.bytes, 0)
  if (process.argv.includes('--local'))
    console.log(
      'LOCAL MATCH: seven explicit file reviews,three chronological business reds,approved OGG retirement and unchanged active bodies;no gate acceptance implied',
    )
  else if (r.status !== 'accepted') {
    console.log('INCOMPLETE: local evidence matches; unified closure pending')
    process.exitCode = 3
  } else {
    const changed = execFileSync(
      'git',
      ['diff', '--name-only', r.base, '--', 'packages', 'scripts'],
      { cwd: root, encoding: 'utf8' },
    )
      .trim()
      .split('\n')
      .filter(Boolean)
      .sort()
    if (JSON.stringify(changed) !== JSON.stringify(r.sourceBindings.map((f) => f.path).sort()))
      throw new Stale('gate code change set differs')
    for (const f of r.sourceBindings) {
      if (f.sha256 === null) assert(!existsSync(resolve(root, f.path)))
      else pin(f.path, f.sha256)
    }
    for (const role of ['check', 'ratchet-protected', 'docs', 'lint', 'ledger', 'diff'])
      assert(
        r.runs.some((run) => run.role === role),
        role,
      )
    for (const run of r.runs) {
      const e = execution(run.id)
      assert.equal(e.stderr.bytes, 0, run.id)
      assert(
        Object.values(run.diagnostics).every((n) => n === 0),
        run.id,
      )
      assert(
        !/not wrapped in act\(|not configured to support act|\bWarning:|\[warn(?:ing)?\]|error TS\d+|Unhandled (?:Error|Rejection)|^\s*stderr \|/im.test(
          stripVTControlCharacters(members[e.stdout.member]),
        ),
        run.id,
      )
      for (const f of r.sourceBindings.filter(
        (f) => f.path !== 'scripts/coverage/baseline.fast.json',
      )) {
        const captured = e.codeChanges.find((c) => c.path === f.path)
        const actual = captured
          ? captured.sha256
          : hash(execFileSync('git', ['show', `${e.head}:${f.path}`], { cwd: root }))
        if (actual !== f.sha256) {
          const allowed = r.gateCommentOnlyDelta?.find(
            (d) =>
              d.run === run.id &&
              d.path === f.path &&
              d.beforeSha256 === actual &&
              d.afterSha256 === f.sha256,
          )
          assert(allowed, `${run.id} ${f.path}`)
          assert.equal(emit(members[allowed.beforeMember]), emit(read(f.path).toString()))
        }
      }
    }
    const oldBaseline = JSON.parse(old('scripts/coverage/baseline.fast.json'))
    const adjusted = await adjustApprovedBaseline(oldBaseline, read)
    assert.deepEqual(adjusted.applied, [r.coverageAdjustment.approval.id])
    const baseline = JSON.parse(read('scripts/coverage/baseline.fast.json'))
    for (const id of ['module-final-coverage']) {
      const actual = JSON.parse(members[`${id}.coverage-summary.json`])
      assert.deepEqual(compareCoverage(actual, adjusted.baseline).regressions, [])
      assert.deepEqual(actual.total, baseline.total)
      assert.deepEqual(auditScope(actual, baseline).changes, [])
      assert.deepEqual(
        Object.keys(actual.packages).sort(),
        Object.keys(oldBaseline.packages).sort(),
      )
      const e = execution(id)
      assert.equal(e.environment.TYPE_PAL_COVERAGE_BASE_REF, 'origin/main')
      assert(e.args.includes('--allow-scope-removal'))
      assert.equal(e.role, 'ratchet-protected')
      for (const [name, pkg] of Object.entries(baseline.packages)) {
        assert.deepEqual(actual.packages[name].metrics, pkg.metrics, name)
        assert.deepEqual(actual.packages[name].sourceFiles, pkg.sourceFiles, name)
        assert.deepEqual(
          actual.packages[name].fastTests.fileEntries,
          pkg.fastTests.fileEntries,
          name,
        )
      }
    }
    const adjustmentPath = 'scripts/coverage/approved-baseline-adjustments.mjs'
    const fn = (source) => declarations(source).find((n) => n.name === 'adjustApprovedBaseline')
    assert.deepEqual(fn(old(adjustmentPath)), fn(read(adjustmentPath).toString()))
    const retirementPath = 'scripts/coverage/approved-test-retirements.mjs'
    const predicate = (source) =>
      declarations(source).find((n) => n.name === 'isApprovedTestRetirement')
    assert.deepEqual(predicate(old(retirementPath)), predicate(read(retirementPath).toString()))
    const queue = JSON.parse(read('docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.json'))
    for (const id of r.cards) assert(queue.cards.some((c) => c.id === id && c.currentAcceptance))
    console.log(
      'MATCH: CODE73/74 explicit seven-file acceptance and full zero-diagnostic module gates; readonly,no test/coverage rerun',
    )
  }
} catch (error) {
  const location = error.stack
    ?.split('\n')
    .find((line) => /verify-input-audio\.mjs:\d+/.test(line))
    ?.trim()
  console.error(
    `${error instanceof Stale ? 'STALE' : 'FAIL'}: ${error.message}${location ? `\n${location}` : ''}`,
  )
  process.exitCode = error instanceof Stale ? 2 : 1
}
