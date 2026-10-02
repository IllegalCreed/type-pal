import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { sha256 } from './browser-journey.mjs'
import { navigateInnRoute } from './inn-navigation.mjs'
import { planInnRoute } from './inn-route.mjs'
import {
  assertMealCollector,
  assertMealDialogue,
  assertMealEnd,
  assertMealGameSaveInput,
  assertMealPhase,
  mealArguments,
  mealAuthorTextIds,
  mealInventoryCount,
  mealSaveView,
  mealServingDestination,
  mealTraceArtifact,
  readMealContract,
  validateMealPredecessor,
} from './meal-contract.mjs'
import { mealGameBoundaryCommitted, navigateMealRoute } from './meal-journey.mjs'
import { installMealObserver } from './meal-observer.mjs'
import { instrumentMealTrace, MEAL_TRACE_TARGETS } from './meal-trace-plugin.mjs'

const donor = () => {
  const payload = {
    format: 'type-pal-save',
    gs: {
      wNumScene: 2,
      dwCash: 500,
      party: { x: 1, y: 2, facing: 'up' },
      partyMembers: [0],
      PlayerRolesRuntime: { rgwSpriteNum: [2] },
      inventory: [],
      rgScene: [],
      rgObject: [],
      rgEventObject: [],
      allEventObjects: [
        { id: 19, sState: 2 },
        { id: 20, sState: 1, triggerLabel: 'L_583' },
        { id: 62, sState: 2 },
      ],
    },
  }
  const bytes = JSON.stringify(payload),
    world = mealSaveView(payload, 'game'),
    frame = { width: 320, height: 200, nonBlack: 50000, sha256: 'b'.repeat(64) }
  const report = {
    status: 'passed',
    fragment: '003',
    engine: 'game',
    name: 'game-003',
    revision: 'a'.repeat(40),
    core: { status: 'passed' },
    route: { status: 'passed' },
    sourceHashesStable: true,
    checkpoint: { path: '003.end.save.json', sha256: sha256(bytes) },
    endWorld: world,
    restoredWorld: structuredClone(world),
    endWorldHash: sha256(JSON.stringify(world)),
    restoredWorldHash: sha256(JSON.stringify(world)),
    endFrame: frame,
    restoredFrame: frame,
  }
  return { report, payload, bytes }
}

test('004 artifact receipt hashes the exact pretty-printed file bytes and is detached', () => {
  const trace = { events: [{ id: 'party', order: 0 }], pages: [] }
  const result = mealTraceArtifact(trace)
  assert.equal(result.bytes, JSON.stringify(trace, null, 2))
  assert.equal(result.sha256, sha256(result.bytes))
  assert.notEqual(result.sha256, sha256(JSON.stringify(trace)))
  trace.events[0].order = 1
  assert.equal(JSON.parse(result.bytes).events[0].order, 0)
})
test('004 room entry inside proximity still plans an ordinary step into the actual serving zone', () => {
  const map = JSON.parse(
    readFileSync(new URL('../../projects/pal/content/maps/map-012.json', import.meta.url), 'utf8'),
  )
  const start = [108, 30]
  assert(Math.max(Math.abs(start[0] - 108), Math.abs(start[1] - 29)) <= 1)
  assert.equal(
    mealServingDestination(...start),
    false,
    'proximity must not finish the route without input',
  )
  assert.deepEqual(planInnRoute(map, start, mealServingDestination), ['ArrowUp'])
  assert.equal(mealServingDestination(108, 29), true)
})
test('004 inventory follows actual WorldState array entries, including RF wine1, and rejects map DTOs', () => {
  const file = 'packages/content/src/character.ts'
  const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const world = ast.statements.find(
    (node) => ts.isInterfaceDeclaration(node) && node.name.text === 'WorldState',
  )
  const inventory = world.members.find((node) => node.name?.getText(ast) === 'inventory')
  assert(ts.isArrayTypeNode(inventory.type), 'current WorldState inventory is not an array')
  const entry = inventory.type.elementType
  assert(ts.isTypeLiteralNode(entry))
  assert.equal(
    entry.members.find((node) => node.name.getText(ast) === 'itemId').type.kind,
    ts.SyntaxKind.StringKeyword,
  )
  assert.equal(
    entry.members.find((node) => node.name.getText(ast) === 'count').type.kind,
    ts.SyntaxKind.NumberKeyword,
  )
  const manifest = JSON.parse(
    readFileSync(new URL('../../projects/pal/manifest.json', import.meta.url), 'utf8'),
  )
  const clean = manifest.entryPoints.find((entry) => entry.id === 'new-game').startWorld.inventory
  assert(Array.isArray(clean))
  assert.equal(mealInventoryCount(clean, 'reforge'), 0)
  assert.equal(mealInventoryCount([{ itemId: '272', count: 1 }], 'reforge'), 1)
  assert.equal(mealInventoryCount([{ itemId: 272, count: 1 }], 'game'), 1)
  for (const engine of ['game', 'reforge'])
    for (const invalid of [{}, { 272: 1 }, null, undefined])
      assert.throws(() => mealInventoryCount(invalid, engine), /array/)
})

