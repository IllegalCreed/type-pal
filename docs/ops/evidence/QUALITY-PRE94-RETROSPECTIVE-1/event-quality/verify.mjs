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
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const report = JSON.parse(fs.readFileSync(path.join(dir, 'review.json')))
const stale = [
  ...report.files,
  ...report.context,
  ...report.primary,
  ...report.bridgeSceneMembers,
].filter(
  (pin) =>
    !fs.existsSync(path.join(root, pin.path)) ||
    hash(fs.readFileSync(path.join(root, pin.path))) !== pin.sha256,
)
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', affected: stale.map((pin) => pin.path) }))
  process.exitCode = 2
} else {
  for (const file of report.files) assert.deepEqual(Object.keys(file.dimensions), [...'ABCDEFGH'])
  const packed = fs.readFileSync(path.join(dir, report.rawArchive.path))
  assert.equal(hash(packed), report.rawArchive.sha256)
  const archive = new Map()
  for (const [name, item] of Object.entries(JSON.parse(gunzipSync(packed)))) {
    const bytes = Buffer.from(item.base64, 'base64')
    assert.equal(bytes.length, item.bytes, name)
    assert.equal(hash(bytes), item.sha256, name)
    archive.set(name, bytes)
  }
  assert.equal(archive.size, report.rawArchive.entries)
  const raw = (name) => {
    assert(archive.has(name), name)
    return archive.get(name)
  }
  const json = (name) => JSON.parse(raw(name))
  const execution = (id, exit) => {
    const result = json(`${id}.execution.json`)
    assert.equal(result.exit, exit, id)
    assert.equal(result.signal, null)
    assert.equal(result.spawnError, null)
    assert.equal(raw(`${id}.stdout.raw`).length, result.stdoutBytes)
    assert.equal(raw(`${id}.stderr.raw`).length, result.stderrBytes)
  }
  const native = (id, passed, failed, pending, files) => {
    execution(id, failed ? 1 : 0)
    const result = json(`${id}.vitest.json`)
    assert.equal(result.numPassedTests, passed)
    assert.equal(result.numFailedTests, failed)
    assert.equal(result.numPendingTests, pending)
    assert.equal(result.numTodoTests, 0)
    assert.equal(result.testResults.length, files)
    const cases = result.testResults.flatMap((file) => file.assertionResults)
    const failures = cases.filter((test) => test.status === 'failed')
    assert.equal(failures.length, failed)
    for (const item of failures) {
      assert(item.failureMessages.length > 0)
      assert(item.failureMessages.every((message) => message.startsWith('AssertionError:')))
    }
    if (!failed) {
      assert.equal(raw(`${id}.stderr.raw`).length, 0)
      assert(!/\b(?:stdout|stderr)\s*\|/.test(raw(`${id}.stdout.raw`).toString()))
    }
    return cases
  }
  native('refactor-baseline', 324, 0, 0, 1)
  native('adjacent-restored', 546, 0, 0, 18)
  const current = native('main-oracle-final', 324, 0, 0, 1)
  const original = json('baseline-reused-adjacent.vitest.json').testResults.find((file) =>
    file.name.endsWith('/event-system.test.ts'),
  ).assertionResults
  const mapping = report.identityMapping
  assert.equal(mapping.length, 324)
  assert.deepEqual(
    mapping.map((row) => row.before).sort(),
    original.map((test) => test.fullName).sort(),
  )
  assert.deepEqual(
    mapping.map((row) => row.after).sort(),
    current.map((test) => test.fullName).sort(),
  )
  assert.equal(mapping.filter((row) => row.before !== row.after).length, 2)
  for (const id of ['end-return', 'raw-operands', 'dialog-ownership']) {
    native(`final-${id}-old`, 1, 0, 323, 1)
    const failures = native(`final-${id}-new`, 0, 1, 323, 1).filter(
      (test) => test.status === 'failed',
    )
    assert.equal(
      failures[0].fullName,
      report.counters.find((row) => row.counter === `final-${id}` && row.phase === 'new').failed[0]
        .fullName,
    )
    assert.equal(
      raw(`final-${id}.patch`)
        .toString()
        .split('\n')
        .filter((line) => line.startsWith('@@')).length,
      1,
    )
  }
  for (const [id, count] of [
    ['e2e-tools-restored', 80],
    ['meal-format-final', 2],
  ]) {
    execution(id, 0)
    assert.equal(raw(`${id}.stderr.raw`).length, 0)
    const text = raw(`${id}.stdout.raw`).toString()
    for (const [key, value] of [
      ['tests', count],
      ['pass', count],
      ['fail', 0],
      ['skipped', 0],
      ['cancelled', 0],
    ])
      assert.match(text, new RegExp(`^# ${key} ${value}$`, 'm'))
  }
  execution('meal-dispatch-valid-input-red', 1)
  assert.match(raw('meal-dispatch-valid-input-red.stdout.raw').toString(), /name: 'AssertionError'/)
  assert.match(
    raw('meal-dispatch-valid-input-red.stdout.raw').toString(),
    /Cannot access 'itemId' before initialization/,
  )
  for (const id of report.finalStaticReceipts) {
    execution(id, 0)
    assert.equal(raw(`${id}.stderr.raw`).length, 0, id)
  }
  assert.match(raw('lint-final.stdout.raw').toString(), /0 errors \/ 0 warnings \/ 0 infos/)
  assert.match(
    raw('ledger-final.stdout.raw').toString(),
    /3423 files; 414 closed \/ 118 review \/ 2891 pending/,
  )
  assert.match(raw('docs-consumers-final.stdout.raw').toString(), /0 issues/)
  assert.match(raw('testing-consumer-corrected.stdout.raw').toString(), /0 issues/)
  assert.equal(raw('diff-final.stdout.raw').length, 0)
  const ts = createRequire(path.join(root, 'package.json'))('typescript')
  const parse = (text) => ts.createSourceFile('file.ts', text, ts.ScriptTarget.Latest, true)
  const tokens = (text) => {
    const scanner = ts.createScanner(
        ts.ScriptTarget.Latest,
        true,
        ts.LanguageVariant.Standard,
        text,
      ),
      values = []
    for (;;) {
      const kind = scanner.scan()
      if (kind === ts.SyntaxKind.EndOfFileToken) break
      values.push([kind, scanner.getTokenText()])
    }
    return JSON.stringify(values)
  }
  const core = path.join(root, 'packages/game/src/core')
  for (const name of ['event-system.ts', 'event-system.test.ts'])
    assert.equal(
      raw(`${name}.before`).toString(),
      execFileSync('git', ['show', `${report.base}:packages/game/src/core/${name}`], {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
      }),
    )
  const before = raw('event-system.ts.before').toString(),
    after = fs.readFileSync(path.join(core, 'event-system.ts'), 'utf8')
  const body = (text, name) => {
    const ast = parse(text),
      fn = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name)
    assert(fn, name)
    return tokens(fn.body.getText(ast))
  }
  for (const move of report.continuity.moves) {
    const previous = body(before, move.name)
    assert.equal(hash(previous), move.bodyTokensSha256)
    assert.equal(body(fs.readFileSync(path.join(core, move.file), 'utf8'), move.name), previous)
  }
  const names = report.continuity.moves.map((move) => move.name)
  const publicNames = (text) => {
    const out = []
    for (const node of parse(text).statements) {
      if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause))
        out.push(...node.exportClause.elements.map((entry) => entry.name.text))
      else if (node.modifiers?.some((entry) => entry.kind === ts.SyntaxKind.ExportKeyword)) {
        if (ts.isVariableStatement(node))
          out.push(...node.declarationList.declarations.map((entry) => entry.name.getText()))
        else if (node.name) out.push(node.name.text)
      }
    }
    return out.sort()
  }
  assert.deepEqual(publicNames(before), publicNames(after))
  assert.equal(publicNames(after).length, 185)
  let parameters = 0,
    args = 0,
    voids = 0
  const normalize = (text) => {
    const ast = parse(text)
    const transformed = ts.transform(ast, [
      (context) => (node) => {
        const visit = (item) => {
          if (ts.isImportDeclaration(item) || ts.isExportDeclaration(item)) return undefined
          if (ts.isFunctionDeclaration(item) && names.includes(item.name?.text)) return undefined
          if (
            ts.isFunctionDeclaration(item) &&
            item.name?.text === 'jumpToGlobalIp' &&
            item.parameters[0]?.name.getText(ast) === 'gs'
          ) {
            parameters++
            item = ts.factory.updateFunctionDeclaration(
              item,
              item.modifiers,
              item.asteriskToken,
              item.name,
              item.typeParameters,
              item.parameters.slice(1),
              item.type,
              item.body,
            )
          }
          if (
            ts.isExpressionStatement(item) &&
            ts.isVoidExpression(item.expression) &&
            ts.isIdentifier(item.expression.expression) &&
            item.expression.expression.text === 'gs'
          ) {
            voids++
            return undefined
          }
          if (
            ts.isCallExpression(item) &&
            ts.isIdentifier(item.expression) &&
            item.expression.text === 'jumpToGlobalIp' &&
            item.arguments.length === 3
          ) {
            assert.equal(item.arguments[0].getText(ast), 'gs')
            args++
            item = ts.factory.updateCallExpression(
              item,
              item.expression,
              item.typeArguments,
              item.arguments.slice(1),
            )
          }
          return ts.visitEachChild(item, visit, context)
        }
        return ts.visitNode(node, visit)
      },
    ])
    const printed = ts.createPrinter({ removeComments: true }).printFile(transformed.transformed[0])
    transformed.dispose()
    return tokens(
      ts.transpileModule(printed, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          removeComments: true,
        },
      }).outputText,
    )
  }
  const oldRuntime = normalize(before),
    newRuntime = normalize(after)
  assert.equal(oldRuntime, newRuntime)
  assert.equal(hash(oldRuntime), report.continuity.remainder.runtimeTokensSha256)
  assert.deepEqual([parameters, args, voids], [1, 19, 1])
  for (const file of ['event-object-scope.ts', 'npc-walk-frame.ts'])
    for (const node of parse(fs.readFileSync(path.join(core, file), 'utf8')).statements)
      assert(
        ts.isFunctionDeclaration(node) ||
          ts.isTypeAliasDeclaration(node) ||
          (ts.isImportDeclaration(node) && node.importClause.isTypeOnly),
      )
  // Final changes affect three other cases only, so the selected counter oracles/helpers remain bound.
  const withoutFinalCases = (text) => {
    const ast = parse(text),
      spans = []
    const visit = (node) => {
      if (
        ts.isExpressionStatement(node) &&
        ts.isCallExpression(node.expression) &&
        node.expression.expression.getText(ast) === 'it'
      ) {
        const first = node.expression.arguments[0]
        if (
          first &&
          ts.isStringLiteral(first) &&
          report.postCounterDelta.cases.includes(first.text)
        )
          spans.push([node.getStart(ast), node.end])
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
    assert.equal(spans.length, 3)
    for (const [start, end] of spans.sort((a, b) => b[0] - a[0]))
      text = text.slice(0, start) + text.slice(end)
    return tokens(text)
  }
  assert.equal(tokens(raw('counter-final.source.ts').toString()), tokens(after))
  assert.equal(
    withoutFinalCases(raw('counter-final.test.ts').toString()),
    withoutFinalCases(fs.readFileSync(path.join(core, 'event-system.test.ts'), 'utf8')),
  )
  console.log(
    JSON.stringify({
      state: 'MATCH',
      files: report.files.length,
      rawEntries: archive.size,
      publicExports: 185,
      identities: '324→324;2renamed',
      businessCounters: 3,
      unifiedGates: 'DEFERRED',
      meaning: 'Mechanical evidence matches; semantic review limited to declared read scope',
    }),
  )
}
