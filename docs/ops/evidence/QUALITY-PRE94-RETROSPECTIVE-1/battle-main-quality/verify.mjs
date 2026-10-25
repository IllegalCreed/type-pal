import assert from 'node:assert/strict'
import * as cp from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const dir = path.dirname(fileURLToPath(import.meta.url)),
  root = path.resolve(dir, '../../../../..')
const report = JSON.parse(fs.readFileSync(path.join(dir, 'review.json')))
const ts = createRequire(path.join(root, 'package.json'))('typescript')
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex')
const stale = [...report.files, ...report.context].filter(
  (p) =>
    !fs.existsSync(path.join(root, p.path)) ||
    hash(fs.readFileSync(path.join(root, p.path))) !== p.sha256,
)
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', files: stale.map((p) => p.path) }))
  process.exitCode = 2
} else {
  const before = cp.execFileSync('git', ['show', `${report.base}:${report.files[0].path}`], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    }),
    after = fs.readFileSync(path.join(root, report.files[0].path), 'utf8')
  const parse = (s) => ts.createSourceFile('f.ts', s, ts.ScriptTarget.Latest, true),
    tokens = (s) => {
      const scan = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, s),
        a = []
      for (;;) {
        const k = scan.scan()
        if (k === ts.SyntaxKind.EndOfFileToken) break
        a.push([k, scan.getTokenText()])
      }
      return JSON.stringify(a)
    }
  const fn = (source, name) => {
    const ast = parse(source),
      node = ast.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name)
    assert(node, name)
    return node.getText(ast)
  }
  const js = (s) =>
    ts.transpileModule(s, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        removeComments: true,
      },
    }).outputText
  assert.equal(
    tokens(js(fn(before, 'reviveNumberKeyedMap'))),
    tokens(js(fn(after, 'reviveNumberKeyedMap'))),
    'Map/array/record/empty runtime behavior preserved',
  )
  let guards = 0
  function remainder(source) {
    const ast = parse(source)
    const changed = ts.transform(ast, [
      (context) => (root) => {
        const visit = (n) => {
          if (ts.isFunctionDeclaration(n) && n.name?.text === 'getLearnedSpells') return undefined
          if (
            ts.isIfStatement(n) &&
            tokens(n.expression.getText(ast)) === tokens('!role') &&
            ts.isThrowStatement(n.thenStatement) &&
            n.thenStatement
              .getText(ast)
              .includes("new TypeError('battle: co-op dispatch without a selected role')")
          ) {
            guards++
            return undefined
          }
          return ts.visitEachChild(n, visit, context)
        }
        return ts.visitNode(root, visit)
      },
    ])
    const printed = ts.createPrinter({ removeComments: true }).printFile(changed.transformed[0])
    changed.dispose()
    return tokens(js(printed))
  }
  const a = remainder(before),
    b = remainder(after)
  assert.equal(a, b, 'entire remaining battle runtime')
  assert.equal(guards, 1)
  const publicNames = (source) => {
    const names = []
    for (const n of parse(source).statements) {
      if (ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause))
        names.push(...n.exportClause.elements.map((e) => e.name.text))
      else if (n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (ts.isVariableStatement(n))
          names.push(...n.declarationList.declarations.map((d) => d.name.getText()))
        else if (n.name) names.push(n.name.text)
      }
    }
    return names.sort()
  }
  assert.deepEqual(publicNames(before), publicNames(after))
  const compile = (source, name) => new Function(`${js(fn(source, name))}\nreturn ${name}`)()
  const oldGet = compile(before, 'getLearnedSpells'),
    newGet = compile(after, 'getLearnedSpells'),
    makeRole = compile(fs.readFileSync(path.join(root, report.files[1].path), 'utf8'), 'makeRole')
  const vectors = [
    undefined,
    [],
    [0],
    [296],
    [0, 297, 0, 296],
    Array(32).fill(0),
    Array.from({ length: 32 }, (_, i) => (i % 3 === 0 ? 296 : i % 3 === 1 ? 0 : 297)),
  ]
  for (let id = 296; id <= 397; id++) vectors.push([0, id, 0])
  for (const magic of vectors) {
    const role = makeRole(magic === undefined ? {} : { magic })
    assert(!('learnedSpells' in role))
    assert.deepEqual(oldGet(role), newGet(role))
  }
  const check = cp.spawnSync(
    'rg',
    ['-n', '\\blearnedSpells\\b', 'packages/game/src', '--glob', '*.ts', '--glob', '!*.test.ts'],
    { encoding: 'utf8', cwd: root },
  )
  assert.equal(check.status, 1, check.stdout + check.stderr)
  const continuity = {
    publicNames: publicNames(after),
    runtimeRemainderSha256: hash(a),
    mapNormalizerRuntimeSha256: hash(tokens(js(fn(after, 'reviveNumberKeyedMap')))),
    canonicalExamples: vectors.length,
    canonicalFilter: tokens(js(fn(after, 'getLearnedSpells'))),
    undeclaredFieldProductionReferences: 0,
    cooperativeGuard: {
      count: 1,
      type: 'TypeError',
      scope:
        'Availability-checked valid callers unchanged; missing-role invariant fails explicitly, diagnostic text changed only for corrupted private context.',
    },
    normalization:
      'Only canonical getLearnedSpells and exact one invariant guard excluded; all remaining concrete JS tokens compared, type assertions erased. No opcode/math/RNG/mode masks.',
  }
  assert.deepEqual(continuity, report.continuity)
  for (const f of report.files) assert.deepEqual(Object.keys(f.dimensions), [...'ABCDEFGH'])
  const packed = fs.readFileSync(path.join(dir, report.receipts.path))
  assert.equal(hash(packed), report.receipts.sha256)
  const archive = new Map()
  for (const [name, item] of Object.entries(JSON.parse(gunzipSync(packed)))) {
    const bytes = Buffer.from(item.base64, 'base64')
    assert.equal(bytes.length, item.bytes, name)
    assert.equal(hash(bytes), item.sha256, name)
    archive.set(name, bytes)
  }
  assert.equal(archive.size, report.receipts.entries)
  const raw = (name) => {
      assert(archive.has(name), name)
      return archive.get(name)
    },
    json = (name) => JSON.parse(raw(name))
  const execution = (id, exit) => {
    const r = json(`${id}.execution.json`)
    assert.equal(r.exit, exit, id)
    assert.equal(r.signal, null)
    assert.equal(r.spawnError, null)
    assert.equal(raw(`${id}.stdout.raw`).length, r.stdoutBytes)
    assert.equal(raw(`${id}.stderr.raw`).length, r.stderrBytes)
  }
  for (const [id, count, files] of [
    ['adjacent-final', 266, 8],
    ['cooperative-adjacent', 3, 1],
  ]) {
    execution(id, 0)
    const r = json(`${id}.vitest.json`)
    assert.equal(r.numPassedTests, count)
    assert.equal(r.numFailedTests, 0)
    assert.equal(r.testResults.length, files)
    assert.equal(raw(`${id}.stderr.raw`).length, 0)
    assert(!/\b(?:stdout|stderr)\s*\|/.test(raw(`${id}.stdout.raw`).toString()))
    if (id === 'adjacent-final') assert.equal(r.numPendingTests, 0)
  }
  const mainCases = (id) =>
    json(`${id}.vitest.json`).testResults.find((f) =>
      f.name.endsWith('/__tests__/battle-system.test.ts'),
    ).assertionResults
  const names = (cases) => cases.map((t) => t.fullName).sort()
  assert.equal(mainCases('adjacent-final').length, 186)
  assert.deepEqual(
    names(mainCases('baseline-reused-dialog-adjacent')),
    names(mainCases('adjacent-final')),
  )
  for (const [id, exit] of [
    ['cross-battle-probe-red', 1],
    ['auto-old-oracle-green', 0],
    ['auto-new-oracle-red', 1],
  ]) {
    execution(id, exit)
    const r = json(`${id}.vitest.json`)
    assert.equal(r.numFailedTests, exit)
    assert.equal(r.numPassedTests, exit ? 0 : 1)
    const failed = r.testResults
      .flatMap((f) => f.assertionResults)
      .filter((t) => t.status === 'failed')
    if (exit) {
      assert.equal(failed.length, 1)
      assert(failed[0].failureMessages.every((m) => m.startsWith('AssertionError:')))
    }
  }
  const restored = json('counters.json')
  assert(restored.sourceRestored && restored.testRestored)
  assert.equal(hash(before), restored.sourceSha256)
  assert.equal(hash(raw('counter-candidate.test.ts')), restored.testSha256)
  const changedTitles = new Set([
    'R 跨战斗:gs.prevBattleActions 按 roleId 持久 + 下一场 startBattle 带入',
    'R 跨战斗:队伍缩编且角色换槽后仍重复该角色自己的动作',
    'R 跨战斗:我方单体目标按 roleId 重映射,目标离队则回退到施法者',
  ])
  function unchangedCounterTest(s) {
    const ast = parse(s)
    let removed = 0
    const changed = ts.transform(ast, [
      (ctx) => (rootNode) => {
        const visit = (n) => {
          if (ts.isFunctionDeclaration(n) && n.name?.text === 'finishAtFledBoundary')
            return undefined
          if (
            ts.isExpressionStatement(n) &&
            ts.isCallExpression(n.expression) &&
            n.expression.expression.getText(ast) === 'it' &&
            ts.isStringLiteral(n.expression.arguments[0]) &&
            changedTitles.has(n.expression.arguments[0].text)
          ) {
            removed++
            return undefined
          }
          return ts.visitEachChild(n, visit, ctx)
        }
        return ts.visitNode(rootNode, visit)
      },
    ])
    const result = tokens(
      ts.createPrinter({ removeComments: true }).printFile(changed.transformed[0]),
    )
    changed.dispose()
    assert.equal(removed, 3)
    return result
  }
  assert.equal(
    unchangedCounterTest(raw('counter-candidate.test.ts').toString()),
    unchangedCounterTest(fs.readFileSync(path.join(root, report.files[1].path), 'utf8')),
  )
  for (const id of ['typecheck-input-contract', ...report.staticReceipts]) {
    execution(id, 0)
    assert.equal(raw(`${id}.stderr.raw`).length, 0, id)
  }
  execution('typecheck-final', 2)
  assert.match(raw('typecheck-final.stdout.raw').toString(), /TS18048/)
  console.log(
    JSON.stringify({
      state: 'MATCH',
      files: 2,
      mainIdentities: 186,
      adjacent: 266,
      actualCoopFollowup: 3,
      businessCounters: 2,
      canonicalExamples: continuity.canonicalExamples,
      rawEntries: archive.size,
      unifiedGates: 'DEFERRED',
    }),
  )
}
