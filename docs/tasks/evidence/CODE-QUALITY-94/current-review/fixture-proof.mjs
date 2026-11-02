import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../../../../../', import.meta.url)),
  sha = (b) => createHash('sha256').update(b).digest('hex')
const review = JSON.parse(readFileSync(new URL('review.json', import.meta.url), 'utf8'))
const before = (path) =>
  execFileSync('git', ['show', `${review.base}:${path}`], { cwd: root, encoding: 'utf8' })
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const { makeRole } = await import(
  pathToFileURL(resolve(root, 'packages/game/src/__tests__/coverage85-glm-game/harness.ts')).href
)
const { magicWithCost } = await import(
  pathToFileURL(resolve(root, 'packages/game/src/core/menu/__tests__/magic-cost-fixture.ts')).href
)
function source(file) {
  return readFileSync(resolve(root, file), 'utf8')
}
function body(text, name) {
  const ast = ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true)
  const f = ast.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name)
  assert(f, name)
  return f.getText(ast)
}
function evaluate(text, name) {
  const js = ts.transpileModule(body(text, name), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  return new Function('makeRole', 'magicWithCost', `${js};return ${name}`)(makeRole, magicWithCost)
}
const covPath = 'packages/game/src/core/menu/menu-driver.cov85.test.ts',
  mainPath = 'packages/game/src/core/menu/menu-driver.test.ts'
const oldCov = before(covPath),
  newCov = source(covPath),
  oldMain = before(mainPath)
for (const args of [[1], [349, 20]])
  assert.deepEqual(evaluate(oldCov, 'mkMagic')(...args), evaluate(newCov, 'mkMagic')(...args))
assert.deepEqual(evaluate(oldCov, 'typedRoles')(), evaluate(newCov, 'typedRoles')())
for (const args of [
  [1, 0],
  [349, 20],
])
  assert.deepEqual(evaluate(oldMain, 'mkMagic')(...args), magicWithCost(...args))
const a = evaluate(newCov, 'typedRoles')(),
  b = evaluate(newCov, 'typedRoles')()
assert.notEqual(a.roles, b.roles)
assert.notEqual(a.roles[0], b.roles[0])
assert.notEqual(a.roles[0].elemResistance, b.roles[0].elemResistance)
const proof = {
  state: 'MATCH',
  kind: 'Fixture constructor value/shape preservation, not a business oracle',
  bindings: [
    covPath,
    mainPath,
    'packages/game/src/core/menu/__tests__/magic-cost-fixture.ts',
    'packages/game/src/__tests__/coverage85-glm-game/harness.ts',
  ].map((path) => ({ path, sha256: sha(readFileSync(resolve(root, path))) })),
  oldSourceHashes: { cov: sha(oldCov), main: sha(oldMain) },
  allRoleFieldsEqual: true,
  magicOverridesEqual: true,
  freshNestedRoles: true,
  limits:
    'Actual test assertions/identities checked separately; finite fixture constructors have fixed field layouts. No product/source/framebuffer mocked.',
}
console.log(JSON.stringify(proof))

const printer = ts.createPrinter({ removeComments: true })
for (const path of ['primitives.ts', 'opening-menu.ts', 'player-status.ts']) {
  const file = `packages/game/src/core/menu/${path}`
  const parse = (text) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  assert.equal(printer.printFile(parse(before(file))), printer.printFile(parse(source(file))), file)
}
console.log('PASS: fixture values/shape/freshness and3 comment-only production bodies; read-only.')
for (const file of [
  'packages/game/src/core/menu/menu-driver.ts',
  'packages/game/src/core/save/api.ts',
]) {
  const pureSource = execFileSync('git', ['show', `${review.pureCommit}:${file}`], {
    cwd: root,
    encoding: 'utf8',
  })
  const parse = (text) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  assert.equal(printer.printFile(parse(before(file))), printer.printFile(parse(pureSource)), file)
}
console.log('PASS: pure-quality commit keeps driver/API production bodies unchanged from main.')
const policy = 'scripts/coverage/approved-test-retirements.mjs'
assert.equal(
  printer.printFile(
    ts.createSourceFile(
      'old.mjs',
      body(before(policy), 'isApprovedTestRetirement'),
      ts.ScriptTarget.Latest,
    ),
  ),
  printer.printFile(
    ts.createSourceFile(
      'new.mjs',
      body(source(policy), 'isApprovedTestRetirement'),
      ts.ScriptTarget.Latest,
    ),
  ),
)
console.log(
  'PASS: exact-retirement executable predicate unchanged; only one approval snapshot replaced.',
)
