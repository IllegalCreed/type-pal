import assert from 'node:assert/strict'

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
    assert(
      Math.hypot(
        actualPosition[0] - expectedPosition[0],
        actualPosition[1] - expectedPosition[1],
      ) <= 1.5,
      `continuous ${engine} 002 ended at an unexpected party position ${actualPosition}; expected ${expectedPosition}`,
    )
  }
  return { fragment, engine, scene: actual }
}

const BOUNDARY_REASONS =
  /(?:prelude|slot|save|restore|checkpoint|formal|quick-save|menu|load|旧的回忆|选择.*回忆|打开.*菜单|返回.*菜单|return to restored|return to room|return from restored|restored normal|normal menu|证明.*控制|close actual in-game menu)/iu

/** Extract only gameplay inputs from an existing story receipt. Boundary I/O is deliberately omitted. */
export function continuousStoryActions(report) {
  assert.equal(report?.case ?? 'story', 'story', 'continuous tape accepts story only')
  const routeTargets = new Map()
  const routeInputs = report.route?.inputs ?? []
  const routeLegs = report.route?.legs ?? []
  let legCursor = 0
  for (let index = 0; index < routeInputs.length; index++) {
    const input = routeInputs[index]
    if (input.kind !== 'down') continue
    const up = routeInputs
      .slice(index + 1)
      .find((candidate) => candidate.kind === 'up' && candidate.key === input.key)
    if (!up) continue
    const steps = (report.route?.steps ?? []).filter(
      (step) =>
        step.scene === input.scene &&
        Number.isFinite(step.atMs) &&
        step.atMs >= input.atMs &&
        step.atMs <= up.atMs,
    )
    const phaseLeg = routeLegs.findIndex(
      (leg) => leg.scene === input.scene && input.phase !== undefined && leg.phase === input.phase,
    )
    if (phaseLeg >= 0) legCursor = phaseLeg
    else
      while (legCursor < routeLegs.length && routeLegs[legCursor].scene !== input.scene)
        legCursor += 1
    const currentLeg = legCursor
    const followingLeg = routeLegs[currentLeg + 1]
    const laterSameLeg = routeInputs
      .slice(index + 1)
      .some(
        (candidate) =>
          candidate.kind === 'down' &&
          candidate.scene === input.scene &&
          (input.phase === undefined || candidate.phase === input.phase),
      )
    const crossesScene = followingLeg?.scene && followingLeg.scene !== input.scene && !laterSameLeg
    const target = {
      scene:
        up.reason?.includes('touch/scene boundary') || crossesScene
          ? (followingLeg?.scene ?? input.scene)
          : input.scene,
      acceptScenes: [input.scene, followingLeg?.scene].filter(Boolean),
      position:
        up.reason?.includes('touch/scene boundary') || crossesScene
          ? null
          : (steps.at(-1)?.to ?? null),
      committedSteps: steps.length,
      expectDialogue: up.reason?.includes('touch/scene boundary') && !followingLeg,
    }
    routeTargets.set(`${input.kind}:${input.key}:${input.atMs}`, target)
    routeTargets.set(`${up.kind}:${up.key}:${up.atMs}`, target)
    legCursor = currentLeg + 1
  }
  return (report.actions ?? [])
    .filter((action) => action.kind === undefined || ['down', 'up'].includes(action.kind))
    .filter((action) => !BOUNDARY_REASONS.test(String(action.reason ?? '')))
    .filter((action) => action.key && !BOUNDARY_REASONS.test(String(action.phase ?? '')))
    .map((action) => ({
      key: action.key,
      kind: action.kind ?? 'press',
      reason: action.reason ?? '',
      ...(Number.isFinite(action.atMs) ? { atMs: action.atMs } : {}),
      ...(Number.isFinite(action.atMs) &&
      action.kind &&
      routeTargets.has(`${action.kind}:${action.key}:${action.atMs}`)
        ? { routeTarget: routeTargets.get(`${action.kind}:${action.key}:${action.atMs}`) }
        : {}),
    }))
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
