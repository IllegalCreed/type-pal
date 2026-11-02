import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const ts = createRequire(path.join(process.cwd(), 'package.json'))('typescript')
const target = process.argv[3],
  readAt = (p) =>
    target
      ? execFileSync('git', ['show', `${target}:${p}`], { encoding: 'utf8' })
      : fs.readFileSync(p, 'utf8')
const recipe = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
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
const old = execFileSync('git', ['show', `${recipe.base}:${recipe.cli}`], { encoding: 'utf8' }),
  before = parse(old),
  cli = readAt(recipe.cli),
  cf = parse(cli),
  main = cf.statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === 'main'),
  oldMain = before.statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === 'main')
const edits = [],
  modules = new Map(),
  allHelpers = recipe.specs.flatMap((s) => s.helpers.map((h) => h.name))
const roots = (s) => s.replace(/\brawRoot\b/g, 'RAW').replace(/\boutputRoot\b/g, 'OUT')
for (const spec of recipe.specs) {
  const p = `packages/pal-extract/src/resources/${spec.module}.ts`,
    source = modules.get(p) ?? readAt(p)
  modules.set(p, source)
  const sf = parse(source),
    fn = sf.statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === spec.name)
  assert(fn, spec.name)
  assert.deepEqual(
    fn.parameters.map((p) => p.name.text),
    spec.params ?? ['rawRoot', 'outputRoot'],
  )
  const nodes = [...fn.body.statements]
  if (!spec.noLoader) {
    const load = nodes.shift()
    assert.equal(
      canon(emit(load, sf)),
      canon('const loadFile = name => readBinary(resolve(rawRoot, name))'),
    )
  }
  if (spec.returns) {
    const last = nodes.pop()
    assert(ts.isReturnStatement(last))
    assert.equal(last.expression.getText(sf), spec.returns)
  }
  const helpers = nodes.filter(ts.isFunctionDeclaration)
  assert.deepEqual(
    helpers.map((n) => n.name.text),
    spec.helpers.map((h) => h.name),
  )
  for (const h of helpers) {
    const original = before.statements.find(
      (n) => ts.isFunctionDeclaration(n) && n.name.text === h.name.text,
    )
    assert.equal(canon(roots(emit(h, sf))), canon(emit(original, before)), h.name.text)
  }
  const actual = roots(
      nodes
        .filter((n) => !ts.isFunctionDeclaration(n))
        .map((n) => emit(n, sf))
        .join('\n'),
    ),
    original = oldMain.body.statements.filter((n) => n.getText(before).includes(spec.anchor))[0]
  assert(original, `${spec.name} original anchor`)
  let expected
  if (spec.block) {
    assert(ts.isBlock(original))
    expected = original.statements.map((n) => emit(n, before)).join('\n')
  } else {
    const arr = [...oldMain.body.statements],
      from = arr.indexOf(original),
      to = arr.findIndex((n, i) => i >= from && n.getText(before).includes(spec.end))
    assert(to >= from)
    expected = arr
      .slice(from, to + 1)
      .map((n) => emit(n, before))
      .join('\n')
  }
  assert.equal(canon(actual), canon(expected), `${spec.name} all stage runtime`)
  const calls = main.body.statements.filter((n) => {
    const call =
      spec.returns && ts.isVariableStatement(n)
        ? n.declarationList.declarations[0].initializer
        : n.expression
    return call && ts.isCallExpression(call) && call.expression.getText(cf) === spec.name
  })
  assert.equal(calls.length, 1, `${spec.name} call`)
  const call = spec.returns
    ? calls[0].declarationList.declarations[0].initializer
    : calls[0].expression
  if (spec.returns) {
    assert.equal(calls[0].declarationList.declarations.length, 1)
    assert.equal(calls[0].declarationList.declarations[0].name.getText(cf), spec.returns)
  }
  assert.deepEqual(
    call.arguments.map((n) => n.getText(cf)),
    spec.args ?? ['RAW', 'OUT'],
  )
  edits.push({
    start: calls[0].getStart(cf),
    end: calls[0].end,
    text: spec.block ? `{\n${actual}\n}` : actual,
  })
}
let expanded = cli
for (const e of edits.sort((a, b) => b.start - a.start))
  expanded = expanded.slice(0, e.start) + e.text + expanded.slice(e.end)
function runtime(source) {
  const f = parse(source)
  return f.statements
    .filter(
      (n) =>
        !ts.isImportDeclaration(n) &&
        !(ts.isFunctionDeclaration(n) && allHelpers.includes(n.name?.text)),
    )
    .map((n) => emit(n, f))
    .join('\n')
}
assert.equal(
  canon(runtime(expanded)),
  canon(runtime(old)),
  'whole CLI runtime and stage invocation order',
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
const beforeBindings = bindings(old, recipe.cli),
  afterBindings = bindings(cli, recipe.cli)
for (const [p, s] of modules)
  for (const [k, v] of bindings(s, p)) {
    if (afterBindings.has(k)) assert.deepEqual(afterBindings.get(k), v)
    afterBindings.set(k, v)
  }
for (const spec of recipe.specs) {
  assert.deepEqual(afterBindings.get(spec.name), [
    path.resolve(`packages/pal-extract/src/resources/${spec.module}.js`),
    spec.name,
  ])
  afterBindings.delete(spec.name)
}
assert.deepEqual([...beforeBindings].sort(), [...afterBindings].sort(), 'same real runtime imports')
for (const [p, s] of modules) {
  const sf = parse(s)
  assert(
    sf.statements.every(
      (n) =>
        ts.isImportDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isInterfaceDeclaration(n),
    ),
    `${p} only function declarations (no eager IO/state)`,
  )
  assert.deepEqual(
    sf.statements
      .filter(ts.isFunctionDeclaration)
      .map((n) => n.name.text)
      .sort(),
    recipe.specs
      .filter((x) => p.endsWith(`${x.module}.ts`))
      .map((x) => x.name)
      .sort(),
  )
}
const sha = (s) => createHash('sha256').update(s).digest('hex')
console.log(
  JSON.stringify({
    state: 'MATCH',
    base: recipe.base,
    files: [recipe.cli, ...modules.keys()].map((p) => ({ path: p, sha256: sha(readAt(p)) })),
    stages: recipe.specs.map((s) => s.name),
    scope:
      'all stage and remaining CLI runtime, invocation/read/write/log/failure order, exact runtime import bindings; no new policy or complete eight-axis acceptance',
    sanityControls: 4,
  }),
)
