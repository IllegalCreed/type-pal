import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { tsImport } from 'tsx/esm/api'
import { battleFoundationInputSources } from './battle-foundation-scenarios.mjs'
import { repoRoot } from './browser-journey.mjs'

export const worldCase = {
  scene: 's002',
  index: 2,
  gameScene: 3,
  grid: [86, 9],
  screen: { x: 1232, y: 760 },
  facing: 'down',
  entity: 'e35',
  entityId: 35,
  target: { col: 86, row: 10, height: 0 },
  targetScreen: { x: 1216, y: 768 },
  music: 31,
  role: 2,
  weaponSlot: 3,
  body: '210',
  initialWeapon: '166',
}
export const scriptFixtureRoutes = {
  gameScene: '/extracted/data/scene/2.json',
  gameScripts: '/extracted/events/all.json',
  gameObjects: '/extracted/data/event-objects.json',
  reforgeScene: '/projects/pal/content/scenes/s002.json',
}
export const plan = [
  ['equip', '163'],
  ['equip', '164'],
  ['equip', '165'],
  ['equip', '166'],
  ['equip', '163'],
  ['remove', '163'],
  ['equip', '164'],
  ['remove', '164'],
  ['equip', '165'],
  ['remove', '165'],
].map(([kind, item], index) => ({ kind, item, id: `${index + 1}-${kind}-${item}` }))

export const gearStates = {
  '': [38, 40, false, 2],
  163: [58, 60, true, 6],
  164: [104, 73, true, 6],
  165: [137, 100, true, 6],
  166: [40, 43, false, 2],
}
const json = async (path) => JSON.parse(await readFile(resolve(repoRoot, path), 'utf8'))
const source = {
  gameScene: 'data/extracted/data/scene/2.json',
  rawScripts: 'data/extracted/events/all.json',
  rawObjects: 'data/extracted/data/event-objects.json',
  reforgeScene: 'projects/pal/content/scenes/s002.json',
  inheritedMusic: 'projects/pal/content/scenes/s001.json',
  gameItems: 'data/extracted/data/items.json',
  actors: 'projects/pal/content/actors.json',
  items: 'projects/pal/content/items.json',
}
export async function worldWhipSources() {
  return [
    ...new Set([
      ...(await battleFoundationInputSources(repoRoot)),
      ...Object.values(source),
      'packages/reforge/src/battle/battle-player-input.ts',
      'packages/content/src/item.ts',
      'reference/sdlpal/uigame.c',
      'reference/sdlpal/script.c',
      'data/extracted/music/031.mid',
      'projects/pal/assets/migrated/music/031.mid',
    ]),
  ].sort()
}

