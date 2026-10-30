import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const ts = createRequire(path.join(process.cwd(), 'package.json'))('typescript'),
  sha = (s) => createHash('sha256').update(s).digest('hex')
const base = '4c684dfd2f307e221f983837958d671f734f6132',
  cliPath = 'packages/pal-extract/src/cli.ts',
  dataPath = 'packages/pal-extract/src/resources/data-assets.ts',
  worldPath = 'packages/pal-extract/src/resources/world-assets.ts'
const target = process.argv[2],
  readAt = (p) =>
    target
      ? execFileSync('git', ['show', `${target}:${p}`], { encoding: 'utf8' })
      : fs.readFileSync(p, 'utf8')
const old = execFileSync('git', ['show', `${base}:${cliPath}`], { encoding: 'utf8' }),
  cli = readAt(cliPath),
  data = readAt(dataPath),
  world = readAt(worldPath),
  read = readAt('packages/pal-extract/src/io/read.ts')
const parse = (s) => {
    const f = ts.createSourceFile('f.ts', s, ts.ScriptTarget.Latest, true)
    assert.equal(f.parseDiagnostics.length, 0)
    return f
  },
  printer = ts.createPrinter({ removeComments: true }),
  emit = (n, f) => printer.printNode(ts.EmitHint.Unspecified, n, f)
const canon = (s) => {
  const f = parse(
    ts.transpileModule(s, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        removeComments: true,
      },
    }).outputText,
  )
  const tree = (n) => {
    if (ts.isParenthesizedExpression(n)) return tree(n.expression)
    const children = []
    ts.forEachChild(n, (c) => {
      children.push(tree(c))
    })
    const row = { kind: n.kind, children }
    if (!ts.isSourceFile(n) && typeof n.text === 'string') row.text = n.text
    if (typeof n.rawText === 'string') row.rawText = n.rawText
    if (typeof n.operator === 'number') row.operator = n.operator
    if (ts.isVariableDeclarationList(n))
      row.declarationFlags =
        n.flags &
        (ts.NodeFlags.Const | ts.NodeFlags.Let | ts.NodeFlags.Using | ts.NodeFlags.AwaitUsing)
    return row
  }
  return JSON.stringify(tree(f))
}
for (const [a, b] of [
  ['const x=(a+b)*c', 'const x=a+b*c'],
  ['const x=1', 'const x=2'],
  ['let x=1', 'const x=1'],
  ['let x=1;x++', 'let x=1;x--'],
])
  assert.notEqual(canon(a), canon(b))
const readFn = parse(read).statements.find(
  (n) => ts.isFunctionDeclaration(n) && n.name.text === 'readBinary',
)
assert.deepEqual(
  readFn.parameters.map((p) => p.name.text),
  ['file'],
)
assert.equal(
  canon(emit(readFn.body, parse(read))),
  canon('{ return new Uint8Array(readFileSync(file)) }'),
)
const sf = parse(data),
  fn = sf.statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === 'writeDataAssets')
assert.deepEqual(
  fn.parameters.map((p) => p.name.text),
  ['rawRoot', 'outputRoot', 'sssObjBuf', 'words', 'objectTables'],
)
const statements = [...fn.body.statements],
  destructure = statements.shift().declarationList.declarations[0]
assert.equal(destructure.initializer.getText(sf), 'objectTables')
assert.deepEqual(
  destructure.name.elements.map((e) => e.name.text),
  ['items', 'spells', 'enemyObjects', 'objectPlayers'],
)
const loader = statements.shift().declarationList.declarations[0]
assert.equal(loader.name.text, 'loadFile')
assert(ts.isArrowFunction(loader.initializer))
function transform(node, { roots = false, imports = false, helpers = false } = {}) {
  const result = ts.transform(node, [
    (ctx) => {
      const visit = (n) => {
        if (imports && ts.isImportDeclaration(n)) return undefined
        if (
          helpers &&
          ts.isFunctionDeclaration(n) &&
          ['imageUiPath', 'magicEffectBlobPath'].includes(n.name?.text)
        )
          return undefined
        if (
          ts.isCallExpression(n) &&
          ts.isIdentifier(n.expression) &&
          n.expression.text === 'readBinary'
        ) {
          assert.equal(n.arguments.length, 1)
          return ts.factory.createNewExpression(
            ts.factory.createIdentifier('Uint8Array'),
            undefined,
            [
              ts.factory.createCallExpression(
                ts.factory.createIdentifier('readFileSync'),
                undefined,
                [ts.visitNode(n.arguments[0], visit)],
              ),
            ],
          )
        }
        if (
          roots &&
          ts.isIdentifier(n) &&
          !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)
        ) {
          if (n.text === 'rawRoot') return ts.factory.createIdentifier('RAW')
          if (n.text === 'outputRoot') return ts.factory.createIdentifier('OUT')
        }
        return ts.visitEachChild(n, visit, ctx)
      }
      return (n) => ts.visitNode(n, visit)
    },
  ])
  const out = result.transformed[0]
  result.dispose()
  return out
}
const loaderExpr = emit(transform(loader.initializer.body, { roots: true }), sf)
assert.equal(
  canon(`function loadFile(name){return ${loaderExpr}}`),
  canon(
    emit(
      parse(old).statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === 'loadFile'),
      parse(old),
    ),
  ),
)
const local = statements.filter(ts.isFunctionDeclaration)
assert.deepEqual(
  local.map((n) => n.name.text),
  ['imageUiPath', 'magicEffectBlobPath', 'dataSubdirPath'],
)
for (const helper of local) {
  const before = parse(old).statements.find(
    (n) => ts.isFunctionDeclaration(n) && n.name.text === helper.name.text,
  )
  assert.equal(
    canon(emit(transform(helper, { roots: true }), sf)),
    canon(emit(before, parse(old))),
    helper.name.text,
  )
}
const actual = printer.printList(
  ts.ListFormat.MultiLine,
  ts.factory.createNodeArray(
    statements
      .filter((n) => !ts.isFunctionDeclaration(n))
      .map((n) => transform(n, { roots: true })),
  ),
  sf,
)
const start = old.indexOf('  // ── 数据表(全量)'),
  end = old.indexOf('  // RNG/FIRE保留', start),
  expected = old.slice(start, end)
