import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const ts = createRequire(path.join(process.cwd(), 'package.json'))('typescript'),
  base = '1ffd1d0206e69ed8ed8f1a75968975e3e6602be0',
  core = 'packages/game/src/core/',
  tools = 'packages/game/src/tools/'
const git = (p) => execFileSync('git', ['show', `${base}:${p}`], { encoding: 'utf8' }),
  read = (p) => fs.readFileSync(p, 'utf8'),
  parse = (s) => ts.createSourceFile('x.ts', s, ts.ScriptTarget.Latest, true),
  printer = ts.createPrinter({ removeComments: true }),
  printed = (s) => printer.printFile(parse(s))
const ids = new Map([
  ['OP_ADD_CASH', ['event-system.ts', 0x1e]],
  ['OP_ADD_ITEM', ['event-system.ts', 0x1f]],
  ['OP_ADD_MAGIC', ['event-opcode-player.ts', 0x55]],
])
const sf = parse(read(`${core}script-opcode-ids.ts`))
assert.equal(sf.statements.length, 3)
for (const n of sf.statements) {
  assert(ts.isVariableStatement(n))
  assert(n.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
  assert.equal(n.declarationList.declarations.length, 1)
  const d = n.declarationList.declarations[0]
  assert(ts.isNumericLiteral(d.initializer))
  assert.equal(Number(d.initializer.text), ids.get(d.name.text)[1])
}
for (const filename of ['event-system.ts', 'event-opcode-player.ts']) {
  const before = parse(git(core + filename)),
    after = parse(read(core + filename)),
    oldMap = new Map()
  for (const n of before.statements.filter(ts.isVariableStatement))
    for (const d of n.declarationList.declarations)
      if (ids.get(d.name.text)?.[0] === filename) oldMap.set(d.name.text, n)
  const rebuilt = []
  let newImports = 0,
    reexports = 0
  for (const n of after.statements) {
    if (
      (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier?.text === './script-opcode-ids.js'
    ) {
      if (ts.isImportDeclaration(n)) {
        newImports++
        const names = n.importClause.namedBindings.elements.map((e) => e.name.text).sort()
        assert.deepEqual(names, [...oldMap.keys()].sort())
      } else {
        assert(ts.isNamedExports(n.exportClause))
        for (const e of n.exportClause.elements) {
          const prior = oldMap.get(e.name.text)
          assert(prior)
          rebuilt.push(prior.getText(before))
          reexports++
        }
      }
    } else rebuilt.push(n.getText(after))
  }
  assert.equal(newImports, 1)
  assert.equal(reexports, oldMap.size)
  assert.equal(
    printed(rebuilt.join('\n')),
    printed(git(core + filename)),
    `${filename} entire TS reconstruction`,
  )
}
if (process.argv.includes('--with-minimap')) {
  function imports(source) {
    const rows = []
    for (const n of parse(source).statements.filter(ts.isImportDeclaration)) {
      const typeOnly = n.importClause.isTypeOnly
      for (const e of n.importClause.namedBindings.elements)
        rows.push({
          name: e.name.text,
          imported: e.propertyName?.text ?? e.name.text,
          module: n.moduleSpecifier.text,
          type: typeOnly || e.isTypeOnly,
        })
    }
    return rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  }
  const withoutImports = (source) =>
    printed(
      parse(source)
        .statements.filter((n) => !ts.isImportDeclaration(n))
        .map((n) => n.getText())
        .join('\n'),
    )
  for (const filename of ['minimap.ts', 'minimap-model.ts']) {
    const oldSource = git(tools + filename),
      currentSource = read(tools + filename)
    assert.equal(
      withoutImports(currentSource),
      withoutImports(oldSource),
      `${filename} all non-import TypeScript`,
    )
    const expected = imports(oldSource)
      .map((row) => ({
        ...row,
        module:
          row.module === '../core/event-system.js'
            ? filename === 'minimap.ts'
              ? '../core/script-catalog.js'
              : '../core/script-opcode-ids.js'
            : row.module === '../core/scene-system.js'
              ? '../core/scene-identity.js'
              : row.module,
      }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    assert.deepEqual(imports(currentSource), expected, `${filename} exact import binding set`)
  }
  const event = parse(git(`${core}event-system.ts`))
  const exportedCatalog = event.statements.find(
    (n) => ts.isExportDeclaration(n) && n.moduleSpecifier?.text === './script-catalog.js',
  )
  assert(exportedCatalog)
  for (const name of ['getGlobalCommands', 'getGlobalLabelMap'])
    assert(exportedCatalog.exportClause.elements.some((e) => e.name.text === name))
  const scene = parse(git(`${core}scene-system.ts`))
  const exportedIdentity = scene.statements.find(
    (n) => ts.isExportDeclaration(n) && n.moduleSpecifier?.text === './scene-identity.js',
  )
  assert(exportedIdentity?.exportClause.elements.some((e) => e.name.text === 'getCurrentMapNum'))
  for (const filename of ['script-catalog.ts', 'scene-identity.ts', 'scene-system.ts'])
    assert.equal(read(core + filename), git(core + filename))
  for (const filename of ['minimap-model.ts', 'minimap-draw.ts'])
    for (const n of parse(read(tools + filename)).statements.filter(ts.isImportDeclaration))
      assert(
        !['../core/event-system.js', '../core/event-opcode-player.js'].includes(
          n.moduleSpecifier.text,
        ),
        'read-only model/drawing must not import executors',
      )
}
console.log(
  JSON.stringify({
    state: 'MATCH',
    base,
    scope:
      'Three exact opcode literals; entire two core files reconstructed; root public bindings preserved. With --with-minimap: getter aliases and exact two import-only deltas, no rule/draw dependency on interpreter.',
    withMinimap: process.argv.includes('--with-minimap'),
  }),
)
