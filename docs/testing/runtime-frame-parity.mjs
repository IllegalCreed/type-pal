/** Frozen b11d4bc9 orchestration oracle; never ships the old implementation in product code. */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import ts from 'typescript'
import { preciseCoverageEnvironment } from '../../scripts/coverage/environment.mjs'

const root = process.cwd(),
  out = mkdtempSync(resolve(tmpdir(), 'type-pal-frame-parity-'))
const source = execFileSync('git', ['show', 'b11d4bc9:packages/reforge/src/main.ts'], {
  encoding: 'utf8',
})
const ast = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true)
const protectedNames = [
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
  'prepareSceneSwitch',
  'assertSceneSwitchPlanCurrent',
  'commitSceneSwitch',
  'switchScene',
  'replaceWorld',
  'replaceCanonicalScript',
  'syncRuntimeScriptScratch',
  'advanceMoves',
  'render',
]
function protectedTrees(text) {
  const tree = ts.createSourceFile('main.ts', text, ts.ScriptTarget.Latest, true),
    result = {}
  assert.equal(tree.parseDiagnostics.length, 0)
  function tokens(node) {
    const children = node.getChildren(tree)
    return children.length ? children.flatMap(tokens) : [[node.kind, node.getText(tree)]]
  }
  function walk(node) {
    if (
      (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) &&
      node.name &&
      protectedNames.includes(node.name.getText(tree))
    )
      result[node.name.getText(tree)] = tokens(node)
    ts.forEachChild(node, walk)
  }
  walk(tree)
  return result
}
const beforeTrees = protectedTrees(source)
assert.equal(Object.keys(beforeTrees).length, 19)
assert.deepEqual(
  protectedTrees(
    readFileSync(resolve(root, 'packages/reforge/src/main.ts'), 'utf8').replaceAll(
      'frames.now',
      'nowMs',
    ),
  ),
  beforeTrees,
)
const ticks = []
function visit(n) {
  if (ts.isFunctionDeclaration(n) && n.name?.text === 'tick') ticks.push(n)
  ts.forEachChild(n, visit)
}
visit(ast)
assert.equal(ticks.length, 1)
const statements = ticks[0].body.statements
const inputAt = statements.findIndex(
  (n) =>
    ts.isVariableStatement(n) &&
    n.declarationList.declarations.some((d) => d.name.getText(ast) === 'interact'),
)
const renderAt = statements.findIndex((n) =>
  n.getText(ast).startsWith('runWithPresentationFinalizer('),
)
assert(inputAt > 0 && renderAt > inputAt)
const compile = (name, params, body) =>
  ts.transpileModule(`function ${name}(${params}){${body}}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText
const prefix = compile(
  'tick',
  't',
  `${statements
    .slice(0, inputAt)
    .map((n) => n.getText(ast))
    .join('\n')}\n observedInput(pressed,t); observedWorld(); requestAnimationFrame(tick);`,
)
const routing = compile(
  'route',
  'pressed,t',
  statements
    .slice(inputAt, renderAt)
    .map((n) => n.getText(ast))
    .join('\n'),
)
const generated = `import {test,expect} from 'vitest'
import {frameFixture,inputFixture} from './__tests__/runtime-frame-fixture.js'
import {GameplayClock} from './gameplay-clock.js'
import {routeRuntimeInput} from './runtime-input-router.js'
const oldFrame = new Function('env', 'with(env){'+${JSON.stringify(prefix)}+';return tick}')
const oldRoute = new Function('env', 'with(env){'+${JSON.stringify(routing)}+';return route}')
function frame(before) {
 const f=frameFixture(), step={active:false,stepRequested:false}
 const battle={tick:(dt,keys,now)=>f.events.push(['battleTick',dt,[...keys],now]),render:()=>f.events.push(['battleRender'])}
 f.ports.presentBattle=(dt,keys,now)=>{if(!f.state.battle)return false;battle.tick(dt,keys,now);battle.render();f.events.push(['tint']);return true}
 let change=false
 const move=f.ports.advanceMoves
 f.ports.advanceMoves=(...args)=>{move(...args);if(change)f.state.battle=true}
 const env={
  activateScriptConfirm:()=>f.ports.activateConfirm(),resumeScriptExecutionGates:()=>f.ports.resumeScriptGates(),
  scriptConfirmModal:{get active(){return f.state.frozen}},frameStepState:step,
  gameplayClock:new GameplayClock(),STEP_MS:100,nowMs:0,timers:[],expectDefined:x=>x,
  fadeDriver:{advance:f.ports.advanceFade},dialogBox:{active:true},scriptDialogResolve:null,
  keyboard:{consumePressed:()=>{f.ports.settleClosedDialogue();return f.ports.consumePressed()}},
  tickHostiles:f.ports.tickHostiles,advanceMoves:(...args)=>f.ports.advanceMoves(...args),deriveMounts:f.ports.deriveMounts,
  advanceLifecycleWorldStepIfEligible:f.ports.advanceLifecycle,
  entityActions:{advance:(dt)=>f.ports.advanceEntityActions(dt)},battleHost:{get active(){return f.state.battle?battle:null}},
  set worldTicksThisFrame(value){expect(value).toBe(0);f.ports.clearWorldTicks()},ctx:{},WORLD_SCALE:4,
  applyAmbienceTint:()=>f.events.push(['tint']),requestAnimationFrame:()=>f.events.push(['raf']),
  observedInput:f.ports.routeInput,observedWorld:f.ports.presentWorld,
 }
 const old=before?oldFrame(env):null
 return {f,step,run(t,flags){f.state.frozen=flags.frozen;f.state.battle=flags.battle;change=flags.change;
  step.active=flags.step;step.stepRequested=flags.request;
  f.session.setStepActive(flags.step);if(flags.request)f.session.requestStep();
  if(old)old(t);else{f.tick(t);f.events.push(['raf'])}
  return {events:structuredClone(f.events),now:old?env.nowMs:f.session.now}
 }}
}
test('frozen frame prefix matches 64 gate combinations across changing real timestamps',()=>{
 for(let mask=0;mask<64;mask++){
  const a=frame(true),b=frame(false)
  a.f.state.pressed.add('Enter');b.f.state.pressed.add('Enter')
  for(const [i,t]of [100,110,9000,9050,9040,9300].entries()){
   const flags={frozen:!!(mask&1)&&i%2===0,step:!!(mask&2),request:!!(mask&4)&&i%2===1,battle:!!(mask&8),change:!!(mask&16)}
   if(mask&32){a.f.ports.activateConfirm=()=>{a.f.events.push(['activate']);a.f.state.frozen=true};b.f.ports.activateConfirm=()=>{b.f.events.push(['activate']);b.f.state.frozen=true}}
   // Both hosts observe the same modal activation effect at the original frame boundary.
   expect(b.run(t,flags),String(mask)+':'+i).toEqual(a.run(t,flags))
  }
 }
})
function route(before) {
 const f=inputFixture(),env={
 scriptConfirmModal:{get active(){return f.state.confirm},toggle:()=>f.ports.confirm.toggle(),submit:()=>f.ports.confirm.yes(),submitNo:()=>f.ports.confirm.no()},
 get shop(){return f.state.shop?{ui:{},resolve:()=>{}}:null},set shop(_v){f.state.shop=false},
 shopInput:(_ui,keys)=>{f.ports.consumeShop(keys)},world:{},project:{items:{},sceneIds:['a','b']},replaceWorld:()=>{},
 handleRewardGainInput:(_queue,keys)=>f.ports.consumeReward(keys),rewardGainQueue:{},
 menus:{get active(){return f.state.menu},input:keys=>f.ports.menu.input(keys),open:()=>f.ports.menu.open()},
 dialogBox:{get active(){return f.state.dialogue},advance:t=>f.ports.dialogue.advance(t)},
 get runner(){return f.state.runner?{}:null},get hostileBusy(){return f.state.hostile},
 quickSave:async()=>f.ports.quickSave(),quickLoad:async()=>f.ports.quickLoad(),reportSaveFailure:()=>{},
 captureThumbnail:async()=>null,canvas:{},lastGameThumb:null,findTrigger:()=>({}),fireTrigger:()=>f.ports.interact(),
 expectDefined:x=>x,scene:{id:'a'},switchScene:async()=>f.ports.changeDebugScene(env.keys),
 abortScript:()=>{},stopAutoRunners:()=>{},applyWorldToScene:()=>{},startAutoRunners:()=>{},showToast:()=>{},sceneScriptBinding:()=>null,
 console,runtimeScript:{},keys:new Set(),
 }
 const old=before?oldRoute(env):null
 return {f,run(keys){env.keys=new Set(keys);if(old)old(env.keys,9000);else routeRuntimeInput(env.keys,9000,f.ports);return f.events}}
}
test('frozen input branch matches 128 layer combinations and seven key sets',async()=>{
 const names=['confirm','shop','reward','menu','dialogue','runner','hostile']
 for(let mask=0;mask<128;mask++)for(const keys of [[],['Enter'],['Escape',']'],['F5','F9',']'],['ArrowLeft','Enter','F5'],[' '],['[',']']]){
  const a=route(true),b=route(false)
  names.forEach((n,i)=>{a.f.state[n]=b.f.state[n]=!!(mask&(1<<i))})
  expect(b.run(keys),String(mask)+':'+keys).toEqual(a.run(keys));await Promise.resolve()
 }
})
`
const config = resolve(out, 'config.mjs'),
  report = resolve(out, 'result.json')
writeFileSync(
  config,
  `export default {
 root:${JSON.stringify(resolve(root, 'packages/reforge'))},
 plugins:[{name:'frozen-frame-oracle',enforce:'pre',load(id){
  if(id!==${JSON.stringify(resolve(root, 'packages/reforge/src/runtime-frame-session.test.ts'))})return;
  return ${JSON.stringify(generated)};
 }}],
 test:{include:['src/runtime-frame-session.test.ts'],reporters:['json'],outputFile:${JSON.stringify(report)},maxWorkers:1}
}`,
)
const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
  cwd: root,
  env: preciseCoverageEnvironment(),
  encoding: 'utf8',
})
writeFileSync(resolve(out, 'run.log'), `${run.stdout}\n${run.stderr}`)
const results = JSON.parse(readFileSync(report, 'utf8'))
assert.equal(run.status, 0, `parity failure: ${out}`)
assert.equal(results.numPassedTests, 2)
assert.equal(results.numPendingTests, 0)
writeFileSync(
  resolve(out, 'summary.json'),
  JSON.stringify(
    {
      base: 'b11d4bc9',
      protectedFunctions: protectedNames,
      frameCases: 384,
      inputCases: 896,
      exit: run.status,
    },
    null,
    2,
  ),
)
console.log(`384 frame comparisons + 896 input comparisons passed; ${out}`)
