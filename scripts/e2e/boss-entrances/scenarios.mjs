import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

export const fieldMusic = 78
export const fieldMusicAsset = 'music.pal.078'

const musicId = (track) => String(track).padStart(3, '0')
export const nativeMusic = (track) => `music.pal.${musicId(track)}`
export const initialTrack = (spec) => spec.mapMusic?.track ?? fieldMusic
export const returnTrack = (spec) => spec.world.music?.track ?? initialTrack(spec)
export const returnedPosition = (spec) => spec.world.returned ?? spec.contact
export const departingPosition = (spec) => spec.world.departure ?? spec.start
export const battleOperands = (spec) => [spec.team, spec.disk.loss ?? 41075, 0]
export const observesForeground = (spec) =>
  spec.prelude !== undefined || spec.world.handoff !== undefined

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

const cityParty = [party[0], { ...party[1], role: 'zhao-linger', roleId: 1 }]
export const partyFor = (spec) => (spec.party === 'city' ? cityParty : party)
export const battlePartyFor = (spec) => (spec.solo ? partyFor(spec).slice(0, 1) : partyFor(spec))

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
  thief: {
    id: 'yangzhou-rooftop-thief',
    scene: 's086',
    owner: 'e1629',
    watched: ['e1630'],
    team: 29,
    enemy: 'enemy-478',
    start: [54, -23, 0],
    contact: [55, -23, 0],
    approach: 'ArrowRight',
    music: 48,
    field: 31,
    slot: 0,
    seed: 4,
    settlementDwellMs: 180,
    disk: {
      entry: 13834,
      battle: 13838,
      last: 13867,
      owner: [1296, 280, 0, 7],
      field: 13868,
      music: 13837,
    },
    mapMusic: { scene: 's097', trigger: 'e1785', ip: 13705, track: 36 },
    prelude: {
      night: 13679,
      visible: { e1629: 13627, e1630: 13628 },
    },
    world: {
      gameState: 0,
      triggerMode: 0,
      returned: [58, -12, 0],
      departure: [58, -13, 0],
      exit: 'ArrowUp',
      inventory: [],
      music: { ip: 13866, track: 54 },
    },
  },
  'yueru-outside': {
    id: 'lin-yueru-outside',
    scene: 's021',
    owner: 'e397',
    watched: ['e400', 'e401', 'e402', 'e403', 'e404'],
    team: 21,
    enemy: 'enemy-480',
    start: [89, 36, 0],
    contact: [90, 36, 0],
    approach: 'ArrowRight',
    party: 'city',
    music: 37,
    field: 7,
    slot: 0,
    seed: 4,
    settlementDwellMs: 180,
    disk: {
      entry: 5636,
      battle: 5721,
      last: 5808,
      owner: [912, 1032, 0, 7],
      music: 7003,
      loss: 6186,
    },
    mapMusic: { scene: 's021', ip: 6998, track: 71 },
    prelude: { trigger: 'e395', states: { e395: 5633, e397: 5634 } },
    world: {
      gameState: 0,
      triggerMode: 0,
      returned: [93, 35, 0],
      departure: [93, 34, 0],
      exit: 'ArrowUp',
      inventory: [],
    },
  },
  'yueru-ring': {
    id: 'lin-yueru-ring',
    scene: 's032',
    owner: 'e550',
    watched: ['e547', 'e548', 'e549', 'e551'],
    team: 24,
    enemy: 'enemy-483',
    start: [85, 12, 0],
    contact: [85, 11, 0],
    approach: 'ArrowUp',
    party: 'city',
    solo: true,
    music: 14,
    field: 52,
    slot: 0,
    seed: 4,
    settlementDwellMs: 180,
    disk: { entry: 7703, battle: 8023, last: 8118, owner: [1200, 760, 2, 5] },
    mapMusic: { scene: 's032', ip: 9039, track: 14, cdFallback: true },
    world: { inventory: [], handoff: { scene: 's034', ip: 8117, position: [116, 39, 0] } },
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
    ...(observesForeground(spec) ? { sprites: 'projects/pal/content/sprites.json' } : {}),
    ...(spec.world.handoff
      ? {
          handoffScene: `projects/pal/content/scenes/${spec.world.handoff.scene}.json`,
          diskHandoffScene: `data/extracted/data/scene/${Number(spec.world.handoff.scene.slice(1))}.json`,
        }
      : {}),
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
  const musicOwner = mapMusic.trigger
    ? data.musicScene.eventObjects.find(({ id }) => `e${id}` === mapMusic.trigger)
    : null
  const initialScript = Number((musicOwner?.triggerLabel ?? data.musicScene.onEnterLabel).slice(2))
  const musicFlow = musicOwner
    ? data.canonicalMusicScene.entities.find(({ id }) => id === mapMusic.trigger).behaviors.trigger
        .default.flow
    : data.canonicalMusicScene.hooks.onEnter.variants.default.flow
  const musicBody = musicFlow.stages.flatMap(({ body }) => body)
  assert(mapMusic.ip >= initialScript)
  assert(!commands.slice(initialScript, mapMusic.ip).some(({ op }) => op === 'end'))
  assert.deepEqual(
    [commands[mapMusic.ip].opcode, commands[mapMusic.ip].operands[mapMusic.cdFallback ? 1 : 0]],
    [mapMusic.cdFallback ? 0xa3 : 67, mapMusic.track],
  )
  assert(
    musicBody.some(
      ({ kind, asset }) => kind === 'playMusic' && asset === nativeMusic(mapMusic.track),
    ),
  )
  const preludeStates = {}
  if (spec.prelude) {
    const { night, visible, states, trigger } = spec.prelude
    if (night !== undefined) {
      assert.equal(commands[night].opcode, 0x50)
      assert(musicBody.some(({ kind, ambience }) => kind === 'setAmbience' && ambience === 'night'))
    }
    const actions = trigger
      ? data.rfScene.entities
          .find(({ id }) => id === trigger)
          .behaviors.trigger.default.flow.stages.flatMap(({ body }) => body)
      : musicBody
    for (const [entity, address] of Object.entries(states ?? visible)) {
      const command = commands[address]
      const entityId = Number(entity.slice(1))
      assert.equal(command.opcode, 0x49)
      assert.equal(command.operands[0], entity === trigger ? 0xffff : entityId + 1)
      const state = command.operands[1]
      assert(
        actions.some(
          (action) =>
            action.kind === 'setEntityState' &&
            action.target.scene === spec.scene &&
            action.target.entity === entity &&
            action.state === state,
        ),
      )
      preludeStates[entity] = state
    }
  }
  const { battle, entry, last, reward, defeated } = spec.disk
  const setMusic = commands[spec.disk.music ?? battle - 2]
  const setField = commands[spec.disk.field ?? battle - 1]
  assert.deepEqual([setMusic.opcode, setMusic.operands[0]], [69, spec.music])
  assert.deepEqual([setField.opcode, setField.operands[0]], [74, spec.field])
  assert.deepEqual([commands[battle].opcode, commands[battle].operands], [7, battleOperands(spec)])
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
  if (spec.solo) {
    assert(
      commands
        .slice(entry, battle)
        .some(({ opcode, operands }) => opcode === 0x75 && operands.join() === '1,0,0'),
    )
    assert.deepEqual(
      native
        .slice(0, native.indexOf(launch))
        .filter(({ kind }) => kind === 'setParty')
        .at(-1)?.members,
      battlePartyFor(spec).map(({ role }) => role),
    )
  }
  if (spec.disk.loss) {
    assert.equal(commands[spec.disk.loss + 3].to, 'L_41075')
    assert.equal(
      launch.onLose[0].cue.rows[0].text,
      `dlg.${commands[spec.disk.loss + 2].messageIndex}`,
    )
  }
  let successorTrack
  if (spec.world.handoff) {
    const { scene, ip, position } = spec.world.handoff
    assert.equal(commands[ip].sceneId, gameScene({ scene }))
    assert.equal(native.at(-1).scene, scene)
    const first = Number(data.diskHandoffScene.onEnterLabel.slice(2))
    const [x, y, half] = commands[first].operands
    assert.deepEqual(position, [x + y + half, y - x, 0])
    const [landing] = data.handoffScene.hooks.onEnter.variants.default.flow.stages
    assert.deepEqual(landing.entry.prepare[0].pos, grid(position))
    successorTrack = commands[first + 2].operands[0]
    assert.deepEqual([commands[first + 2].opcode, commands[first + 3].opcode], [0x43, 0x05])
    assert(
      landing.entry.prepare.some(
        ({ kind, asset }) => kind === 'playMusic' && asset === nativeMusic(successorTrack),
      ),
      'successor music must be prepared before revealing the map',
    )
  }
  if (spec.world.music) {
    const { ip, track } = spec.world.music
    assert.deepEqual([commands[ip].opcode, commands[ip].operands[0]], [0x43, track])
    assert(native.some(({ kind, asset }) => kind === 'playMusic' && asset === nativeMusic(track)))
  }
  const original = data.enemies.find(({ id }) => id === team.enemies[spec.slot])
  const object = data.objects.find(({ objectIndex }) => `enemy-${objectIndex}` === spec.enemy)
  assert.equal(object.enemyId, original.id)
  const turnStart =
    spec.party === 'city'
      ? commands.slice(
          object.scriptOnTurnStart,
          commands.findIndex(({ op }, ip) => ip >= object.scriptOnTurnStart && op === 'end'),
        )
      : []
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
  const outsideActors = ['e401', 'e402', 'e403']
    .map((id) => {
      if (spec.id !== 'lin-yueru-outside') return null
      const actor = data.gameScene.eventObjects.find((entry) => `e${entry.id}` === id)
      return {
        id,
        asset: actor.spriteNum,
        position: [actor.x, actor.y],
        frame: actor.nSpriteFrames * actor.direction + actor.currentFrameNum,
        facing: ['down', 'left', 'up', 'right'][actor.direction],
        stationary: id === 'e403',
      }
    })
    .filter(Boolean)
  const returnMusicPaths = spec.world.music
    ? [
        `data/extracted/music/${musicId(spec.world.music.track)}.mid`,
        `projects/pal/assets/migrated/music/${musicId(spec.world.music.track)}.mid`,
      ]
    : []
  const ring =
    spec.id === 'lin-yueru-ring'
      ? ringSource(commands, turnStart, data.gameScene.eventObjects, successorTrack)
      : undefined
  const ringAudioPaths = ring
    ? ['data/extracted', 'projects/pal/assets/migrated'].flatMap((root) => [
        `${root}/music/${musicId(ring.restartTrack)}.mid`,
        `${root}/music/${musicId(ring.successorTrack)}.mid`,
        `${root}/sounds/${ring.cue}.wav`,
      ])
    : []
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
      ...returnMusicPaths,
      ...ringAudioPaths,
    ],
    preludeStates,
    outsideActors,
    preludeBefore: Object.fromEntries(
      data.gameScene.eventObjects
        .filter(({ id }) => Object.hasOwn(preludeStates, `e${id}`))
        .map(({ id, sState }) => [`e${id}`, sState]),
    ),
    spriteChunks: new Map(
      data.sprites?.map(({ id, asset }) => [id, Number(asset.split('.').at(-1))]),
    ),
    hiddenLevels: partyFor(spec).map(({ roleId }) => data.actors.roles[roleId].level),
    slots,
    original,
    turnStart,
    ring,
    summonBonus,
    pre: commands.slice(entry, battle),
    post: commands.slice(battle + 1, last),
    defeatedNote: defeated ? commands[defeated.ip + 2].text : null,
    canonical: native,
    locale: data.locale,
  }
}

