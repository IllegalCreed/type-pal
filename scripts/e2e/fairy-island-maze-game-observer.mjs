import assert from 'node:assert/strict'

export const FAIRY_MAZE_GAME_TRACE_TARGETS = [
  'packages/game/src/core/event-system.ts',
  'packages/game/src/core/save/api.ts',
  'packages/game/src/core/scene-system.ts',
  'packages/game/src/present/present.ts',
  'packages/game/src/shell/bootstrap.ts',
]

/** Keep actual player commits, raft legs, floor animation, inputs and save boundaries. */
export function installFairyMazeGameObserver(_causal, createRecorder) {
  const events = [],
    inputs = [],
    saveCaptures = [],
    saveCompletions = [],
    gameRestores = [],
    errors = []
  let overflow = false,
    previous,
    previousNpcs,
    sceneVisit = 0,
    floorFrame
  const recorder = createRecorder({
    context: () => ({ atMs: performance.now() }),
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  const { append, resources } = recorder
  const drawnActors = new Map()
  const position = ({ x, y }) => [x, y]
  const npcState = (npc) =>
    npc && {
      state: npc.sState,
      position: position(npc),
      entry: npc.triggerResume?.ip ?? null,
      mode: npc.triggerMode,
      frame: npc.scriptedFrame ?? null,
    }

  globalThis.__fairyMazeGameRead = () => {
    const gs = globalThis.__tpgs
    if (!gs) return null
    const top = gs.menuStack?.at(-1),
      dialog = gs.dialogBox
    return {
      scene: gs.wNumScene,
      position: position(gs.party),
      facing: gs.party.facing,
      ready: globalThis.__routeGameReadiness(gs).routeReady,
      menu: top && {
        kind: top.kind,
        cursor: top.state?.selection?.cursor ?? top.state?.cursor,
        phase: top.state?.phase,
        items: top.state?.inventory?.map(({ itemId }) => itemId),
      },
      dialog: dialog && {
        phase: dialog.phase,
        text: dialog.currentLineText,
        lines: dialog.shownLines,
        title: dialog.titleText,
      },
      objects: Object.fromEntries(
        gs.allEventObjects
          .filter(({ id }) => id >= 235 && id <= 263)
          .map((npc) => [npc.id, npcState(npc)]),
      ),
      inventory: gs.inventory,
    }
  }

  // These hooks come from the existing Game source transforms. Only their retained facts differ.
  globalThis.__errandGame = (gs, source, render) => {
    if (!gs || ![17, 18, 19].includes(gs.wNumScene)) return
    try {
      const scene = `s${String(gs.wNumScene - 1).padStart(3, '0')}`
      if (scene !== previous?.scene || gs.npcs !== previousNpcs) {
        sceneVisit++
        previousNpcs = gs.npcs
      }
      const { routeReady, routeDialogue } = globalThis.__routeGameReadiness(gs)
      const party = { position: position(gs.party), facing: gs.party.facing }
      globalThis.__routeObserve(source, {
        scene,
        sceneVisit,
        actors: { party },
        routeReady,
        routeDialogue,
      })
      const context = { source, scene, sceneVisit, tick: gs.frameNum }
      const moved =
        previous?.scene === scene &&
        previous.party.position.some((value, index) => value !== party.position[index])
      if (moved) {
        append(events, {
          ...context,
          kind: 'actor',
          id: 'party',
          before: previous.party,
          state: party,
        })
      }
      if (routeReady && (!previous?.ready || previous.scene !== scene)) {
        append(events, {
          ...context,
          kind: 'ready',
          position: party.position,
          facing: party.facing,
        })
      }
      const cursor = gs.eventCursor,
        owner = cursor?.triggerOwnerId
      if (scene === 's017' && source === 'render:world' && render) {
        const tracked = ['e237', 'e238', 'e239', 'e240', 'e241', 'e242']
        if (owner >= 243 && owner <= 259) tracked.push('party')
        for (const id of tracked) {
          const draw = render.actors[id]
          if (!draw) continue
          const { position, facing, frame, assetId, frameResourceId } = draw
          const state = { position, facing, frame, assetId, frameResourceId, drawStatus: 'drawn' }
          const snapshot = JSON.stringify([sceneVisit, state])
          if (drawnActors.get(id) === snapshot) continue
          drawnActors.set(id, snapshot)
          append(events, { ...context, kind: 'actor-render', id, state })
        }
      }
      if (
        owner >= 243 &&
        owner <= 259 &&
        (source === 'commit:partyRideEventObject' || source === 'commit:partyWalkTo')
      ) {
        append(events, {
          ...context,
          kind: 'raft-motion',
          owner,
          ip: cursor.ip,
          party: party.position,
          raft: position(gs.npcs.find(({ id }) => id === owner)),
        })
      }
      if (scene === 's017') {
        const floor = gs.npcs.find(({ id }) => id === 262)
        if (
          floor?.sState === 1 &&
          Number.isInteger(floor.scriptedFrame) &&
          floorFrame !== floor.scriptedFrame
        ) {
          floorFrame = floor.scriptedFrame
          append(events, { ...context, kind: 'floor-frame', id: floor.id, frame: floorFrame })
        }
      }
      previous = { scene, party, ready: routeReady }
    } catch (error) {
      recorder.fail(error)
    }
  }
  globalThis.__errandError = recorder.fail
  const payload = (gs) => ({ format: 'type-pal-save', gs: JSON.parse(JSON.stringify(gs)) })
  globalThis.__errandGameRestored = (gs) =>
    append(gameRestores, { source: 'commit:loadGameFromSlot', payload: payload(gs) }, 1)
  globalThis.__errandGameSaving = (slot, gs) => {
    const seq = saveCaptures.length
    append(
      saveCaptures,
      { source: 'before:Save.saveSlot:deepClone', slot, payload: payload(gs) },
      2,
    )
    return seq
  }
  globalThis.__errandGameSaved = (captureSeq) =>
    append(saveCompletions, { source: 'commit:Save.saveSlot', captureSeq }, 2)
  globalThis.__fairyMazeGameSaveStatus = () => ({
    captures: saveCaptures.length,
    completions: saveCompletions.length,
  })

  for (const type of ['keydown', 'keyup']) {
    globalThis.addEventListener(type, ({ key, repeat }) =>
      append(inputs, { type, key, repeat }, 1_000),
    )
  }
  globalThis.__fairyMazeGameRouteEvidence = () => ({ events, errors, overflow })
  globalThis.__fairyMazeGameArchive = () => ({
    events,
    inputs,
    saveCaptures,
    saveCompletions,
    gameRestores,
    resources: resources(),
    errors,
    overflow,
  })
}

export function assertFairyMazeGameTrace(trace) {
  assert.equal(trace.overflow, false, '008 Game trace exceeded its budget')
  assert.deepEqual(trace.errors, [], '008 Game trace observer error')
  const ordered = []
  const lists = ['events', 'inputs', 'saveCaptures', 'saveCompletions', 'gameRestores']
  if (trace.resources !== undefined) lists.push('resources')
  for (const name of lists) {
    trace[name].forEach((event, index) => {
      assert.equal(event.seq, index, `008 Game lost ${name} record`)
      ordered.push(event)
    })
  }
  ordered.sort((a, b) => a.order - b.order)
  ordered.forEach(({ order }, index) => {
    assert.equal(order, index, '008 Game trace has a gap')
  })
}
