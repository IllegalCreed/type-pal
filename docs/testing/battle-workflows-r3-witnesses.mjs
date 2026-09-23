/** Independent r3 review. Candidate source/test files are never edited on disk. */
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
const output = mkdtempSync(join(tmpdir(), 'battle-workflows-r3-review-'))
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

const clampOracle = `import {test,expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {validateStartWorld} from '@type-pal/content';
import {wfEnemy} from '../__tests__/battle-workflows/catalog.js';
import {makeWfSessionFromWorld} from '../__tests__/battle-workflows/session-driver.js';
test('Codex public two-member victory reaches non-lost HP zero clamp',async()=>{
 const seed={party:['p1','p2'],money:0,inventory:[],seedStats:{p1:{hp:0}}};
 expect(()=>validateStartWorld(seed)).not.toThrow();
 const {harness:h,world}=makeWfSessionFromWorld({actorIds:seed.party,seedStats:seed.seedStats,enemies:[wfEnemy('one-hit',{health:1,defense:0,attackStrength:1})]});
 const before=structuredClone(world.party);
 expect(before.map(p=>p.hp)).toEqual([0,100]);
 let outcome='pending';h.session.done.then(v=>outcome=v,e=>outcome=e.name);
 h.press([' ']);h.press([' ']);
 for(let i=0;i<80&&outcome==='pending';i++){h.idle(500);for(let j=0;j<6;j++)await Promise.resolve();}
 expect(outcome).toBe('victory');
 const raw=h.session.debugPlayers().map(p=>p.hp);
 expect(raw).toEqual([0,100]);
 h.session.writeBackHp(world.party);
 writeFileSync(${JSON.stringify(join(output, 'clamp-facts.json'))},JSON.stringify({before:before.map(p=>p.hp),outcome,battleHp:raw,writtenHp:world.party.map(p=>p.hp)}));
 expect(world.party.map(p=>p.hp)).toEqual([1,100]);
});`
const waitOracle = `import {test,expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {wfEnemy,wfPlayer} from '../__tests__/battle-workflows/catalog.js';
import {makeWfSession} from '../__tests__/battle-workflows/session-driver.js';
test('Codex public readiness observer detects a commit during enemy hook wait',async()=>{
 const enemy=wfEnemy('waiter',{health:500,attackStrength:1});
 enemy.ai.hooks={turnStart:{initial:'hold',states:{hold:{body:[{kind:'wait',ms:400},{kind:'playSound',asset:'sound.after-wait'}],next:{kind:'stay'}}}}};
 const committed=[];
 const h=makeWfSession({players:[wfPlayer('p1',{attackStrength:30})],enemies:[enemy],extraOpts:{prepareTurnSounds:snapshot=>{committed.push([...snapshot.actions.entries()]);return Promise.resolve()}}});
 h.idle(16);
 for(let i=0;i<8;i++){h.press([' '],16);for(let j=0;j<6;j++)await Promise.resolve();}
 writeFileSync(${JSON.stringify(join(output, 'wait-facts.json'))},JSON.stringify({elapsed:144,committed,log:h.session.debugLog(),phase:h.session.debugReadiness().phase}));
 expect(committed).toHaveLength(0);
});`
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
  {
    id: 'former-growth-magic-attack-lost',
    include: tests,
    from: fixedGrowth,
    to: fixedGrowth.replace(growthNeedle, 'void mutation.delta.magicAttack'),
  },
  {
    id: 'former-skill-removal-lost',
    include: tests,
    from: 'if (mutation.removed) {',
    to: 'if (false && mutation.removed) {',
  },
  {
    id: 'former-ready-loses-next-action',
    include: tests,
    from: "const activation = beginEnemyHookActivation(s, queueHead.idx, 'ready')\n          if (activation) {",
    to: "const activation = beginEnemyHookActivation(s, queueHead.idx, 'ready')\n          if (activation) { s.actionQueue.shift();",
  },
  {
    id: 'former-hp-hardcoded-one',
    include: [tests[5]],
    from: "c.hp = this.state.phase === 'lost' ? Math.max(p.hp, 0) : Math.max(p.hp, 1)",
    to: 'c.hp = 1',
  },
  {
    id: 'repeat-growth-writeback',
    include: tests,
    from: 'if (this.persistentEffectsWritten) return',
    to: 'void this.persistentEffectsWritten',
  },
  {
    id: 'clear-inventory-on-writeback',
    include: tests,
    from: 'writeBackPersistentEffects(world: WorldState): void {',
    to: 'writeBackPersistentEffects(world: WorldState): void { world.inventory.length=0;',
  },
  {
    id: 'clamp-removed-candidate',
    include: tests,
    from: 'Math.max(p.hp, 1)',
    to: 'Math.max(p.hp, 0)',
  },
  { id: 'clamp-oracle', include: [tests[0]], replacementTest: clampOracle },
  {
    id: 'clamp-removed-oracle',
    include: [tests[0]],
    replacementTest: clampOracle,
    from: 'Math.max(p.hp, 1)',
    to: 'Math.max(p.hp, 0)',
  },
  {
    id: 'hook-input-leak',
    include: [tests[3]],
    pattern: '敌 hook 等待与选择恢复',
    from: 'if (this.pumpScriptExecution(dtMs, pressed)) return\n      const sel = this.nextSelecting()',
    to: 'this.pumpScriptExecution(dtMs, pressed)\n      const sel = this.nextSelecting()',
  },
  { id: 'hook-wait-oracle', include: [tests[0]], replacementTest: waitOracle },
  {
    id: 'hook-leak-oracle',
    include: [tests[0]],
    replacementTest: waitOracle,
    from: 'if (this.pumpScriptExecution(dtMs, pressed)) return\n      const sel = this.nextSelecting()',
    to: 'this.pumpScriptExecution(dtMs, pressed)\n      const sel = this.nextSelecting()',
  },
]
const rows = []
for (const item of cases) {
  if (item.replacementTest)
    item.replacementTest = item.replacementTest
      .replace(
        JSON.stringify(join(output, 'clamp-facts.json')),
        JSON.stringify(join(output, `${item.id}-facts.json`)),
      )
      .replace(
        JSON.stringify(join(output, 'wait-facts.json')),
        JSON.stringify(join(output, `${item.id}-facts.json`)),
      )
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
 if(item.replacementTest&&id===${JSON.stringify(resolve(root, 'packages/reforge', tests[0]))})return item.replacementTest;
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
    meaning: item.replacementTest
      ? 'independent public-state oracle, not a candidate test'
      : item.cleanup
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

// Execute the candidate's actual judge function, not a parallel acceptance predicate.
const tool = readFileSync(resolve(root, 'docs/testing/glm-battle-workflows-mutants.mjs'), 'utf8')
const toolAst = ts.createSourceFile(
  'tool.mjs',
  tool,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
)
let judgeSource
function findJudge(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'judge') {
    assert.equal(judgeSource, undefined)
    judgeSource = node.getText(toolAst)
  }
  ts.forEachChild(node, findJudge)
}
findJudge(toolAst)
assert(judgeSource)
const judge = new Function('resolve', `return (${judgeSource})`)(resolve)
const item = { name: 'needle-a' }
const targetFileAbs = resolve(root, 'packages/reforge', tests[5])
const base = {
  runStatus: 1,
  targetFileAbs,
  resolvedFullName: 'Correct suite target',
  logText: 'MUTATION_HIT:needle-a',
  data: {
    testResults: [
      {
        name: targetFileAbs,
        message: '',
        assertionResults: [
          {
            fullName: 'Correct suite target',
            status: 'failed',
            failureMessages: ['AssertionError: expected 20 to be 22'],
          },
        ],
      },
    ],
  },
}
const result = (mutate) => {
  const x = structuredClone(base)
  mutate?.(x)
  return judge(item, x)
}
const variants = {
  correct: result(),
  wrongSuite: result(
    (x) => (x.data.testResults[0].assertionResults[0].fullName = 'Other suite target'),
  ),
  wrongFile: result((x) => (x.data.testResults[0].name = `/other/project/${tests[5]}`)),
  wrongMarker: result((x) => (x.logText = 'MUTATION_HIT:needle-b')),
  mixedSuiteError: result((x) => (x.data.testResults[0].message = 'Error: afterAll failed')),
  timeoutLaterLine: result(
    (x) =>
      (x.data.testResults[0].assertionResults[0].failureMessages = [
        'AssertionError: expected result\nTest timed out in 5000ms',
      ]),
  ),
  sameCaseMixedMessages: result((x) =>
    x.data.testResults[0].assertionResults[0].failureMessages.push('Error: fixture setup failed'),
  ),
  unexpectedExit2: result((x) => (x.runStatus = 2)),
  killedExitNull: result((x) => (x.runStatus = null)),
}
assert.equal(variants.correct.verdict, 'detected')
const cleanup = JSON.parse(readFileSync(join(output, 'cleanup-observation.json'), 'utf8'))
assert.equal(cleanup.originalFailure, true)
assert.equal(cleanup.settledAfterObserverConsumes, true)
writeFileSync(
  join(output, 'summary.json'),
  JSON.stringify({ root, hashes, rows, cleanup, actualToolCriterion: variants }, null, 2),
)
console.log(JSON.stringify(variants))
console.log(`Evidence: ${output}`)
