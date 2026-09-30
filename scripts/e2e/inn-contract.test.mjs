import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { sha256 } from './browser-journey.mjs'
import {
  assertInnChoreography,
  assertInnDialogueHolds,
  assertInnEvidence,
  INN_ROWS,
  innArguments,
  TRIO,
  validatePredecessor,
} from './inn-contract.mjs'
import { installInnObserver } from './inn-observer.mjs'
import { planInnRoute } from './inn-route.mjs'
import { INN_TRACE_TARGETS, instrumentInnTrace } from './inn-trace-plugin.mjs'

const observer = () => {
  const host = {}
  new Function('globalThis', 'performance', `(${installInnObserver.toString()})()`)(host, {
    now: () => 1,
  })
  return host
}
const state = (position = [0, 0, 0]) => ({
  scene: 's003',
  actors: { e59: { position, visible: true, facing: 'up' } },
  money: 0,
  control: false,
  roomActors: [],
})
test('002 inputs require explicit authentic engine predecessors and one browser mode', () => {
  assert.throws(() => innArguments([]), /required --from/)
  assert.throws(() => innArguments(['--from', 'x', '--headless', '--headed']), /one browser mode/)
  assert.throws(() => innArguments(['--game-report', 'x'], true), /required --reforge-report/)
  assert.throws(() => innArguments(['--scene', 's003']), /unknown argument/)
})
test('failed predecessor, changed bytes and other fragment cannot become 002 admission', () => {
  const p = {
      format: 'type-pal-save',
      gs: {
        wNumScene: 2,
        party: { x: 1344, y: 288, facing: 'down' },
        dwCash: 0,
        partyMembers: [0],
      },
    },
    bytes = JSON.stringify(p)
  const r = {
    status: 'passed',
    fragment: '001',
    revision: 'a'.repeat(40),
    checkpoint: { path: '001.end.save.json', sha256: sha256(bytes) },
  }
  assert.equal(validatePredecessor(r, p, 'game', bytes).sha256, sha256(bytes))
  assert.throws(
    () => validatePredecessor({ ...r, status: 'failed' }, p, 'game', bytes),
    /did not pass/,
  )
  assert.throws(() => validatePredecessor(r, p, 'game', `${bytes} `), /bytes differ/)
  assert.throws(
    () => validatePredecessor({ ...r, fragment: '002' }, p, 'game', bytes),
    /wrong predecessor/,
  )
  assert.throws(() => validatePredecessor(r, { ...p, gs: { ...p.gs, dwCash: 500 } }, 'game', bytes))
})
test('002 real module AST write census retains all 001 anchors and adds normal input', () => {
  for (const file of INN_TRACE_TARGETS) {
    const code = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'),
      result = instrumentInnTrace(code, file)
    assert(result.code.length > code.length)
  }
  const file = 'packages/game/src/core/scene-system.ts',
    code = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
  assert.throws(
    () =>
      instrumentInnTrace(code.replace('function tickSceneInput(', 'function changedInput('), file),
    /anchor changed/,
  )
  const barrierFile = 'packages/reforge/src/script-world.ts',
    barrierCode = readFileSync(new URL(`../../${barrierFile}`, import.meta.url), 'utf8')
  assert.throws(
    () =>
      instrumentInnTrace(
        barrierCode.replace('requestSaveBarrier():', 'renamedBarrier():'),
        barrierFile,
      ),
    /anchor changed/,
  )
  assert.throws(
    () => instrumentInnTrace('', 'other/script-world.ts'),
    /unexpected inn trace source/,
  )
})

