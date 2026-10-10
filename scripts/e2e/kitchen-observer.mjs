import { evidenceObserverScript } from './evidence-recorder.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'

export function kitchenCausalObserverScript() {
  return evidenceObserverScript(installKitchenObserver, createScriptCausalObserver)
}

/** Read-only, bounded observations of actual commits and rendered frames. */
export function installKitchenObserver(createCausalObserver, createRecorder) {
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
    restoreCommits = [],
    errors = []
  const prior = new Map(),
    commitOrders = new Map()
  let order = 0,
    sample = 0,
    overflow = false,
    final = null,
    presented = null,
    control
  const recorder = createRecorder({
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
    return event
  }
  const point = (source, state) => {
    try {
      startPoint(source, state)
      if (!['s001', 's003'].includes(state.scene)) return
      sample++
      if (reportedVisit !== sceneVisit) {
        reportedVisit = sceneVisit
        append(events, { kind: 'scene', source, scene: state.scene }, 8000)
      }
      for (const [id, actor] of Object.entries(state.actors)) {
        if (!actor.position.every(Number.isFinite)) throw new Error(`invalid kitchen actor ${id}`)
        const key = `${sceneVisit}/${state.scene}/${id}`,
          before = prior.get(key)
        if (
          before &&
          JSON.stringify(before.position) !== JSON.stringify(actor.position) &&
          !source.startsWith('commit:')
        )
          fail(`unobserved committed move ${key} at ${source}`)
        if (JSON.stringify(before) !== JSON.stringify(actor)) {
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
      globalThis.__routeObserve?.(source, { ...state, sceneVisit })
      if (pointRender) presented = structuredClone(state)
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
  globalThis.__kitchenPoint = point
  globalThis.__kitchenError = fail
  globalThis.__kitchenPartyFrame = (engine, value) => {
    try {
      if (!final) return
      const frame = { scene: final.scene, ...value }
      if (JSON.stringify(frames.at(-1)?.frame) !== JSON.stringify(frame))
        append(frames, { engine, source: 'render:party-frame', frame }, 4000)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__kitchenRestoreCommitted = (payload, inputPayload, loadId) => {
    try {
      append(restoreCommits, { source: 'commit:restorePayload', payload, inputPayload, loadId }, 2)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__kitchenRendered = (page) => {
    try {
      rendered('reforge', page && page.phase !== 'typing' ? causal.reforgePage(page) : null)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__kitchenGame = (gs, source, renderEvidence) => {
    if (gs)
      globalThis.__e2eSceneBoundary({
        scene: `s${String(gs.wNumScene - 1).padStart(3, '0')}`,
        instance: gs.npcs,
        tick: gs.frameNum,
      })
    try {
      if (!gs || ![2, 4].includes(gs.wNumScene)) return
      const scene = gs.wNumScene === 2 ? 's001' : 's003'
      const actor = (id) => {
        const e = gs.allEventObjects.find((e) => e.id === id)
        if (!e) throw new Error(`missing kitchen actor ${id}`)
        let local = e.scriptedFrame ?? 0
        if (e.nSpriteFrames === 3) {
          if (local === 2) local = 0
          else if (local === 3) local = 2
        }
        const frame =
          e.nSpriteFrames > 0
            ? ({ down: 0, left: 1, up: 2, right: 3 }[e.facing] ?? 0) * e.nSpriteFrames + local
            : local
        return {
          position: [e.x, e.y],
          facing: e.facing,
          visible: e.sState > 0,
          state: e.sState,
          sprite: e.spriteNum,
          frame,
          localFrame: e.scriptedFrame ?? 0,
          autoIp: e.autoCursor?.ip ?? null,
          triggerMode: e.triggerMode,
          trigger: e.triggerLabel ?? null,
          resume: e.triggerResume ?? null,
          auto: e.autoLabel ?? null,
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
          ...Object.fromEntries(
            (scene === 's003' ? [56, 59, 60, 61, 62] : [19, 20]).map((id) => [`e${id}`, actor(id)]),
          ),
        },
        money: gs.dwCash,
        inventory: gs.inventory,
        persistent: Object.fromEntries(
          [19, 20, 24, 25, 26, 56, 59, 60, 61, 62].map((id) => [`e${id}`, actor(id)]),
        ),
        control: gs.mode === 'explore' && !gs.eventCursor && !gs.dialogBox && !gs.sceneLoading,
        ...globalThis.__routeGameReadiness?.(gs),
      })
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__kitchenGameRendered = (gs) => {
    try {
      if (!gs || ![2, 4].includes(gs.wNumScene)) return
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
    snapshotGame: globalThis.__kitchenGame,
    context: () => ({
      scene: observedScene,
      sceneVisit,
      tick: observedTick,
      renderId: worldRenders.at(-1)?.renderId ?? null,
      poses: Object.fromEntries(
        [...prior]
          .filter(([key]) => key.startsWith(`${sceneVisit}/${observedScene}/`))
          .filter(([key]) =>
            ['party', 'e19', 'e20', 'e56', 'e59', 'e60', 'e61', 'e62'].includes(
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
  // Frequent journey queries must not serialize the entire growing causal log.
  // Complete evidence remains available, unchanged, for final validation/export.
  globalThis.__readKitchenProgress = () =>
    structuredClone({ final, presented, pages, order: order - 1, errors, overflow })
  globalThis.__readKitchenRouteEvidence = () => structuredClone({ events, errors, overflow })
  globalThis.__readKitchenEvidence = () =>
    structuredClone({
      events,
      worldRenders,
      pages,
      frames,
      causes: causal?.read() ?? [],
      resources: recorder.resources(),
      restoreCommits,
      errors,
      overflow,
      final,
      presented,
    })
}

export function readKitchenGame() {
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
    actors: Object.fromEntries([19, 20, 56, 62].map((id) => [`e${id}`, actor(id)])),
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

export function readKitchenReforge() {
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
    facing: runtime?.facing,
    cash: world?.money,
    inventory: world?.inventory,
    actors: Object.fromEntries(
      (scene?.entities ?? [])
        .filter((e) => ['e19', 'e20', 'e56', 'e62'].includes(e.id))
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
