import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

export const fieldMusic = 78
export const fieldMusicAsset = 'music.pal.078'

const musicId = (track) => String(track).padStart(3, '0')
export const nativeMusic = (track) => `music.pal.${musicId(track)}`
export const initialTrack = (spec) => spec.mapMusic?.track ?? fieldMusic
export const returnedPosition = (spec) => spec.world.returned ?? spec.contact
export const departingPosition = (spec) => spec.world.departure ?? spec.start

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
  spider: {
    id: 'black-spider',
    scene: 's139',
    owner: 'e2346',
    watched: ['e2347'],
    team: 43,
    enemy: 'enemy-498',
    start: [66, 30, 0],
    contact: [67, 30, 0],
    approach: 'ArrowRight',
    music: 39,
    field: 11,
    slot: 0,
    seed: 4,
    disk: {
      entry: 21672,
      battle: 21690,
      last: 21691,
      owner: [608, 784, 1, 5],
      field: 21647,
      music: 21648,
      defeated: { ip: 42828, note: 13349, itemId: '152' },
    },
    mapMusic: { scene: 's139', ip: 21649, track: 36 },
    world: {
      gameState: 0,
      triggerMode: 5,
      returned: [69, 30, 0],
      departure: [70, 30, 0],
      exit: 'ArrowRight',
      inventory: [{ itemId: '152', count: 1 }],
    },
  },
}

export const projectFile = (path) => new URL(`../../../${path}`, import.meta.url)
export const json = async (path) => JSON.parse(await readFile(projectFile(path), 'utf8'))
export const gameScene = ({ scene }) => Number(scene.slice(1)) + 1
export const grid = ([col, row, height]) => ({ col, row, height })

export async function readSources(spec) {
  const sceneNumber = gameScene(spec) - 1
  const mapMusic = spec.mapMusic ?? { scene: 's044', ip: 9673, track: fieldMusic }
  const files = {
    gameScene: `data/extracted/data/scene/${sceneNumber}.json`,
    commands: 'data/extracted/events/all.json',
    musicScene: `data/extracted/data/scene/${Number(mapMusic.scene.slice(1))}.json`,
    canonicalMusicScene: `projects/pal/content/scenes/${mapMusic.scene}.json`,
    ...(spec.mapMusic ? {} : { canonicalMaze: 'projects/pal/content/scenes/s046.json' }),
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
  const fieldTrack = musicId(mapMusic.track)
  const initialScript = Number(data.musicScene.onEnterLabel.slice(2))
  assert(mapMusic.ip >= initialScript)
  assert(!commands.slice(initialScript, mapMusic.ip).some(({ op }) => op === 'end'))
  assert.deepEqual(
    [commands[mapMusic.ip].opcode, commands[mapMusic.ip].operands[0]],
    [67, mapMusic.track],
  )
  assert(
    data.canonicalMusicScene.hooks.onEnter.variants.default.flow.stages[0].body.some(
      ({ kind, asset }) => kind === 'playMusic' && asset === nativeMusic(mapMusic.track),
    ),
  )
  const { battle, entry, last, reward, defeated } = spec.disk
  const setMusic = commands[spec.disk.music ?? battle - 2]
  const setField = commands[spec.disk.field ?? battle - 1]
  assert.deepEqual([setMusic.opcode, setMusic.operands[0]], [69, spec.music])
  assert.deepEqual([setField.opcode, setField.operands[0]], [74, spec.field])
  assert.deepEqual([commands[battle].opcode, commands[battle].operands], [7, [spec.team, 41075, 0]])
  assert.equal(commands[last].op, 'end')
  if (reward)
    assert.deepEqual(
      [commands[reward].op, String(commands[reward].itemId)],
      ['giveItem', spec.world.inventory[0].itemId],
    )
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
    [
      launch.boss,
      launch.fieldId ?? data.rfScene.battleFieldId,
      launch.music ?? data.rfScene.battleMusic,
      launch.enemyTeamId,
    ],
    [true, spec.field, nativeMusic(spec.music), `team-${spec.team}`],
  )
  const original = data.enemies.find(({ id }) => id === team.enemies[spec.slot])
  const object = data.objects.find(({ objectIndex }) => `enemy-${objectIndex}` === spec.enemy)
  assert.equal(object.enemyId, original.id)
  if (defeated) {
    assert.equal(object.scriptOnBattleEnd, defeated.ip)
    assert.deepEqual(
      [commands[defeated.ip].op, String(commands[defeated.ip].itemId)],
      ['giveItem', defeated.itemId],
    )
    assert.equal(commands[defeated.ip + 2].messageIndex, defeated.note)
  }
  const bee = data.objects.find(({ objectIndex }) => objectIndex === 403)
  const summoned = data.enemies.find(({ id }) => id === bee.enemyId)
  const summonCount = spec.team === 44 ? 4 : 0
  const summonBonus = { exp: summonCount * summoned.exp, cash: summonCount * summoned.cash }
  const battleTrack = musicId(spec.music)
  return {
    paths: [
      ...Object.values(files),
      'data/extracted/data/event-objects.json',
      'data/extracted/data/battle-fields.json',
      `data/extracted/data/tilemap/${data.gameScene.mapNum}.json`,
      `data/extracted/music/${battleTrack}.mid`,
      `data/extracted/music/${fieldTrack}.mid`,
      'projects/pal/content/actors.json',
      'projects/pal/content/enemies.json',
      'projects/pal/content/battle-fields.json',
      `projects/pal/content/maps/${data.rfScene.mapId}.json`,
      `projects/pal/assets/migrated/music/${battleTrack}.mid`,
      `projects/pal/assets/migrated/music/${fieldTrack}.mid`,
    ],
    hiddenLevels: party.map(({ roleId }) => data.actors.roles[roleId].level),
    slots,
    original,
    summonBonus,
    pre: commands.slice(entry, battle),
    post: commands.slice(battle + 1, last),
    defeatedNote: defeated ? commands[defeated.ip + 2].text : null,
    canonical: native,
    locale: data.locale,
  }
}
