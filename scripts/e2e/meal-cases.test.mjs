import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import ts from 'typescript'
import { repoRoot, sha256 } from './browser-journey.mjs'
import { createLocalCapture } from './capture-local.mjs'
import { createEvidenceRecorder, evidenceObserverScript } from './evidence-recorder.mjs'
import {
  assertMealAttendantReturn,
  assertMealCaseReport,
  assertMealCollector,
  assertMealDialogue,
  assertMealDrive,
  assertMealHealth,
  assertMealPhase,
  assertMealSuite,
  MEAL_ROWS,
  mealArguments,
  mealCasePlan,
  mealPhaseWindow,
} from './meal-contract.mjs'
import { finalizeMealEvidence, mealRenderedConfirmation } from './meal-journey.mjs'
import { installMealObserver, readMealReforge } from './meal-observer.mjs'
import { instrumentMealTrace } from './meal-trace-plugin.mjs'
import { appendBounded } from './opening-policy.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'

const journeyArrow = (
  name,
  source = readFileSync(new URL('./meal-journey.mjs', import.meta.url), 'utf8'),
) => {
  const ast = ts.createSourceFile('meal-journey.mjs', source, ts.ScriptTarget.Latest, true)
  let arrow
  const walk = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) {
      assert.equal(arrow, undefined, `duplicate ${name}`)
      assert(ts.isArrowFunction(node.initializer))
      arrow = node.initializer
    }
    ts.forEachChild(node, walk)
  }
  walk(ast)
  assert(arrow, `missing ${name}`)
  return arrow.getText(ast)
}

test('004 defaults to uninterrupted story; explicit specialist cases cannot weaken full coverage', () => {
  assert.equal(mealArguments(['--from', 'genuine003']).case, 'story')
  const story = mealCasePlan('story'),
    items = mealCasePlan('items'),
    saves = mealCasePlan('saves')
  assert.equal(story.holdAunt, false)
  assert.equal(story.saveRestore, false)
  assert.equal(story.itemChecks, false)
  assert.equal(story.gift, true)
  assert.equal(items.itemChecks, true)
  assert.equal(items.gift, false)
  assert.equal(items.saveRestore, false)
  assert.equal(saves.itemChecks, false)
  assert.equal(saves.holdAunt, true)
  assert.equal(saves.saveRestore, true)
  assert.equal(saves.gift, true)
  for (const args of [
    ['--from', '003', '--case', 'all'],
    ['--from', '003', '--case', 'story', '--case', 'items'],
    ['--from', '003', '--expect-stationary-no-gift'],
    ['--game-report', 'g', '--reforge-report', 'r', '--case', 'story'],
  ])
    assert.throws(() => mealArguments(args, args.includes('--game-report')))
})

