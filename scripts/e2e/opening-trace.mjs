// Runs only in the runner's fresh browser context. No engine objects escape into the log.
export function installOpeningTrace() {
  const events = []
  const sources = {}
  const errors = []
  let previous = null
  let overflow = false
  const fail = (error) => {
    if (errors.length < 10) errors.push(String(error))
    else overflow = true
  }
  const emit = (kind, source, state, extra = {}) => {
    if (events.length >= 1600) {
      overflow = true
      return
    }
    events.push({ seq: events.length, atMs: performance.now(), kind, source, ...state, ...extra })
  }
  const point = (source, value) => {
    try {
      if (!value) return
      const state = structuredClone(value)
      sources[source] = (sources[source] ?? 0) + 1
      if (!state.npc || !state.position.every(Number.isFinite)) throw new Error('invalid NPC point')
      if (!previous || previous.instance !== state.instance) {
        emit('initial', source, state)
      } else {
        if (JSON.stringify(previous.position) !== JSON.stringify(state.position)) {
          if (!source.startsWith('commit:')) fail(`unobserved movement at ${source}`)
          emit('move', source, state, { from: previous.position })
        }
        if (previous.visible !== state.visible || previous.facing !== state.facing)
          emit('actor', source, state)
        if (JSON.stringify(previous.dialogue) !== JSON.stringify(state.dialogue))
          emit('dialogue', source, state)
        if (previous.control !== state.control) emit('control', source, state)
      }
      previous = state
    } catch (error) {
      fail(error) // Observation failure must not change engine return/throw behaviour.
    }
  }
  globalThis.__openingTraceGame = (gs, source) => {
    try {
      if (!gs || gs.wNumScene !== 2) return
      const npc = gs.allEventObjects.find((e) => e.id === 10)
      const d = gs.dialogBox
      point(source, {
        engine: 'game',
        instance: 'room-001',
        clock: gs.frameNum,
        npc: npc?.id,
        position: npc ? [npc.x, npc.y] : [],
        facing: npc?.facing,
        visible: (npc?.sState ?? 0) > 0,
        dialogue: d ? { phase: d.phase, text: d.currentLineText, title: d.titleText } : null,
        control: gs.mode === 'explore' && !gs.eventCursor && !d && !gs.sceneLoading,
      })
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__openingTracePoint = point
  globalThis.__openingTraceError = fail
  globalThis.__openingRendered = (dialogue) => {
    if (previous?.engine === 'reforge') point('render:dialogue', { ...previous, dialogue })
  }
  globalThis.__readOpeningTrace = () => structuredClone({ events, sources, errors, overflow })
}
