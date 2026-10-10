import assert from 'node:assert/strict'
import { assertInputLedger, inputScope } from './input-ledger.mjs'

export const CONTINUOUS_STORY_FRAGMENTS = Object.freeze([
  { id: '001', title: '开场与密道', runner: 'opening', checkpoints: ['room-control-returned'] },
  {
    id: '002',
    title: '苗人接待与赏银',
    runner: 'inn',
    checkpoints: ['trio-hidden', 'room-control-returned'],
  },
  {
    id: '003',
    title: '下楼、道士与厨房交代',
    runner: 'kitchen',
    checkpoints: ['kitchen-instruction', 'room-control-returned'],
  },
  {
    id: '004',
    title: '端菜与桂花酒邀约',
    runner: 'meal',
    checkpoints: ['taoist-departed', 'room-control-returned'],
  },
  {
    id: '005',
    title: '买虾委托与码头报信',
    runner: 'errand',
    checkpoints: ['zhangsi-report', 'room-control-returned'],
  },
  { id: '006', title: '求药与出海上仙灵岛', runner: 'boat', checkpoints: ['island-entry'] },
])

export const STORY_ONLY_CASES = Object.freeze(['story'])

// A replay is only a valid continuous fragment when it reaches the same scene
// boundary as the standalone story receipt.  The action tape is an input aid,
// never the oracle: a browser that merely consumes every key must fail here.
export const CONTINUOUS_SCENE_CHECKPOINTS = Object.freeze({
  '001': Object.freeze({ game: 2, reforge: 's001' }),
  '002': Object.freeze({ game: 4, reforge: 's003' }),
  '003': Object.freeze({ game: 2, reforge: 's001' }),
  '004': Object.freeze({ game: 4, reforge: 's003' }),
  '005': Object.freeze({ game: 5, reforge: 's004' }),
  '006': Object.freeze({ game: 15, reforge: 's014' }),
})

const CONTINUOUS_PARTY_CHECKPOINTS = Object.freeze({
  '002': Object.freeze({ game: [126, 46], reforge: [126, 46] }),
})

export function assertContinuousCheckpoint(fragment, engine, state) {
  assert(CONTINUOUS_SCENE_CHECKPOINTS[fragment], `unknown continuous fragment ${fragment}`)
  assert(['game', 'reforge'].includes(engine), `unknown continuous engine ${engine}`)
  const actual = engine === 'game' ? state?.scene : (state?.scene ?? state?.runtime?.sceneId),
    expected = CONTINUOUS_SCENE_CHECKPOINTS[fragment][engine]
  assert.equal(
    actual,
    expected,
    `continuous ${engine} ${fragment} stopped at scene ${String(actual)}; expected ${expected}`,
  )
  if (fragment === '002') {
    const trio = state?.trio ?? []
    assert.equal(trio.length, 3, `continuous ${engine} 002 missing trio state`)
    assert(
      trio.every((actor) => actor.visible === false),
      `continuous ${engine} 002 ended before all three Miao guests left the corridor`,
    )
    const expectedPosition = CONTINUOUS_PARTY_CHECKPOINTS[fragment][engine]
    const actualPosition =
      engine === 'game'
        ? [
            (state.position[0] / 16 + state.position[1] / 8) / 2,
            (state.position[1] / 8 - state.position[0] / 16) / 2,
          ]
        : [state.runtime.position.col, state.runtime.position.row]
    assert.deepEqual(
      actualPosition,
      expectedPosition,
      `continuous ${engine} 002 ended at an unexpected party position; expected ${expectedPosition}`,
    )
    if (engine === 'reforge') {
      const aunt = state.script?.behaviors?.entities?.s003?.e56
      assert.equal(
        aunt?.auto?.cursor?.at?.kind,
        'completed',
        'continuous reforge 002 ended before Li Daniang finished the hallway auto phase',
      )
      assert.deepEqual(
        [state.script?.entityPos?.s003?.e56?.col, state.script?.entityPos?.s003?.e56?.row],
        [137, 66],
        'continuous reforge 002 ended with a stale Li Daniang auto position',
      )
    }
  }
  return { fragment, engine, scene: actual }
}

/** Extract gameplay inputs; recorded wall time also includes export/audit work, not story pacing. */
export function continuousStoryActions(report) {
  assert.equal(report?.case ?? 'story', 'story', 'continuous tape accepts story only')
  const replays = new Map(
    (report.route?.legs ?? [])
      .filter((leg) => leg.replay)
      .map((leg) => [leg.replay.id, leg.replay]),
  )
  for (const input of report.route?.inputs ?? [])
    assert(
      input.routeId !== undefined && replays.has(input.routeId),
      'route requires committed receipt; regenerate the report',
    )
  assertInputLedger(report.actions ?? [])
  const actions = (report.actions ?? [])
    .filter((action) => inputScope(action.phase, action.scope) !== 'boundary')
    .map((action) => ({
      key: action.key,
      kind: action.kind ?? 'press',
      reason: action.reason ?? '',
      ...(action.phase ? { phase: action.phase } : {}),
      ...(action.scene ? { scene: action.scene } : {}),
      ...(action.routeId !== undefined
        ? { routeId: action.routeId, routeReplay: replays.get(action.routeId) }
        : {}),
      ...(action.holdId !== undefined ? { holdId: action.holdId } : {}),
      ...(action.holdTarget ? { holdTarget: action.holdTarget } : {}),
    }))
  for (const action of actions)
    if (action.routeId !== undefined) assert(action.routeReplay, 'missing committed route receipt')
  return actions
}