const receipt = (engine, caseName) => {
  const plan = mealCasePlan(caseName)
  const world =
    engine === 'game'
      ? {
          scene: 4,
          cash: 500,
          inventory: [],
          roles: { rgwSpriteNum: [2] },
          actors: [15, 16, 20, 62]
            .map((id) => ({ id, sState: 0 }))
            .concat({ id: 19, triggerLabel: 'L_741' }),
        }
      : {
          position: { sceneId: 's003' },
          world: {
            money: 500,
            inventory: [],
            party: [{ appearance: { spriteId: 'li-xiaoyao' } }],
            script: {
              entityState: { s001: { e15: 0, e16: 0, e20: 0 }, s003: { e62: 0 } },
              behaviors: {
                entities: {
                  s001: { e19: { trigger: { selection: { value: 'c8-74bc98f07f8e' } } } },
                },
              },
            },
          },
        }
  const carried = structuredClone(world)
  if (engine === 'game') carried.roles.rgwSpriteNum[0] = 208
  else carried.world.party[0].appearance.spriteId = 'sprite-208'
  const frame = { width: 320, height: 200, nonBlack: 40000, sha256: '1'.repeat(64) }
  const restored = (value) => ({
    endWorld: value,
    restoredWorld: structuredClone(value),
    endWorldHash: sha256(JSON.stringify(value)),
    restoredWorldHash: sha256(JSON.stringify(value)),
    endFrame: frame,
    restoredFrame: frame,
  })
  return {
    fragment: '004',
    engine,
    case: caseName,
    name: `${engine}-004-${caseName}`,
    scope: plan.scope,
    kind: 'verify',
    status: 'passed',
    sourceHashesStable: true,
    revision: 'a'.repeat(40),
    errors: [],
    warnings: [],
    predecessor: {
      report: `/${engine}/003/report.json`,
      revision: 'b'.repeat(40),
      sha256: 'c'.repeat(64),
    },
    core: {
      status: 'passed',
      rows: plan.rows.map((id) => `dlg.${id}`),
      sourceHashes: { 'source.ts': 'd'.repeat(64) },
    },
    route: { status: 'passed' },
    storyEndControl: true,
    checks: {
      pickup: 'passed',
      serve: 'passed',
      ...(plan.itemChecks
        ? { cancel: 'passed', invalidUse: 'passed' }
        : { gift: 'passed', end: 'passed' }),
      ...(plan.saveRestore ? { pose: 'passed', carryRestore: 'passed', endRestore: 'passed' } : {}),
    },
    contexts: Array.from({ length: plan.saveRestore ? 3 : 1 }, () => ({ initialDatabases: [] })),
    ...(plan.saveRestore
      ? {
          checkpoint: { path: '004.end.save.json', sha256: 'e'.repeat(64) },
          carryCheckpoint: { path: '004.carry.save.json', ...restored(carried) },
          ...restored(world),
          pickupPoseHold: { durationMs: 3100 },
        }
      : caseName === 'story'
        ? {
            storyEndControl: true,
            storyEndWorld: world,
            storyEndWorldHash: sha256(JSON.stringify(world)),
            endFrame: frame,
          }
        : { cancelUse: { dispatches: 0 }, invalidUse: { dispatches: 1 } }),
  }
}
test('004 suite requires six distinct current case receipts, not two story passed labels', () => {
  const reports = ['game', 'reforge'].flatMap((engine) =>
    ['story', 'items', 'saves'].map((c) => receipt(engine, c)),
  )
  assertMealSuite(reports)
  assert.throws(() => assertMealSuite(reports.filter((r) => r.case === 'story')), /six/)
  for (const corrupt of [
    (r) => {
      r[2] = structuredClone(r[0])
    },
    (r) => {
      delete r[0].case
    },
    (r) => {
      r[1].scope = r[0].scope
    },
    (r) => {
      r[1].checks.cancel = 'not-run'
    },
    (r) => {
      r[4].predecessor.sha256 = '2'.repeat(64)
    },
    (r) => {
      r[4].predecessor.report = '/other/003/report.json'
    },
    (r) => {
      r[4].core.sourceHashes['source.ts'] = '2'.repeat(64)
    },
    (r) => {
      r[4].revision = '2'.repeat(40)
    },
    (r) => {
      r[0].checkpoint = { path: '004.end.save.json' }
    },
    (r) => {
      r[5].restoredWorld.world.money = 2
    },
    (r) => {
      r[5].core.rows = MEAL_ROWS.slice(0, 15).map((id) => `dlg.${id}`)
    },
    (r) => {
      r[0].errors = ['unobserved move']
    },
  ]) {
    const bad = structuredClone(reports)
    corrupt(bad)
    assert.throws(() => assertMealSuite(bad))
  }
  assertMealCaseReport(receipt('game', 'story'))
})

test('004 retains browser advisories verbatim without confusing them with engine errors or static diagnostics', () => {
  const report = receipt('reforge', 'story')
  report.warnings = [
    'Failed to load resource: the server responded with a status of 404 (Not Found)',
    'Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true. See: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently',
  ]
  const before = structuredClone(report)
  assertMealCaseReport(report)
  assert.deepEqual(report, before, 'receipt validator must not erase or rewrite advisories')
  for (const warnings of [undefined, {}, 'Canvas2D advisory'])
    assert.throws(() => assertMealCaseReport({ ...report, warnings }), /warnings.*array/)
  assert.throws(() =>
    assertMealCaseReport({ ...report, errors: ['[script] actual engine failure'] }),
  )
  assert.throws(() => assertMealCaseReport({ ...report, scope: 'unverified scope' }), /scope/)
})

