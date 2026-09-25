/** Read-only r2 ledger/source reconciliation. Historical r1 probes stay unchanged. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const contentCandidate = '717d507d'
const registeredCandidate = '9e5ba310'
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const raw = (ref, path) => execFileSync('git', ['show', `${ref}:${path}`], { cwd: root })
const source = (path) => raw(contentCandidate, path).toString('utf8')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const dir = 'docs/testing/glm-architecture-support/'
const changes = git('diff', '0e751efe', registeredCandidate, '--name-only').split('\n')
assert(changes.every((p) => p.startsWith(dir)))
assert.equal(git('diff', 'b11d4bc9', registeredCandidate, '--', 'packages/', 'scripts/'), '')
const oldArtifacts = [
  'codex-intake-probe.mjs',
  'codex-intake-review.md',
  'codex-intake-evidence.json',
]
for (const p of oldArtifacts)
  assert(raw('0e751efe', dir + p).equals(raw(registeredCandidate, dir + p)))
const ledger = JSON.parse(raw(registeredCandidate, `${dir}evidence.json`))
const original = JSON.parse(raw('0e751efe', `${dir}codex-intake-evidence.json`))
const beforeRegistration = JSON.parse(raw(contentCandidate, `${dir}evidence.json`))
const afterRegistration = structuredClone(ledger)
delete beforeRegistration.finalSha
delete afterRegistration.finalSha
assert.deepEqual(beforeRegistration, afterRegistration)
assert(ledger.finalSha.startsWith(git('rev-parse', contentCandidate)))
const byType = {},
  byPackage = {}
for (const row of ledger.entries) {
  byType[row.type] = (byType[row.type] ?? 0) + 1
  byPackage[row.package] ??= { total: 0 }
  byPackage[row.package].total++
  byPackage[row.package][row.type] = (byPackage[row.package][row.type] ?? 0) + 1
}
assert.equal(new Set(ledger.entries.map((r) => r.id)).size, 38)
assert.deepEqual(byType, ledger.mechanicalSubtotals.byType)
const summary = source(`${dir}summary.md`)
const reportCounts = [...summary.matchAll(/^\| (P[1-6]|V[12]) \|.*\| (\d+)（/gm)].map(
  ([, pkg, total]) => ({ package: pkg, report: Number(total), ledger: byPackage[pkg].total }),
)
const hashes = [
  ...summary.matchAll(
    /\| ((?:editor|reforge|game|content|migrate)\/src\/[^|\s]+) \| ([a-f0-9]{16})/g,
  ),
].map(([, path, prefix]) => {
  const sha256 = hash(raw(contentCandidate, `packages/${path}`))
  assert(sha256.startsWith(prefix), path)
  return { path: `packages/${path}`, sha256 }
})
const screenshots = ledger.screenshots.map((s) => {
  const bytes = readFileSync(s.file),
    sha256 = hash(bytes)
  assert(sha256.startsWith(s.sha256_16), s.file)
  const old = original.mechanical.screenshots.find((p) => p.file === s.file)
  if (old) assert.equal(sha256, old.sha256)
  const dimensions = `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`
  assert.equal(dimensions, s.viewport)
  return { file: s.file, sha256, dimensions, existingR1: !!old }
})

function ast(path) {
  return ts.createSourceFile(path, source(path), ts.ScriptTarget.Latest, true)
}
const app = ast('packages/editor/src/ui/App.tsx'),
  hooks = []
function visitApp(n, owner = 'module') {
  if (ts.isFunctionDeclaration(n) && n.name) owner = n.name.text
  if (
    ts.isCallExpression(n) &&
    ts.isIdentifier(n.expression) &&
    ['useState', 'useRef', 'useEffect', 'useLayoutEffect'].includes(n.expression.text)
  ) {
    let declaration = n.parent
    while (
      declaration &&
      !ts.isVariableDeclaration(declaration) &&
      !ts.isExpressionStatement(declaration)
    )
      declaration = declaration.parent
    hooks.push({
      owner,
      hook: n.expression.text,
      line: app.getLineAndCharacterOfPosition(n.getStart()).line + 1,
      binding:
        declaration && ts.isVariableDeclaration(declaration) ? declaration.name.getText(app) : '',
    })
  }
  ts.forEachChild(n, (c) => visitApp(c, owner))
}
visitApp(app)
const hookCounts = Object.fromEntries(
  ['useState', 'useRef', 'useEffect', 'useLayoutEffect'].map((h) => [
    h,
    {
      App: hooks.filter((r) => r.owner === 'App' && r.hook === h).length,
      file: hooks.filter((r) => r.hook === h).length,
    },
  ]),
)
const author = ast('packages/content/src/author-script-core.ts'),
  recursiveCalls = []
const validator = author.statements.find(
  (n) => ts.isFunctionDeclaration(n) && n.name?.text === 'checkBaseAuthorCommands',
)
assert(validator)
function visitRecursion(n) {
  if (
    ts.isCallExpression(n) &&
    ts.isIdentifier(n.expression) &&
    n.expression.text === 'checkBaseAuthorCommands'
  )
    recursiveCalls.push({
      line: author.getLineAndCharacterOfPosition(n.getStart()).line + 1,
      input: n.arguments[0].getText(author),
    })
  ts.forEachChild(n, visitRecursion)
}
visitRecursion(validator.body)

const testFiles = git('ls-tree', '-r', '--name-only', contentCandidate, '--', 'packages/')
  .split('\n')
  .filter((p) => /\.test\.tsx?$/.test(p))
const cache = new Map()
function testTitles(path) {
  if (cache.has(path)) return cache.get(path)
  const tree = ast(path),
    names = []
  function visit(n) {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      ['test', 'it'].includes(n.expression.text) &&
      n.arguments[0] &&
      ts.isStringLiteralLike(n.arguments[0])
    )
      names.push(n.arguments[0].text)
    ts.forEachChild(n, visit)
  }
  visit(tree)
  cache.set(path, names)
  return names
}
let exactLeafTitles = 0
const describedReferences = []
for (const row of ledger.entries)
  for (const text of row.tests ?? []) {
    if (!text.includes(' > ')) continue
    const [file, ...parts] = text.split(' > ')
    const matches = testFiles.filter((p) => p.endsWith(`/${file}`))
    if (matches.length === 1 && testTitles(matches[0]).includes(parts.at(-1))) exactLeafTitles++
    else describedReferences.push({ id: row.id, text, candidates: matches })
  }
console.log(
  JSON.stringify(
    {
      contentCandidate: git('rev-parse', contentCandidate),
      registeredCandidate: git('rev-parse', registeredCandidate),
      productionFreeze: 'b11d4bc9',
      changedFiles: changes,
      oldCodexArtifactsUnchanged: true,
      registrationOnlyChangesFinalShaSemantics: true,
      ledger: { total: ledger.entries.length, byType, byPackage },
      reportCounts,
      reportCountSum: reportCounts.reduce((n, r) => n + r.report, 0),
      hashes,
      screenshots,
      hookCounts,
      appHooks: hooks.filter((h) => h.owner === 'App'),
      recursiveCalls,
      titles: {
        method: 'exact static test/it leaf literals; no execution or semantic coverage claim',
        exactLeafTitles,
        describedReferences,
      },
    },
    null,
    2,
  ),
)