assert.equal(canon(actual), canon(expected), 'all actual stage runtime statements')
const cf = parse(cli),
  main = cf.statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === 'main'),
  calls = main.body.statements.filter(
    (n) =>
      ts.isExpressionStatement(n) &&
      ts.isCallExpression(n.expression) &&
      n.expression.expression.getText(cf) === 'writeDataAssets',
  )
assert.equal(calls.length, 1)
const args = calls[0].expression.arguments
assert.deepEqual(
  args.slice(0, 4).map((n) => n.getText(cf)),
  ['RAW', 'OUT', 'sssObjBuf', 'words'],
)
assert(ts.isObjectLiteralExpression(args[4]))
assert(args[4].properties.every(ts.isShorthandPropertyAssignment))
assert.deepEqual(
  args[4].properties.map((n) => n.name.text),
  ['items', 'spells', 'enemyObjects', 'objectPlayers'],
)
const expanded = cli.slice(0, calls[0].getStart(cf)) + actual + cli.slice(calls[0].end)
assert.equal(
  canon(printer.printFile(transform(parse(old), { imports: true, helpers: true }))),
  canon(printer.printFile(transform(parse(expanded), { imports: true, helpers: true }))),
)
const oldWorld = execFileSync('git', ['show', `${base}:${worldPath}`], { encoding: 'utf8' })
assert.equal(
  canon(printer.printFile(transform(parse(oldWorld), { imports: true }))),
  canon(printer.printFile(transform(parse(world), { imports: true }))),
)
function bindings(source, file) {
  const out = new Map()
  for (const n of parse(source).statements.filter(ts.isImportDeclaration)) {
    assert(n.importClause)
    if (n.importClause.isTypeOnly) continue
    assert(!n.importClause.name && ts.isNamedImports(n.importClause.namedBindings))
    const spec = n.moduleSpecifier.text,
      target = spec.startsWith('.') ? path.resolve(path.dirname(file), spec) : spec
    for (const x of n.importClause.namedBindings.elements)
      if (!x.isTypeOnly) out.set(x.name.text, [target, x.propertyName?.text ?? x.name.text])
  }
  return out
}
const join = (sets) => {
    const out = new Map()
    for (const set of sets)
      for (const [k, v] of set) {
        if (out.has(k)) assert.deepEqual(out.get(k), v)
        out.set(k, v)
      }
    return out
  },
  before = join([bindings(old, cliPath), bindings(oldWorld, worldPath)]),
  after = join([
    bindings(cli, cliPath),
    bindings(world, worldPath),
    bindings(data, dataPath),
    bindings(read, 'packages/pal-extract/src/io/read.ts'),
  ])
assert.deepEqual(after.get('writeDataAssets'), [
  path.resolve('packages/pal-extract/src/resources/data-assets.js'),
  'writeDataAssets',
])
after.delete('writeDataAssets')
assert.deepEqual(after.get('readBinary'), [
  path.resolve('packages/pal-extract/src/io/read.js'),
  'readBinary',
])
after.delete('readBinary')
assert.deepEqual([...before].sort(), [...after].sort())
for (const source of [data, read])
  for (const n of parse(source).statements)
    assert(
      ts.isImportDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isInterfaceDeclaration(n),
      'no eager IO/state in new modules',
    )
console.log(
  JSON.stringify({
    state: 'MATCH',
    base,
    files: [cliPath, dataPath, worldPath, 'packages/pal-extract/src/io/read.ts'].map((p) => ({
      path: p,
      sha256: sha(readAt(p)),
    })),
    runtime:
      'all data statements, four borrowed views,3path helpers, owned byte reader, remaining CLI and whole world runtime preserved',
    imports: 'same real bindings after two actual new internal exports',
    sanityControls: 4,
    scope: 'exact structural/IO identity only; no new asset policy or entireCLI quality acceptance',
  }),
)
