const fs = require('node:fs'),
  cp = require('node:child_process'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto'),
  ts = require(`${process.cwd()}/node_modules/typescript`)
const base = '3bf94a63955156046c6615df663e405917f5813b',
  root = 'packages/game/src/core/game-state.ts',
  leaf = 'packages/game/src/core/battle-role-projection.ts',
  names = ['projectRuntimeToBattleRoles', 'writeBackBattleRolesToRuntime'],
  hash = (b) => crypto.createHash('sha256').update(b).digest('hex')
const parse = (p, s) => ts.createSourceFile(p, s, ts.ScriptTarget.Latest, true),
  before = cp.execFileSync('git', ['show', `${base}:${root}`], { encoding: 'utf8' }),
  after = fs.readFileSync(root, 'utf8'),
  part = fs.readFileSync(leaf, 'utf8'),
  oldAst = parse(root, before),
  newAst = parse(root, after),
  leafAst = parse(leaf, part)
function shape(n, ast) {
  const children = []
  ts.forEachChild(n, (child) => {
    children.push(shape(child, ast))
  })
  return children.length ? [n.kind, ...children] : [n.kind, n.getText(ast)]
}
const fun = (n) => ts.isFunctionDeclaration(n) && names.includes(n.name?.text),
  reexport = (n) =>
    ts.isExportDeclaration(n) && n.moduleSpecifier?.text === './battle-role-projection.js'
assert.equal(newAst.statements.filter(reexport).length, 1)
assert.deepEqual(
  newAst.statements
    .find(reexport)
    .exportClause.elements.map((e) => e.name.text)
    .sort(),
  [...names].sort(),
)
const nonImports = (ast, exclude) =>
  ast.statements.filter((n) => !ts.isImportDeclaration(n) && !exclude(n)).map((n) => shape(n, ast))
assert.deepEqual(
  nonImports(oldAst, fun),
  nonImports(newAst, reexport),
  'all root declarations/logic/types outside moved functions unchanged',
)
assert.deepEqual(
  oldAst.statements
    .filter(ts.isImportDeclaration)
    .map((n) => shape(n, oldAst))
    .sort(),
  newAst.statements
    .filter(ts.isImportDeclaration)
    .map((n) => shape(n, newAst))
    .sort(),
)
for (const name of names) {
  const a = oldAst.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name),
    b = leafAst.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name)
  assert(a && b)
  assert.deepEqual(shape(a, oldAst), shape(b, leafAst), name)
}
assert(
  leafAst.statements.filter(ts.isImportDeclaration).every((n) => n.importClause?.isTypeOnly),
  'leaf has no runtime dependencies',
)
assert.equal(
  leafAst.statements.filter((n) => !ts.isImportDeclaration(n) && !fun(n)).length,
  0,
  'leaf contains only the two named functions',
)
console.log(
  JSON.stringify(
    {
      base,
      wholeRootOutsideMovedFunctionsEqual: true,
      wholeMovedFunctionsIncludingTypesEqual: true,
      rootExportsPreserved: true,
      leafRuntimeDependencies: 0,
      files: [root, leaf].map((path) => ({ path, sha256: hash(fs.readFileSync(path)) })),
      limit:
        'AST/types/body equality plus actual caller/typecheck tests; comments reviewed separately; no automatic design certification',
    },
    null,
    2,
  ),
)
