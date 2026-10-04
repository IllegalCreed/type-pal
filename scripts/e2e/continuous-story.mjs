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

const BOUNDARY_REASONS =
  /(?:prelude|slot|save|restore|checkpoint|formal|quick-save|menu control|normal menu|load|select 旧的回忆|open .*menu|return to restored)/iu

/** Extract only gameplay inputs from an existing story receipt. Boundary I/O is deliberately omitted. */
export function continuousStoryActions(report) {
  assert.equal(report?.case ?? 'story', 'story', 'continuous tape accepts story only')
  return (report.actions ?? [])
    .filter((action) => action.kind === undefined || ['down', 'up'].includes(action.kind))
    .filter((action) => !BOUNDARY_REASONS.test(String(action.reason ?? '')))
    .filter((action) => action.key && !BOUNDARY_REASONS.test(String(action.phase ?? '')))
    .map((action) => ({
      key: action.key,
      kind: action.kind ?? 'press',
      reason: action.reason ?? '',
      ...(Number.isFinite(action.atMs) ? { atMs: action.atMs } : {}),
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
