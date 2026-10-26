// @vitest-environment node
/** Actual extracted scripts through production callers; pair with pal-extract correction/CLI tests. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type {
  AbstractKey,
  BattleField,
  Enemy,
  EventFile,
  Item,
  Magic,
  PlayerRoles,
  Spell,
} from '@type-pal/shared'
import { afterEach, expect, test, vi } from 'vitest'
import { performItem } from './battle/actions/item.js'
import { performMagic } from './battle/actions/magic.js'
import { createBattleState } from './battle/battle-state.js'
import { createCommandBus } from './command-bus.js'
import { runEquipScript } from './equip-effect.js'
import { removeEquipmentEffect } from './equipment-state.js'
import { runScript, tickEventSystem } from './event-system.js'
import { createInitialGameState } from './game-state.js'
import { createSeedableRng } from './rng.js'
import { setGlobalEvents } from './script-catalog.js'

const assets = resolve(import.meta.dirname, '../../../../data/extracted')
function read<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(assets, path), 'utf8'))
}
const commands = read<EventFile>('events/all.json').segments.flatMap((segment) => segment.commands)
const items = read<Item[]>('data/items.json')
const spells = read<Spell[]>('data/spells.json')
const magics = read<Magic[]>('data/magic.json')
afterEach(() => {
  setGlobalEvents([])
  vi.useRealTimers()
})

test.each([
  { choice: 'Cancel', cash: 100, expectedCash: 100, count: 0 },
  { choice: 'Confirm', cash: 100, expectedCash: 80, count: 1 },
  { choice: 'Confirm', cash: 19, expectedCash: 19, count: 0 },
] as const)('candy purchase $choice with $cash cash pays only for a received candy', ({
  choice,
  cash,
  expectedCash,
  count,
}) => {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  vi.useFakeTimers({ toFake: ['performance'] })
  gs.dwCash = cash
  gs.mode = 'event'
  setGlobalEvents(structuredClone(commands))
  gs.eventCursor = { ip: 7567 }
  const bus = createCommandBus()
  let decisions = 0
  for (let frame = 0; frame < 100 && gs.mode === 'event'; frame++) {
    vi.advanceTimersByTime(1000)
    gs.nowMs = frame * 1000
    const inConfirmation = gs.eventCursor?.waiting === 'confirm'
    const pressed: AbstractKey = inConfirmation
      ? choice === 'Confirm' && !gs.eventCursor?.confirmYes
        ? 'Right'
        : choice
      : 'Confirm'
    if (inConfirmation && pressed === choice) decisions++
    tickEventSystem(gs, { held: new Set(), pressed: new Set([pressed]), frameNum: frame })
    bus.drain()
  }
  expect(gs.mode).toBe('explore')
  expect(decisions).toBe(1)
  expect(gs.dwCash).toBe(expectedCash)
  expect(gs.inventory.filter((item) => item.itemId === 80)).toEqual(
    count ? [{ itemId: 80, count }] : [],
  )
})

function battle() {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [1, 0]
  const playerRoles = read<PlayerRoles>('data/player-roles.json')
  for (const role of playerRoles.roles) {
    role.hp = role.maxHP = 600
    role.mp = role.maxMP = 1000
  }
  const state = createBattleState({
    gs,
    playerRoles,
    enemies: read<Enemy[]>('data/enemies.json')
      .filter((enemy) => enemy.health > 0)
      .slice(0, 1),
    field: read<BattleField[]>('data/battle-fields.json')[0]!,
    isBoss: false,
    rng: createSeedableRng(42),
  })
  return { gs, playerRoles, state, bus: createCommandBus() }
}

test.each([
  307, 308, 65,
])('real cure %i clears silence and debuffs while preserving positive statuses', (id) => {
  const env = battle()
  setGlobalEvents(structuredClone(commands))
  const target = env.state.players[1]!
  Object.assign(target.status, {
    confused: 3,
    paralyzed: 3,
    sleep: 3,
    silence: 3,
    bravery: 2,
    protect: 2,
    haste: 2,
  })
  if (id === 65) {
    env.gs.inventory = [{ itemId: id, count: 1 }]
    performItem({
      ...env,
      casterIsEnemy: false,
      casterIdx: 0,
      itemId: id,
      targetIsEnemy: false,
      targetIdx: 1,
      items: structuredClone(items),
      commands,
      runScript,
    })
    expect(env.gs.inventory.find((item) => item.itemId === id)?.count).toBe(0)
  } else {
    env.gs.PlayerRolesRuntime.rgwMagic[0]![1] = id
    performMagic({
      ...env,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: id,
      targetIsEnemy: false,
      targetIdx: 1,
      spells: structuredClone(spells),
      magics: structuredClone(magics),
      commands,
      runScript,
    })
    expect(env.playerRoles.roles[1]!.mp).toBeLessThan(1000)
  }
  expect(target.status).toMatchObject({
    confused: 0,
    paralyzed: 0,
    sleep: 0,
    silence: 0,
    bravery: 2,
    protect: 2,
    haste: 2,
  })
})

test('replacing and removing the dark blade clears its luck without overwriting the equipped sachet', () => {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [4]
  gs.inventory = [248, 187, 188].map((itemId) => ({ itemId, count: 1 }))
  setGlobalEvents(structuredClone(commands))
  const equip = (id: number) => {
    const item = items.find((item) => item.id === id)!
    expect(item.flags.equipableBy[4]).toBe(true)
    runEquipScript(gs, item.scriptOnEquip, 4)
  }
  equip(248)
  equip(187)
  expect(gs.rgEquipmentEffect[3]!.rgwFleeRate[4]).toBe(98)
  expect(gs.rgEquipmentEffect[5]!.rgwFleeRate[4]).toBe(9)
  equip(188)
  expect(gs.rgEquipmentEffect[3]!.rgwFleeRate[4]).toBe(36)
  expect(gs.rgEquipmentEffect[5]!.rgwFleeRate[4]).toBe(9)
  removeEquipmentEffect(gs, 4, 3)
  expect(gs.rgEquipmentEffect[3]!.rgwFleeRate[4]).toBe(0)
  expect(gs.rgEquipmentEffect[5]!.rgwFleeRate[4]).toBe(9)
})

test('real Wine God success script advances through eight uses and removes only Li Xiaoyao on the ninth', () => {
  const env = battle()
  const sourceSpells = structuredClone(spells)
  env.gs.inventory = [{ itemId: 86, count: 10 }]
  env.gs.PlayerRolesRuntime.rgwMagic[0]![0] = 370
  env.gs.PlayerRolesRuntime.rgwMagic[0]![1] = 296
  const learned = () => env.gs.PlayerRolesRuntime.rgwMagic.some((row) => row[0] === 370)
  for (let count = 1; count <= 9; count++) {
    env.playerRoles.roles[0]!.mp = 1000
    performMagic({
      ...env,
      casterIsEnemy: false,
      casterIdx: 1,
      spellId: 370,
      targetIsEnemy: true,
      targetIdx: 'all',
      spells: sourceSpells,
      magics: structuredClone(magics),
      commands,
      runScript,
    })
    env.bus.drain()
    expect(env.gs.inventory.find((item) => item.itemId === 86)?.count).toBe(10 - count)
    expect(learned()).toBe(count < 9)
    expect(env.gs.PlayerRolesRuntime.rgwMagic[0]![1]).toBe(296)
  }
  expect(sourceSpells).toEqual(spells)
})
