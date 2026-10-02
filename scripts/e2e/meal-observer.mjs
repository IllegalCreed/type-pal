/** Read-only, bounded observations of actual commits and rendered frames. */
export function installMealObserver() {
  const events = [],
    pages = [],
    frames = [],
    menus = [],
    dispatches = [],
    saveCaptures = [],
    saveCompletions = [],
    restoreCommits = [],
    inputs = [],
    dithers = [],
    errors = []
  const prior = new Map(),
    pageInstances = new WeakMap()
  let armedSave = null,
    saveArmId = 0,
    latestMenu = { active: false },
    order = 0,
    sample = 0,
    overflow = false,
    final = null,
    pageInstance = 0,
    inputPhase = 'bootstrap'
  const fail = (error) => {
    if (errors.length < 12) errors.push(String(error))
    else overflow = true
  }
  const append = (list, value, limit) => {
    if (list.length >= limit) {
      overflow = true
      return
    }
    list.push({
      seq: list.length,
      order: order++,
      sample,
      atMs: performance.now(),
      ...structuredClone(value),
    })
  }
  const point = (source, state) => {
    try {
      if (!['s001', 's003'].includes(state.scene)) return
      sample++
      if (final?.scene !== state.scene)
        append(events, { kind: 'scene', source, scene: state.scene }, 8000)
      for (const [id, actor] of Object.entries(state.actors)) {
        if (!actor.position.every(Number.isFinite)) throw new Error(`invalid meal actor ${id}`)
        // Party identity survives scene switches: exit scripts place it before changing sceneId.
        // Comparing against that scene's last visit would invent an unobserved move on re-entry.
        const key = id === 'party' ? 'party' : `${state.scene}/${id}`,
          before = prior.get(key)
        if (
          before &&
          JSON.stringify(before.position) !== JSON.stringify(actor.position) &&
          !source.startsWith('commit:')
        )
          fail(`unobserved committed move ${key} at ${source}`)
        if (JSON.stringify(before) !== JSON.stringify(actor)) {
          append(
            events,
            { kind: 'actor', source, scene: state.scene, id, before: before ?? null, state: actor },
            8000,
          )
          prior.set(key, structuredClone(actor))
        }
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
    } catch (error) {
      fail(error)
    }
  }
  const rendered = (engine, page) => {
    try {
      if (!final || !['s001', 's003'].includes(final.scene)) return
      if (JSON.stringify(pages.at(-1)?.page) !== JSON.stringify(page))
        append(pages, { engine, scene: final.scene, page }, 800)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__mealPoint = point
  globalThis.__mealError = fail
  globalThis.__mealSetInputPhase = (phase) => {
    if (typeof phase !== 'string' || !phase) throw new Error('invalid meal input phase')
    inputPhase = phase
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
  globalThis.__mealRestoreCommitted = (payload) => {
    try {
      if (restoreCommits.length >= 1) {
        overflow = true
        return
      }
      restoreCommits.push({
        seq: restoreCommits.length,
        atMs: performance.now(),
        source: 'commit:restorePayload',
        payload: structuredClone(payload),
      })
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__mealRendered = (page) =>
    rendered('reforge', page && page.phase !== 'typing' ? page : null)
  globalThis.__mealGame = (gs, source) => {
    try {
      if (!gs || ![2, 4].includes(gs.wNumScene)) return
      const scene = gs.wNumScene === 2 ? 's001' : 's003'
      const actor = (id) => {
        const e = gs.allEventObjects.find((e) => e.id === id)
        if (!e) throw new Error(`missing meal actor ${id}`)
        return {
          position: [e.x, e.y],
          facing: e.facing,
          visible: e.sState > 0,
          state: e.sState,
          sprite: e.spriteNum,
          frame: e.scriptedFrame ?? 0,
          trigger: e.triggerLabel ?? null,
          resume: e.triggerResume ?? null,
          auto: e.autoLabel ?? null,
          triggerMode: e.triggerMode,
        }
      }
      point(source, {
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
            (scene === 's003' ? [56, 59, 60, 61, 62] : [15, 16, 19, 20, 24, 25, 26]).map((id) => [
              `e${id}`,
              actor(id),
            ]),
          ),
        },
        money: gs.dwCash,
        inventory: gs.inventory,
        persistent: Object.fromEntries(
          [15, 16, 19, 20, 24, 25, 26, 56, 59, 60, 61, 62].map((id) => [`e${id}`, actor(id)]),
        ),
        control: gs.mode === 'explore' && !gs.eventCursor && !gs.dialogBox && !gs.sceneLoading,
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
      if (!pageInstances.has(d.shownLines)) pageInstances.set(d.shownLines, ++pageInstance)
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
              instance: pageInstances.get(d.shownLines),
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
  globalThis.__readMealEvidence = () =>
    structuredClone({
      events,
      pages,
      frames,
      menus,
      dispatches,
      saveCaptures,
      saveCompletions,
      latestMenu,
      restoreCommits,
      inputs,
      dithers,
      errors,
      overflow,
      final,
    })
  // Only the rendered pages needed to decide a confirmation cross the hot-path RPC.
  // The full tape remains unchanged and is required at every phase closure.
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
