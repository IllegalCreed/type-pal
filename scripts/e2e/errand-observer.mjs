import { createEvidenceRecorder } from './evidence-recorder.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'
import { createSnapshotGraph } from './snapshot-graph.mjs'

export function errandCausalObserverScript() {
  return `(${installErrandObserver})(${createScriptCausalObserver}, ${createEvidenceRecorder}, ${createSnapshotGraph})`
}

/** Sparse committed state plus actual rendered dialogue. No runtime writes. */
export function installErrandObserver(createCausalObserver, createRecorder, createGraph) {
  const snapshots = createGraph()
  const sceneLifecyclePhases = {
    'commit:scene-materialized': 'materialized',
    'before:scene-projection': 'projecting',
    'commit:scene-ready': 'ready',
    'failed:scene-projection': 'failed',
  }
  // Independent per-frame clock capacity: 240 seconds at up to 250 draws/second.
  // Long scene traversals retain up to 200,000 state changes; byte budgets also apply.
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
    appendObserved({
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
    })
    if (events.length > before) renderSpans.set(key, events.at(-1))
  }

  const events = [],
    pages = [],
    restoreCommits = [],
    gameRestores = [],
    saveCaptures = [],
    saveCompletions = [],
    errors = [],
    inputs = []
  const prior = new Map(),
    commitOrders = new Map()
  let final = null,
    order = 0,
    overflow = false,
    control,
    controlReceipt,
    overflowDetails = null,
    attempted = null
  const recorder = createRecorder({
    // 005/006 traverse several scenes and keep complete NPC/restore evidence.
    // This is a byte budget only; no events or overflow failures are filtered.
    budgets: {
      events: 64 * 1024 * 1024,
      causes: 96 * 1024 * 1024,
      atomicSnapshots: 32 * 1024 * 1024,
    },
    context: (value) => ({
      atMs: pointRender?.atMs ?? performance.now(),
      ...(['actor', 'actor-render', 'control', 'scene'].includes(value.kind)
        ? { sceneVisit, tick: observedTick, renderId: pointRender?.renderId ?? null }
        : {}),
    }),
    errors,
    onOverflow: () => {
      overflow = true
      overflowDetails ??= {
        attempted,
        byteSizes: recorder.byteSizes(),
        snapshots: snapshots.stats(),
      }
    },
  })
  const fail = recorder.fail
  const recordSpriteFrame = globalThis.__e2eRecordSpriteFrame
  globalThis.__e2eRecordSpriteFrame = (frame) => (overflow ? null : recordSpriteFrame(frame))
  const append = (list, value, limit = 200_000, causalRecord = false) => {
    if (overflow) return
    attempted = { kind: value.kind, count: list.length, limit }
    let packed
    try {
      packed = causalRecord ? snapshots.pack(value) : value
    } catch (error) {
      fail(error)
      overflow = true
      overflowDetails = { attempted, reason: String(error), snapshots: snapshots.stats() }
      return
    }
    const event = recorder.append(list, packed, limit)
    attempted = null
    order = recorder.nextOrder
    return event
  }
  const appendObserved = (value) => append(events, value)
  // Persistent actor snapshots are large and mostly unchanged on each boat step. Store a
  // lossless key delta internally; exported progress events retain their full before/state DTO.
  const progressDelta = (before, state) => {
    const delta = {}
    for (const field of ['money', 'persistent', 'hooks']) {
      if (JSON.stringify(before?.[field]) === JSON.stringify(state[field])) continue
      if (field === 'money') {
        delta.money = state.money
        continue
      }
      const old = before?.[field] ?? {},
        next = state[field] ?? {}
      delta[field] = {
        set: Object.fromEntries(
          Object.entries(next).filter(
            ([key, value]) => JSON.stringify(old[key]) !== JSON.stringify(value),
          ),
        ),
        removed: Object.keys(old).filter((key) => !Object.hasOwn(next, key)),
      }
    }
    return delta
  }
  const point = (source, state) => {
    if (overflow) return
    try {
      startPoint(source, state)
      if (!['s001', 's002', 's003', 's004', 's005', 's014'].includes(state.scene)) return
      const newVisit = reportedVisit !== sceneVisit
      if (newVisit) {
        reportedVisit = sceneVisit
        appendObserved({ kind: 'scene', source, scene: state.scene })
      }
      for (const [id, actor] of Object.entries(state.actors)) {
        const key = id === 'party' ? 'party' : `${sceneVisit}/${state.scene}/${id}`,
          before = prior.get(key)
        if (
          before &&
          JSON.stringify(before.position) !== JSON.stringify(actor.position) &&
          !source.startsWith('commit:') &&
          !source.startsWith('tick:') &&
          !source.startsWith('before:')
        )
          fail(`unobserved committed move ${key} at ${source}`)
        if (
          (id === 'party' && (newVisit || source === 'commit:refreshRuntimeProjection')) ||
          JSON.stringify(before) !== JSON.stringify(actor)
        ) {
          const committed = appendObserved({
            kind: 'actor',
            source,
            scene: state.scene,
            id,
            before: before ?? null,
            state: actor,
          })
          if (committed) {
            prior.set(key, structuredClone(actor))
            commitOrders.set(key, committed.order)
          }
        }
        if (source === 'render:world') retainRender(source, state, id, actor)
      }
      const phase = Object.hasOwn(sceneLifecyclePhases, source)
        ? sceneLifecyclePhases[source]
        : null
      if (phase)
        appendObserved({
          kind: 'scene-lifecycle',
          phase,
          source,
          scene: state.scene,
          sceneVisit,
          tick: observedTick,
        })
      if (control !== state.control) {
        controlReceipt = appendObserved({
          kind: 'control',
          scene: state.scene,
          source,
          before: control ?? null,
          state: state.control,
        })
        control = state.control
      }
      const progress = { money: state.money, persistent: state.persistent, hooks: state.hooks }
      if (JSON.stringify(prior.get('progress')) !== JSON.stringify(progress)) {
        append(events, {
          kind: 'progress',
          source,
          scene: state.scene,
          delta: progressDelta(prior.get('progress'), progress),
        })
        prior.set('progress', structuredClone(progress))
      }
      final = structuredClone(state)
      globalThis.__routeObserve?.(source, { ...state, sceneVisit })
    } catch (error) {
      fail(error)
    } finally {
      pointRender = null
    }
  }
  const rendered = (engine, page) => {
    if (!final) return
    if (
      pages.at(-1)?.sceneVisit !== sceneVisit ||
      JSON.stringify(pages.at(-1)?.page) !== JSON.stringify(page)
    )
      append(
        pages,
        {
          kind: 'page',
          engine,
          scene: final.scene,
          sceneVisit,
          page,
          actors: final.actors,
          control: final.control,
        },
        800,
      )
  }
  globalThis.__errandPoint = point
  globalThis.__errandError = fail
  globalThis.__errandRestoreCommitted = (payload, inputPayload, loadId) =>
    append(restoreCommits, { payload, inputPayload, loadId, source: 'commit:restorePayload' }, 1)
  const gamePayload = (gs) => ({ format: 'type-pal-save', gs: JSON.parse(JSON.stringify(gs)) })
  globalThis.__errandGameRestored = (gs) =>
    append(gameRestores, { payload: gamePayload(gs), source: 'commit:loadGameFromSlot' }, 1)
  globalThis.__errandGameSaving = (slot, gs) => {
    const seq = saveCaptures.length
    append(
      saveCaptures,
      { slot, payload: gamePayload(gs), source: 'before:Save.saveSlot:deepClone' },
      3,
    )
    return seq
  }
  globalThis.__errandGameSaved = (captureSeq) =>
    append(saveCompletions, { captureSeq, source: 'commit:Save.saveSlot' }, 3)
  globalThis.__errandRendered = (page) => {
    try {
      rendered('reforge', page && page.phase !== 'typing' ? causal.reforgePage(page) : null)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__errandGame = (gs, source, renderEvidence) => {
    if (gs)
      globalThis.__e2eSceneBoundary({
        scene: `s${String(gs.wNumScene - 1).padStart(3, '0')}`,
        instance: gs.npcs,
        tick: gs.frameNum,
      })
    if (!gs || ![2, 3, 4, 5, 6, 15].includes(gs.wNumScene)) return
    try {
      const actor = (e) => ({
        position: [e.x, e.y],
        facing: e.facing,
        visible: e.sState > 0,
        state: e.sState,
        sprite: e.spriteNum,
        frame: e.scriptedFrame ?? 0,
        trigger: e.triggerLabel ?? null,
        resume: e.triggerResume ?? null,
        auto: e.autoLabel ?? null,
        autoIp: e.autoCursor?.ip ?? null,
        triggerMode: e.triggerMode,
      })
      const trackedNpcs = gs.npcs.concat(
        gs.allEventObjects.find((e) => e.id === 203 && !gs.npcs.some((npc) => npc.id === 203)) ??
          [],
      )
      point(source, {
        tick: gs.frameNum ?? null,
        renderEvidence: renderEvidence ?? null,
        scene: `s${String(gs.wNumScene - 1).padStart(3, '0')}`,
        actors: {
          party: {
            position: [gs.party.x, gs.party.y],
            facing: gs.party.facing,
            visible: true,
            walking: gs.walkingFrame.walking,
            sprite: gs.PlayerRolesRuntime.rgwSpriteNum[gs.partyMembers[0]],
            scriptedFrame: gs.partyScriptedFrame[0] ?? null,
          },
          ...Object.fromEntries(trackedNpcs.map((e) => [`e${e.id}`, actor(e)])),
        },
        persistent: Object.fromEntries(
          gs.allEventObjects
            .filter((e) =>
              [
                19, 35, 36, 44, 59, 60, 61, 62, 83, 84, 94, 95, 115, 116, 117, 123, 124, 127, 203,
              ].includes(e.id),
            )
            .map((e) => [`e${e.id}`, actor(e)]),
        ),
        hooks: gs.sceneOnEnterOverride ?? {},
        money: gs.dwCash,
        control: gs.mode === 'explore' && !gs.eventCursor && !gs.dialogBox && !gs.sceneLoading,
        ...globalThis.__routeGameReadiness?.(gs),
      })
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__errandGameRendered = (gs) => {
    try {
      if (!gs || ![2, 3, 4, 5, 6, 15].includes(gs.wNumScene)) return
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
  for (const type of ['keydown', 'keyup'])
    globalThis.addEventListener(type, (event) => {
      if (
        ['Enter', 'Escape', 'F5', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
          event.key,
        )
      )
        append(inputs, { type, key: event.key, repeat: event.repeat }, 2000)
    })
  const causal = createCausalObserver?.({
    // Some causal payloads have kind=command (runtime-wait-consumed). Store the
    // complete actual causal stream, not a selection by its payload discriminant.
    append: (list, value, limit) => append(list, value, limit, true),
    fail,
    scenes: ['s001', 's002', 's003', 's004', 's005', 's014'],
    snapshotGame: globalThis.__errandGame,
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
  globalThis.__readErrandRouteEvidence = () =>
    structuredClone({
      events: events.filter((e) => e.kind === 'actor' && e.id === 'party'),
      errors,
      overflow,
    })
  globalThis.__readErrandStatus = () =>
    structuredClone({
      final,
      errors,
      overflow,
      overflowDetails,
      byteSizes: recorder.byteSizes(),
      snapshots: snapshots.stats(),
      saveCaptures: saveCaptures.length,
      saveCompletions: saveCompletions.length,
    })
  globalThis.__readErrandArchive = () =>
    structuredClone({
      events,
      worldRenders,
      pages,
      restoreCommits,
      gameRestores,
      saveCaptures,
      saveCompletions,
      inputs,
      causes: causal?.read() ?? [],
      evidenceFormat: 'snapshot-graph/1',
      snapshotNodes: snapshots.nodes,
      resources: recorder.resources(),
      errors,
      overflow,
      overflowDetails,
      final,
      order: order - 1,
      byteSizes: recorder.byteSizes(),
    })
  globalThis.__readErrandEvidence = () => {
    const { evidenceFormat: _, snapshotNodes, ...trace } = globalThis.__readErrandArchive()
    trace.causes = snapshots.unpack(trace.causes, snapshotNodes)
    trace.events = snapshots.expandProgress(trace.events)
    return structuredClone(trace)
  }
  globalThis.__readErrandNpcTrace = (ids) => {
    const selected = new Set(['party', ...(Array.isArray(ids) ? ids : [])])
    return structuredClone({
      resources: recorder.resources(),
      worldRenders,
      events: events.filter(
        (event) =>
          ['scene', 'scene-lifecycle', 'control'].includes(event.kind) || selected.has(event.id),
      ),
      pages,
      causes: snapshots.unpack(causal?.read() ?? [], snapshots.nodes),
      errors,
      overflow,
      sourceOverflow: overflow,
      order: order - 1,
    })
  }
  globalThis.__readErrandDrive = (after) =>
    structuredClone({
      pages: pages.filter((p) => p.order > after),
      control: controlReceipt,
      worldRender: worldRenders.at(-1),
      errors,
      overflow,
      order: order - 1,
    })
}

export function readErrandGame() {
  const gs = window.__tpgs,
    menu = gs?.menuStack?.at(-1)
  return {
    scene: gs?.wNumScene,
    position: gs ? [gs.party.x, gs.party.y] : null,
    facing: gs?.party.facing,
    cash: gs?.dwCash,
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
    actors: Object.fromEntries(
      (gs?.allEventObjects ?? [])
        .filter((e) => [18, 19, 44, 53, 62, 83, 84, 95, 115, 123, 124, 127].includes(e.id))
        .map((e) => [
          `e${e.id}`,
          {
            position: [e.x, e.y],
            facing: e.facing,
            visible: e.sState > 0,
            state: e.sState,
            sprite: e.spriteNum,
            frame: e.scriptedFrame ?? 0,
            triggerMode: e.triggerMode,
            anchor: [e.autoTriggerAnchorX ?? e.x, e.autoTriggerAnchorY ?? e.y],
            trigger: e.triggerLabel,
            resume: e.triggerResume,
          },
        ]),
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

export function readErrandReforge() {
  const runtime = window.__tpObserve?.readRuntime?.(),
    scene = window.__rfScene
  return {
    boot: window.__tpObserve?.readBoot?.(),
    runtime,
    scene: runtime?.sceneId,
    position: runtime
      ? [runtime.position.col, runtime.position.row, runtime.position.height]
      : null,
    facing: runtime?.facing,
    cash: window.__rfWorld?.money,
    actors: Object.fromEntries(
      (scene?.entities ?? []).map((e) => [
        e.id,
        {
          position: [e.pos.col, e.pos.row, e.pos.height],
          facing: e.facing ?? 'down',
          visible: !e.hidden,
          sprite: e.sprite ?? e.actor ?? null,
          frame: window.__tpEntityFrames?.[e.id] ?? null,
          // __rfScene is the live projection: this single page already resolves canonical
          // behavior/page/activation overrides in refreshSceneViewBindings.
          activation: e.pages?.[0]?.trigger
            ? { on: e.pages[0].trigger.on, range: e.pages[0].trigger.range }
            : null,
        },
      ]),
    ),
    routeActors:
      scene?.entities
        .filter((e) => !e.hidden && e.collide)
        .map((e) => ({ col: e.pos.col, row: e.pos.row, collide: true })) ?? [],
  }
}

/** 006-only first-stage projection; keep the 005 observer shape stable. */
export function readBoatGame() {
  const gs = window.__tpgs,
    menu = gs?.menuStack?.at(-1),
    ids = [
      18, 19, 32, 35, 36, 44, 49, 53, 59, 60, 61, 62, 83, 84, 94, 95, 115, 116, 117, 123, 124, 127,
      203,
    ]
  return {
    scene: gs?.wNumScene,
    position: gs ? [gs.party.x, gs.party.y] : null,
    facing: gs?.party.facing,
    cash: gs?.dwCash,
    mode: gs?.mode,
    event: !!gs?.eventCursor,
    triggerOwner: gs?.eventCursor?.triggerOwnerId,
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
    actors: Object.fromEntries(
      (gs?.allEventObjects ?? [])
        .filter((e) => ids.includes(e.id))
        .map((e) => [
          `e${e.id}`,
          {
            position: [e.x, e.y],
            facing: e.facing,
            visible: e.sState > 0,
            state: e.sState,
            sprite: e.spriteNum,
            frame: e.scriptedFrame ?? 0,
            triggerMode: e.triggerMode,
            anchor: [e.autoTriggerAnchorX ?? e.x, e.autoTriggerAnchorY ?? e.y],
            trigger: e.triggerLabel,
            resume: e.triggerResume,
          },
        ]),
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
