import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const ts = createRequire(path.join(process.cwd(), 'package.json'))('typescript'),
  base = '1006f197c48bcc57e70b380487bb076ab3a2fc77',
  prefix = 'packages/game/src/tools/',
  files = ['minimap.ts', 'minimap-model.ts', 'minimap-draw.ts'].map((p) => prefix + p),
  revision = process.argv[2]
const read = (p) =>
  revision
    ? execFileSync('git', ['show', `${revision}:${p}`], { encoding: 'utf8' })
    : fs.readFileSync(p, 'utf8')
const parse = (s) => {
  const sf = ts.createSourceFile('x.ts', s, ts.ScriptTarget.Latest, true)
  assert.equal(sf.parseDiagnostics.length, 0)
  return sf
}
const printed = (s) =>
  ts.createPrinter({ removeComments: true }).printFile(parse(s.replace(/^export /, '')))
const old = execFileSync('git', ['show', `${base}:${files[0]}`], { encoding: 'utf8' }),
  before = parse(old),
  all = files.map((p) => [p, parse(read(p))])
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
  assert.equal(printed(v.source), printed(current.get(k).source), k)
  assert.equal(v.type, current.get(k).type)
  assert.equal(current.get(k).public, v.public || ['SCALE', 'WHOLE_VIEW'].includes(k))
}
const exported = new Map(
  [...declarations(all[0][1])].filter(([, v]) => v.public).map(([k, v]) => [k, v.type]),
)
for (const n of all[0][1].statements.filter(ts.isExportDeclaration)) {
  assert(n.moduleSpecifier)
  const p = path.join(prefix, n.moduleSpecifier.text.replace(/\.js$/, '.ts'))
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
  external = []
for (const [p, sf] of all)
  for (const row of imports(sf, p)) {
    const internal = files.find((p) => path.resolve(p.replace(/\.ts$/, '.js')) === row[1])
    if (internal) {
      const d = current.get(row[2])
      assert.equal(d.path, internal)
      assert.equal(row[0], row[2])
      assert(d.public)
    } else if (!external.some((x) => JSON.stringify(x) === JSON.stringify(row))) external.push(row)
  }
assert.deepEqual(external.sort(), oldImports.sort())
function pure(n) {
  if (
    ts.isNumericLiteral(n) ||
    ts.isStringLiteral(n) ||
    ts.isIdentifier(n) ||
    ts.isArrowFunction(n)
  )
    return true
  if (ts.isAsExpression(n) || ts.isParenthesizedExpression(n)) return pure(n.expression)
  if (ts.isBinaryExpression(n)) return pure(n.left) && pure(n.right)
  if (ts.isArrayLiteralExpression(n)) return n.elements.every(pure)
  if (ts.isObjectLiteralExpression(n))
    return n.properties.every((p) => ts.isPropertyAssignment(p) && pure(p.initializer))
  return false
}
for (const [, sf] of all)
  for (const n of sf.statements.filter(ts.isVariableStatement))
    for (const d of n.declarationList.declarations)
      assert(d.initializer && pure(d.initializer), 'no eager IO or allocation call')
const hash = (s) => createHash('sha256').update(s).digest('hex')
console.log(
  JSON.stringify({
    state: 'MATCH',
    base,
    revision: revision ?? 'working tree',
    declarations: prior.size,
    rootExports: exported.size,
    scope:
      'All declarations/full TypeScript preserved apart from two module-internal export modifiers; actual import bindings, entire root API and pure initializers checked. Semantic design judgment remains manual.',
    files: files.map((p) => ({ path: p, sha256: hash(read(p)) })),
  }),
)
