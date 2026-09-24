/** Frozen preparation oracle and protected commit bodies; old code lives only in temporary tests. */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import ts from 'typescript'
import { preciseCoverageEnvironment } from '../../scripts/coverage/environment.mjs'

const root = process.cwd(),
  out = mkdtempSync(resolve(tmpdir(), 'type-pal-scene-parity-'))
const base = 'cb1cb26d'
const source = execFileSync('git', ['show', `${base}:packages/reforge/src/main.ts`], {
  encoding: 'utf8',
})
const names = [
  'doSave',
  'doLoad',
  'quickSave',
  'quickLoad',
  'normalizeStoredPayload',
  'restorePayload',
  'captureCurrentSavePayload',
  'enqueueSaveSnapshot',
  'refreshSaveMetas',
  'payloadBelongsToProject',
  'commitSceneSwitch',
  'switchScene',
  'replaceWorld',
  'replaceCanonicalScript',
  'syncRuntimeScriptScratch',
  'advanceMoves',
  'render',
  'prepareSceneSounds',
]
function protectedTrees(text) {
  const tree = ts.createSourceFile('main.ts', text, ts.ScriptTarget.Latest, true),
    result = {},
    loadScene = []
  assert.equal(tree.parseDiagnostics.length, 0)
  function tokens(node) {
    const children = node.getChildren(tree)
    return children.length ? children.flatMap(tokens) : [[node.kind, node.getText(tree)]]
  }
  function walk(node) {
    if (
      (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) &&
      node.name &&
      names.includes(node.name.getText(tree))
    ) {
      const name = node.name.getText(tree)
      assert(!Object.hasOwn(result, name), `ambiguous protected name ${name}`)
      result[name] = tokens(node)
    }
    // Reader adapters are not the asynchronous script-host scene transaction.
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(tree) === 'loadScene' &&
      ts.isArrowFunction(node.initializer) &&
      node.initializer.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)
    )
      loadScene.push(tokens(node))
    ts.forEachChild(node, walk)
  }
  walk(tree)
  assert.equal(Object.keys(result).length, names.length)
  assert.equal(loadScene.length, 2)
  return { functions: result, loadScene }
}
assert.deepEqual(
  protectedTrees(
    readFileSync(resolve(root, 'packages/reforge/src/main.ts'), 'utf8').replaceAll(
      'sceneResources.peek',
      'canonicalSceneCache.get',
    ),
  ),
  protectedTrees(source),
)
const generated = `import {test,expect} from 'vitest'
import {emptyWorldScriptState,resolveEntitySpriteId,stageIndexFor} from '@type-pal/content'
import {mainApi} from './__tests__/world-async-fixture.js'
import {scenePreparationFixture} from './__tests__/scene-preparation-fixture.js'
import {expectDefined} from './defined.js'
import {resolveSpriteActionBinding} from './entity-action-player.js'
import {projectedWorldScriptScratch,runtimeSceneView} from './runtime-project-view.js'
import {captureSceneSwitchDependencies,assertSceneSwitchDependenciesCurrent} from './scene-switch-transaction.js'
import {resolveSceneSpawn} from './scene-transition.js'
const source=${JSON.stringify(source)}
function old(f){
 const env={emptyWorldScriptState,resolveEntitySpriteId,stageIndexFor,expectDefined,
  resolveSpriteActionBinding,projectedWorldScriptScratch,runtimeSceneView,
  captureSceneSwitchDependencies,assertSceneSwitchDependenciesCurrent,resolveSceneSpawn,
  project:f.project,actorSpriteOverrides:f.overrides,ctx:{},
  getCanonicalScene:f.ports.canonicalScene,getMapAssets:f.ports.map,getStandardPalette:f.ports.palette,
  requireSpriteDef:f.ports.requireSprite,prepareSceneSounds:f.ports.prepareSounds,
  spriteCache:{load:(_resolver,asset)=>f.ports.loadSprite(asset)},
  Canvas2DRenderer:class{constructor(_ctx,palette,tilesets){return {palette,tiles:tilesets}}},
 }
 return mainApi(['runnableStages','sceneScriptBinding','bindingSceneEntry','prepareSceneSwitch','assertSceneSwitchPlanCurrent'],[],env,source)
}
test('frozen preparation and current module agree across sixteen real legal configurations',async()=>{
 for(const scene of ['a','b'])for(let variant=0;variant<8;variant++){
  const a=await scenePreparationFixture(),b=await scenePreparationFixture()
  for(const f of [a,b]){
   if(variant===1)f.world.script.followers=['other']
   if(variant===2)f.world.party[0].appearance={spriteId:'other'}
   if(variant===3)f.world.script.mapOverride={[scene]:'map-extra-0'}
   if(variant===4)delete f.world.script
   if(variant===5)f.overrides.set('hero',{def:f.project.spritesById.other,frames:await f.ports.loadSprite('sprite')})
  }
  const spawn=variant===6?{pos:{col:2.5,row:3.25,height:0},facing:'up'}:undefined
  const explicit=variant===7?{...structuredClone(a.world.script),followers:['other']}:undefined
  const beforeA=structuredClone(a.world),beforeB=structuredClone(b.world),o=old(a)
  const pa=await o.prepareSceneSwitch(scene,a.world,spawn,true,structuredClone(explicit))
  const pb=await b.preparer.prepare(scene,b.world,spawn,true,structuredClone(explicit))
  expect(pb,scene+':'+variant).toEqual(pa)
  expect(b.readCalls).toEqual(a.readCalls)
  expect(b.ports.prepareSounds.mock.calls).toEqual(a.ports.prepareSounds.mock.calls)
  expect(a.world).toEqual(beforeA);expect(b.world).toEqual(beforeB)
  // Explicit candidate scripts can intentionally differ from live input; compare rejection contracts too.
  const verdict=(call)=>{try{call();return 'accepted'}catch(e){return e.message}}
  expect(verdict(()=>b.preparer.assertCurrent(pb,b.world))).toBe(verdict(()=>o.assertSceneSwitchPlanCurrent(pa,a.world)))
  a.world.inventory.push({itemId:'tonic',count:1});b.world.inventory.push({itemId:'tonic',count:1})
  expect(verdict(()=>b.preparer.assertCurrent(pb,b.world))).toBe(verdict(()=>o.assertSceneSwitchPlanCurrent(pa,a.world)))
  a.assertInputs();b.assertInputs()
 }
})
`
const config = resolve(out, 'config.mjs'),
  report = resolve(out, 'result.json')
