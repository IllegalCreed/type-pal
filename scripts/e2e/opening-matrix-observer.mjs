import { evidenceObserverScript } from './evidence-recorder.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'

export function openingCausalObserverScript() {
  return evidenceObserverScript(installOpeningMatrix, createScriptCausalObserver)
}

/** Serializable read-only collector, installed only in fresh E2E browser contexts. */
export function installOpeningMatrix(createCausalObserver, createRecorder) {
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
    const before = renders.length
    append(
      renders,
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
      2400,
    )
    if (renders.length > before) renderSpans.set(key, renders.at(-1))
  }

  const actors = [],
    lifecycle = [],
    renders = [],
    controls = [],
    pages = [],
    errors = [],
    sources = {}
  const previous = new Map()
  const commitOrders = new Map()
  let overflow = false
  let lastScene = null
  let sample = 0
  let control
  const recorder = createRecorder({
    context: (value) => ({
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
  globalThis.__openingMatrixPoint = (source, state) => {
    try {
      startPoint(source, state)
      if (!['s000', 's001'].includes(state.scene)) return
      sample++
      sources[source] = (sources[source] ?? 0) + 1
      if (reportedVisit !== sceneVisit) {
        reportedVisit = sceneVisit
        append(actors, { kind: 'scene', source, scene: state.scene, sample }, 2400)
        lastScene = state.scene
      }
      for (const [id, value] of Object.entries(state.actors)) {
        if (!value?.position.every(Number.isFinite)) throw new Error(`missing actor ${id}`)
        const key = `${sceneVisit}/${state.scene}/${id}`
        const before = previous.get(key)
        if (
          before &&
          JSON.stringify(before.position) !== JSON.stringify(value.position) &&
          !source.startsWith('commit:')
        )
          fail(`unobserved matrix move ${key} at ${source}`)
        if (JSON.stringify(before) !== JSON.stringify(value)) {
          const committed = append(
            actors,
            {
              kind: 'actor',
              scene: state.scene,
              id,
              source,
              sample,
              before: before ?? null,
              state: value,
            },
            2400,
          )
          if (committed) {
            previous.set(key, structuredClone(value))
            commitOrders.set(key, committed.order)
          }
        }
        if (source === 'render:world' && id !== 'party') retainRender(source, state, id, value)
      }
      const phase = Object.hasOwn(sceneLifecyclePhases, source)
        ? sceneLifecyclePhases[source]
        : null
      if (phase)
        append(
          lifecycle,
          {
            kind: 'scene-lifecycle',
            phase,
            source,
            scene: state.scene,
            sceneVisit,
            tick: observedTick,
            sample,
          },
          2400,
        )
      if (control !== state.control) {
        append(
          controls,
          {
            kind: 'control',
            scene: state.scene,
            source,
            sample,
            before: control ?? null,
            state: state.control,
          },
          2400,
        )
        control = state.control
      }
    } catch (error) {
      fail(error)
    } finally {
      pointRender = null
    }
  }
  globalThis.__openingMatrixPage = (engine, scene, page) => {
    try {
      if (!page || !['s000', 's001'].includes(scene)) return
      const last = pages.at(-1)
      if (
        last?.engine === engine &&
        last.scene === scene &&
        last.sceneVisit === sceneVisit &&
        JSON.stringify(last.page) === JSON.stringify(page)
      )
        return
      append(
        pages,
        {
          kind: 'page',
          engine,
          scene,
          sceneVisit,
          renderId: worldRenders.at(-1)?.renderId ?? null,
          page,
        },
        600,
      )
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__openingMatrixGame = (gs, source, renderEvidence) => {
    if (gs)
      globalThis.__e2eSceneBoundary({
        scene: `s${String(gs.wNumScene - 1).padStart(3, '0')}`,
        instance: gs.npcs,
        tick: gs.frameNum,
      })
    try {
      if (!gs || ![1, 2].includes(gs.wNumScene)) return
      const actors = {
        party: {
          position: [gs.party.x, gs.party.y],
          facing: gs.party.facing,
          visible: true,
          sprite: gs.PlayerRolesRuntime.rgwSpriteNum[gs.partyMembers[0] ?? 0],
          frame: gs.partyScriptedFrame[0] ?? null,
        },
      }
      if (gs.wNumScene === 2)
        for (const id of [3, 8, 10, 11]) {
          const e = gs.allEventObjects.find((e) => e.id === id)
          if (!e) throw new Error(`missing game actor ${id}`)
          actors[`e${id}`] = {
            position: [e.x, e.y],
            facing: e.facing,
            visible: e.sState > 0,
            state: e.sState,
            trigger: e.triggerLabel ?? null,
            resume: e.triggerResume ?? null,
            auto: e.autoLabel ?? null,
            autoIp: e.autoCursor?.ip ?? null,
            triggerMode: e.triggerMode,
            sprite: e.spriteNum,
            frame: e.scriptedFrame ?? null,
          }
        }
      globalThis.__openingMatrixPoint(source, {
        tick: gs.frameNum ?? null,
        renderEvidence: renderEvidence ?? null,
        scene: gs.wNumScene === 1 ? 's000' : 's001',
        actors,
        control: gs.mode === 'explore' && !gs.eventCursor && !gs.dialogBox && !gs.sceneLoading,
      })
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__openingMatrixGameRendered = (gs) => {
    try {
      const d = gs.dialogBox
      if (!d || ![1, 2].includes(gs.wNumScene)) return
      const lines = [...d.shownLines]
      if (
        d.currentLineText !== null &&
        (d.style === 'narration' || d.charsRevealed >= d.currentLineText.length)
      )
        lines.push(d.currentLineText)
      if (lines.length)
        globalThis.__openingMatrixPage('game', gs.wNumScene === 1 ? 's000' : 's001', {
          lines,
          title: d.titleText ?? null,
          slot: d.style,
          instance: causal.gamePageId(d),
        })
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__openingMatrixRendered = (page) => {
    try {
      if (page && page.phase !== 'typing')
        globalThis.__openingMatrixPage('reforge', lastScene, causal.reforgePage(page))
    } catch (error) {
      fail(error)
    }
  }
  const causal = createCausalObserver?.({
    append,
    fail,
    scenes: ['s000', 's001'],
    snapshotGame: (gs, source) => globalThis.__openingMatrixGame(gs, source),
    context: () => ({
      scene: observedScene,
      sceneVisit,
      tick: observedTick,
      renderId: worldRenders.at(-1)?.renderId ?? null,
      poses: Object.fromEntries(
        [...previous]
          .filter(([key]) => key.startsWith(`${sceneVisit}/${observedScene}/`))
          .map(([key, state]) => [
            key.split('/').at(-1),
            { state, commitOrder: commitOrders.get(key) },
          ]),
      ),
    }),
  })
  globalThis.__readOpeningMatrix = () =>
    structuredClone({
      actors,
      lifecycle,
      renders,
      worldRenders,
      controls,
      pages,
      causes: causal?.read() ?? [],
      resources: recorder.resources(),
      errors,
      overflow,
      sources,
    })
}
