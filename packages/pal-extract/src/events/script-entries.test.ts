import { expect, test } from 'vitest'
import { collectScriptEntries } from './script-entries.js'

test('parsed script roots preserve scene/EO order and all twelve OBJECT hook fields', () => {
  const sources = {
    scenes: [{ scriptOnEnter: 3, scriptOnTeleport: 1 }],
    eventObjects: [{ triggerScript: 2, autoScript: 4 }],
    items: [{ scriptOnUse: 5, scriptOnEquip: 6, scriptOnThrow: 7, scriptDesc: 8 }],
    spells: [{ scriptOnUse: 9, scriptOnSuccess: 10, scriptDesc: 11 }],
    enemyObjects: [{ scriptOnTurnStart: 12, scriptOnBattleEnd: 13, scriptOnReady: 14 }],
    objectPlayers: [{ scriptOnFriendDeath: 15, scriptOnDying: 16 }],
  }
  // Parsed tables are borrowed. Freeze them so this pure collector cannot silently rewrite roots.
  for (const table of Object.values(sources)) {
    for (const row of table) Object.freeze(row)
    Object.freeze(table)
  }
  const result = collectScriptEntries(Object.freeze(sources))
  expect(result).toEqual({
    entryIps: [3, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    globalScriptEntries: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  })
})

test('zero roots are omitted, aliases are retained and returned arrays have independent owners', () => {
  const sources = {
    scenes: [{ scriptOnEnter: 0, scriptOnTeleport: 0 }],
    eventObjects: [{ triggerScript: 0, autoScript: 0 }],
    items: [{ scriptOnUse: 3, scriptOnEquip: 0, scriptOnThrow: 0, scriptDesc: 0 }],
    spells: [{ scriptOnUse: 0, scriptOnSuccess: 0, scriptDesc: 0 }],
    enemyObjects: [{ scriptOnTurnStart: 0, scriptOnBattleEnd: 0, scriptOnReady: 0 }],
    objectPlayers: [{ scriptOnFriendDeath: 0, scriptOnDying: 3 }],
  }
  const result = collectScriptEntries(sources)
  expect(result).toEqual({ entryIps: [3, 3], globalScriptEntries: [3, 3] })
  result.globalScriptEntries.push(99)
  expect(result.entryIps).toEqual([3, 3])
  result.entryIps.push(88)
  expect(collectScriptEntries(sources)).toEqual({
    entryIps: [3, 3],
    globalScriptEntries: [3, 3],
  })
})