/** Execute an entire recorded route once; retain all non-route inputs, including the same phase. */
export function continuousPlaybackActions(actions) {
  const consumed = new Set()
  return actions.filter((action) => {
    const group = action.routeReplay
      ? `route:${action.routeId}`
      : action.holdId !== undefined
        ? `hold:${action.holdId}`
        : null
    if (!group) return true
    if (consumed.has(group)) return false
    assert.equal(action.kind, 'down', 'recorded input group must begin with keydown')
    assert(action.routeReplay || action.holdTarget, 'missing input group target')
    consumed.add(group)
    return true
  })
}

export function continuousFragmentContext({ engine, fragment, barrier, report }) {
  assert(['game', 'reforge'].includes(engine), `unknown engine ${engine}`)
  assert(
    CONTINUOUS_STORY_FRAGMENTS.some((entry) => entry.id === fragment.id),
    `unknown fragment ${fragment.id}`,
  )
  return {
    engine,
    fragment,
    mode: 'continuous',
    // Fragment handlers must consume the current in-memory page/session. They
    // are forbidden from opening a predecessor or writing an end checkpoint.
    boundary: { load: false, save: false },
    barrier,
    report,
  }
}

export async function runContinuousStory({ sessions, handlers, report }) {
  assert(sessions?.game && sessions?.reforge, 'continuous story needs two live sessions')
  assert(handlers && typeof handlers.game === 'object' && typeof handlers.reforge === 'object')
  const barrier = new DualTrackBarrier()
  const receipts = []
  for (const fragment of CONTINUOUS_STORY_FRAGMENTS) {
    const pair = await Promise.all(
      ['game', 'reforge'].map(async (engine) => {
        const handler = handlers[engine][fragment.id]
        assert(typeof handler === 'function', `${engine} handler missing for ${fragment.id}`)
        return handler(
          continuousFragmentContext({ engine, fragment, barrier, report: report?.[engine] }),
        )
      }),
    )
    receipts.push({ fragment: fragment.id, result: pair })
  }
  return { kind: 'continuous-story-receipt', mode: 'story-only', receipts }
}

export function continuousStoryPlan({ gameReports, reforgeReports }) {
  assert(
    Array.isArray(gameReports) && Array.isArray(reforgeReports),
    'continuous story needs two report chains',
  )
  assert.equal(
    gameReports.length,
    CONTINUOUS_STORY_FRAGMENTS.length,
    'game story chain is incomplete',
  )
  assert.equal(
    reforgeReports.length,
    CONTINUOUS_STORY_FRAGMENTS.length,
    'Reforge story chain is incomplete',
  )
  const entries = CONTINUOUS_STORY_FRAGMENTS.map((fragment, index) => {
    const game = gameReports[index],
      reforge = reforgeReports[index]
    for (const [engine, report] of [
      ['game', game],
      ['reforge', reforge],
    ]) {
      assert.equal(report?.fragment, fragment.id, `${engine} chain out of order at ${fragment.id}`)
      assert.equal(report?.case ?? 'story', 'story', `${engine} chain contains a specialist case`)
      assert.equal(report?.status, 'passed', `${engine} ${fragment.id} is not passed`)
    }
    return {
      ...fragment,
      index,
      engines: { game, reforge },
      barriers: fragment.checkpoints.map((checkpoint) => ({ fragment: fragment.id, checkpoint })),
    }
  })
  return {
    kind: 'continuous-story-plan',
    mode: 'story-only',
    fragments: entries,
    order: entries.map((entry) => entry.id),
  }
}

/** Semantic barrier for two already-running browser sessions. */
export class DualTrackBarrier {
  #arrivals = new Map()

  async arrive(engine, fragment, checkpoint, payload) {
    assert(['game', 'reforge'].includes(engine), `unknown engine ${engine}`)
    const key = `${fragment}:${checkpoint}`
    let state = this.#arrivals.get(key)
    if (!state) {
      state = { arrivals: new Map(), waiters: [] }
      this.#arrivals.set(key, state)
    }
    assert(!state.arrivals.has(engine), `${key} received duplicate ${engine} arrival`)
    state.arrivals.set(engine, structuredClone(payload))
    if (state.arrivals.size === 2) {
      const value = {
        fragment,
        checkpoint,
        game: state.arrivals.get('game'),
        reforge: state.arrivals.get('reforge'),
      }
      for (const resolve of state.waiters) resolve(value)
      state.waiters = []
      return value
    }
    return new Promise((resolve) => state.waiters.push(resolve))
  }

  pending() {
    return [...this.#arrivals.entries()]
      .filter(([, state]) => state.arrivals.size < 2)
      .map(([key, state]) => ({ key, engines: [...state.arrivals.keys()] }))
  }
}