test('004 drive DTO never clones the actor tape and cannot conceal collector errors', () => {
  const host = {},
    inputs = new Map()
  let ms = 0
  host.addEventListener = (type, listener) => inputs.set(type, listener)
  new Function(
    'globalThis',
    'performance',
    evidenceObserverScript(installMealObserver, createScriptCausalObserver),
  )(host, {
    now: () => ++ms,
  })
  const state = {
    scene: 's001',
    actors: { party: { position: [0, 0] }, e19: { position: [1, 0], facing: 'down', frame: 0 } },
    persistent: {},
    money: 500,
    inventory: [],
  }
  host.__mealPoint('commit:input', state)
  host.__mealMenu('reforge', { active: true })
  const order = host.__readMealDrive().order
  host.__openingCauseDialog('open', null, { phase: 'typing' })
  host.__mealRendered({ phase: 'waiting-input', pageText: 'actual', pageTextIds: ['dlg.141'] })
  const phaseMarker = host.__mealSetInputPhase('pickup')
  inputs.get('keydown')({ key: 'Enter', repeat: false })
  inputs.get('keyup')({ key: 'Enter', repeat: false })
  const dto = host.__readMealDrive(order)
  assertMealDrive(dto)
  assert.equal(dto.pages.length, 1)
  assert.equal(dto.latestMenu.active, true)
  assert.equal(dto.aunt.facing, 'down')
  assert.equal('events' in dto, false)
  assert.equal('final' in dto, false)
  dto.latestMenu.active = false
  assert.equal(host.__readMealDrive().latestMenu.active, true)
  const tape = host.__readMealEvidence()
  assert.deepEqual(
    tape.phases.map((p) => [p.source, p.phase, p.scene, p.sceneVisit]),
    [['executor:phase', 'pickup', 's001', 1]],
  )
  assert(tape.phases[0].order < tape.inputs[0].order, 'phase must precede the actual key event')
  assert.equal(phaseMarker.order, tape.phases[0].order, 'caller uses the atomic marker order')
  assert.deepEqual(
    tape.inputs.map((i) => [i.type, i.key, i.phase]),
    [
      ['keydown', 'Enter', 'pickup'],
      ['keyup', 'Enter', 'pickup'],
    ],
  )
  assert(tape.inputs[1].atMs > tape.inputs[0].atMs)
  assertMealCollector(tape)
  const missing = structuredClone(tape)
  delete missing.inputs
  assert.throws(() => assertMealCollector(missing), /missing current/)
  const noPhase = structuredClone(tape)
  noPhase.phases = []
  assert.throws(() => assertMealCollector(noPhase), /order gap/)
  host.__mealError('actual collector failure')
  assert.throws(() => assertMealDrive(host.__readMealDrive(order)), /observer/)
  const bad = { ...dto, overflow: true, errors: [] }
  assert.throws(() => assertMealDrive(bad), /overflow/)
})
test('004 lightweight snapshot reads menu without full trace clone', () => {
  const window = {
    __readMealEvidence: () => {
      throw new Error('hot path full trace')
    },
    __readMealDrive: () => ({ latestMenu: { active: false } }),
  }
  assert.equal(
    new Function('window', `return (${readMealReforge.toString()})()`)(window).menuView.active,
    false,
  )
  const source = readFileSync(new URL('./meal-journey.mjs', import.meta.url), 'utf8')
  assert(!source.includes('options.baseline'))
})

