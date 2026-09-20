// Codex: actual candidate Canvas contract, no production/candidate edits.
// node docs/testing/import-codec-png-host-review.mjs <candidate absolute worktree>
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(process.argv[2] ?? '/Users/zhangxu/illegal/type-pal-glm-import-codec')
const ts = createRequire(join(root, 'package.json'))('typescript')
const file = join(root, 'packages/editor/src/core/image-import.stages.test.ts')
const product = join(root, 'packages/editor/src/core/image-import.ts')
const fixture = join(root, 'packages/editor/src/core/__tests__/glm-import-codec-fixtures.ts')
const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const hashes = new Map([file, product, fixture].map((p) => [p, hash(p)]))
const out = mkdtempSync(join(tmpdir(), 'codex-png-host-'))
const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
const helpers = ['pngPayload', 'installCanvasHost', 'palette']
  .map((name) => {
    const nodes = ast.statements.filter((n) =>
      ts.isFunctionDeclaration(n)
        ? n.name?.text === name
        : ts.isVariableStatement(n) &&
          n.declarationList.declarations.some((d) => d.name.getText(ast) === name),
    )
    assert.equal(nodes.length, 1, `${name}: actual candidate helper exactly once`)
    return nodes[0].getText(ast)
  })
  .join('\n')
const oracle = join(out, 'canvas-contract.test.ts')
writeFileSync(
  oracle,
  `
import {test,expect,vi,afterEach} from ${JSON.stringify(join(root, 'node_modules/vitest/dist/index.js'))};
import {writeFileSync} from 'node:fs';
import {prepareAuthoredImage} from ${JSON.stringify(product)};
import {minimalPng,pngFile} from ${JSON.stringify(fixture)};
${helpers}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()});
function dimensions(bytes:ArrayBuffer){const v=new DataView(bytes);return [v.getUint32(16),v.getUint32(20)]}
test('observe actual candidate host outputs',async()=>{
 installCanvasHost({width:320,height:200});
 const value=await prepareAuthoredImage(pngFile('bg.png',320,200),'battle-background',palette());
 writeFileSync(${JSON.stringify(join(out, 'actual-host.json'))},JSON.stringify({declared:[value.width,value.height],source:dimensions(value.sourceBytes),main:dimensions(value.bytes),preview:dimensions(value.effectPreviewBytes!)}));
 expect([value.width,value.height]).toEqual([320,200]);
});
test('oracle actual output canvas dimensions',async()=>{
 const observed:number[][]=[];
 vi.stubGlobal('createImageBitmap',async()=>({width:320,height:200,close(){}}));
 vi.stubGlobal('document',{createElement(){const canvas={width:0,height:0,
 getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(320*200*4)}),createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}}),
 toBlob(callback:(b:Blob)=>void){observed.push([canvas.width,canvas.height]);callback(new Blob([minimalPng(320,200)],{type:'image/png'}))}};return canvas}});
 await prepareAuthoredImage(pngFile('bg.png',320,200),'battle-background',palette());
 expect(observed).toEqual([[320,200],[320,200]]);
});
`,
)
const needle = '    canvas.width = width\n    canvas.height = height'
assert.equal(readFileSync(product, 'utf8').split(needle).length, 2)
const results = []
for (const mutated of [false, true]) {
  const config = join(out, `${mutated}.config.mjs`)
  const report = join(out, `${mutated}.json`)
  writeFileSync(
    config,
    `
import {readFileSync} from 'node:fs';
export default {root:${JSON.stringify(join(root, 'packages/editor'))},plugins:[{name:'canvas-size-single-point',enforce:'pre',load(id){if(${mutated}&&id.split('?')[0]===${JSON.stringify(product)}){const source=readFileSync(id,'utf8');return source.replace(${JSON.stringify(needle)},'    // removed canvas sizing only');}}}],test:{include:${JSON.stringify([file, oracle])},maxWorkers:1}};
`,
  )
  const run = spawnSync(
    'pnpm',
    ['exec', 'vitest', 'run', '--config', config, '--reporter=json', '--outputFile', report],
    { cwd: root, encoding: 'utf8' },
  )
  const log = join(out, `${mutated}.log`)
  writeFileSync(log, run.stdout + run.stderr)
  const data = JSON.parse(readFileSync(report, 'utf8'))
  const candidate = data.testResults.find((r) => r.name === file)
  const own = data.testResults.find((r) => r.name === oracle)
  assert(candidate && own)
  const failed = candidate.assertionResults.filter((r) => r.status === 'failed')
  const businessFailures = failed.filter(
    (r) =>
      r.failureMessages.length > 0 &&
      r.failureMessages.every((m) => /^AssertionError(?:\b|:)|^expect\(/.test(m.split('\n', 1)[0])),
  )
  const oracleFailure = own.assertionResults.filter((r) => r.status === 'failed')
  if (!mutated) assert.equal(run.status, 0, `control must pass: ${log}`)
  else {
    assert.equal(run.status, 1)
    assert(
      oracleFailure.some(
        (r) =>
          r.title === 'oracle actual output canvas dimensions' &&
          r.failureMessages.some((m) => /^AssertionError/.test(m)),
      ),
    )
  }
  results.push({
    mutated,
    exit: run.status,
    candidateTests: candidate.assertionResults.length,
    candidateFailures: failed.map((r) => r.title),
    verdict: mutated
      ? failed.length
        ? businessFailures.length === failed.length
          ? 'detected'
          : 'invalid'
        : 'MISSED'
      : 'control',
    log,
    report,
  })
}
for (const [p, h] of hashes) assert.equal(hash(p), h)
const actualHost = JSON.parse(readFileSync(join(out, 'actual-host.json'), 'utf8'))
writeFileSync(join(out, 'summary.json'), JSON.stringify({ root, actualHost, results }, null, 2))
console.log(JSON.stringify({ out, actualHost, results }, null, 2))
