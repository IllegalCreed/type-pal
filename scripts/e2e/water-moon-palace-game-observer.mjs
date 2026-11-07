import assert from 'node:assert/strict'

/** Keep the actual native inputs, caller, draws and durable saves of the three 010 scenes. */
export function installWaterMoonPalaceGameObserver(_causal, createRecorder) {
  const scenes = {
    17: { id: 's016', actors: [211, 216, 221] },
    20: { id: 's019', actors: [267, 268, 270] },
    21: { id: 's020', actors: [341, 342, 348, 362, 363] },
  }
  const items = [61, 179, 273]
  const events = [],
    inputs = [],
    saveCaptures = [],
    saveCompletions = [],
    gameRestores = [],
    errors = []
  let overflow = false
  const recorder = createRecorder({
    context: () => ({ atMs: performance.now() }),
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  const append = recorder.append
  const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)
  const position = ({ x, y }) => [x, y]
  const sceneActors = (gs) =>
    Object.fromEntries(
      gs.npcs
        .filter(({ id }) => scenes[gs.wNumScene]?.actors.includes(id))
        .map((npc) => [
          npc.id,
          {
            state: npc.sState,
            position: position(npc),
            facing: npc.facing,
            sprite: npc.spriteNum,
            entry: npc.triggerResume?.ip ?? null,
            auto: npc.autoCursor?.ip ?? null,
            mode: npc.triggerMode,
            frame: npc.scriptedFrame ?? null,
          },
        ]),
    )
  const dialogState = (box) =>
    box && {
      phase: box.phase,
      text: box.currentLineText,
      lines: box.shownLines,
      title: box.titleText,
      style: box.style,
    }
  const cursorState = (cursor) =>
    cursor ? { owner: cursor.triggerOwnerId ?? null, ip: cursor.ip } : null
  const counts = (gs) =>
    Object.fromEntries(
      items.map((id) => [id, gs.inventory.find(({ itemId }) => itemId === id)?.count ?? 0]),
    )
  const vitals = (gs) =>
    gs.partyMembers.map((role) => ({
      role,
      hp: gs.PlayerRolesRuntime.rgwHP[role],
      maxHp: gs.PlayerRolesRuntime.rgwMaxHP[role],
      mp: gs.PlayerRolesRuntime.rgwMP[role],
      maxMp: gs.PlayerRolesRuntime.rgwMaxMP[role],
    }))

  let previousNpcs,
    previousScene,
    previous,
    previousDraw,
    previousOverlay,
    worldDraw,
    pendingRecovery
  let sceneVisit = 0,
    renderId = 0,
    pageId = 0,
    lastOverlayRenderId = 0
  const drawnPages = new WeakMap()
  const context = (gs) => ({
    scene: scenes[gs.wNumScene].id,
    sceneVisit,
    tick: gs.frameNum,
    gameTimeMs: gs.nowMs,
  })

  globalThis.__waterMoonGameRead = () => {
    const gs = globalThis.__tpgs
    if (!gs) return null
    const top = gs.menuStack?.at(-1)
    return {
      scene: gs.wNumScene,
      tick: gs.frameNum,
      position: position(gs.party),
      facing: gs.party.facing,
      ready: globalThis.__routeGameReadiness(gs).routeReady,
      menu: top && { kind: top.kind, cursor: top.state?.selection?.cursor ?? top.state?.cursor },
      dialog: dialogState(gs.dialogBox),
      cursor: cursorState(gs.eventCursor),
      objects: sceneActors(gs),
      inventory: gs.inventory,
      counts: counts(gs),
      vitals: vitals(gs),
    }
  }

  globalThis.__openingCauseGame = (gs, kind, cursor, entry) => {
    const scene = scenes[gs.wNumScene]
    if (kind !== 'command' || !scene) return
    if (entry.channel !== 'onEnter' && !scene.actors.includes(entry.actor)) return
    try {
      const data = { kind, source: 'dispatch:GameScript', ...context(gs), ...entry }
      const recorded = append(events, data)
      if (
        recorded &&
        entry.channel === 'trigger' &&
        entry.actor === 362 &&
        entry.command.op === 'raw' &&
        entry.command.opcode === 29
      )
        pendingRecovery = { cursor, commandOrder: recorded.order, ip: entry.ip, before: vitals(gs) }
    } catch (error) {
      recorder.fail(error)
    }
  }

  globalThis.__errandGame = (gs, source, render) => {
    const scene = gs && scenes[gs.wNumScene]
    if (!scene) return
    try {
      if (gs.npcs !== previousNpcs || scene.id !== previousScene) {
        sceneVisit++
        previousNpcs = gs.npcs
        previousScene = scene.id
        previous = undefined
        previousDraw = undefined
        previousOverlay = undefined
      }
      const party = { position: position(gs.party), facing: gs.party.facing }
      const { routeReady, routeDialogue } = globalThis.__routeGameReadiness(gs)
      const cursor = cursorState(gs.eventCursor)
      const control = { ready: routeReady, cursor }
      const base = { ...context(gs), source }
      globalThis.__routeObserve(source, {
        scene: scene.id,
        sceneVisit,
        actors: { party },
        routeReady,
        routeDialogue,
      })
      if (!same(previous?.party, party))
        append(events, {
          ...base,
          kind: 'actor',
          id: 'party',
          before: previous?.party,
          state: party,
          ...control,
        })
      const objects = sceneActors(gs)
      for (const [id, state] of Object.entries(objects)) {
        const before = previous?.objects[id]
        if (!same(before, state))
          append(events, { ...base, kind: 'actor', id: `e${id}`, before, state, ...control })
      }
      if (!same(previous?.cursor ?? null, cursor))
        append(events, { ...base, kind: 'cursor', before: previous?.cursor ?? null, ...control })
      if (routeReady && !previous?.ready)
        append(events, { ...base, kind: 'ready', ...party, counts: counts(gs), vitals: vitals(gs) })
      const dialog = dialogState(gs.dialogBox)
      if (!same(previous?.dialog, dialog))
        append(events, { ...base, kind: 'dialogue', dialog, ...control })
      const inventory = counts(gs)
      if (!same(previous?.inventory, inventory))
        append(events, { ...base, kind: 'inventory', counts: inventory, ...control })
      if (
        source === 'commit:applyRawOpcode' &&
        pendingRecovery &&
        gs.eventCursor === pendingRecovery.cursor &&
        gs.eventCursor.ip === pendingRecovery.ip
      ) {
        append(events, {
          ...base,
          kind: 'water-recovery',
          commandOrder: pendingRecovery.commandOrder,
          before: pendingRecovery.before,
          after: vitals(gs),
          ...control,
        })
        pendingRecovery = undefined
      }
      previous = { party, objects, ...control, dialog, inventory }

      if (source === 'render:world' && render) {
        const actors = Object.fromEntries(
          ['party', ...scene.actors.map((id) => `e${id}`)].map((id) => {
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
          worldDraw = append(events, { ...base, kind: 'world-draw', renderId, ...frame })
          previousDraw = frame
        } else if (worldDraw) {
          recorder.extend(worldDraw, { throughRenderId: renderId, throughAtMs: performance.now() })
        }
      }
    } catch (error) {
      recorder.fail(error)
    }
  }

  globalThis.__openingCauseDialogueDraw = (engine, gs, assets) => {
    if (engine !== 'game' || !scenes[gs.wNumScene]) return
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
        const shown = box.currentLineText?.slice(0, box.charsRevealed)
        const text =
          box.style === 'narration'
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
          ...context(gs),
          kind: 'dialogue-draw',
          source: 'draw:drawDialogOverlay',
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

  for (const type of ['keydown', 'keyup']) {
    globalThis.addEventListener(type, ({ key, repeat }) =>
      append(inputs, { type, key, repeat }, 1_000),
    )
  }
  globalThis.__waterMoonGameSaveStatus = () => ({
    captures: saveCaptures.length,
    completions: saveCompletions.length,
  })
  globalThis.__waterMoonGameRouteEvidence = () => ({ events, errors, overflow })
  globalThis.__waterMoonGameArchive = () => ({
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

export function assertWaterMoonPalaceGameTrace(trace) {
  assert.equal(trace.overflow, false, '010 Game trace exceeded its budget')
  assert.deepEqual(trace.errors, [], '010 Game observer error')
  const orders = []
  for (const name of [
    'events',
    'inputs',
    'saveCaptures',
    'saveCompletions',
    'gameRestores',
    'resources',
  ]) {
    assert(Array.isArray(trace[name]), `010 Game trace omitted ${name}`)
    trace[name].forEach(({ seq, order }, index) => {
      assert.equal(seq, index, `010 Game lost ${name} record`)
      orders.push(order)
    })
  }
  orders.sort((left, right) => left - right)
  for (const [index, order] of orders.entries()) {
    assert.equal(order, index, '010 Game trace has a gap')
  }
}
