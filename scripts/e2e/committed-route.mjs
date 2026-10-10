import assert from 'node:assert/strict'
import { continuousGrid, continuousScene } from './continuous-route.mjs'
import { withRecordedKey } from './input-ledger.mjs'

/** Record the real facing hold too; replay must not invent unrecorded interaction inputs. */
export async function recordFacingInput({ id, page, key, facing, onInput }) {
  // Capture the starting pose and register its guard in the same browser turn.
  // A separate read/arm pair could silently anchor a later visit or position.
  const target = await page.evaluate(
    (facing) => window.__routeArm({ kind: 'face', target: { facing }, captureStart: true }),
    facing,
  )
  await executeArmedFacingInput(
    page,
    { key, holdId: id, holdTarget: target, reason: 'face actor' },
    onInput,
  )
}

/** Input commits and the caller's finished state are separate evidence, never progress samples. */
export function committedRouteReceipt({
  id,
  engine,
  trace,
  startOrder,
  endOrder,
  scene,
  end,
  ready,
  inputCount,
}) {
  assert.equal(trace.overflow, false, 'route evidence overflow')
  assert.deepEqual(trace.errors, [], 'route evidence errors')
  const source = engine === 'game' ? 'commit:tickSceneInput' : 'commit:player.input'
  const steps = trace.events
    .filter(
      (event) =>
        event.order > startOrder &&
        event.order <= endOrder &&
        event.scene === scene &&
        event.kind === 'actor' &&
        event.id === 'party' &&
        event.source === source &&
        event.before &&
        JSON.stringify(event.before.position) !== JSON.stringify(event.state.position),
    )
    .map((event) => {
      const from = event.before.position,
        to = event.state.position
      const a = continuousGrid(from, engine),
        b = continuousGrid(to, engine)
      const delta = [b[0] - a[0], b[1] - a[1]]
      const key = new Map([
        ['-1,0', 'ArrowLeft'],
        ['1,0', 'ArrowRight'],
        ['0,-1', 'ArrowUp'],
        ['0,1', 'ArrowDown'],
      ]).get(delta.join(','))
      assert(key, `non-unit player input commit at order ${event.order}: ${delta}`)
      return { scene, key, from, to, order: event.order, source }
    })
  if (!steps.length) assert.equal(inputCount, 0, 'route inputs have no player position commits')
  const dialogue = engine === 'game' ? !!end.dialog : !!end.runtime?.dialogue
  assert(ready || dialogue, 'route ended without caller completion evidence')
  return {
    id,
    steps,
    completion: {
      scene: continuousScene(end, engine),
      position: end.position,
      mode: dialogue ? 'dialogue' : 'ready',
    },
  }
}

