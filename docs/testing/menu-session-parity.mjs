/** Read the frozen pre-refactor Git source as an oracle; never ship an old runtime fallback. */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import ts from 'typescript'
import { preciseCoverageEnvironment } from '../../scripts/coverage/environment.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-menu-parity-'))
const before = execFileSync('git', ['show', '09429b6c:packages/reforge/src/main.ts'], {
  cwd: root,
  encoding: 'utf8',
})
const ast = ts.createSourceFile('main.ts', before, ts.ScriptTarget.Latest, true)
const variables = new Set([
  'menu',
  'magicMenu',
  'equipMenu',
  'useMenu',
  'itemUsePending',
  'itemUseAbort',
  'lastUseCursor',
  'lastMagicCaster',
  'lastMainCursor',
  'statusIdx',
  'systemMenu',
  'lastSystemCursor',
  'systemPlaceholder',
  'saveBrowser',
  'overwriteYes',
])
const functions = new Set(['dispatchItemUse', 'itemUseFailureText', 'isAbortError'])
const found = new Map()
function visit(node) {
  if (
    (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) &&
    node.name &&
    ts.isIdentifier(node.name)
  ) {
    const name = node.name.text
    if (variables.has(name) || functions.has(name)) {
      assert(!found.has(name), `ambiguous frozen ${name}`)
      found.set(
        name,
        ts.isFunctionDeclaration(node)
          ? node.getText(ast)
          : `${variables.has(name) ? 'let' : 'const'} ${node.getText(ast)};`,
      )
    }
  }
  ts.forEachChild(node, visit)
}
visit(ast)
for (const name of [...variables, ...functions]) assert(found.has(name), `missing frozen ${name}`)
const start = before.indexOf('    } else if (menu.active) {', before.indexOf('  function tick('))
const end = before.indexOf('    } else if (dialogBox.active) {', start)
assert(start > 0 && end > start)
const body = before.slice(start + '    } else if (menu.active) {'.length, end)
const legacyTs = `${[...found.values()].join('\n')}
function input(pressed: ReadonlySet<string>) { if (!menu.active) return; const interact=pressed.has(' ')||pressed.has('Enter');const esc=pressed.has('Escape');${body}}
function open() { menu=openMenu(lastMainCursor) }
function close() { saveBrowser=closeSaveBrowser();menu=CLOSED }
function view() { return {menu,magicMenu,equipMenu,useMenu,systemMenu,saveBrowser,statusIdx,overwriteYes,systemPlaceholder} }
return {input,open,close,view};`
const legacyJs = ts.transpileModule(legacyTs, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText
const imports = [
  'equip-menu-state',
  'magic-menu-state',
  'menu-state',
  'save/browser-state',
  'save/types',
  'system-menu-state',
  'use-menu-state',
  'menu/item-use-result',
]
const path = (file) => JSON.stringify(resolve(root, file))
const testFile = resolve(output, 'parity.test.ts')
writeFileSync(
  testFile,
  `import {test,expect} from ${path('node_modules/vitest/dist/index.js')};
import {writeFileSync} from 'node:fs';
import {menuFixture,settle} from ${path('packages/reforge/src/__tests__/menu-session-fixture.ts')};
import {executeWorldItemUse} from ${path('packages/reforge/src/item-use-executor.ts')};
${imports.map((name, i) => `import * as m${i} from ${path(`packages/reforge/src/${name}.ts`)};`).join('\n')}
const factory = new Function('env', ${JSON.stringify(`with(env) { ${legacyJs} }`)});
const helpers=Object.assign({},${imports.map((_, i) => `m${i}`).join(',')});
const title='frozen main and extracted menu preserve every public state and side effect across deterministic input traces';
test(title, async()=>{
 const targeted=[['ArrowDown','Enter','ArrowDown','Enter','Enter','ArrowUp','Enter','Escape','Escape','close','open'],['ArrowDown','ArrowDown','Enter','ArrowDown','Enter','Enter','Enter','Enter','Escape','Escape'],['ArrowUp','Enter','Enter','Enter','ArrowRight','Enter','ArrowDown','Enter','Escape','Escape'],['ArrowUp','Enter','ArrowDown','ArrowDown','Enter','ArrowRight','Enter','Enter','Enter','Escape'],['Enter','Enter','ArrowLeft','ArrowUp','ArrowDown','Enter','Escape']];
 let seed=1789;const keys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Escape',' ','close','open'];
 const traces=[...targeted,...Array.from({length:150},()=>Array.from({length:25},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return keys[seed%keys.length]}))];
 let steps=0;
 for(const [traceIndex,trace] of traces.entries()){
  const old=menuFixture(), now=menuFixture();
  const itemHost=(h)=>({currentWorld:()=>h.world,replaceWorld:h.ports.replaceWorld,runScript:async()=>{},runSceneHook:async()=>false,placeEntityInFront:async()=>false});
  now.ports.executeItemUse.mockImplementation((r,signal)=>executeWorldItemUse({world:now.world,targetCharId:r.targetCharId,itemId:r.itemId,items:now.items,host:itemHost(now),signal}));
  const env={...helpers,get world(){return old.world},project:{items:old.items,skills:old.skills,poisonsById:{}},scene:{id:'room'},get saveMetas(){return old.context.metas},lastSaveSlot:old.context.lastSlot,
   audioPrefs:old.context.audio,bgm:{setEnabled:(on)=>old.ports.setAudioPreference('music',on)},sfx:{play:old.ports.playSound,setEnabled:(on)=>old.ports.setAudioPreference('sound',on)},localStorage:{setItem:()=>{}},
   replaceWorld:old.ports.replaceWorld,executeWorldItemUse,showItemUseResults:old.ports.presentItemResults,showToast:old.ports.showToast,host:{report:old.ports.report},
   browserWrite:old.ports.writeSlot,browserLoad:old.ports.loadSlot,reportSaveFailure:old.ports.reportSaveFailure,
   location:{pathname:'/parity',set href(_value){old.ports.quit()}}};
  const oracle=factory(env);oracle.open();now.menus.open();
  const observable=(h,view)=>structuredClone({view,world:h.world,audio:h.context.audio,writes:h.ports.writeSlot.mock.calls,loads:h.ports.loadSlot.mock.calls,toasts:h.ports.showToast.mock.calls,reports:h.ports.report.mock.calls,sounds:h.ports.playSound.mock.calls,audioCommits:h.ports.setAudioPreference.mock.calls,quit:h.ports.quit.mock.calls.length});
  for(const [step,key] of trace.entries()){
    if(key==='close'){oracle.close();now.menus.close()}else if(key==='open'){oracle.open();now.menus.open()}else{oracle.input(new Set([key]));now.menus.input(new Set([key]))}
    await settle();expect(observable(now,now.menus.view),JSON.stringify({traceIndex,step,key,trace})).toEqual(observable(old,oracle.view()));steps++;
  }
 }
 expect(traces.length).toBe(155);expect(steps).toBeGreaterThan(3750);writeFileSync(${JSON.stringify(resolve(output, 'metrics.json'))},JSON.stringify({traces:traces.length,steps}));
});`,
)

const target = resolve(root, 'packages/reforge/src/menu/menu-session.ts')
const bytes = readFileSync(target),
  hash = createHash('sha256').update(bytes).digest('hex')
const needle = 'this.#lastMainCursor = this.#menu.stack[0]?.cursor ?? 0'
assert.equal(bytes.toString().split(needle).length, 2)
const rows = []
for (const negative of [false, true]) {
  const id = negative ? 'lost-navigation-memory' : 'control',
    config = resolve(output, `${id}.config.mjs`),
    report = resolve(output, `${id}.json`),
    marker = resolve(output, `${id}.entered`)
  writeFileSync(
    config,
    `import {readFileSync,writeFileSync} from 'node:fs';export default {root:${JSON.stringify(root)},plugins:${negative ? `[{name:'parity-negative',enforce:'pre',load(id){if(id!==${JSON.stringify(target)})return;const source=readFileSync(id,'utf8');if(source.split(${JSON.stringify(needle)}).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},id);return source.replace(${JSON.stringify(needle)},'this.#lastMainCursor = 0')}}]` : '[]'},test:{include:[${JSON.stringify(testFile)}],reporters:['json'],outputFile:${JSON.stringify(report)},maxWorkers:1}}`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: root,
    env: preciseCoverageEnvironment(),
    encoding: 'utf8',
  })
  const log = `${run.stdout ?? ''}\n${run.stderr ?? ''}`
  writeFileSync(resolve(output, `${id}.log`), log)
  assert.equal(run.signal, null)
  assert(!/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/.test(log))
  const result = JSON.parse(readFileSync(report, 'utf8')),
    assertions = result.testResults.flatMap((file) =>
      file.assertionResults.map((entry) => ({ ...entry, file: file.name })),
    )
  assert.equal(assertions.length, 1)
  assert(result.testResults.every((file) => !file.message))
  assert.equal(result.numTodoTests, 0)
  assert.equal(
    assertions[0].fullName,
    'frozen main and extracted menu preserve every public state and side effect across deterministic input traces',
  )
  assert.equal(assertions[0].file, testFile)
  assert.equal(result.numPendingTests, 0)
  if (negative) {
    assert.equal(run.status, 1)
    assert.equal(assertions[0].status, 'failed')
    assert(
      assertions[0].failureMessages.length > 0 &&
        assertions[0].failureMessages.every(
          (m) =>
            /^AssertionError\b/.test(stripVTControlCharacters(m).trimStart()) &&
            !/\btimeout\b|\btimed out\b|(?:^|\n)\s*(?:Error|TypeError|RangeError):/i.test(m),
        ),
    )
    assert.equal(readFileSync(marker, 'utf8'), target)
  } else {
    assert.equal(run.status, 0, `parity failed: ${output}`)
    assert.equal(result.numPassedTests, 1)
  }
  assert.equal(createHash('sha256').update(readFileSync(target)).digest('hex'), hash)
  const metrics = negative
    ? undefined
    : JSON.parse(readFileSync(resolve(output, 'metrics.json'), 'utf8'))
  if (metrics) {
    assert.equal(metrics.traces, 155)
    assert(Number.isInteger(metrics.steps) && metrics.steps > 3750)
  }
  rows.push({
    id,
    exit: run.status,
    ...(negative ? {} : { matchedTraces: metrics.traces, comparedSteps: metrics.steps }),
    failures: assertions[0].failureMessages,
  })
  console.log(`${id}: ${negative ? 'detected' : '155 traces matched'}`)
}
writeFileSync(
  resolve(output, 'summary.json'),
  JSON.stringify({ base: '09429b6c', hash, rows }, null, 2),
)
console.log(`Menu parity evidence: ${output}`)
