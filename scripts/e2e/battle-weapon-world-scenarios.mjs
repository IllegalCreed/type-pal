import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { tsImport } from 'tsx/esm/api'
import { repoRoot } from './browser-journey.mjs'

export const slots = ['head', 'cloak', 'body', 'weapon', 'feet', 'accessory']
export const actors = ['li-xiaoyao', 'zhao-linger', 'lin-yueru', 'wu-hou', 'anu', 'gai-luojiao']
const leaders = [0, 1, 2, 4]
export const room = {
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
}
export const scriptFixtureRoutes = {
  gameScene: '/extracted/data/scene/2.json',
  gameScripts: '/extracted/events/all.json',
  gameObjects: '/extracted/data/event-objects.json',
  reforgeScene: '/projects/pal/content/scenes/s002.json',
  reforgeSave: '/__q2-world-equip-save.json',
}
const source = {
  gameScene: 'data/extracted/data/scene/2.json',
  scripts: 'data/extracted/events/all.json',
  objects: 'data/extracted/data/event-objects.json',
  reforgeScene: 'projects/pal/content/scenes/s002.json',
  roomBefore: 'projects/pal/content/scenes/s001.json',
  gameItems: 'data/extracted/data/items.json',
  gameRoles: 'data/extracted/data/player-roles.json',
  palActors: 'projects/pal/content/actors.json',
  palItems: 'projects/pal/content/items.json',
  palSkills: 'projects/pal/content/skills.json',
  palManifest: 'projects/pal/manifest.json',
  assetIndex: 'projects/pal/assets/index.json',
}
export async function worldEquipmentSources(inputs) {
  const raw = 'data/extracted'
  const ui = 'packages/reforge/src/engine-chrome/assets/ui'
  const rawTables = (await readdir(resolve(repoRoot, raw, 'data')))
    .filter((name) => name.endsWith('.json'))
    .map((name) => `${raw}/data/${name}`)
  const authoredTables = Object.values(inputs.palManifest.content)
    .filter((name) => name.endsWith('.json'))
    .map((name) => `projects/pal/${name}`)
  const rawIcons = inputs.gameItems
    .filter(({ flags }) => flags.equipable)
    .map(({ bitmap }) => `${raw}/images/items/${String(bitmap).padStart(3, '0')}.png`)
  const authoredIcons = inputs.palItems
    .filter(({ equip }) => equip)
    .map(({ icon }) => `projects/pal/${inputs.assetIndex.assets[icon].path}`)
  const gameMenuFrames = [
    ...Array.from({ length: 9 }, (_, i) => i),
    69,
    ...Array.from({ length: 10 }, (_, i) => 56 + i),
  ].map((index) => `${raw}/images/ui/frame-${String(index).padStart(2, '0')}.png`)
  const reforgeMenuFrames = [
    ...['box', 'itembox'].flatMap((name) =>
      Array.from({ length: 9 }, (_, i) => `${name}/frame-0${i}.png`),
    ),
    ...Array.from({ length: 10 }, (_, i) => `num-cyan/${i}.png`),
    'status/bg.png',
    'cursor/grid.png',
  ].map((name) => `${ui}/${name}`)
  return [
    ...new Set([
      ...Object.values(source),
      ...rawTables,
      ...authoredTables,
      ...rawIcons,
      ...authoredIcons,
      ...gameMenuFrames,
      ...reforgeMenuFrames,
      `${raw}/data/font/glyphs.json`,
      `${raw}/data/palette/0.json`,
      `${raw}/data/tilemap/${inputs.gameScene.mapNum}.json`,
      `${raw}/data/tileset/${inputs.gameScene.mapNum}.rle`,
      `${raw}/data/ui-sprite/spriteui.json`,
      `${raw}/events/scene-002.json`,
      `${raw}/images/battle/bg/001.png`,
      `${raw}/lookup/words.json`,
      `${raw}/music/031.mid`,
      `projects/pal/content/maps/${inputs.reforgeScene.mapId}.json`,
      'projects/pal/assets/migrated/tilesets/012.rle',
      'projects/pal/assets/migrated/music/031.mid',
      'packages/game/src/core/battle-role-projection.ts',
      'packages/reforge/src/battle/battle-player-input.ts',
      'packages/content/src/item.ts',
      'reference/sdlpal/uigame.c',
      'reference/sdlpal/script.c',
    ]),
  ].sort()
}

export async function loadEquipmentInputs() {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(source).map(async ([name, path]) => [
        name,
        JSON.parse(await readFile(resolve(repoRoot, path), 'utf8')),
      ]),
    ),
  )
}