function ringSource(commands, turnStart, actors, successorTrack) {
  const [stop, sound, delay, music] = [0x77, 0x47, 0x85, 0x43].map((opcode) =>
    turnStart.find((command) => command.opcode === opcode),
  )
  assert.equal(commands[8029].opcode, 0x46)
  const [col, row, half] = commands[8029].operands
  const leader = [col * 32 + half * 16, row * 16 + half * 8]
  const signed = (word) => (word << 16) >> 16
  const anchor = commands
    .slice(7703, 8023)
    .filter(({ opcode, operands }) => opcode === 0x7f && operands[2] !== 0xffff)
    .map(({ operands }) => operands)
    .reduce(
      (point, [dx, dy, count]) =>
        point.map((value, i) => value - signed(i === 0 ? dx : dy) * Math.max(count, 1)),
      [160, 112],
    )
  // 8119/8122 alternate a step with a yielding reset. 8125 can step on each
  // update once the first camera tick has put its new entry into effect.
  const rightFrames = commands
    .slice(7862, 7882)
    .filter(({ opcode }) => opcode === 0x09)
    .reduce((sum, { operands }) => sum + operands[0], 0)
  const beats = [
    [commands[7829].operands[0] / 2, -4],
    [Math.ceil(rightFrames / 2), 4],
    [commands[7911].operands[2] - 1, -4],
  ]
  const yueru = actors.find(({ id }) => id === 548)
  const movements = [[yueru.x, yueru.y]]
  for (const [count, dx] of beats) {
    for (let n = 0; n < count; n++) {
      const [x, y] = movements.at(-1)
      movements.push([x + dx, y + dx / 2])
    }
  }
  const patriarch = actors.find(({ id }) => id === 551)
  const [, dx, dy] = commands[8028].operands
  return {
    leader,
    camera: leader.map((value, i) => value - anchor[i]),
    movements,
    movementBeats: beats.map(([count], i) => ({ count, intervalMs: i === 2 ? 100 : 200 })),
    yueruSprite: yueru.spriteNum,
    patriarch: [patriarch.x + dx, patriarch.y + dy],
    fadeMs: stop.operands[0] ? stop.operands[0] * 3000 : 2000,
    cue: sound.operands[0],
    waitMs: delay.operands[0] * 80,
    restartTrack: music.operands[0],
    successorTrack,
  }
}
