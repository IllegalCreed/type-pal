import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import path from 'node:path'

const ts = createRequire(path.join(process.cwd(), 'package.json'))('typescript'),
  base = '56a4fa2a389ccfce074d7b7c03fb9553296928ac',
  root = 'packages/game/src/present/',
  files = ['dialog-box.ts', 'dialog-text.ts', 'dialog-draw.ts'].map((n) => root + n)
const parse = (s) => {
  const sf = ts.createSourceFile('x.ts', s, ts.ScriptTarget.Latest, true)
  assert.equal(sf.parseDiagnostics.length, 0)
  return sf
}
function tokens(s) {
  const js = ts.transpileModule(s, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        removeComments: true,
      },
    }).outputText,
    scan = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, js),
    out = []
  for (let k = scan.scan(); k !== ts.SyntaxKind.EndOfFileToken; k = scan.scan())
    out.push([k, scan.getTokenText()])
  return out
}
const revision = process.argv[2] ?? '7c80a5607bd874e712470d365f1eb1622379f9f0'
const read = (p) => execFileSync('git', ['show', `${revision}:${p}`], { encoding: 'utf8' })
const old = execFileSync('git', ['show', `${base}:${files[0]}`], { encoding: 'utf8' }),
  all = files.map((p) => [p, parse(read(p))]),
  before = parse(old)
const names = (n, sf) =>
  ts.isVariableStatement(n)
    ? n.declarationList.declarations.map((d) => d.name.getText(sf))
    : n.name
      ? [n.name.text]
      : []
const declarations = (sf) =>
  new Map(
    sf.statements
      .filter((n) => !ts.isImportDeclaration(n) && !ts.isExportDeclaration(n))
      .flatMap((n) => {
        assert(
          ts.isFunctionDeclaration(n) ||
            ts.isInterfaceDeclaration(n) ||
            ts.isTypeAliasDeclaration(n) ||
            ts.isVariableStatement(n),
        )
        return names(n, sf).map((k) => [
          k,
          {
            node: n,
            source: n.getText(sf),
            type: ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n),
            public: n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false,
          },
        ])
      }),
  )
const prior = declarations(before),
  current = new Map()
for (const [p, sf] of all)
  for (const [k, v] of declarations(sf)) {
    assert(!current.has(k), k)
    current.set(k, { ...v, path: p })
  }
assert.deepEqual([...current.keys()].sort(), [...prior.keys()].sort())
for (const [k, v] of prior) {
  assert.deepEqual(tokens(v.source), tokens(current.get(k).source), k)
  assert.equal(v.type, current.get(k).type)
  assert.equal(v.public, current.get(k).public)
}
const exported = new Map(
  [...declarations(all[0][1])].filter(([, v]) => v.public).map(([k, v]) => [k, v.type]),
)
for (const n of all[0][1].statements.filter(ts.isExportDeclaration)) {
  assert(n.moduleSpecifier)
  const p = path.join(root, n.moduleSpecifier.text.replace(/\.js$/, '.ts'))
  assert(files.includes(p))
  assert(ts.isNamedExports(n.exportClause))
  for (const e of n.exportClause.elements) {
    const name = e.propertyName?.text ?? e.name.text,
      row = current.get(name)
    assert(row?.public && row.path === p)
    assert(!exported.has(e.name.text))
    exported.set(e.name.text, e.isTypeOnly || n.isTypeOnly || row.type)
  }
}
assert.deepEqual(
  [...exported].sort(),
  [...prior]
    .filter(([, v]) => v.public)
    .map(([k, v]) => [k, v.type])
    .sort(),
  'entire public root export identity/type set',
)
function imports(sf, p) {
  const out = []
  for (const n of sf.statements.filter(ts.isImportDeclaration)) {
    assert(n.importClause)
    if (n.importClause.isTypeOnly) continue
    assert(!n.importClause.name && ts.isNamedImports(n.importClause.namedBindings))
    for (const x of n.importClause.namedBindings.elements)
      if (!x.isTypeOnly)
        out.push([
          x.name.text,
          n.moduleSpecifier.text.startsWith('.')
            ? path.resolve(path.dirname(p), n.moduleSpecifier.text)
            : n.moduleSpecifier.text,
          x.propertyName?.text ?? x.name.text,
        ])
  }
  return out
}
const oldImports = imports(before, files[0]),
  afterImports = all.flatMap(([p, sf]) => imports(sf, p)),
  external = []
for (const row of afterImports) {
  const internal = files.find((p) => path.resolve(p.replace(/\.ts$/, '.js')) === row[1])
  if (internal) {
    const d = current.get(row[2])
    assert.equal(d.path, internal)
    assert.equal(row[0], row[2])
    assert(d.public)
  } else if (!external.some((x) => JSON.stringify(x) === JSON.stringify(row))) external.push(row)
}
assert.deepEqual(external.sort(), oldImports.sort())
for (const [, sf] of all)
  for (const n of sf.statements.filter(ts.isVariableStatement))
    for (const d of n.declarationList.declarations) {
      assert(d.initializer)
      assert(
        ts.isNumericLiteral(d.initializer) || ts.isObjectLiteralExpression(d.initializer),
        'no eager side effects',
      )
    }
const sha = (b) => createHash('sha256').update(b).digest('hex')
console.log(
  JSON.stringify({
    state: 'MATCH',
    base,
    scope:
      'Every declaration/runtime body, actual external/import bindings, entire root public export/type set, no eager IO; pure responsibility move only.',
    declarations: prior.size,
    rootExports: exported.size,
    files: files.map((p) => ({ path: p, sha256: sha(read(p)) })),
  }),
)
