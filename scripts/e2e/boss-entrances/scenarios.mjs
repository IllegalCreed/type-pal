import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

export const party = [
  {
    role: 'li-xiaoyao',
    roleId: 0,
    level: 35,
    hp: 730,
    maxHP: 730,
    mp: 100,
    maxMP: 100,
    attack: 660,
    defense: 170,
    speed: 210,
    magicAttack: 65,
    luck: 32,
  },
  {
    role: 'lin-yueru',
    roleId: 2,
    level: 35,
    hp: 690,
    maxHP: 690,
    mp: 90,
    maxMP: 90,
    attack: 535,
    defense: 165,
    speed: 190,
    magicAttack: 60,
    luck: 32,
  },
]

export const statsFields = {
  level: 'rgwLevel',
  hp: 'rgwHP',
  maxHP: 'rgwMaxHP',
  mp: 'rgwMP',
  maxMP: 'rgwMaxMP',
  attack: 'rgwAttackStrength',
  defense: 'rgwDefense',
  speed: 'rgwDexterity',
  magicAttack: 'rgwMagicStrength',
  luck: 'rgwFleeRate',
}

export const growthPools = {
  maxHP: 'rgHealthExp',
  maxMP: 'rgMagicExp',
  attack: 'rgAttackExp',
  magicAttack: 'rgMagicPowerExp',
  defense: 'rgDefenseExp',
  speed: 'rgDexterityExp',
  luck: 'rgFleeExp',
}

export const scenarios = {
  snake: {
    id: 'hidden-dragon-snake',
    scene: 's041',
    owner: 'e671',
    team: 45,
    enemy: 'enemy-486',
    start: [75, 27, 0],
    contact: [75, 26, 0],
    music: 39,
    field: 27,
    slot: 0,
    seed: 4,
    disk: { entry: 9472, battle: 9492, last: 9494, owner: [816, 776, 1, 7] },
    world: { gameState: 1, triggerMode: 2, inventory: [] },
  },
  fox: {
    id: 'hidden-dragon-fox',
    scene: 's047',
    owner: 'e760',
    team: 44,
    enemy: 'enemy-469',
    start: [64, -23, 0],
    contact: [64, -24, 0],
    music: 38,
    field: 27,
    slot: 1,
    seed: 4,
    disk: { entry: 9498, battle: 9552, last: 9589, owner: [1440, 304, 2, 6], reward: 9554 },
    world: { gameState: 0, triggerMode: 6, inventory: [{ itemId: '289', count: 1 }] },
  },
}

export const projectFile = (path) => new URL(`../../../${path}`, import.meta.url)
export const json = async (path) => JSON.parse(await readFile(projectFile(path), 'utf8'))
export const gameScene = ({ scene }) => Number(scene.slice(1)) + 1
export const grid = ([col, row, height]) => ({ col, row, height })

export async function readSources(spec) {
  const sceneNumber = gameScene(spec) - 1
  const files = {
    gameScene: `data/extracted/data/scene/${sceneNumber}.json`,
    commands: 'data/extracted/events/all.json',
    actors: 'data/extracted/data/player-roles.json',
    enemies: 'data/extracted/data/enemies.json',
    objects: 'data/extracted/data/enemy-objects.json',
    teams: 'data/extracted/data/enemy-teams.json',
    rfScene: `projects/pal/content/scenes/${spec.scene}.json`,
    rfTeams: 'projects/pal/content/enemy-teams.json',
    locale: 'projects/pal/content/locale.json',
  }
  const data = Object.fromEntries(
    await Promise.all(Object.entries(files).map(async ([kind, path]) => [kind, await json(path)])),
  )
  const actor = data.gameScene.eventObjects.find(({ id }) => `e${id}` === spec.owner)
  assert.deepEqual([actor.x, actor.y, actor.sState, actor.triggerMode], spec.disk.owner)
  assert.equal(actor.triggerLabel, `L_${spec.disk.entry}`)
  const commands = data.commands.segments.flatMap(({ commands }) => commands)
  const { battle, entry, last, reward } = spec.disk
  assert.deepEqual(
    [commands[battle - 2].opcode, commands[battle - 2].operands[0]],
    [69, spec.music],
  )
  assert.deepEqual(
    [commands[battle - 1].opcode, commands[battle - 1].operands[0]],
    [74, spec.field],
  )
  assert.deepEqual([commands[battle].opcode, commands[battle].operands], [7, [spec.team, 41075, 0]])
  assert.equal(commands[last].op, 'end')
  if (reward) assert.deepEqual([commands[reward].op, commands[reward].itemId], ['giveItem', 289])
  const team = data.teams.find(({ id }) => id === spec.team)
  const slots = team.enemyObjectIndexes.map((id) => (id > 0 && id < 65535 ? `enemy-${id}` : null))
  assert.equal(slots[spec.slot], spec.enemy)
  assert.equal(slots.filter(Boolean).length, 1)
  const rfTeam = data.rfTeams.find(({ id }) => id === `team-${spec.team}`)
  assert.deepEqual(
    Array.from({ length: 5 }, (_, i) => rfTeam.slots[i] ?? null),
    slots,
  )
  const boss = data.rfScene.entities.find(({ id }) => id === spec.owner)
  const native = boss.behaviors.trigger.default.flow.stages[0].body
  const launch = native.find(({ kind }) => kind === 'startBattle')
  assert.deepEqual(
    [launch.boss, launch.fieldId, launch.music, launch.enemyTeamId],
    [true, spec.field, `music.pal.${String(spec.music).padStart(3, '0')}`, `team-${spec.team}`],
  )
  const original = data.enemies.find(({ id }) => id === team.enemies[spec.slot])
  const object = data.objects.find(({ objectIndex }) => `enemy-${objectIndex}` === spec.enemy)
  assert.equal(object.enemyId, original.id)
  const bee = data.objects.find(({ objectIndex }) => objectIndex === 403)
  const summoned = data.enemies.find(({ id }) => id === bee.enemyId)
  const summonCount = spec.slot === 1 ? 4 : 0
  const summonBonus = { exp: summonCount * summoned.exp, cash: summonCount * summoned.cash }
  const battleTrack = String(spec.music).padStart(3, '0')
  return {
    paths: [
      ...Object.values(files),
      'data/extracted/data/event-objects.json',
      'data/extracted/data/battle-fields.json',
      `data/extracted/data/tilemap/${data.gameScene.mapNum}.json`,
      `data/extracted/music/${battleTrack}.mid`,
      'projects/pal/content/actors.json',
      'projects/pal/content/enemies.json',
      'projects/pal/content/battle-fields.json',
      `projects/pal/content/maps/${data.rfScene.mapId}.json`,
      `projects/pal/assets/migrated/music/${battleTrack}.mid`,
    ],
    hiddenLevels: party.map(({ roleId }) => data.actors.roles[roleId].level),
    slots,
    original,
    summonBonus,
    pre: commands.slice(entry, battle),
    post: commands.slice(battle + 1, last),
    canonical: native,
    locale: data.locale,
  }
}
