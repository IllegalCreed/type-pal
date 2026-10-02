import assert from 'node:assert/strict'

/** Return one ordinary key, or null only at the actually selected scene-use item. */
export function nextMealMenuKey(menu, engine) {
  assert(['game', 'reforge'].includes(engine), 'unknown meal menu engine')
  assert(menu && typeof menu.active === 'boolean', 'missing actual menu observation')
  if (!menu.active) return 'Escape'
  if (menu.panel === 'use' || menu.kind === 'inventory') {
    assert.equal(
      menu.phase,
      engine === 'game' ? 'list' : 'pick-item',
      'scene wine entered target picker',
    )
    assert(
      Array.isArray(menu.itemIds) && menu.itemIds.includes('272'),
      'wine absent from actual item menu',
    )
    assert(
      Number.isInteger(menu.cursor) && menu.cursor >= 0 && menu.cursor < menu.itemIds.length,
      'invalid actual item cursor',
    )
    const wine = menu.itemIds.indexOf('272')
    return menu.cursor === wine ? null : menu.cursor < wine ? 'ArrowRight' : 'ArrowLeft'
  }
  assert(!menu.panel, 'unexpected meal menu panel')
  if (engine === 'game') {
    assert(['in-game', 'inventory-action'].includes(menu.kind), 'unexpected game menu')
    const desired = menu.kind === 'in-game' ? '5' : '23'
    assert(menu.ids?.includes(desired), 'actual item/use node missing')
    assert(Number.isInteger(menu.cursor) && menu.cursor >= 0 && menu.cursor < menu.ids.length)
    return menu.ids[menu.cursor] === desired ? 'Enter' : 'ArrowDown'
  }
  const level = menu.levels?.at(-1)
  assert(
    level && Number.isInteger(level.cursor) && level.cursor >= 0 && level.cursor < level.ids.length,
    'invalid cascade cursor',
  )
  const desired = level.ids.includes('item') ? 'item' : 'use'
  assert(level.ids.includes(desired), 'actual item/use cascade node missing')
  return level.ids[level.cursor] === desired ? 'Enter' : 'ArrowDown'
}

/** No schedule of repeated confirmations: every key waits for a distinct actual rendered view. */
export async function selectMealWine({ readMenu, press, until, engine, record }) {
  for (let i = 0; i < 80; i++) {
    const menu = await readMenu()
    const key = nextMealMenuKey(menu, engine)
    if (key === null) {
      record(menu)
      return menu
    }
    const before = JSON.stringify(menu)
    await press(key, 'normal menu navigation toward scene wine')
    await until(readMenu, (next) => JSON.stringify(next) !== before, 'actual menu key consumed')
  }
  throw new Error('meal menu action budget exhausted')
}
