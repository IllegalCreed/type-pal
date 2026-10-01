import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { sha256 } from './browser-journey.mjs'
import { validatePredecessor } from './inn-contract.mjs'
import {
  assertKitchenDialogue,
  assertKitchenEndPayload,
  assertKitchenTrace,
  KITCHEN_ROWS,
  kitchenArguments,
  kitchenEndPresented,
  kitchenHandoffReady,
  validateKitchenPredecessor,
} from './kitchen-contract.mjs'
import { installKitchenObserver } from './kitchen-observer.mjs'
import { instrumentKitchenTrace, KITCHEN_TRACE_TARGETS } from './kitchen-trace-plugin.mjs'
import { openingSaveView } from './reforge-opening-policy.mjs'

const observer = () => {
  const host = {}
  new Function('globalThis', 'performance', `(${installKitchenObserver.toString()})()`)(host, {
    now: () => 1,
  })
  return host
}
const fixture = () => {
  const contract = {
    rows: KITCHEN_ROWS.map((n) => ({
      id: `dlg.${n}`,
      text: `line${n}`,
      speaker: n < 100 || n === 126 || n === 127 ? 'aunt' : 'taoist',
    })),
    locale: {},
  }
  const trace = { events: [], pages: [], frames: [], errors: [], overflow: false }
  let order = 0
  const append = (list, value) =>
    list.push({ seq: list.length, order: order++, atMs: order, sample: order, ...value })
  let position = [1168, 1368],
    before = { position, visible: true, facing: 'right', walking: true, stepFrame: 3 }
  append(trace.events, {
    kind: 'actor',
    scene: 's003',
    id: 'party',
    source: 'render:world',
    before: null,
    state: before,
  })
  let auntBefore = { position: [1136, 1624], facing: 'down', visible: true }
  append(trace.events, {
    kind: 'actor',
    scene: 's003',
    id: 'e56',
    source: 'render:world',
    before: null,
    state: auntBefore,
  })
  const stairs = { startOrder: order - 1 }
  for (let i = 0; i < 12; i++) {
    position = position.map((n) => n + (i % 2 ? 6 : 10))
    const state = { position, visible: true, facing: 'right', walking: true, stepFrame: i % 4 }
    append(trace.events, {
      kind: 'actor',
      scene: 's003',
      id: 'party',
      source: 'commit:applyRawOpcode',
      before,
      state,
    })
    append(trace.frames, {
      engine: 'game',
      frame: {
        position,
        facing: 'right',
        walking: true,
        layer: 0,
        sprite: 2,
        stepFrame: i % 4,
        frameIndex: 9 + [0, 1, 0, 2][i % 4],
        frame: { width: 20, height: 30 },
      },
    })
    before = state
  }
  stairs.endOrder = order
  for (const row of contract.rows) {
    append(trace.pages, {
      engine: 'game',
      page: { instance: order, lines: [row.text], title: row.speaker },
    })
    if (row.id === 'dlg.58') {
      for (const position of [
        [1008, 1560],
        [1088, 1520],
        [1008, 1480],
      ]) {
        const state = { position, facing: 'left', visible: true }
        append(trace.events, {
          kind: 'actor',
          scene: 's003',
          id: 'e56',
          source: 'commit:npcWalkTo',
          before: auntBefore,
          state,
        })
        auntBefore = state
      }
      append(trace.events, {
        kind: 'progress',
        state: { money: 500, persistent: { e19: { state: 2 }, e20: { state: 0 } } },
      })
      append(trace.events, {
        kind: 'actor',
        scene: 's003',
        id: 'e56',
        source: 'commit:applyRawOpcode',
        before: auntBefore,
        state: { ...auntBefore, visible: false },
      })
    }
    if (row.id === 'dlg.153')
      append(trace.events, {
        kind: 'progress',
        state: { money: 500, persistent: { e20: { state: 1 } } },
      })
  }
  trace.final = {
    scene: 's001',
    control: true,
    money: 500,
    actors: { e19: { visible: true }, e20: { visible: true } },
    persistent: { e56: { state: 0 } },
  }
  return { trace, contract, stairs }
}
test('003 CLI requires a real 002 report and rejects scene/position controls', () => {
  assert.throws(() => kitchenArguments([]), /required --from/)
  assert.throws(
    () => kitchenArguments(['--from', 'x', '--headed', '--headless']),
    /one browser mode/,
  )
  assert.throws(() => kitchenArguments(['--scene', 's001']), /unknown argument/)
  assert.throws(() => kitchenArguments(['--game-report', 'x'], true), /required --reforge-report/)
})
test('002 predecessor admission rejects fake bytes, wrong story, missing restore and old versions; 001 admission stays strict', () => {
  const payload = {
    version: 9,
    contentVersion: 21,
    projectId: 'pal',
    position: { sceneId: 's003' },
    world: {
      money: 500,
      party: [{ id: 'li-xiaoyao' }],
      script: {
        flags: {},
        vars: {},
        entityState: { s003: { e59: 0, e60: 0, e61: 0 }, s001: { e24: 2, e25: 2, e26: 2 } },
      },
    },
  }
  const bytes = JSON.stringify(payload),
    report = {
      status: 'passed',
      name: 'reforge-002',
      fragment: '002',
      engine: 'reforge',
      revision: 'a'.repeat(40),
      core: { status: 'passed' },
      route: { status: 'passed' },
      choreography: { status: 'passed' },
      endWorld: openingSaveView(payload),
      restoredWorld: openingSaveView(payload),
      endWorldHash: sha256(JSON.stringify(openingSaveView(payload))),
      restoredWorldHash: sha256(JSON.stringify(openingSaveView(payload))),
      endFrame: { width: 320, height: 200, nonBlack: 50000, sha256: 'b'.repeat(64) },
      restoredFrame: { width: 320, height: 200, nonBlack: 50000, sha256: 'b'.repeat(64) },
      checkpoint: { path: '002.end.save.json', sha256: sha256(bytes) },
    }
  assert.equal(validateKitchenPredecessor(report, payload, 'reforge', bytes).sha256, sha256(bytes))
  for (const change of [
    { status: 'failed' },
    { fragment: '001' },
    { engine: 'game' },
    { restoredWorldHash: 'c'.repeat(64) },
  ])
    assert.throws(() =>
      validateKitchenPredecessor({ ...report, ...change }, payload, 'reforge', bytes),
    )
  assert.throws(
    () => validateKitchenPredecessor(report, payload, 'reforge', `${bytes} `),
    /bytes differ/,
  )
  for (const change of [{ version: 8 }, { contentVersion: 20 }])
    assert.throws(() =>
      validateKitchenPredecessor(report, { ...payload, ...change }, 'reforge', bytes),
    )
  assert.throws(() => validatePredecessor(report, payload, 'reforge', bytes), /wrong predecessor/)
  const altered = structuredClone(payload)
  altered.world.script.vars.extra = 1
  const alteredBytes = JSON.stringify(altered)
  assert.throws(
    () =>
      validateKitchenPredecessor(
        {
          ...report,
          checkpoint: { ...report.checkpoint, sha256: sha256(alteredBytes) },
        },
        altered,
        'reforge',
        alteredBytes,
      ),
    /checkpoint differs from actual end world/,
  )
  for (const patch of [
    { restoredFrame: undefined },
    { restoredFrame: { ...report.restoredFrame, sha256: 'c'.repeat(64) } },
    { endFrame: { ...report.endFrame, nonBlack: 0 } },
    { endWorld: { ...report.endWorld, position: { sceneId: 's001' } } },
  ])
    assert.throws(() =>
      validateKitchenPredecessor({ ...report, ...patch }, payload, 'reforge', bytes),
    )
})
test('002 game admission binds the persistent save fields to actual end/restore, not only updated SHA', () => {
  const gs = {
    wNumScene: 4,
    dwCash: 500,
    party: { x: 1000, y: 1000, facing: 'down' },
    partyMembers: [0],
    PlayerRolesRuntime: { rgwSpriteNum: [2] },
    inventory: [],
    rgScene: [],
    rgObject: [],
    rgEventObject: [],
    allEventObjects: [19, 20, 24, 25, 26, 59, 60, 61].map((id) => ({
      id,
      x: 1,
      y: 1,
      sState: [24, 25, 26].includes(id) ? 2 : 0,
      triggerLabel: `L_${id}`,
      triggerResume: { ip: id },
    })),
  }
  const payload = { format: 'type-pal-save', gs },
    bytes = JSON.stringify(payload)
  const endWorld = {
    scene: gs.wNumScene,
    party: gs.party,
    members: gs.partyMembers,
    roles: gs.PlayerRolesRuntime,
    cash: gs.dwCash,
    inventory: gs.inventory,
    scenes: gs.rgScene,
    objects: gs.rgObject,
    eventObjects: gs.rgEventObject,
    actors: gs.allEventObjects,
  }
  const frame = { width: 320, height: 200, nonBlack: 50000, sha256: 'b'.repeat(64) }
  const report = {
    status: 'passed',
    fragment: '002',
    engine: 'game',
    name: 'game-002',
    revision: 'a'.repeat(40),
    core: { status: 'passed' },
    route: { status: 'passed' },
    choreography: { status: 'passed' },
    endWorld,
    restoredWorld: structuredClone(endWorld),
    endWorldHash: sha256(JSON.stringify(endWorld)),
    restoredWorldHash: sha256(JSON.stringify(endWorld)),
    endFrame: frame,
    restoredFrame: frame,
    checkpoint: { path: '002.end.save.json', sha256: sha256(bytes) },
  }
  validateKitchenPredecessor(report, payload, 'game', bytes)
  const altered = structuredClone(payload)
  altered.gs.allEventObjects[0].triggerResume.ip++
  const alteredBytes = JSON.stringify(altered)
  assert.throws(
    () =>
      validateKitchenPredecessor(
        {
          ...report,
          checkpoint: { ...report.checkpoint, sha256: sha256(alteredBytes) },
        },
        altered,
        'game',
        alteredBytes,
      ),
    /checkpoint differs from actual end world/,
  )
})
test('003 actual AST retains reviewed commit/save hooks and observes selected rendered frames', () => {
  for (const file of KITCHEN_TRACE_TARGETS) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'),
      result = instrumentKitchenTrace(source, file)
    assert.equal(
      ts.createSourceFile(file, result.code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
      0,
    )
    if (file.endsWith('/reforge/src/main.ts')) {
      assert.equal(result.anchors.commitNudgeParty, 1)
      assert.equal(result.anchors.restorePayloadCommitted, 1)
      assert(result.code.includes('__kitchenRestoreCommitted?.(captureCurrentSavePayload())'))
    }
    if (file.endsWith('/present/present.ts')) assert.equal(result.anchors.actualGamePartyFrame, 1)
    if (file.endsWith('/world-scene-presentation.ts'))
      assert.equal(result.anchors.actualReforgePartyFrame, 1)
  }
})
test('003 actual synchronous nudge commit observes post-body gait even on thrown camera update', () => {
  const file = 'packages/reforge/src/main.ts'
  const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
  const code = instrumentKitchenTrace(source, file).code
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const matches = []
  const walk = (node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'nudgeParty')
      matches.push(node.initializer.getText(ast))
    ts.forEachChild(node, walk)
  }
  walk(ast)
  assert.equal(matches.length, 1)
  for (const failCamera of [false, true]) {
    const points = new Function(
      'failCamera',
      `
      const points=[], player={pos:{col:0,row:0}}, trail=[], facing='right';
      let partyLayer=8, walking=false, stepFrame=1;
      const takeByScript=()=>{}, pixelDeltaToGridDelta=(dx,dy)=>({dcol:dx,drow:dy}),
        pushTrail=()=>{}, displacementFacing=()=>facing, worldPresentation={setPartyGesture:()=>{}},
        updateCamera=()=>{if(failCamera)throw new Error('camera failed')},
        __openingPoint=(source)=>points.push({source,pos:{...player.pos},partyLayer,walking,stepFrame});
      const nudge=${matches[0]};
      try {nudge(10,10,0)} catch(error) {if(!failCamera)throw error}
      return points;
    `,
    )(failCamera)
    assert.deepEqual(
      points.map((p) => p.source),
      ['before:nudgeParty', 'commit:nudgeParty'],
    )
    assert.equal(points[0].stepFrame, 1)
    assert.deepEqual(points[1], {
      source: 'commit:nudgeParty',
      pos: { col: 10, row: 10 },
      partyLayer: 0,
      walking: true,
      stepFrame: 2,
    })
  }
})
test('003 frame anchors fail closed when actual selected leader draw is removed', () => {
  for (const file of [
    'packages/game/src/present/present.ts',
    'packages/reforge/src/world-scene-presentation.ts',
  ]) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
    assert.throws(
      () =>
        instrumentKitchenTrace(
          source.replace(
            file.includes('/game/') ? 'if (partyFrame)' : 'sprites.push(partySprite(leaderFrame,',
            file.includes('/game/')
              ? 'if (partyFrame && true)'
              : 'sprites.push(partySprite(otherFrame,',
          ),
          file,
        ),
      /census changed/,
    )
  }
})
test('003 observer detached copies and captures kitchen-scene pages without altering world', () => {
  const host = observer(),
    state = {
      scene: 's001',
      actors: { party: { position: [0, 0], visible: true } },
      persistent: {},
      money: 500,
      inventory: [],
      control: true,
    }
  const original = structuredClone(state)
  host.__kitchenPoint('render:world', state)
  host.__kitchenRendered({ phase: 'waiting-input', pageText: 'hello' })
  assert.deepEqual(state, original)
  const trace = host.__readKitchenEvidence()
  trace.final.money = 1
  assert.equal(host.__readKitchenEvidence().final.money, 500)
  assert.equal(host.__readKitchenEvidence().pages.length, 1)
})
test('003 observer reports movement missing a commit, overflow and multiple restore evidence', () => {
  const host = observer(),
    state = {
      scene: 's003',
      actors: { party: { position: [0, 0], visible: true } },
      persistent: {},
      money: 500,
      inventory: [],
    }
  host.__kitchenPoint('render:world', state)
  host.__kitchenPoint('render:world', {
    ...state,
    actors: { party: { position: [1, 0], visible: true } },
  })
  assert(host.__readKitchenEvidence().errors.some((e) => e.includes('unobserved committed move')))
  for (let i = 0; i < 4001; i++) host.__kitchenPartyFrame('game', { position: [i, 0] })
  assert.equal(host.__readKitchenEvidence().overflow, true)
  for (let i = 0; i < 3; i++) host.__kitchenRestoreCommitted({ money: i })
  assert.equal(host.__readKitchenEvidence().restoreCommits.length, 2)
})
test('003 full actual timeline validates fourteen rows, twelve committed/drawn fragments and strict end', () => {
  const { trace, contract, stairs } = fixture()
  assert.equal(assertKitchenTrace(trace, 'game', contract, stairs).status, 'passed')
})
test('003 rejects dropped movement even after global sequence re-numbering', () => {
  const { trace, contract, stairs } = fixture()
  const removed = trace.events[2].order
  trace.events.splice(2, 1)
  for (const list of [trace.events, trace.pages, trace.frames])
    list.forEach((e, i) => {
      e.seq = i
      if (e.order > removed) e.order--
    })
  assert.throws(() => assertKitchenTrace(trace, 'game', contract, stairs), /continuity|twelve/)
})
test('003 rejects idle sliding, fake walking flag with idle frame, missing frame and wrong layer', () => {
  for (const patch of [{ walking: false }, { frameIndex: 9 }, { layer: 8 }]) {
    const { trace, contract, stairs } = fixture()
    Object.assign(trace.frames[1].frame, patch)
    assert.throws(() => assertKitchenTrace(trace, 'game', contract, stairs))
  }
  const { trace, contract, stairs } = fixture()
  trace.frames.splice(1, 1)
  assert.throws(() => assertKitchenTrace(trace, 'game', contract, stairs))
})
test('003 rejects constant legal phase/idle index and drawn phase unrelated to committed gait', () => {
  for (const allConstant of [true, false]) {
    const { trace, contract, stairs } = fixture()
    if (allConstant) {
      for (const event of trace.events.filter((e) => e.id === 'party')) {
        event.state.stepFrame = 0
        if (event.before) event.before.stepFrame = 0
      }
      for (const event of trace.frames) Object.assign(event.frame, { stepFrame: 0, frameIndex: 9 })
    } else {
      Object.assign(trace.frames[0].frame, { stepFrame: 1, frameIndex: 10 })
    }
    assert.throws(
      () => assertKitchenTrace(trace, 'game', contract, stairs),
      /phases did not rotate|drawn stair phase differs/,
    )
  }
})
test('003 gait contract accepts actual modulo-four phase rotation without fixing its starting phase', () => {
  const { trace, contract, stairs } = fixture()
  for (const e of trace.events.filter((e) => e.id === 'party')) {
    e.state.stepFrame = (e.state.stepFrame + 2) % 4
  }
  for (const e of trace.frames) {
    e.frame.stepFrame = (e.frame.stepFrame + 2) % 4
    e.frame.frameIndex = 9 + [0, 1, 0, 2][e.frame.stepFrame]
  }
  assertKitchenTrace(trace, 'game', contract, stairs)
})
test('003 waits for actual hall-to-kitchen handoff; arrival/control alone is insufficient', () => {
  const state = {
    scene: 's003',
    control: true,
    persistent: { e56: { state: 0 }, e19: { state: 2 } },
  }
  assert.equal(kitchenHandoffReady({ final: state }), true)
  for (const s of [
    { ...state, persistent: { e56: { state: 2 }, e19: { state: 0 } } },
    { ...state, persistent: { e56: { state: 2 }, e19: { state: 2 } } },
    { ...state, scene: 's001' },
    { ...state, control: false },
  ])
    assert.equal(kitchenHandoffReady({ final: s }), false)
})
test('003 rejects replay, missing/reordered row, wrong speaker and premature late shout207', () => {
  for (const corrupt of [
    (trace) =>
      trace.pages.push({ ...trace.pages[0], page: { ...trace.pages[0].page, instance: 999 } }),
    (trace) => trace.pages.splice(1, 1),
    (trace) => {
      trace.pages[0].page.title = 'wrong'
    },
    (trace) => {
      trace.pages[0].page.lines = ['late shout207']
    },
  ]) {
    const { trace, contract } = fixture()
    corrupt(trace)
    assert.throws(() => assertKitchenDialogue(trace, 'game', contract))
  }
})
test('003 controls alone do not finish before both kitchen actors and aunt handoff are painted', () => {
  const { trace } = fixture()
  assert.equal(kitchenEndPresented(trace), true)
  for (const corrupt of [
    (f) => {
      f.control = false
    },
    (f) => {
      f.actors.e20.visible = false
    },
    (f) => {
      f.persistent.e56.state = 2
    },
    (f) => {
      f.scene = 's003'
    },
  ]) {
    const final = structuredClone(trace.final)
    corrupt(final)
    assert.equal(kitchenEndPresented({ final }), false)
  }
})
test('003 actual save contract refuses fake ready placeholder, any pickup, inventory or reward changes', () => {
  const ready = {
    kind: 'stages',
    stages: [
      {
        body: [
          { kind: 'dialog', cue: { rows: [{ text: 'dlg.141' }, { text: 'dlg.142' }] } },
          { kind: 'setActorSprite', actor: 'li-xiaoyao', sprite: 'sprite-208' },
          { kind: 'setEntityState', target: { scene: 's001', entity: 'e20' }, state: 0 },
        ],
      },
    ],
  }
  const contract = {
    scenes: {
      s001: {
        entities: [
          {
            id: 'e19',
            behaviors: {
              trigger: {
                serve: {
                  flow: {
                    kind: 'stages',
                    stages: [
                      {
                        body: [
                          {
                            kind: 'dialog',
                            cue: { rows: [{ text: 'dlg.126' }, { text: 'dlg.127' }] },
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
          { id: 'e20', behaviors: { trigger: { ready: { flow: ready } } } },
        ],
      },
    },
  }
  const payload = {
    version: 9,
    contentVersion: 21,
    position: { sceneId: 's001' },
    world: {
      money: 500,
      inventory: [],
      script: {
        flags: {},
        vars: {},
        entityState: {
          s001: { e19: 2, e20: 1, e24: 2, e25: 2, e26: 2 },
          s003: { e56: 0, e59: 0, e60: 0, e61: 0 },
        },
        behaviors: {
          entities: {
            s001: {
              e19: { trigger: { selection: { kind: 'use', value: 'serve' } } },
              e20: { trigger: { selection: { kind: 'use', value: 'ready' } } },
            },
          },
        },
      },
    },
  }
  const predecessor = { world: { inventory: [], script: { flags: {}, vars: {} } } }
  assertKitchenEndPayload(payload, 'reforge', predecessor, contract)
  for (const corrupt of [
    (p) => {
      p.world.money = 499
    },
    (p) => {
      p.world.inventory = [272]
    },
    (p) => {
      p.world.script.entityState.s001.e20 = 0
    },
    (p) => {
      p.world.script.behaviors.entities.s001.e20.trigger.cursor = { at: { kind: 'completed' } }
    },
  ]) {
    const p = structuredClone(payload)
    corrupt(p)
    assert.throws(() => assertKitchenEndPayload(p, 'reforge', predecessor, contract))
  }
  const fake = structuredClone(contract)
  fake.scenes.s001.entities[1].behaviors.trigger.ready.flow.stages[0].body = []
  assert.throws(() => assertKitchenEndPayload(payload, 'reforge', predecessor, fake), /placeholder/)
})
