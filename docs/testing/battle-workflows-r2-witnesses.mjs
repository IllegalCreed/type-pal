/** Independent r2 review. Candidate source/test files are never edited on disk. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const root = realpathSync(process.argv[2])
const output = mkdtempSync(join(tmpdir(), 'battle-workflows-r2-review-'))
const sourceFile = resolve(root, 'packages/reforge/src/battle/battle-session.ts')
const driverFile = resolve(
  root,
  'packages/reforge/src/__tests__/battle-workflows/session-driver.ts',
)
const catalogFile = resolve(root, 'packages/reforge/src/__tests__/battle-workflows/catalog.ts')
const source = readFileSync(sourceFile, 'utf8')
const groups = ['selection', 'round', 'action', 'script', 'terminal', 'writeback']
const tests = groups.map((g) => `src/battle/battle-session.${g}-flows.test.ts`)
const protectedFiles = [
  sourceFile,
  driverFile,
  catalogFile,
  resolve(root, 'packages/reforge/src/__tests__/battle-workflows/controlled-io.ts'),
  ...tests.map((f) => resolve(root, 'packages/reforge', f)),
  resolve(root, 'docs/testing/glm-battle-workflows-mutants.mjs'),
]
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex')
const hashes = Object.fromEntries(protectedFiles.map((f) => [f, sha(f)]))
const ts = createRequire(resolve(toolRoot, 'package.json'))('typescript')
const catalogSource = readFileSync(catalogFile, 'utf8')
const catalogAst = ts.createSourceFile(catalogFile, catalogSource, ts.ScriptTarget.Latest, true)
let actorExpression
function findActor(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'wfActorDef') {
    const returned = node.body.statements.filter(ts.isReturnStatement)
    assert.equal(returned.length, 1)
    actorExpression = returned[0].expression.getText(catalogAst)
  }
  ts.forEachChild(node, findActor)
}
findActor(catalogAst)
assert(actorExpression)
assert.equal(catalogSource.split(actorExpression).length, 2, 'unique actor factory expression')
const ast = ts.createSourceFile(sourceFile, source, ts.ScriptTarget.Latest, true)
let fixedGrowth
function findGrowth(node) {
  if (ts.isCaseClause(node) && node.expression.getText(ast) === "'fixedCharacterGrowth'") {
    assert.equal(fixedGrowth, undefined)
    fixedGrowth = node.getText(ast)
  }
  ts.forEachChild(node, findGrowth)
}
findGrowth(ast)
assert(fixedGrowth)
const growthNeedle = 'character.magicAttack += mutation.delta.magicAttack'
assert.equal(fixedGrowth.split(growthNeedle).length, 2)

const cases = [
  { id: 'control', include: tests },
  { id: 'actual-input-guards', include: tests, guards: true },
  {
    id: 'failure-cleanup-observer',
    include: [tests[3]],
    pattern: '屏障挂起：pending 期间按键零业务副作用',
    cleanup: true,
    expectedExit: 1,
  },
  { id: 'old-disable-auto', include: [tests[1]], from: "if (key('a', 'A')) {", to: 'if (false) {' },
  {
    id: 'old-disable-repeat',
    include: [tests[1]],
    from: "if (key('r', 'R')) {",
    to: 'if (false) {',
  },
  {
    id: 'old-drop-persistent-writeback',
    include: [tests[5]],
    from: 'writeBackPersistentEffects(world: WorldState): void {',
    to: 'writeBackPersistentEffects(world: WorldState): void { return;',
  },
  {
    id: 'old-terminal-never-settles',
    include: [tests[4]],
    pattern: 'victory：真实击杀|defeat：玩家|playerFled：Q',
    from: 'this.resolveDone(result)',
    to: 'void result',
  },
  {
    id: 'old-preparing-mutates-mp',
    include: [tests[3]],
    from: "if (this.ui === 'preparing') return",
    to: "if (this.ui === 'preparing') { if (pressed.size && s.players[0]) s.players[0].mp -= 1; return }",
  },
  {
    id: 'growth-magic-attack-lost',
    include: tests,
    from: fixedGrowth,
    to: fixedGrowth.replace(growthNeedle, 'void mutation.delta.magicAttack'),
  },
  {
    id: 'skill-removal-lost',
    include: tests,
    from: 'if (mutation.removed) {',
    to: 'if (false && mutation.removed) {',
  },
  {
    id: 'ready-hook-loses-next-enemy-action',
    include: tests,
    from: "const activation = beginEnemyHookActivation(s, queueHead.idx, 'ready')\n          if (activation) {",
    to: "const activation = beginEnemyHookActivation(s, queueHead.idx, 'ready')\n          if (activation) { s.actionQueue.shift();",
  },
  {
    id: 'hp-writeback-hardcoded-one',
    include: [tests[5]],
    from: "c.hp = this.state.phase === 'lost' ? Math.max(p.hp, 0) : Math.max(p.hp, 1)",
    to: 'c.hp = 1',
  },
]
const rows = []
for (const item of cases) {
  if (item.from) assert.equal(source.split(item.from).length, 2, `${item.id}: unique needle`)
  const report = join(output, `${item.id}.json`)
  const marker = join(output, `${item.id}.loaded`)
  const guards = join(output, `${item.id}.guards.jsonl`)
  const config = join(output, `${item.id}.config.mjs`)
  const guardedCatalog = `import {appendFileSync as __actorLog} from 'node:fs';\n${catalogSource.replace(actorExpression, `((actual) => { validateActors([actual]); __actorLog(${JSON.stringify(guards)}, JSON.stringify({actorId:actual.id, initialMagic:actual.battler.initialMagic})+'\\n'); return actual; })(${actorExpression})`)}`
  const cleanupData = join(output, 'cleanup-observation.json')
  const cleanupTestFile = resolve(root, 'packages/reforge', tests[3])
  let cleanupTest = readFileSync(cleanupTestFile, 'utf8')
  for (const needle of [
    'import { describe, expect, test }',
    'const defer =',
    'expect(prepareCalls).toBe(1)',
  ])
    assert.equal(cleanupTest.split(needle).length, 2, `cleanup anchor drift: ${needle}`)
  cleanupTest = cleanupTest.replace(
    'import { describe, expect, test }',
    'import { describe, expect, test as __test }',
  )
  const injectedFailure = `const __failure = Object.assign(new Error('Codex injected cleanup assertion'), {name:'AssertionError'}); const test=(name,body)=>__test(name,async()=>{try { await body(); } catch(error) { const observed=globalThis.__bw2Pending; const result={originalFailure:error===__failure,settledAtBodyExit:observed?.settled??null}; try {await observed?.promise;} finally {result.settledAfterObserverConsumes=observed?.settled??null; __cleanupWrite(${JSON.stringify(cleanupData)},JSON.stringify(result));} throw error; }});\n`
  cleanupTest = `import {writeFileSync as __cleanupWrite} from 'node:fs';\n${cleanupTest.replace('const defer =', `${injectedFailure}const defer =`).replace('expect(prepareCalls).toBe(1)', 'throw __failure')}`
  const rawDriver = readFileSync(driverFile, 'utf8')
  assert.equal(rawDriver.split('  const playerSpriteId =').length, 2, 'cleanup driver anchor drift')
  const cleanupDriver = rawDriver.replace(
    '  const playerSpriteId =',
    `  if(args.extraOpts?.prepareTurnSounds){const original=args.extraOpts.prepareTurnSounds;args={...args,extraOpts:{...args.extraOpts,prepareTurnSounds(snapshot){const promise=original(snapshot);const entry={promise,settled:false};globalThis.__bw2Pending=entry;Promise.resolve(promise).then(()=>{entry.settled=true},()=>{entry.settled=true});return promise;}}};}\n  const playerSpriteId =`,
  )
  writeFileSync(
    config,
    `import {readFileSync,writeFileSync} from 'node:fs';
const item=${JSON.stringify(item)};
export default {root:${JSON.stringify(resolve(root, 'packages/reforge'))},plugins:[{name:'codex-r2-review',enforce:'pre',load(id){
 if(item.from&&id===${JSON.stringify(sourceFile)}){const text=readFileSync(id,'utf8');if(text.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},id);return text.replace(item.from,item.to)}
 if(item.cleanup&&id===${JSON.stringify(cleanupTestFile)})return ${JSON.stringify(cleanupTest)};
 if(item.cleanup&&id===${JSON.stringify(driverFile)})return ${JSON.stringify(cleanupDriver)};
 if(item.guards&&id===${JSON.stringify(catalogFile)})return ${JSON.stringify(guardedCatalog)};
 if(item.guards&&id===${JSON.stringify(driverFile)}){
  let text=readFileSync(id,'utf8');
  const needle='  const session = new BattleSession(';
  if(text.split(needle).length!==2)throw Error('driver anchor drift');
  text="import * as __guard from '@type-pal/content'; import {appendFileSync as __append} from 'node:fs';\\n"+text.replace(needle,
   "  __guard.validateEnemies(args.enemies.filter(e=>e!==null)); __guard.validateSkills({skills:Object.values(args.extraOpts?.skills??{}),levelUp:{}}); __guard.validateItems(Object.values(args.extraOpts?.items??{})); __guard.validateBattleSprites([...spriteEntries.values()].map(s=>s.definition)); __append("+${JSON.stringify(JSON.stringify(guards))}+",JSON.stringify({enemyIds:args.enemies.filter(Boolean).map(e=>e.id),skills:Object.keys(args.extraOpts?.skills??{}),items:Object.keys(args.extraOpts?.items??{})})+'\\\\n');\\n"+needle);
  return text;
 }
}}],test:{include:item.include,testNamePattern:item.pattern,maxWorkers:1,reporters:['json'],outputFile:${JSON.stringify(report)}}};
`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 16 * 1024 * 1024,
  })
  writeFileSync(join(output, `${item.id}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  const data = JSON.parse(readFileSync(report, 'utf8'))
  const failed = data.testResults.flatMap((f) =>
    f.assertionResults
      .filter((t) => t.status === 'failed')
      .map((t) => ({ file: f.name, title: t.fullName, messages: t.failureMessages })),
  )
  if (item.from) assert.equal(readFileSync(marker, 'utf8'), sourceFile)
  const business =
    failed.length > 0 &&
    failed.every(
      (f) =>
        f.messages.length &&
        f.messages.every(
          (m) =>
            /^AssertionError(?:\b|:)|^expect\(/.test(m.split('\n')[0]) &&
            !/timed out|waitFor/i.test(m),
        ),
    )
  rows.push({
    id: item.id,
    exit: run.status,
    passed: data.numPassedTests,
    failed: data.numFailedTests,
    business,
    failures: failed,
    meaning: item.cleanup
      ? 'reviewer-injected assertion; observe then consume the actual preparation promise'
      : item.from
        ? run.status === 0
          ? 'mutation survived'
          : 'mutation rejected'
        : 'unchanged candidate with observations only',
  })
  if (!item.from) assert.equal(run.status, item.expectedExit ?? 0, `${item.id} failed; ${output}`)
  for (const [f, h] of Object.entries(hashes)) assert.equal(sha(f), h)
  console.log(
    `${item.id}: ${run.status}, ${data.numPassedTests} pass / ${data.numFailedTests} fail`,
  )
}

// Evaluate the real candidate verdict, including all its actual title/file/witness predicates.
const mutantTool = readFileSync(
  resolve(root, 'docs/testing/glm-battle-workflows-mutants.mjs'),
  'utf8',
)
const toolAst = ts.createSourceFile(
  'mutants.mjs',
  mutantTool,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
)
const names = [
  'businessFirstLine',
  'assertions',
  'fileMatches',
  'executed',
  'failed',
  'titleMatches',
  'mutationWitness',
  'business',
  'verdict',
]
const expressions = {}
function extract(node) {
  if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(toolAst)))
    expressions[node.name.getText(toolAst)] = node.initializer.getText(toolAst)
  ts.forEachChild(node, extract)
}
extract(toolAst)
for (const name of names) assert(expressions[name], `actual predicate missing ${name}`)
const judge = new Function(
  'data',
  'run',
  'item',
  'testFile',
  'mutation',
  'logText',
  `${names.map((n) => `const ${n}=${expressions[n]};`).join('\n')}\nreturn verdict;`,
)
const leaf = 'R 重复上轮 cast：次轮真实重提同一法术（MP 40→20→0 精确阶梯）'
const file = tests[1]
const absolute = resolve(root, 'packages/reforge', file)
const assertion = {
  status: 'failed',
  fullName: `W2 跨轮策略 ${leaf}`,
  title: leaf,
  failureMessages: ['AssertionError: expected 20 to be 0'],
}
const data = { testResults: [{ name: absolute, status: 'failed', assertionResults: [assertion] }] }
const item = { redTest: leaf, name: 'w2-repeat-lookup-removed' }
const evaluate = (d, log = 'MUTATION_HIT w2-repeat-lookup-removed') =>
  judge(d, { status: 1 }, item, file, item, log)
const variants = {}
variants.correct = evaluate(structuredClone(data))
const wrongSuite = structuredClone(data)
wrongSuite.testResults[0].assertionResults[0].fullName = `Other unrelated suite ${leaf}`
variants.wrongSuite = evaluate(wrongSuite)
const wrongFile = structuredClone(data)
wrongFile.testResults[0].name = `/unrelated/project/${file}`
variants.wrongFile = evaluate(wrongFile)
variants.wrongMarker = evaluate(structuredClone(data), 'MUTATION_HIT unrelated-mutation')
const mixed = structuredClone(data)
mixed.testResults.push({
  name: absolute,
  status: 'failed',
  message: 'Error: setup failed',
  assertionResults: [],
})
mixed.numRuntimeErrorTestSuites = 1
variants.mixedSuiteError = evaluate(mixed)
const timeout = structuredClone(data)
timeout.testResults[0].assertionResults[0].failureMessages = ['AssertionError: waitFor timed out']
variants.timeoutFirstLine = evaluate(timeout)
const tailTimeout = structuredClone(data)
tailTimeout.testResults[0].assertionResults[0].failureMessages = [
  'AssertionError: expected promise to settle\nCause: Test timed out in 5000ms',
]
variants.timeoutLaterLine = evaluate(tailTimeout)
assert.equal(variants.correct, 'detected')
const cleanup = JSON.parse(readFileSync(join(output, 'cleanup-observation.json'), 'utf8'))
assert.equal(cleanup.originalFailure, true, 'must observe the exact injected assertion')
assert.equal(
  cleanup.settledAfterObserverConsumes,
  true,
  'the observer must consume the original callback promise',
)
writeFileSync(
  join(output, 'summary.json'),
  JSON.stringify(
    {
      root,
      hashes,
      rows,
      cleanup,
      actualToolCriterion: variants,
    },
    null,
    2,
  ),
)
console.log(JSON.stringify(variants))
console.log(`Evidence: ${output}`)