test('004 CLI rejects missing donor, arbitrary scene/position and conflicting mode', () => {
  assert.throws(() => mealArguments([]), /required/)
  for (const args of [
    ['--scene', 's003'],
    ['--from', 'a', '--pos', '1,2'],
    ['--from', 'a', '--headless', '--headed'],
    ['--from', 'a', '--from', 'b'],
  ])
    assert.throws(() => mealArguments(args))
  assert.throws(() => mealArguments(['--game-report', 'a', '--expect-stationary-no-gift'], true))
})
test('003 admission rejects false evidence, byte mutation, wrong engine/story and pickup pollution', () => {
  const { report, payload, bytes } = donor()
  validateMealPredecessor(report, payload, 'game', bytes)
  for (const patch of [
    { status: 'failed' },
    { fragment: '002' },
    { engine: 'reforge' },
    { core: { status: 'running' } },
    { sourceHashesStable: false },
    { restoredWorldHash: 'c'.repeat(64) },
    { restoredFrame: { ...report.restoredFrame, sha256: 'c'.repeat(64) } },
  ])
    assert.throws(() => validateMealPredecessor({ ...report, ...patch }, payload, 'game', bytes))
  assert.throws(() => validateMealPredecessor(report, payload, 'game', `${bytes} `), /bytes differ/)
  const p = structuredClone(payload)
  p.gs.inventory = [{ itemId: 272, count: 1 }]
  const b = JSON.stringify(p),
    w = mealSaveView(p, 'game'),
    h = sha256(JSON.stringify(w))
  assert.throws(
    () =>
      validateMealPredecessor(
        {
          ...report,
          checkpoint: { path: '003.end.save.json', sha256: sha256(b) },
          endWorld: w,
          restoredWorld: w,
          endWorldHash: h,
          restoredWorldHash: h,
        },
        p,
        'game',
        b,
      ),
    /wine already owned/,
  )
})
test('004 actual isolated transforms retain reviewed restore/commit and menu dispatch/render anchors', () => {
  for (const file of MEAL_TRACE_TARGETS) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'),
      result = instrumentMealTrace(source, file)
    assert.equal(
      ts.createSourceFile(file, result.code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
      0,
    )
    if (file.endsWith('/reforge/src/main.ts')) {
      assert.equal(result.anchors.actualReforgeMenuRender, 1)
      assert.equal(result.anchors.restorePayloadCommitted, 1)
      assert(result.code.includes("'e15','e16','e19','e20','e24','e25','e26'"))
    }
    if (file.endsWith('/menu-session.ts')) assert.equal(result.anchors.actualReforgeItemDispatch, 1)
    if (file.endsWith('/event-system.ts')) assert.equal(result.anchors.actualGameItemDispatch, 1)
  }
})
test('004 dispatch and rendered-view census fails closed under primary-source anchor removal', () => {
  for (const [file, from, to] of [
    ['packages/reforge/src/main.ts', 'if (menus.active) {', 'if (menus.active && true) {'],
    [
      'packages/reforge/src/menu/menu-session.ts',
      'private dispatchItemUse(',
      'private changedDispatch(',
    ],
    [
      'packages/game/src/core/event-system.ts',
      'export function startOverworldItemScript(',
      'export function changedUse(',
    ],
  ]) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
    assert(source.includes(from))
    assert.throws(() => instrumentMealTrace(source.replaceAll(from, to), file))
  }
})
test('004 observer copies observations and rejects unobserved moves, overflow and duplicate restore commits', () => {
  const host = {}
  let ms = 0
  new Function('globalThis', 'performance', `(${installMealObserver.toString()})()`)(host, {
    now: () => ++ms,
  })
  const state = {
      scene: 's001',
      actors: { party: { position: [0, 0], visible: true } },
      money: 500,
      inventory: [],
      persistent: {},
      control: true,
    },
    original = structuredClone(state)
  host.__mealPoint('render:world', state)
  host.__mealMenu('reforge', { active: true, levels: [{ ids: ['item'], cursor: 0 }] })
  host.__mealDispatch('reforge', { itemId: '272' })
  assert.deepEqual(state, original)
  assertMealCollector(host.__readMealEvidence())
  const t = host.__readMealEvidence()
  t.latestMenu.active = false
  t.final.money = 0
  assert.equal(host.__readMealEvidence().latestMenu.active, true)
  assert.equal(host.__readMealEvidence().final.money, 500)
  host.__mealPoint('render:world', {
    ...state,
    actors: { party: { position: [1, 0], visible: true } },
  })
  assert.throws(() => assertMealCollector(host.__readMealEvidence()), /observer error/)
  host.__mealRestoreCommitted({})
  host.__mealRestoreCommitted({})
  assert.equal(host.__readMealEvidence().overflow, true)
})
test('004 global party continuity survives a real pre-switch placement and still rejects an uncommitted re-entry move', () => {
  const host = {}
  let clock = 0
  new Function('globalThis', 'performance', `(${installMealObserver.toString()})()`)(host, {
    now: () => ++clock,
  })
  const point = (source, scene, position) =>
    host.__mealPoint(source, {
      scene,
      actors: { party: { position, visible: true } },
      persistent: {},
      money: 500,
      inventory: [],
    })
  point('render:world', 's001', [1, 1])
  point('commit:applyRawOpcode', 's001', [2, 2])
  point('tick:tickEventSystem', 's003', [2, 2])
  point('commit:applyRawOpcode', 's003', [3, 3])
  point('tick:tickEventSystem', 's001', [3, 3])
  assertMealCollector(host.__readMealEvidence())
  point('render:world', 's003', [4, 4])
  assert.throws(() => assertMealCollector(host.__readMealEvidence()), /observer error/)
})
test('004 ordered original/current rendered dialogue rejects missing, replayed and misattributed lines', async () => {
  const c = await readMealContract(),
    pages = c.rows.map((r, i) => ({
      engine: 'game',
      order: i,
      page: { instance: i, lines: [r.text], title: r.speaker },
    })),
    t = { pages }
  assert.equal(assertMealDialogue(t, 'game', c).size, 40)
  for (const corrupt of [
    (t) => t.pages.splice(2, 1),
    (t) => t.pages.push({ ...t.pages[0], page: { ...t.pages[0].page, instance: 100 } }),
    (t) => {
      t.pages[0].page.title = 'not-aunt'
    },
  ]) {
    const wrong = structuredClone(t)
    corrupt(wrong)
    assert.throws(() => assertMealDialogue(wrong, 'game', c))
  }
})
test('004 author source keeps the complete unique gift body on e62, never on the wine private script', async () => {
  const actual = await readMealContract()
  assert.equal(mealAuthorTextIds(actual.scenes, actual.item).size, 40)
  const mutant = () => {
    const scenes = structuredClone(actual.scenes),
      item = structuredClone(actual.item)
    const taoist = scenes.s003.entities.find((e) => e.id === 'e62')
    const gift = taoist.behaviors.trigger['c8-321c0a7d7de1'].flow
    const privateBody = item.use.effects.find((e) => e.kind === 'itemPrivateScript').script.body
    return { scenes, item, taoist, gift, privateBody }
  }
  const copied = mutant()
  copied.privateBody.push(...structuredClone(copied.gift.stages[0].body))
  assert.throws(() => mealAuthorTextIds(copied.scenes, copied.item), /private|NPC/)
  const moved = mutant()
  moved.privateBody.push(...structuredClone(moved.gift.stages[0].body))
  delete moved.taoist.behaviors.trigger['c8-321c0a7d7de1']
  assert.throws(() => mealAuthorTextIds(moved.scenes, moved.item), /private|NPC/)
  const missing = mutant()
  delete missing.taoist.behaviors.trigger['c8-321c0a7d7de1']
  assert.throws(() => mealAuthorTextIds(missing.scenes, missing.item), /NPC/)
  const lost = mutant()
  lost.privateBody.push({ kind: 'loseItem', itemId: '272' })
  assert.throws(() => mealAuthorTextIds(lost.scenes, lost.item), /private/)
  const extraDialog = mutant()
  extraDialog.privateBody.push({ kind: 'dialog', cue: { rows: [{ text: 'dlg.141' }] } })
  assert.throws(() => mealAuthorTextIds(extraDialog.scenes, extraDialog.item), /private/)
  const unrelatedDialog = mutant()
  unrelatedDialog.privateBody.push({ kind: 'dialog', cue: { rows: [{ text: 'dlg.99999' }] } })
  assert.throws(() => mealAuthorTextIds(unrelatedDialog.scenes, unrelatedDialog.item), /private/)
})
test('004 freezes its actual compiler, validation guard, runtime runner and activity-lineage sources', async () => {
  const contract = await readMealContract()
  for (const file of [
    'packages/reforge/src/script-compiler-core.ts',
    'packages/reforge/src/runtime-script-compiler.ts',
    'packages/reforge/src/runtime-script-runner.ts',
    'packages/reforge/src/script-activity-lineage.ts',
    'packages/reforge/src/script-host-adapter.ts',
    'packages/reforge/src/active-scene.ts',
    'packages/content/src/command-validation-options.ts',
    'packages/content/src/runtime-script.ts',
    'packages/content/src/author-script.ts',
  ])
    assert.equal(
      contract.hashes[file],
      sha256(readFileSync(new URL(`../../${file}`, import.meta.url))),
    )
})
test('004 serving and gift phase positive controls use real canonical RF inventory arrays', () => {
  const serve = {
    events: [
      { kind: 'actor', id: 'e15', order: 1, before: { visible: true }, state: { visible: false } },
      {
        kind: 'actor',
        id: 'e26',
        order: 4,
        source: 'commit:meta.entity.pos',
        before: { position: [1, 1] },
        state: { position: [2, 1] },
      },
      {
        kind: 'progress',
        order: 7,
        before: { inventory: [] },
        state: { inventory: [{ itemId: '272', count: 1 }] },
      },
    ],
    frames: [],
  }
  const shown = new Map([
    ['dlg.95', 2],
    ['dlg.96', 3],
    ['dlg.98', 5],
    ['dlg.112', 6],
  ])
  assertMealPhase(serve, 'reforge', shown, 'serve', -1)
  const bad = structuredClone(serve)
  bad.events[2].state.inventory = { 272: 1 }
  assert.throws(() => assertMealPhase(bad, 'reforge', shown, 'serve', -1), /array/)
})
test('004 end rejects live taoist, carried sprite, missing wine decrement and entered005', () => {
  const { payload } = donor()
  payload.gs.wNumScene = 4
  payload.gs.allEventObjects = [15, 16, 20, 62].map((id) => ({ id, sState: 0 }))
  payload.gs.allEventObjects.push({ id: 19, triggerLabel: 'L_741' })
  assertMealEnd(payload, 'game')
  for (const change of [
    (p) => {
      p.gs.allEventObjects[3].sState = 2
    },
    (p) => {
      p.gs.PlayerRolesRuntime.rgwSpriteNum[0] = 208
    },
    (p) => {
      p.gs.inventory = [{ itemId: 272, count: 1 }]
    },
    (p) => {
      p.gs.allEventObjects[4].triggerLabel = 'L_565'
    },
  ]) {
    const p = structuredClone(payload)
    change(p)
    assert.throws(() => assertMealEnd(p, 'game'))
  }
})
test('004 gift dependencies reject early disappearance or double consumption even with final zero inventory', () => {
  const shown = new Map([
    ['dlg.202', 2],
    ['dlg.203', 4],
    ['dlg.205', 5],
    ['dlg.207', 8],
  ])
  const trace = {
    events: [
      { kind: 'actor', id: 'e62', order: 3, before: { visible: true }, state: { visible: false } },
      {
        kind: 'progress',
        order: 6,
        before: { inventory: [{ itemId: '272', count: 1 }] },
        state: { inventory: [] },
      },
    ],
    frames: [],
  }
  assertMealPhase(trace, 'reforge', shown, 'wine-gift', -1)
  const wrong = structuredClone(trace)
  wrong.events[0].order = 1
  assert.throws(() => assertMealPhase(wrong, 'reforge', shown, 'wine-gift', -1), /disappeared/)
  const doubled = structuredClone(trace)
  doubled.events.push({ ...doubled.events[1], order: 7 })
  assert.throws(() => assertMealPhase(doubled, 'reforge', shown, 'wine-gift', -1), /exactly once/)
})
test('004 observes actual synchronous materialization before player placement and preserves original throws', () => {
  const file = 'packages/reforge/src/main.ts',
    source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
  const transformed = instrumentMealTrace(source, file)
  assert.equal(transformed.anchors.actualSceneMaterialization, 1)
  const execute = (code, fails) => {
    const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
    const functions = []
    const find = (node) => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'commitSceneSwitch')
        functions.push(node)
      ts.forEachChild(node, find)
    }
    find(ast)
    assert.equal(functions.length, 1)
    const body = ts.transpileModule(functions[0].getText(ast), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText
    return new Function(
      'fails',
      `
      const points=[], failure=new Error('actual commit failed'), player={pos:{col:1,row:1}},
        spriteCache={prune:()=>{}}, resetFrameAnimationPresentation=()=>{},
        activeScene={scene:{id:'old'},commit(plan){this.scene={id:'new'};if(fails)throw failure}},
        seedFormationTrail=()=>[], followerFrozen=[], followerPos=[], followerAuth=new Map(),
        motion={resetCadence:()=>{}}, updateCamera=()=>{}, bgm={stop:()=>{},play:()=>{}},
        __openingPoint=source=>points.push({source,scene:activeScene.scene.id,pos:{...player.pos}});
      let facing='up',partyLayer=8,walking=true,stepFrame=2,trail=[],caught;
      ${body}
      try{commitSceneSwitch({neededSprites:[],spawn:{pos:{col:2,row:3},facing:'down'},def:{}},{})}catch(error){caught=error}
      return {points,state:{pos:player.pos,facing,partyLayer,walking,stepFrame,trail},sameThrow:caught===failure};
    `,
    )(fails)
  }
  for (const fails of [false, true]) {
    const original = execute(source, fails),
      instrumented = execute(transformed.code, fails)
    assert.deepEqual(instrumented.state, original.state)
    assert.equal(instrumented.sameThrow, original.sameThrow)
    const success = instrumented.points.filter((p) => p.source === 'commit:scene-materialization')
    if (fails)
      assert.deepEqual(success, [], 'throwing materialization cannot emit a successful commit')
    else
      assert.deepEqual(success, [
        { source: 'commit:scene-materialization', scene: 'new', pos: { col: 1, row: 1 } },
      ])
  }
  assert.throws(
    () =>
      instrumentMealTrace(
        source.replace('activeScene.commit(plan)', 'activeScene.changed(plan)'),
        file,
      ),
    /census/,
  )
  assert.throws(
    () =>
      instrumentMealTrace(
        source.replace('activeScene.commit(plan)', 'await activeScene.commit(plan)'),
        file,
      ),
    /asynchronous|parse|census|not a direct statement/,
  )
})
test('004 save input projection is detached at the real clone boundary and separates staging from F5', () => {
  const host = {}
  let clock = 0
  new Function('globalThis', 'performance', `(${installMealObserver.toString()})()`)(host, {
    now: () => ++clock,
  })
  const { payload } = donor(),
    gs = payload.gs
  host.__mealGameSaved(host.__mealGameSaving(1, gs))
  const arm = host.__mealArmSaveCapture('004.carry', 1)
  gs.allEventObjects[0].facing = 'up'
  const captured = host.__mealGameSaving(1, gs),
    stored = structuredClone(payload)
  host.__mealGameSaved(captured)
  gs.allEventObjects[0].facing = 'down'
  const trace = host.__readMealEvidence()
  assert.equal(trace.saveCaptures[0].arm, null)
  assert.equal(assertMealGameSaveInput(trace, 1, 1, arm, stored).world.actors[0].facing, 'up')
  assert.deepEqual(trace.saveCaptures[1].world, mealSaveView(stored, 'game'))
  assert.throws(() => assertMealGameSaveInput(trace, 0, 0, arm, stored), /exactly one/)
  assert.throws(
    () => assertMealGameSaveInput(trace, 1, 1, { ...arm, phase: 'other' }, stored),
    /another phase/,
  )
  assert.throws(() => assertMealGameSaveInput(trace, 1, 1, { ...arm, slot: 2 }, stored))
  const wrong = structuredClone(stored)
  wrong.gs.allEventObjects[0].facing = 'down'
  assert.throws(() => assertMealGameSaveInput(trace, 1, 1, arm, wrong), /synchronous save input/)
  const mutatedTrace = host.__readMealEvidence()
  mutatedTrace.saveCaptures[1].world.actors[0].facing = 'wrong'
  assert.equal(host.__readMealEvidence().saveCaptures[1].world.actors[0].facing, 'up')
})
test('004 actual Save.saveSlot preserves input/write semantics and emits no successful completion on clone or store throw', async () => {
  const file = 'packages/game/src/core/save/api.ts',
    source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
  const transformed = instrumentMealTrace(source, file)
  assert.equal(transformed.anchors.actualGameSaveInput, 1)
  const execute = async (code, gs, idb, failureAt) => {
    const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true),
      methods = []
    const find = (node) => {
      if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'saveSlot') methods.push(node)
      ts.forEachChild(node, find)
    }
    find(ast)
    assert.equal(methods.length, 1)
    const body = ts.transpileModule(`const ActualSave={${methods[0].getText(ast)}}`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText
    const host = {}
    let ms = 0
    new Function('globalThis', 'performance', `(${installMealObserver.toString()})()`)(host, {
      now: () => ++ms,
    })
    const originalSaving = host.__mealGameSaving,
      originalSaved = host.__mealGameSaved
    const log = []
    host.__mealGameSaving = (...args) => {
      log.push('capture')
      return originalSaving(...args)
    }
    host.__mealGameSaved = (...args) => {
      log.push('ack')
      return originalSaved(...args)
    }
    host.__mealArmSaveCapture('004.carry', 1)
    const result = await new Function(
      'globalThis',
      'gs',
      'idb',
      'failureAt',
      'log',
      `
      const failure=new Error('actual save failed'), MAX_SAVE_SLOTS=5, _slots=new Map();let stored;
      const extractMeta=()=>{log.push('meta');return {}}, idbAvailable=()=>idb,
        deepClone=input=>{log.push('clone');if(failureAt==='clone')throw failure;return structuredClone(input)},
        IndexedDbSave={async saveSlot(slot,copy){log.push('write');if(failureAt==='write')throw failure;stored=copy}};
      ${body}
      return (async()=>{let caught;try{await ActualSave.saveSlot(1,gs)}catch(error){caught=error}
        return {stored:stored??_slots.get(1)?.gs,sameThrow:caught===failure};})();
    `,
    )(host, gs, idb, failureAt, log)
    return { ...result, log, trace: host.__readMealEvidence() }
  }
  for (const idb of [false, true])
    for (const failureAt of [null, 'clone', ...(idb ? ['write'] : [])]) {
      const { payload } = donor(),
        originalInput = structuredClone(payload.gs)
      const original = await execute(source, payload.gs, idb, failureAt),
        observed = await execute(transformed.code, payload.gs, idb, failureAt)
      assert.deepEqual(payload.gs, originalInput, 'observer changed actual Save input')
      assert.equal(observed.sameThrow, original.sameThrow)
      assert.deepEqual(observed.stored, original.stored)
      assert.equal(observed.trace.saveCaptures.length, 1)
      if (failureAt)
        assert.equal(
          observed.trace.saveCompletions.length,
          0,
          'throw cannot emit a successful save completion',
        )
      else {
        assert.equal(observed.trace.saveCompletions.length, 1)
        assert.deepEqual(
          observed.trace.saveCaptures[0].world,
          mealSaveView({ format: 'type-pal-save', gs: observed.stored }, 'game'),
        )
      }
      assert.equal(observed.log[0], 'capture')
      assert.equal(observed.log[1], 'meta')
      assert.equal(observed.log[2], 'clone')
    }
  assert.throws(
    () =>
      instrumentMealTrace(
        source.replace('const meta = extractMeta(gs)', 'const metadata = extractMeta(gs)'),
        file,
      ),
    /meta anchor/,
  )
  assert.throws(
    () =>
      instrumentMealTrace(
        source.replace(
          'const meta = extractMeta(gs)',
          'await Promise.resolve(); const meta = extractMeta(gs)',
        ),
        file,
      ),
    /asynchronous/,
  )
  assert.throws(
    () => instrumentMealTrace(source.replace('deepClone(gs)', 'deepClone(other)'), file),
    /cloned another source/,
  )
})
test('004 target ready -> event-before-dialog transition releases held input and awaits the original full destination', async () => {
  const map = JSON.parse(
    readFileSync(new URL('../../projects/pal/content/maps/map-010.json', import.meta.url), 'utf8'),
  )
  const exercise = async (navigate) => {
    const states = [
      { scene: 's003', position: [133, 44], ready: true, dialog: null },
      { scene: 's003', position: [133, 43], ready: true, dialog: null },
      { scene: 's003', position: [133, 43], ready: false, dialog: null, ip: 215 },
      { scene: 's001', position: [108, 30], ready: true, dialog: null },
    ]
    let index = 0
    const held = new Set(),
      actions = []
    const read = async () => states[Math.min(index++, states.length - 1)]
    const keyboard = {
      down: async (key) => {
        held.add(key)
        actions.push(['down', key])
      },
      up: async (key) => {
        held.delete(key)
        actions.push(['up', key])
      },
    }
    const until = async (observe, accept) => {
      for (let n = 0; n < 5; n++) {
        const state = await observe()
        if (accept(state)) return state
      }
      throw new Error('bounded test endpoint did not settle')
    }
    let error
    try {
      await navigate({
        keyboard,
        map,
        read,
        until,
        health: () => {},
        grid: (s) => s.position,
        inScene: (s) => s.scene === 's003',
        ready: (s) => s.ready,
        destination: (c, r) => c === 133 && r === 43,
        finished: (s) => s.scene === 's001' && s.ready,
        onInput: () => {},
        onProgress: () => {},
      })
    } catch (caught) {
      error = caught
    }
    return { error, actions, held, index }
  }
  const old = await exercise(navigateInnRoute)
  assert.match(old.error.message, /unexpected script/)
  const current = await exercise(navigateMealRoute)
  assert.equal(current.error, undefined)
  assert.deepEqual(current.actions, [
    ['down', 'ArrowUp'],
    ['up', 'ArrowUp'],
  ])
  assert.equal(current.held.size, 0)
  assert.equal(current.index, 4, 'event without dialogue must not count as the full endpoint')
})
test('004 rejects a script outside the goal without current-leg ordinary landing proof and leaves all input up', async () => {
  const map = JSON.parse(
    readFileSync(new URL('../../projects/pal/content/maps/map-010.json', import.meta.url), 'utf8'),
  )
  for (const initiallyBusy of [false, true]) {
    const start = { scene: 's003', position: [133, 44], ready: !initiallyBusy },
      outside = { scene: 's003', position: [133, 44], ready: false }
    let reads = 0
    const held = new Set()
    await assert.rejects(
      navigateMealRoute({
        keyboard: { down: async (key) => held.add(key), up: async (key) => held.delete(key) },
        map,
        read: async () => (reads++ === 0 ? start : outside),
        until: async (read, accept) => {
          const s = await read()
          assert(accept(s))
          return s
        },
        health: () => {},
        grid: (s) => s.position,
        inScene: (s) => s.scene === 's003',
        ready: (s) => s.ready,
        destination: (c, r) => c === 133 && r === 43,
        finished: (s) => s.scene === 's001' && s.ready,
        onInput: () => {},
        onProgress: () => {},
      }),
      /outside target boundary/,
    )
    assert.equal(held.size, 0)
  }
})
test('004 game boundary proof rejects scripted placement, old legs, other scenes and no displacement', () => {
  const event = {
    order: 11,
    kind: 'actor',
    id: 'party',
    scene: 's003',
    source: 'commit:tickSceneInput',
    before: { position: [1424, 1416] },
    state: { position: [1440, 1408] },
  }
  const goal = (c, r) => c === 133 && r === 43
  const trace = (value) => ({ events: [value], errors: [], overflow: false })
  assert.equal(mealGameBoundaryCommitted(trace(event), 10, 's003', goal), true)
  for (const patch of [
    { source: 'commit:applyRawOpcode' },
    { source: 'commit:player.pos' },
    { order: 10 },
    { scene: 's001' },
    { before: event.state },
  ])
    assert.equal(mealGameBoundaryCommitted(trace({ ...event, ...patch }), 10, 's003', goal), false)
})
test('004 game observed script after a real current-leg landing waits without any further direction input', async () => {
  const map = JSON.parse(
    readFileSync(new URL('../../projects/pal/content/maps/map-010.json', import.meta.url), 'utf8'),
  )
  const states = [
    { scene: 's003', position: [133, 44], ready: true },
    { scene: 's003', position: [134, 43], ready: false },
    { scene: 's001', position: [108, 30], ready: true },
  ]
  const held = new Set(),
    actions = []
  let reads = 0,
    committed = false
  const read = async () => states[Math.min(reads++, states.length - 1)]
  await navigateMealRoute({
    keyboard: {
      down: async (key) => {
        held.add(key)
        actions.push(['down', key])
        committed = true
      },
      up: async (key) => {
        held.delete(key)
        actions.push(['up', key])
      },
    },
    map,
    read,
    until: async (observe, accept) => {
      for (let n = 0; n < 4; n++) {
        const s = await observe()
        if (accept(s)) return s
      }
      throw new Error('expected endpoint missing')
    },
    health: () => {},
    grid: (s) => s.position,
    inScene: (s) => s.scene === 's003',
    ready: (s) => s.ready,
    destination: (c, r) => c === 133 && r === 43,
    finished: (s) => s.scene === 's001' && s.ready,
    onInput: () => {},
    onProgress: () => {},
    boundaryCommitted: () => committed,
  })
  assert.deepEqual(actions, [
    ['down', 'ArrowUp'],
    ['up', 'ArrowUp'],
  ])
  assert.equal(held.size, 0)
})
