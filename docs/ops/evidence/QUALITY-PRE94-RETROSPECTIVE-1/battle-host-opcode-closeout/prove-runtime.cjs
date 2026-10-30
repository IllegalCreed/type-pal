const fs = require('node:fs'),
  cp = require('node:child_process'),
  crypto = require('node:crypto'),
  assert = require('node:assert/strict'),
  ts = require(`${process.cwd()}/node_modules/typescript`)
const base = '96d68809b87e7f1d653d55d1ee8330d63f6fc76f',
  paths = [
    'packages/game/src/core/battle/battle-opcodes.ts',
    'packages/game/src/core/event-system.ts',
    'packages/game/src/core/battle/actions/throw-item.ts',
  ]
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
function runtime(s) {
  const js = ts.transpileModule(s, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      removeComments: true,
    },
  }).outputText
  const ast = ts.createSourceFile('f.js', js, ts.ScriptTarget.Latest, true)
  function tree(n) {
    if (ts.isParenthesizedExpression(n)) return tree(n.expression)
    const children = []
    ts.forEachChild(n, (c) => {
      children.push(tree(c))
    })
    const data = { kind: n.kind, children }
    if (!ts.isSourceFile(n) && typeof n.text === 'string') data.text = n.text
    if (typeof n.rawText === 'string') data.rawText = n.rawText
    if (typeof n.operator === 'number') data.operator = n.operator
    if (ts.isVariableDeclarationList(n))
      data.declarationFlags =
        n.flags &
        (ts.NodeFlags.Const | ts.NodeFlags.Let | ts.NodeFlags.Using | ts.NodeFlags.AwaitUsing)
    return data
  }
  return JSON.stringify(tree(ast))
}
assert.notEqual(runtime('const x=(a+b)*c'), runtime('const x=a+b*c'), 'grouping preserved by tree')
assert.notEqual(runtime('let x=1'), runtime('const x=1'), 'binding immutability preserved')
assert.notEqual(runtime('let x=1;x++'), runtime('let x=1;x--'), 'unary operators preserved')
const rows = paths.map((path) => {
  const before = cp.execFileSync('git', ['show', `${base}:${path}`], {
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    }),
    after = fs.readFileSync(path, 'utf8'),
    a = runtime(before),
    b = runtime(after)
  assert.equal(a, b, path)
  return { path, beforeSha256: sha(before), afterSha256: sha(after), runtimeTreeSha256: sha(b) }
})
module.exports = { runtime }
if (require.main === module)
  console.log(
    JSON.stringify(
      {
        rows,
        normalization:
          'Erase TS types/comments, retain concrete JS AST kinds/values/operators/declaration flags and structure; only parenthesized wrapper nodes ignored. No opcode/math/string/branch masks.',
        sanityControls: 3,
      },
      null,
      2,
    ),
  )
