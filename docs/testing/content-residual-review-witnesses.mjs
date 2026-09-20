// Codex independent intake witnesses; candidate files are never modified.
// Usage: node docs/testing/content-residual-review-witnesses.mjs /absolute/candidate
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'

assert(process.argv[2] && isAbsolute(process.argv[2]), 'Pass an absolute candidate')
const root = realpathSync(process.argv[2])
const out = mkdtempSync(join(tmpdir(), 'codex-content-residual-'))
console.log(JSON.stringify({ outputDirectory: out }))
const src = join(root, 'packages/content/src')
const ts = createRequire(join(root, 'package.json'))('typescript')
const fixturePath = join(src, 'validate-refs.data-refs.test.ts')
const fixtureText = readFileSync(fixturePath, 'utf8')
const ast = ts.createSourceFile(fixturePath, fixtureText, ts.ScriptTarget.Latest, true)
const declarations = ast.statements.filter(
  (node) =>
    ts.isVariableStatement(node) &&
    node.declarationList.declarations.some((d) => d.name.getText(ast) === 'bundle'),
)
assert.equal(declarations.length, 1, 'Read the actual submitted bundle factory')
const fixtureCode = ts.transpileModule(declarations[0].getText(ast), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText
const imports = `
import {expect,test} from ${JSON.stringify(join(root, 'node_modules/vitest/dist/index.js'))};
import * as c from ${JSON.stringify(join(src, 'index.ts'))};
${fixtureCode}
`
const guardCode = `import * as c from ${JSON.stringify(join(src, 'index.ts'))};
${fixtureCode}
const b=bundle();const result=[];
for(const [name,run] of [
 ['scenes',()=>c.validateAuthorScenes(b.scenes)],['actors',()=>c.validateActors(b.actors)],
 ['sprites',()=>c.validateSprites(b.sprites)],['battleSprites',()=>c.validateBattleSprites(b.battleSprites)],
 ['startWorld',()=>c.validateStartWorld(b.entryPoints[0].startWorld)],['maps',()=>c.validateMapIndex(b.mapIndex)],
 ['references',()=>{const issues=c.validateReferences(b);if(issues.length)throw Error(JSON.stringify(issues))}]
]){try{run();result.push({name,verdict:'accepted'})}catch(e){result.push({name,verdict:'rejected',reason:e.message})}}
console.log(JSON.stringify(result));`
const fixtureRun = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--input-type=module', '-e', guardCode],
  { cwd: root, encoding: 'utf8', timeout: 30_000 },
)
assert.equal(fixtureRun.status, 0, fixtureRun.stderr)
const fixtureEvidence = JSON.parse(fixtureRun.stdout)
console.log(JSON.stringify({ fixtureEvidence }))
const mutantPath = join(root, 'docs/testing/glm-content-residual-mutants.mjs')
const mutantText = readFileSync(mutantPath, 'utf8')
const mutantAst = ts.createSourceFile(mutantPath, mutantText, ts.ScriptTarget.Latest, true)
const verdictBlocks = []
const pinBlocks = []
function collectChecks(node) {
  if (ts.isIfStatement(node)) {
    const condition = node.expression.getText(mutantAst)
    if (condition === 'item.expected === 1')
      verdictBlocks.push(node.thenStatement.getText(mutantAst))
    if (condition === 'item.redTest !== undefined')
      pinBlocks.push(node.thenStatement.getText(mutantAst))
  }
  ts.forEachChild(node, collectChecks)
}
collectChecks(mutantAst)
assert.equal(verdictBlocks.length, 1)
assert.equal(pinBlocks.length, 1)
const checkSubmittedCriterion = new Function(
  'assert',
  'item',
  'output',
  'assertions',
  'log',
  `${verdictBlocks[0]}\n${pinBlocks[0]}`,
)
const poisonedItem = { name: 'codex-mixed', expected: 1, redTest: 'target' }
let mixedFailureAccepted = true
try {
  checkSubmittedCriterion(
    assert,
    poisonedItem,
    'MUTATION_HIT codex-mixed\nAssertionError: unrelated test\nError: STACK_TRACE_ERROR',
    [
      { title: 'target', status: 'failed', failureMessages: ['Error: STACK_TRACE_ERROR'] },
      { title: 'other', status: 'failed', failureMessages: ['AssertionError: unrelated test'] },
    ],
    'synthetic',
  )
} catch {
  mixedFailureAccepted = false
}
const criterionEvidence = { mixedFailureAccepted }
console.log(JSON.stringify({ criterionEvidence }))
const probes = [
  {
    id: 'reject-valid-unicode-index',
    file: 'frame-sequence.ts',
    test: 'frame-sequence.residual.test.ts',
    from: "  return out.join('')",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: isolated production replacement
    to: "  if (out.some(c => c.codePointAt(0) > 127)) throw new Error(`${path}: 非法 UTF-8 码点`);\n  return out.join('')",
    oracle: `const original=c.encodeFrameSequenceSync({width:1,height:1,defaultFrameMs:40,
      frames:[{rgba:new Uint8Array([1,2,3,255])}]},b=>b.slice());
      const n=new DataView(original.buffer,original.byteOffset,original.byteLength).getUint32(8,true);
      const metadata=JSON.parse(new TextDecoder().decode(original.subarray(12,12+n)));
      metadata['名']='值';const index=new TextEncoder().encode(JSON.stringify(metadata));
      const payload=original.subarray(12+n),bytes=new Uint8Array(12+index.length+payload.length);
      bytes.set(original.subarray(0,12));new DataView(bytes.buffer).setUint32(8,index.length,true);
      bytes.set(index,12);bytes.set(payload,12+index.length);
      expect(()=>c.parseFrameSequence(bytes)).not.toThrow();
      const parsed=c.parseFrameSequence(bytes);
      expect(parsed.index).toMatchObject({width:1,height:1,defaultFrameMs:40});
      expect(parsed.index.frames).toEqual([{}]);
      expect([...parsed.payload]).toEqual([...payload]);`,
  },
  {
    id: 'portrait-scan-mutates-actual-cue',
    file: 'asset.ts',
    test: 'asset.residual.test.ts',
    from: '        const directPortrait = identityRecord.portrait',
    to: `        const directPortrait = identityRecord.portrait;
        if(directPortrait && typeof directPortrait === 'object') directPortrait.side = 'right';`,
    oracle: `const cue={identity:{kind:'unbound',portrait:{asset:'portrait.hero',side:'left'}},rows:[{text:'x'}]};
      c.checkAuthorDialogueCue(cue,'cue');const before=structuredClone(cue);
      expect(c.commandAssetTaggedReferencesAtNode({kind:'dialog',cue},'r')).toEqual([
        {asset:'portrait.hero',expectedKind:'portrait',where:'r.cue.identity.portrait.asset'}]);
      expect(cue).toEqual(before);`,
  },
  {
    id: 'world-reference-scan-mutates-money',
    file: 'validate-refs.ts',
    test: 'validate-refs.data-refs.test.ts',
    from: '        const battleSprite = character.appearance?.battleSprite',
    to: '        world.money += 1;\n        const battleSprite = character.appearance?.battleSprite',
    oracle: `const b=bundle();c.validateAuthorScenes(b.scenes);c.validateActors(b.actors);
      c.validateBattleSprites(b.battleSprites);c.validateSprites(b.sprites);c.validateMapIndex(b.mapIndex);
      const start=c.validateStartWorld(b.entryPoints[0].startWorld);
      const world=c.buildWorld(start,Object.fromEntries(b.actors.map(a=>[a.id,a])));
      world.party[0].appearance={battleSprite:'bs-hero'};b.worlds=[world];
      const before=structuredClone(b);expect(c.validateReferences(b)).toEqual([]);expect(b).toEqual(before);`,
  },
  {
    id: 'valid-world-reference-mutates-money',
    file: 'validate-refs.ts',
    test: 'validate-refs.data-refs.test.ts',
    from: 'export function validateReferences(b: ContentBundle): Issue[] {',
    to: `export function validateReferences(b: ContentBundle): Issue[] {
      for (const world of b.worlds ?? []) {
        if (world.party.some(character => b.battleSprites.some(sprite => sprite.id === character.appearance?.battleSprite))) world.money += 1;
      }`,
    oracle: `const b=bundle();c.validateActors(b.actors);c.validateBattleSprites(b.battleSprites);
      const world=c.buildWorld(c.validateStartWorld(b.entryPoints[0].startWorld),Object.fromEntries(b.actors.map(a=>[a.id,a])));
      world.party[0].appearance={battleSprite:'bs-hero'};b.worlds=[world];
      const before=structuredClone(b);expect(c.validateReferences(b)).toEqual([]);expect(b).toEqual(before);`,
  },
  {
    id: 'nonempty-level-up-mutates-level',
    file: 'validate-refs.ts',
    test: 'validate-refs.data-refs.test.ts',
    from: '  for (const [cid, list] of Object.entries(b.levelUp)) {',
    to: `  for (const [cid, list] of Object.entries(b.levelUp)) {
      for (const entry of list) entry.level += 1;`,
    oracle: `const b=bundle();b.skills=[{id:'skill-a',name:'技能A',desc:'',cost:{mp:1},usableOutsideBattle:true,target:'oneAlly',effects:[],animation:{effectSprite:0}}];
      b.levelUp={hero:[{level:2,skillId:'skill-a'}]};c.validateActors(b.actors);c.validateSkills({skills:b.skills,levelUp:b.levelUp});
      const before=structuredClone(b);expect(c.validateReferences(b)).toEqual([]);expect(b).toEqual(before);`,
  },
]
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const tracked = [...new Set(probes.flatMap((p) => [join(src, p.file), join(src, p.test)]))]
const hashes = Object.fromEntries(tracked.map((file) => [file, sha(file)]))
const results = []
for (const p of probes) {
  const file = join(src, p.file)
  assert.equal(readFileSync(file, 'utf8').split(p.from).length, 2, `${p.id}: unique source point`)
  const oracleFile = join(out, `${p.id}.test.ts`)
  const title = `Codex independent oracle: ${p.id}`
  writeFileSync(oracleFile, `${imports}\ntest(${JSON.stringify(title)},async()=>{${p.oracle}});\n`)
  for (const mutated of [false, true]) {
    const label = `${p.id}-${mutated ? 'mutant' : 'control'}`
    const config = join(out, `${label}.config.mjs`)
    const reportPath = join(out, `${label}.json`)
    const point = { file, from: p.from, to: p.to, mutated, label }
    writeFileSync(
      config,
      `import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const p=${JSON.stringify(point)};
export default {root:${JSON.stringify(join(root, 'packages/content'))},plugins:[{name:'codex-residual-witness',enforce:'pre',load(id){
if(!p.mutated||id.split('?')[0]!==p.file)return;const code=readFileSync(p.file,'utf8');
assert.equal(code.split(p.from).length,2);console.log('WITNESS_LOADED',p.label);return code.replace(p.from,p.to);
}}],test:{include:${JSON.stringify([`src/${p.test}`, oracleFile])},maxWorkers:1,fileParallelism:false}};`,
    )
    const run = spawnSync(
      'pnpm',
      [
        '--filter',
        '@type-pal/content',
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
    assert.equal(run.signal, null, `${label}: interrupted`)
    const report = JSON.parse(readFileSync(reportPath, 'utf8'))
    const assertions = report.testResults.flatMap((f) => f.assertionResults)
    const oracle = assertions.find((a) => a.title === title)
    const candidate = assertions.filter((a) => a.title !== title)
    assert(oracle && candidate.length > 0, 'oracle and candidate must execute')
    const output = `${run.stdout}\n${run.stderr}\n${assertions.flatMap((a) => a.failureMessages ?? []).join('\n')}`
    writeFileSync(join(out, `${label}.log`), output)
    assert.doesNotMatch(
      output,
      /Cannot find module|Failed to load url|SyntaxError|TypeError|ReferenceError|Test timed out|Unhandled Errors|STACK_TRACE_ERROR/,
    )
    assert(
      candidate.every((a) => a.status === 'passed' || a.status === 'failed'),
      'no pending/skip',
    )
    const failures = candidate.filter((a) => a.status === 'failed')
    if (!mutated) {
      assert.equal(run.status, 0, `${label}: control`)
      assert(assertions.every((a) => a.status === 'passed'))
    } else {
      assert.equal(run.status, 1, `${label}: oracle must detect`)
      assert(output.includes(`WITNESS_LOADED ${label}`))
      assert.equal(oracle.status, 'failed')
      assert((oracle.failureMessages ?? []).every((m) => m.startsWith('AssertionError')))
      assert(
        failures.every(
          (a) =>
            a.failureMessages.length > 0 &&
            a.failureMessages.every((m) => m.startsWith('AssertionError')),
        ),
      )
    }
    results.push({
      id: p.id,
      mode: mutated ? 'mutant' : 'control',
      exit: run.status,
      candidateTests: candidate.length,
      candidateFailures: failures.map((a) => a.fullName),
      oracleStatus: oracle.status,
      verdict: !mutated ? 'control' : failures.length ? 'detected' : 'MISSED',
      report: reportPath,
    })
    console.log(JSON.stringify(results.at(-1)))
  }
}
for (const [file, hash] of Object.entries(hashes)) assert.equal(sha(file), hash, file)
writeFileSync(
  join(out, 'summary.json'),
  `${JSON.stringify({ root, fixtureEvidence, criterionEvidence, hashes, results }, null, 2)}\n`,
)
console.log(JSON.stringify({ outputDirectory: out, summary: join(out, 'summary.json') }))
