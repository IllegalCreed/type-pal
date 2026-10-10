import { evidenceObserverScript } from './evidence-recorder.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'

/** One init script preserves setup order in each fresh browser context. */
export function innCausalObserverScript() {
  return evidenceObserverScript(installInnObserver, createScriptCausalObserver)
}

/** Detached, bounded evidence at actual production commit/render boundaries. Never advances a game. */
export function installInnObserver(createCausalObserver, createRecorder) {
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
      6000,
    )
    if (events.length > before) renderSpans.set(key, events.at(-1))
  }

  const events = [],
    pages = [],
    restoreCommits = [],
    errors = [],
    previous = new Map(),
    commitOrders = new Map(),
    sources = {},
    previousRooms = new Map()
  let sample = 0,
    overflow = false,
    scene = null,
    money,
    control,
    final = null
  const recorder = createRecorder({
    // Full frame-selection inputs and command-kind runtime receipts share this storage group.
    // Capacity only: preserve every receipt and the existing hard count/overflow checks.
    budgets: { events: 32 * 1024 * 1024 },
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
  const append = recorder.append
  const record = (source, state) => {
    try {
      startPoint(source, state)
      if (!['s001', 's002', 's003', 's004', 's005', 's014'].includes(state.scene)) return
      sample++
      sources[source] = (sources[source] ?? 0) + 1
      if (reportedVisit !== sceneVisit) {
        reportedVisit = sceneVisit
        append(events, { kind: 'scene', scene: state.scene, source }, 6000)
        scene = state.scene
      }
      for (const [id, actor] of Object.entries(state.actors)) {
        if (!actor.position.every(Number.isFinite)) throw new Error(`invalid inn actor ${id}`)
        const key = `${sceneVisit}/${state.scene}/${id}`,
          before = previous.get(key)
        if (
          before &&
          JSON.stringify(before.position) !== JSON.stringify(actor.position) &&
          !source.startsWith('commit:') &&
          !source.startsWith('tick:')
        )
          fail(`unobserved committed move ${key} at ${source}`)
        if (JSON.stringify(before) !== JSON.stringify(actor)) {
          const committed = append(
            events,
            { kind: 'actor', scene: state.scene, id, source, before: before ?? null, state: actor },
            6000,
          )
          if (committed) {
            previous.set(key, structuredClone(actor))
            commitOrders.set(key, committed.order)
          }
        }
        if (source === 'render:world') retainRender(source, state, id, actor)
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
          6000,
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
          6000,
        )
        control = state.control
      }
      if (money !== state.money) {
        append(events, { kind: 'money', source, value: state.money }, 6000)
        money = state.money
      }
      for (const room of state.roomActors) {
        const before = previousRooms.get(room.id)
        if (JSON.stringify(before) !== JSON.stringify(room)) {
          append(
            events,
            { kind: 'roomActor', id: room.id, source, before: before ?? null, state: room },
            6000,
          )
          previousRooms.set(room.id, structuredClone(room))
        }
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
    try {
      if (scene !== 's003') return
      if (
        pages.at(-1)?.sceneVisit !== sceneVisit ||
        JSON.stringify(pages.at(-1)?.page) !== JSON.stringify(page)
      )
        append(pages, { kind: 'page', engine, scene, sceneVisit, page }, 600)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__innPoint = record
  globalThis.__innError = fail
  globalThis.__innRestoreCommitted = (payload, inputPayload, loadId) => {
    try {
      append(restoreCommits, { source: 'commit:restorePayload', payload, inputPayload, loadId }, 2)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__innRendered = (page) => {
    try {
      rendered('reforge', page && page.phase !== 'typing' ? causal.reforgePage(page) : null)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__innGame = (gs, source, renderEvidence) => {
    if (gs)
      globalThis.__e2eSceneBoundary({
        scene: `s${String(gs.wNumScene - 1).padStart(3, '0')}`,
        instance: gs.npcs,
        tick: gs.frameNum,
      })
    try {
      if (!gs || ![2, 3, 4, 5, 6, 15].includes(gs.wNumScene)) return
      const actors = {
        party: {
          position: [gs.party.x, gs.party.y],
          facing: gs.party.facing,
          visible: true,
          sprite: gs.PlayerRolesRuntime?.rgwSpriteNum?.[gs.partyMembers?.[0]] ?? null,
        },
      }
      for (const e of gs.npcs) {
        actors[`e${e.id}`] = {
          position: [e.x, e.y],
          facing: e.facing,
          visible: e.sState > 0,
          state: e.sState,
          frame: e.scriptedFrame ?? 0,
          sprite: e.spriteNum,
          trigger: e.triggerLabel ?? null,
          resume: e.triggerResume ?? null,
          auto: e.autoLabel ?? null,
          autoIp: e.autoCursor?.ip ?? null,
          triggerMode: e.triggerMode,
        }
      }
      for (const id of [15, 16, 20, 62]) {
        const e = gs.allEventObjects.find((actor) => actor.id === id)
        if (e && !actors[`e${id}`])
          actors[`e${id}`] = {
            position: [e.x, e.y],
            facing: e.facing,
            visible: e.sState > 0,
            state: e.sState,
            frame: e.scriptedFrame ?? 0,
            sprite: e.spriteNum,
            trigger: e.triggerLabel ?? null,
            resume: e.triggerResume ?? null,
            auto: e.autoLabel ?? null,
            autoIp: e.autoCursor?.ip ?? null,
            triggerMode: e.triggerMode,
          }
      }
      record(source, {
        tick: gs.frameNum ?? null,
        renderEvidence: renderEvidence ?? null,
        scene: `s${String(gs.wNumScene - 1).padStart(3, '0')}`,
        actors,
        money: gs.dwCash,
        control: gs.mode === 'explore' && !gs.eventCursor && !gs.dialogBox && !gs.sceneLoading,
        ...globalThis.__routeGameReadiness?.(gs),
        roomActors: [24, 25, 26].map((id) => {
          const e = gs.allEventObjects.find((e) => e.id === id)
          return { id: `e${id}`, visible: e?.sState > 0, state: e?.sState }
        }),
      })
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__innGameRendered = (gs) => {
    try {
      if (gs?.wNumScene !== 4) return
      if (!gs.dialogBox) {
        rendered('game', null)
        return
      }
      const d = gs.dialogBox,
        lines = [...d.shownLines]
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
    snapshotGame: globalThis.__innGame,
    context: () => ({
      scene: observedScene,
      sceneVisit,
      tick: observedTick,
      renderId: worldRenders.at(-1)?.renderId ?? null,
      poses: Object.fromEntries(
        [...previous]
          .filter(([key]) => key.startsWith(`${sceneVisit}/${observedScene}/`))
          .filter(([key]) =>
            ['party', 'e54', 'e55', 'e56', 'e59', 'e60', 'e61', 'e73', 'e74'].includes(
              key.split('/').at(-1),
            ),
          )
          .map(([key, state]) => [
            key.split('/').at(-1),
            { state, commitOrder: commitOrders.get(key) },
          ]),
      ),
    }),
  })
  // Live driving must not clone/transport the ever-growing causal and pixel archives.
  // Export those once for verification; the progress projection is still detached.
  globalThis.__readInnProgress = () =>
    structuredClone({
      final,
      pages,
      eventCount: events.length,
      order: recorder.nextOrder - 1,
      errors,
      overflow,
    })
  globalThis.__readInnEvidence = () =>
    structuredClone({
      events,
      worldRenders,
      pages,
      causes: causal?.read() ?? [],
      resources: recorder.resources(),
      restoreCommits,
      errors,
      overflow,
      sources,
      final,
    })
}

export function gameRouteActors(npcs = [], allEventObjects = []) {
  const hiddenNpcIds = new Set(
    allEventObjects.filter((e) => !(e.sState > 0) || (e.sVanishTime ?? 0) !== 0).map((e) => e.id),
  )
  return npcs
    .filter((e) => e.sState >= 2 && (e.sVanishTime ?? 0) === 0 && !hiddenNpcIds.has(e.id))
    .map((e) => ({
      col: (e.x / 16 + e.y / 8) / 2,
      row: (e.y / 8 - e.x / 16) / 2,
      collide: true,
    }))
}

export function readInnGame() {
  const gs = window.__tpgs
  const hiddenNpcIds = new Set(
    (gs?.allEventObjects ?? [])
      .filter((e) => !(e.sState > 0) || (e.sVanishTime ?? 0) !== 0)
      .map((e) => e.id),
  )
  const hiddenNpcPositions = new Set(
    (gs?.allEventObjects ?? [])
      .filter((e) => [59, 60, 61].includes(e.id) && !(e.sState > 0))
      .map((e) => `${e.x}:${e.y}`),
  )
  return {
    ready: !!gs,
    scene: gs?.wNumScene,
    position: gs ? [gs.party.x, gs.party.y] : null,
    facing: gs?.party?.facing ?? null,
    cash: gs?.dwCash,
    mode: gs?.mode,
    frame: gs?.frameNum,
    dialog: gs?.dialogBox
      ? {
          phase: gs.dialogBox.phase,
          text: gs.dialogBox.currentLineText,
          title: gs.dialogBox.titleText,
        }
      : null,
    event: !!gs?.eventCursor,
    loading: !!gs?.sceneLoading,
    fading: !!(gs?.needToFadeIn || gs?.paletteFadeState || gs?.fadeState || gs?.blackScreenHold),
    menu: gs?.menuStack?.at(-1)
      ? { kind: gs.menuStack.at(-1).kind, cursor: gs.menuStack.at(-1).state?.selection?.cursor }
      : null,
    trio:
      gs?.allEventObjects
        ?.filter((e) => [59, 60, 61].includes(e.id))
        .map((e) => ({
          id: `e${e.id}`,
          visible: e.sState > 0,
          position: [e.x, e.y],
          auto: e.autoLabel,
          resume: e.autoResume,
        })) ?? [],
    roomActors:
      gs?.allEventObjects
        ?.filter((e) => [24, 25, 26].includes(e.id))
        .map((e) => ({ id: `e${e.id}`, visible: e.sState > 0 })) ?? [],
    routeActors:
      gs?.npcs
        ?.filter(
          (e) =>
            e.sState >= 2 &&
            (e.sVanishTime ?? 0) === 0 &&
            !hiddenNpcIds.has(e.id) &&
            !hiddenNpcPositions.has(`${e.x}:${e.y}`),
        )
        .map((e) => ({
          col: (e.x / 16 + e.y / 8) / 2,
          row: (e.y / 8 - e.x / 16) / 2,
          collide: true,
        })) ?? [],
    interactActors:
      gs?.npcs
        ?.filter((e) => e.sState > 0 && e.triggerMode > 0)
        .map((e) => ({
          id: `e${e.id}`,
          position: [e.x, e.y],
          triggerMode: e.triggerMode,
        })) ?? [],
  }
}

export function readInnReforge() {
  const runtime = window.__tpObserve?.readRuntime?.(),
    scene = window.__rfScene,
    world = window.__rfWorld
  return {
    boot: window.__tpObserve?.readBoot?.(),
    runtime,
    scene: runtime?.sceneId,
    position: runtime
      ? [runtime.position.col, runtime.position.row, runtime.position.height]
      : null,
    cash: world?.money,
    actors: Object.fromEntries(
      (scene?.entities ?? []).map((e) => [
        e.id,
        {
          position: [e.pos.col, e.pos.row, e.pos.height],
          facing: e.facing ?? 'down',
          visible: !e.hidden,
        },
      ]),
    ),
    trio:
      scene?.entities
        .filter((e) => ['e59', 'e60', 'e61'].includes(e.id))
        .map((e) => ({
          id: e.id,
          visible: !e.hidden,
          position: [e.pos.col, e.pos.row, e.pos.height],
        })) ?? [],
    roomActors: [24, 25, 26].map((id) => ({
      id: `e${id}`,
      visible: world?.script.entityState?.s001?.[`e${id}`] === 2,
    })),
    script: world?.script,
    routeActors:
      scene?.entities
        .filter((e) => !e.hidden && e.collide)
        .map((e) => ({ col: e.pos.col, row: e.pos.row, collide: true })) ?? [],
  }
}
