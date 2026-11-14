import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { tsImport } from 'tsx/esm/api'

export const defeatScenario = {
  id: 'yangzhou-thief-defeat',
  scene: 's093',
  gameScene: 94,
  map: 86,
  field: 24,
  owner: 'e1759',
  entities: ['e1758', 'e1759'],
  team: 29,
  enemy: 'enemy-478',
  route: { start: [54, 8], contact: [55, 8] },
  player: 'li-xiaoyao',
  returning: 'lin-yueru',
  seed: 6,
  hp: 1,
  mp: 70,
  money: 150,
  inventory: [{ itemId: '115', count: 1 }],
  sceneMusic: 36,
  battleMusic: 38,
  choice: { key: 'd', turn: 1, kind: 'defend' },
}

export const defeatSources = {
  game: [
    'data/extracted/data/scene/93.json',
    'data/extracted/data/scene/97.json',
    'data/extracted/data/tilemap/86.json',
    'data/extracted/data/event-objects.json',
    'data/extracted/data/player-roles.json',
    'data/extracted/data/enemy-teams.json',
    'data/extracted/data/enemy-objects.json',
    'data/extracted/data/enemies.json',
    'data/extracted/data/battle-fields.json',
    'data/extracted/data/items.json',
    'data/extracted/events/all.json',
    'data/extracted/music/036.mid',
    'data/extracted/music/038.mid',
    'data/extracted/sounds/158.wav',
    'data/extracted/sounds/201.wav',
  ],
  reforge: [
    'projects/pal/manifest.json',
    'projects/pal/content/scenes/s093.json',
    'projects/pal/content/scenes/s097.json',
    'projects/pal/content/maps/map-086.json',
    'projects/pal/content/actors.json',
    'projects/pal/content/enemy-teams.json',
    'projects/pal/content/enemies.json',
    'projects/pal/content/battle-fields.json',
    'projects/pal/content/items.json',
    'projects/pal/content/locale.json',
    'projects/pal/content/skills.json',
    'projects/pal/assets/index.json',
    'projects/pal/assets/migrated/music/036.mid',
    'projects/pal/assets/migrated/music/038.mid',
    'projects/pal/assets/migrated/sounds/158.wav',
    'projects/pal/assets/migrated/sounds/201.wav',
  ],
}

export function toGamePixel([col, row]) {
  return [16 * (col - row), 8 * (col + row)]
}

export function makeGameDefeatSave(baseline) {
  const { gameScene, entities, route, hp, mp, money, inventory, sceneMusic, battleMusic } =
    defeatScenario
  const fixture = JSON.parse(baseline)
  const gs = fixture.gs
  assert.equal(gs.wNumScene, gameScene)
  const [x, y] = toGamePixel(route.start)
  gs.party = { x, y, facing: 'right' }
  gs.camera = { x: x - 160, y: y - 112 }
  gs.trail = Array.from({ length: 5 }, (_, index) => ({
    x: x - 16 * index,
    y: y - 8 * index,
    dir: 'right',
  }))
  gs.partyMembers = [0]
  gs.PlayerRolesRuntime.rgwHP[0] = hp
  gs.PlayerRolesRuntime.rgwMP[0] = mp
  gs.dwCash = money
  gs.inventory = inventory.map(({ itemId, count }) => ({ itemId: Number(itemId), count }))
  gs.wNumMusic = sceneMusic
  gs.wNumBattleMusic = battleMusic
  // PAL e1785 runs 13730/13731 before the party enters this map. Materialize
  // only those two existing visibility writebacks in the fixed save input.
  for (const table of [gs.npcs, gs.allEventObjects]) {
    for (const id of entities) {
      const entity = table.find((npc) => npc.id === Number(id.slice(1)))
      assert.equal(entity?.sState, 0, `expected original hidden ${id}`)
      entity.sState = 1
    }
  }
  return fixture
}

export async function makeReforgeDefeatSave() {
  const { applySetParty, buildWorld, validateActors } = await tsImport(
    '../../packages/content/src/index.ts',
    import.meta.url,
  )
  const { buildCurrentSavePayload } = await tsImport(
    '../../packages/reforge/src/save/ops.ts',
    import.meta.url,
  )
  const { scene, entities, route, player, returning, hp, mp, money, inventory, sceneMusic } =
    defeatScenario
  const actors = validateActors(
    JSON.parse(
      await readFile(new URL('../../projects/pal/content/actors.json', import.meta.url)),
    ).filter(({ id }) => [player, returning].includes(id)),
  )
  const byId = Object.fromEntries(actors.map((actor) => [actor.id, actor]))
  const world = buildWorld(
    { party: [player, returning], money, inventory, seedStats: { [player]: { hp, mp } } },
    byId,
  )
  applySetParty(world, [player], byId)
  world.audio = { currentMusic: `music.pal.${String(sceneMusic).padStart(3, '0')}` }
  // Match the authored predecessor's e1785 visibility changes.
  world.script.entityState[scene] = Object.fromEntries(entities.map((id) => [id, 1]))
  const [col, row] = route.start
  return buildCurrentSavePayload(
    world,
    { sceneId: scene, pos: { col, row, height: 0 }, facing: 'right' },
    'pal',
  )
}
