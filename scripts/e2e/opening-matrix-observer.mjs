/** Serializable read-only collector, installed only in fresh E2E browser contexts. */
export function installOpeningMatrix() {
  const actors = [],
    pages = [],
    errors = [],
    sources = {}
  const previous = new Map()
  const pageKeys = new Set()
  let overflow = false
  let lastScene = null
  let sample = 0
  const fail = (error) => {
    if (errors.length < 10) errors.push(String(error))
    else overflow = true
  }
  const append = (list, value, limit) => {
    if (list.length >= limit) {
      overflow = true
      return
    }
    list.push({ seq: list.length, atMs: performance.now(), ...structuredClone(value) })
  }
  globalThis.__openingMatrixPoint = (source, state) => {
    try {
      if (!['s000', 's001'].includes(state.scene)) return
      sample++
      sources[source] = (sources[source] ?? 0) + 1
      if (lastScene !== state.scene) {
        append(actors, { kind: 'scene', source, scene: state.scene, sample }, 2400)
        lastScene = state.scene
      }
      for (const [id, value] of Object.entries(state.actors)) {
        if (!value?.position.every(Number.isFinite)) throw new Error(`missing actor ${id}`)
        const key = `${state.scene}/${id}`
        const before = previous.get(key)
        if (
          before &&
          JSON.stringify(before.position) !== JSON.stringify(value.position) &&
          !source.startsWith('commit:')
        )
          fail(`unobserved matrix move ${key} at ${source}`)
        if (JSON.stringify(before) !== JSON.stringify(value)) {
          append(
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
          previous.set(key, structuredClone(value))
        }
      }
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__openingMatrixPage = (engine, scene, page) => {
    try {
      if (!page || !['s000', 's001'].includes(scene)) return
      const key = JSON.stringify([engine, scene, page])
      if (pageKeys.has(key)) return
      if (pages.length >= 600) {
        overflow = true
        return
      }
      pageKeys.add(key)
      append(pages, { engine, scene, page }, 600)
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__openingMatrixGame = (gs, source) => {
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
            sprite: e.spriteNum,
            frame: e.scriptedFrame ?? null,
          }
        }
      globalThis.__openingMatrixPoint(source, {
        scene: gs.wNumScene === 1 ? 's000' : 's001',
        actors,
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
      if (d.currentLineText !== null && d.charsRevealed >= d.currentLineText.length)
        lines.push(d.currentLineText)
      if (lines.length)
        globalThis.__openingMatrixPage('game', gs.wNumScene === 1 ? 's000' : 's001', {
          lines,
          title: d.titleText ?? null,
          slot: d.style,
        })
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__openingMatrixRendered = (page) => {
    if (page && page.phase !== 'typing') globalThis.__openingMatrixPage('reforge', lastScene, page)
  }
  globalThis.__readOpeningMatrix = () =>
    structuredClone({ actors, pages, errors, overflow, sources })
}
