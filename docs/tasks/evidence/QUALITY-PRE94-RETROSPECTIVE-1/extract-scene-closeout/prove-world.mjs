import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const root = process.cwd(),
  ts = createRequire(path.join(root, 'package.json'))('typescript')
const sha = (s) => createHash('sha256').update(s).digest('hex')
const old = execFileSync('git', ['show', '90506b759:packages/pal-extract/src/cli.ts'], {
  encoding: 'utf8',
})
const cli = fs.readFileSync('packages/pal-extract/src/cli.ts', 'utf8')
const world = fs.readFileSync('packages/pal-extract/src/resources/world-assets.ts', 'utf8')
const parse = (s) => {
  const ast = ts.createSourceFile('f.ts', s, ts.ScriptTarget.Latest, true)
  assert.equal(ast.parseDiagnostics.length, 0)
  return ast
}
const print = (ast) => ts.createPrinter({ removeComments: true }).printFile(ast)
const canonical = (s) =>
  print(
    parse(
      ts.transpileModule(s, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          removeComments: true,
        },
      }).outputText,
    ),
  )
for (const [a, b] of [
  ['const x=(a+b)*c', 'const x=a+b*c'],
  ['const x=1', 'const x=2'],
  ['let x=1', 'const x=1'],
  ['let x=1;x++', 'let x=1;x--'],
])
  assert.notEqual(canonical(a), canonical(b))
const stage = parse(world).statements.find(
  (s) => ts.isFunctionDeclaration(s) && s.name.text === 'writeWorldAssets',
)
assert.deepEqual(
  stage.parameters.map((p) => p.name.text),
  ['rawRoot', 'outputRoot', 'scenes', 'eventObjects', 'eventMetadata'],
)
const locals = stage.body.statements.filter(ts.isFunctionDeclaration)
assert.deepEqual(
  locals.map((s) => s.name.text),
  ['tilesetBlobRelPath', 'tilesetBlobPath', 'dataSubdirPath', 'loadFile'],
)
const parameters = { rawRoot: 'RAW', outputRoot: 'OUT' }
function restore(n) {
  const result = ts.transform(n, [
    (ctx) => {
      const visit = (node) => {
        if (ts.isIdentifier(node)) {
          if (ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) return node
          if (parameters[node.text]) return ts.factory.createIdentifier(parameters[node.text])
          if (node.text === 'scenes' || node.text === 'eventObjects')
            return ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier('sss'),
              node.text,
            )
          if (node.text === 'eventMetadata')
            return ts.factory.createPropertyAccessChain(
              ts.factory.createIdentifier('corrected'),
              ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
              'eventMetadata',
            )
        }
        return ts.visitEachChild(node, visit, ctx)
      }
      return (node) => ts.visitNode(node, visit)
    },
  ])
  const out = result.transformed[0]
  result.dispose()
  return out
}
for (const local of locals) {
  const original = parse(old).statements.find(
    (s) => ts.isFunctionDeclaration(s) && s.name.text === local.name.text,
  )
  assert(original, local.name.text)
  const emit = (n) =>
    ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, n, parse(''))
  assert.equal(canonical(emit(restore(local))), canonical(emit(original)), local.name.text)
}
const oldAst = parse(old),
  worldAst = parse(world)
const oldMain = oldAst.statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === 'main')
const variable = (name) => (node) =>
  ts.isVariableStatement(node) &&
  node.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === name)
const start = oldMain.body.statements.findIndex(variable('mapMkf')),
  end = oldMain.body.statements.findIndex(variable('patMkf'))
assert(start > 0 && end > start)
const originalStatements = oldMain.body.statements.slice(start, end)
const moved = stage.body.statements.filter((n) => !ts.isFunctionDeclaration(n)).map(restore)
const snippets = (nodes, ast) =>
  ts
    .createPrinter({ removeComments: true })
    .printList(ts.ListFormat.MultiLine, ts.factory.createNodeArray(nodes), ast)
const originalBody = snippets(originalStatements, oldAst),
  actualBody = snippets(moved, worldAst)
assert.equal(
  canonical(actualBody),
  canonical(originalBody),
  'actual stage statements after only five parameter substitutions',
)
const cliAst = parse(cli),
  newMain = cliAst.statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === 'main')
