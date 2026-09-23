/** Independent intake witnesses. All substitutions are in Vite's loader; candidate disk stays intact. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const root = realpathSync(process.argv[2] ?? toolRoot)
const output = mkdtempSync(join(tmpdir(), 'battle-workflows-review-'))
const sessionFile = resolve(root, 'packages/reforge/src/battle/battle-session.ts')
const tests = ['selection', 'round', 'action', 'script', 'terminal', 'writeback'].map(
  (group) => `src/battle/battle-session.${group}-flows.test.ts`,
)
const fingerprintFiles = [
  sessionFile,
  ...tests.map((file) => resolve(root, 'packages/reforge', file)),
  ...['catalog', 'controlled-io', 'session-driver'].map((file) =>
    resolve(root, 'packages/reforge/src/battle/__tests__/battle-workflows', `${file}.ts`),
  ),
]
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const hashes = Object.fromEntries(fingerprintFiles.map((file) => [file, digest(file)]))
const ts = createRequire(resolve(toolRoot, 'package.json'))('typescript')
const actorText = readFileSync(
  resolve(root, 'packages/reforge/src/battle/battle-session.writeback-flows.test.ts'),
  'utf8',
)
const actorAst = ts.createSourceFile('fixture.ts', actorText, ts.ScriptTarget.Latest, true)
let actorExpression
function findActor(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(actorAst) === 'wfActor') {
    assert.equal(actorExpression, undefined)
    actorExpression = node.initializer.getText(actorAst)
  }
  ts.forEachChild(node, findActor)
}
findActor(actorAst)
assert(actorExpression, 'candidate actor fixture moved; adapt explicitly')
// Extract only the inspected test factory, not any production algorithm.
const probeFile = resolve(
  root,
  'packages/reforge/src/battle/battle-session.selection-flows.test.ts',
)
const probe = `import {test,expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {validateSkills,validateActors,validateItems,validateBattleSprites,validateEnemies,buildWorld,itemUseSupportsContext} from '@type-pal/content';
import {attackSkill,wfEnemy,wfPlayer,PLAYER_PROFILE,assertWfCatalogFixtureLegal} from './__tests__/battle-workflows/catalog.js';
import {makeWfSession} from './__tests__/battle-workflows/session-driver.js';
const wfActor=${actorExpression};
const check=(fn)=>{try{fn();return {accepted:true}}catch(error){return {accepted:false,message:error.message}}};
test('Codex independent fixture and public-route witnesses',()=>{
 const skill=attackSkill('wf-strike',20),actor=wfActor('p1');
 const legalSkill={id:'wf-strike',name:'Strike',desc:'',cost:{mp:20},usableOutsideBattle:false,target:'oneEnemy',effects:[{kind:'damage',power:20,elemental:0}],animation:{effectSprite:0}};
 const guards={skill:check(()=>validateSkills({skills:[skill],levelUp:{}})),actor:check(()=>validateActors([actor])),profile:check(()=>validateBattleSprites([{id:'player',label:'Player',asset:'asset.player',profile:PLAYER_PROFILE}])),item:check(()=>validateItems([{id:'wf-potion',name:'丹',buyPrice:0,sellPrice:0,sellable:false,use:{target:'scene',consuming:true,effects:[]}}])),enemy:check(()=>validateEnemies([wfEnemy('e1')])),legalSkill:check(()=>validateSkills({skills:[legalSkill],levelUp:{}}))};
 guards.emptyItem=check(()=>validateItems([{}]));
 writeFileSync(${JSON.stringify(join(output, 'guards.json'))},JSON.stringify(guards,null,2));
 for(const key of ['skill','actor','profile','emptyItem'])expect(guards[key].accepted,key).toBe(false);
 expect(guards.item.accepted).toBe(true);
 expect(itemUseSupportsContext({target:'scene',consuming:true,effects:[]},'battle')).toBe(false);
 expect(guards.enemy.accepted).toBe(true);expect(guards.legalSkill.accepted).toBe(true);
 expect(()=>assertWfCatalogFixtureLegal({enemies:[wfEnemy('e1')],players:[wfPlayer('p1')]})).not.toThrow();
 const run=(definition,key)=>{const h=makeWfSession({players:[wfPlayer('p1',{skills:['wf-strike'],mp:40,maxMp:40})],enemies:[wfEnemy('e1',{health:500,attackStrength:1})],extraOpts:{skills:{'wf-strike':definition}}});h.press([key]);const phaseAfterKey=h.session.debugReadiness().phase;h.press([' ']);const phaseAfterChoice=h.session.debugReadiness().phase;h.press([' ']);h.press([' ']);for(let i=0;i<16;i++)h.idle(500);h.press(['r','R']);for(let i=0;i<16;i++)h.idle(500);h.press(['r','R']);for(let i=0;i<16;i++)h.idle(500);const party=[{id:'p1',hp:100,mp:-1}];h.session.writeBackHp(party);return{phaseAfterKey,phaseAfterChoice,party,log:h.session.debugLog()}};
 const candidateTrace=run(skill,'s'),legalS=run(legalSkill,'s'),legalArrow=run(legalSkill,'ArrowLeft');
 expect(candidateTrace.phaseAfterKey).toBe('menu');expect(candidateTrace.party[0].mp).toBe(40);
 expect(legalS.phaseAfterKey).toBe('menu');expect(legalS.party[0].mp).toBe(40);
 expect(candidateTrace.phaseAfterChoice).toBe('target');expect(legalS.phaseAfterChoice).toBe('target');
 expect(legalArrow.phaseAfterChoice).toBe('skill');expect(legalArrow.party[0].mp).toBeLessThan(40);
 const h=makeWfSession({players:[wfPlayer('p1')],enemies:[wfEnemy('e1',{health:1,defense:0,attackStrength:1})]});const world=buildWorld({party:['p1'],money:0,inventory:[]},{p1:actor});const before=structuredClone(world);h.press([' ']);h.press([' ']);for(let i=0;i<80&&h.session.debugReadiness().phase!=='over';i++)h.idle(500);h.session.writeBackPersistentEffects(world);expect(world).toEqual(before);
 writeFileSync(${JSON.stringify(join(output, 'facts-data.json'))},JSON.stringify({guards,candidateTrace,legalS,legalArrow,growthCaseChanged:false},null,2));
});`

const cases = [
  { id: 'candidate-control', include: tests, expectedPassed: 31 },
  { id: 'facts', include: [tests[0]], replacementTest: probe, expectedPassed: 1 },
  {
    id: 'disable-auto',
    include: [tests[1]],
    from: "if (key('a', 'A')) {",
    to: 'if (false) {',
    expectedPassed: 5,
  },
  {
    id: 'disable-repeat',
    include: [tests[1]],
    from: "if (key('r', 'R')) {",
    to: 'if (false) {',
    expectedPassed: 5,
  },
  {
    id: 'drop-persistent-writeback',
    include: [tests[5]],
    from: 'writeBackPersistentEffects(world: WorldState): void {',
    to: 'writeBackPersistentEffects(world: WorldState): void { return;',
    expectedPassed: 5,
  },
  {
    id: 'terminal-never-settles',
    include: [tests[4]],
    pattern: 'victory：真实击杀|defeat：玩家|playerFled：Q',
    from: 'this.resolveDone(result)',
    to: 'void result',
    expectedPassed: 3,
  },
  {
    id: 'preparing-mutates-mp',
    include: [tests[3]],
    from: "if (this.ui === 'preparing') return",
    to: "if (this.ui === 'preparing') { if (pressed.size && s.players[0]) s.players[0].mp -= 1; return }",
    expectedPassed: 4,
  },
]
const results = []
for (const item of cases) {
  if (item.from)
    assert.equal(readFileSync(sessionFile, 'utf8').split(item.from).length, 2, `${item.id}: needle`)
  const report = join(output, `${item.id}.json`),
    config = join(output, `${item.id}.config.mjs`),
    marker = join(output, `${item.id}.entered`)
  writeFileSync(
    config,
    `import{readFileSync,writeFileSync}from'node:fs';const item=${JSON.stringify(item)};export default{root:${JSON.stringify(resolve(root, 'packages/reforge'))},plugins:[{name:'codex-intake-witness',enforce:'pre',load(id){if(item.replacementTest&&id===${JSON.stringify(probeFile)})return item.replacementTest;if(item.from&&id===${JSON.stringify(sessionFile)}){const source=readFileSync(id,'utf8');if(source.split(item.from).length!==2)throw Error('nonunique source');writeFileSync(${JSON.stringify(marker)},id);return source.replace(item.from,item.to)}}}],test:{include:item.include,testNamePattern:item.pattern,maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};\n`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: root,
    encoding: 'utf8',
  })
  writeFileSync(join(output, `${item.id}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  assert.equal(run.status, 0, `${item.id}: unexpected failure; ${output}`)
  const data = JSON.parse(readFileSync(report, 'utf8'))
  assert.equal(data.numPassedTests, item.expectedPassed)
  assert.equal(data.numFailedTests, 0)
  if (item.from) assert.equal(readFileSync(marker, 'utf8'), sessionFile)
  results.push({
    id: item.id,
    exit: run.status,
    passed: data.numPassedTests,
    filtered: data.numPendingTests,
    meaning: item.from
      ? 'bad implementation survived unchanged candidate assertions'
      : item.id === 'facts'
        ? 'independent facts, not candidate acceptance'
        : 'unchanged positive control',
  })
  for (const [file, hash] of Object.entries(hashes))
    assert.equal(digest(file), hash, `${item.id}: candidate disk changed`)
  console.log(`${item.id}: ${data.numPassedTests} passed`)
}

// Execute the candidate tool's actual predicate/verdict expressions, not a rewritten oracle.
const tool = readFileSync(resolve(root, 'docs/testing/glm-battle-workflows-mutants.mjs'), 'utf8')
const ast = ts.createSourceFile('mutants.mjs', tool, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
const expressions = {}
function extract(node) {
  if (ts.isVariableDeclaration(node) && ['business', 'verdict'].includes(node.name.getText(ast)))
    expressions[node.name.getText(ast)] = node.initializer.getText(ast)
  ts.forEachChild(node, extract)
}
extract(ast)
assert(expressions.business && expressions.verdict)
const judge = new Function(
  'run',
  'executed',
  'failed',
  `const business=${expressions.business};return ${expressions.verdict};`,
)
const wrongTitle = judge({ status: 1 }, 1, [
  {
    title: 'not-the-requested-case',
    fullName: 'unrelated',
    status: 'failed',
    failureMessages: ['AssertionError: expected'],
  },
])
const timeout = judge({ status: 1 }, 1, [
  { title: 'requested', status: 'failed', failureMessages: ['AssertionError: waitFor timed out'] },
])
assert.equal(wrongTitle, 'detected')
assert.equal(timeout, 'detected')
writeFileSync(
  join(output, 'summary.json'),
  JSON.stringify(
    {
      root,
      hashes,
      results,
      facts: JSON.parse(readFileSync(join(output, 'facts-data.json'), 'utf8')),
      toolCriterion: { wrongTitle, timeout },
    },
    null,
    2,
  ),
)
console.log(`Independent intake evidence: ${output}`)