test('004 complete return uses terminal plus actual draw events, retaining all eight steps and frames', async () => {
  for (const engine of ['game', 'reforge']) {
    const host = {},
      causes = []
    let emit,
      timeout,
      cleared = 0,
      settled = false
    new Function(
      'globalThis',
      'causal',
      'recorder',
      'setTimeout',
      'clearTimeout',
      `(${installMealObserver})(causal, recorder)`,
    )(
      host,
      ({ append }) => {
        emit = (value) =>
          append(causes, { kind: 'cause', engine, scene: 's001', sceneVisit: 1, ...value }, 100)
        return { read: () => structuredClone(causes), clock: () => null }
      },
      createEvidenceRecorder,
      (callback) => {
        timeout = callback
        return 1
      },
      () => cleared++,
    )
    const point = (col) => (engine === 'game' ? [(col - 24) * 16, (col + 24) * 8] : [col, 24, 0])
    const actor = { position: point(109), facing: 'left', visible: true, autoIp: 541 }
    const state = {
      scene: 's001',
      actors: { e26: actor },
      control: true,
      persistent: {},
      money: 0,
      inventory: [],
    }
    const draw = (frame) => {
      state.renderEvidence = {
        actors: { e26: { position: actor.position, facing: 'left', frame } },
      }
      host.__mealPoint('render:world', state)
    }
    host.__mealPoint('commit:input', state)
    emit({
      phase: 'command',
      channel: 'trigger',
      occurrence: {
        command:
          engine === 'game'
            ? { opcode: 0x24, operands: [27, 541, 0] }
            : {
                command: {
                  kind: 'selectEntityBehavior',
                  target: { entity: 'e26' },
                  channel: 'auto',
                  selection: { kind: 'use', value: 'legacy-003' },
                },
              },
      },
    })
    if (engine === 'reforge')
      emit({
        phase: 'run-started',
        runId: 40,
        author: { channel: 'auto', entity: 'e26', behavior: 'legacy-003' },
      })
    const request = {
      engine,
      scene: 's001',
      id: 'e26',
      position: point(107),
      facing: 'left',
      frame: 3,
      autoIp: 543,
      behavior: 'legacy-003',
    }
    const waiting = host.__mealWaitActorRender(request).then((value) => {
      settled = true
      return value
    })
    for (let index = 0; index < 8; index++) {
      actor.position = point(109 - (index + 1) / 4)
      host.__mealPoint('commit:move', state)
      draw([4, 3, 5, 3][index % 4])
    }
    await Promise.resolve()
    assert.equal(settled, false, 'position and frame alone are not completion')
    actor.autoIp = 543
    emit(
      engine === 'game'
        ? { phase: 'auto-step', actor: 26, after: { ip: 543 } }
        : {
            phase: 'run-ended',
            runId: 40,
            aborted: false,
            resolved: true,
            occurrence: { command: { kind: 'finishStep', next: { kind: 'complete' } } },
            world: {
              script: {
                behaviors: {
                  entities: {
                    s001: {
                      e26: {
                        auto: { cursor: { behavior: 'legacy-003', at: { kind: 'completed' } } },
                      },
                    },
                  },
                },
              },
            },
          },
    )
    host.__mealPoint('commit:terminal', state)
    await Promise.resolve()
    assert.equal(settled, false, 'terminal commit is not a rendered final pose')
    draw(4)
    await Promise.resolve()
    assert.equal(settled, false, 'wrong final frame must not resolve')
    draw(3)
    const receipt = await waiting
    assert.equal(cleared, 1)
    host.__mealSetInputPhase('guest-room-exit')
    const trace = host.__readMealEvidence()
    assert.equal(assertMealAttendantReturn(trace, engine, receipt).steps, 8)
    for (const corrupt of [
      (raw) => {
        raw.events.splice(
          raw.events.findIndex((event) => event.kind === 'actor' && event.before),
          1,
        )
      },
      (raw) => {
        raw.events.find((event) => event.kind === 'actor-render').state.frame = 0
      },
      (raw) => {
        raw.phases[0].order = receipt.order - 1
      },
      (raw) => {
        raw.causes.at(-1).sceneVisit++
      },
      (raw) => {
        raw.events.at(-1).state.frame = 4
      },
      (raw) => {
        raw.events.find((event) => event.kind === 'control').state = false
      },
      ...(engine === 'reforge'
        ? [
            (raw) => {
              raw.causes.at(-1).occurrence.command = { kind: 'wait', ms: 140 }
            },
            (raw) => {
              raw.causes.at(-1).world.script.behaviors.entities.s001.e26.auto.cursor.at = {
                kind: 'stage',
                stage: 'routine',
              }
            },
          ]
        : []),
    ]) {
      const wrong = structuredClone(trace)
      corrupt(wrong)
      assert.throws(() => assertMealAttendantReturn(wrong, engine, receipt))
    }
    assert.deepEqual(
      await host.__mealWaitActorRender(request),
      receipt,
      'late registration consumes the same actual draw',
    )
    host.__e2eSceneBoundary({ scene: 's003' })
    const stale = host.__mealWaitActorRender(request)
    timeout()
    await assert.rejects(stale, /did not complete/)
    host.__mealError('actual collector failure')
    await assert.rejects(host.__mealWaitActorRender(request), /observer failed/)
  }
})

