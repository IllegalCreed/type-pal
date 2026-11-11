import { evidenceObserverScript } from './evidence-recorder.mjs'

/** Runner-owned configuration is separate from the observer's source and contains no oracle. */
export function battleObserverScript(context) {
  return `globalThis.__battleTraceContext=${JSON.stringify(context)};${evidenceObserverScript(installBattleTraceObserver)}`
}

/** Browser serializable. All engine adapters submit facts; only the shared recorder assigns order. */
export function installBattleTraceObserver(context, createRecorder) {
  const input = context ?? globalThis.__battleTraceContext
  delete globalThis.__battleTraceContext
  if (
    !input ||
    !['game', 'reforge'].includes(input.engine) ||
    ![input.scenarioId, input.runId, input.random?.algorithm].every(
      (value) => typeof value === 'string' && value.trim(),
    ) ||
    !Number.isSafeInteger(input.random?.seed) ||
    input.random.seed < 0 ||
    input.random.seed > 0xffffffff ||
    typeof createRecorder !== 'function'
  )
    throw new Error('invalid battle evidence context')
  const identity = {
    engine: input.engine,
    scenarioId: input.scenarioId,
    runId: input.runId,
  }
  const random = structuredClone(input.random)
  const errors = [],
    starts = [],
    commands = [],
    actions = [],
    rounds = [],
    randomDraws = [],
    presentations = [],
    terminals = []
  let closed = false,
    overflow = false
  let frame, previousFrame
  let markedRandom
  let nextNumberId = 0
  const fighterDraws = new WeakMap()
  const floatTargets = new WeakMap()
  const recorder = createRecorder({
    context: () => identity,
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  const append = (list, value, requiresStart = true) => {
    try {
      if (closed) throw new Error('battle evidence is sealed')
      if (requiresStart && starts.length !== 1) throw new Error('battle evidence has no start')
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('invalid battle evidence fact')
      for (const key of ['order', 'seq', 'atMs', 'engine', 'runId', 'scenarioId'])
        if (Object.hasOwn(value, key)) throw new Error(`fact cannot replace evidence ${key}`)
      if (typeof value.source !== 'string' || !value.source.trim())
        throw new Error('battle evidence source is required')
      return recorder.append(list, { ...value, atMs: performance.now() })
    } catch (error) {
      recorder.fail(error)
      return undefined
    }
  }
  const port = {
    start(state, source) {
      if (starts.length) {
        recorder.fail('duplicate battle start')
        return
      }
      append(starts, { kind: 'battle-start', state, source }, false)
    },
    command(value) {
      append(commands, value)
    },
    action(value) {
      append(actions, value)
    },
    round(value) {
      append(rounds, value)
    },
    random(value, source) {
      if (!Number.isFinite(value) || value < 0 || value >= 1) {
        recorder.fail('invalid random draw')
        return
      }
      append(
        randomDraws,
        { kind: 'random-draw', index: randomDraws.length, value, source, ...markedRandom },
        false,
      )
      markedRandom = undefined
    },
    markRandom(purpose, queue) {
      if (closed || starts.length !== 1) return
      if (markedRandom) recorder.fail('a marked random draw was not consumed')
      markedRandom = { purpose, ...(queue ? { queue } : {}) }
    },
    presentation(value) {
      append(presentations, value)
    },
    beginFrame(source, state) {
      if (closed || starts.length !== 1) return
      if (frame) recorder.fail('a battle frame was replaced before its draw completed')
      frame = {
        source,
        ...state,
        enemies: new Map(),
        players: new Map(),
        panels: [],
        numbers: [],
        settlement: null,
      }
    },
    labelFighter(draw, side, slot, fading = false) {
      if (frame) fighterDraws.set(draw, { side, slot, fading })
    },
    fighterDrawn(draw) {
      const fighter = frame && fighterDraws.get(draw)
      if (!fighter) return
      const { side, slot, fading } = fighter
      if (side === 'enemy') frame.enemies.set(slot, { slot, fading })
      else frame.players.set(slot, { slot, x: draw.x, y: draw.y })
    },
    panelDrawn(slot) {
      if (frame) frame.panels.push(slot)
    },
    labelNumber(number, side, slot) {
      if (starts.length === 1 && !closed)
        floatTargets.set(number, { side, slot, numberId: nextNumberId++ })
    },
    numberDrawn(number, value, tone, right, y, age) {
      if (!frame || !['yellow', 'blue'].includes(tone)) return
      const target = floatTargets.get(number)
      if (!target) {
        recorder.fail('a drawn HP number has no native target')
        return
      }
      frame.numbers.push({ ...target, value, tone, right, y, age })
    },
    settlementDrawn(kind) {
      if (frame) frame.settlement = kind
    },
    endFrame() {
      if (!frame) return
      const { clockMs, source, enemies, players, ...state } = frame
      frame = undefined
      const bySlot = (a, b) => a.slot - b.slot
      const payload = {
        ...state,
        enemies: [...enemies.values()].sort(bySlot),
        players: [...players.values()].sort(bySlot),
      }
      // Keep every observable transition, including the first frame without a faded sprite.
      const signature = JSON.stringify(payload)
      if (signature === previousFrame) return
      previousFrame = signature
      append(presentations, { kind: 'battle-frame', source, clockMs, payload })
    },
    terminal(value) {
      if (frame) recorder.fail('battle ended before the current frame completed')
      if (markedRandom) recorder.fail('battle ended with an unconsumed random draw marker')
      if (append(terminals, value)) closed = true
    },
    fail(error) {
      recorder.fail(error)
    },
    read() {
      return structuredClone({
        schemaVersion: 1,
        kind: 'battle-foundation-trace',
        ...identity,
        random,
        start: starts[0] ?? null,
        commands,
        actions,
        ...(rounds.length ? { rounds } : {}),
        randomDraws,
        presentations,
        resources: recorder.resources(),
        terminal: terminals[0] ?? null,
        errors,
        overflow,
      })
    },
  }
  globalThis.__battleEvidence = Object.freeze(port)
}
