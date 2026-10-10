import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { assertBoatMotion, readBoatContract } from './boat-contract.mjs'
import { boatMotionEvidence } from './boat-motion-evidence.mjs'
import { assertBoatLeaderHold, checkBoatRecording } from './boat-recording-contract.mjs'
import { assertBoatRiderPose } from './boat-rider-pose.mjs'
import { assertBoatRouteTerminal } from './boat-terminal-contract.mjs'
import { canonicalScenes } from './entity-action-contract.mjs'
import { errandCausalObserverScript } from './errand-observer.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { npcStoryBoundary } from './npc-story-scope.mjs'

/** Drives the actual collector at its adapter boundary. This tests specialized
 * evidence consumption/binding, not execution of the full game's boat storyline.
 */
function collectBoat(contract, drift = false) {
  const host = vm.createContext({
    structuredClone,
    performance,
    TextEncoder,
    AbortController,
    addEventListener() {},
  })
  vm.runInContext(errandCausalObserverScript(), host)
  const actor = (position, facing = 'up') => ({
    position,
    facing,
    visible: true,
    state: 2,
    behavior: {},
  })
  const state = {
    scene: 's002',
    control: false,
    money: 550,
    persistent: {},
    hooks: {},
    actors: { party: actor([0, 4, 0]) },
  }
  const point = (source) => {
    if (source === 'render:world') {
      state.renderEvidence = {
        actors: {
          party: {
            position: state.actors.party.position,
            facing: state.actors.party.facing,
            frame: 0,
            frameResourceId: 0,
          },
        },
      }
    }
    host.__errandPoint(source, state)
  }
  let startOrder, routeStart
  const rows = contract.dialogue.rows
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    if (row.id === 'dlg.366') {
      state.scene = 's003'
      state.actors.e59 = actor([137, 76, 0], 'left')
    }
    if (row.id === 'dlg.533') {
      state.scene = 's005'
      delete state.actors.e59
    }
    if (row.id === 'dlg.1886') {
      state.actors.party = actor([124, 48, 0])
      state.actors.e116 = actor([126, 52, 0], 'down')
      state.actors.e117 = actor([124, 54, 0])
      point('commit:entity.pos')
      const ambientRunner = {}
      const ambientSignal = new AbortController().signal
      const ambientSelf = { scene: 's005', entity: 'e117' }
      host.__openingCauseRun(ambientRunner, ambientSignal, {
        self: ambientSelf,
        timing: 'auto',
        stage: 'routine',
      })
      host.__openingCauseStep(ambientRunner, {
        self: ambientSelf,
        timing: 'auto',
        path: ['routine', 0],
        command: { kind: 'leaf', command: { kind: 'stepEntity', target: ambientSelf, dir: 'up' } },
      })
      const ambientSlot = {
        kind: 'step',
        source: 'auto',
        dir: 'up',
        speed: 'slow',
        commandEpoch: 1,
        sceneSessionId: 's005:1',
        activationOwnerId: 'e117',
        activationEpoch: 1,
      }
      const ambientInput = {
        id: 'e117',
        sceneId: 's005',
        signal: ambientSignal,
        dir: 'up',
        speed: 'slow',
        activation: { ownerId: 'e117', epoch: 1 },
      }
      host.__openingCauseMotionSlot('registered', ambientSlot, ambientInput, { resumed: null })
      startOrder = npcStoryBoundary(host.__readErrandEvidence()).afterOrder
      routeStart = startOrder
      host.__openingCauseMotionSlot('cancelled', ambientSlot, ambientInput, { reason: 'aborted' })
      host.__openingCauseEnded(ambientRunner, { aborted: true })
      const self = { scene: 's005', entity: 'e116' }
      const body = canonicalScenes.s005.entities.find((e) => e.id === 'e116').behaviors.trigger[
        'legacy-001'
      ].flow.stages[0].body
      const runner = {},
        signal = new AbortController().signal
      host.__openingCauseRun(runner, signal, { self, timing: 'interactive', stage: 'initial' })
      const command = (index) =>
        host.__openingCauseStep(runner, {
          self,
          timing: 'interactive',
          path: ['initial', index],
          command: { kind: 'leaf', command: body[index] },
        })
      command(4)
      state.actors.party.facing = 'down'
      state.actors.party.walking = false
      state.actors.party.sprite = 'li-xiaoyao'
      point('commit:setPartyFacing')
      host.__openingCauseLeafCompleted(runner)
      for (const index of [9, 11]) {
        const ride = body[index]
        command(index)
        const slot = {
          kind: 'move',
          source: 'script',
          to: ride.to,
          speed: ride.speed,
          commandEpoch: index === 9 ? 1 : 2,
          sceneSessionId: 's005:1',
          slowRestPending: false,
          slowCadence: false,
          preserveFacing: true,
        }
        const input = {
          id: 'e116',
          sceneId: 's005',
          signal,
          to: ride.to,
          speed: ride.speed,
          slowCadence: false,
          preserveFacing: true,
        }
        host.__openingCauseMotionSlot('registered', slot, input, { resumed: null })
        point('render:world')
        for (let step = 0; step < (index === 9 ? 1 : 71); step++) {
          for (const id of index === 9 ? ['party', 'e116'] : ['party', 'e116', 'e117']) {
            state.actors[id].position[1] -= 0.25
            point('commit:entity.pos')
          }
          point('render:world')
        }
        host.__openingCauseMotionSlot('committed', slot, input, {})
        host.__openingCauseMotionSlot('settled', slot, input, {})
        host.__openingCauseLeafCompleted(runner)
        command(index + 1)
        host.__openingCauseLeafCompleted(runner)
      }
      host.__openingCauseEnded(runner, { resolved: true })
      state.scene = 's014'
      state.actors.party = actor([74, 27, 0], 'down')
    }
    point('commit:entity.pos')
    const page = {
      phase: 'waiting-end-key',
      pageText: row.text,
      speaker: row.speaker,
      dialogueId: row.id,
      slot: 'bottom',
      cueIndex: 0,
      pageIndex: 0,
      pageStartedAtMs: index,
    }
    host.__openingCauseDialog('open', null, page)
    host.__errandRendered(page)
    if (drift && row.id === 'dlg.380') {
      for (const delta of [1, -1]) {
        state.actors.e59.position[0] += delta
        point('commit:entity.pos')
        point('render:world')
      }
    }
    host.__openingCauseDialog('advance', page, null)
    host.__errandRendered(null)
  }
  state.control = true
  point('commit:control')
  return { raw: host.__readErrandEvidence(), startOrder, routeStart }
}

