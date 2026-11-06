import assert from 'node:assert/strict'

export const FAIRY_POOL_GAME_TRACE_TARGETS = [
  'packages/game/src/core/event-system.ts',
  'packages/game/src/core/save/api.ts',
  'packages/game/src/core/scene-system.ts',
  'packages/game/src/present/present.ts',
  'packages/game/src/shell/bootstrap.ts',
]

/** Record the peach grove's actual input, script, actor, draw and save boundaries. */
export function installFairyPoolGameObserver(_causal, createRecorder) {
  const events = [],
    inputs = [],
    saveCaptures = [],
    saveCompletions = [],
    gameRestores = [],
    errors = []
  const relevant = [212, 213, 216, 217, 218, 219, 220, 221, 233]
  const drawActors = ['party', ...relevant.map((id) => `e${id}`)]
  let overflow = false,
    previous,
    previousDraw,
    previousNpcs,
    previousOverlay,
    worldDraw,
    renderId = 0,
    lastOverlayRenderId = 0,
    sceneVisit = 0
  const drawnPages = new WeakMap()
  let pageId = 0
  const recorder = createRecorder({
    context: () => ({ atMs: performance.now() }),
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  const append = recorder.append
  const position = ({ x, y }) => [x, y]
  const dialogState = (dialog) =>
    dialog && {
      phase: dialog.phase,
      text: dialog.currentLineText,
      lines: dialog.shownLines,
      title: dialog.titleText,
      style: dialog.style,
    }
  const actorState = (npc) => ({
    state: npc.sState,
    position: position(npc),
    facing: npc.facing ?? null,
    sprite: npc.spriteNum,
    entry: npc.triggerResume?.ip ?? null,
    auto: npc.autoCursor?.ip ?? null,
    mode: npc.triggerMode,
    frame: npc.scriptedFrame ?? null,
    vanishTime: npc.sVanishTime ?? 0,
  })
  const sceneActors = (gs) =>
    Object.fromEntries(
      gs.npcs.filter(({ id }) => relevant.includes(id)).map((npc) => [npc.id, actorState(npc)]),
    )
  const cursorState = (cursor) =>
    cursor ? { owner: cursor.triggerOwnerId ?? null, ip: cursor.ip } : null
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

  globalThis.__fairyPoolGameRead = () => {
    const gs = globalThis.__tpgs
    if (!gs) return null
    const top = gs.menuStack?.at(-1)
    return {
      scene: gs.wNumScene,
      tick: gs.frameNum,
      position: position(gs.party),
      facing: gs.party.facing,
      ready: globalThis.__routeGameReadiness(gs).routeReady,
      menu: top && {
        kind: top.kind,
        cursor: top.state?.selection?.cursor ?? top.state?.cursor,
      },
      dialog: dialogState(gs.dialogBox),
      cursor: cursorState(gs.eventCursor),
      objects: sceneActors(gs),
      inventory: gs.inventory,
    }
  }

  globalThis.__errandGame = (gs, source, render) => {
    if (!gs || gs.wNumScene !== 17) return
    try {
      const scene = 's016'
      if (gs.npcs !== previousNpcs) {
        sceneVisit++
        previousNpcs = gs.npcs
      }
      const { routeReady, routeDialogue } = globalThis.__routeGameReadiness(gs)
      const party = { position: position(gs.party), facing: gs.party.facing }
      const context = { source, scene, sceneVisit, tick: gs.frameNum }
      const cursor = cursorState(gs.eventCursor)
      const control = { ready: routeReady, cursor }
      globalThis.__routeObserve(source, {
        scene,
        sceneVisit,
        actors: { party },
        routeReady,
        routeDialogue,
      })
      if (!same(previous?.party, party)) {
        append(events, {
          ...context,
          kind: 'actor',
          id: 'party',
          before: previous?.party,
          state: party,
          ...control,
        })
      }
      const objects = sceneActors(gs)
      for (const [id, state] of Object.entries(objects)) {
        const before = previous?.objects[id]
        if (!same(before, state))
          append(events, { ...context, kind: 'actor', id: `e${id}`, before, state, ...control })
      }
      if (routeReady && !previous?.ready) {
        append(events, { ...context, kind: 'ready', ...party })
      }
      if (!same(previous?.cursor, cursor)) {
        append(events, { ...context, kind: 'cursor', before: previous?.cursor, ...control })
      }
      const dialog = dialogState(gs.dialogBox)
      if (!same(previous?.dialog, dialog)) {
        append(events, { ...context, kind: 'dialogue', dialog, ...control })
      }
      const herbCount = gs.inventory.find(({ itemId }) => itemId === 99)?.count ?? 0
      if (herbCount !== previous?.herbCount) {
        append(events, { ...context, kind: 'herb-count', count: herbCount, ...control })
      }
      const sounds = gs.pendingSounds?.length ?? 0
      if (source === 'commit:applyRawOpcode' && sounds > (previous?.sounds ?? 0)) {
        for (const id of gs.pendingSounds.slice(previous?.sounds ?? 0)) {
          append(events, {
            ...context,
            kind: 'sound',
            id,
            ...(id === 107 && { lightningPosition: objects[218]?.position }),
            ...control,
          })
        }
      }
      previous = { party, objects, ...control, dialog, herbCount, sounds }

      if (source === 'render:world' && render) {
        const actors = Object.fromEntries(
          drawActors.map((id) => {
            const draw = render.actors[id]
            return [
              id,
              draw
                ? {
                    assetId: draw.assetId,
                    frame: draw.frame,
                    frameResourceId: draw.frameResourceId,
                    position: draw.position,
                    facing: draw.facing,
                    geometry: draw.geometry,
                    drawOrder: draw.drawOrder,
                  }
                : null,
            ]
          }),
        )
        const frame = { actors, camera: render.view.camera, ...control }
        renderId++
        if (!same(previousDraw, frame)) {
          worldDraw = append(events, {
            ...context,
            kind: 'world-draw',
            renderId,
            ...frame,
          })
          previousDraw = frame
        } else if (worldDraw) {
          recorder.extend(worldDraw, { throughRenderId: renderId })
        }
      }
    } catch (error) {
      recorder.fail(error)
    }
  }
  globalThis.__openingCauseDialogueDraw = (engine, gs, assets) => {
    if (engine !== 'game' || gs.wNumScene !== 17) return
    try {
      const slots = []
      for (const [box, active] of [
        [gs.dialogBoxKept, false],
        [gs.dialogBox, true],
      ]) {
        if (!box) continue
        if (!drawnPages.has(box)) {
          drawnPages.set(box, { page: ++pageId, cursor: cursorState(gs.eventCursor) })
        }
        const narration = box.style === 'narration'
        const shown = box.currentLineText?.slice(0, box.charsRevealed)
        const text = narration
          ? (box.currentLineText ?? box.shownLines[0] ?? '')
          : [...box.shownLines, ...(shown ? [shown] : [])].join('\n')
        if (!text && !box.titleText) continue
        slots.push({
          ...drawnPages.get(box),
          slot: box.style,
          active,
          phase: box.phase,
          text,
          title: box.titleText ?? null,
          portrait: assets.portraitFrames?.has(box.portraitIcon) ? box.portraitIcon : null,
        })
      }
      if (!same(previousOverlay, slots)) {
        append(events, {
          kind: 'dialogue-draw',
          source: 'draw:drawDialogOverlay',
          scene: 's016',
          tick: gs.frameNum,
          renderId: renderId > lastOverlayRenderId ? renderId : null,
          slots,
        })
        previousOverlay = slots
      }
      lastOverlayRenderId = renderId
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
  globalThis.__fairyPoolGameSaveStatus = () => ({
    captures: saveCaptures.length,
    completions: saveCompletions.length,
  })

  for (const type of ['keydown', 'keyup']) {
    globalThis.addEventListener(type, ({ key, repeat }) =>
      append(inputs, { type, key, repeat }, 1_000),
    )
  }
  globalThis.__fairyPoolGameRouteEvidence = () => ({ events, errors, overflow })
  globalThis.__fairyPoolGameArchive = () => ({
    events,
    inputs,
    saveCaptures,
    saveCompletions,
    gameRestores,
    resources: recorder.resources(),
    errors,
    overflow,
  })
}

export function assertFairyPoolGameTrace(trace) {
  assert.equal(trace.overflow, false, '009 Game trace exceeded its budget')
  assert.deepEqual(trace.errors, [], '009 Game trace observer error')
  const ordered = []
  for (const name of [
    'events',
    'inputs',
    'saveCaptures',
    'saveCompletions',
    'gameRestores',
    'resources',
  ]) {
    ;(trace[name] ?? []).forEach((event, index) => {
      assert.equal(event.seq, index, `009 Game lost ${name} record`)
      ordered.push(event)
    })
  }
  ordered.sort((a, b) => a.order - b.order)
  ordered.forEach(({ order }, index) => {
    assert.equal(order, index, '009 Game trace has a gap')
  })
}