export function equipmentCatalogue({ gameItems, scripts, palItems }) {
  const raw = gameItems.filter(({ flags }) => flags.equipable)
  const authored = palItems.filter(({ equip }) => equip)
  assert.equal(raw.length, 106)
  assert.deepEqual(raw.map(({ id }) => String(id)).sort(), authored.map(({ id }) => id).sort())
  const commands = scripts.segments.find(({ name }) => name === 'all').commands
  return new Map(
    raw.map(({ id, flags, scriptOnEquip, _name }) => {
      const { equip } = authored.find(({ id: key }) => key === String(id))
      const roles = actors.flatMap((_, index) => (flags.equipableBy[index] ? [index] : []))
      assert.deepEqual(roles.map((index) => actors[index]).sort(), [...equip.equipableBy].sort())
      const first = commands[scriptOnEquip]
      assert.deepEqual(
        [first.opcode, ...first.operands],
        [0x18, slots.indexOf(equip.slot) + 11, id, 0],
      )
      const effects = []
      for (let ip = scriptOnEquip + 1; commands[ip].op !== 'end'; ip++) {
        assert(ip - scriptOnEquip <= 8, `unrecognized equipment program ${id}`)
        const { opcode, operands } = commands[ip]
        effects.push([opcode, ...operands])
      }
      return [
        String(id),
        {
          id: String(id),
          name: _name,
          slot: equip.slot,
          roles,
          scriptOnEquip,
          effects,
          authored: equip.effects,
        },
      ]
    }),
  )
}

const equipment = (ids) => ids.map((id) => (id ? String(id) : ''))
const emptyGear = () => equipment([0, 0, 0, 0, 0, 0])
const equip = (item, role) => ({ kind: 'equip', item: String(item), role })
const remove = (item, role) => ({ kind: 'remove', item: String(item), role })
const sixSlotBefore = [196, 226, 208, 166, 236, 250]
const sixSlotAfter = [201, 225, 211, 175, 235, 249]
const profileIds = ['whips', 'six-slots', 'party', ...leaders.map((id) => `catalogue-${id}`)]
export function equipmentScenario(id, catalogue, wrongSlot = false) {
  assert(profileIds.includes(id), `unknown equipment scenario ${id}`)
  let party, starting, stock, steps, covered
  if (id === 'whips') {
    party = [2]
    starting = [equipment([0, 0, 210, 166, 0, 0])]
    stock = ['163', '164', '165']
    steps = [
      ...[163, 164, 165, 166, 163].map((item) => equip(item, 2)),
      remove(163, 2),
      equip(164, 2),
      remove(164, 2),
      equip(165, 2),
      remove(165, 2),
    ]
    if (wrongSlot) steps = steps.slice(0, 6)
  } else if (id === 'six-slots') {
    party = [0]
    starting = [equipment(sixSlotBefore)]
    stock = equipment(sixSlotAfter)
    steps = sixSlotAfter.map((item) => equip(item, 0))
    covered = stock
  } else if (id === 'party') {
    party = [0, 2]
    starting = [equipment([0, 0, 0, 166, 0, 0]), equipment([0, 0, 0, 163, 0, 0])]
    stock = ['167', '164']
    steps = [equip(167, 2), equip(164, 2)]
  } else {
    const role = Number(id.split('-')[1])
    party = [role]
    starting = [emptyGear()]
    const assigned = [...catalogue.values()].filter(
      (item) => leaders.find((lead) => item.roles.includes(lead)) === role,
    )
    const groups = slots.map((slot) => assigned.filter((item) => item.slot === slot))
    stock = assigned.map(({ id }) => id)
    steps = groups.flatMap((group) => {
      if (!group.length) return []
      const ids = group.map(({ id }) => id)
      if (ids.length === 1) {
        const alternate = [...catalogue.values()].find(
          (item) => item.slot === group[0].slot && item.id !== ids[0] && item.roles.includes(role),
        )
        assert(alternate, `missing legal replacement for ${ids[0]}`)
        stock.push(alternate.id)
        ids.push(alternate.id)
      }
      // Rotate pairs so each entry is worn from an empty slot, swapped in and out,
      // and then returned by the room's actual unequip command.
      return ids.flatMap((item, index) => {
        const replacement = ids[(index + 1) % ids.length]
        return [equip(item, role), equip(replacement, role), remove(replacement, role)]
      })
    })
    covered = assigned.map(({ id }) => id)
  }
  for (const [index, role] of party.entries())
    starting[index].forEach((item, slot) => {
      if (!item) return
      const entry = catalogue.get(item)
      assert(entry.roles.includes(role))
      assert.equal(entry.slot, slots[slot])
    })
  assert.equal(new Set(stock).size, stock.length)
  const plan = steps.map(({ kind, item, role }, index) => {
    const entry = catalogue.get(item)
    assert(entry.roles.includes(role))
    const slot = slots.indexOf(entry.slot)
    return { id: `${index + 1}-${kind}-${item}`, kind, item, role, slot }
  })
  return { id, party, starting, stock, plan, covered: covered ?? [], wrongSlot }
}

