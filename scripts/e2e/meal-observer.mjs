import { evidenceObserverScript } from './evidence-recorder.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'

export function mealCausalObserverScript() {
  return evidenceObserverScript(installMealObserver, createScriptCausalObserver)
}

/** Read-only, bounded observations of actual commits and rendered frames. */
export function installMealObserver(createCausalObserver, createRecorder) {
  const sceneLifecyclePhases = {
    'commit:scene-materialized': 'materialized',
    'before:scene-projection': 'projecting',
    'commit:scene-ready': 'ready',
    'failed:scene-projection': 'failed',
  }
  // Independent per-frame clock capacity: 240 seconds at up to 250 draws/second.
  // State-change list limits stay unchanged; overflow still invalidates the trace.
  const worldRenderLimit = 60_000
  const worldRenders = [],
    renderSpans = new Map()
  let sceneVisit = 0,
    observedScene = null,
    observedInstance,
    observedTick = null,
    reportedVisit = 0,
    nextRenderId = 0,
    pointRender = null
  // This boundary runs before scenario filters, so an untracked scene still ends a visit.
  globalThis.__e2eSceneBoundary = ({ scene, instance, tick }) => {
    if (
      scene !== observedScene ||
      (instance !== undefined &&
        instance !== null &&
        observedInstance !== undefined &&
        instance !== observedInstance)
    ) {
      sceneVisit++
      observedScene = scene
      observedInstance = instance
      control = undefined
      renderSpans.clear()
    } else if (instance !== undefined && instance !== null) observedInstance = instance
    observedTick = Number.isFinite(tick) ? tick : null
  }
  const startPoint = (source, state) => {
    globalThis.__e2eSceneBoundary({ scene: state.scene, tick: state.tick })
    pointRender = null
    if (source !== 'render:world') return
    for (const key of renderSpans.keys())
      if (!Object.hasOwn(state.actors, key.slice(key.indexOf('/') + 1))) renderSpans.delete(key)
    const previous = worldRenders.at(-1),
      atMs = state.renderEvidence?.atMs ?? performance.now()
    const before = worldRenders.length
    append(
      worldRenders,
      {
        kind: 'world-render',
        scene: state.scene,
        source,
        sceneVisit,
        renderId: ++nextRenderId,
        tick: observedTick,
        atMs,
        view: state.renderEvidence?.view ?? null,
        causalFrame: causal?.clock() ?? null,
        previousRenderId: previous?.renderId ?? null,
        elapsedSincePreviousRenderMs: previous ? atMs - previous.atMs : null,
      },
      worldRenderLimit,
    )
    if (worldRenders.length === before) throw new Error('world render evidence overflow')
    pointRender = worldRenders.at(-1)
  }
  const retainRender = (source, state, id, actor) => {
    if (!pointRender) return
    const evidence = state.renderEvidence,
      drawn = evidence?.actors?.[id],
      hasPass = evidence?.actors !== null && evidence?.actors !== undefined
    const rendered = {
      position: drawn?.position ?? actor.position,
      facing: drawn?.facing ?? actor.facing,
      visible: actor.visible,
      geometry: drawn?.geometry ?? evidence?.candidates?.[id]?.geometry ?? null,
      drawOrder: drawn?.drawOrder ?? null,
      frame: drawn?.frame ?? null,
      frameSource: drawn ? 'drawn' : hasPass ? 'none' : 'unknown',
      drawStatus: drawn ? 'drawn' : hasPass ? 'not-drawn' : 'unknown',
      ...(drawn
        ? {
            assetId: drawn.assetId ?? null,
            resourceAssetId: drawn.resourceAssetId ?? null,
            frameResourceId: drawn.frameResourceId ?? null,
            spriteSource: drawn.spriteSource,
            fallback: drawn.fallback,
          }
        : {}),
    }
    const key = `${sceneVisit}/${id}`,
      previous = renderSpans.get(key)
    const tail = {
      throughRenderId: pointRender.renderId,
      throughAtMs: pointRender.atMs,
      throughOrder: pointRender.order,
    }
    if (previous && JSON.stringify(previous.state) === JSON.stringify(rendered)) {
      recorder.extend(previous, tail)
      return
    }
    const before = events.length
    append(
      events,
      {
        kind: 'actor-render',
        scene: state.scene,
        id,
        source,
        sceneVisit,
        renderId: pointRender.renderId,
        tick: pointRender.tick,
        atMs: pointRender.atMs,
        ...tail,
        state: rendered,
      },
      8000,
    )
    if (events.length > before) renderSpans.set(key, events.at(-1))
  }

  const events = [],
    pages = [],
    frames = [],
    menus = [],
    dispatches = [],
    saveCaptures = [],
    saveCompletions = [],
    restoreCommits = [],
    gameRestores = [],
    inputs = [],
    phases = [],
    dithers = [],
    errors = []
  const automaticRuns = new Map(),
    gameAutoCommands = new Map(),
    gameAutoSteps = new Map(),
    renderWaiters = new Set()
  let lastWorldRender = null
  const renderedCompletion = (request) => {
    const actor = final?.actors[request.id],
      rendered = renderSpans.get(`${sceneVisit}/${request.id}`)?.state
    if (
      lastWorldRender?.scene !== request.scene ||
      lastWorldRender.sceneVisit !== sceneVisit ||
      !final?.control ||
      !actor?.visible ||
      rendered?.drawStatus !== 'drawn' ||
      JSON.stringify(rendered.position) !== JSON.stringify(request.position) ||
      rendered.facing !== request.facing ||
      rendered.frame !== request.frame
    )
      return null
    if (request.engine === 'game') {
      const terminal = gameAutoSteps.get(request.id)
      if (
        actor.autoIp !== request.autoIp ||
        terminal?.after.ip !== request.autoIp ||
        terminal.sceneVisit !== sceneVisit ||
        terminal.order >= lastWorldRender.order
      )
        return null
      const command = gameAutoCommands.get(request.id)
      if (
        request.sourceCall &&
        (!Number.isSafeInteger(request.afterOrder) ||
          command?.sceneVisit !== sceneVisit ||
          command.scene !== request.scene ||
          command.order <= request.afterOrder ||
          command.order >= terminal.order ||
          !Number.isSafeInteger(command.autoCallId) ||
          !Number.isSafeInteger(command.batchId) ||
          !Number.isSafeInteger(command.runId) ||
          !Number.isSafeInteger(command.occurrence.id) ||
          command.autoCallId !== terminal.autoCallId ||
          command.batchId !== terminal.batchId ||
          command.runId !== terminal.runId ||
          command.occurrence.id !== terminal.occurrence?.id ||
          command.occurrence.ip !== request.sourceCall.ip ||
          terminal.before?.ip !== request.sourceCall.ip ||
          JSON.stringify(command.occurrence.command) !== JSON.stringify(request.sourceCall.command))
      )
        return null
      return {
        ...lastWorldRender,
        position: rendered.position,
        frame: rendered.frame,
        autoIp: actor.autoIp,
        terminalOrder: terminal.order,
        ...(request.sourceCall
          ? { sourceOrder: command.order, autoCallId: command.autoCallId, runId: command.runId }
          : {}),
      }
    }
    const run = [...automaticRuns.values()].findLast(
      (run) =>
        run.scene === request.scene && run.sceneVisit === sceneVisit && run.entity === request.id,
    )
    if (run?.behavior !== request.behavior || !run.end || run.end >= lastWorldRender.order)
      return null
    return {
      ...lastWorldRender,
      position: rendered.position,
      frame: rendered.frame,
      runId: run.runId,
      runEnd: run.end,
    }
  }
  const prior = new Map(),
    commitOrders = new Map()
  let armedSave = null,
    saveArmId = 0,
    latestMenu = { active: false },
    order = 0,
    sample = 0,
    overflow = false,
    final = null,
    inputPhase = 'bootstrap',
    control
  const recorder = createRecorder({
    // Long multi-scene stories retain full NPC state and causal provenance. The
    // short-fragment 4 MiB event budget is insufficient even before meal service.
    // Separate bounded streams still seal the complete trace on any overflow.
    budgets: {
      events: 64 * 1024 * 1024,
      causes: 768 * 1024 * 1024,
      atomicSnapshots: 32 * 1024 * 1024,
    },
    context: (value) => ({
      sample,
      atMs: pointRender?.atMs ?? performance.now(),
      ...(['actor', 'actor-render', 'control', 'scene'].includes(value.kind)
        ? { sceneVisit, tick: observedTick, renderId: pointRender?.renderId ?? null }
        : {}),
    }),
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  const fail = recorder.fail
  const append = (list, value, limit) => {
    const event = recorder.append(list, value, limit)
    order = recorder.nextOrder
    if (event?.kind === 'cause' && event.engine === 'reforge') {
      if (event.phase === 'run-started' && event.author?.channel === 'auto')
        automaticRuns.set(event.runId, {
          runId: event.runId,
          scene: event.scene,
          sceneVisit: event.sceneVisit,
          entity: event.author.entity,
          behavior: event.author.behavior,
        })
      else if (
        event.phase === 'run-ended' &&
        !event.aborted &&
        event.resolved &&
        automaticRuns.has(event.runId) &&
        event.occurrence?.command?.kind === 'finishStep' &&
        event.occurrence.command.next?.kind === 'complete'
      ) {
        const run = automaticRuns.get(event.runId),
          cursor = event.world?.script?.behaviors?.entities?.[run.scene]?.[run.entity]?.auto?.cursor
        if (cursor?.behavior === run.behavior && cursor.at?.kind === 'completed')
          run.end = event.order
      }
    }
    if (event?.kind === 'cause' && event.engine === 'game') {
      if (event.phase === 'command' && event.channel === 'auto')
        gameAutoCommands.set(`e${event.actor}`, event)
      if (event.phase === 'auto-step') gameAutoSteps.set(`e${event.actor}`, event)
    }
    return event
  }
  const point = (source, state) => {
    try {
      startPoint(source, state)
      if (!['s001', 's003'].includes(state.scene)) return
      sample++
      const newVisit = reportedVisit !== sceneVisit
      if (newVisit) {
        reportedVisit = sceneVisit
        append(events, { kind: 'scene', source, scene: state.scene }, 8000)
      }
      for (const [id, actor] of Object.entries(state.actors)) {
        if (!actor.position.every(Number.isFinite)) throw new Error(`invalid meal actor ${id}`)
        // Party identity survives scene switches: exit scripts place it before changing sceneId.
        // Comparing against that scene's last visit would invent an unobserved move on re-entry.
        const key = id === 'party' ? 'party' : `${sceneVisit}/${state.scene}/${id}`,
          before = prior.get(key)
        if (
          before &&
          JSON.stringify(before.position) !== JSON.stringify(actor.position) &&
          !source.startsWith('commit:') &&
          !source.startsWith('tick:')
        )
          fail(`unobserved committed move ${key} at ${source}`)
        if ((id === 'party' && newVisit) || JSON.stringify(before) !== JSON.stringify(actor)) {
          const committed = append(
            events,
            { kind: 'actor', source, scene: state.scene, id, before: before ?? null, state: actor },
            8000,
          )
          if (committed) {
            prior.set(key, structuredClone(actor))
            commitOrders.set(key, committed.order)
          }
        }
        if (source === 'render:world' && id !== 'party') retainRender(source, state, id, actor)
      }
      const phase = Object.hasOwn(sceneLifecyclePhases, source)
        ? sceneLifecyclePhases[source]
        : null
      if (phase)
        append(
          events,
          {
            kind: 'scene-lifecycle',
            phase,
            source,
            scene: state.scene,
            sceneVisit,
            tick: observedTick,
          },
          8000,
        )
      if (control !== state.control) {
        append(
          events,
          {
            kind: 'control',
            scene: state.scene,
            source,
            before: control ?? null,
            state: state.control,
          },
          8000,
        )
        control = state.control
      }
      const progress = {
        money: state.money,
        inventory: state.inventory,
        persistent: state.persistent,
      }
      const before = prior.get('progress')
      if (JSON.stringify(before) !== JSON.stringify(progress)) {
        append(
          events,
          { kind: 'progress', source, scene: state.scene, before: before ?? null, state: progress },
          8000,
        )
        prior.set('progress', structuredClone(progress))
      }
      final = structuredClone(state)
      if (pointRender) {
        lastWorldRender = {
          order: pointRender.order,
          renderId: pointRender.renderId,
          scene: state.scene,
          sceneVisit,
        }
        for (const waiter of renderWaiters) waiter.check()
      }
      globalThis.__routeObserve?.(source, { ...state, sceneVisit })
    } catch (error) {
      fail(error)
    } finally {
      pointRender = null
    }
  }
  const rendered = (engine, page) => {
    try {
      if (!final || !['s001', 's003'].includes(final.scene)) return
      if (
        pages.at(-1)?.sceneVisit !== sceneVisit ||
        JSON.stringify(pages.at(-1)?.page) !== JSON.stringify(page)
      )
        append(pages, { kind: 'page', engine, scene: final.scene, sceneVisit, page }, 800)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__mealPoint = point
  globalThis.__mealError = fail
  globalThis.__mealSetInputPhase = (phase) => {
    if (typeof phase !== 'string' || !phase) throw new Error('invalid meal input phase')
    inputPhase = phase
    return append(
      phases,
      {
        kind: 'phase',
        edge: 'start',
        source: 'executor:phase',
        phase,
        scene: observedScene,
        sceneVisit,
      },
      400,
    )
  }
  globalThis.__mealFinishPhase = (phase, startOrder) => {
    if (!phases.some((p) => p.order === startOrder && p.edge === 'start'))
      throw new Error('meal phase start was not recorded')
    return append(
      phases,
      {
        kind: 'phase',
        edge: 'end',
        source: 'executor:phase',
        phase,
        startOrder,
        scene: observedScene,
        sceneVisit,
      },
      400,
    )
  }
  for (const type of ['keydown', 'keyup'])
    globalThis.addEventListener?.(type, (event) => {
      if (
        !['Enter', 'Escape', 'F5', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
          event.key,
        )
      )
        return
      append(
        inputs,
        { source: 'actual:dom-key', type, key: event.key, repeat: event.repeat, phase: inputPhase },
        1500,
      )
    })
  globalThis.__mealDither = (value) => {
    try {
      if (
        !Number.isFinite(value.pr) ||
        value.pr < 0 ||
        value.pr > 1 ||
        value.step !== Math.floor(value.pr * 72) ||
        !Number.isFinite(value.prepareMs) ||
        value.prepareMs < 0 ||
        !Number.isFinite(value.startedAt) ||
        !Number.isFinite(value.durationMs)
      )
        throw new Error('invalid actual dither output')
      const previous = dithers.at(-1)
      if (
        !previous ||
        previous.value.startedAt !== value.startedAt ||
        previous.value.step !== value.step
      )
        append(dithers, { source: 'render:dither-output', phase: inputPhase, value }, 256)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__mealArmSaveCapture = (phase, slot) => {
    if (typeof phase !== 'string' || !phase || !Number.isInteger(slot))
      throw new Error('invalid save observation arm')
    armedSave = { id: saveArmId++, phase, slot }
    return structuredClone(armedSave)
  }
  globalThis.__mealGameSaving = (slot, gs) => {
    try {
      for (const key of [
        'party',
        'partyMembers',
        'PlayerRolesRuntime',
        'inventory',
        'rgScene',
        'rgObject',
        'rgEventObject',
        'allEventObjects',
      ])
        if (gs[key] === undefined) throw new Error(`missing save input ${key}`)
      const world = JSON.parse(
        JSON.stringify({
          scene: gs.wNumScene,
          party: gs.party,
          members: gs.partyMembers,
          roles: gs.PlayerRolesRuntime,
          cash: gs.dwCash,
          inventory: gs.inventory,
          scenes: gs.rgScene,
          objects: gs.rgObject,
          eventObjects: gs.rgEventObject,
          actors: gs.allEventObjects.map(
            ({
              id,
              x,
              y,
              sState,
              facing,
              triggerLabel,
              triggerResume,
              triggerMode,
              spriteNum,
              autoTriggerOnce,
            }) => ({
              id,
              x,
              y,
              sState,
              facing,
              triggerLabel,
              triggerResume,
              triggerMode,
              spriteNum,
              autoTriggerOnce,
            }),
          ),
        }),
      )
      const seq = saveCaptures.length
      append(
        saveCaptures,
        { source: 'before:Save.saveSlot:deepClone', slot, arm: armedSave, world },
        8,
      )
      return seq
    } catch (error) {
      fail(error)
      return undefined
    }
  }
  globalThis.__mealGameRestored = (gs) => {
    try {
      append(
        gameRestores,
        {
          source: 'commit:loadGameFromSlot',
          payload: { format: 'type-pal-save', gs: JSON.parse(JSON.stringify(gs)) },
        },
        1,
      )
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__mealGameSaved = (captureSeq) => {
    try {
      const captured = saveCaptures[captureSeq]
      if (!captured || saveCompletions.some((entry) => entry.captureSeq === captureSeq))
        throw new Error('unmatched or duplicated save completion')
      append(
        saveCompletions,
        { source: 'commit:Save.saveSlot', captureSeq, slot: captured.slot, arm: captured.arm },
        8,
      )
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__mealMenu = (engine, menu) => {
    try {
      if (JSON.stringify(menu) !== JSON.stringify(latestMenu)) {
        append(menus, { engine, source: 'render:menu', menu }, 600)
        latestMenu = structuredClone(menu)
      }
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__mealDispatch = (engine, request) => {
    try {
      append(dispatches, { engine, source: 'commit:item-use-dispatch', request }, 12)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__mealPartyFrame = (engine, value) => {
    try {
      if (!final) return
      const frame = { scene: final.scene, ...value }
      if (JSON.stringify(frames.at(-1)?.frame) !== JSON.stringify(frame))
        append(frames, { engine, source: 'render:party-frame', frame }, 4000)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__mealRestoreCommitted = (payload, inputPayload, loadId) => {
    try {
      append(restoreCommits, { source: 'commit:restorePayload', payload, inputPayload, loadId }, 1)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__mealRendered = (page) => {
    try {
      rendered('reforge', page && page.phase !== 'typing' ? causal.reforgePage(page) : null)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__mealGame = (gs, source, renderEvidence) => {
    if (gs)
      globalThis.__e2eSceneBoundary({
        scene: `s${String(gs.wNumScene - 1).padStart(3, '0')}`,
        instance: gs.npcs,
        tick: gs.frameNum,
      })
    try {
      if (!gs || ![2, 4].includes(gs.wNumScene)) return
      const scene = gs.wNumScene === 2 ? 's001' : 's003'
      const facingDir = { down: 0, left: 1, up: 2, right: 3 }
      const renderedNpcFrame = (e) => {
        let local = e.scriptedFrame ?? 0
        const framesPerDir = e.nSpriteFrames
        if (framesPerDir === 3) {
          if (local === 2) local = 0
          else if (local === 3) local = 2
        }
        return framesPerDir > 0 ? (facingDir[e.facing] ?? 0) * framesPerDir + local : local
      }
      const actor = (id) => {
        const e = gs.allEventObjects.find((e) => e.id === id)
        if (!e) throw new Error(`missing meal actor ${id}`)
        return {
          position: [e.x, e.y],
          facing: e.facing,
          visible: e.sState > 0,
          state: e.sState,
          sprite: e.spriteNum,
          scriptedFrame: e.scriptedFrame ?? 0,
          frame: renderedNpcFrame(e),
          trigger: e.triggerLabel ?? null,
          resume: e.triggerResume ?? null,
          auto: e.autoLabel ?? null,
          autoIp: e.autoCursor?.ip ?? null,
          triggerMode: e.triggerMode,
        }
      }
      point(source, {
        tick: gs.frameNum ?? null,
        renderEvidence: renderEvidence ?? null,
        scene,
        actors: {
          party: {
            position: [gs.party.x, gs.party.y],
            facing: gs.party.facing,
            visible: true,
            walking: gs.walkingFrame.walking,
            stepFrame: gs.walkingFrame.stepFrame,
            layer: gs.wLayer,
            sprite: gs.PlayerRolesRuntime.rgwSpriteNum[gs.partyMembers[0]],
            ip: gs.eventCursor?.ip ?? null,
          },
          ...Object.fromEntries(gs.npcs.map((e) => [`e${e.id}`, actor(e.id)])),
        },
        money: gs.dwCash,
        inventory: gs.inventory,
        persistent: Object.fromEntries(
          [15, 16, 19, 20, 24, 25, 26, 56, 59, 60, 61, 62].map((id) => [`e${id}`, actor(id)]),
        ),
        control: gs.mode === 'explore' && !gs.eventCursor && !gs.dialogBox && !gs.sceneLoading,
        ...globalThis.__routeGameReadiness?.(gs),
      })
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__mealGameRendered = (gs) => {
    try {
      if (!gs || ![2, 4].includes(gs.wNumScene)) return
      const top = gs.menuStack?.at(-1)
      globalThis.__mealMenu('game', {
        active: gs.mode === 'menu' && !!top,
        kind: top?.kind ?? null,
        ids: top?.state?.selection?.items?.map((i) => String(i.id)) ?? [],
        cursor: top?.state?.cursor ?? top?.state?.selection?.cursor ?? null,
        phase: top?.state?.phase ?? null,
        itemIds: top?.state?.inventory?.map((i) => String(i.itemId)) ?? [],
      })
      const d = gs.dialogBox
      if (!d) {
        rendered('game', null)
        return
      }
      const lines = [...d.shownLines]
      if (
        d.currentLineText !== null &&
        (d.style === 'narration' || d.charsRevealed >= d.currentLineText.length)
      )
        lines.push(d.currentLineText)
      rendered(
        'game',
        lines.length
          ? {
              instance: causal.gamePageId(d),
              lines,
              title: d.titleText ?? null,
              slot: d.style,
            }
          : null,
      )
    } catch (error) {
      fail(error)
    }
  }
  const causal = createCausalObserver?.({
    append,
    fail,
    scenes: ['s001', 's003'],
    snapshotGame: globalThis.__mealGame,
    context: () => ({
      scene: observedScene,
      sceneVisit,
      tick: observedTick,
      renderId: worldRenders.at(-1)?.renderId ?? null,
      poses: Object.fromEntries(
        [...prior]
          .filter(([key]) => key === 'party' || key.startsWith(`${sceneVisit}/${observedScene}/`))
          .map(([key, state]) => [
            key.split('/').at(-1),
            { state, commitOrder: commitOrders.get(key) },
          ]),
      ),
    }),
  })
  globalThis.__readMealRouteEvidence = () =>
    structuredClone({
      events: events.filter((e) => e.kind === 'actor' && e.id === 'party'),
      errors,
      overflow,
    })
  // Resolve on actual world draws after the native automatic terminal, not on a
  // sampled coordinate or an arbitrary delay. Arming also checks the latest draw.
  globalThis.__mealWaitActorRender = (request) =>
    new Promise((resolve, reject) => {
      const finish = (error, value) => {
        clearTimeout(timer)
        renderWaiters.delete(waiter)
        if (error) reject(error)
        else resolve(structuredClone(value))
      }
      const waiter = {
        check: () => {
          if (overflow || errors.length) return finish(new Error('meal completion observer failed'))
          const value = renderedCompletion(request)
          if (value) finish(null, value)
        },
      }
      const timer = setTimeout(
        () => finish(new Error('automatic return did not complete and render')),
        5000,
      )
      renderWaiters.add(waiter)
      waiter.check()
    })
  globalThis.__readMealEvidence = () =>
    structuredClone({
      events,
      worldRenders,
      pages,
      frames,
      menus,
      dispatches,
      saveCaptures,
      saveCompletions,
      latestMenu,
      restoreCommits,
      gameRestores,
      inputs,
      phases,
      dithers,
      causes: causal?.read() ?? [],
      resources: recorder.resources(),
      errors,
      overflow,
      final,
    })
  globalThis.__readMealStatus = () =>
    structuredClone({
      order: order - 1,
      taoist: final?.persistent.e62 ?? null,
      dispatches,
      errors,
      overflow,
    })
  globalThis.__readMealPhaseEvidence = () =>
    structuredClone({ order: order - 1, events, pages, frames, phases, errors, overflow })
  // Only the rendered pages needed to decide a confirmation cross the hot-path RPC.
  // Phase checks read their exact event/page/frame projection; final acceptance still
  // requires the complete archive, including causal evidence and resource bindings.
  globalThis.__readMealDrive = (afterOrder = order - 1) =>
    structuredClone({
      order: order - 1,
      pages: pages.filter((page) => page.order > afterOrder),
      latestMenu,
      latestFrame: frames.at(-1) ?? null,
      aunt: final?.actors.e19
        ? { facing: final.actors.e19.facing, frame: final.actors.e19.frame }
        : null,
      errors,
      overflow,
    })
}

export function readMealGame() {
  const gs = window.__tpgs
  const actor = (id) => {
    const e = gs?.allEventObjects.find((e) => e.id === id)
    return e
      ? {
          id: `e${id}`,
          position: [e.x, e.y],
          visible: e.sState > 0,
          state: e.sState,
          trigger: e.triggerLabel,
          resume: e.triggerResume,
        }
      : null
  }
  const menu = gs?.menuStack?.at(-1)
  return {
    scene: gs?.wNumScene,
    position: gs ? [gs.party.x, gs.party.y] : null,
    facing: gs?.party.facing,
    cash: gs?.dwCash,
    inventory: gs?.inventory,
    mode: gs?.mode,
    event: !!gs?.eventCursor,
    loading: !!gs?.sceneLoading,
    fading: !!(gs?.needToFadeIn || gs?.paletteFadeState || gs?.fadeState || gs?.blackScreenHold),
    dialog: gs?.dialogBox
      ? {
          phase: gs.dialogBox.phase,
          text: gs.dialogBox.currentLineText,
          title: gs.dialogBox.titleText,
        }
      : null,
    menu: menu ? { kind: menu.kind, cursor: menu.state?.selection?.cursor } : null,
    menuView: window.__readMealDrive?.().latestMenu,
    actors: Object.fromEntries(
      [15, 16, 19, 20, 24, 25, 26, 56, 62].map((id) => [`e${id}`, actor(id)]),
    ),
    routeActors:
      gs?.npcs
        .filter((e) => e.sState >= 2)
        .map((e) => ({
          col: (e.x / 16 + e.y / 8) / 2,
          row: (e.y / 8 - e.x / 16) / 2,
          collide: true,
        })) ?? [],
  }
}

export function readMealReforge() {
  const runtime = window.__tpObserve?.readRuntime?.(),
    scene = window.__rfScene,
    world = window.__rfWorld
  return {
    boot: window.__tpObserve?.readBoot?.(),
    menuView: window.__readMealDrive?.().latestMenu,
    runtime,
    scene: runtime?.sceneId,
    position: runtime
      ? [runtime.position.col, runtime.position.row, runtime.position.height]
      : null,
    facing: runtime?.facing,
    cash: world?.money,
    inventory: world?.inventory,
    actors: Object.fromEntries(
      (scene?.entities ?? [])
        .filter((e) =>
          ['e15', 'e16', 'e19', 'e20', 'e24', 'e25', 'e26', 'e56', 'e62'].includes(e.id),
        )
        .map((e) => [
          e.id,
          { id: e.id, position: [e.pos.col, e.pos.row, e.pos.height], visible: !e.hidden },
        ]),
    ),
    routeActors:
      scene?.entities
        .filter((e) => !e.hidden && e.collide)
        .map((e) => ({ col: e.pos.col, row: e.pos.row, collide: true })) ?? [],
  }
}

/** Actual live world and position only. This is not a save export or a restore input. */
export function readMealReforgeEndWorld() {
  const runtime = window.__tpObserve.readRuntime()
  if (!runtime || !window.__rfWorld) throw new Error('missing actual meal end world')
  return structuredClone({
    world: window.__rfWorld,
    position: { sceneId: runtime.sceneId, ...runtime.position, facing: runtime.facing },
  })
}