test('006 offline specialization rederives bound boat draws, rejects borrowed final state and checks motion between unchanged dialogue pages', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'pal-boat-proof-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const contract = await readBoatContract(),
    { raw, startOrder, routeStart } = collectBoat(contract)
  assert.deepEqual(raw.errors, [])
  const endOrder = npcStoryBoundary(raw).afterOrder,
    motion = boatMotionEvidence(raw, startOrder, endOrder)
  const last = {
    scene: 's014',
    position: [74, 27, 0],
    facing: 'down',
    runtime: {
      scriptRunning: false,
      dialogue: null,
      presentationBusy: false,
      menuActive: false,
      battleActive: false,
      fadeBlack: 0,
      ditherActive: false,
    },
  }
  const report = {
    fragment: '006',
    engine: 'reforge',
    kind: 'verify',
    status: 'passed',
    core: { status: 'passed', rows: contract.rows },
    route: {
      status: 'passed',
      legs: [{ phase: 'island-arrival', startOrder: routeStart, endOrder }],
    },
    checks: {
      room: 'passed',
      doctor: 'passed',
      boat: 'passed',
      island: 'passed',
      'island-arrival': 'passed',
    },
    storyScope: { start: { afterOrder: -1 }, end: { afterOrder: endOrder } },
    endWorld: {
      position: { sceneId: 's014', pos: { col: 74, row: 27, height: 0 }, facing: 'down' },
      arrivalDialogue: [],
      controlReturned: true,
    },
    boatMotion: {
      ...assertBoatMotion(motion),
      interval: { startOrder, endOrder },
      final: motion.at(-1),
      artifact: await writeEvidenceArtifact(directory, 'motion.json', motion),
    },
    stateTrace: {
      ...(await writeEvidenceArtifact(directory, 'states.json', [{ state: last }])),
      samples: 1,
    },
  }
  const path = join(directory, 'report.json')
  assert.equal((await checkBoatRecording(path, report, raw, contract)).status, 'proved')
  const terminal = assertBoatRouteTerminal(raw, 'reforge', { startOrder, endOrder })
  const oppositeDraw = structuredClone(raw)
  oppositeDraw.events.find(
    (event) =>
      event.kind === 'actor-render' &&
      event.id === 'party' &&
      event.sceneVisit === terminal.sceneVisit &&
      event.order > terminal.command,
  ).state.frame = 6
  assert.throws(
    () => assertBoatRiderPose(oppositeDraw, 'reforge', terminal),
    /opposite\/wrong pose/,
  )
  const noDraw = {
    ...raw,
    events: raw.events.filter((event) => !(event.kind === 'actor-render' && event.id === 'party')),
  }
  assert.throws(
    () => assertBoatRiderPose(noDraw, 'reforge', terminal),
    /missing\/repeated actual draw/,
  )
  const first = raw.causes.find(
    (event) => event.phase === 'command' && event.occurrence?.command?.command?.kind === 'ride',
  )
  const wrongFirstLeg = structuredClone(raw)
  for (const event of wrongFirstLeg.causes) {
    if (event.occurrence?.id === first.occurrence.id) event.occurrence.command.command.to.row = 51.5
  }
  assert.throws(
    () => assertBoatRouteTerminal(wrongFirstLeg, 'reforge', { startOrder, endOrder }),
    /primary first stride/,
  )
  const missingFirstCompletion = {
    ...raw,
    causes: raw.causes.filter((event) => event.order !== terminal.legs[0].completion),
  }
  assert.throws(
    () => assertBoatRouteTerminal(missingFirstCompletion, 'reforge', { startOrder, endOrder }),
    /completed leaf/,
  )
  const lateFinal = structuredClone(report)
  lateFinal.storyScope.end.afterOrder--
  lateFinal.boatMotion.interval.endOrder--
  await assert.rejects(checkBoatRecording(path, lateFinal, raw, contract), /final state is outside/)
  const altered = structuredClone(motion)
  altered[1].position[0]++
  const wrongMotion = structuredClone(report)
  wrongMotion.boatMotion.artifact = await writeEvidenceArtifact(
    directory,
    'wrong-motion.json',
    altered,
  )
  await assert.rejects(
    checkBoatRecording(path, wrongMotion, raw, contract),
    /differs from completed world draws/,
  )
  const drift = collectBoat(contract, true).raw
  // All page snapshots are unchanged despite a real collector A→B→A in between.
  assert.deepEqual(
    drift.pages.filter((p) => p.actors?.e59).map((p) => p.actors.e59.position),
    raw.pages.filter((p) => p.actors?.e59).map((p) => p.actors.e59.position),
  )
  assert.throws(() => assertBoatLeaderHold(drift, 'reforge'), /对白中途移动/)
  const missingClose = structuredClone(raw)
  missingClose.causes = missingClose.causes.filter((c) => !(c.scene === 's003' && c.after === null))
  assert.throws(() => assertBoatLeaderHold(missingClose, 'reforge'), /真实开始\/关闭/)
})

