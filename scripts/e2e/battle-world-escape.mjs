import assert from 'node:assert/strict'
import { beeWorldInput } from './battle-world-bee-scenario.mjs'

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
        !state.run.scriptRunning
}

const openMenu = (engine, state) =>
  engine === 'game' ? state?.menu?.kind === 'in-game' : state?.run?.menuActive

export async function verifyWorldEscape({
  engine,
  result,
  read,
  page,
  until,
  press,
  capture,
  probe,
  evidence,
}) {
  const poll = (accept, name) => until(read, accept, name, 10_000)
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

  await press('Escape', 'world-control', 'open world menu after escape')
  const menu = await poll((state) => openMenu(engine, state), 'world menu opens after escape')
  result.control = engine === 'game' ? menu.menu : menu.run
  await press('Escape', 'world-control', 'close world menu after escape')
  result.end = await poll(
    (state) => worldReady(engine, state) && !openMenu(engine, state),
    'world menu closes after escape',
  )
  result.attemptedMenus = [...submitted]
  if (!probe) assert.equal(submitted.size, result.attempts, 'wrong number of escape turns')
  const trace = await evidence()
  assert.equal(trace.overflow, false)
  assert.deepEqual(trace.errors, [])
  if (capture.enabled)
    await capture.finish(page, {
      event: 'after-escape-menu-round-trip',
      seed: result.seed,
      scene: beeWorldInput.scene,
      grid: beeWorldInput.stop,
    })
}