/** Browser-local event subscription. Arming acknowledges registration before keydown. */
export function installCommittedRoutePlayback() {
  globalThis.__routeGameReadiness = (gs) => ({
    routeReady:
      gs.mode === 'explore' &&
      !gs.eventCursor &&
      !gs.dialogBox &&
      !gs.sceneLoading &&
      !gs.menuStack?.length &&
      !gs.needToFadeIn &&
      !gs.paletteFadeState &&
      !gs.fadeState &&
      !gs.blackScreenHold,
    routeDialogue: !!gs.dialogBox,
  })
  let latest = null,
    pending = null
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  const finish = (error, value) => {
    if (!pending || pending.result?.error || (pending.result && !error)) return
    pending.result = error ? { error } : { value: structuredClone(value) }
    clearTimeout(pending.timer)
    pending.resolve?.(pending.result)
  }
  const checkEnd = () => {
    if (!['end', 'face'].includes(pending?.kind) || !latest) return
    const target = pending.target
    const matches =
      latest.scene === target.scene &&
      same(latest.position, target.position) &&
      (pending.kind === 'face'
        ? latest.facing === target.facing
        : target.mode === 'dialogue'
          ? latest.dialogue
          : latest.ready)
    if (matches) finish(null, latest)
    else if (pending.result)
      finish(`${pending.kind} target no longer holds: ${JSON.stringify({ target, latest })}`)
  }
  globalThis.__routeObserve = (source, state) => {
    const before = latest
    latest = {
      scene: state.scene,
      sceneVisit: state.sceneVisit,
      position: state.actors.party.position,
      facing: state.actors.party.facing,
      ready: state.routeReady,
      dialogue: state.routeDialogue,
      source,
    }
    const changed =
      before &&
      (!same(before.position, latest.position) ||
        before.scene !== latest.scene ||
        before.sceneVisit !== latest.sceneVisit)
    if (pending?.kind === 'face' && changed)
      finish(`facing input moved or changed scene visit: ${JSON.stringify({ before, ...latest })}`)
    if (
      pending?.kind === 'moves' &&
      pending.result &&
      changed &&
      source === pending.steps.at(-1).source
    )
      finish(`extra player commit before release: ${JSON.stringify({ before, ...latest })}`)
    if (pending?.kind === 'moves' && !pending.result && changed) {
      const expected = pending.steps[pending.index]
      if (
        source !== expected.source ||
        before.sceneVisit !== latest.sceneVisit ||
        latest.scene !== expected.scene ||
        !same(before.position, expected.from) ||
        !same(latest.position, expected.to)
      ) {
        finish(
          `route first divergence: expected ${JSON.stringify(expected)}, observed ${JSON.stringify({ before, ...latest })}`,
        )
      } else if (++pending.index === pending.steps.length) finish(null, latest)
    }
    checkEnd()
  }
  globalThis.__routeArm = (request) => {
    if (pending) throw new Error('route waiter already armed')
    if (request.captureStart) {
      if (request.kind !== 'face' || !latest) throw new Error('facing observation missing')
      request = {
        ...request,
        target: {
          scene: latest.scene,
          position: structuredClone(latest.position),
          facing: request.target.facing,
        },
      }
    }
    if (request.kind === 'moves') {
      const first = request.steps[0]
      if (!latest || latest.scene !== first.scene || !same(latest.position, first.from))
        throw new Error(
          `route start mismatch: expected ${JSON.stringify(first)}, observed ${JSON.stringify(latest)}`,
        )
    }
    if (
      request.kind === 'face' &&
      (!latest ||
        latest.scene !== request.target.scene ||
        !same(latest.position, request.target.position))
    )
      throw new Error(`facing start mismatch: ${JSON.stringify({ request, latest })}`)
    pending = {
      ...request,
      index: 0,
      result: null,
      timer: setTimeout(
        () => finish(`route event timeout: ${JSON.stringify({ request, latest })}`),
        15000,
      ),
    }
    checkEnd()
    return request.target
  }
  globalThis.__routeWait = () => {
    if (!pending) throw new Error('route waiter not armed')
    if (pending.result) return Promise.resolve(pending.result)
    return new Promise((resolve) => {
      pending.resolve = resolve
    })
  }
  globalThis.__routeCancel = () => {
    if (pending) {
      clearTimeout(pending.timer)
      pending.resolve?.({ error: 'route waiter cancelled' })
      pending = null
    }
  }
  globalThis.__routeFinalize = () => {
    if (!pending?.result) throw new Error('route finalized before completion')
    checkEnd()
    // Consume the post-release result and remove the guard atomically, not in
    // two RPCs that could drop a divergence arriving between check and cancel.
    const result = pending.result
    clearTimeout(pending.timer)
    pending = null
    return result
  }
}

export async function replayFacingInput(page, action, onInput = () => {}) {
  await page.evaluate((target) => window.__routeArm({ kind: 'face', target }), action.holdTarget)
  await executeArmedFacingInput(page, action, onInput)
}

async function finalizeRoute(page) {
  const result = await page.evaluate(() => window.__routeFinalize())
  assert(!result.error, result.error)
}

async function executeArmedFacingInput(page, action, onInput = () => {}) {
  const wait = async () => {
    const result = await page.evaluate(() => window.__routeWait())
    assert(!result.error, result.error)
  }
  await withRouteGuard(page, async () => {
    await withRecordedKey({
      keyboard: page.keyboard,
      key: action.key,
      metadata: { holdId: action.holdId, holdTarget: action.holdTarget, reason: action.reason },
      onInput,
      body: wait,
    })
    await finalizeRoute(page)
  })
}
/** Cleanup failure must not erase the original divergence/dispatch failure. */
async function withRouteGuard(page, body) {
  let result, failure
  try {
    result = await body()
  } catch (error) {
    failure = error
  }
  try {
    await page.evaluate(() => window.__routeCancel())
  } catch (error) {
    if (failure)
      throw new AggregateError(
        [failure, error],
        `route failed: ${failure}; cleanup failed: ${error}`,
      )
    throw error
  }
  if (failure) throw failure
  return result
}

export async function replayCommittedRoute({ page, route, health = () => {}, onInput = () => {} }) {
  const groups = []
  for (const step of route.steps) {
    if (groups.at(-1)?.key === step.key) groups.at(-1).steps.push(step)
    else groups.push({ key: step.key, steps: [step] })
  }
  const wait = async () => {
    const result = await page.evaluate(() => window.__routeWait())
    assert(!result.error, result.error)
  }
  await withRouteGuard(page, async () => {
    for (const group of groups) {
      health()
      await page.evaluate((steps) => window.__routeArm({ kind: 'moves', steps }), group.steps)
      await withRecordedKey({ keyboard: page.keyboard, key: group.key, body: wait, onInput })
      // Re-check after actual key-up; a previously resolved arrival does not
      // authorize additional player commits while the browser releases input.
      await finalizeRoute(page)
    }
    await page.evaluate((target) => window.__routeArm({ kind: 'end', target }), route.completion)
    await wait()
    await finalizeRoute(page)
  })
}
