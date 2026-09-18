// Codex independent review. A green mutant means MISSED, not acceptance.
// Usage: node docs/testing/content-contracts-review-witnesses.mjs /absolute/candidate/worktree
// Only in-memory Vite source changes; candidate tests and product files remain untouched.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'

const root = process.argv[2]
assert.ok(root && isAbsolute(root), 'pass the candidate physical absolute path')
const src = join(root, 'packages/content/src')
const logs = mkdtempSync(join(tmpdir(), 'content-contract-review-'))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const ts = createRequire(join(root, 'package.json'))('typescript')

const classifierFile = join(root, 'docs/testing/glm-content-contracts-mutants.mjs')
const classifierAst = ts.createSourceFile(
  classifierFile,
  readFileSync(classifierFile, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
)
const classifierBlocks = []
function visitClassifier(node) {
  if (ts.isIfStatement(node) && node.expression.getText(classifierAst) === 'item.expected === 1')
    classifierBlocks.push(node.thenStatement.getText(classifierAst))
  ts.forEachChild(node, visitClassifier)
}
visitClassifier(classifierAst)
assert.equal(classifierBlocks.length, 1)
let mixedFailureAccepted = false
try {
  new Function('assert', 'item', 'output', classifierBlocks[0])(
    assert,
    { name: 'review-poisoned-output' },
    'MUTATION_HIT review-poisoned-output\nAssertionError: unrelated assertion\nTypeError: host fault\nTest timed out\nUnhandled Errors',
  )
  mixedFailureAccepted = true
} catch {}

// Extract the actual submitted fixture, not a similarly named replacement positive control.
function fixture(file, name) {
  const source = ts.createSourceFile(
    file,
    readFileSync(join(src, file), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  )
  const found = []
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) found.push(node)
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.equal(found.length, 1, `${file}:${name}`)
  return ts.transpileModule(`const ${found[0].getText(source)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
}
const fixtureScript = join(logs, 'actual-fixtures.mjs')
writeFileSync(
  fixtureScript,
  `
import assert from 'node:assert/strict';
import {validateAuthorScenes,validateActors,validateSprites,validateBattleSprites,validateReferences}
 from ${JSON.stringify(join(src, 'index.ts'))};
${fixture('validate-refs.contracts.test.ts', 'bundle')}
const outcomes=[];
function check(name,action){try{action();outcomes.push({name,accepted:true})}catch(e){outcomes.push({name,accepted:false,error:e.message})}}
const b=bundle();
check('F actual scenes',()=>validateAuthorScenes(b.scenes));
check('F actual sprites',()=>validateSprites(b.sprites));
check('F actual actors',()=>validateActors(b.actors));
check('F actual battle sprites',()=>validateBattleSprites(b.battleSprites));
check('F reference-only positive',()=>assert.deepEqual(validateReferences(b),[]));
const repaired=structuredClone(b);delete repaired.scenes[0].onEnter;
for(const s of repaired.sprites)s.label=s.id;
check('F same fixture with only retired onEnter removed and label supplied',()=>{
 validateAuthorScenes(repaired.scenes);validateSprites(repaired.sprites);
 validateActors(repaired.actors);validateBattleSprites(repaired.battleSprites);
 assert.deepEqual(validateReferences(repaired),[]);
});
${fixture('asset-closure.contracts.test.ts', 'scene')}
check('A4 actual scene',()=>validateAuthorScenes([scene]));
console.log(JSON.stringify(outcomes,null,2));
`,
)
const fixtureRun = spawnSync('node', ['--import', 'tsx', fixtureScript], {
  cwd: root,
  encoding: 'utf8',
  timeout: 30_000,
})
assert.equal(fixtureRun.status, 0, (fixtureRun.stdout ?? '') + (fixtureRun.stderr ?? ''))
writeFileSync(join(logs, 'fixtures.json'), fixtureRun.stdout)

const cases = [
  { name: 'control-B', test: 'project-map.contracts.test.ts' },
  { name: 'control-C', test: 'frame-sequence.contracts.test.ts' },
  { name: 'control-E', test: 'author-dialogue.contracts.test.ts' },
  { name: 'control-F', test: 'validate-refs.contracts.test.ts' },
  {
    name: 'actor-input-pollution',
    file: 'author-dialogue.ts',
    test: 'author-dialogue.contracts.test.ts',
    from: '  const actor = actorsById[identity.actor]',
    to: '  if(actorsById[identity.actor]) { actorsById[identity.actor].spriteId="review-polluted"; (globalThis.__ccw??=[]).push(actorsById[identity.actor]); WITNESS }\n  const actor = actorsById[identity.actor]',
    verify:
      'reviewExpect(seen.length).toBeGreaterThan(0); reviewExpect(seen.every(a=>a.spriteId==="review-polluted")).toBe(true);',
  },
  {
    name: 'source-bound-masked',
    file: 'project-map.ts',
    test: 'project-map.contracts.test.ts',
    from: 'if (source >= tilesetRefs.length)',
    to: 'if (((globalThis.__ccw??=[]).push(source), WITNESS, false))',
    verify: 'reviewExpect(seen).toContain(1);',
  },
  {
    name: 'tpfs-view-offset-lost',
    file: 'frame-sequence.ts',
    test: 'frame-sequence.contracts.test.ts',
    from: '  const payload = bytes.subarray(payloadStart)',
    to: '  const payload = new Uint8Array(bytes.buffer, payloadStart, bytes.byteLength-payloadStart);\n  if(bytes.byteOffset>0){(globalThis.__ccw??=[]).push({offset:bytes.byteOffset,bad:payload[0],correct:bytes[payloadStart]}); WITNESS}',
    verify: 'reviewExpect(seen.some(v=>v.offset===16 && v.bad!==v.correct)).toBe(true);',
  },
  {
    name: 'levelup-severity-wrong',
    file: 'validate-refs.ts',
    test: 'validate-refs.contracts.test.ts',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: exact product source
    from: "severity: 'warn',\n          where: `levelUp[${cid}][${li}].skillId`,",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: exact product source
    to: "severity: (WITNESS, 'error'),\n          where: `levelUp[${cid}][${li}].skillId`,",
  },
  {
    name: 'entity-locator-wrong',
    file: 'validate-refs.ts',
    test: 'validate-refs.contracts.test.ts',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: exact product source
    from: 'where: `${where}.actor`,\n            message: `角色 "${e.actor}" 不在 actors 表`,',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: exact product source
    to: 'where: (WITNESS, `${where}.wrongLeaf`),\n            message: `角色 "${e.actor}" 不在 actors 表`,',
  },
  {
    name: 'reference-extra-issue',
    file: 'validate-refs.ts',
    test: 'validate-refs.contracts.test.ts',
    from: '\n  return issues\n}\n',
    last: true,
    to: '\n  if(b.entryPoints.some(e=>e.scene==="ghost-scene")){ WITNESS; issues.push({severity:"error",where:"unrelated",message:"review extra issue"}); }\n  return issues\n}\n',
  },
]
const files = [...new Set(cases.filter((c) => c.file).map((c) => join(src, c.file)))]
const hashes = Object.fromEntries(files.map((f) => [f, sha(readFileSync(f))]))
const results = []
try {
  for (const c of cases) {
    const product = c.file ? join(src, c.file) : null,
      testFile = join(src, c.test)
    let at = -1
    if (product) {
      const source = readFileSync(product, 'utf8')
      at = c.last ? source.lastIndexOf(c.from) : source.indexOf(c.from)
      assert.ok(at >= 0, c.name)
      if (!c.last) assert.equal(source.split(c.from).length, 2, c.name)
      else
        assert.equal(
          source.slice(at + c.from.length).trim(),
          '',
          'final return belongs to validateReferences',
        )
    }
    const witnessName = `__codex_execution_witness__${c.name}`
    const replacement = c.to?.replace(
      'WITNESS',
      `(globalThis.__ccExecuted??=[]).push(${JSON.stringify(c.name)})`,
    )
    const trailer = product
      ? `\nimport{test as reviewTest,expect as reviewExpect}from'vitest';reviewTest(${JSON.stringify(witnessName)},()=>{reviewExpect(globalThis.__ccExecuted??[]).toContain(${JSON.stringify(c.name)});const seen=globalThis.__ccw??[];${c.verify ?? ''}});`
      : ''
    const config = join(logs, `${c.name}.config.mjs`)
    writeFileSync(
      config,
      `
import {readFileSync} from 'node:fs';
export default {
 root:${JSON.stringify(join(root, 'packages/content'))},
 plugins:[{name:'codex-independent-contract-witness',enforce:'pre',load(id){
  if(id===${JSON.stringify(testFile)} && ${Boolean(trailer)})return readFileSync(id,'utf8')+${JSON.stringify(trailer)};
  if(!${Boolean(product)}||id!==${JSON.stringify(product)})return;
  const text=readFileSync(id,'utf8');return text.slice(0,${at})+${JSON.stringify(replacement ?? '')}+text.slice(${at + (c.from?.length ?? 0)});
 }}],test:{include:[${JSON.stringify(`src/${c.test}`)}],maxWorkers:1,fileParallelism:false}
};`,
    )
    const jsonReport = join(logs, `${c.name}.json`)
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
        jsonReport,
      ],
      { cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 8 * 1024 * 1024 },
    )
    const output = (run.stdout ?? '') + (run.stderr ?? '')
    const log = join(logs, `${c.name}.log`)
    writeFileSync(log, output)
    assert.equal(run.signal, null, log)
    assert.ok(run.status === 0 || run.status === 1, log)
    const report = JSON.parse(readFileSync(jsonReport, 'utf8'))
    const assertions = report.testResults.flatMap((result) => result.assertionResults)
    const diagnostics = output + assertions.flatMap((result) => result.failureMessages).join('\n')
    assert.doesNotMatch(
      diagnostics,
      /TypeError|ReferenceError|SyntaxError|No test files found|Cannot find module|Failed to load url|Test timed out|Unhandled Errors/,
      log,
    )
    if (!product) assert.equal(run.status, 0, log)
    else {
      const witness = assertions.find((result) => result.title === witnessName)
      assert.equal(
        witness?.status,
        'passed',
        `actual execution witness missing/failed: ${jsonReport}`,
      )
      if (run.status === 1) assert.match(diagnostics, /AssertionError/, log)
    }
    results.push({
      name: c.name,
      exit: run.status,
      verdict: product ? (run.status ? 'detected' : 'MISSED') : 'control',
      log,
      jsonReport,
    })
    console.log(`${c.name}: ${results.at(-1).verdict}`)
  }
} finally {
  for (const [f, h] of Object.entries(hashes)) assert.equal(sha(readFileSync(f)), h, f)
}
console.log(
  JSON.stringify(
    {
      root: resolve(root),
      logs,
      fixtures: JSON.parse(fixtureRun.stdout),
      mixedFailureAccepted,
      sourceHashes: hashes,
      results,
    },
    null,
    2,
  ),
)
