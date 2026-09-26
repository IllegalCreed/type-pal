/** Compare against the previous Reforge host, not the phase-one engine. No repository writes. */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import ts from 'typescript'
import { preciseCoverageEnvironment } from '../../scripts/coverage/environment.mjs'

const root = process.cwd(),
  base = '51048353',
  path = 'packages/reforge/src/main.ts'
const old = execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8' })
const current = readFileSync(resolve(root, path), 'utf8')
const parse = (text) => ts.createSourceFile('main.ts', text, ts.ScriptTarget.Latest, true)
const before = parse(old),
  after = parse(current)
function all(tree, predicate) {
  const found = []
  function visit(n) {
    if (predicate(n)) found.push(n)
    ts.forEachChild(n, visit)
  }
  visit(tree)
  return found
}
function one(tree, predicate) {
  const found = all(tree, predicate)
  assert.equal(found.length, 1, 'unambiguous frozen AST anchor')
  return found[0]
}
const named = (tree, name) => one(tree, (n) => ts.isFunctionDeclaration(n) && n.name?.text === name)
const variable = (tree, name) =>
  one(tree, (n) => ts.isVariableDeclaration(n) && n.name.getText(tree) === name)
const printer = ts.createPrinter({ removeComments: true })
function canonical(node, tree) {
  const transformed = ts.transform(node, [
    (ctx) => {
      function visit(n) {
        if (
          ts.isPropertyAccessExpression(n) &&
          ts.isIdentifier(n.expression) &&
          n.expression.text === 'activeScene'
        ) {
          const fields = [
            'scene',
            'map',
            'tiles',
            'palette',
            'renderer',
            'room',
            'entitySpriteDefs',
          ]
          assert(
            fields.includes(n.name.text),
            `unreviewed activeScene method inside protected body: ${n.name.text}`,
          )
          return ts.factory.createIdentifier(n.name.text)
        }
        if (ts.isShorthandPropertyAssignment(n))
          return ts.factory.createPropertyAssignment(n.name, n.name)
        return ts.visitEachChild(n, visit, ctx)
      }
      return visit
    },
  ])
  const code = printer.printNode(ts.EmitHint.Unspecified, transformed.transformed[0], tree)
  transformed.dispose()
  const scan = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, code),
    tokens = []
  for (let kind = scan.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scan.scan())
    tokens.push([kind, scan.getTokenText()])
  return tokens
}
const moved = new Set([
  'bootGame',
  'updateCamera',
  'commitSceneSwitch',
  'advanceMoves',
  'render',
  'stopAutoRunners',
])
const protectedFunctions = []
for (const node of all(
  before,
  (n) => ts.isFunctionDeclaration(n) && n.name && !moved.has(n.name.text),
)) {
  const name = node.name.text,
    next = named(after, name)
  assert.deepEqual(canonical(next, after), canonical(node, before), `protected ${name}`)
  protectedFunctions.push(name)
}

const oldPan = one(
  before,
  (n) =>
    ts.isPropertyAssignment(n) &&
    n.name.getText(before) === 'cameraPan' &&
    n.initializer.getText(before).includes('new Promise'),
)
const oldSnap = one(
  before,
  (n) =>
    ts.isPropertyAssignment(n) &&
    n.name.getText(before) === 'cameraSnap' &&
    n.initializer.getText(before).includes('cameraOffset'),
)
const advance = named(before, 'advanceMoves').body.statements[0]
assert(ts.isIfStatement(advance) && advance.expression.getText(before) === 'cameraPanFx')
const reset = one(
  before,
  (n) => ts.isPropertyAssignment(n) && n.name.getText(before) === 'resetPresentation',
)
const resetStatements = reset.initializer.body.statements
  .slice(-4)
  .map((s) => s.getText(before))
  .join('\n')
assert(
  resetStatements.includes('cameraPanFx?.resolve()') &&
    resetStatements.includes('cameraOffset.y = 0'),
)
// Check the three host coordination bodies after expanding only the explicitly moved blocks.
const commitStatements = named(before, 'commitSceneSwitch').body.statements
const commitStart = commitStatements.findIndex((n) => n.getText(before) === 'scene = plan.def')
const commitEnd = commitStatements.findIndex((n) => n.getText(before).startsWith('viewMaxY ='))
assert(commitStart >= 0 && commitEnd > commitStart)
const commitBlock = commitStatements
  .slice(commitStart, commitEnd + 1)
  .map((n) => n.getText(before))
  .join('\n')