function actualFunction(code, name) {
  const ast = ts.createSourceFile('real.ts', code, ts.ScriptTarget.Latest, true)
  const declarations = ast.statements.filter(
    (n) => ts.isFunctionDeclaration(n) && n.name?.text === name,
  )
  assert.equal(declarations.length, 1)
  return ts.transpile(declarations[0].getText(ast).replace(/^export /, ''), {
    target: ts.ScriptTarget.ES2022,
  })
}
test('new real blocker-push wrapper preserves actual return, world writes and thrown identity', () => {
  const file = 'packages/game/src/core/scene-system.ts',
    raw = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'),
    transformed = instrumentInnTrace(raw, file).code
  const compile = (code, host, walkable) =>
    new Function(
      'globalThis',
      'isWalkable',
      'FACING_TO_DIR_NUM',
      'dirNumDelta',
      'PARTYOFFSET_X',
      'PARTYOFFSET_Y',
      `${actualFunction(code, 'pushPartyAwayFromBlockingNpcs')}\nreturn pushPartyAwayFromBlockingNpcs;`,
    )(host, walkable, { up: 2 }, () => ({ dx: 16, dy: 8 }), 160, 112)
  const gs = {
      party: { x: 400, y: 500 },
      npcs: [{ id: 59, spriteNum: 207, x: 400, y: 500, sState: 2, facing: 'up' }],
    },
    plain = structuredClone(gs),
    samples = []
  const host = {
    __innGame: (s, source) => samples.push({ source, position: [s.party.x, s.party.y] }),
  }
  assert.equal(
    compile(transformed, host, () => true)(gs, {}),
    compile(raw, {}, () => true)(plain, {}),
  )
  assert.deepEqual(gs, plain)
  assert.deepEqual(
    samples.map((s) => s.source),
    ['before:pushPartyAwayFromBlockingNpcs', 'commit:pushPartyAwayFromBlockingNpcs'],
  )
  assert.deepEqual(
    samples.map((s) => s.position),
    [
      [400, 500],
      [416, 508],
    ],
  )
  const error = new Error('actual tile reader')
  assert.throws(
    () =>
      compile(transformed, host, () => {
        throw error
      })({ ...structuredClone(plain), party: { x: 400, y: 500 } }, {}),
    (e) => e === error,
  )
})