writeFileSync(
  config,
  `export default {root:${JSON.stringify(resolve(root, 'packages/reforge'))},plugins:[{name:'frozen-scene-oracle',enforce:'pre',load(id){if(id===${JSON.stringify(resolve(root, 'packages/reforge/src/scene-preparer.test.ts'))})return ${JSON.stringify(generated)}}}],test:{include:['src/scene-preparer.test.ts'],maxWorkers:1,reporters:['json'],outputFile:${JSON.stringify(report)}}}`,
)
const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
  cwd: root,
  env: preciseCoverageEnvironment(),
  encoding: 'utf8',
})
writeFileSync(resolve(out, 'run.log'), `${run.stdout}\n${run.stderr}`)
const results = JSON.parse(readFileSync(report, 'utf8'))
assert.equal(run.status, 0, `parity failure: ${out}`)
assert.equal(results.numPassedTests, 1)
assert.equal(results.numPendingTests, 0)
writeFileSync(
  resolve(out, 'summary.json'),
  JSON.stringify(
    { base, protectedFunctions: names, protectedLoadSceneProperties: 2, cases: 16, exit: 0 },
    null,
    2,
  ),
)
console.log(
  `18 functions + 2 loadScene bodies unchanged; 16 preparation comparisons passed; ${out}`,
)
