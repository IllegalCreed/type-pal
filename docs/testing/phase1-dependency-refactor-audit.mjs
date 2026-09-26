import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Read-only parity / runtime-import audit. No product mutation or coverage execution.
const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../..', import.meta.url)))
const base = process.argv[3] ?? '4cdefcf1'
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const prefix = 'packages/game/src/core/'
const owners = [
  'event-system.ts',
  'scene-system.ts',
  'equip-effect.ts',
  'battle/battle-opcodes.ts',
  'menu/menu-driver.ts',
  'menu/menu-mode.ts',
  'menu/magic-script.ts',
]
const leaves = [
  'script-catalog.ts',
  'inventory-state.ts',
  'player-poison-state.ts',
  'scene-identity.ts',
  'equipment-state.ts',
  'menu/menu-stack.ts',
]
const before = (p) => execFileSync('git', ['show', `${base}:${p}`], { cwd: root, encoding: 'utf8' })
const after = (p) => readFileSync(resolve(root, p), 'utf8')
const parse = (p, text) => ts.createSourceFile(p, text, ts.ScriptTarget.Latest, true)
function tokens(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text)
  const out = []
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    out.push([kind, scanner.getTokenText()])
  }
  return out
}
function exportsOf(sf) {
  const out = []
  for (const n of sf.statements) {
    if (ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause)) {
      out.push(...n.exportClause.elements.map((e) => e.name.text))
    }
    if (!n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue
    if (n.name) out.push(n.name.getText(sf))
    if (ts.isVariableStatement(n))
      out.push(...n.declarationList.declarations.map((d) => d.name.getText(sf)))
  }
  return [...new Set(out)].sort()
}
const current = new Map([...owners, ...leaves].map((p) => [p, parse(p, after(prefix + p))]))
const preservedFunctions = [],
  preservedExports = {},
  routingChanges = []
for (const p of owners) {
  const old = parse(p, before(prefix + p)),
    next = current.get(p)
  const expectedExports = exportsOf(old)
  assert.deepEqual(exportsOf(next), expectedExports, `${p}: exported names`)
  preservedExports[p] = expectedExports.length
  for (const n of old.statements) {
    if (!ts.isFunctionDeclaration(n) || !n.body || !n.name) continue
    const name = n.name.text
    let dest = p,
      found = next.statements.find((s) => ts.isFunctionDeclaration(s) && s.name?.text === name)
    if (!found) {
      const matches = leaves.flatMap((file) =>
        current
          .get(file)
          .statements.filter((s) => ts.isFunctionDeclaration(s) && s.name?.text === name)
          .map((s) => ({ file, node: s })),
      )
      assert.equal(matches.length, 1, `${p}:${name}: unique lower owner`)
      dest = matches[0].file
      found = matches[0].node
    }
    let expected = n.body.getText(old)
    if (p === 'event-system.ts' && name === 'tickAutoScripts') {
      assert.equal(expected.split('_globalCommands.length').length, 2)
      expected = expected.replace('_globalCommands.length', 'getGlobalCommands().length')
      routingChanges.push('tickAutoScripts: one synchronous read through the shared catalog getter')
    }
    if (p === 'scene-system.ts' && name === 'loadScene') {
      assert.equal(expected.split('_currentMapNum = sceneAssets.mapNum').length, 2)
      expected = expected.replace(
        '_currentMapNum = sceneAssets.mapNum',
        'setCurrentMapNum(sceneAssets.mapNum)',
      )
      routingChanges.push(
        'loadScene: one synchronous assignment through the shared identity setter',
      )
    }
    assert.deepEqual(
      tokens(found.body.getText(current.get(dest))),
      tokens(expected),
      `${p}:${name}: body drift`,
    )
    preservedFunctions.push({ name, from: p, to: dest })
  }
}
const collect = (dir) =>
  readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? collect(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
  )
const production = (p) => /\.tsx?$/.test(p) && !/\.(test|spec)\.|\.d\.ts$|\/__tests__\//.test(p)
function runtimeGraph(old) {
  const files = (
    old
      ? execFileSync('git', ['ls-tree', '-r', '--name-only', base, 'packages/game/src'], {
          cwd: root,
          encoding: 'utf8',
        })
          .trim()
          .split('\n')
      : collect('packages/game/src')
  ).filter(production)
  const all = new Set(files),
    edges = new Map()
  for (const p of files) {
    const js = ts.transpileModule((old ? before : after)(p), {
      fileName: p,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        verbatimModuleSyntax: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText
    const sf = parse(p, js),
      out = []
    for (const n of sf.statements) {
      if (
        !(ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) ||
        !n.moduleSpecifier ||
        !ts.isStringLiteral(n.moduleSpecifier)
      )
        continue
      if (!n.moduleSpecifier.text.startsWith('.')) continue
      const q = posix.normalize(posix.join(dirname(p), n.moduleSpecifier.text)).replace(/\.js$/, '')
      const target = [`${q}.ts`, `${q}.tsx`, `${q}/index.ts`].find((f) => all.has(f))
      if (target) out.push(target)
    }
    edges.set(p, out)
  }
  let index = 0
  const ids = new Map(),
    low = new Map(),
    stack = [],
    on = new Set(),
    scc = []
  function visit(v) {
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
      const component = []
      let w
      do {
        w = stack.pop()
        on.delete(w)
        component.push(w)
      } while (w !== v)
      if (component.length > 1) scc.push(component.sort())
    }
  }
  for (const p of files) if (!ids.has(p)) visit(p)
  return scc.sort()
}
const beforeScc = runtimeGraph(true),
  afterScc = runtimeGraph(false)
assert(beforeScc.some((s) => s.length === 7 && s.includes(`${prefix}event-system.ts`)))
assert.equal(afterScc.length, 0, 'game production static runtime imports must be acyclic')
console.log(
  JSON.stringify(
    { base, preservedExports, preservedFunctions, routingChanges, beforeScc, afterScc },
    null,
    2,
  ),
)
