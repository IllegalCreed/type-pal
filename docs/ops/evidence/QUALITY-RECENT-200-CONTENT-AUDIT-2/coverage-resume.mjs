import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

assert.deepEqual(
  process.argv.slice(2),
  ['--resume'],
  'Historical heavy producer; use verify.mjs for the default read-only check.',
)

// Resume the failed official package and the unstarted packages. Completed reports
// pass the original inventory parser/census again; their test processes are not repeated.
const runner = resolve('scripts/coverage/run.mjs')
const source = await readFile(runner, 'utf8')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
assert.equal(hash(source), '87c5e8049444e8d5b6195b5d01ced2061420f04ed9a572a7e8f80f9b67a29d45')
const ts = createRequire(resolve('package.json'))('typescript')
const ast = ts.createSourceFile('run.mjs', source, ts.ScriptTarget.Latest, true)
const environment = { profile: 'fast', ratchet: true, allowScopeRemoval: true }
const declarations = new Map()
for (const statement of ast.statements) {
  if (ts.isImportDeclaration(statement)) {
    const specifier = statement.moduleSpecifier.text
    const module = await import(
      specifier.startsWith('.') ? new URL(specifier, pathToFileURL(runner)).href : specifier
    )
    const clause = statement.importClause
    if (clause.name) environment[clause.name.text] = module.default
    for (const element of clause.namedBindings?.elements ?? [])
      environment[element.name.text] = module[element.propertyName?.text ?? element.name.text]
  }
  if (ts.isFunctionDeclaration(statement))
    declarations.set(statement.name.text, statement.getText(ast))
  if (ts.isVariableStatement(statement))
    for (const declaration of statement.declarationList.declarations)
      if (
        ts.isIdentifier(declaration.name) &&
        !['ratchet', 'allowScopeRemoval', 'supportedFlags'].includes(declaration.name.text)
      )
        declarations.set(declaration.name.text, `const ${declaration.getText(ast)}`)
}
const fn = (name) => ast.statements.find((s) => ts.isFunctionDeclaration(s) && s.name.text === name)
const suffix = (name, variable) => {
  const statements = fn(name).body.statements
  const index = statements.findIndex(
    (s) =>
      ts.isVariableStatement(s) &&
      s.declarationList.declarations.some((d) => d.name.getText(ast) === variable),
  )
  assert(index >= 0, name)
  return statements
    .slice(index)
    .map((s) => s.getText(ast))
    .join('\n')
}
const inventoryTail = suffix('collectTestInventory', 'raw')
const censusTail = suffix('collectPackage', 'raw')
const resultTail = suffix('main', 'total')
const completed = ['content', 'shared']
const originals = []
for (const id of completed) {
  for (const file of [
    `coverage/fast/${id}/coverage-summary.json`,
    `coverage/fast/.test-inventory/${id}.fast.json`,
  ]) {
    originals.push({ path: file, sha256: hash(await readFile(file)) })
  }
}
const receipt = {
  originalExecution: 'uniform-official.execution.json',
  originalFailure: 'pal-extract/cli-entrypoint-paths.test.ts: unchanged 5000ms test deadline',
  reusedPackages: completed,
  originals,
  runnerSha256: hash(source),
  fragments: { inventory: hash(inventoryTail), census: hash(censusTail), result: hash(resultTail) },
  limits: 'No cause inferred from one timeout; source, selection, workers and deadlines unchanged.',
}
await writeFile(
  '/Users/zhangxu/.codex/quality-evidence/type-pal/recent200-content-20261028/official-resume-start.json',
  `${JSON.stringify(receipt, null, 2)}\n`,
  { flag: 'wx' },
)
environment.completed = completed
const program = `
${[...declarations.values()].join('\n;\n')}
async function completedPackage(packageConfig) {
  const selectedProfile = 'fast';
  const outputFile = resolve(coverageRoot, 'fast', '.test-inventory', packageConfig.id + '.fast.json');
  const fastTests = await (async () => {${inventoryTail}})();
  const selectedTests = fastTests;
  const reportDirectory = resolve(coverageRoot, 'fast', packageConfig.id);
  return await (async () => {${censusTail}})();
}
await assertToolVersions();
const outputRoot = resolve(coverageRoot, 'fast');
const reused = {};
for (const config of coveragePackages.filter(p => completed.includes(p.id)))
  reused[config.id] = await completedPackage(config);
const remaining = await collectPackages(coveragePackages.filter(p => !completed.includes(p.id)),
  p => collectPackage(p, outputRoot), true);
const packages = {...reused, ...remaining};
${resultTail}
`
await Function(
  ...Object.keys(environment),
  `return (async () => {${program}\n})()`,
)(...Object.values(environment))
console.log(
  'Resumed original package collection: reused2, collected remaining5; original guards/writer unchanged.',
)