test('004 status and phase projections preserve real collector obligations without reading the archive', () => {
  const host = {}
  new Function('globalThis', 'causal', 'recorder', `(${installMealObserver})(causal, recorder)`)(
    host,
    () => ({ read: () => assert.fail('causal archive read'), clock: () => null }),
    (options) => ({
      ...createEvidenceRecorder(options),
      resources: () => assert.fail('resource archive read'),
    }),
  )
  const state = {
    scene: 's001',
    actors: { party: { position: [0, 0] }, e20: { position: [1, 0], visible: true } },
    persistent: { e62: { trigger: 'L_719', resume: null } },
    money: 500,
    inventory: [],
  }
  host.__mealPoint('commit:input', state)
  const start = host.__mealSetInputPhase('pickup'),
    shown = new Map([['dlg.142', start.order]])
  state.actors.e20.visible = false
  host.__mealPoint('commit:applyRawOpcode', state)
  host.__mealPartyFrame('game', { sprite: 208 })
  host.__mealFinishPhase('pickup', start.order)
  const read = host.__readMealPhaseEvidence(),
    check = (dto) => {
      assertMealHealth(dto)
      const window = mealPhaseWindow(dto, 'game', 'pickup')
      assertMealPhase(window.trace, 'game', shown, 'pickup', window.startOrder)
    }
  check(read)
  assert.equal('causes' in read, false)
  assert.equal('worldRenders' in read, false)
  const status = host.__readMealStatus()
  assertMealHealth(status)
  assert.equal(status.taoist.trigger, 'L_719')
  status.taoist.trigger = 'wrong'
  assert.equal(host.__readMealStatus().taoist.trigger, 'L_719')
  for (const mutate of [
    (dto) => {
      dto.events = dto.events.filter((event) => event.id !== 'e20')
    },
    (dto) => {
      dto.frames.length = 0
    },
    (dto) => {
      dto.phases.at(-1).startOrder++
    },
    (dto) => {
      dto.overflow = true
    },
    (dto) => {
      dto.errors.push('broken observer')
    },
  ]) {
    const wrong = structuredClone(read)
    mutate(wrong)
    assert.throws(() => check(wrong))
  }
  read.events.length = 0
  check(host.__readMealPhaseEvidence())
  host.__mealError('real failure')
  assert.throws(() => assertMealHealth(host.__readMealStatus()), /observer/)
  assert.throws(() => check(host.__readMealPhaseEvidence()), /observer/)
})

