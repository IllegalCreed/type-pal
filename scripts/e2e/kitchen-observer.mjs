/** Read-only, bounded observations of actual commits and rendered frames. */
export function installKitchenObserver() {
  const events = [],
    pages = [],
    frames = [],
    restoreCommits = [],
    errors = []
  const prior = new Map(),
    pageInstances = new WeakMap()
  let order = 0,
    sample = 0,
    overflow = false,
    final = null,
    pageInstance = 0
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
        if (!actor.position.every(Number.isFinite)) throw new Error(`invalid kitchen actor ${id}`)
        const key = `${state.scene}/${id}`,
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
  globalThis.__kitchenRestoreCommitted = (payload) => {
    try {
      if (restoreCommits.length >= 2) {
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
  globalThis.__kitchenRendered = (page) =>
    rendered('reforge', page && page.phase !== 'typing' ? page : null)
  globalThis.__kitchenGame = (gs, source) => {
    try {
      if (!gs || ![2, 4].includes(gs.wNumScene)) return
      const scene = gs.wNumScene === 2 ? 's001' : 's003'
      const actor = (id) => {
        const e = gs.allEventObjects.find((e) => e.id === id)
        if (!e) throw new Error(`missing kitchen actor ${id}`)
        return {
          position: [e.x, e.y],
          facing: e.facing,
          visible: e.sState > 0,
          state: e.sState,
          sprite: e.spriteNum,
          trigger: e.triggerLabel ?? null,
          resume: e.triggerResume ?? null,
          auto: e.autoLabel ?? null,
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
            (scene === 's003' ? [56, 59, 60, 61, 62] : [19, 20]).map((id) => [`e${id}`, actor(id)]),
          ),
        },
        money: gs.dwCash,
        inventory: gs.inventory,
        persistent: Object.fromEntries(
          [19, 20, 24, 25, 26, 56, 59, 60, 61, 62].map((id) => [`e${id}`, actor(id)]),
        ),
        control: gs.mode === 'explore' && !gs.eventCursor && !gs.dialogBox && !gs.sceneLoading,
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
  globalThis.__readKitchenEvidence = () =>
    structuredClone({ events, pages, frames, restoreCommits, errors, overflow, final })
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
