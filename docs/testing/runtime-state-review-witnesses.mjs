// Independent Codex review witnesses. Candidate product/tests are never edited.
// Usage: node docs/testing/runtime-state-review-witnesses.mjs /absolute/candidate
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'

assert(process.argv[2] && isAbsolute(process.argv[2]), 'Pass an absolute candidate worktree')
const root = realpathSync(process.argv[2])
const out = mkdtempSync(join(tmpdir(), 'codex-runtime-state-'))
const src = join(root, 'packages/reforge/src')
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const imports = `
import {expect,test} from ${JSON.stringify(join(root, 'node_modules/vitest/dist/index.js'))};
import {encodeFrameSequence,validateSprites} from ${JSON.stringify(join(root, 'packages/content/src/index.ts'))};
import {FrameSequenceReader,playFrameAnimation} from ${JSON.stringify(join(src, 'frame-animation-player.ts'))};
import {RuntimeSharedScriptResolver} from ${JSON.stringify(join(src, 'runtime-script-compiler.ts'))};
import {EntityActionPlayer,resolveSpriteActionBinding} from ${JSON.stringify(join(src, 'entity-action-player.ts'))};
import {makeTestWorld,makeTestSkills} from ${JSON.stringify(join(src, 'test-fixtures.ts'))};
import {openMagicMenu,magicConfirmCaster,magicConfirmSpell} from ${JSON.stringify(join(src, 'magic-menu-state.ts'))};
const identity=async bytes=>bytes.slice();
const binary=async (value,count=2)=>encodeFrameSequence({width:1,height:1,defaultFrameMs:40,
 frames:Array.from({length:count},()=>({rgba:new Uint8Array([value,0,0,255])}))},identity);
const buffer=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {resolve,promise};};
`
const probes = [
  {
    id: 'compiler-after-loss',
    file: 'runtime-script-compiler.ts',
    tests: ['src/runtime-script-compiler.boundaries.test.ts'],
    from: '    this.cache.set(key, compiled)',
    to: `    for (const node of compiled.body) node.after = [];
    this.cache.set(key, compiled)`,
    oracle: `const r=new RuntimeSharedScriptResolver({'shared/oracle':{name:'oracle',self:'none',body:[{kind:'wait',ms:17}]}},'a'.repeat(64));
      expect(r.resolve('shared/oracle','auto','perCommand').body.map(n=>n.after))
        .toEqual([[{kind:'wait',ms:100}]]);`,
  },
  {
    id: 'frame-await-cancel-bypass',
    file: 'frame-animation-player.ts',
    tests: ['src/frame-animation-player.boundaries.test.ts'],
    from: 'const frame = await awaitActive(options.reader.frame(options.asset, frameIndex))',
    to: 'const frame = await options.reader.frame(options.asset, frameIndex)',
    oracle: `const bytes=await binary(7);const entered=gate(),release=gate();
      const reader=new FrameSequenceReader({readBytes:async()=>buffer(bytes)},async b=>{
        entered.resolve();await release.promise;return identity(b);
      });
      const controller=new AbortController();let result='pending';const frames=[];
      const settled=playFrameAnimation({reader,asset:'a',endFrame:0,signal:controller.signal,
        onFrame:f=>frames.push(f.rgba[0]),wait:async()=>{}}).then(
          ()=>{result='fulfilled'},e=>{result=e.name});
      await entered.promise;controller.abort();
      // A real event-loop turn drains abort rejection without releasing the blocked read.
      await new Promise(resolve=>setImmediate(resolve));
      const beforeRelease=result;
      release.resolve();await settled;
      expect(beforeRelease).toBe('AbortError');expect(frames).toEqual([]);`,
  },
  {
    id: 'invalidate-keeps-old-container',
    file: 'frame-animation-player.ts',
    tests: ['src/frame-animation-player.boundaries.test.ts'],
    from: '    this.#sequences.delete(asset)',
    to: '    // witness: keep the completed stale container',
    oracle: `let bytes=await binary(1);const reader=new FrameSequenceReader({readBytes:async()=>buffer(bytes)},identity);
      expect((await reader.frame('a',0)).rgba[0]).toBe(1);
      bytes=await binary(9);reader.invalidate('a');
      expect((await reader.frame('a',0)).rgba[0]).toBe(9);`,
  },
  {
    id: 'lru-hit-does-not-touch',
    file: 'frame-animation-player.ts',
    tests: ['src/frame-animation-player.boundaries.test.ts'],
    from: '      this.#frames.delete(cacheKey)\n      this.#frames.set(cacheKey, cached)',
    to: '      // witness: turn cache-hit policy from LRU into FIFO',
    oracle: `const bytes=await binary(4);let decodes=0;
      const reader=new FrameSequenceReader({readBytes:async()=>buffer(bytes)},async b=>{decodes++;return identity(b)},3);
      await reader.frame('a',0);await reader.frame('b',0);
      await reader.frame('a',1);await reader.frame('b',0);
      expect(decodes).toBe(2); // both were actual hits
      await reader.frame('c',0);expect(decodes).toBe(3);
      await reader.frame('b',0);expect(decodes).toBe(3); // most recent b0 must survive`,
  },
  {
    id: 'expired-action-replays-cues',
    file: 'entity-action-player.ts',
    tests: ['src/entity-action-player.boundaries.test.ts'],
    from: '    if (override.finished) {',
    to: `    if (override.finished) {
      for (const step of override.action.steps) for (const cue of step.cues ?? []) this.onCue(entity, cue);`,
    oracle: `const sprite={id:'s',label:'s',asset:'sprite.s',layout:{kind:'static'},poses:{one:{label:'one',
      steps:[{frame:0,durationMs:10,cues:[{kind:'sound',asset:'sound.one'}]}]}}};
      validateSprites([sprite]);const cues=[];const player=new EntityActionPlayer((_id,cue)=>cues.push(cue));
      const binding=resolveSpriteActionBinding(sprite,{sprite:'s',action:'one',loop:false,startAtMs:20});
      await player.play('e',binding);expect(cues).toEqual([]);`,
  },
  {
    id: 'magic-confirm-mutates-world',
    file: 'magic-menu-state.ts',
    tests: ['src/magic-menu-state.boundaries.test.ts'],
    from: '  if (caster.mp < (skill.cost.mp ?? 0)) return null',
    to: `  caster.hp -= 1;
  if (caster.mp < (skill.cost.mp ?? 0)) return null`,
    oracle: `const w=makeTestWorld(),skills=makeTestSkills();
      const menu=magicConfirmCaster(openMagicMenu(w,skills),w,skills);
      const before=structuredClone(w);magicConfirmSpell(menu,w);expect(w).toEqual(before);`,
  },
  {
    id: 'magic-cast-all-mutates-world',
    file: 'magic-menu-state.ts',
    tests: ['src/magic-menu-state.boundaries.test.ts'],
    from: "  if (skill.target === 'allAllies') return { kind: 'castAll', skill }",
    to: "  if (skill.target === 'allAllies') { caster.hp -= 1; return { kind: 'castAll', skill }; }",
    oracle: `const w=makeTestWorld(),skills=makeTestSkills();
      skills['oracle-all']={...skills['296'],id:'oracle-all',target:'allAllies'};
      w.learnedSkills[w.party[0].id]=['oracle-all'];
      const menu=magicConfirmCaster(openMagicMenu(w,skills),w,skills);
      const before=structuredClone(w);
      expect(magicConfirmSpell(menu,w)).toEqual({kind:'castAll',skill:skills['oracle-all']});
      expect(w).toEqual(before);`,
  },
]

