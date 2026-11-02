const assert = require('node:assert/strict')
const cp = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const root = cp
  .execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' })
  .trim()
const ts = createRequire(path.join(root, 'package.json'))('typescript')
const base = '3ca935065',
  panel = 'packages/game/src/tools/tools-panel.ts'
const original = cp.execFileSync('git', ['show', `${base}:${panel}`], {
  cwd: root,
  encoding: 'utf8',
})
const read = (p) => fs.readFileSync(path.join(root, 'packages/game/src/tools', p), 'utf8')
const parse = (s) => {
  const ast = ts.createSourceFile('x.ts', s, ts.ScriptTarget.Latest, true)
  assert.equal(ast.parseDiagnostics.length, 0)
  return ast
}
const printer = ts.createPrinter({ removeComments: true })
const dom = parse(read('tools-panel-dom.ts')),
  saveText = read('tools-panel-save.ts'),
  save = parse(saveText)
assert.deepEqual(
  dom.statements.filter((n) => !ts.isImportDeclaration(n)).map((n) => n.name?.text),
  ['sectionTitle', 'muted', 'button'],
)
assert.deepEqual(
  save.statements.filter((n) => !ts.isImportDeclaration(n)).map((n) => n.name?.text),
  ['SaveSlotActions', 'renderSaveSlots'],
)
const functions = new Map(
  dom.statements
    .filter(ts.isFunctionDeclaration)
    .map((n) => [n.name.text, n.getText(dom).replace(/^export /, '')]),
)
let rebuilt = read('tools-panel.ts')
for (const spec of ['tools-panel-dom', 'tools-panel-save']) {
  const ast = parse(rebuilt),
    imports = ast.statements
      .filter(ts.isImportDeclaration)
      .filter((n) => n.moduleSpecifier.text === `./${spec}.js`)
  assert.equal(imports.length, 1)
  rebuilt = rebuilt.slice(0, imports[0].getStart(ast)) + rebuilt.slice(imports[0].end)
}
rebuilt =
  "import type { SaveSnapshot } from '../core/save/data.js'\nimport { parseImportedSave, serializeSave } from './save-io.js'\n" +
  rebuilt
assert.equal(rebuilt.split('extends SaveSlotActions').length, 2)
rebuilt = rebuilt.replace('extends SaveSlotActions ', '')
const fields = save.statements
  .find(ts.isInterfaceDeclaration)
  .members.map((n) => n.getText(save))
  .join('\n')
rebuilt = rebuilt.replace('  /** 小地图底图', `${fields}\n  /** 小地图底图`)
const render = save.statements.find(ts.isFunctionDeclaration)
assert.equal(render.name.text, 'renderSaveSlots')
const body = render.body.getText(save).slice(1, -1)
assert.equal(rebuilt.split('renderSaveSlots(parent, deps)').length, 2)
rebuilt = rebuilt.replace('renderSaveSlots(parent, deps)', body)
rebuilt = rebuilt.replace(
  '/** 单位内',
  `${functions.get('sectionTitle')}\n${functions.get('muted')}\n/** 单位内`,
)
rebuilt = rebuilt.replace('/** 开关行', `${functions.get('button')}\n/** 开关行`)
function normalized(s) {
  const ast = parse(s),
    imports = [],
    rest = []
  for (const node of ast.statements)
    (ts.isImportDeclaration(node) ? imports : rest).push(
      printer.printNode(ts.EmitHint.Unspecified, node, ast),
    )
  return { imports: imports.sort(), rest: rest.join('\n') }
}
assert.deepEqual(
  normalized(rebuilt),
  normalized(original),
  'Complete inlined TS must match the fixed behavior commit, including public fields',
)
for (const ast of [dom, save])
  for (const node of ast.statements.filter(ts.isImportDeclaration)) {
    assert(!node.moduleSpecifier.text.includes('tools-panel.js'), 'No reverse dependency on host')
  }
console.log(
  'PASS: complete TS reconstructed to the approved error-fix commit; only save IO and three shared DOM functions moved, original public fields retained; no reverse dependency or module-time effect added.',
)
