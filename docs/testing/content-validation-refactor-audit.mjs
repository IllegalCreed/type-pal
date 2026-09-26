import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../..', import.meta.url)))
const req = createRequire(resolve(root, 'package.json')),
  ts = req('typescript')
const oldRef = process.argv[3] ?? 'ebef3d5a'
const oldFiles = execFileSync(
  'git',
  ['ls-tree', '-r', '--name-only', oldRef, 'packages/content/src'],
  { cwd: root, encoding: 'utf8' },
)
  .trim()
  .split('\n')
const collect = (dir) =>
  readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? collect(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
  )
const valid = (p) =>
  p.endsWith('.ts') &&
  !p.endsWith('.d.ts') &&
  !/\.(test|spec)\./.test(p) &&
  !p.includes('/__tests__/')
const read = (p, old) =>
  old
    ? execFileSync('git', ['show', `${oldRef}:${p}`], { cwd: root, encoding: 'utf8' })
    : readFileSync(resolve(root, p), 'utf8')
function graph(old) {
  const files = (old ? oldFiles : collect('packages/content/src')).filter(valid),
    set = new Set(files),
    edges = new Map()
  for (const p of files) {
    const js = ts.transpileModule(read(p, old), {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        verbatimModuleSyntax: true,
      },
    }).outputText
    const sf = ts.createSourceFile(p, js, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS),
      out = []
    for (const n of sf.statements)
      if (
        (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
        n.moduleSpecifier &&
        ts.isStringLiteral(n.moduleSpecifier)
      ) {
        const s = n.moduleSpecifier.text
        if (s.startsWith('.')) {
          const q = posix.normalize(posix.join(dirname(p), s)).replace(/\.js$/, '.ts')
          if (set.has(q)) out.push(q)
        }
      }
    edges.set(p, out)
  }
  let index = 0
  const ids = new Map(),
    low = new Map(),
    stack = [],
    on = new Set(),
    scc = []
  const visit = (v) => {
    ids.set(v, index)
    low.set(v, index++)
    stack.push(v)
    on.add(v)
    for (const w of edges.get(v) ?? []) {
      if (!ids.has(w)) {
        visit(w)
        low.set(v, Math.min(low.get(v), low.get(w)))
      } else if (on.has(w)) low.set(v, Math.min(low.get(v), ids.get(w)))
    }
    if (low.get(v) === ids.get(v)) {
      const c = []
      let w
      do {
        w = stack.pop()
        on.delete(w)
        c.push(w)
      } while (w !== v)
      if (c.length > 1) scc.push(c.sort())
    }
  }
  for (const p of files) if (!ids.has(p)) visit(p)
  return scc.sort()
}
function exportsOf(text) {
  const sf = ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true),
    out = []
  for (const n of sf.statements) {
    if (ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause))
      out.push(...n.exportClause.elements.map((e) => e.name.text))
    if (n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (n.name) out.push(n.name.getText(sf))
      if (ts.isVariableStatement(n))
        out.push(...n.declarationList.declarations.map((d) => d.name.getText(sf)))
    }
  }
  return [...new Set(out)].sort()
}
const exports = {}
const lowerFiles = [
  'enemy-validation-shapes.ts',
  'enemy-ai-condition-guard.ts',
  'battle-choreography.ts',
]
const parse = (p, old) =>
  ts.createSourceFile(p, read(`packages/content/src/${p}`, old), ts.ScriptTarget.Latest, true)
function tokens(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text)
  const result = []
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    result.push([kind, scanner.getTokenText()])
  }
  return result
}
const preservedFunctions = []
for (const p of ['author-script-core.ts', 'enemy-script.ts']) {
  const before = exportsOf(read(`packages/content/src/${p}`, true)),
    after = exportsOf(read(`packages/content/src/${p}`, false))
  assert.deepEqual(after, before)
  exports[p] = { count: before.length, equal: true }
  const old = parse(p, true),
    current = parse(p, false)
  for (const node of old.statements) {
    if (!ts.isFunctionDeclaration(node) || !node.name || !node.body) continue
    const name = node.name.text
    let dest = p,
      owner = current
    let found = current.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name)
    if (!found) {
      const matches = lowerFiles.flatMap((file) => {
        const sf = parse(file, false)
        return sf.statements
          .filter((n) => ts.isFunctionDeclaration(n) && n.name?.text === name)
          .map((n) => ({ file, sf, node: n }))
      })
      assert.equal(matches.length, 1, `${p}:${name}: unique lower owner`)
      dest = matches[0].file
      owner = matches[0].sf
      found = matches[0].node
    }
    assert.deepEqual(
      tokens(found.body.getText(owner)),
      tokens(node.body.getText(old)),
      `${p}:${name}: body drift`,
    )
    preservedFunctions.push({ name, from: p, to: dest })
  }
}
const before = graph(true),
  after = graph(false)
assert(
  before.some(
    (c) =>
      c.some((p) => p.endsWith('/author-script-core.ts')) &&
      c.some((p) => p.endsWith('/enemy-script.ts')),
  ),
)
assert(
  !after.some(
    (c) =>
      c.some((p) => p.endsWith('/author-script-core.ts')) ||
      c.some((p) => p.endsWith('/enemy-script.ts')),
  ),
)
console.log(JSON.stringify({ before, after, exports, preservedFunctions }, null, 2))