// A failed candidate is not automatically a business detection. Vitest's JSON
// reporter can replace timeout details with STACK_TRACE_ERROR. Never borrow the
// independent oracle's AssertionError to certify the candidate's failure kind.
function candidateFailureKind(failureMessages) {
  // Inspect each error headline, not stack function names such as runWithTimeout.
  const headlines = failureMessages.map((message) => message.split('\n', 1)[0] ?? '')
  return headlines.length > 0 &&
    headlines.every((headline) => /^AssertionError(?:\b|:)/.test(headline))
    ? 'business-assertion'
    : 'invalid-candidate-failure'
}
assert.equal(
  candidateFailureKind(['AssertionError: expected pending to be AbortError']),
  'business-assertion',
)
assert.equal(candidateFailureKind(['Error: STACK_TRACE_ERROR']), 'invalid-candidate-failure')
assert.equal(
  candidateFailureKind(['AssertionError: unrelated', 'Error: STACK_TRACE_ERROR']),
  'invalid-candidate-failure',
)
assert.equal(
  candidateFailureKind([
    'AssertionError: expected 1 to equal 2\n    at runWithTimeout (runner.js:1)',
  ]),
  'business-assertion',
)

const productHashes = Object.fromEntries(
  [...new Set(probes.map((p) => join(src, p.file)))].map((file) => [file, sha(file)]),
)
const testHashes = Object.fromEntries(
  [...new Set(probes.flatMap((p) => p.tests))].map((file) => {
    const absolute = join(root, 'packages/reforge', file)
    return [absolute, sha(absolute)]
  }),
)
const fixtureCode = `
import {legalScene,legalItems,legalSharedLibrary} from ${JSON.stringify(join(src, '__tests__/glm-state-boundary-fixtures.ts'))};
import {validateAuthorScenes,validateRuntimeScenes,validateAuthorItemCore,checkRuntimeScriptLibrary}
 from ${JSON.stringify(join(root, 'packages/content/src/index.ts'))};
const checks=[['author-scene',()=>validateAuthorScenes([legalScene()])],
 ['runtime-scene',()=>validateRuntimeScenes([legalScene()])],
 ['author-items',()=>validateAuthorItemCore(Object.values(legalItems()))],
 ['runtime-library',()=>checkRuntimeScriptLibrary(legalSharedLibrary())]];
console.log(JSON.stringify(checks.map(([name,check])=>{try{check();return {name,result:'accepted'}}
 catch(error){return {name,result:'rejected',reason:error.message}}})));
`
const fixtureRun = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--input-type=module', '-e', fixtureCode],
  { cwd: root, encoding: 'utf8', timeout: 30_000 },
)
assert.equal(fixtureRun.status, 0, fixtureRun.stderr)
const fixtureEvidence = JSON.parse(fixtureRun.stdout)
console.log(JSON.stringify({ fixtureEvidence }))
const results = []
for (const probe of probes) {
  const file = join(src, probe.file)
  assert.equal(
    readFileSync(file, 'utf8').split(probe.from).length,
    2,
    `${probe.id}: exact single source point`,
  )
  const oracleFile = join(out, `${probe.id}.test.ts`)
  const title = `Codex independent oracle: ${probe.id}`
  writeFileSync(
    oracleFile,
    `${imports}\ntest(${JSON.stringify(title)},async()=>{\n${probe.oracle}\n});\n`,
  )
  for (const mutated of [false, true]) {
    const label = `${probe.id}-${mutated ? 'mutant' : 'control'}`
    const config = join(out, `${label}.config.mjs`)
    const reportPath = join(out, `${label}.json`)
    writeFileSync(
      config,
      `
import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const point=${JSON.stringify({ file, from: probe.from, to: probe.to, mutated, label })};
export default {root:${JSON.stringify(join(root, 'packages/reforge'))},plugins:[{
name:'codex-runtime-state-witness',enforce:'pre',load(id){
  if(!point.mutated||id.split('?')[0]!==point.file)return;
  const code=readFileSync(point.file,'utf8');assert.equal(code.split(point.from).length,2);
  console.log('WITNESS_LOADED',point.label);return code.replace(point.from,point.to);
}}],test:{include:${JSON.stringify([...probe.tests, oracleFile])},maxWorkers:1,fileParallelism:false}};
`,
    )
    const run = spawnSync(
      'pnpm',
      [
        '--filter',
        '@type-pal/reforge',
        'exec',
        'vitest',
        'run',
        '--config',
        config,
        '--reporter=json',
        '--outputFile',
        reportPath,
      ],
      { cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 16 * 1024 * 1024 },
    )
    const report = JSON.parse(readFileSync(reportPath, 'utf8'))
    const assertions = report.testResults.flatMap((f) => f.assertionResults)
    const oracle = assertions.find((a) => a.title === title)
    const submitted = assertions.filter((a) => a.title !== title)
    assert(oracle && submitted.length > 0, `${label}: oracle and candidate tests must execute`)
    const output = `${run.stdout}\n${run.stderr}\n${assertions.flatMap((a) => a.failureMessages ?? []).join('\n')}`
    writeFileSync(join(out, `${label}.log`), output)
    assert.equal(run.signal, null, `${label}: interrupted`)
    assert.doesNotMatch(
      output,
      /Cannot find module|Failed to load url|SyntaxError|TypeError|ReferenceError|Test timed out|Unhandled Errors/,
      `${label}: environment or unhandled failure`,
    )
    if (!mutated) {
      assert.equal(run.status, 0, `${label}: original product must pass both sets`)
      assert(assertions.every((a) => a.status === 'passed'))
    } else {
      assert.equal(run.status, 1, `${label}: independent oracle must detect the bad behavior`)
      assert(output.includes(`WITNESS_LOADED ${label}`))
      assert.equal(oracle.status, 'failed', `${label}: independent oracle must execute and fail`)
      assert.match((oracle.failureMessages ?? []).join('\n'), /AssertionError/)
    }
    const candidateFailureDetails = submitted
      .filter((a) => a.status === 'failed')
      .map((a) => ({
        name: a.fullName,
        kind: candidateFailureKind(a.failureMessages ?? []),
        messages: a.failureMessages ?? [],
      }))
    const candidateFailures = candidateFailureDetails.map((a) => a.name)
    const invalidFailure = candidateFailureDetails.some((a) => a.kind !== 'business-assertion')
    assert(
      submitted.every((a) => a.status === 'passed' || a.status === 'failed'),
      `${label}: skipped/pending cases`,
    )
    results.push({
      id: probe.id,
      mode: mutated ? 'mutant' : 'control',
      exit: run.status,
      candidateTests: submitted.length,
      candidateFailures,
      candidateFailureDetails,
      verdict: !mutated
        ? 'control'
        : invalidFailure
          ? 'invalid-candidate-failure'
          : candidateFailures.length
            ? 'detected'
            : 'MISSED',
      oracleStatus: oracle.status,
      report: reportPath,
    })
    console.log(JSON.stringify(results.at(-1)))
  }
}
for (const [file, digest] of Object.entries({ ...productHashes, ...testHashes }))
  assert.equal(sha(file), digest, `Candidate changed: ${file}`)
writeFileSync(
  join(out, 'summary.json'),
  `${JSON.stringify({ root, productHashes, testHashes, fixtureEvidence, results }, null, 2)}\n`,
)
console.log(JSON.stringify({ outputDirectory: out, summary: join(out, 'summary.json') }))