const calls = newMain.body.statements.filter(
  (n) =>
    ts.isExpressionStatement(n) &&
    ts.isCallExpression(n.expression) &&
    n.expression.expression.getText(cliAst) === 'writeWorldAssets',
)
assert.equal(calls.length, 1)
assert.deepEqual(
  calls[0].expression.arguments.map((a) => a.getText(cliAst).replaceAll(' ', '')),
  ['RAW', 'OUT', 'sss.scenes', 'sss.eventObjects', 'corrected?.eventMetadata'],
)
// Only substitute the independently proven equal stage; parse again so every node owns its source positions.
const expanded = cli.slice(0, calls[0].getStart(cliAst)) + originalBody + cli.slice(calls[0].end)
function normalized(source) {
  const result = ts.transform(parse(source), [
    (ctx) => {
      const visit = (node) => {
        if (ts.isImportDeclaration(node)) return undefined
        if (
          ts.isFunctionDeclaration(node) &&
          ['tilesetBlobRelPath', 'tilesetBlobPath'].includes(node.name?.text)
        )
          return undefined
        return ts.visitEachChild(node, visit, ctx)
      }
      return (n) => ts.visitNode(n, visit)
    },
  ])
  const out = canonical(print(result.transformed[0]))
  result.dispose()
  return out
}
const a = normalized(old),
  b = normalized(expanded)
assert.equal(a, b, 'all remaining non-import CLI runtime')
function imports(source, filename) {
  const result = new Map()
  for (const node of parse(source).statements.filter(ts.isImportDeclaration)) {
    assert(node.importClause, 'side-effect imports require separate review')
    if (node.importClause.isTypeOnly) continue
    assert(
      ts.isNamedImports(node.importClause.namedBindings),
      'namespace/default bindings require separate review',
    )
    const file = node.moduleSpecifier.text,
      target = file.startsWith('.') ? path.resolve(path.dirname(filename), file) : file
    assert(!node.importClause?.name, 'no default binding introduced')
    for (const name of node.importClause?.namedBindings?.elements ?? [])
      if (!name.isTypeOnly)
        result.set(name.name.text, [target, name.propertyName?.text ?? name.name.text])
  }
  return result
}
const previous = imports(old, 'packages/pal-extract/src/cli.ts'),
  after = imports(cli, 'packages/pal-extract/src/cli.ts')
const binding = after.get('writeWorldAssets')
assert.equal(binding[0], path.resolve('packages/pal-extract/src/resources/world-assets.js'))
after.delete('writeWorldAssets')
for (const [name, source] of imports(world, 'packages/pal-extract/src/resources/world-assets.ts')) {
  if (after.has(name)) assert.deepEqual(after.get(name), source)
  after.set(name, source)
}
assert.deepEqual(
  [...previous].sort(),
  [...after].sort(),
  'all real imports retain their target and symbol',
)
for (const file of [
  'packages/pal-extract/src/resources/map.ts',
  'packages/pal-extract/src/resources/scene.ts',
  'packages/pal-extract/src/resources/world-assets.ts',
]) {
  for (const node of parse(fs.readFileSync(file, 'utf8')).statements) {
    if (
      ts.isImportDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isInterfaceDeclaration(node)
    )
      continue
    assert(ts.isVariableStatement(node), file)
    for (const declaration of node.declarationList.declarations)
      assert(ts.isNumericLiteral(declaration.initializer), file)
  }
}
console.log(
  JSON.stringify({
    state: 'MATCH',
    base: '90506b7594265547422dcc42c952fcd72934a528',
    cliBeforeSha256: sha(old),
    cliAfterSha256: sha(cli),
    worldSha256: sha(world),
    runtimeSha256: sha(b),
    inlinedCalls: calls.length,
    movedPrivateHelpers: locals.map((x) => x.name.text),
    imports: 'same targets/symbols, only actual new stage binding added',
    moduleInit:
      'moved dependency modules contain definitions and literal constants only; no eager IO',
    normalization:
      'Inline exactly one actual call, restore five literal parameters and private helper roots; erase imports only after binding comparison, erase types/comments through TypeScript transpilation; no literal/branch/math masks',
    sanityControls: 4,
  }),
)
