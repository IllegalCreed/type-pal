/** Read-only intake census against the immutable GLM candidate, not against this review commit. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const candidate = '3967a376'
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const source = (path) => git('show', `${candidate}:${path}`)
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const diff = git('diff', '--name-only', '32704738', candidate).split('\n').filter(Boolean)
assert(diff.every((p) => p.startsWith('docs/testing/glm-architecture-support/')))
assert.equal(git('diff', 'b11d4bc9', '32704738', '--', 'packages/', 'scripts/'), '')
assert.equal(git('diff', '32704738', candidate, '--', 'packages/', 'scripts/'), '')

const ledger = JSON.parse(source('docs/testing/glm-architecture-support/evidence.json'))
const actual = { covered: 0, risk: 0, blocked: 0, reproduced: 0, 'N/A': 0 }
const groups = {}
for (const row of ledger.entries) {
  assert(Object.hasOwn(actual, row.type))
  actual[row.type]++
  groups[row.package] ??= {}
  groups[row.package][row.type] = (groups[row.package][row.type] ?? 0) + 1
}
assert.equal(new Set(ledger.entries.map((e) => e.id)).size, ledger.entries.length)
const screenshots = ledger.screenshots.map((s) => {
  const bytes = readFileSync(s.file)
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  const sha256 = digest(bytes)
  assert(sha256.startsWith(s.sha256_16), s.file)
  const pixels = `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`
  assert.equal(pixels, s.viewport)
  return { file: s.file, sha256, pixels, registeredPrefixMatches: true }
})

const paths = git('ls-tree', '-r', '--name-only', candidate, '--', 'packages/game/src')
  .split('\n')
  .filter((p) => /\.tsx?$/.test(p) && !/(?:\.(?:test|spec|d)\.tsx?$|\/__tests__\/)/.test(p))
const pathSet = new Set(paths)
const edges = new Map(paths.map((p) => [p, []]))
const typeOnly = []
for (const path of paths) {
  const tree = ts.createSourceFile(path, source(path), ts.ScriptTarget.Latest, true)
  assert.equal(tree.parseDiagnostics.length, 0)
  for (const node of tree.statements) {
    if (!(ts.isImportDeclaration(node) || ts.isExportDeclaration(node))) continue
    const spec = node.moduleSpecifier
    if (!spec || !ts.isStringLiteral(spec) || !spec.text.startsWith('.')) continue
    const base = posix.normalize(posix.join(posix.dirname(path), spec.text))
    const target = [
      base,
      base.replace(/\.js$/, '.ts'),
      base.replace(/\.js$/, '.tsx'),
      `${base}/index.ts`,
    ].find((p) => pathSet.has(p))
    if (!target) continue
    const clause = ts.isImportDeclaration(node) ? node.importClause : node.exportClause
    const named = clause && ('namedBindings' in clause ? clause.namedBindings : clause)
    const onlyType = ts.isImportDeclaration(node)
      ? !!node.importClause?.isTypeOnly ||
        (!node.importClause?.name &&
          named &&
          ts.isNamedImports(named) &&
          named.elements.length > 0 &&
          named.elements.every((e) => e.isTypeOnly))
      : node.isTypeOnly ||
        (named &&
          ts.isNamedExports(named) &&
          named.elements.length > 0 &&
          named.elements.every((e) => e.isTypeOnly))
    const edge = {
      from: path,
      to: target,
      line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    }
    if (onlyType) typeOnly.push(edge)
    else edges.get(path).push(edge)
  }
}
let serial = 0
const indices = new Map(),
  low = new Map(),
  stack = [],
  active = new Set(),
  components = []
function visit(path) {
  indices.set(path, serial)
  low.set(path, serial++)
  stack.push(path)
  active.add(path)
  for (const { to } of edges.get(path)) {
    if (!indices.has(to)) {
      visit(to)
      low.set(path, Math.min(low.get(path), low.get(to)))
    } else if (active.has(to)) low.set(path, Math.min(low.get(path), indices.get(to)))
  }
  if (indices.get(path) !== low.get(path)) return
  const component = []
  let member
  do {
    member = stack.pop()
    active.delete(member)
    component.push(member)
  } while (member !== path)
  components.push(component.sort())
}
for (const path of paths) if (!indices.has(path)) visit(path)
const cycle = components.find((c) => c.includes('packages/game/src/core/event-system.ts'))
const cycleEdges = cycle.flatMap((p) => edges.get(p).filter(({ to }) => cycle.includes(to)))
const anchors = [
  'packages/editor/src/ui/App.tsx',
  'packages/editor/src/core/editor-derived-store.ts',
  'packages/editor/src/ui/MapMode.tsx',
  'packages/editor/src/ui/ScriptEditor.tsx',
  'packages/editor/src/ui/CommandForm.tsx',
  'packages/editor/src/ui/design-system/multi-select.tsx',
  'packages/reforge/src/battle/battle-session.ts',
  'packages/content/src/author-script-core.ts',
  'packages/content/src/enemy-script.ts',
  'packages/migrate/src/migrate-content.ts',
  ...cycle,
]
const sourceHashes = Object.fromEntries(
  anchors.map((p) => [
    p,
    digest(execFileSync('git', ['show', `${candidate}:${p}`], { cwd: root })),
  ]),
)
const sourceFacts = {}
for (const path of [
  'packages/editor/src/ui/CommandForm.tsx',
  'packages/editor/src/ui/ScriptEditor.tsx',
  'packages/migrate/src/migrate-content.ts',
]) {
  const tree = ts.createSourceFile(path, source(path), ts.ScriptTarget.Latest, true)
  function inspect(node) {
    if (ts.isSwitchStatement(node) && node.expression.getText(tree) === 'cmd.kind')
      sourceFacts.commandFormCases = node.caseBlock.clauses.filter(ts.isCaseClause).length
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(tree) === 'AUTHOR_COMMAND_PRESENTATION_'
    ) {
      let expression = node.initializer
      while (!ts.isObjectLiteralExpression(expression) && expression.expression)
        expression = expression.expression
      sourceFacts.canonicalPresentationKeys = expression.properties.length
    }
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'mapScenesStatic')
      sourceFacts.mapScenesStaticParameters = node.parameters.map((p) => p.name.getText(tree))
    ts.forEachChild(node, inspect)
  }
  inspect(tree)
}
console.log(
  JSON.stringify(
    {
      candidate: git('rev-parse', candidate),
      diffFiles: diff,
      productionFreezeMatches: true,
      declared: ledger.mechanicalSubtotals,
      actual: { total: ledger.entries.length, byType: actual, byPackage: groups },
      screenshots,
      graphScope:
        'static relative runtime import/export graph; type-only excluded; not a dynamic initialization test',
      eventSystemStronglyConnectedComponent: cycle,
      runtimeEdgesWithinComponent: cycleEdges,
      typeOnlyEdgesFromComponent: typeOnly.filter(({ from }) => cycle.includes(from)),
      sourceFacts,
      sourceHashes,
    },
    null,
    2,
  ),
)
