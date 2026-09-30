/** Detached, bounded evidence at actual production commit/render boundaries. Never advances a game. */
export function installInnObserver() {
  const events = [],
    pages = [],
    errors = [],
    previous = new Map(),
    sources = {},
    previousRooms = new Map()
  const pageInstances = new WeakMap()
  let order = 0,
    sample = 0,
    overflow = false,
    scene = null,
    money,
    final = null,
    nextPageInstance = 1
  const fail = (value) => {
    if (errors.length < 12) errors.push(String(value))
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
  const record = (source, state) => {
    try {
      if (!['s001', 's003'].includes(state.scene)) return
      sample++
      sources[source] = (sources[source] ?? 0) + 1
      if (scene !== state.scene) {
        append(events, { kind: 'scene', scene: state.scene, source }, 6000)
        scene = state.scene
      }
      for (const [id, actor] of Object.entries(state.actors)) {
        if (!actor.position.every(Number.isFinite)) throw new Error(`invalid inn actor ${id}`)
        const key = `${state.scene}/${id}`,
          before = previous.get(key)
        if (
          before &&
          JSON.stringify(before.position) !== JSON.stringify(actor.position) &&
          !source.startsWith('commit:')
        )
          fail(`unobserved committed move ${key} at ${source}`)
        if (JSON.stringify(before) !== JSON.stringify(actor)) {
          append(
            events,
            { kind: 'actor', scene: state.scene, id, source, before: before ?? null, state: actor },
            6000,
          )
          previous.set(key, structuredClone(actor))
        }
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
    } catch (error) {
      fail(error)
    }
  }
  const rendered = (engine, page) => {
    try {
      if (scene !== 's003') return
      if (JSON.stringify(pages.at(-1)?.page) !== JSON.stringify(page))
        append(pages, { engine, page }, 600)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__innPoint = record
  globalThis.__innError = fail
  globalThis.__innRendered = (page) => {
    rendered('reforge', page && page.phase !== 'typing' ? page : null)
  }
  globalThis.__innGame = (gs, source) => {
    try {
      if (!gs || ![2, 4].includes(gs.wNumScene)) return
      const actors = {
        party: { position: [gs.party.x, gs.party.y], facing: gs.party.facing, visible: true },
      }
      if (gs.wNumScene === 4)
        for (const id of [54, 55, 56, 59, 60, 61, 73, 74]) {
          const e = gs.allEventObjects.find((e) => e.id === id)
          if (!e) throw new Error(`missing inn actor ${id}`)
          actors[`e${id}`] = {
            position: [e.x, e.y],
            facing: e.facing,
            visible: e.sState > 0,
            ...([54, 55, 73, 74].includes(id)
              ? { state: e.sState, frame: e.scriptedFrame ?? 0, sprite: e.spriteNum }
              : {}),
          }
        }
      record(source, {
        scene: gs.wNumScene === 2 ? 's001' : 's003',
        actors,
        money: gs.dwCash,
        control: gs.mode === 'explore' && !gs.eventCursor && !gs.dialogBox && !gs.sceneLoading,
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
      if (!pageInstances.has(d.shownLines)) pageInstances.set(d.shownLines, nextPageInstance++)
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
  globalThis.__readInnEvidence = () =>
    structuredClone({ events, pages, errors, overflow, sources, final })
}

export function readInnGame() {
  const gs = window.__tpgs
  return {
    scene: gs?.wNumScene,
    position: gs ? [gs.party.x, gs.party.y] : null,
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
        ?.filter((e) => e.sState >= 2)
        .map((e) => ({
          col: (e.x / 16 + e.y / 8) / 2,
          row: (e.y / 8 - e.x / 16) / 2,
          collide: true,
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
