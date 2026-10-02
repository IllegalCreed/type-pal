/** Sparse committed state plus actual rendered dialogue. No runtime writes. */
export function installErrandObserver() {
  const events = [],
    pages = [],
    restoreCommits = [],
    errors = [],
    inputs = []
  const prior = new Map(),
    instances = new WeakMap()
  let final = null,
    order = 0,
    instance = 0,
    overflow = false
  const append = (list, value, limit = 16000) => {
    if (list.length >= limit) {
      overflow = true
      return
    }
    list.push({
      seq: list.length,
      order: order++,
      atMs: performance.now(),
      ...structuredClone(value),
    })
  }
  const fail = (error) => {
    if (errors.length < 10) errors.push(String(error))
    else overflow = true
  }
  const point = (source, state) => {
    try {
      if (!['s001', 's003', 's004', 's005'].includes(state.scene)) return
      if (final?.scene !== state.scene)
        append(events, { kind: 'scene', source, scene: state.scene })
      for (const [id, actor] of Object.entries(state.actors)) {
        const key = id === 'party' ? id : `${state.scene}/${id}`,
          before = prior.get(key)
        if (
          before &&
          JSON.stringify(before.position) !== JSON.stringify(actor.position) &&
          !source.startsWith('commit:')
        )
          fail(`unobserved committed move ${key} at ${source}`)
        if (JSON.stringify(before) !== JSON.stringify(actor)) {
          append(events, {
            kind: 'actor',
            source,
            scene: state.scene,
            id,
            before: before ?? null,
            state: actor,
          })
          prior.set(key, structuredClone(actor))
        }
      }
      const progress = { money: state.money, persistent: state.persistent, hooks: state.hooks }
      if (JSON.stringify(prior.get('progress')) !== JSON.stringify(progress)) {
        append(events, {
          kind: 'progress',
          source,
          scene: state.scene,
          before: prior.get('progress') ?? null,
          state: progress,
        })
        prior.set('progress', structuredClone(progress))
      }
      final = structuredClone(state)
    } catch (error) {
      fail(error)
    }
  }
  const rendered = (engine, page) => {
    if (!final) return
    if (JSON.stringify(pages.at(-1)?.page) !== JSON.stringify(page))
      append(
        pages,
        { engine, scene: final.scene, page, actors: final.actors, control: final.control },
        800,
      )
  }
  globalThis.__errandPoint = point
  globalThis.__errandError = fail
  globalThis.__errandRestoreCommitted = (payload) =>
    append(restoreCommits, { payload, source: 'commit:restorePayload' }, 1)
  globalThis.__errandRendered = (page) =>
    rendered('reforge', page && page.phase !== 'typing' ? page : null)
  globalThis.__errandGame = (gs, source) => {
    if (!gs || ![2, 4, 5, 6].includes(gs.wNumScene)) return
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
      point(source, {
        scene: `s${String(gs.wNumScene - 1).padStart(3, '0')}`,
        actors: {
          party: {
            position: [gs.party.x, gs.party.y],
            facing: gs.party.facing,
            visible: true,
            walking: gs.walkingFrame.walking,
          },
          ...Object.fromEntries(
            gs.npcs
              .filter((e) => [19, 62, 83, 84, 123, 124, 127].includes(e.id))
              .map((e) => [`e${e.id}`, actor(e)]),
          ),
        },
        persistent: Object.fromEntries(
          gs.allEventObjects
            .filter((e) => [19, 62, 83, 84, 123, 124, 127].includes(e.id))
            .map((e) => [`e${e.id}`, actor(e)]),
        ),
        hooks: gs.sceneOnEnterOverride ?? {},
        money: gs.dwCash,
        control: gs.mode === 'explore' && !gs.eventCursor && !gs.dialogBox && !gs.sceneLoading,
      })
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__errandGameRendered = (gs) => {
    try {
      if (!gs || ![2, 4, 5, 6].includes(gs.wNumScene)) return
      const d = gs.dialogBox
      if (!d) {
        rendered('game', null)
        return
      }
      if (!instances.has(d.shownLines)) instances.set(d.shownLines, ++instance)
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
              instance: instances.get(d.shownLines),
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
  globalThis.__readErrandEvidence = () =>
    structuredClone({
      events,
      pages,
      restoreCommits,
      inputs,
      errors,
      overflow,
      final,
      order: order - 1,
    })
  globalThis.__readErrandDrive = (after) =>
    structuredClone({
      pages: pages.filter((p) => p.order > after),
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
        .filter((e) => [18, 19, 44, 45, 62, 83, 84, 95, 115, 123, 124, 127].includes(e.id))
        .map((e) => [
          `e${e.id}`,
          {
            position: [e.x, e.y],
            visible: e.sState > 0,
            state: e.sState,
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
        { position: [e.pos.col, e.pos.row, e.pos.height], visible: !e.hidden },
      ]),
    ),
    routeActors:
      scene?.entities
        .filter((e) => !e.hidden && e.collide)
        .map((e) => ({ col: e.pos.col, row: e.pos.row, collide: true })) ?? [],
  }
}