const fixtureContract = {
  hashes: {},
  locale: { 'speaker.fixture': '苗人头领' },
  rows: INN_ROWS.map((id) => ({ id: `dlg.${id}`, text: `row ${id}`, speaker: '苗人头领' })),
}
function evidenceFixture(engine = 'reforge') {
  const events = [],
    pages = [],
    timeline = [],
    previous = new Map()
  const add = (kind, value) => {
    const list = kind === 'page' ? pages : events
    const entry = {
      seq: list.length,
      order: timeline.length,
      sample: timeline.length,
      atMs: timeline.length * 100,
      ...value,
    }
    list.push(entry)
    timeline.push(entry)
    return entry
  }
  const actor = (id, position, visible, extra = {}) => {
    const value = { position, visible, facing: 'up', ...extra }
    const e = add('event', {
      kind: 'actor',
      scene: 's003',
      id,
      source: 'commit:actual-write',
      before: previous.get(id) ?? null,
      state: value,
    })
    previous.set(id, value)
    return e
  }
  const counterpart = (id, state) => {
    const value = { id, state, visible: state === 2 }
    const e = add('event', {
      kind: 'roomActor',
      id,
      source: 'commit:actual-write',
      before: previous.get(id) ?? null,
      state: value,
    })
    previous.set(id, value)
    return e
  }
  const displayed = (ids) =>
    add('page', {
      engine,
      page:
        ids === null
          ? null
          : engine === 'game'
            ? { lines: ids.map((id) => `row ${id}`), title: '苗人头领' }
            : { pageText: ids.map((id) => `row ${id}`).join('\n'), speaker: 'speaker.fixture' },
    })
  add('event', { kind: 'money', value: 0 })
  for (const id of TRIO) actor(id, [0, 0, 0], true)
  for (const id of ['e24', 'e25', 'e26']) counterpart(id, 0)
  for (const id of ['e54', 'e55', 'e73', 'e74'])
    actor(id, [0, 0, 0], true, {
      state: id === 'e54' || id === 'e55' ? 1 : 2,
      frame: 0,
      sprite: id === 'e54' || id === 'e73' ? 54 : 53,
    })
  for (const id of INN_ROWS) {
    displayed([id])
    if (id === 50) add('event', { kind: 'money', value: 500 })
    displayed(null)
    if (id === 30) for (const actorId of TRIO) actor(actorId, [1, 1, 0], true)
    if (id === 51) for (const actorId of TRIO) actor(actorId, [2, 2, 0], true)
  }
  for (const id of ['e54', 'e55', 'e73', 'e74'])
    actor(id, [0, 0, 0], id === 'e73' || id === 'e74', {
      state: id === 'e54' || id === 'e55' ? 0 : 1,
      frame: 1,
      sprite: id === 'e54' || id === 'e73' ? 54 : 53,
    })
  const endpoints =
    engine === 'game'
      ? [
          [1312, 1328],
          [1456, 1416],
          [1440, 1408],
        ]
      : [
          [124, 42, 0],
          [134, 43, 0],
          [133, 43, 0],
        ]
  for (const [index, id] of TRIO.entries()) {
    actor(id, [1, 1, 0], true)
    actor(id, endpoints[index], true)
    counterpart(`e${24 + index}`, 2)
    actor(id, endpoints[index], false)
  }
  return {
    trace: {
      events,
      pages,
      overflow: false,
      errors: [],
      final: { control: true, roomActors: ['e24', 'e25', 'e26'].map((id) => ({ id, state: 2 })) },
    },
    timeline,
    actor,
    displayed,
  }
}
function reindex(trace) {
  const timeline = [...trace.events, ...trace.pages].sort((a, b) => a.order - b.order)
  timeline.forEach((e, i) => {
    e.order = i
    e.atMs = i * 100
    e.sample = i
  })
  for (const list of [trace.events, trace.pages])
    list.forEach((e, i) => {
      e.seq = i
    })
}
test('complete rendered text, shared reward order and exact counterpart lifecycle pass on both engines', () => {
  for (const engine of ['game', 'reforge'])
    assert.equal(assertInnEvidence(evidenceFixture(engine).trace, engine, fixtureContract).rows, 20)
})
test('rendered cue replay, duplicate row and accumulated-page rollback cannot be ignored', () => {
  const replay = evidenceFixture()
  replay.displayed([32])
  assert.throws(
    () => assertInnEvidence(replay.trace, 'reforge', fixtureContract),
    /repeated\/replayed/,
  )
  const duplicate = evidenceFixture()
  duplicate.trace.pages[0].page.pageText += '\nrow 25'
  assert.throws(
    () => assertInnEvidence(duplicate.trace, 'reforge', fixtureContract),
    /duplicate line/,
  )
  const growth = evidenceFixture('game'),
    index = growth.trace.pages.findIndex((p) => p.page?.lines[0] === 'row 29')
  growth.trace.pages[index + 1].page = { lines: ['row 29', 'row 30'], title: '苗人头领' }
  growth.trace.pages[index + 2].page = { lines: ['row 29'], title: '苗人头领' }
  assert.throws(() => assertInnEvidence(growth.trace, 'game', fixtureContract), /rolled back/)
})
test('missing/extra rows and wrong actual rendered speaker fail rather than inferred text IDs passing', () => {
  for (const kind of ['missing', 'extra', 'speaker']) {
    const { trace } = evidenceFixture()
    if (kind === 'missing') trace.pages[0].page = null
    if (kind === 'extra') trace.pages[0].page.pageText = 'extra line'
    if (kind === 'speaker') trace.pages[0].page.speaker = '李逍遥'
    assert.throws(
      () => assertInnEvidence(trace, 'reforge', fixtureContract),
      /missing\/reordered|unexpected displayed|wrong speaker/,
    )
  }
})
test('money amount alone is insufficient: reward before thanks or after reward display fails', () => {
  for (const id of [49, 53]) {
    const { trace } = evidenceFixture(),
      cash = trace.events.find((e) => e.kind === 'money' && e.value === 500),
      page = trace.pages.find((p) => p.page?.pageText === `row ${id}`)
    cash.order = page.order - 0.5
    trace.events.sort((a, b) => a.order - b.order)
    reindex(trace)
    assert.throws(() => assertInnEvidence(trace, 'reforge', fixtureContract), /money not committed/)
  }
})
test('foreign counterpart, duplicate appearance or unassociated late room appearance fails', () => {
  for (const kind of ['foreign', 'repeat', 'late']) {
    const { trace } = evidenceFixture(),
      room = trace.events.find(
        (e) => e.kind === 'roomActor' && e.id === 'e24' && e.state.state === 2,
      )
    if (kind === 'foreign') room.id = 'e27'
    if (kind === 'repeat') room.state.state = 1
    if (kind === 'late') {
      const hide = trace.events.find(
        (e) => e.kind === 'actor' && e.id === 'e59' && !e.state.visible,
      )
      room.order = hide.order + 0.5
      trace.events.sort((a, b) => a.order - b.order)
      reindex(trace)
    }
    assert.throws(
      () => assertInnEvidence(trace, 'reforge', fixtureContract),
      /continuity|lifecycle|missing before/,
    )
  }
})
test('removing an actual motion commit fails even after sequences/global order are maliciously rebased', () => {
  const { trace } = evidenceFixture(),
    mid = trace.events.findIndex(
      (e) => e.kind === 'actor' && e.id === 'e59' && e.before && e.state.position[0] === 1,
    )
  trace.events.splice(mid, 1)
  assert.throws(() => assertInnEvidence(trace, 'reforge', fixtureContract), /event gap/)
  reindex(trace)
  assert.throws(() => assertInnEvidence(trace, 'reforge', fixtureContract), /lost actor continuity/)
})
test('sampler-labeled movement and out-of-order event/page interleave fail', () => {
  const { trace } = evidenceFixture(),
    move = trace.events.find(
      (e) => e.kind === 'actor' && e.id === 'e59' && e.before && e.state.position[0] === 1,
    )
  move.source = 'render:world'
  assert.throws(() => assertInnEvidence(trace, 'reforge', fixtureContract), /not an actual commit/)
  move.source = 'commit:actual-write'
  trace.pages[0].order++
  assert.throws(() => assertInnEvidence(trace, 'reforge', fixtureContract), /global order/)
})
test('normal reader holds require both visible stable participants and subsequent actual resumption', () => {
  const { trace } = evidenceFixture(),
    trio = TRIO.map((id) => ({ id, visible: true, position: [0, 0, 0] }))
  const holds = ['dlg.32', 'dlg.53'].map((cue) => ({
    cue,
    elapsedMs: 3001,
    start: { trio, dialogue: { phase: 'waiting-input', text: cue }, order: 15 },
    end: {
      trio: structuredClone(trio),
      dialogue: { phase: 'waiting-input', text: cue },
      order: 16,
    },
  }))
  assert.equal(assertInnDialogueHolds(trace, holds).status, 'passed')
  holds[1].end.trio[0].position[0] = 1
  assert.throws(() => assertInnDialogueHolds(trace, holds), /participants moved/)
  holds[1].end.trio = structuredClone(trio)
  holds[0].start.trio[0].visible = false
  assert.throws(() => assertInnDialogueHolds(trace, holds), /participant gone/)
})
test('choreography preserves prior start, leader pause, reward interlude and final resumption', () => {
  for (const engine of ['game', 'reforge'])
    assert.equal(
      assertInnChoreography(evidenceFixture(engine).trace, engine, fixtureContract).status,
      'passed',
    )
  for (const kind of ['early-hide', 'movement', 'no-interlude']) {
    const { trace } = evidenceFixture(),
      leader = trace.pages.find((p) => p.page?.pageText === 'row 32'),
      move = trace.events.find(
        (e) => e.kind === 'actor' && e.id === 'e59' && e.state.position[0] === 2,
      )
    if (kind === 'early-hide')
      trace.events.find(
        (e) => e.kind === 'actor' && e.id === 'e59' && e.state.position[0] === 1,
      ).state.visible = false
    if (kind === 'movement') {
      move.order = leader.order + 0.5
      trace.events.sort((a, b) => a.order - b.order)
    }
    if (kind === 'no-interlude') move.state.position = [1, 1, 0]
    assert.throws(
      () => assertInnChoreography(trace, 'reforge', fixtureContract),
      /still participating|moved during|reward interlude/,
    )
  }
})
test('sampling cannot pass as actual committed movement, and mid-sample round trips remain two writes', () => {
  const h = observer()
  h.__innPoint('before:move', state())
  h.__innPoint('commit:move', state([1, 0, 0]))
  h.__innPoint('commit:move', state())
  assert.equal(h.__readInnEvidence().events.filter((e) => e.kind === 'actor').length, 3)
  h.__innPoint('render:world', state([7, 0, 0]))
  assert.match(h.__readInnEvidence().errors[0], /unobserved committed move/)
})
test('inn DTOs detach source state and collector output; overflow rejects rather than truncates silently', () => {
  const h = observer(),
    s = state()
  h.__innPoint('commit:move', s)
  s.actors.e59.position[0] = 9
  const dto = h.__readInnEvidence()
  dto.events[1].state.position[0] = 11
  assert.equal(h.__readInnEvidence().events[1].state.position[0], 0)
  for (let i = 0; i < 6002; i++) h.__innPoint('commit:move', state([i, 0, 0]))
  assert.equal(h.__readInnEvidence().overflow, true)
})
test('normal route planner respects collision and body obstacles without writing map data', () => {
  const map = {
      version: 4,
      width: 4,
      height: 4,
      collision: Array.from({ length: 8 }, () => Array(4).fill(0)),
    },
    original = structuredClone(map)
  const path = planInnRoute(map, [4, 2], (c, r) => c === 3 && r === 2)
  assert.deepEqual(path, ['ArrowLeft'])
  assert.deepEqual(map, original)
  map.collision = map.collision.map((r) => r.map(() => 1))
  assert.throws(() => planInnRoute(map, [4, 2], (c, r) => c === 3 && r === 2), /no normal/)
})