test('004 pickup waits for the actual native cooking command, its own auto call and a later draw', async (t) => {
  const require = createRequire(new URL('../../packages/reforge/package.json', import.meta.url)),
    { createServer } = await import(require.resolve('vite')),
    cacheDir = await mkdtemp(join(tmpdir(), 'pal-pickup-return-')),
    server = await createServer({
      configFile: false,
      cacheDir,
      root: repoRoot,
      optimizeDeps: { noDiscovery: true, include: [] },
      plugins: [
        {
          name: 'native-meal-test',
          enforce: 'pre',
          transform(source, id) {
            const file = 'packages/game/src/core/event-system.ts'
            return id.endsWith(`/${file}`)
              ? { code: instrumentMealTrace(source, file).code, map: null }
              : null
          },
        },
      ],
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      appType: 'custom',
    }),
    api = await server.ssrLoadModule('/packages/game/src/core/event-system.ts'),
    { createInitialGameState } = await server.ssrLoadModule(
      '/packages/game/src/core/game-state.ts',
    ),
    original = JSON.parse(
      readFileSync(new URL('../../data/extracted/events/all.json', import.meta.url)),
    ).segments[0].commands,
    old = new Map()
  t.after(async () => {
    api.setGlobalEvents([])
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
    for (const [key, descriptor] of old) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  for (const defect of [null, 'wrong-setter', 'missing-command', 'wrong-owner', 'stale-draw']) {
    const host = {}
    let timeout,
      settled = false
    new Function(
      'globalThis',
      'setTimeout',
      'clearTimeout',
      evidenceObserverScript(installMealObserver, createScriptCausalObserver),
    )(
      host,
      (callback) => {
        timeout = callback
        return 1
      },
      () => {},
    )
    if (defect === 'missing-command' || defect === 'wrong-owner') {
      const record = host.__openingCauseGame
      host.__openingCauseGame = (gs, phase, cursor, data) => {
        if (defect === 'missing-command' && phase === 'command') return
        record(
          gs,
          phase,
          defect === 'wrong-owner' && phase === 'auto-step' ? { ...cursor } : cursor,
          data,
        )
      }
    }
    for (const [key, value] of Object.entries(host)) {
      if (!old.has(key)) old.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
      globalThis[key] = value
    }
    const gs = createInitialGameState({ x: 640, y: 1136, facing: 'right' }),
      npc = {
        id: 19,
        x: 704,
        y: 1072,
        spriteNum: 21,
        sState: 2,
        facing: 'down',
        scriptedFrame: 0,
        nSpriteFrames: 3,
        autoCursor: { ip: 35631 },
      },
      commands = structuredClone(original)
    gs.wNumScene = 2
    gs.npcs = [npc]
    gs.allEventObjects = JSON.parse(
      readFileSync(new URL('../../data/extracted/data/event-objects.json', import.meta.url)),
    ).eventObjects.map((object) => ({
      ...object,
      facing: ['down', 'left', 'up', 'right'][object.direction],
      scriptedFrame: object.currentFrameNum,
    }))
    gs.allEventObjects[19] = npc
    if (defect === 'wrong-setter') commands[35630].operands[0] = 0
    api.setGlobalEvents(commands)
    const draw = () =>
        host.__mealGame(gs, 'render:world', {
          actors: {
            e19: {
              position: [npc.x, npc.y],
              facing: npc.facing,
              frame: npc.facing === 'up' ? 6 : 0,
            },
          },
        }),
      tick = () => api.tickAutoScripts(gs)
    host.__mealGame(gs, 'commit:pickup')
    const marker = host.__mealSetInputPhase('pickup')
    const request = {
      engine: 'game',
      scene: 's001',
      id: 'e19',
      position: [704, 1072],
      facing: 'up',
      frame: 6,
      autoIp: 35631,
      afterOrder: marker.order,
      sourceCall: { ip: 35630, command: original[35630] },
    }
    tick()
    draw()
    assert.deepEqual(host.__readMealEvidence().errors, [], defect)
    const waiting = host.__mealWaitActorRender(request).then((value) => {
      settled = true
      return value
    })
    await Promise.resolve()
    assert.equal(settled, false, 'reset alone cannot complete the pose')
    tick()
    if (defect !== 'stale-draw') draw()
    await Promise.resolve()
    if (defect) {
      timeout()
      await assert.rejects(waiting, /did not complete/)
    } else {
      const receipt = await waiting
      assert(receipt.sourceOrder > marker.order)
      assert(receipt.terminalOrder > receipt.sourceOrder)
      assert(receipt.order > receipt.terminalOrder)
      assert.equal(npc.facing, 'up')
      assert.deepEqual(host.__readMealEvidence().errors, [])
      const cutoff = host.__mealSetInputPhase('carry-save'),
        stale = host.__mealWaitActorRender({ ...request, afterOrder: cutoff.order })
      timeout()
      await assert.rejects(stale, /did not complete/)
      const unbound = host.__mealWaitActorRender({ ...request, afterOrder: undefined })
      timeout()
      await assert.rejects(unbound, /did not complete/)
    }
  }
})

test('004 finalization never repeats successful export or masks the primary failure with diagnostic errors', async () => {
  const primary = new Error('final archive failed'),
    secondary = [],
    calls = []
  const options = {
    diagnose: async () => {
      calls.push('trace')
      throw new Error('diagnostic trace failed')
    },
    verifySources: async () => {
      calls.push('sources')
      throw new Error('sources changed')
    },
    secondary: (value) => secondary.push(value),
  }
  await assert.rejects(
    async () => {
      try {
        throw primary
      } finally {
        await finalizeMealEvidence({ ...options, failure: primary })
      }
    },
    (error) => error === primary,
  )
  assert.deepEqual(calls, ['trace', 'sources'])
  assert.deepEqual(
    secondary.map((value) => value.label),
    ['failure trace', 'source stability'],
  )
  calls.length = 0
  await assert.rejects(finalizeMealEvidence(options), /sources changed/)
  assert.deepEqual(calls, ['sources'])
  calls.length = 0
  await finalizeMealEvidence({ ...options, verifySources: async () => calls.push('sources') })
  assert.deepEqual(calls, ['sources'])
  const unfinished = { core: { status: 'running' }, contextTraces: [] }
  const finish = new Function('saveTrace', 'report', `return ${journeyArrow('finishCase')}`)(
    async () => {
      throw primary
    },
    unfinished,
  )
  await assert.rejects(finish('004-items'), (error) => error === primary)
  assert.equal(unfinished.core.status, 'running')
  assert.deepEqual(unfinished.contextTraces, [])
})

test('004 confirmation rejects unrendered/stale/typing pages rather than speeding through text', () => {
  const dialog = {
    dialogueId: '__script',
    cueIndex: 0,
    pageIndex: 0,
    pageStartedAtMs: 123,
    phase: 'waiting-input',
  }
  const trace = { pages: [{ page: dialog }] }
  assert.equal(mealRenderedConfirmation(dialog, trace, 'reforge'), true)
  assert.equal(mealRenderedConfirmation(dialog, { pages: [] }, 'reforge'), false)
  assert.equal(
    mealRenderedConfirmation(
      dialog,
      { pages: [{ page: { ...dialog, pageStartedAtMs: 122 } }] },
      'reforge',
    ),
    false,
  )
  assert.equal(
    mealRenderedConfirmation(
      dialog,
      { pages: [{ page: { ...dialog, phase: 'typing' } }] },
      'reforge',
    ),
    false,
  )
  assert.equal(
    mealRenderedConfirmation(
      { text: 'new', title: 'aunt' },
      { pages: [{ page: { lines: ['old'], title: 'aunt' } }] },
      'game',
    ),
    false,
  )
  // Production game narration has optional titleText, while its actual rendered DTO uses null.
  assert.equal(
    mealRenderedConfirmation(
      { text: 'actual narration', title: undefined },
      { pages: [{ page: { lines: ['actual narration'], title: null } }] },
      'game',
    ),
    true,
  )
})

test('004 actual dither output is sampled only after successful pixels, with strict source anchors', () => {
  const file = 'packages/reforge/src/main.ts',
    source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
  const transformed = instrumentMealTrace(source, file)
  assert.equal(transformed.anchors.actualReforgeDitherOutput, 1)
  for (const [change, failure] of [
    [
      (text) =>
        text.replace(
          'ctx.putImageData(dither.output, 0, 0)',
          'ctx.putImageData(dither.target, 0, 0)',
        ),
      /dither actual output anchor/,
    ],
    [
      (text) => text.replace('Math.floor(pr * DITHER_TOTAL_STEPS)', 'Math.floor(pr * 72)'),
      /dither step anchor/,
    ],
    [
      (text) => text.replace('function render(): void {', 'function changedRender(): void {'),
      /trace anchors changed: packages\/reforge\/src\/main\.ts/,
    ],
  ])
    assert.throws(() => instrumentMealTrace(change(source), file), failure)
  const ast = ts.createSourceFile(file, transformed.code, ts.ScriptTarget.Latest, true)
  let output
  const walk = (node) => {
    if (
      ts.isIfStatement(node) &&
      node.expression.getText(ast) === 'dither.output' &&
      node.thenStatement.getText(ast) === 'ctx.putImageData(dither.output, 0, 0)'
    )
      output = node
    ts.forEachChild(node, walk)
  }
  walk(ast)
  const next = output.parent.statements[output.parent.statements.indexOf(output) + 1]
  const calls = [],
    dither = { output: {}, prepareMs: 33, startedAt: 100, durationMs: 720 }
  const call = new Function(
    'ctx',
    'dither',
    'globalThis',
    'pr',
    'step',
    'isZeroFrame',
    `${output.getText(ast)}; ${next.getText(ast)}`,
  )
  call(
    { putImageData: () => calls.push('pixels') },
    dither,
    { __mealDither: (value) => calls.push(value) },
    0,
    0,
    true,
  )
  assert.equal(calls[0], 'pixels')
  assert.equal(calls[1].prepareMs, 33)
  assert.throws(
    () =>
      call(
        {
          putImageData: () => {
            throw new Error('actual render threw')
          },
        },
        dither,
        { __mealDither: () => calls.push('false success') },
        0,
        0,
        true,
      ),
    /actual render threw/,
  )
  assert.equal(calls.length, 2)
})

test('004 dither evidence retains zero/final steps and preparation without per-frame unbounded tape', () => {
  const host = {}
  let ms = 0
  new Function(
    'globalThis',
    'performance',
    evidenceObserverScript(installMealObserver, createScriptCausalObserver),
  )(host, {
    now: () => ++ms,
  })
  const value = {
    pr: 0,
    step: 0,
    prepareMs: 33,
    startedAt: 100,
    durationMs: 720,
    isZeroFrame: true,
  }
  host.__mealDither(value)
  for (let i = 0; i < 2000; i++) host.__mealDither(value)
  host.__mealDither({ ...value, pr: 1, step: 72, isZeroFrame: false })
  const tape = host.__readMealEvidence()
  assert.equal(tape.dithers.length, 2)
  assert.deepEqual(
    tape.dithers.map((d) => d.value.step),
    [0, 72],
  )
  assert.equal(tape.dithers[0].value.prepareMs, 33)
  assert.equal(tape.overflow, false)
  host.__mealDither({ ...value, step: 1 })
  assert.throws(() => assertMealDrive(host.__readMealDrive()), /observer/)
})

test('004 actual dialogue controller proves completion from bounded pages without exporting the archive', async () => {
  const page = {
    seq: 0,
    order: 0,
    atMs: 1,
    engine: 'game',
    page: { instance: 1, lines: ['unavailable'], title: null },
  }
  const tape = {
    worldRenders: [],
    events: [],
    frames: [],
    menus: [],
    dispatches: [],
    saveCaptures: [],
    saveCompletions: [],
    inputs: [],
    dithers: [],
    pages: [page],
    errors: [],
    overflow: false,
  }
  let completed = false,
    fullReads = 0,
    keys = 0
  const fn = new Function(
    'assert',
    'contract',
    'health',
    'snapshot',
    'inScene',
    'drive',
    'assertMealDialogue',
    'engine',
    'ready',
    'evidence',
    'assertMealCollector',
    'phaseOrder',
    'report',
    'mealRenderedConfirmation',
    'phase',
    'press',
    'until',
    'page',
    'out',
    'resolve',
    'contextLabel',
    'mediaCapture',
    `return ${journeyArrow('finishDialogue')}`,
  )(
    assert,
    { locale: { 'dlg.12538': 'unavailable' }, rows: [] },
    () => {},
    async () => ({
      cash: 500,
      dialog: completed
        ? null
        : { phase: 'waiting-end-key', text: 'unavailable', title: undefined },
    }),
    () => true,
    async () => ({ pages: [page] }),
    assertMealDialogue,
    'game',
    () => completed,
    async () => {
      assert(completed, 'full trace in confirmation hot path')
      fullReads++
      return tape
    },
    assertMealCollector,
    -1,
    { core: { rows: [] }, milestones: { phase: {} } },
    mealRenderedConfirmation,
    'phase',
    async (key) => {
      assert.equal(key, 'Enter')
      completed = true
      keys++
    },
    async (read, accept) => {
      const value = await read()
      assert(accept(value))
      return value
    },
    {},
    repoRoot,
    () => '',
    'test-controller',
    createLocalCapture({ enabled: false }),
  )
  await fn('s003', [], { failure: true })
  assert.equal(keys, 1)
  assert.equal(fullReads, 0)
})

test('004 RPC timing records both successful and throwing reads without hiding the error', async () => {
  const report = { rpc: [] },
    ticks = [5, 11, 20, 29]
  const fn = new Function(
    'performance',
    'Date',
    'appendBounded',
    'report',
    'phase',
    'contextLabel',
    `return ${journeyArrow('rpc')}`,
  )({ now: () => ticks.shift() }, { now: () => 123 }, appendBounded, report, 'wine-gift', 'story')
  assert.equal(await fn('drive', async () => 'actual DTO'), 'actual DTO')
  await assert.rejects(
    () =>
      fn('drive', async () => {
        throw new Error('actual read failed')
      }),
    /actual read failed/,
  )
  assert.deepEqual(
    report.rpc.map((r) => [r.status, r.durationMs, r.clock, r.wallAtMs]),
    [
      ['completed', 6, 'node-monotonic', 123],
      ['failed', 9, 'node-monotonic', 123],
    ],
  )
})
