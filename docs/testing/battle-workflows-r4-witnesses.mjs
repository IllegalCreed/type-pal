/** Independent r4 session-layer witnesses. Never edits candidate files on disk. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = realpathSync(process.argv[2])
const output = mkdtempSync(join(tmpdir(), 'battle-workflows-r4-review-'))
const sourceFiles = {
  core: resolve(root, 'packages/reforge/src/battle/battle-core.ts'),
  session: resolve(root, 'packages/reforge/src/battle/battle-session.ts'),
}
const groups = ['selection', 'round', 'action', 'script', 'terminal', 'writeback']
const tests = groups.map((g) => `src/battle/battle-session.${g}-flows.test.ts`)
const selection = resolve(root, 'packages/reforge', tests[0])
const protectedFiles = [
  ...Object.values(sourceFiles),
  ...tests.map((f) => resolve(root, 'packages/reforge', f)),
  ...['catalog', 'controlled-io', 'session-driver'].map((f) =>
    resolve(root, `packages/reforge/src/__tests__/battle-workflows/${f}.ts`),
  ),
]
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex')
const hashes = Object.fromEntries(protectedFiles.map((f) => [f, sha(f)]))
const coopOracle = `import {test,expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {wfEnemy,wfPlayer,wfCoopSkill} from '../__tests__/battle-workflows/catalog.js';
import {makeWfSession} from '../__tests__/battle-workflows/session-driver.js';
test('Codex session coop suppresses teammate attack while a target is still alive',async()=>{
 const h=makeWfSession({players:[wfPlayer('p1',{cooperativeMagicSkillId:'wf-coop'}),wfPlayer('p2',{cooperativeMagicSkillId:'wf-coop'})],enemies:[wfEnemy('survivor',{health:5000,defense:0,attackStrength:1,dexterity:1})],extraOpts:{skills:{'wf-coop':wfCoopSkill('wf-coop',9)}}});
 h.press(['ArrowRight']);h.press([' ']);
 for(let i=0;i<200;i++){h.idle(100);for(let j=0;j<6;j++)await Promise.resolve();if(h.session.debugLog().some(l=>l.startsWith('合体技 '))&&h.session.debugReadiness().phase==='menu')break;}
 const log=h.session.debugLog();const phase=h.session.debugReadiness().phase;
 writeFileSync(FACTS,JSON.stringify({log,phase,party:h.readParty()}));
 expect(log.filter(l=>l.startsWith('合体技 '))).toHaveLength(1);
 expect(phase).toBe('menu');
 expect(log.filter(l=>/^p[12] .*攻击/.test(l))).toEqual([]);
});`
const invalidOracle = `import {test,expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {wfEnemy,wfPlayer,wfCoopSkill} from '../__tests__/battle-workflows/catalog.js';
import {makeWfSession} from '../__tests__/battle-workflows/session-driver.js';
test('Codex invalid coop is rejected by selection, not only by core fallback',async()=>{
 const snapshots=[];
 const h=makeWfSession({players:[wfPlayer('p1',{cooperativeMagicSkillId:'wf-coop',attackStrength:30})],enemies:[wfEnemy('e1',{health:500,defense:0,attackStrength:0})],extraOpts:{skills:{'wf-coop':wfCoopSkill('wf-coop',9)},prepareTurnSounds:s=>{snapshots.push([...s.actions.entries()]);return Promise.resolve();}}});
 h.press(['ArrowRight']);h.press([' ']);
 const afterFirstConfirm=h.session.debugReadiness().phase;
 h.press([' ']);h.idle(500);for(let j=0;j<6;j++)await Promise.resolve();
 writeFileSync(FACTS,JSON.stringify({afterFirstConfirm,snapshots}));
 expect(afterFirstConfirm).toBe('target');
 expect(snapshots).toEqual([[[0,{kind:'attack',targetEnemyIdx:0}]]]);
});`
const noConsume = {
  module: 'core',
  from: "if (s.coopThisTurn && queued.kind !== 'coop') {",
  to: "if (false && s.coopThisTurn && queued.kind !== 'coop') {",
}
const invalidAdmitted = {
  module: 'session',
  from: 'healthyPlayerCount(this.state) > 1',
  to: 'healthyPlayerCount(this.state) > 0',
}
const cases = [
  { id: 'candidate-control', include: tests },
  { id: 'coop-consumption-removed-candidate', include: tests, ...noConsume },
  { id: 'coop-consumption-oracle', include: [tests[0]], oracle: coopOracle },
  { id: 'coop-consumption-removed-oracle', include: [tests[0]], oracle: coopOracle, ...noConsume },
  { id: 'invalid-coop-admitted-candidate', include: tests, ...invalidAdmitted },
  { id: 'invalid-coop-oracle', include: [tests[0]], oracle: invalidOracle },
  {
    id: 'invalid-coop-admitted-oracle',
    include: [tests[0]],
    oracle: invalidOracle,
    ...invalidAdmitted,
  },
  {
    id: 'empty-throw-list-opens',
    include: [tests[0]],
    pattern: '无可投掷品时 W',
    module: 'session',
    from: 'if (this.throwableItems().length) {',
    to: 'if (true) {',
  },
  {
    id: 'nonvictory-settlement',
    include: [tests[4]],
    pattern: 'enemyFled：|terminated：',
    module: 'session',
    from: "if (this.terminalResult === 'victory' && this.settlement === null) {",
    to: 'if (this.settlement === null) {',
  },
]
const rows = []
for (const item of cases) {
  const sourceFile = sourceFiles[item.module]
  if (item.from)
    assert.equal(
      readFileSync(sourceFile, 'utf8').split(item.from).length,
      2,
      `${item.id}: unique mutation`,
    )
  const report = join(output, `${item.id}.json`)
  const marker = join(output, `${item.id}.loaded`)
  const facts = join(output, `${item.id}.facts.json`)
  const config = join(output, `${item.id}.config.mjs`)
  const oracle = item.oracle?.replace('FACTS', JSON.stringify(facts))
  writeFileSync(
    config,
    `import {readFileSync,writeFileSync} from 'node:fs';
export default {root:${JSON.stringify(resolve(root, 'packages/reforge'))},plugins:[{name:'codex-r4',enforce:'pre',load(id){
 if(id===${JSON.stringify(selection)}&&${Boolean(oracle)})return ${JSON.stringify(oracle)};
 if(id===${JSON.stringify(sourceFile)}&&${Boolean(item.from)}){let text=readFileSync(id,'utf8');if(text.split(${JSON.stringify(item.from)}).length!==2)throw Error('mutation drift');writeFileSync(${JSON.stringify(marker)},id);return text.replace(${JSON.stringify(item.from)},${JSON.stringify(item.to)})}
}}],test:{include:${JSON.stringify(item.include)},testNamePattern:${JSON.stringify(item.pattern)},maxWorkers:1,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 16 * 1024 * 1024,
  })
  writeFileSync(join(output, `${item.id}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  const data = JSON.parse(readFileSync(report, 'utf8'))
  const failures = data.testResults.flatMap((f) =>
    f.assertionResults
      .filter((t) => t.status === 'failed')
      .map((t) => ({ file: f.name, title: t.fullName, messages: t.failureMessages })),
  )
  if (item.from) assert.equal(readFileSync(marker, 'utf8'), sourceFile)
  const business =
    run.status === 1 &&
    failures.length > 0 &&
    failures.every(
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
    failures,
    oracle: !!item.oracle,
  })
  if (!item.from) assert.equal(run.status, 0, `${item.id} control failed; ${output}`)
  for (const [f, h] of Object.entries(hashes)) assert.equal(sha(f), h)
  console.log(
    `${item.id}: exit${run.status}, ${data.numPassedTests} pass/${data.numFailedTests} fail`,
  )
}
writeFileSync(join(output, 'summary.json'), JSON.stringify({ root, hashes, rows }, null, 2))
console.log(`Evidence: ${output}`)
