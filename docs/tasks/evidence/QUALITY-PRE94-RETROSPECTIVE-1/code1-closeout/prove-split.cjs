const fs = require('node:fs'),
  cp = require('node:child_process'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto')
const root = cp
    .execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: process.cwd(), encoding: 'utf8' })
    .trim(),
  ts = require(`${root}/node_modules/typescript`)
const file = 'packages/editor/src/core/project-reference.pal.test.ts',
  base = 'ea8651ce3f071e6ad04ac2eb042d28725c47eb7a',
  before = cp.execFileSync('git', ['show', `${base}:${file}`], { cwd: root, encoding: 'utf8' }),
  after = fs.readFileSync(path.join(root, file), 'utf8'),
  mapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'split.json'))),
  printer = ts.createPrinter({ removeComments: true })
const parse = (s) => ts.createSourceFile('x.ts', s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
  old = parse(before),
  now = parse(after),
  hash = (b) => crypto.createHash('sha256').update(b).digest('hex')
assert.equal(hash(before), mapping.baseSha256)
function calls(ast, name) {
  const all = []
  function walk(n) {
    if (ts.isCallExpression(n) && n.expression.getText(ast) === name) all.push(n)
    ts.forEachChild(n, walk)
  }
  walk(ast)
  return all
}
const original = calls(old, 'test')
assert.equal(original.length, 1)
const sourceStatements = original[0].arguments[1].body.statements
const factory = now.statements.find(
  (n) => ts.isFunctionDeclaration(n) && n.name.text === 'loadReferenceContext',
)
assert(factory)
const print = (n, ast) => printer.printNode(ts.EmitHint.Unspecified, n, ast)
assert.deepEqual(
  [...factory.body.statements].slice(0, -1).map((n) => print(n, now)),
  [...sourceStatements].slice(0, mapping.setupStatements).map((n) => print(n, old)),
)
assert.equal(
  factory.body.statements.at(-1).getText(now),
  'return { state, canonical, diagnostics, index, edges }',
)
const candidates = calls(now, 'test')
assert.equal(candidates.length, 9)
const used = []
for (const group of mapping.groups) {
  const c = candidates.find((c) => c.arguments[0].text === group.name)
  assert(c)
  const statements = [...c.arguments[1].body.statements]
  assert.equal(
    statements[0].declarationList.declarations[0].initializer.getText(now),
    'referenceContext()',
  )
  assert.deepEqual(
    statements.slice(1).map((n) => print(n, now)),
    group.baseStatementIndices.map((i) => print(sourceStatements[i], old)),
  )
  used.push(...group.baseStatementIndices)
}
assert.deepEqual(
  used.sort((a, b) => a - b),
  Array.from(
    { length: sourceStatements.length - mapping.setupStatements },
    (_, i) => i + mapping.setupStatements,
  ),
)
const assertions = (ast) =>
  calls(ast, 'expect')
    .map((n) => {
      let a = n
      while (a.parent && (ts.isCallExpression(a.parent) || ts.isPropertyAccessExpression(a.parent)))
        a = a.parent
      return print(a, ast)
    })
    .sort()
assert.deepEqual(assertions(old), assertions(now))
assert.equal(assertions(now).length, 84)
assert.equal(calls(now, 'loadReferenceContext').length, 1)
const hook = calls(now, 'beforeAll')
assert.equal(hook.length, 1)
assert.equal(hook[0].arguments[1].getText(now), '30_000')
const imports = (ast) =>
  ast.statements.filter(ts.isImportDeclaration).map((n) => ({
    source: n.moduleSpecifier.text,
    names: n.importClause?.namedBindings?.elements
      ?.map((e) => e.name.text)
      .filter((n) => n !== 'beforeAll')
      .sort(),
  }))
assert.deepEqual(imports(old), imports(now))
console.log(
  'PASS:all119 base setup/assertion statements assigned once;84 matcher ASTs identical;9 named contracts share exactly one original setup in beforeAll;imports/constants/input retained. Read-only proof, no product behavior claim.',
)