test('006 hold checks a real compressed draw span that starts before dialogue', () => {
  const collect = (drawPosition) => {
    const host = vm.createContext({
      structuredClone,
      performance,
      TextEncoder,
      addEventListener() {},
    })
    vm.runInContext(errandCausalObserverScript(), host)
    const state = {
      scene: 's003',
      control: false,
      money: 550,
      persistent: {},
      hooks: {},
      actors: {
        e59: { position: [137, 76, 0], facing: 'left', visible: true, state: 2, behavior: {} },
      },
    }
    host.__errandPoint('commit:entity.pos', state)
    const draw = {
      ...state,
      renderEvidence: {
        engine: 'reforge',
        actors: {
          e59: { ...state.actors.e59, position: drawPosition, frame: 0 },
        },
        atMs: 1,
      },
    }
    host.__errandPoint('render:world', draw)
    // Restore the canonical snapshot without changing the completed draw span.
    host.__errandPoint('observe:causal', state)
    const page = {
      phase: 'waiting-end-key',
      pageText: '测试',
      speaker: '苗人头领',
      slot: 'bottom',
      dialogueId: 'dlg.366',
      cueIndex: 0,
      pageIndex: 0,
      pageStartedAtMs: 1,
    }
    host.__openingCauseDialog('open', null, page)
    host.__errandRendered(page)
    host.__errandPoint('render:world', draw)
    host.__openingCauseDialog('advance', page, null)
    host.__errandRendered(null)
    return host.__readErrandEvidence()
  }
  assert.deepEqual(assertBoatLeaderHold(collect([137, 76, 0]), 'reforge'), [137, 76])
  const wrong = collect([138, 76, 0])
  assert.deepEqual(wrong.errors, [])
  const start = wrong.causes.find((event) => event.phase === 'dialogue' && event.after)
  const span = wrong.events.find((event) => event.kind === 'actor-render')
  assert(span.order < start.order && span.throughOrder > start.order)
  assert.throws(() => assertBoatLeaderHold(wrong, 'reforge'), /对白中途移动/)
})
