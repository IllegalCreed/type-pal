import assert from 'node:assert/strict'
import { beeWorldInput } from './battle-world-bee-scenario.mjs'
import { fixedRoutePlan } from './fixed-route-plan.mjs'

function nextMenu(engine, state) {
  if (engine === 'game') {
    const battle = state?.battle
    if (battle?.phase !== 'selectAction' || battle.ui !== 'selectMove' || battle.menu !== 'main')
      return null
    return [battle.round + 1, battle.selectingPlayer]
  }
  if (state?.phase !== 'menu') return null
  const menu = state.events.findLast(({ kind }) => kind === 'escape-menu')
  return menu?.phase === 'menu' ? [menu.turn, menu.slot] : null
}

function worldReady(engine, state) {
  return engine === 'game'
    ? state?.ready && state.scene === 7 && state.starts === 1
    : state?.run?.sceneId === beeWorldInput.scene &&
        !state.phase &&
        !state.encounterBusy &&
        !state.run.battleActive &&
        !state.run.scriptRunning &&
        !state.run.presentationBusy &&
        state.run.fadeBlack === 0
}

const openMenu = (engine, state) =>
  engine === 'game' ? state?.menu?.kind === 'in-game' : state?.run?.menuActive

function installCooldownWitness({ engine, watchDeparture }) {
  const isGame = engine === 'game'
  const grid = (x, y) => [(x / 16 + y / 8) / 2, (y / 8 - x / 16) / 2]
  const position = ({ col, row }) => [col, row]
  const witness = { samples: [], secondContact: null }
  if (watchDeparture) witness.afterExpiry = []
  window.__beeCooldownWitness = witness
  const observe = () => {
    const gs = window.__tpgs
    const world = window.__rfWorld
    const entity = isGame
      ? gs.npcs.find(({ id }) => id === 154)
      : window.__rfScene.entities.find(({ id }) => id === 'e154')
    const run = !isGame && window.__tpObserve.readRuntime()
    const remaining = isGame
      ? Math.max(0, -(entity?.sVanishTime ?? 0))
      : (world.entityLifecycles?.s006?.e154?.remainingTicks ?? 0)
    const contacts = isGame
      ? window.__beeGameEvidence().native.handoff.filter(({ stage }) => stage === 'contact')
      : window.__beeWorld.read().events.filter(({ kind }) => kind === 'contact')
    const worldTick = () => (isGame ? gs.frameNum : window.__tpE2e.dumpMotionState().worldTick)
    if (contacts.length > 1) {
      const [, contact] = contacts
      witness.secondContact = {
        atMs: contact.atMs,
        entity: isGame ? contact.entityId : contact.entity,
        grid: isGame ? contact.grid : position(contact.player),
        tick: worldTick(),
      }
      return
    }
    const { samples } = witness
    const sample = () => ({
      atMs: performance.now(),
      tick: worldTick(),
      remaining,
      grid: isGame ? grid(gs.party.x, gs.party.y) : position(run.position),
      enemy: entity && (isGame ? grid(entity.x, entity.y) : position(entity.pos)),
      visible: !!entity && (isGame ? entity.sState > 0 : !entity.hidden),
      contacts: contacts.length,
    })
    if ((remaining > 0 || samples.length) && samples.at(-1)?.remaining !== remaining) {
      samples.push(sample())
    } else if (watchDeparture && samples.at(-1)?.remaining === 0) {
      const last = witness.afterExpiry.at(-1) ?? samples.at(-1)
      if (last.tick !== worldTick()) witness.afterExpiry.push(sample())
      if (witness.afterExpiry.length === 3) return
    }
    requestAnimationFrame(observe)
  }
  requestAnimationFrame(observe)
}

export async function verifyWorldEscape({
  engine,
  result,
  read,
  page,
  until,
  press,
  capture,
  probe,
  walk,
  evidence,
}) {
  const poll = (accept, name) => until(read, accept, name, 10_000)
  const cooldown = () => page.evaluate(() => window.__beeCooldownWitness)
  await page.evaluate(installCooldownWitness, { engine, watchDeparture: !!result.exitKey })
  const submitted = new Set()
  for (;;) {
    const actual = await poll((state) => {
      if (worldReady(engine, state)) return true
      const menu = nextMenu(engine, state)
      return menu && !submitted.has(menu.join(':'))
    }, 'escape animation finishes or the next menu accepts input')
    if (worldReady(engine, actual)) {
      result.returned = actual
      break
    }
    const [turn, slot] = nextMenu(engine, actual)
    if (!probe) assert.equal(slot, 0, 'one escape key must submit all living allies')
    assert(turn <= 3, 'fixed escape seed did not terminate in the expected rounds')
    submitted.add([turn, slot].join(':'))
    await press('KeyQ', 'battle-escape', `round ${turn} slot ${slot} chooses escape`)
  }

  result.attemptedMenus = [...submitted]
  if (!probe) assert.equal(submitted.size, result.attempts, 'wrong number of escape turns')
  if (result.exitKey) {
    const { samples } = await cooldown()
    const before = samples.at(-1)
    assert(before?.remaining >= 10, 'departure input must start early in the cooldown')
    const { scene, stop } = beeWorldInput
    const route = fixedRoutePlan(engine, {
      id: result.label,
      scene,
      start: stop,
      holds: [[result.exitKey, result.exitSteps]],
      completion: { scene, position: result.exitGrid, mode: 'ready' },
    })
    await walk(route, 'world-escape-departure')
    result.departureStart = before
    const trace = await evidence()
    assert.equal(trace.overflow, false)
    assert.deepEqual(trace.errors, [])
    trace.cooldown = await until(
      cooldown,
      (state) => state.secondContact !== null || state.afterExpiry.length === 3,
      'record the first three world steps at the end of escape cooldown',
      4_000,
    )
    return trace
  }

  await press('Escape', 'world-control', 'open world menu after escape')
  const menu = await poll((state) => openMenu(engine, state), 'world menu opens after escape')
  result.control = engine === 'game' ? menu.menu : menu.run
  await press('Escape', 'world-control', 'close world menu after escape')
  result.end = await poll(
    (state) => worldReady(engine, state) && !openMenu(engine, state),
    'world menu closes after escape',
  )
  // The original combat proof ends at the first return. The next contact has its own witness.
  const trace = await evidence()
  assert.equal(trace.overflow, false)
  assert.deepEqual(trace.errors, [])
  if (capture.enabled) {
    await until(
      cooldown,
      ({ samples, secondContact }) => !secondContact && samples.at(-1)?.remaining <= 6,
      'returned field is recorded through nine suspended steps',
      2_000,
    )
    await capture.finish(page, {
      event: 'standing-in-the-field-during-escape-cooldown',
      seed: result.seed,
      scene: beeWorldInput.scene,
      grid: beeWorldInput.stop,
    })
  }
  trace.cooldown = await until(
    cooldown,
    ({ secondContact }) => secondContact !== null,
    'same hostile becomes eligible after its 15 suspended world steps',
    4_000,
  )
  return trace
}