export async function makeEquipmentFixture(inputs, scenario) {
  const { gameScene, scripts, objects, reforgeScene } = structuredClone(inputs)
  const { roomBefore, palActors } = inputs
  const prepare = roomBefore.hooks.onEnter.variants.default.flow.stages[0].entry.prepare
  assert(prepare.some(({ kind, asset }) => kind === 'playMusic' && asset === 'music.pal.031'))
  assert.equal(gameScene.sceneId, room.index)
  assert.equal(reforgeScene.id, room.scene)
  assert.deepEqual([reforgeScene.entry.pos.col, reforgeScene.entry.pos.row], room.grid)
  assert.equal(reforgeScene.entry.facing, room.facing)
  const commands = scripts.segments.find(({ name }) => name === 'all').commands
  const ip = commands.length
  const removals = scenario.plan
    .filter(({ kind }) => kind === 'remove')
    .map(({ role, slot }) => ({ role, slot: scenario.wrongSlot ? 2 : slot }))
  const gameCommands = removals.flatMap(({ role, slot }, index) => [
    { op: 'raw', label: `L_${ip + 2 * index}`, opcode: 0x23, operands: [role, slot + 1, 0] },
    {
      op: 'end',
      label: `L_${ip + 2 * index + 1}`,
      ...(index < removals.length - 1 && { advance: true }),
    },
  ])
  const reforgeStages = removals.map(({ role, slot }, index) => ({
    id: `remove-${index + 1}`,
    body: [{ kind: 'unequip', role, slot }],
    ...(index < removals.length - 1 && { next: `remove-${index + 2}` }),
  }))
  const gameActor = gameScene.eventObjects.find(({ id }) => id === room.entityId)
  const sharedActor = objects.eventObjects.find(({ id }) => id === room.entityId)
  const palActor = reforgeScene.entities.find(({ id }) => id === room.entity)
  assert(gameActor?.sState === 0 && gameActor.spriteNum === 31)
  assert.deepEqual(sharedActor, gameActor)
  assert(palActor?.hidden && palActor.sprite === 'sprite-31')
  if (removals.length) {
    // Advance the actual interaction after each invocation. The runner supplies
    // only the normal search key once the menu has returned control to the room.
    commands.push(...gameCommands)
    for (const actor of [gameActor, sharedActor])
      Object.assign(actor, room.targetScreen, {
        triggerLabel: `L_${ip}`,
        triggerMode: 1,
        sState: 1,
      })
    Object.assign(palActor, {
      pos: room.target,
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
            flow: { kind: 'stages', initial: 'remove-1', stages: reforgeStages },
          },
        },
      },
    })
  }
  const { buildWorld, validateActors } = await tsImport(
    '../../packages/content/src/index.ts',
    import.meta.url,
  )
  const { buildCurrentSavePayload } = await tsImport(
    '../../packages/reforge/src/save/ops.ts',
    import.meta.url,
  )
  const templates = scenario.party.map((index) => actors[index])
  const actorMap = Object.fromEntries(
    validateActors(palActors.filter(({ id }) => templates.includes(id))).map((actor) => [
      actor.id,
      actor,
    ]),
  )
  const world = buildWorld(
    {
      party: templates,
      money: 0,
      inventory: scenario.stock.map((itemId) => ({ itemId, count: 1 })),
    },
    actorMap,
  )
  for (const [index, member] of world.party.entries())
    member.equipment = Object.fromEntries(
      scenario.starting[index].flatMap((item, slot) => (item ? [[slots[slot], item]] : [])),
    )
  world.audio = { currentMusic: 'music.pal.031' }
  const save = buildCurrentSavePayload(
    world,
    {
      sceneId: room.scene,
      pos: { col: room.grid[0], row: room.grid[1], height: 0 },
      facing: room.facing,
    },
    'pal',
  )
  return {
    gameScene,
    scripts,
    objects,
    reforgeScene,
    save,
    event: { gameCommands, reforgeStages, gameActor, palActor },
  }
}

export function gameWorldCheckpoint(input, scenario) {
  const gs = input.gs
  assert.equal(gs.wNumScene, room.gameScene)
  gs.party = { ...room.screen, facing: room.facing }
  gs.camera = { x: room.screen.x - 160, y: room.screen.y - 112 }
  gs.trail = Array.from({ length: 5 }, () => ({ ...room.screen, dir: room.facing }))
  gs.wNumMusic = room.music
  gs.partyMembers = scenario.party
  for (const [index, role] of scenario.party.entries())
    for (const [slot, item] of scenario.starting[index].entries())
      gs.PlayerRolesRuntime.rgwEquipment[slot][role] = Number(item)
  gs.inventory = scenario.stock.map((itemId) => ({ itemId: Number(itemId), count: 1, inUse: 0 }))
  return input
}
