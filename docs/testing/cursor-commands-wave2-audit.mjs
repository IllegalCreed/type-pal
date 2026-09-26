/** Independent extraction and negative-control-criterion audit; read-only against the candidate. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve(
  process.argv[2] ?? '/Users/zhangxu/illegal/type-pal-cursor-commands-wave2',
)
const base = '51048353',
  dir = 'packages/editor/src/core/'
const modules = [
  'composite-command',
  'command-scene-state',
  'entity-commands',
  'scene-commands',
  'map-asset-commands',
  'map-edit-commands',
  'tileset-commands',
  'sprite-commands',
  'actor-commands',
  'asset-commands',
  'startup-commands',
  'battle-sprite-commands',
  'command-asset-record',
].map((p) => `${dir}${p}.ts`)
const read = (p, old = false) =>
  old
    ? execFileSync('git', ['show', `${base}:${p}`], { cwd: root, encoding: 'utf8' })
    : readFileSync(path.join(root, p), 'utf8')
const parse = (p, old = false) => ts.createSourceFile(p, read(p, old), ts.ScriptTarget.Latest, true)
const original = parse(`${dir}commands.ts`, true),
  barrel = parse(`${dir}commands.ts`)
function exportsOf(tree) {
  const names = []
  for (const n of tree.statements) {
    if (ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause))
      names.push(...n.exportClause.elements.map((e) => e.name.text))
    else if (n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) && n.name)
      names.push(n.name.getText(tree))
  }
  return names.sort()
}
assert.deepEqual(exportsOf(barrel), exportsOf(original))
function declaration(n) {
  return (
    (ts.isClassDeclaration(n) ||
      ts.isFunctionDeclaration(n) ||
      ts.isInterfaceDeclaration(n) ||
      ts.isTypeAliasDeclaration(n)) &&
    n.name
  )
}
function tokens(n, tree) {
  const scanner = ts.createScanner(
      ts.ScriptTarget.Latest,
      true,
      ts.LanguageVariant.Standard,
      n.getText(tree).replace(/^export\s+/, ''),
    ),
    out = []
  for (let k = scanner.scan(); k !== ts.SyntaxKind.EndOfFileToken; k = scanner.scan())
    out.push([k, scanner.getTokenText()])
  // Formatter may add a trailing parameter/call comma after extraction changes wrapping.
  // Do not remove commas before ] (array holes) or any executable operator/argument.
  return out.filter(
    ([kind], index) =>
      !(kind === ts.SyntaxKind.CommaToken && out[index + 1]?.[0] === ts.SyntaxKind.CloseParenToken),
  )
}
const dest = modules.map((file) => ({ file, tree: parse(file) })),
  declarations = []
for (const node of original.statements.filter(declaration)) {
  const matches = dest.flatMap(({ file, tree }) =>
    tree.statements
      .filter((n) => declaration(n) && n.name.text === node.name.text)
      .map((n) => ({ file, tree, node: n })),
  )
  assert.equal(matches.length, 1, `unique destination ${node.name.text}`)
  assert.deepEqual(tokens(matches[0].node, matches[0].tree), tokens(node, original), node.name.text)
  declarations.push({ name: node.name.text, destination: matches[0].file })
}
assert.equal(
  dest.reduce((sum, { tree }) => sum + tree.statements.filter(declaration).length, 0),
  declarations.length,
)
assert.equal(barrel.statements.filter((n) => !ts.isExportDeclaration(n)).length, 0)
const oldImports = new Map()
function runtimeImports(tree) {
  return tree.statements.flatMap((n) => {
    if (
      !ts.isImportDeclaration(n) ||
      n.importClause?.isTypeOnly ||
      !n.importClause?.namedBindings ||
      !ts.isNamedImports(n.importClause.namedBindings)
    )
      return []
    return n.importClause.namedBindings.elements
      .filter((e) => !e.isTypeOnly)
      .map((e) => ({
        local: e.name.text,
        exported: e.propertyName?.text ?? e.name.text,
        from: n.moduleSpecifier.text,
      }))
  })
}
for (const binding of runtimeImports(original)) oldImports.set(binding.local, binding)
const importBindings = []
for (const { file, tree } of dest)
  for (const binding of runtimeImports(tree)) {
    const old = oldImports.get(binding.local)
    if (old) assert.deepEqual(binding, old, `import source ${file}:${binding.local}`)
    else {
      const owner = declarations.find((d) => d.name === binding.local)
      assert(owner, `new runtime binding ${file}:${binding.local}`)
      assert.equal(binding.exported, binding.local)
      assert.equal(
        path.posix
          .normalize(path.posix.join(path.posix.dirname(file), binding.from))
          .replace(/\.js$/, '.ts'),
        owner.destination,
      )
    }
    importBindings.push({ file, ...binding })
  }
function collect(dir) {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? collect(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
  )
}
function graph() {
  const files = collect('packages/editor/src').filter(
      (p) => /\.tsx?$/.test(p) && !/(\.test\.|\.spec\.|\.d\.ts$|\/__tests__\/)/.test(p),
    ),
    set = new Set(files),
    edges = new Map()
  for (const file of files) {
    const compiled = ts.transpileModule(read(file), {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        verbatimModuleSyntax: true,
        jsx: ts.JsxEmit.Preserve,
      },
    }).outputText
    const tree = ts.createSourceFile(file, compiled, ts.ScriptTarget.Latest, true),
      out = []
    for (const node of tree.statements) {
      if (
        !(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) ||
        !node.moduleSpecifier ||
        !ts.isStringLiteral(node.moduleSpecifier)
      )
        continue
      const name = node.moduleSpecifier.text
      if (!name.startsWith('.')) continue
      const stem = path.posix
        .normalize(path.posix.join(path.posix.dirname(file), name))
        .replace(/\.[cm]?jsx?$/, '')
      const target = [`${stem}.ts`, `${stem}.tsx`, `${stem}/index.ts`].find((p) => set.has(p))
      if (target) out.push(target)
    }
    edges.set(file, out)
  }
  const ids = new Map(),
    low = new Map(),
    stack = [],
    active = new Set(),
    components = []
  let cursor = 0
  function visit(v) {
    ids.set(v, cursor)
    low.set(v, cursor++)
    stack.push(v)
    active.add(v)
    for (const w of edges.get(v)) {
      if (!ids.has(w)) {
        visit(w)
        low.set(v, Math.min(low.get(v), low.get(w)))
      } else if (active.has(w)) low.set(v, Math.min(low.get(v), ids.get(w)))
    }
    if (low.get(v) === ids.get(v)) {
      const component = []
      let w
      do {
        w = stack.pop()
        active.delete(w)
        component.push(w)
      } while (w !== v)
      if (component.length > 1) components.push(component.sort())
    }
  }
  for (const file of files) if (!ids.has(file)) visit(file)
  for (const file of modules)
    assert(!edges.get(file).includes(`${dir}commands.ts`), `barrel backedge ${file}`)
  assert(!components.some((c) => c.some((p) => modules.includes(p))), 'new modules in runtime SCC')
  return {
    fileCount: files.length,
    components,
    moduleEdges: Object.fromEntries(modules.map((p) => [p, edges.get(p)])),
  }
}
const toolTree = ts.createSourceFile(
  'mutants.mjs',
  read('docs/testing/cursor-commands-wave2/module-mutants.mjs'),
  ts.ScriptTarget.Latest,
  true,
)
const functions = [
  'resolveReportedFile',
  'executedMatches',
  'isExactAssertionFailure',
  'judgeGreen',
  'judgeRed',
  'selfTestPayload',
]
const bodies = functions
  .map((name) => {
    const found = toolTree.statements.filter(
      (n) => ts.isFunctionDeclaration(n) && n.name?.text === name,
    )
    assert.equal(found.length, 1, name)
    return found[0].getText(toolTree)
  })
  .join('\n')
const { judgeRed, judgeGreen, selfTestPayload } = new Function(
  'path',
  `${bodies};return {judgeRed,judgeGreen,selfTestPayload}`,
)(path)
const spec = { title: 'target', fullName: 'suite target' },
  file = '/abs/target.test.ts'
function red(message = 'AssertionError: mismatch') {
  return {
    status: 1,
    json: selfTestPayload({ file, fullName: spec.fullName, title: spec.title, message }),
    spec,
    testFileAbsolute: file,
    before: 'same',
    after: 'same',
    hit: true,
  }
}
const cases = [
  ['valid', true, (x) => x],
  [
    'same-message-mixed-error',
    false,
    (x) => {
      x.json.testResults[0].assertionResults[0].failureMessages[0] += '\nTypeError: unrelated'
      return x
    },
  ],
  [
    'assertion-prefixed-timed-out',
    false,
    (x) => {
      x.json.testResults[0].assertionResults[0].failureMessages = [
        'AssertionError: Test timed out in 5000ms',
      ]
      return x
    },
  ],
  [
    'extra-runtime-failure',
    false,
    (x) => {
      x.json.numFailedTests = 2
      x.json.testResults.push({
        name: '/abs/other.test.ts',
        assertionResults: [
          {
            title: 'other',
            fullName: 'other',
            status: 'failed',
            failureMessages: ['TypeError: host broken'],
          },
        ],
      })
      return x
    },
  ],
  [
    'suite-error',
    false,
    (x) => {
      x.json.testResults.push({
        name: '/abs/setup.test.ts',
        message: 'TypeError: suite setup',
        assertionResults: [],
      })
      return x
    },
  ],
]
const criterion = cases.map(([id, expected, modify]) => ({
  id,
  expected,
  accepted: judgeRed(modify(red())).ok,
}))
assert(
  judgeGreen({
    status: 0,
    json: selfTestPayload({ file, fullName: spec.fullName, title: spec.title, status: 'passed' }),
    spec,
    testFileAbsolute: file,
  }).ok,
)
console.log(
  JSON.stringify(
    { base, exports: exportsOf(barrel), declarations, importBindings, graph: graph(), criterion },
    null,
    2,
  ),
)