const expandedHost = parse(
  current
    .replace('activeScene.commit(plan)', commitBlock)
    .replace('cameraSession.advance(dt)', advance.getText(before))
    .replaceAll('cameraSession.reset()', resetStatements),
)
for (const name of ['commitSceneSwitch', 'advanceMoves', 'stopAutoRunners']) {
  assert.deepEqual(
    canonical(named(expandedHost, name), expandedHost),
    canonical(named(before, name), before),
    `coordination ${name}`,
  )
  protectedFunctions.push(name)
}
const oldFactory = `function frozen(readPlayer,readBounds){
 const player={get pos(){return readPlayer()}};
 const camera={x:0,y:0},cameraOffset={x:0,y:0};let cameraPanFx=null;
 const VIEW_W=320,VIEW_H=200,PARTY_OX=160,PARTY_OY=112;
 ${variable(before, 'clamp')
   .getText(before)
   .replace(/^clamp/, 'const clamp')};
 ${variable(before, 'assertRunnerActive')
   .getText(before)
   .replace(/^assertRunnerActive/, 'const assertRunnerActive')};
 function updateCamera(){
 const {minX:viewMinX,minY:viewMinY,maxX:viewMaxX,maxY:viewMaxY}=readBounds();
 ${named(before, 'updateCamera')
   .body.statements.map((n) => n.getText(before))
   .join('\n')}
 }
 return {position:camera,offset:cameraOffset,update:updateCamera,
 pan:${oldPan.initializer.getText(before)},snap:${oldSnap.initializer.getText(before)},
 advance(dt){${advance.getText(before)}},reset(){${resetStatements}}}
}`
const generated = `import {test,expect} from 'vitest'
import {gridToPixel} from '@type-pal/content'
import {asyncIntentAbortError} from './async-intent.js'
import {WorldCamera} from './world-camera.js'
${oldFactory}
test('frozen Reforge camera and extracted owner agree for 64 deterministic 40-step sequences',async()=>{
 for(let seed=1;seed<=64;seed++){
  let number=seed, player={col:20,row:10,height:0},bounds={minX:-32,minY:-40,maxX:960,maxY:800};
  const a=frozen(()=>player,()=>bounds),b=new WorldCamera(()=>player,()=>bounds),
   controllers=[[],[]],events=[[],[]];
  const random=()=>{number=(Math.imul(number,1664525)+1013904223)>>>0;return number};
  a.update();b.update();
  for(let step=0;step<40;step++){
   const op=random()%8,dx=(random()%15)-7,dy=(random()%13)-6,frames=random()%8,dt=random()%61;
   if(op===3)player={col:(random()%60)/2,row:(random()%24)/2,height:2};
   if(op===4)bounds={minX:-32,minY:-40,maxX:160+(random()%900),maxY:96+(random()%700)};
   for(const [side,owner] of [a,b].entries()){
    if(op===0){const c=new AbortController();controllers[side].push(c);if(frames===0)c.abort();
      owner.pan(dx,dy,frames,c.signal).then(()=>events[side].push([step,'ok']),e=>events[side].push([step,e.name,e.message]))}
    if(op===1)owner.advance(dt);
    if(op===2)controllers[side].at(-1)?.abort();
    if(op===3||op===4)owner.update();
    if(op===5)owner.snap({col:dx+30,row:dy+20,height:0});
    if(op===6)owner.snap();
    if(op===7)owner.reset();
   }
   await Promise.resolve();await Promise.resolve();
   expect({position:b.position,offset:b.offset,events:events[1]},seed+':'+step)
    .toEqual({position:a.position,offset:a.offset,events:events[0]});
  }
  a.reset();b.reset();await Promise.resolve();expect(events[1]).toEqual(events[0]);
 }
})`
const out = mkdtempSync(resolve(tmpdir(), 'type-pal-active-scene-parity-'))
const config = resolve(out, 'config.mjs'),
  report = resolve(out, 'result.json')
writeFileSync(
  config,
  `export default {root:${JSON.stringify(resolve(root, 'packages/reforge'))},
plugins:[{name:'frozen-camera',enforce:'pre',load(id){if(id===${JSON.stringify(resolve(root, 'packages/reforge/src/world-camera.test.ts'))})return ${JSON.stringify(generated)}}}],
test:{include:['src/world-camera.test.ts'],maxWorkers:1,reporters:['json'],outputFile:${JSON.stringify(report)}}}`,
)
const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
  cwd: root,
  env: preciseCoverageEnvironment(),
  encoding: 'utf8',
})
writeFileSync(resolve(out, 'run.log'), `${run.stdout}\n${run.stderr}`)
assert.equal(run.status, 0, `parity failure ${out}`)
const result = JSON.parse(readFileSync(report, 'utf8'))
assert.equal(result.numPassedTests, 1)
assert.equal(result.numPendingTests, 0)
writeFileSync(
  resolve(out, 'summary.json'),
  JSON.stringify({ base, protectedFunctions, cameraSequences: 64, steps: 2560, exit: 0 }, null, 2),
)
console.log(
  `${protectedFunctions.length} protected functions; 64 camera sequences/2560 steps agree; ${out}`,
)