export async function makeWorldWhipFixtures(slot) {
  assert([2, 3].includes(slot), 'the fixture uses a valid body or weapon slot')
  const [gameScene, scripts, objects, reforgeScene, roomBefore, gameItems, actors, items] =
    await Promise.all([...Object.values(source).map(json)])
  assert.equal(roomBefore.music, 'music.pal.031')
  assert.equal(gameScene.sceneId, worldCase.index)
  assert.equal(reforgeScene.id, worldCase.scene)
  assert.deepEqual([reforgeScene.entry.pos.col, reforgeScene.entry.pos.row], worldCase.grid)
  assert.equal(reforgeScene.entry.facing, worldCase.facing)
  const commands = scripts.segments.find(({ name }) => name === 'all').commands
  const raw = (ip) => [commands[ip].opcode, commands[ip].operands]
  for (const [id, ip, equipSlot, bonuses, effects] of [
    [
      '163',
      39668,
      'weapon',
      [
        [17, 20],
        [20, 20],
      ],
      [
        ['attack', 20],
        ['speed', 20],
      ],
    ],
    [
      '164',
      39674,
      'weapon',
      [
        [17, 66],
        [20, 33],
      ],
      [
        ['attack', 66],
        ['speed', 33],
      ],
    ],
    [
      '165',
      39680,
      'weapon',
      [
        [17, 99],
        [20, 60],
      ],
      [
        ['attack', 99],
        ['speed', 60],
      ],
    ],
    [
      '166',
      39011,
      'weapon',
      [
        [17, 2],
        [20, 3],
      ],
      [
        ['attack', 2],
        ['speed', 3],
      ],
    ],
    [
      '210',
      38835,
      'body',
      [
        [19, 3],
        [20, 4],
      ],
      [
        ['defense', 3],
        ['speed', 4],
      ],
    ],
  ]) {
    const legacy = gameItems.find(({ id: objectId }) => String(objectId) === id)
    const item = items.find(({ id: identifier }) => identifier === id)
    assert.equal(legacy.scriptOnEquip, ip)
    assert.equal(legacy.flags.equipableBy[worldCase.role], true)
    assert(item.equip.equipableBy.includes('lin-yueru'))
    const part = equipSlot === 'weapon' ? 14 : 13
    assert.deepEqual(raw(ip), [0x18, [part, Number(id), 0]])
    assert.deepEqual(
      bonuses.map((_, index) => raw(ip + index + 1)),
      bonuses.map(([stat, amount]) => [0x17, [part, stat, amount]]),
    )
    const expected = effects.map(([stat, delta]) => ({ kind: 'statBonus', stat, delta }))
    if (Number(id) >= 163 && Number(id) <= 165) {
      assert.deepEqual(raw(ip + 3), [0x1a, [4, 1, 0]])
      assert.deepEqual(raw(ip + 4), [0x1a, [1, 6, 0]])
      assert.equal(commands[ip + 5].op, 'end')
      expected.push(
        { kind: 'attackAll' },
        { kind: 'battleSprite', byActor: { 'lin-yueru': 'player-fighter-6' } },
      )
    } else assert.equal(commands[ip + 3].op, 'end')
    assert.deepEqual([item.equip.slot, item.equip.effects], [equipSlot, expected])
  }

  // The fixture replaces one inactive scene actor with a repeatable interaction.
  // The game's real search, trigger interpreter and 0x23/unequip handlers own every operation.
  const ip = commands.length
  const operands = [worldCase.role, slot + 1, 0]
  commands.push(
    { op: 'raw', label: `L_${ip}`, opcode: 0x23, operands },
    { op: 'end', label: `L_${ip + 1}` },
  )
  const gameActor = gameScene.eventObjects.find(({ id }) => id === worldCase.entityId)
  assert(gameActor && gameActor.sState === 0 && gameActor.spriteNum === 31)
  const sharedActor = objects.eventObjects.find(({ id }) => id === worldCase.entityId)
  assert.deepEqual(sharedActor, gameActor)
  for (const actor of [gameActor, sharedActor])
    Object.assign(actor, worldCase.targetScreen, {
      triggerLabel: `L_${ip}`,
      triggerMode: 1,
      sState: 1,
    })
  const palActor = reforgeScene.entities.find(({ id }) => id === worldCase.entity)
  assert(palActor?.hidden && palActor.sprite === 'sprite-31')
  Object.assign(palActor, {
    pos: worldCase.target,
    hidden: false,
    pages: [
      {
        id: 'default',
        label: '测试卸下装备',
        trigger: 'default',
        triggerActivation: { on: 'interact', range: 1 },
      },
    ],
    behaviors: {
      trigger: {
        default: {
          label: '测试卸下装备',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'initial',
            stages: [{ id: 'initial', body: [{ kind: 'unequip', role: worldCase.role, slot }] }],
          },
        },
      },
    },
  })

  const { buildWorld, validateActors } = await tsImport(
    '../../packages/content/src/index.ts',
    import.meta.url,
  )
  const { buildCurrentSavePayload } = await tsImport(
    '../../packages/reforge/src/save/ops.ts',
    import.meta.url,
  )
  const [actor] = validateActors(actors.filter(({ id }) => id === 'lin-yueru'))
  const world = buildWorld(
    {
      party: [actor.id],
      money: 0,
      inventory: ['163', '164', '165'].map((itemId) => ({ itemId, count: 1 })),
    },
    { [actor.id]: actor },
  )
  // Starting equipment is declared in the isolated checkpoint, before any recorded operation.
  world.party[0].equipment = { body: worldCase.body, weapon: worldCase.initialWeapon }
  world.audio = { currentMusic: 'music.pal.031' }
  const save = buildCurrentSavePayload(
    world,
    {
      sceneId: worldCase.scene,
      pos: { col: worldCase.grid[0], row: worldCase.grid[1], height: 0 },
      facing: worldCase.facing,
    },
    'pal',
  )
  return {
    gameScene,
    scripts,
    objects,
    reforgeScene,
    save,
    fixtureCommand: {
      game: commands.slice(-2),
      reforge: palActor.behaviors.trigger.default.flow.stages[0].body,
      gameActor,
      reforgeActor: palActor,
    },
  }
}

export function gameWorldCheckpoint(input) {
  assert.equal(input.gs.wNumScene, worldCase.gameScene)
  const gs = input.gs
  gs.party = { ...worldCase.screen, facing: worldCase.facing }
  gs.camera = { x: worldCase.screen.x - 160, y: worldCase.screen.y - 112 }
  gs.trail = Array.from({ length: 5 }, () => ({ ...worldCase.screen, dir: worldCase.facing }))
  gs.wNumMusic = worldCase.music
  gs.partyMembers = [worldCase.role]
  // This is the declared pre-journey native V1 save, reconstructed on each run.
  const equipment = gs.PlayerRolesRuntime.rgwEquipment
  assert.equal(equipment[3][worldCase.role], 163)
  for (const [slot, item] of [
    0,
    0,
    Number(worldCase.body),
    Number(worldCase.initialWeapon),
    0,
    0,
  ].entries())
    equipment[slot][worldCase.role] = item
  gs.inventory = [163, 164, 165].map((itemId) => ({ itemId, count: 1, inUse: 0 }))
  return input
}
