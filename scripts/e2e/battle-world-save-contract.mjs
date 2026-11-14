import assert from 'node:assert/strict'
import { beePartyMember, beeWorldInput, honeycombItem } from './battle-world-bee-scenario.mjs'

export const savedPoses = [
  { grid: beeWorldInput.stop, facing: 'right' },
  { grid: [beeWorldInput.stop[0] - 1, beeWorldInput.stop[1]], facing: 'left' },
]
export const manualSaveSlots = { game: [1, 2, 3], reforge: ['m01', 'm02', 'm03'] }
export const badSaveToast = '存档损坏，无法读取'

export function saveWorldFacts(loaded, engine) {
  if (engine === 'game') {
    const { wNumScene, party, partyMembers, inventory, dwCash, PlayerRolesRuntime, Exp } = loaded.gs
    const npc = loaded.gs.npcs.find(({ id }) => id === Number(beeWorldInput.enemy.slice(1)))
    const { x, y, facing } = party
    return {
      scene: `s${String(wNumScene - 1).padStart(3, '0')}`,
      grid: [(x / 16 + y / 8) / 2, (y / 8 - x / 16) / 2],
      facing,
      party: partyMembers.map((id) => {
        assert.equal(id, beePartyMember.role)
        return {
          id: beePartyMember.id,
          hp: PlayerRolesRuntime.rgwHP[id],
          maxHP: PlayerRolesRuntime.rgwMaxHP[id],
          mp: PlayerRolesRuntime.rgwMP[id],
          maxMP: PlayerRolesRuntime.rgwMaxMP[id],
          level: PlayerRolesRuntime.rgwLevel[id],
          exp: Exp.rgPrimaryExp[id].wExp,
          weapon: String(PlayerRolesRuntime.rgwEquipment[3][id]),
        }
      }),
      inventory: inventory.map(({ itemId, count }) => ({ itemId: String(itemId), count })),
      money: dwCash,
      lifecycle: { hidden: npc.sState < 0, ticks: npc.sVanishTime },
    }
  }
  assert.equal(engine, 'reforge')
  const {
    position: { sceneId, pos, facing },
    world,
  } = loaded
  const npc = world.entityLifecycles?.[sceneId]?.[beeWorldInput.enemy]
  return {
    scene: sceneId,
    grid: [pos.col, pos.row],
    facing,
    party: world.party.map(({ template, hp, maxHP, mp, maxMP, level, exp, equipment }) => ({
      id: template,
      hp,
      maxHP,
      mp,
      maxMP,
      level,
      exp,
      weapon: equipment.weapon,
    })),
    inventory: world.inventory.map(({ itemId, count }) => ({ itemId, count })),
    money: world.money,
    lifecycle: { hidden: npc?.phase === 'despawned', ticks: npc?.remainingTicks },
  }
}

export function assertSavedWorld(world, pose) {
  const { lifecycle, ...state } = world
  assert.deepEqual(
    state,
    {
      scene: beeWorldInput.scene,
      ...pose,
      party: [
        {
          id: beePartyMember.id,
          hp: 475,
          maxHP: 480,
          mp: 405,
          maxMP: 410,
          level: 28,
          exp: 4,
          weapon: '187',
        },
      ],
      inventory: [{ itemId: honeycombItem, count: 2 }],
      money: 4,
    },
    'native save/load must preserve the earned rewards, party and chosen pose',
  )
  assert.equal(lifecycle.hidden, true, 'defeated encounter must remain hidden')
  assert(
    Number.isSafeInteger(lifecycle.ticks) && lifecycle.ticks > 0 && lifecycle.ticks <= 800,
    'native save/load must preserve a live remaining respawn delay',
  )
}

export function assertRestoredWorld(before, after, maxAdvancedTicks) {
  const { lifecycle: from, ...saved } = before
  const { lifecycle: to, ...restored } = after
  assert.deepEqual(restored, saved, 'restore applied a different slot world')
  assert.equal(to.hidden, true, 'restore revived the defeated encounter')
  assert(
    to.ticks <= from.ticks && from.ticks - to.ticks <= maxAdvancedTicks,
    'restore changed the saved respawn delay outside the actual tick window',
  )
}
