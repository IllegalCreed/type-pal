import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Codex r1 review probe. Usage: node --import tsx <this-file> <candidate-root>
// Candidate files stay untouched; Vite mutation is an isolated load view.
const root = resolve(process.argv[2])
const ts = createRequire(join(root, 'package.json'))('typescript')
const source = (p) => readFileSync(join(root, p), 'utf8')
const parse = (p) => ts.createSourceFile(p, source(p), ts.ScriptTarget.Latest, true)
const hash = (p) => createHash('sha256').update(source(p)).digest('hex')
const validate = await import(pathToFileURL(join(root, 'packages/content/src/validate.ts')).href)
const asset = await import(pathToFileURL(join(root, 'packages/content/src/asset.ts')).href)

const fixtureResults = []
for (const [file, name, guard] of [
  ['command-contract.test.ts', 'enemyState', (s) => validate.validateEnemies(s.enemies)],
  [
    'skill-commands.test.ts',
    'state',
    (s) => validate.validateSkills({ skills: s.skills, levelUp: s.levelUp }),
  ],
  ['asset-label-command.test.ts', 'state', (s) => asset.validateAssetCatalog(s.assetCatalog)],
]) {
  const path = `packages/editor/src/core/${file}`,
    sf = parse(path)
  const fn = sf.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name)
  assert(fn, `${path}: actual fixture function absent; adapt probe, do not infer a guard result`)
  const js = ts.transpileModule(fn.getText(sf), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  // These three frozen r1 factories consist only of their inline data literals.
  let input
  try {
    input = new Function(`${js};return ${name}()`)()
  } catch (error) {
    fixtureResults.push({ file, status: 'probe-needs-adaptation', error: String(error) })
    continue
  }
  try {
    guard(input)
    fixtureResults.push({ file, status: 'accepted' })
  } catch (error) {
    fixtureResults.push({ file, status: 'rejected', error: error.message })
  }
}

const runner = 'docs/testing/cursor-architecture-batch/module-mutants.mjs'
const sf = parse(runner)
let failures, assertion, predicate
function visit(n) {
  if (ts.isFunctionDeclaration(n) && n.name?.text === 'failures') failures = n.getText(sf)
  if (ts.isVariableDeclaration(n)) {
    if (n.name.getText(sf) === 'assertion') assertion = n.getText(sf)
    if (n.name.getText(sf) === 'ok') predicate = n.initializer?.getText(sf)
  }
  ts.forEachChild(n, visit)
}
visit(sf)
assert(
  failures && assertion && predicate,
  'actual runner predicate changed; adapt this frozen probe',
)
const judge = new Function(
  'red',
  'spec',
  'before',
  'after',
  `${failures};const failedTests=failures(red.json);const ${assertion};return ${predicate}`,
)
const judgeCases = [
  {
    id: 'ordinary-error-with-assertion-text',
    message: 'Error: ordinary failure\ncaused by AssertionError: quoted text',
  },
  { id: 'wrong-file-and-full-name', message: 'AssertionError: expected false to be true' },
].map(({ id, message }) => ({
  id,
  accepted: judge(
    {
      status: 1,
      json: {
        testResults: [
          {
            name: '/wrong-file.test.ts',
            assertionResults: [
              {
                title: 'target',
                fullName: 'wrong suite target',
                status: 'failed',
                failureMessages: [message],
              },
            ],
          },
        ],
      },
    },
    { title: 'target' },
    'same',
    'same',
  ),
  expectedAccepted: false,
}))

const product = 'packages/editor/src/core/ambience-commands.ts'
const beforeHash = hash(product)
const temp = mkdtempSync(join(tmpdir(), 'codex-cursor-arch-review-'))
const needle = 'if (references.length) throw new AmbienceInUseError(this.ambienceId, references)'
assert.equal(source(product).split(needle).length, 2, 'unique production deletion guard')
const selected = [
  'C07 ambience command family keeps ambience constructors on the old commands barrel and blocks in-use delete',
  'W6 氛围命令(不可变 + invert) DeleteAmbience:脚本显式引用、昼夜隐式引用和运行态引用均阻断且不改源',
]
const pattern = `^(?:${selected.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`
const runs = []
for (const mutant of [false, true]) {
  const label = mutant ? 'missing-guard' : 'control'
  const config = join(temp, `${label}.config.mts`),
    output = join(temp, `${label}.json`)
  const plugin = mutant
    ? `[{name:'codex-c07',enforce:'pre',load(id){
    if(id.split('?')[0]!==${JSON.stringify(join(root, product))})return;
    const text=readFileSync(${JSON.stringify(join(root, product))},'utf8');
    if(text.split(${JSON.stringify(needle)}).length!==2)throw Error('nonunique');
    console.log('CODEX_C07_GUARD_REMOVED');return text.replace(${JSON.stringify(needle)},'void references');
  }}]`
    : '[]'
  writeFileSync(
    config,
    `import {readFileSync} from 'node:fs';
    import base from ${JSON.stringify(join(root, 'packages/editor/vite.config.ts'))};
    export default {...base,root:${JSON.stringify(join(root, 'packages/editor'))},plugins:[...base.plugins,...${plugin}],
    test:{...base.test,maxWorkers:1,include:['src/core/ambience-commands.test.ts','src/core/commands.test.ts'],testNamePattern:${JSON.stringify(pattern)}}};`,
  )
  const env = { ...process.env }
  delete env.NODE_COMPILE_CACHE
  const run = spawnSync(
    'pnpm',
    [
      '--filter',
      '@type-pal/editor',
      'exec',
      'vitest',
      'run',
      '--config',
      config,
      '--reporter=json',
      `--outputFile=${output}`,
    ],
    { cwd: root, env, encoding: 'utf8', timeout: 60_000 },
  )
  assert.equal(run.error, undefined)
  const log = `${run.stdout}\n${run.stderr}`
  writeFileSync(join(temp, `${label}.log`), log)
  const json = JSON.parse(readFileSync(output, 'utf8'))
  const results = json.testResults.flatMap((s) =>
    s.assertionResults
      .filter((a) => ['passed', 'failed'].includes(a.status))
      .map((a) => ({
        file: s.name,
        fullName: a.fullName,
        status: a.status,
        firstError: a.failureMessages?.[0]?.split('\n')[0],
      })),
  )
  assert.deepEqual(results.map((r) => r.fullName).sort(), [...selected].sort())
  if (!mutant) assert.equal(run.status, 0, log)
  else assert(log.includes('CODEX_C07_GUARD_REMOVED'))
  runs.push({ label, exit: run.status, results })
}
assert.equal(hash(product), beforeHash)
console.log(
  JSON.stringify(
    { root, fixtureResults, judgeCases, runs, productHashUnchanged: true, beforeHash, temp },
    null,
    2,
  ),
)
