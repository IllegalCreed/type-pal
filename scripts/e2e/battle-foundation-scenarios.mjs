import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const roles = {
  'li-xiaoyao': 0,
  'zhao-linger': 1,
  'wu-hou': 3,
  anu: 4,
}
const random = { algorithm: 'mulberry32', seed: 1729 }
const copy = (value) => structuredClone(value)

// SSS object IDs resolve to signed offsets and FIRE chunks in the original MAGIC table.
const spellPaintSources = {
  296: { effect: 27, x: -10, y: -6, layerOffset: 99, fireFrames: 20 },
  303: { effect: 40, x: 0, y: 4, layerOffset: 99, fireFrames: 17 },
  312: { effect: 0, x: 0, y: 4, layerOffset: 1, fireFrames: 8 },
  313: {
    effect: 36,
    x: 0,
    y: 30,
    layerOffset: 99,
    fireFrames: 20,
    type: 'attackAll',
    points: [
      { x: 70, y: 140 },
      { x: 100, y: 110 },
      { x: 160, y: 100 },
    ],
  },
  316: { effect: 1, x: 0, y: 0, layerOffset: 1, fireFrames: 7 },
  321: { effect: 2, x: -10, y: 12, layerOffset: 13, fireFrames: 16 },
  327: { effect: 7, x: 0, y: 0, layerOffset: 1, fireFrames: 16 },
  332: { effect: 4, x: 0, y: 0, layerOffset: 99, fireFrames: 5 },
  344: { effect: 31, x: 32, y: 20, layerOffset: 0, fireFrames: 8 },
  353: {
    effect: 16,
    x: 0,
    y: 0,
    layerOffset: 99,
    fireFrames: 8,
    type: 'attackField',
    points: [{ x: 160, y: 200 }],
  },
  381: { effect: 12, x: -2, y: -10, layerOffset: 99, fireFrames: 15 },
}
const allEnemyFirePoints = [
  { x: 70, y: 140 },
  { x: 100, y: 110 },
  { x: 160, y: 100 },
]
const throwPaintSources = {
  24: { effect: 24, x: -12, y: 0, layerOffset: 1, fireFrames: 7 },
  364: { effect: 0, x: 0, y: 0, layerOffset: 99, fireFrames: 8, points: allEnemyFirePoints },
  373: { effect: 25, x: -4, y: -20, layerOffset: 99, fireFrames: 20, points: allEnemyFirePoints },
}
const throwMagicObjects = { 67: '364', 116: '24', 137: '24', 157: '373', 158: '24', 166: '344' }
const paintFireChunks = [
  ...new Set([
    28,
    ...Object.values({ ...spellPaintSources, ...throwPaintSources }).map(({ effect }) => effect),
  ]),
]
const rawFirePath = (chunk) => `data/magic/fire-${String(chunk).padStart(2, '0')}.rle`
const projectFirePath = (chunk) =>
  `assets/migrated/effect-sprites/magic-${String(chunk).padStart(3, '0')}.rle`

function defineSetup({
  id,
  title,
  members,
  enemies,
  team,
  enemyHP,
  seed = random.seed,
  inventory = [],
}) {
  const party = members.map(({ id: actorId, hp, speed }) => ({
    id: actorId,
    actorId,
    gameRole: roles[actorId],
    hp,
    speed,
  }))
  const initial = {
    players: members.map(({ id, hp, maxHP, level, mp = 100, statuses = {} }, slot) => ({
      id,
      slot,
      hp,
      maxHP,
      mp,
      maxMP: 100,
      level,
      exp: 0,
      statuses: copy(statuses),
    })),
    enemies: Array.from({ length: 5 }, (_, slot) =>
      enemies[slot]
        ? {
            ...enemies[slot],
            hp: enemies[slot].hp ?? enemyHP,
            maxHP: enemies[slot].hp ?? enemyHP,
            alive: true,
            statuses: {},
          }
        : null,
    ),
    inventory: copy(inventory),
    money: 0,
  }
  return {
    id,
    title,
    random: { ...random, seed },
    party,
    enemies,
    game: {
      fixture: {
        id: `q2-${id}`,
        label: title,
        partyMembers: party.map((player) => player.gameRole),
        playerOverrides: Object.fromEntries(
          members.map(
            ({ id, hp, maxHP, level, attack, defense, speed, magic = 50, mp = 100, skills }) => [
              roles[id],
              {
                level,
                hp,
                maxHP,
                mp,
                maxMP: 100,
                attackStrength: attack,
                defense,
                magicStrength: magic,
                dexterity: speed,
                fleeRate: 30,
                ...(skills ? { magic: skills.map(Number) } : {}),
              },
            ],
          ),
        ),
        expOverrides: Object.fromEntries(
          members.map(({ id, level }) => [roles[id], { wExp: 0, wLevel: level }]),
        ),
        inventory: inventory.map((item) => ({ itemId: Number(item.itemId), count: item.count })),
        enemyTeamId: team,
        battleFieldId: 7,
      },
    },
    reforge: {
      config: {
        party: {
          members: members.map(
            ({
              id: actorId,
              hp,
              maxHP,
              level,
              attack,
              defense,
              speed,
              magic = 50,
              mp,
              skills = [],
            }) => ({
              actorId,
              stats: {
                level,
                maxHP,
                maxMP: 100,
                attack,
                defense,
                magicAttack: magic,
                speed,
                luck: 30,
              },
              equipment: {},
              skills: { kind: 'replace', ids: skills },
              hp: { kind: 'value', value: hp },
              mp: mp === undefined ? { kind: 'full' } : { kind: 'value', value: mp },
            }),
          ),
        },
        enemies: { kind: 'team', teamId: `team-${team}` },
        bag: {
          items: inventory.map((item) => ({ itemId: item.itemId, quantity: item.count })),
        },
        fieldId: 7,
        music: { kind: 'default' },
        money: 0,
        auto: false,
        boss: false,
      },
    },
    expected: { start: initial },
  }
}

function defineScenario(id, title, actorIds, enemyCount, medicine = false) {
  const inventory = medicine ? [{ itemId: '99', count: 2 }] : []
  const scenario = defineSetup({
    id,
    title,
    inventory,
    team: enemyCount === 1 ? 1 : 3,
    enemyHP: 30,
    enemies: Array.from({ length: enemyCount }, (_, slot) => ({
      id: `lantern-${String.fromCharCode(97 + slot)}`,
      slot,
      templateId: 'enemy-399',
    })),
    members: actorIds.map((actorId, slot) => ({
      id: actorId,
      hp: medicine && slot === 0 ? 50 : 150,
      maxHP: 150,
      level: 1,
      attack: 250,
      defense: 100,
      speed: [900, 500, 100][slot],
    })),
  })
  const {
    party,
    enemies,
    expected: { start },
  } = scenario
  const commands = medicine
    ? [
        { turn: 1, actorId: party[0].id, kind: 'item', itemId: '99', targetId: party[0].id },
        { turn: 1, actorId: party[1].id, kind: 'attack', targetId: enemies[0].id },
      ]
    : party.map((player, slot) => ({
        turn: 1,
        actorId: player.id,
        kind: 'attack',
        targetId: enemies[slot].id,
      }))
  const state = copy(start)
  const actions = commands.map((command) => {
    const before = copy(state)
    if (command.kind === 'item') {
      state.players[0].hp = 100
      state.inventory[0].count = 1
    } else {
      const target = state.enemies.find((enemy) => enemy?.id === command.targetId)
      assert(target, `scenario ${id} references a missing enemy`)
      target.hp = 0
      target.alive = false
    }
    return { ...command, before, after: copy(state) }
  })
  state.money = enemyCount * 3
  for (const player of state.players) {
    player.exp = enemyCount
    if (medicine && player.id === party[0].id) player.hp = 125
  }
  Object.assign(scenario.expected, {
    commands,
    actions,
    terminal: { result: 'victory', settlementCount: 1, after: state },
  })
  return scenario
}

function defineTwoRoundScenario() {
  const scenario = defineScenario(
    'two-round-commands',
    '防御、替队友用药、取消后施法与普攻',
    ['li-xiaoyao', 'wu-hou'],
    1,
    true,
  )
  scenario.random.seed = 4
  const {
    party,
    game: { fixture },
    reforge: { config },
    expected: { start },
  } = scenario
  party[1].hp = 50
  start.players[1].hp = 50
  Object.assign(fixture.playerOverrides[0], { defense: 31, magic: [296] })
  Object.assign(fixture.playerOverrides[3], { hp: 50, magic: [] })
  config.party.members[0].stats.defense = 31
  config.party.members[0].skills.ids = ['296']
  config.party.members[1].hp.value = 50

  const [hero, ally] = party.map(({ id }) => id)
  const lantern = scenario.enemies[0].id
  const commands = [
    { turn: 1, actorId: hero, kind: 'defend', targetId: null },
    { turn: 1, actorId: ally, kind: 'item', itemId: '99', targetId: hero },
    { turn: 2, actorId: hero, kind: 'cast', skillId: '296', targetId: ally, cancelTargetId: hero },
    { turn: 2, actorId: ally, kind: 'attack', targetId: lantern },
  ]
  const state = copy(start)
  const step = (command, apply) => {
    const before = copy(state)
    apply(state)
    return { ...command, before, after: copy(state) }
  }
  const actions = [
    step(commands[0], () => {}),
    step(commands[1], ({ players, inventory }) => {
      players[0].hp = 100
      inventory[0].count = 1
    }),
    step(
      { turn: 1, actorId: lantern, actorSide: 'enemy', kind: 'attack', targetId: hero },
      ({ players }) => {
        // Seed 4 targets slot 0 without a block. Attack 43 meets doubled defense 80,
        // which is below the physical threshold and therefore deals the minimum 1.
        players[0].hp = 99
      },
    ),
    step(commands[2], ({ players }) => {
      players[0].mp = 94
      players[1].hp = 125
    }),
    step(commands[3], ({ enemies }) => {
      enemies[0].hp = 0
      enemies[0].alive = false
    }),
  ]
  actions[0].guard = { before: false, after: true }
  actions[2].guard = { before: true, after: true }
  actions[3].guard = { before: false, after: false }
  state.players[0].hp = 124
  state.players[0].mp = 97
  state.players[1].hp = 137
  state.money = 3
  for (const player of state.players) player.exp = 1
  scenario.expected = {
    start,
    commands,
    actions,
    terminal: { result: 'victory', settlementCount: 1, after: state },
  }
  return scenario
}

const ghoul = { id: 'ghoul', object: 407, hp: 450 }
const mechanismEnemies = {
  lantern: { id: 'lantern-a', team: 1, object: 399, raw: 2, hp: 30, exp: 1, cash: 3 },
  weasel: { id: 'sickle-weasel', team: 294, object: 414, raw: 17, hp: 710, exp: 110, cash: 220 },
  tree: { id: 'half-tree-demon', team: 204, object: 507, raw: 108, hp: 800, exp: 135, cash: 60 },
  worm: { id: 'bloodworm', team: 115, object: 406, raw: 9, hp: 310, exp: 14, cash: 9 },
  caster: { id: 'thunder-caster', team: 186, object: 418, raw: 21, hp: 450, exp: 50, cash: 70 },
}
const hero = 'li-xiaoyao'
const anu = 'anu'
const linger = 'zhao-linger'
const fairySwordStatus = { dualAttack: 32760 }
const mechanismMember = (id, hp, attack, defense, speed, level = 5) => ({
  id,
  hp,
  maxHP: hp,
  level,
  attack,
  defense,
  speed,
})
const queueDraw = (turn, side, slot, speed, extra = false) => ({
  purpose: 'queue-dexterity',
  queue: { turn, side, slot, speed, extra },
})
const draws = (...purposes) => purposes.map((purpose) => ({ purpose }))
const finishEnemy = ({ enemies }) => Object.assign(enemies[0], { hp: 0, alive: false })
const keepState = () => {}

/** Build expected snapshots from authored test assertions only, without a runtime or recorder. */
function mechanismScenario(id, title, enemy, seed, members, inventory) {
  const enemies = (enemy.units ?? [enemy]).map(({ id, object, hp }, slot) => ({
    id,
    slot,
    templateId: `enemy-${object}`,
    ...(enemy.units ? { hp } : {}),
  }))
  const scenario = defineSetup({
    id,
    title,
    seed,
    members,
    inventory,
    team: enemy.team,
    enemyHP: enemy.hp,
    enemies,
  })
  const state = copy(scenario.expected.start)
  const actions = []
  const rounds = []
  const step = (command, apply = keepState, { prepare = keepState, ...facts } = {}) => {
    prepare(state)
    const before = copy(state)
    apply(state)
    actions.push({ ...command, ...facts, before, after: copy(state) })
  }
  const round = (turn, apply = keepState) => {
    const before = copy(state)
    apply(state)
    rounds.push({ turn, before, after: copy(state) })
  }
  const complete = (commands, ruleDraws, recoveredHP) => {
    state.money = enemy.cash
    for (const [slot, player] of state.players.entries()) {
      if (player.hp > 0) player.exp = enemy.exp
      player.hp = recoveredHP[slot]
      player.mp += Math.floor((player.maxMP - player.mp) / 2)
      player.statuses = Object.fromEntries(
        Object.entries(scenario.expected.start.players[slot].statuses).filter(
          ([, turns]) => turns > 999,
        ),
      )
      delete player.poisons
    }
    Object.assign(scenario.expected, {
      commands,
      actions,
      rounds,
      ruleDraws,
      terminal: { result: 'victory', settlementCount: 1, after: copy(state) },
    })
    return scenario
  }
  return { step, round, complete }
}

function defineDualSickleWeasel() {
  const enemy = mechanismEnemies.weasel
  const { step, round, complete } = mechanismScenario(
    'dual-sickle-weasel',
    '镰刀鼬双动，先弦月斩再普攻',
    enemy,
    64,
    [mechanismMember(hero, 400, 900, 100, 150)],
  )
  const defend = { turn: 1, actorId: hero, kind: 'defend', targetId: null }
  const attack = { turn: 2, actorId: hero, kind: 'attack', targetId: enemy.id }
  step(defend, keepState, { guard: { before: false, after: true } })
  const enemyAction = { turn: 1, actorId: enemy.id, actorSide: 'enemy', targetId: hero }
  // CLASSIC selects a singleton without a draw. Seed64 then yields magic 94 and physical 44.
  step({ ...enemyAction, kind: 'cast', skillId: '339' }, ({ players }) => {
    players[0].hp = 306
  })
  step(
    { ...enemyAction, kind: 'attack' },
    ({ players }) => {
      players[0].hp = 262
    },
    { rawDamage: 44, guard: { before: true, after: true } },
  )
  round(1)
  step(attack, finishEnemy, { rawDamage: 865 })
  return complete(
    [defend, attack],
    [
      queueDraw(1, 'enemy', 0, 122),
      queueDraw(1, 'enemy', 0, 122, true),
      queueDraw(1, 'player', 0, 765),
      ...draws('enemy-magic-choice', 'enemy-magic-block', 'enemy-magic-damage-float'),
      ...draws(
        'enemy-magic-choice',
        'enemy-block',
        'enemy-attack-bonus',
        'enemy-damage-bonus',
        'enemy-equivalent-item',
      ),
      queueDraw(2, 'enemy', 0, 122),
      queueDraw(2, 'enemy', 0, 122, true),
      queueDraw(2, 'player', 0, 153),
      ...draws(
        'strike-bonus',
        'strike-critical',
        'strike-hero-critical',
        'strike-variance',
        'attack-growth',
      ),
    ],
    [331],
  )
}

function defineEnemySleep() {
  const enemy = mechanismEnemies.tree
  const { step, round, complete } = mechanismScenario(
    'enemy-sleep',
    '半人树妖回梦，睡眠衰减与跳过行动',
    enemy,
    4,
    [mechanismMember(hero, 150, 250, 400, 900, 6), mechanismMember(anu, 150, 900, 400, 500, 6)],
  )
  const defendHero = { turn: 1, actorId: hero, kind: 'defend', targetId: null }
  const defendAnu = { ...defendHero, actorId: anu }
  const nextDefend = { ...defendAnu, turn: 2 }
  const attack = { turn: 3, actorId: anu, kind: 'attack', targetId: enemy.id }
  const guard = { before: false, after: true }
  step(defendHero, keepState, { guard })
  step(defendAnu, keepState, { guard })
  const enemyAction = { actorId: enemy.id, actorSide: 'enemy' }
  // Seed4 rolls 8 against the enemy script's strict <70. Its real effect is sleep3 plus HP−1.
  step({ ...enemyAction, turn: 1, kind: 'cast', skillId: '303', targetId: hero }, ({ players }) => {
    players[0].hp = 149
    players[0].statuses.sleep = 3
  })
  round(1, ({ players }) => {
    players[0].statuses.sleep = 2
  })
  step(nextDefend, keepState, { guard })
  step(
    { ...enemyAction, turn: 2, kind: 'attack', targetId: anu },
    ({ players }) => {
      players[1].hp = 149
    },
    { rawDamage: 1, guard: { before: true, after: true } },
  )
  step({ turn: 2, actorId: hero, kind: 'pass', targetId: null })
  round(2, ({ players }) => {
    players[0].statuses.sleep = 1
  })
  step(attack, finishEnemy, { rawDamage: 925 })
  return complete(
    [defendHero, defendAnu, nextDefend, attack],
    [
      queueDraw(1, 'enemy', 0, 114),
      queueDraw(1, 'player', 0, 4515),
      queueDraw(1, 'player', 1, 2500),
      ...draws('enemy-target', 'enemy-magic-choice', 'enemy-magic-block', 'battle-script-chance'),
      queueDraw(2, 'enemy', 0, 114),
      queueDraw(2, 'player', 1, 2500),
      ...draws(
        'enemy-target',
        'enemy-magic-choice',
        'enemy-block',
        'enemy-attack-bonus',
        'enemy-damage-bonus',
        'enemy-equivalent-item',
      ),
      queueDraw(3, 'enemy', 0, 114),
      queueDraw(3, 'player', 1, 500),
      ...draws('strike-bonus', 'strike-critical', 'strike-variance', 'attack-growth'),
    ],
    [149, 149],
  )
}

function defineEquivalentPoison() {
  const enemy = mechanismEnemies.worm
  const { step, round, complete } = mechanismScenario(
    'equivalent-poison',
    '血口虫附带赤毒，回合扣血与雄黄解毒',
    enemy,
    72,
    [mechanismMember(hero, 150, 450, 250, 900)],
    [{ itemId: '87', count: 2 }],
  )
  const defend = { turn: 1, actorId: hero, kind: 'defend', targetId: null }
  const antidote = { turn: 2, actorId: hero, kind: 'item', itemId: '87', targetId: hero }
  const attack = { turn: 3, actorId: hero, kind: 'attack', targetId: enemy.id }
  const enemyAttack = { actorId: enemy.id, actorSide: 'enemy', kind: 'attack', targetId: hero }
  const physicalDraws = draws(
    'enemy-block',
    'enemy-attack-bonus',
    'enemy-damage-bonus',
    'enemy-equivalent-item',
  )
  step(defend, keepState, { guard: { before: false, after: true } })
  step(
    { ...enemyAttack, turn: 1 },
    ({ players }) => {
      players[0].hp = 142
      players[0].poisons = [551]
    },
    { rawDamage: 1, effectiveHpLoss: 8, guard: { before: true, after: true } },
  )
  round(1, ({ players }) => {
    players[0].hp = 135
  })
  step(antidote, ({ players, inventory }) => {
    delete players[0].poisons
    inventory[0].count = 1
  })
  step(
    { ...enemyAttack, turn: 2 },
    ({ players }) => {
      players[0].hp = 134
    },
    { rawDamage: 1 },
  )
  round(2)
  step(attack, finishEnemy, { rawDamage: 407 })
  // The first hit rolls equivalent rate 4, then resistance 83 and 92. The second rolls rate 7.
  const scenario = complete(
    [defend, antidote, attack],
    [
      queueDraw(1, 'enemy', 0, 54),
      queueDraw(1, 'player', 0, 4515),
      ...physicalDraws,
      ...draws('enemy-equivalent-poison-resist', 'enemy-equivalent-poison-script'),
      queueDraw(2, 'enemy', 0, 54),
      queueDraw(2, 'player', 0, 2709),
      ...physicalDraws,
      queueDraw(3, 'enemy', 0, 54),
      queueDraw(3, 'player', 0, 903),
      ...draws(
        'strike-bonus',
        'strike-critical',
        'strike-hero-critical',
        'strike-variance',
        'attack-growth',
      ),
    ],
    [142],
  )
  // Original UI frame 48 and palette 0. The opaque palette-zero pixel differs from both holes.
  scenario.portraitProbe = {
    slot: 0,
    points: [
      { x: 12, y: 14 },
      { x: 20, y: 14 },
      { x: 24, y: 14 },
      { x: 16, y: 8 },
      { x: 0, y: 0 },
      { x: 33, y: 18 },
    ],
  }
  const normal = [[203, 146, 121], [174, 101, 77], [113, 52, 32], [0, 0, 0], null, null]
  scenario.expected.portraitSize = [36, 35]
  scenario.expected.portraitSamples = [
    { turn: 1, hp: 150, rgbs: normal },
    { turn: 2, hp: 135, rgbs: [[178, 56, 44], [121, 16, 12], [69, 0, 0], [52, 0, 0], null, null] },
    { turn: 3, hp: 134, rgbs: normal },
  ]
  scenario.expected.defendRecovery = {
    actionIndex: 1,
    hitFrame: 4,
    guardFrame: 3,
    idleFrame: 0,
    // CLASSIC dispatches one action per 40 ms tick (battle.h:28-29, fight.c:1710-1769).
    // Allow render sampling around each queue tick and one tick around the 320 ms attack.
    cadenceMs: { commandToGuard: [20, 65], guardToEnemy: [20, 65], enemyToDamage: [280, 360] },
  }
  return scenario
}

function defineAutomaticBlock() {
  const enemy = mechanismEnemies.worm
  const { step, complete } = mechanismScenario(
    'automatic-block',
    '血口虫先出手，李逍遥自动格挡',
    enemy,
    11,
    [mechanismMember(hero, 150, 450, 250, 1)],
  )
  const attack = { turn: 1, actorId: hero, kind: 'attack', targetId: enemy.id }
  step(
    { turn: 1, actorId: enemy.id, actorSide: 'enemy', kind: 'attack', targetId: hero },
    keepState,
    { rawDamage: 0, blocked: true, guard: { before: false, after: false } },
  )
  // The equipped attack is 452 against defense 82 and resistance 2. Seed 11 gives 391 damage.
  step(attack, finishEnemy, { rawDamage: 391 })
  const scenario = complete(
    [attack],
    [
      queueDraw(1, 'enemy', 0, 54),
      queueDraw(1, 'player', 0, 4),
      // The third mulberry32 draw lands exactly on the CLASSIC block threshold of 10.
      { purpose: 'enemy-block', value: 0.6081185641232878 },
      ...draws(
        'strike-bonus',
        'strike-critical',
        'strike-hero-critical',
        'strike-variance',
        'attack-growth',
      ),
    ],
    [150],
  )
  scenario.expected.automaticBlock = { actionIndex: 0, guardFrame: 3, idleFrame: 0 }
  return scenario
}

function definePlayerCasualties() {
  const enemy = mechanismEnemies.lantern
  const { step, round, complete } = mechanismScenario(
    'lantern-player-casualty',
    '灯笼物攻后濒死、阵亡与队友续战',
    enemy,
    6,
    [mechanismMember(hero, 40, 250, 0, 0), mechanismMember(anu, 150, 900, 400, 1)],
  )
  const guard = { before: false, after: true }
  const firstDefend = { turn: 1, actorId: hero, kind: 'defend', targetId: null }
  const allyDefend = { ...firstDefend, actorId: anu }
  const secondDefend = { ...firstDefend, turn: 2 }
  const allyAttack = { turn: 2, actorId: anu, kind: 'attack', targetId: enemy.id }
  const enemyAttack = {
    turn: 1,
    actorId: enemy.id,
    actorSide: 'enemy',
    kind: 'attack',
    targetId: hero,
  }
  // Equipped defense 9, CLASSIC enemy attack 42, seed 6 adds zero to both damage rolls.
  // The first 35 damage leaves 5 HP below the 8 HP dying threshold. The next hit is clamped to 5.
  step(
    enemyAttack,
    ({ players }) => {
      players[0].hp = 5
    },
    { rawDamage: 35 },
  )
  step(firstDefend, keepState, { guard })
  step(allyDefend, keepState, { guard })
  round(1)
  step(
    { ...enemyAttack, turn: 2 },
    ({ players }) => {
      players[0].hp = 0
    },
    { rawDamage: 5 },
  )
  // The fallen hero's selected defense is skipped. Anu has 950 attack and deals 976 before clamping.
  step(allyAttack, finishEnemy, { rawDamage: 976 })
  const enemyAttackDraws = draws(
    'enemy-target',
    'enemy-block',
    'enemy-attack-bonus',
    'enemy-damage-bonus',
    'enemy-equivalent-item',
  )
  const scenario = complete(
    [firstDefend, allyDefend, secondDefend, allyAttack],
    [
      queueDraw(1, 'enemy', 0, 21),
      queueDraw(1, 'player', 0, 15),
      queueDraw(1, 'player', 1, 5),
      ...enemyAttackDraws,
      queueDraw(2, 'enemy', 0, 21),
      queueDraw(2, 'player', 0, 7),
      queueDraw(2, 'player', 1, 1),
      ...enemyAttackDraws,
      ...draws('strike-bonus', 'strike-critical', 'strike-variance', 'attack-growth'),
    ],
    [20, 150],
  )
  scenario.expected.playerCasualties = [
    { actionIndex: 0, recoveryFrame: 1, soundKind: 'player-dying' },
    { actionIndex: 3, recoveryFrame: 2, soundKind: 'player-death' },
  ]
  return scenario
}

const defendAt = (turn, actorId) => ({ turn, actorId, kind: 'defend', targetId: null })
const attackAt = (turn, actorId, targetId) => ({ turn, actorId, kind: 'attack', targetId })
const enemyPhysicalDraws = [
  'enemy-target',
  'enemy-block',
  'enemy-attack-bonus',
  'enemy-damage-bonus',
  'enemy-equivalent-item',
]
const heroStrikeDraws = [
  'strike-bonus',
  'strike-critical',
  'strike-hero-critical',
  'strike-variance',
  'attack-growth',
]
const defense = { guard: { before: false, after: true } }

// CLASSIC fight.c:174–241,4284–4330. Worm effective DEF 10+(12+6)*4=82.
// Field7 modifiers and seed50's first damage roll isolate the elemental calculation.
const playerElements = [
  ['wind', '风咒', '312', 5, 45, 1, 101, 81],
  ['thunder', '雷咒', '316', 7, 60, 2, 106, 104],
  ['water', '冰咒', '321', 5, 45, 3, 109, 116],
  ['fire', '炎咒', '327', 8, 70, 4, 115, 155],
  ['earth', '土咒', '332', 6, 52, 5, 118, 172],
]
const enemyDraw = (purpose, slot) => ({
  purpose,
  target: { turn: 1, side: 'enemy', slot },
})
const spellVariance = (slot) => enemyDraw('spell-damage-variance', slot)
const poisonResistance = (slot) => enemyDraw('poison-resistance', slot)
const anuStrike = draws('strike-bonus', 'strike-critical', 'strike-variance', 'attack-growth')
const castAt = (turn, actorId, skillId, targetId) => ({
  turn,
  actorId,
  kind: 'cast',
  skillId,
  targetId,
  ...(targetId === null ? { targetSide: 'enemy' } : {}),
})
const enemyAttackAt = (turn, actorId, targetId) => ({
  ...attackAt(turn, actorId, targetId),
  actorSide: 'enemy',
})
const passAt = (turn, actorId) => ({ turn, actorId, kind: 'pass', targetId: null })

function definePlayerElement([id, title, skill, mp, , , sound, damage], seed = 50) {
  const worm = mechanismEnemies.worm
  const [magic, finish] = [castAt(1, linger, skill, worm.id), attackAt(1, anu, worm.id)]
  const { step, complete } = mechanismScenario(`player-spell-${id}`, title, worm, seed, [
    {
      ...mechanismMember(linger, 150, 0, 0, 900),
      magic: 200,
      skills: [skill],
      statuses: fairySwordStatus,
    },
    mechanismMember(anu, 150, 2200, 700, 150),
  ])
  const orderProbe = seed === 6
  step(
    magic,
    ({ enemies, players }) => {
      players[0].mp -= mp
      enemies[0].hp -= damage
    },
    { enemyDamage: [damage], growth: { maxMP: orderProbe ? 3 : 2, magicAttack: 1 } },
  )
  step(finish, finishEnemy, { rawDamage: orderProbe ? 7309 : 2255 })
  const scenario = complete(
    [magic, finish],
    [
      queueDraw(1, 'enemy', 0, 54),
      queueDraw(1, 'player', 0, 906),
      queueDraw(1, 'player', 1, 150),
      spellVariance(0),
      ...draws('cast-growth'),
      ...anuStrike,
    ],
    [150, 150],
  )
  scenario.expected.playerCastRecovery = 0
  return {
    ...scenario,
    sounds: [
      [
        ['cast-windup', 10],
        ['spell-effect', sound],
      ],
      playerAttackSounds(orderProbe ? 8 : 40, 4, 216),
    ],
  }
}

function definePlayerAreaMagic() {
  const units = Array.from({ length: 3 }, (_, slot) => ({
    ...mechanismEnemies.worm,
    id: `bloodworm-${slot}`,
  }))
  const enemy = { team: 116, units, exp: 42, cash: 27 }
  const [wind, bees] = [castAt(1, linger, '313', null), castAt(1, anu, '353', null)]
  const { step, complete } = mechanismScenario('player-spell-group', '旋风咒与御蜂术', enemy, 2, [
    {
      ...mechanismMember(linger, 150, 0, 0, 900, 7),
      magic: 200,
      skills: ['313'],
      statuses: fairySwordStatus,
    },
    { ...mechanismMember(anu, 150, 2200, 700, 150), skills: ['353'] },
  ])
  const windDamage = [115, 114, 113]
  step(
    wind,
    ({ enemies, players }) => {
      players[0].mp -= 11
      for (const [slot, damage] of windDamage.entries()) enemies[slot].hp -= damage
    },
    { enemyDamage: windDamage, growth: { maxMP: 3, magicAttack: 1 } },
  )
  step(
    bees,
    ({ enemies, players }) => {
      players[1].mp -= 18
      for (const unit of enemies.filter(Boolean)) Object.assign(unit, { hp: 0, alive: false })
    },
    { enemyDamage: [346, 354, 348], growth: { maxMP: 2, magicAttack: 1 } },
  )
  const scenario = complete(
    [wind, bees],
    [
      ...units.map((_, slot) => queueDraw(1, 'enemy', slot, 54)),
      queueDraw(1, 'player', 0, 906),
      queueDraw(1, 'player', 1, 150),
      ...units.map((_, slot) => spellVariance(slot)),
      ...draws('cast-growth'),
      ...units.map((_, slot) => spellVariance(slot)),
      ...draws('cast-growth'),
    ],
    [150, 150],
  )
  scenario.expected.playerCastRecovery = 0
  return {
    ...scenario,
    sounds: [
      [
        ['cast-windup', 10],
        ['spell-effect', 102],
      ],
      [
        ['cast-windup', 12],
        ['spell-effect', 133],
        ...units.map(({ id }) => ['enemy-death', 216, id]),
      ],
    ],
  }
}

function defineCooperativeMagic() {
  const worm = mechanismEnemies.worm
  const { step, round, complete } = mechanismScenario(
    'player-cooperative-magic',
    '爆炸合击',
    worm,
    6,
    [
      { ...mechanismMember(linger, 150, 0, 400, 900, 6), magic: 200, statuses: fairySwordStatus },
      mechanismMember(anu, 150, 250, 400, 150, 6),
    ],
  )
  const coop = { turn: 1, actorId: linger, kind: 'coop', skillId: '381', targetId: worm.id }
  const defend = defendAt(2, linger)
  const finish = attackAt(2, anu, worm.id)
  step(
    coop,
    ({ enemies, players }) => {
      for (const player of players) player.hp -= 10
      enemies[0].hp -= 161
    },
    { enemyDamage: [161], suppressPlayerDamageNumbers: true },
  )
  step(passAt(1, anu))
  step(
    enemyAttackAt(1, worm.id, anu),
    ({ players }) => {
      players[1].hp--
    },
    { rawDamage: 1 },
  )
  round(1)
  step(defend, keepState, defense)
  step(finish, finishEnemy, { rawDamage: 744 })
  return {
    ...complete(
      [coop, defend, finish],
      [
        queueDraw(1, 'enemy', 0, 54),
        queueDraw(1, 'player', 0, 9060),
        queueDraw(1, 'player', 1, 150),
        spellVariance(0),
        ...draws(...enemyPhysicalDraws),
        queueDraw(2, 'enemy', 0, 54),
        queueDraw(2, 'player', 0, 4530),
        queueDraw(2, 'player', 1, 150),
        ...anuStrike,
      ],
      [145, 144],
    ),
    sounds: [
      [
        ['cast-windup', 29],
        ['spell-effect', 117],
      ],
      [],
      enemyAttackSounds(357, 92),
      [],
      playerAttackSounds(8, 4, 216),
    ],
  }
}

function defineCooperativeFallback() {
  const tree = mechanismEnemies.tree
  const { step, round, complete } = mechanismScenario(
    'player-cooperative-fallback',
    '队友被催眠，合击降级为仙女剑双击',
    tree,
    25,
    [
      { ...mechanismMember(linger, 150, 250, 400, 0, 6), magic: 80, statuses: fairySwordStatus },
      mechanismMember(hero, 150, 900, 400, 0, 6),
    ],
  )
  const coop = { turn: 1, actorId: linger, kind: 'coop', skillId: '381', targetId: tree.id }
  const finish = attackAt(2, linger, tree.id)
  step({ ...castAt(1, tree.id, '303', hero), actorSide: 'enemy' }, ({ players }) => {
    players[1].hp--
    players[1].statuses.sleep = 3
  })
  step(
    attackAt(1, linger, tree.id),
    ({ enemies }) => {
      enemies[0].hp = 222
    },
    { cooperativeFallback: true, rawStrikes: [141, 437], growth: { attack: 1, maxHP: 2 } },
  )
  step(passAt(1, hero))
  round(1, ({ players }) => {
    players[1].statuses.sleep = 2
  })
  step(
    enemyAttackAt(2, tree.id, linger),
    ({ players }) => {
      players[0].hp--
    },
    { rawDamage: 1 },
  )
  step(finish, finishEnemy, { rawStrikes: [138, 146], growth: { attack: 1, maxHP: 2 } })
  const strike = draws('strike-bonus', 'strike-critical', 'strike-variance')
  const scenario = complete(
    [coop, finish],
    [
      queueDraw(1, 'enemy', 0, 114),
      queueDraw(1, 'player', 0, 60),
      queueDraw(1, 'player', 1, 3),
      ...draws('enemy-target', 'enemy-magic-choice', 'enemy-magic-block', 'battle-script-chance'),
      ...strike,
      ...strike,
      ...draws('attack-growth'),
      queueDraw(2, 'enemy', 0, 114),
      queueDraw(2, 'player', 0, 6),
      ...draws(
        'enemy-target',
        'enemy-magic-choice',
        'enemy-block',
        'enemy-attack-bonus',
        'enemy-damage-bonus',
        'enemy-equivalent-item',
      ),
      ...strike,
      ...strike,
      ...draws('attack-growth'),
    ],
    [149, 149],
  )
  scenario.expected.retainedEquipment = [{ slot: 0, equipmentIndex: 3, itemId: 170 }]
  return {
    ...scenario,
    sounds: [
      [['spell-effect', 169]],
      [
        ['player-windup', 38],
        ['player-weapon', 2],
        ['player-windup', 6],
        ['player-weapon', 2],
      ],
      [],
      enemyAttackSounds(265, 92),
      [['player-windup', 38], ['player-weapon', 2], ...playerAttackSounds(38, 2, 185)],
    ],
  }
}

function defineThrownSword() {
  const worm = mechanismEnemies.worm
  const { step, complete } = mechanismScenario(
    'player-throw-wood-sword',
    '投掷木剑',
    worm,
    2,
    [mechanismMember(hero, 150, 50, 400, 900, 6), mechanismMember(anu, 150, 900, 400, 150, 6)],
    [{ itemId: '166', count: 1 }],
  )
  const thrown = { turn: 1, actorId: hero, kind: 'throw', itemId: '166', targetId: worm.id }
  const finish = attackAt(1, anu, worm.id)
  step(
    thrown,
    (state) => {
      state.inventory = []
      state.enemies[0].hp -= 219
    },
    { enemyDamage: [219] },
  )
  step(finish, finishEnemy, { rawDamage: 925 })
  const scenario = complete(
    [thrown, finish],
    [
      queueDraw(1, 'enemy', 0, 54),
      queueDraw(1, 'player', 0, 903),
      queueDraw(1, 'player', 1, 150),
      ...draws('throw-weapon-strength'),
      spellVariance(0),
      ...anuStrike,
    ],
    [150, 150],
  )
  scenario.expected.retainedEquipment = [{ slot: 0, equipmentIndex: 3, itemId: 166 }]
  scenario.expected.throwWindupMs = 440
  scenario.expected.throwRecovery = { actionIndex: 0, slot: 0, targetSlot: 0, damage: 219 }
  return {
    ...scenario,
    sounds: [
      [
        ['cast-windup', 9],
        ['spell-effect', 347],
      ],
      playerAttackSounds(40, 4, 216),
    ],
  }
}

const itemAt = (turn, actorId, itemId, targetId) => ({
  turn,
  actorId,
  kind: 'item',
  itemId,
  targetId,
  ...(targetId === null ? { targetSide: 'player' } : {}),
})

const throwAt = (actorId, itemId, targetId) => ({
  turn: 1,
  actorId,
  kind: 'throw',
  itemId,
  targetId,
  ...(targetId === null ? { targetSide: 'enemy' } : {}),
})

const bagWith = (...ids) => ids.map((itemId) => ({ itemId, count: 1 }))

const throwSounds = (voice, effect) => [
  ['cast-windup', voice],
  ['spell-effect', effect],
]

const finishSlot =
  (slot) =>
  ({ enemies }) =>
    Object.assign(enemies[slot], { hp: 0, alive: false })

function defineGroupItemThrow() {
  const lantern = mechanismEnemies.lantern
  const units = [lantern, { ...lantern, id: 'lantern-b' }, { ...lantern, id: 'lantern-c' }]
  const { step, complete } = mechanismScenario(
    'item-group-mp-and-wind-talisman',
    '灵蛊全队回气，风灵符群体投掷',
    { team: 3, units, exp: 3, cash: 9 },
    random.seed,
    [
      { ...mechanismMember(hero, 150, 250, 100, 900, 1), hp: 50, mp: 41 },
      { ...mechanismMember(anu, 150, 250, 100, 500, 1), mp: 54 },
    ],
    bagWith('99', '104', '145', '67'),
  )
  const use = itemAt(1, hero, '145', null)
  const thrown = throwAt(anu, '67', null)
  step(use, (state) => {
    for (const player of state.players) player.mp = 100
    state.inventory = bagWith('99', '104', '67')
  })
  // Raw wind 85, lantern wind resistance 2 and field 7 wind -3 give 95 per target.
  step(
    thrown,
    (state) => {
      for (const slot of units.keys()) finishSlot(slot)(state)
      state.inventory = bagWith('99', '104')
    },
    { enemyDamage: [95, 95, 95] },
  )
  const scenario = complete(
    [use, thrown],
    [
      ...units.map((_, slot) => queueDraw(1, 'enemy', slot, 21)),
      queueDraw(1, 'player', 0, 2709),
      queueDraw(1, 'player', 1, 500),
      ...units.map((_, slot) => spellVariance(slot)),
    ],
    [100, 150],
  )
  scenario.expected.itemFeedback = {
    actionIndex: 0,
    numbers: [
      { slot: 0, value: 59, tone: 'cyan' },
      { slot: 1, value: 46, tone: 'cyan' },
    ],
    glowSlots: [0, 1],
  }
  return {
    ...scenario,
    sounds: [
      itemSound,
      [...throwSounds(12, 103), ...units.map(({ id }) => ['enemy-death', 32, id])],
    ],
  }
}

function defineMixedThrow() {
  const units = [
    { id: 'white-impermanence', object: 452, hp: 300 },
    { id: 'zombie-soldier', object: 504, hp: 330 },
  ]
  const { step, complete } = mechanismScenario(
    'item-throw-poison-sand',
    '毒龙砂的毒伤、施毒与固定伤害',
    { team: 80, units, exp: 23, cash: 8 },
    random.seed,
    [
      mechanismMember(hero, 150, 50, 400, 900, 6),
      mechanismMember('wu-hou', 150, 900, 400, 500, 6),
      mechanismMember(anu, 150, 900, 400, 150, 6),
    ],
    bagWith('157'),
  )
  const [white, zombie] = units
  const thrown = throwAt(hero, '157', null)
  const finishWhite = attackAt(1, 'wu-hou', white.id)
  const finishZombie = attackAt(1, anu, zombie.id)
  // 0x42: poison resist 10/9 -> 0/41; 0x28: sorcery 10/0 -> resist/20 entry damage.
  // 0x21 deals another 55 to each slot, giving one displayed total per target.
  step(
    thrown,
    (state) => {
      state.inventory = []
      state.enemies[0].hp = 245
      state.enemies[1].hp = 214
      state.enemies[1].poisons = [553]
    },
    { enemyDamage: [55, 116] },
  )
  step(finishWhite, finishSlot(0), { rawDamage: 2133 })
  step(finishZombie, finishSlot(1), { rawDamage: 938 })
  const scenario = complete(
    [thrown, finishWhite, finishZombie],
    [
      queueDraw(1, 'enemy', 0, 42),
      queueDraw(1, 'enemy', 1, 42),
      queueDraw(1, 'player', 0, 903),
      queueDraw(1, 'player', 1, 509),
      queueDraw(1, 'player', 2, 150),
      spellVariance(0),
      spellVariance(1),
      poisonResistance(0),
      poisonResistance(1),
      ...anuStrike,
      ...anuStrike,
    ],
    [150, 150, 150],
  )
  return {
    ...scenario,
    sounds: [throwSounds(9, 313), playerAttackSounds(38, 2, 254), playerAttackSounds(40, 4, 184)],
  }
}

function defineSingleItemThrow({ id, title, itemId, damage, poisonId, healing = 0 }) {
  const worm = mechanismEnemies.worm
  const { step, complete } = mechanismScenario(
    id,
    title,
    worm,
    2,
    [
      { ...mechanismMember(hero, 150, 50, 400, 900, 6), hp: healing ? 10 : 150 },
      mechanismMember(anu, 150, 900, 400, 150, 6),
    ],
    bagWith(itemId),
  )
  const thrown = throwAt(hero, itemId, worm.id)
  const finish = attackAt(1, anu, worm.id)
  step(
    thrown,
    (state) => {
      state.inventory = []
      state.enemies[0].hp -= damage
      if (poisonId !== undefined) state.enemies[0].poisons = [poisonId]
      state.players[0].hp += healing
    },
    { enemyDamage: [damage] },
  )
  step(finish, finishEnemy, { rawDamage: poisonId === undefined ? 941 : 925 })
  const scenario = complete(
    [thrown, finish],
    [
      queueDraw(1, 'enemy', 0, 54),
      queueDraw(1, 'player', 0, healing ? 451 : 903),
      queueDraw(1, 'player', 1, 150),
      spellVariance(0),
      ...(poisonId === undefined ? [] : [poisonResistance(0)]),
      ...anuStrike,
    ],
    [150, 150],
  )
  scenario.expected.throwRecovery = { actionIndex: 0, slot: 0, targetSlot: 0, damage }
  if (healing) {
    Object.assign(scenario.expected.throwRecovery, { casterHeal: healing, restFrame: 0 })
  }
  scenario.expected.throwWindupMs = 440
  return {
    ...scenario,
    sounds: [throwSounds(9, 157), playerAttackSounds(40, 4, 216)],
  }
}

function defineSingleMpItem() {
  const { lantern } = mechanismEnemies
  const { step, complete } = mechanismScenario(
    'item-single-mp',
    '鼠儿果单体回气',
    lantern,
    4,
    [
      { ...mechanismMember(hero, 150, 50, 400, 200, 6), mp: 50 },
      mechanismMember(anu, 150, 900, 400, 150, 6),
    ],
    bagWith('99', '104'),
  )
  const use = itemAt(1, hero, '104', hero)
  const finish = attackAt(1, anu, lantern.id)
  step(use, (state) => {
    state.players[0].mp = 86
    state.inventory = bagWith('99')
  })
  step(finish, finishEnemy, { rawDamage: 986 })
  const scenario = complete(
    [use, finish],
    [
      queueDraw(1, 'enemy', 0, 21),
      queueDraw(1, 'player', 0, 609),
      queueDraw(1, 'player', 1, 150),
      ...anuStrike,
    ],
    [150, 150],
  )
  scenario.expected.itemFeedback = {
    actionIndex: 0,
    numbers: [{ slot: 0, value: 36, tone: 'cyan' }],
    glowSlots: [0],
  }
  return { ...scenario, sounds: [itemSound, playerAttackSounds(40, 4, 32)] }
}

function defineRevivalItem() {
  const { lantern } = mechanismEnemies
  const { step, round, complete } = mechanismScenario(
    'item-revival-after-knockout',
    '还魂香复活被灯笼击倒的队员',
    lantern,
    4,
    [
      { ...mechanismMember(hero, 150, 250, 0, 0, 6), hp: 30 },
      { ...mechanismMember(linger, 150, 50, 400, 40, 6), statuses: fairySwordStatus },
      mechanismMember(anu, 150, 900, 400, 40, 6),
    ],
    bagWith('95'),
  )
  const guards = [hero, linger, anu].map((id) => defendAt(1, id))
  const revive = itemAt(2, linger, '95', hero)
  const finish = attackAt(2, anu, lantern.id)
  step(guards[1], keepState, defense)
  step(guards[2], keepState, defense)
  step(
    { turn: 1, actorId: lantern.id, actorSide: 'enemy', kind: 'attack', targetId: hero },
    ({ players }) => {
      players[0].hp = 0
    },
    { rawDamage: 30, guard: { before: false, after: false } },
  )
  round(1)
  // 0x22 uses floor(max HP / 10); Game begins this case with the eventual target alive.
  step(revive, (state) => {
    state.players[0].hp = 15
    state.inventory = []
  })
  step(finish, finishEnemy, { rawDamage: 990 })
  const scenario = complete(
    [...guards, revive, finish],
    [
      queueDraw(1, 'enemy', 0, 21),
      queueDraw(1, 'player', 0, 15),
      queueDraw(1, 'player', 1, 230),
      queueDraw(1, 'player', 2, 200),
      ...enemyPhysicalDraws.map((purpose) => ({ purpose })),
      queueDraw(2, 'enemy', 0, 21),
      queueDraw(2, 'player', 1, 138),
      queueDraw(2, 'player', 2, 40),
      ...anuStrike,
    ],
    [82, 150, 150],
  )
  scenario.expected.playerCasualties = [
    { actionIndex: 2, recoveryFrame: 2, soundKind: 'player-death', survivorTurn: 2 },
  ]
  scenario.expected.itemFeedback = {
    actionIndex: 3,
    numbers: [{ slot: 0, value: 15, tone: 'yellow', restFrame: 1 }],
    glowSlots: [0],
  }
  return {
    ...scenario,
    sounds: [
      [],
      [],
      [...enemyAttackSounds(50, 352), ['player-death', 23]],
      itemSound,
      playerAttackSounds(40, 4, 32),
    ],
  }
}

const singleThrows = [
  {
    id: 'item-throw-corpse-meat',
    title: '尸腐肉投掷与即时毒伤',
    itemId: '116',
    damage: 12,
    poisonId: 552,
  },
  { id: 'item-throw-current-hp', title: '无影毒按当前血量扣血', itemId: '137', damage: 156 },
  {
    id: 'item-throw-drain',
    title: '吸星锁伤害与回血同帧',
    itemId: '158',
    damage: 180,
    healing: 140,
  },
]

function definePlayerSleep(resisted) {
  const { lantern } = mechanismEnemies
  const enemy = { team: 62, units: [ghoul, lantern], exp: 11, cash: 13 }
  const { step, round, complete } = mechanismScenario(
    resisted ? 'player-sleep-resisted' : 'player-sleep-hit',
    resisted ? '回梦被灯笼抵抗' : '回梦命中开膛鬼',
    enemy,
    4,
    [
      {
        ...mechanismMember(linger, 150, 0, 400, 900, 6),
        magic: 80,
        skills: ['303'],
        statuses: fairySwordStatus,
      },
      mechanismMember(hero, 150, 600, 400, 500, 6),
    ],
  )
  const targetSlot = resisted ? 1 : 0
  const [target, cancelled] = [enemy.units[targetSlot], enemy.units[1 - targetSlot]]
  const magic = { ...castAt(1, linger, '303', target.id), cancelTargetId: cancelled.id }
  const guard = defendAt(1, hero)
  const guard2 = defendAt(2, linger)
  const hitGhoul = attackAt(2, hero, ghoul.id)
  const guard3 = defendAt(3, linger)
  const hitLantern = attackAt(3, hero, lantern.id)
  const blocked = { blocked: true, effectiveHpLoss: 0 }
  step(guard, keepState, defense)
  step(
    magic,
    ({ enemies, players }) => {
      players[0].mp -= 20
      if (!resisted) enemies[0].statuses.sleep = 4
    },
    { growth: { maxMP: 2, magicAttack: 1 } },
  )
  if (resisted) step(enemyAttackAt(1, ghoul.id, hero), keepState, blocked)
  else step({ ...passAt(1, ghoul.id), actorSide: 'enemy' })
  step(enemyAttackAt(1, lantern.id, hero), keepState, blocked)
  const tickSleep = ({ enemies }) => {
    if (!resisted) enemies[0].statuses.sleep--
  }
  round(1, tickSleep)
  step(guard2, keepState, defense)
  step(hitGhoul, finishEnemy, { rawDamage: resisted ? 631 : 613 })
  if (resisted)
    step(
      enemyAttackAt(2, lantern.id, hero),
      ({ players }) => {
        players[1].hp--
      },
      { rawDamage: 1 },
    )
  else step(enemyAttackAt(2, lantern.id, hero), keepState, blocked)
  round(2, tickSleep)
  step(guard3, keepState, defense)
  step(hitLantern, ({ enemies }) => Object.assign(enemies[1], { hp: 0, alive: false }), {
    rawDamage: resisted ? 1857 : 604,
  })
  const scenario = complete(
    [magic, guard, guard2, hitGhoul, guard3, hitLantern],
    [
      queueDraw(1, 'enemy', 0, 57),
      queueDraw(1, 'enemy', 1, 21),
      queueDraw(1, 'player', 0, 906),
      queueDraw(1, 'player', 1, 2515),
      { purpose: 'battle-script-chance', value: 0.23399724275805056 },
      { purpose: 'status-resistance', target: { turn: 1, side: 'enemy', slot: targetSlot } },
      ...draws(
        'cast-growth',
        'enemy-target',
        ...(resisted ? ['enemy-block'] : []),
        'enemy-target',
        'enemy-block',
      ),
      queueDraw(2, 'enemy', 0, 57),
      queueDraw(2, 'enemy', 1, 21),
      queueDraw(2, 'player', 0, 4530),
      queueDraw(2, 'player', 1, 503),
      ...draws(...heroStrikeDraws),
      ...draws(...(resisted ? enemyPhysicalDraws : ['enemy-target', 'enemy-block'])),
      queueDraw(3, 'enemy', 1, 21),
      queueDraw(3, 'player', 0, 4530),
      queueDraw(3, 'player', 1, 503),
      ...draws(...heroStrikeDraws),
    ],
    [150, resisted ? 149 : 150],
  )
  scenario.expected.statusNotice = { actionIndex: 1, text: '攻击无效', visible: resisted }
  scenario.expected.playerCastRecovery = 1
  return {
    ...scenario,
    sounds: [
      [],
      [
        ['cast-windup', 10],
        ['spell-effect', 169],
      ],
      resisted ? enemyAttackSounds(358, 15) : [],
      enemyAttackSounds(50, 15),
      [],
      playerAttackSounds(37, 1, 185),
      enemyAttackSounds(50, resisted ? 352 : 15),
      [],
      playerAttackSounds(resisted ? 5 : 37, 1, 32),
    ],
  }
}

function definePlayerProtection(protectedBySpell) {
  const { lantern } = mechanismEnemies
  const skill = protectedBySpell ? '309' : '306'
  const { step, round, complete } = mechanismScenario(
    protectedBySpell ? 'player-protect' : 'player-protect-control',
    protectedBySpell ? '金刚咒护体减伤' : '净衣咒无护体对照',
    lantern,
    3,
    [
      {
        ...mechanismMember(linger, 150, 0, 400, 100, 6),
        magic: 80,
        skills: [skill],
        statuses: fairySwordStatus,
      },
      mechanismMember(hero, 150, 250, 0, 8, 6),
    ],
  )
  const magic = castAt(1, linger, skill, hero)
  const guard = defendAt(1, hero)
  const guard2 = defendAt(2, linger)
  const finish = attackAt(2, hero, lantern.id)
  const [first, second] = protectedBySpell ? [14, 19] : [28, 38]
  step(
    magic,
    ({ players }) => {
      players[0].mp -= protectedBySpell ? 11 : 7
      if (protectedBySpell) players[1].statuses.protect = 7
    },
    { growth: { maxMP: 2, magicAttack: 1 } },
  )
  step(guard, keepState, defense)
  step(
    enemyAttackAt(1, lantern.id, hero),
    ({ players }) => {
      players[1].hp -= first
    },
    { rawDamage: first },
  )
  round(1, ({ players }) => {
    if (protectedBySpell) players[1].statuses.protect = 6
  })
  step(guard2, keepState, defense)
  step(
    enemyAttackAt(2, lantern.id, hero),
    ({ players }) => {
      players[1].hp -= second
    },
    { rawDamage: second },
  )
  step(finish, finishEnemy, { rawDamage: 246 })
  const scenario = complete(
    [magic, guard, guard2, finish],
    [
      queueDraw(1, 'enemy', 0, 21),
      queueDraw(1, 'player', 0, 318),
      queueDraw(1, 'player', 1, 55),
      ...draws('cast-growth', ...enemyPhysicalDraws),
      queueDraw(2, 'enemy', 0, 21),
      queueDraw(2, 'player', 0, 530),
      queueDraw(2, 'player', 1, 11),
      ...draws(...enemyPhysicalDraws, ...heroStrikeDraws),
    ],
    [150, protectedBySpell ? 133 : 117],
  )
  // The two skills use the same single-ally FIRE chunk and authored offsets.
  scenario.expected.allySpellPresentation = {
    actionIndex: 0,
    targetSlot: 1,
    offset: { x: -6, y: -18 },
    fireFrames: 24,
  }
  return {
    ...scenario,
    observeMagicOverlays: true,
    sounds: [
      [
        ['cast-windup', 10],
        ['spell-effect', 141],
      ],
      [],
      enemyAttackSounds(50, 352),
      [],
      enemyAttackSounds(50, 352),
      playerAttackSounds(37, 1, 32),
    ],
  }
}

function defineCasualtyDialogue() {
  const enemy = mechanismEnemies.lantern
  const { step, round, complete } = mechanismScenario(
    'casualty-dialogue',
    '赵灵儿濒死对白及李逍遥的援护者阵亡对白',
    enemy,
    6,
    [
      { ...mechanismMember(linger, 24, 0, 0, 0), statuses: fairySwordStatus },
      { ...mechanismMember(hero, 100, 900, 400, 0), maxHP: 150 },
    ],
  )
  const firstDefend = defendAt(1, linger)
  const allyDefend = defendAt(1, hero)
  const secondDefend = defendAt(2, linger)
  const allyAttack = attackAt(2, hero, enemy.id)
  const strike = { ...attackAt(1, enemy.id, linger), actorSide: 'enemy' }
  step(firstDefend, keepState, defense)
  // DEF13 and active defense halve the attacker outcome to 21. The first script roll is 98.
  step(
    strike,
    ({ players }) => {
      players[0].hp = 3
    },
    { rawDamage: 21, guard: { before: true, after: true } },
  )
  step(allyDefend, keepState, defense)
  round(1)
  step(
    { ...strike, turn: 2 },
    ({ players }) => {
      players[0].hp = 0
    },
    { rawDamage: 3 },
  )
  // The real 43448 branch applies the heal only after its two pages have completed.
  step(allyAttack, finishEnemy, {
    rawDamage: 1035,
    prepare: ({ players }) => {
      players[1].hp = 150
    },
  })
  const scenario = complete(
    [firstDefend, allyDefend, secondDefend, allyAttack],
    [
      queueDraw(1, 'enemy', 0, 21),
      queueDraw(1, 'player', 0, 30),
      queueDraw(1, 'player', 1, 15),
      ...draws(...enemyPhysicalDraws, 'battle-script-chance'),
      queueDraw(2, 'enemy', 0, 21),
      queueDraw(2, 'player', 0, 15),
      queueDraw(2, 'player', 1, 3),
      ...draws(
        ...enemyPhysicalDraws,
        'battle-script-chance',
        'battle-script-chance',
        'battle-script-chance',
        ...heroStrikeDraws,
      ),
    ],
    [12, 150],
  )
  const autoPage = (slot, portraitId, holdMs, lines) => ({
    slot,
    lines,
    portraitId,
    advance: 'auto',
    holdMs,
  })
  scenario.expected.casualtyDialogue = [
    {
      actionIndex: 1,
      nextActionIndex: 2,
      pages: [
        autoPage('bottom', 2, 685, ['灵儿～你还好吧？']),
        autoPage('top', 15, 685, ['我．．我没事．', '这点伤．．我还捱得了']),
      ],
    },
    {
      actionIndex: 3,
      nextActionIndex: 4,
      pages: [
        autoPage('bottom', 5, 685, ['　　啊～！']),
        autoPage('narration', null, 1400, ['李逍遥怒火燃烧，体力恢复']),
      ],
    },
  ]
  scenario.expected.casualtyEffects = [
    {
      afterActionIndex: 3,
      targetId: hero,
      before: { hp: 100, attack: 902 },
      after: { hp: 150, attack: 947 },
    },
  ]
  return scenario
}

function defineEnemyMagicCasualty(dying) {
  const enemy = mechanismEnemies.caster
  const { step, complete } = mechanismScenario(
    dying ? 'thunder-dying' : 'thunder-death',
    dying ? '雷咒后濒死与队友续战' : '雷咒后阵亡与队友续战',
    enemy,
    6,
    [
      { ...mechanismMember(hero, dying ? 85 : 24, 250, 0, 0), maxHP: dying ? 150 : 60 },
      mechanismMember(anu, 150, 2200, 700, 1),
    ],
  )
  const defend = defendAt(1, hero)
  const allyAttack = attackAt(1, anu, enemy.id)
  // CLASSIC player +100 baseline resistance, field7 thunder resistance −2 and spell guard /2.
  const remaining = dying ? 27 : 0
  step(
    {
      turn: 1,
      actorId: enemy.id,
      actorSide: 'enemy',
      kind: 'cast',
      skillId: '316',
      targetId: hero,
    },
    ({ players }) => {
      players[0].hp = remaining
    },
  )
  if (dying) step(defend, keepState, defense)
  step(allyAttack, finishEnemy, { rawDamage: 2225 })
  const scenario = complete(
    [defend, allyAttack],
    [
      queueDraw(1, 'enemy', 0, 91),
      queueDraw(1, 'player', 0, 15),
      queueDraw(1, 'player', 1, 1),
      ...draws(
        'enemy-target',
        'enemy-magic-choice',
        'enemy-magic-block',
        'enemy-magic-damage-float',
        'strike-bonus',
        'strike-critical',
        'strike-variance',
        'attack-growth',
      ),
    ],
    [dying ? 88 : 30, 150],
  )
  scenario.expected.magicCasualties = [
    {
      actionIndex: 0,
      targetId: hero,
      damage: dying ? 58 : 24,
      recoveryFrame: dying ? 1 : 2,
      soundKind: dying ? 'player-dying' : 'player-death',
    },
  ]
  return scenario
}

function definePoisonCasualties() {
  const enemy = mechanismEnemies.worm
  const { step, round, complete } = mechanismScenario(
    'round-end-poison-casualties',
    '赤毒回合末濒死、阵亡和继续战斗',
    enemy,
    50,
    [
      { ...mechanismMember(linger, 19, 0, 250, 900), maxHP: 50, statuses: fairySwordStatus },
      mechanismMember(hero, 150, 900, 400, 500),
    ],
  )
  const first = [defendAt(1, linger), defendAt(1, hero)]
  const second = [defendAt(2, linger), defendAt(2, hero)]
  const third = attackAt(3, hero, enemy.id)
  const strike = { ...attackAt(1, enemy.id, linger), actorSide: 'enemy' }
  const poisonHit = { rawDamage: 1, effectiveHpLoss: 8, guard: { before: true, after: true } }
  step(first[0], keepState, defense)
  step(first[1], keepState, defense)
  step(strike, ({ players }) => Object.assign(players[0], { hp: 11, poisons: [551] }), poisonHit)
  round(1, ({ players }) => {
    players[0].hp = 4
  })
  step(second[1], keepState, defense)
  step(second[0], keepState, defense)
  step(
    { ...strike, turn: 2, targetId: hero },
    ({ players }) => {
      Object.assign(players[1], { hp: 142, poisons: [551] })
    },
    poisonHit,
  )
  round(2, ({ players }) => {
    players[0].hp = 0
    players[1].hp = 135
  })
  step(third, finishEnemy, { rawDamage: 887 })
  const poisonDraws = [
    ...enemyPhysicalDraws,
    'enemy-equivalent-poison-resist',
    'enemy-equivalent-poison-script',
  ]
  const scenario = complete(
    [...first, ...second, third],
    [
      queueDraw(1, 'enemy', 0, 54),
      queueDraw(1, 'player', 0, 4530),
      queueDraw(1, 'player', 1, 2515),
      ...draws(...poisonDraws),
      queueDraw(2, 'enemy', 0, 54),
      queueDraw(2, 'player', 0, 2265),
      queueDraw(2, 'player', 1, 2515),
      ...draws(...poisonDraws),
      queueDraw(3, 'enemy', 0, 54),
      queueDraw(3, 'player', 1, 503),
      ...draws(...heroStrikeDraws),
    ],
    [25, 142],
  )
  const forbiddenSounds = [20, 24].map(soundAsset)
  scenario.expected.poisonCasualties = [
    { turn: 1, targetId: linger, damage: 7, holdFrame: 3, recoveryFrame: 1, forbiddenSounds },
    { turn: 2, targetId: linger, damage: 4, holdFrame: 1, recoveryFrame: 2, forbiddenSounds },
  ]
  return scenario
}

const soundAsset = (id) => `sound.pal.${String(id).padStart(3, '0')}`
const rawSoundPath = (id) => `data/extracted/sounds/${id}.wav`
const projectSoundPath = (id) => `assets/migrated/sounds/${String(id).padStart(3, '0')}.wav`
const soundFrames = {
  1: 4869,
  2: 5075,
  4: 11775,
  5: 11232,
  6: 10302,
  8: 6045,
  9: 6982,
  10: 10366,
  12: 16418,
  15: 12200,
  19: 7695,
  20: 9760,
  23: 13351,
  24: 20249,
  28: 13408,
  29: 13491,
  32: 20700,
  37: 4102,
  38: 12378,
  40: 5869,
  50: 14593,
  92: 6983,
  94: 3121,
  101: 29710,
  102: 71700,
  103: 106622,
  106: 19357,
  109: 68831,
  115: 36916,
  117: 35090,
  118: 24782,
  126: 10165,
  133: 55213,
  138: 41746,
  141: 37872,
  157: 11512,
  169: 36112,
  182: 40055,
  184: 37194,
  185: 6605,
  216: 27640,
  247: 35018,
  254: 36208,
  265: 9627,
  313: 31633,
  347: 18610,
  352: 9077,
  357: 8958,
  358: 16118,
  368: 6370,
  369: 3514,
  374: 11016,
}

const playerAttackSounds = (voice, weapon, death) => [
  ['player-windup', voice],
  ['player-weapon', weapon],
  ['enemy-death', death],
]
const enemyAttackSounds = (attack, call) => [
  ['enemy-windup', attack],
  ['enemy-impact', call],
]
const itemSound = [['item', 28]]
// SDLPal fight.c:2058–2124,2292–2300,2377–2392,2926–2929,4695,4931–5085,756.
// Each row belongs to the corresponding executed action, including silent defend/pass actions.
const audioCues = {
  'solo-lantern': [playerAttackSounds(37, 1, 32)],
  'party-lanterns': [
    playerAttackSounds(37, 1, 32),
    playerAttackSounds(38, 2, 32),
    playerAttackSounds(8, 4, 32),
  ],
  'herb-settlement': [itemSound, playerAttackSounds(40, 4, 32)],
  'two-round-commands': [
    [],
    itemSound,
    enemyAttackSounds(50, 352),
    [
      ['cast-windup', 9],
      ['spell-effect', 138],
    ],
    playerAttackSounds(38, 2, 32),
  ],
  'dual-sickle-weasel': [
    [],
    [
      ['cast-windup', 369],
      ['spell-effect', 126],
    ],
    enemyAttackSounds(368, 94),
    playerAttackSounds(37, 1, 247),
  ],
  'enemy-sleep': [
    [],
    [],
    [['spell-effect', 169]],
    [],
    enemyAttackSounds(265, 92),
    [],
    playerAttackSounds(40, 4, 185),
  ],
  'equivalent-poison': [
    [],
    enemyAttackSounds(357, 92),
    itemSound,
    enemyAttackSounds(357, 92),
    playerAttackSounds(37, 1, 216),
  ],
  'automatic-block': [enemyAttackSounds(357, 15), playerAttackSounds(37, 1, 216)],
  'lantern-player-casualty': [
    [...enemyAttackSounds(50, 352), ['player-dying', 19]],
    [],
    [],
    [...enemyAttackSounds(50, 352), ['player-death', 23]],
    playerAttackSounds(40, 4, 32),
  ],
  'casualty-dialogue': [
    [],
    [...enemyAttackSounds(50, 352), ['player-dying', 20]],
    [],
    [...enemyAttackSounds(50, 352), ['player-death', 24]],
    playerAttackSounds(37, 1, 32),
  ],
  'thunder-dying': [
    [
      ['cast-windup', 374],
      ['spell-effect', 106],
      ['player-dying', 19],
    ],
    [],
    playerAttackSounds(40, 4, 182),
  ],
  'thunder-death': [
    [
      ['cast-windup', 374],
      ['spell-effect', 106],
      ['player-death', 23],
    ],
    playerAttackSounds(40, 4, 182),
  ],
  'round-end-poison-casualties': [
    [],
    [],
    enemyAttackSounds(357, 92),
    [],
    [],
    enemyAttackSounds(357, 92),
    playerAttackSounds(37, 1, 216),
  ],
}

function attachAudioOracle(scenario) {
  const { sounds, ...configured } = scenario
  const byAction = sounds ?? audioCues[scenario.id]
  assert.equal(byAction?.length, scenario.expected.actions.length, `audio actions: ${scenario.id}`)
  scenario.expected.audioCues = byAction.flatMap((cues, actionIndex) =>
    cues.map(([kind, id, targetId]) => ({
      actionIndex,
      kind,
      assetId: soundAsset(id),
      ...(targetId ? { targetId } : {}),
    })),
  )
  scenario.expected.audioSourceFrames = Object.fromEntries(
    byAction.flatMap((cues) => cues.map(([, id]) => [soundAsset(id), soundFrames[id]])),
  )
  return configured
}

function attachSpellPaintOracle(scenario) {
  const { actions, start } = scenario.expected
  const probes = actions.flatMap((action, actionIndex) => {
    const skillId = action.kind === 'throw' ? throwMagicObjects[action.itemId] : action.skillId
    const source = throwPaintSources[skillId] ?? spellPaintSources[skillId]
    if (!source) return []
    const player = start.players.find(({ id }) => id === action.targetId)
    const target = player ?? start.enemies.find((enemy) => enemy?.id === action.targetId)
    assert(target || source.points, `missing paint target: ${scenario.id}/${skillId}`)
    return [
      {
        actionIndex,
        skillId,
        ...source,
        targetSide: player ? 'player' : 'enemy',
        ...(target ? { targetSlot: target.slot } : {}),
      },
    ]
  })
  if (!probes.length) return scenario
  scenario.expected.spellPaintOrder = probes
  return { ...scenario, observeMagicOverlays: true }
}

export const BATTLE_FOUNDATION_SCENARIOS = Object.freeze(
  [
    defineScenario('solo-lantern', '单人单灯笼', ['li-xiaoyao'], 1),
    defineScenario(
      'party-lanterns',
      '三名队员分别选择三个灯笼',
      ['li-xiaoyao', 'wu-hou', 'anu'],
      3,
    ),
    defineScenario('herb-settlement', '止血草治疗、消耗与正式结算', ['li-xiaoyao', 'anu'], 1, true),
    defineTwoRoundScenario(),
    defineDualSickleWeasel(),
    defineEnemySleep(),
    defineEquivalentPoison(),
    defineAutomaticBlock(),
    definePlayerCasualties(),
    defineCasualtyDialogue(),
    defineEnemyMagicCasualty(true),
    defineEnemyMagicCasualty(false),
    definePoisonCasualties(),
    ...playerElements.map((entry) => definePlayerElement(entry)),
    definePlayerElement(['random-order', '风咒随机抽样', ...playerElements[0].slice(2, -1), 82], 6),
    definePlayerAreaMagic(),
    defineCooperativeMagic(),
    defineCooperativeFallback(),
    defineThrownSword(),
    definePlayerSleep(false),
    definePlayerSleep(true),
    definePlayerProtection(true),
    definePlayerProtection(false),
    defineGroupItemThrow(),
    defineMixedThrow(),
    ...singleThrows.map(defineSingleItemThrow),
    defineSingleMpItem(),
    defineRevivalItem(),
  ].map((scenario) => attachSpellPaintOracle(attachAudioOracle(scenario))),
)

export function battleFoundationScenarioGroup(id) {
  if (id === 'all') return BATTLE_FOUNDATION_SCENARIOS
  if (id === 'item-effects')
    return BATTLE_FOUNDATION_SCENARIOS.filter(({ id: name }) => name.startsWith('item-'))
  if (id === 'coop-sleep-followup') {
    const names = new Set([
      'player-cooperative-fallback',
      'player-sleep-hit',
      'player-sleep-resisted',
    ])
    return BATTLE_FOUNDATION_SCENARIOS.filter(({ id: scenarioId }) => names.has(scenarioId))
  }
  assert(['established', 'player-actions'].includes(id), `unknown battle foundation group: ${id}`)
  return BATTLE_FOUNDATION_SCENARIOS.filter(
    ({ id: scenarioId }) =>
      !scenarioId.startsWith('item-') &&
      scenarioId.startsWith('player-') === (id === 'player-actions'),
  )
}

export function battleFoundationScenario(id) {
  const scenario = BATTLE_FOUNDATION_SCENARIOS.find((entry) => entry.id === id)
  assert(scenario, `unknown battle foundation scenario: ${id}`)
  return copy(scenario)
}

/** The browser receives setup inputs only; the factual producer never receives the oracle. */
export function battleLaunchSpec(scenario) {
  return copy({
    id: scenario.id,
    seed: scenario.random.seed,
    party: scenario.party,
    enemies: scenario.enemies,
    game: scenario.game,
    reforge: scenario.reforge,
  })
}

/** Bind the raw/author JSON, face pixels, FIRE and WAVs used by the independent comparisons. */
export async function battleFoundationInputSources(root) {
  const paths = [
    'data/extracted/images/ui/frame-48.png',
    'projects/pal/assets/migrated/faces/li-xiaoyao.png',
    ...paintFireChunks.flatMap((chunk) => [
      `data/extracted/${rawFirePath(chunk)}`,
      `projects/pal/${projectFirePath(chunk)}`,
    ]),
    ...Object.keys(soundFrames).flatMap((id) => [
      rawSoundPath(id),
      `projects/pal/${projectSoundPath(id)}`,
    ]),
  ]
  for (const directory of ['data/extracted', 'projects/pal']) {
    for (const name of await readdir(resolve(root, directory), { recursive: true }))
      if (name.endsWith('.json')) paths.push(`${directory}/${name}`)
  }
  return paths.sort()
}

async function verifyPaintFireSources(root, index) {
  await Promise.all(
    paintFireChunks.map(async (chunk) => {
      const assetId = `effect-sprite.pal.magic.${String(chunk).padStart(3, '0')}`
      const record = index.assets[assetId]
      assert.equal(record?.kind, 'effect-sprite', assetId)
      assert.equal(record.path, projectFirePath(chunk), assetId)
      const [raw, authored] = await Promise.all([
        readFile(resolve(root, 'data/extracted', rawFirePath(chunk))),
        readFile(resolve(root, 'projects/pal', record.path)),
      ])
      assert(raw.equals(authored), `${assetId}: raw and authored FIRE differ`)
      assert.equal(raw.length, record.bytes, assetId)
      assert.equal(createHash('sha256').update(raw).digest('hex'), record.sha256, assetId)
    }),
  )
}

async function verifyAudioSources(root, index) {
  await Promise.all(
    Object.entries(soundFrames).map(async ([id, frames]) => {
      const assetId = soundAsset(id)
      const record = index.assets[assetId]
      assert.equal(record?.path, projectSoundPath(id), assetId)
      assert.equal(record.kind, 'sound', assetId)
      const [raw, authored] = await Promise.all([
        readFile(resolve(root, rawSoundPath(id))),
        readFile(resolve(root, 'projects/pal', record.path)),
      ])
      assert(raw.equals(authored), `${assetId}: raw and authored WAV differ`)
      assert.equal(authored.byteLength, record.bytes, assetId)
      assert.equal(createHash('sha256').update(authored).digest('hex'), record.sha256, assetId)
      assert.equal(raw.toString('ascii', 0, 4), 'RIFF', assetId)
      assert.equal(raw.toString('ascii', 8, 16), 'WAVEfmt ', assetId)
      assert.equal(raw.readUInt16LE(20), 1, assetId)
      assert.equal(raw.readUInt16LE(22), 1, assetId)
      assert.equal(raw.readUInt32LE(24), 22050, assetId)
      assert.equal(raw.readUInt16LE(34), 16, assetId)
      assert.equal(raw.toString('ascii', 36, 40), 'data', assetId)
      assert.equal(raw.readUInt32LE(40), frames * 2, assetId)
    }),
  )
}

/** Verify the few independent data premises before either engine is launched. */
export async function verifyBattleFoundationSources(root) {
  const json = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'))
  const [
    rawTeams,
    rawEnemies,
    enemies,
    teams,
    items,
    rawSpells,
    rawMagic,
    rawObjectMagics,
    rawEnemyObjects,
    events,
    skills,
    rawItems,
    rawPoisons,
    poisons,
    assetIndex,
    rawRoles,
    actors,
    rawFields,
    fields,
    rawLevelUp,
    fireSprites,
  ] = await Promise.all([
    json('data/extracted/data/enemy-teams.json'),
    json('data/extracted/data/enemies.json'),
    json('projects/pal/content/enemies.json'),
    json('projects/pal/content/enemy-teams.json'),
    json('projects/pal/content/items.json'),
    json('data/extracted/data/spells.json'),
    json('data/extracted/data/magic.json'),
    json('data/extracted/data/object-magics.json'),
    json('data/extracted/data/enemy-objects.json'),
    json('data/extracted/events/all.json'),
    json('projects/pal/content/skills.json'),
    json('data/extracted/data/items.json'),
    json('data/extracted/data/object-poisons.json'),
    json('projects/pal/content/poisons.json'),
    json('projects/pal/assets/index.json'),
    json('data/extracted/data/player-roles.json'),
    json('projects/pal/content/actors.json'),
    json('data/extracted/data/battle-fields.json'),
    json('projects/pal/content/battle-fields.json'),
    json('data/extracted/data/level-up-magic.json'),
    json('data/extracted/data/fire-sprites.json'),
  ])
  const rawHero = rawRoles.roles.find(({ id }) => id === roles[hero])
  const battler = actors.find(({ id }) => id === hero).battler
  assert.equal(rawHero.coverSound, 15)
  assert.equal(battler.sounds.cover, soundAsset(rawHero.coverSound))
  assert.equal(rawHero.coveredBy, 2)
  assert.equal(battler.coveredBy, 'lin-yueru')
  assert.deepEqual([rawHero.dyingSound, rawHero.deathSound], [19, 23])
  assert.deepEqual([battler.sounds.dying, battler.sounds.death], [soundAsset(19), soundAsset(23)])
  const rawEnemy = rawEnemies.find((enemy) => enemy.id === 2)
  const enemy = enemies.find((entry) => entry.id === 'enemy-399')
  assert.equal(rawEnemy.health, 30)
  assert.deepEqual([rawEnemy.exp, rawEnemy.cash], [1, 3])
  assert.deepEqual([enemy.stats.health, enemy.stats.exp, enemy.stats.cash], [30, 1, 3])
  assert.equal(enemy.ai.hooks, undefined)
  assert.equal(rawEnemy.attackEquivItemRate, 0)
  for (const [id, count] of [
    [1, 1],
    [3, 3],
  ]) {
    const raw = rawTeams.find((entry) => entry.id === id)
    const current = teams.find((entry) => entry.id === `team-${id}`)
    assert.deepEqual(raw.enemyObjectIndexes.slice(0, count), Array(count).fill(399))
    assert.deepEqual(raw.enemies.slice(0, count), Array(count).fill(2))
    assert.deepEqual(
      current.slots.filter((slot) => slot !== null),
      Array(count).fill('enemy-399'),
    )
  }
  const herb = items.find((entry) => entry.id === '99')
  assert.equal(herb.use.consuming, true)
  assert.equal(herb.use.target, 'oneAlly')
  assert.deepEqual(herb.use.effects, [{ kind: 'healHp', amount: 50 }])
  const cure = rawSpells.find((spell) => spell.id === 296)
  const commands = events.segments.find(({ name }) => name === 'all').commands
  const cureCode = commands[cure.scriptOnSuccess]
  assert.equal(cure.flags.usableInBattle, true)
  assert.equal(cure.flags.usableToEnemy, false)
  assert.equal(cure.flags.applyToAll, false)
  assert.equal(rawMagic.find(({ id }) => id === cure.magicNumber).costMP, 6)
  assert.deepEqual([cureCode.opcode, cureCode.operands], [0x1b, [0, 75, 0]])
  const currentCure = skills.skills.find(({ id }) => id === '296')
  assert.deepEqual(
    [currentCure.target, currentCure.cost.mp, currentCure.effects],
    ['oneAlly', 6, [{ kind: 'healHp', amount: 75 }]],
  )
  for (const { team, object, raw, hp, exp, cash } of Object.values(mechanismEnemies)) {
    const rawTeam = rawTeams.find(({ id }) => id === team)
    assert.deepEqual(rawTeam.enemies, [raw, 65535, 65535, 65535, 65535])
    assert.deepEqual(rawTeam.enemyObjectIndexes, [object, 65535, 65535, 65535, 65535])
    const templateId = `enemy-${object}`
    assert.deepEqual(teams.find(({ id }) => id === `team-${team}`).slots, [templateId])
    const rawStats = rawEnemies.find(({ id }) => id === raw)
    const current = enemies.find(({ id }) => id === templateId)
    const { stats, ai } = current
    assert.deepEqual([rawStats.health, rawStats.exp, rawStats.cash], [hp, exp, cash])
    assert.deepEqual([stats.health, stats.exp, stats.cash], [hp, exp, cash])
    for (const key of [
      'level',
      'attackStrength',
      'magicStrength',
      'defense',
      'dexterity',
      'physicalResistance',
    ])
      assert.equal(stats[key], rawStats[key], `${templateId}: ${key}`)
    assert.equal(stats.dualMove, Boolean(rawStats.dualMove))
    assert.equal(ai.hooks, undefined)
    assert.equal(ai.rules, undefined)
    assert.deepEqual(
      ai.fallback,
      rawStats.magic
        ? {
            action: { kind: 'cast', skillId: String(rawStats.magic) },
            chancePercent: rawStats.magicRate * 10,
          }
        : undefined,
    )
    assert.deepEqual(
      current.attackEquivItem,
      rawStats.attackEquivItem
        ? {
            itemId: String(rawStats.attackEquivItem),
            rate: rawStats.attackEquivItemRate,
          }
        : undefined,
    )
  }
  for (const [team, objects] of [
    [116, [406, 406, 406]],
    [62, [407, 399]],
  ]) {
    assert.deepEqual(
      rawTeams.find(({ id }) => id === team).enemyObjectIndexes.filter((id) => id !== 65535),
      objects,
    )
    assert.deepEqual(
      teams.find(({ id }) => id === `team-${team}`).slots,
      objects.map((object) => `enemy-${object}`),
    )
  }
  const field = { wind: -3, thunder: -2, water: 0, fire: 1, earth: 0 }
  assert.deepEqual(rawFields.find(({ id }) => id === 7).magicEffect, field)
  assert.deepEqual(fields.find(({ id }) => id === 7).magicEffect, field)
  const worm = rawEnemies.find(({ id }) => id === 9)
  const currentWorm = enemies.find(({ id }) => id === 'enemy-406').stats
  const resistance = { wind: 5, thunder: 5, water: 5, fire: 5, earth: 3 }
  for (const stats of [worm, currentWorm]) {
    assert.deepEqual(stats.elemResistance, resistance)
    assert.equal(stats.poisonResistance, 0)
    assert.equal(stats.defense + (stats.level + 6) * 4, 82)
  }
  for (const [, , id, cost, power, elemental, sound] of [
    ...playerElements,
    ['', '', '313', 11, 88, 1, 102],
    ['', '', '353', 18, 150, 6, 133],
    ['', '', '381', 10, 100, 4, 117],
  ]) {
    const spell = rawSpells.find((entry) => entry.id === Number(id))
    const raw = rawMagic.find((entry) => entry.id === spell.magicNumber)
    const skill = skills.skills.find((entry) => entry.id === id)
    assert.deepEqual(
      [raw.costMP, raw.baseDamage, raw.elemental, raw.sound],
      [cost, power, elemental, sound],
    )
    assert.deepEqual(
      [skill.cost.mp, skill.effects, skill.animation.sound],
      [cost, [{ kind: 'damage', power, elemental }], soundAsset(sound)],
    )
    assert.equal(skill.target, raw.type === 'normal' ? 'oneEnemy' : 'allEnemies')
  }
  const rawLinger = rawRoles.roles.find(({ id }) => id === roles[linger])
  const lingerBattler = actors.find(({ id }) => id === linger).battler
  for (const [, , skill] of playerElements) {
    assert(rawLinger.magic.includes(Number(skill)))
    assert(lingerBattler.initialMagic.includes(skill))
  }
  assert.deepEqual(rawLevelUp[0][roles[linger]], { level: 7, magic: 313 })
  assert(actors.find(({ id }) => id === anu).battler.initialMagic.includes('353'))
  assert.deepEqual(
    [rawLinger.cooperativeMagic, lingerBattler.cooperativeMagicSkillId],
    [381, '381'],
  )
  const weaselSpell = rawSpells.find(({ id }) => id === 339)
  assert.equal(weaselSpell.flags.applyToAll, false)
  assert.deepEqual([weaselSpell.scriptOnUse, weaselSpell.scriptOnSuccess], [0, 0])
  const weaselMagic = rawMagic.find(({ id }) => id === weaselSpell.magicNumber)
  assert.deepEqual([weaselMagic.baseDamage, weaselMagic.elemental], [150, 0])
  assert.deepEqual(skills.skills.find(({ id }) => id === '339').effects, [
    { kind: 'damage', power: 150, elemental: 0 },
  ])
  const thunderSpell = rawSpells.find(({ id }) => id === 316)
  const thunderMagic = rawMagic.find(({ id }) => id === thunderSpell.magicNumber)
  assert.deepEqual([thunderMagic.baseDamage, thunderMagic.elemental], [60, 2])
  assert.equal(thunderSpell.flags.applyToAll, false)
  assert.deepEqual(skills.skills.find(({ id }) => id === '316').effects, [
    { kind: 'damage', power: 60, elemental: 2 },
  ])
  const sleepSpell = rawSpells.find(({ id }) => id === 303)
  assert.equal(sleepSpell.scriptOnSuccess, 43085)
  assert.equal(rawMagic.find(({ id }) => id === sleepSpell.magicNumber).baseDamage, 64537)
  const opcode = (ip) => [commands[ip].opcode, commands[ip].operands]
  assert.deepEqual(opcode(43086), [0x06, [60, 38783, 0]])
  assert.deepEqual(opcode(43087), [0x2e, [2, 4, 38783]])
  assert.deepEqual(skills.skills.find(({ id }) => id === '303').effects, [
    { kind: 'gate', chance: 60 },
    { kind: 'applyStatus', status: 'sleep', turns: 4 },
  ])
  assert.deepEqual(
    ['enemy-407', 'enemy-399'].map(
      (id) => enemies.find((entry) => entry.id === id).ai.resistanceToSorcery,
    ),
    [0, 10],
  )
  const protection = rawSpells.find(({ id }) => id === 309)
  assert.deepEqual(opcode(protection.scriptOnSuccess), [0x2d, [6, 7, 0]])
  assert.deepEqual(skills.skills.find(({ id }) => id === '309').effects, [
    { kind: 'applyStatus', status: 'protect', turns: 7 },
  ])
  for (const id of ['306', '309']) {
    const rawSpell = rawSpells.find((entry) => entry.id === Number(id))
    const magic = rawMagic.find(({ id }) => id === rawSpell.magicNumber)
    assert.deepEqual(
      [magic.type, magic.effect, magic.xOffset, magic.yOffset, magic.speed, magic.special],
      ['applyToPlayer', 28, 65530, 65518, -1, 99],
    )
    const skill = skills.skills.find((entry) => entry.id === id)
    const { effectSprite, xOffset, yOffset, speed } = skill.animation
    assert.deepEqual(
      [skill.target, effectSprite, xOffset, yOffset, speed],
      ['oneAlly', 28, -6, -18, -1],
    )
  }
  assert.equal(fireSprites.chunks.find(({ chunkIndex }) => chunkIndex === 28).frameCount, 24)
  const signedWord = (word) => (word << 16) >> 16
  for (const [id, source] of Object.entries(spellPaintSources)) {
    const spell = rawSpells.find((entry) => entry.id === Number(id))
    const raw = rawMagic.find((entry) => entry.id === spell.magicNumber)
    assert.deepEqual(
      [raw.type, raw.effect, ...[raw.xOffset, raw.yOffset, raw.special].map(signedWord)],
      [
        source.type ?? (id === '296' ? 'applyToPlayer' : 'normal'),
        source.effect,
        source.x,
        source.y,
        source.layerOffset,
      ],
      `original magic paint inputs: ${id}`,
    )
    assert.equal(
      fireSprites.chunks.find(({ chunkIndex }) => chunkIndex === source.effect).frameCount,
      source.fireFrames,
      `original FIRE frames: ${id}`,
    )
  }
  const sword = rawItems.find(({ id }) => id === 166)
  assert(sword.flags.throwable && sword.flags.consuming && !sword.flags.applyToAll)
  assert.deepEqual(opcode(sword.scriptOnThrow), [0x66, [344, 0, 0]])
  assert.deepEqual(items.find(({ id }) => id === '166').throw.effects, [
    {
      kind: 'magicDamage',
      baseDamage: 198,
      element: 'none',
      strength: {
        kind: 'casterAttack',
        bonus: 0,
        multiplier: { kind: 'uniformInt', min: 0, max: 3 },
      },
    },
  ])
  const rawItem = (id) => rawItems.find((item) => item.id === id)
  const authorItem = (id) => items.find((item) => item.id === String(id))
  for (const [id, ip, cmd, target, effect] of [
    [95, 43024, [0x22, [0, 1, 0]], 'oneAlly', { kind: 'revive', hpPercent: 10 }],
    [104, 39205, [0x1c, [0, 36, 0]], 'oneAlly', { kind: 'healMp', amount: 36 }],
    [145, 39524, [0x1c, [1, 250, 0]], 'allAllies', { kind: 'healMp', amount: 250 }],
  ]) {
    const { flags, scriptOnUse } = rawItem(id)
    assert.equal(scriptOnUse, ip)
    assert(flags.usable && flags.consuming)
    assert.equal(flags.applyToAll, target === 'allAllies')
    assert.deepEqual(opcode(ip), cmd)
    assert.equal(commands[ip + 1].op, 'end')
    assert.deepEqual(authorItem(id).use, { target, consuming: true, effects: [effect] })
  }

  for (const [team, definitions] of [
    [
      80,
      [
        [452, 55, 300, 10, 10],
        [504, 105, 330, 9, 0],
      ],
    ],
    [115, [[406, 9, 310, 0, 0]]],
  ]) {
    const rawTeam = rawTeams.find(({ id }) => id === team)
    assert.deepEqual(
      rawTeam.enemyObjectIndexes.filter((id) => id !== 65535),
      definitions.map(([id]) => id),
    )
    assert.deepEqual(
      rawTeam.enemies.filter((id) => id !== 65535),
      definitions.map(([, id]) => id),
    )
    for (const [object, rawId, hp, poisonRes, sorceryRes] of definitions) {
      const raw = rawEnemies.find(({ id }) => id === rawId)
      const current = enemies.find(({ id }) => id === `enemy-${object}`)
      assert.deepEqual([raw.health, raw.poisonResistance], [hp, poisonRes])
      assert.equal(
        rawEnemyObjects.find(({ objectIndex }) => objectIndex === object).resistanceToSorcery,
        sorceryRes,
      )
      assert.deepEqual(
        [current.stats.health, current.stats.poisonResistance, current.ai.resistanceToSorcery],
        [hp, poisonRes, sorceryRes],
      )
    }
  }

  const fixedMagic = (baseDamage, element) => ({
    kind: 'magicDamage',
    baseDamage,
    element,
    strength: { kind: 'fixed', value: 0 },
  })
  const sentinel = fixedMagic(-999, 'none')
  for (const [id, ip, tail, effects] of [
    [67, 39565, [], [fixedMagic(85, 'wind')]],
    [116, 39356, [[0x28, [0, 552, 0]]], [sentinel, { kind: 'applyPoison', poisonId: '552' }]],
    [
      137,
      39499,
      [[0x5b, [1000, 0, 0]]],
      [
        sentinel,
        {
          kind: 'currentHpDamage',
          numerator: 1,
          denominator: 2,
          bonus: 1,
          cap: 1000,
        },
      ],
    ],
    [
      157,
      39256,
      [
        [0x28, [1, 553, 0]],
        [0x21, [1, 55, 0]],
      ],
      [
        fixedMagic(205, 'poison'),
        { kind: 'applyPoison', poisonId: '553' },
        { kind: 'fixedDamage', amount: 55 },
      ],
    ],
    [
      158,
      39263,
      [[0x39, [180, 0, 0]]],
      [sentinel, { kind: 'damageAndHealCaster', damage: 180, heal: 180 }],
    ],
  ]) {
    const { flags, scriptOnThrow } = rawItem(id)
    const object = throwMagicObjects[id]
    const source = throwPaintSources[object]
    const magicObject = rawObjectMagics.find(({ id }) => id === Number(object))
    const raw = rawMagic.find(({ id }) => id === magicObject.magicNumber)
    const current = authorItem(id).throw
    const animation = current.presentation.animation
    const all = Boolean(source.points)
    assert.equal(scriptOnThrow, ip)
    assert(flags.throwable && flags.consuming)
    assert.equal(flags.applyToAll, all)
    assert.equal(magicObject.flags.applyToAll, all)
    assert.equal(current.target, all ? 'allEnemies' : 'oneEnemy')
    assert.deepEqual(opcode(ip), [0x42, [Number(object), 0, 0]])
    for (const [offset, command] of tail.entries())
      assert.deepEqual(opcode(ip + offset + 1), command)
    assert.equal(commands[ip + tail.length + 1].op, 'end')
    assert.deepEqual(current.effects, effects)
    assert.equal(signedWord(raw.baseDamage), effects[0].baseDamage)
    assert.deepEqual(
      [raw.effect, signedWord(raw.xOffset), signedWord(raw.yOffset), signedWord(raw.special)],
      [source.effect, source.x, source.y, source.layerOffset],
    )
    assert.deepEqual(
      [
        animation.effectSprite,
        animation.xOffset,
        animation.yOffset,
        animation.layerOffset,
        animation.sound,
      ],
      [source.effect, source.x, source.y, source.layerOffset, soundAsset(raw.sound)],
    )
    assert.equal(
      fireSprites.chunks.find(({ chunkIndex }) => chunkIndex === source.effect).frameCount,
      source.fireFrames,
    )
  }
  const sentinelItems = rawItems.filter(({ scriptOnThrow }) => {
    const command = commands[scriptOnThrow]
    return command?.opcode === 0x42 && command.operands.join(',') === '24,0,0'
  })
  assert.equal(sentinelItems.length, 29)
  for (const { id } of sentinelItems) assert.deepEqual(authorItem(id).throw.effects[0], sentinel)
  for (const [id, ip, damage] of [
    [552, 40868, 12],
    [553, 40872, 20],
  ]) {
    assert.equal(rawPoisons.find((poison) => poison.id === id).enemyScript, ip)
    assert.deepEqual(opcode(ip), [0x21, [0, damage, 0]])
    assert.deepEqual(poisons.find((poison) => Number(poison.id) === id).enemyTicks[0], {
      hpDelta: -damage,
    })
  }
  assert.deepEqual(opcode(43085), [0x68, [43089, 0, 0]])
  assert.deepEqual(opcode(43089), [0x06, [70, 43072, 0]])
  assert.equal(commands[43090].to, 'L_39391')
  assert.deepEqual(opcode(39391), [0x2d, [2, 3, 0]])
  assert.deepEqual(opcode(39392), [0x1b, [0, 65535, 0]])
  assert.deepEqual(skills.skills.find(({ id }) => id === '303').execution.enemy.effects, [
    { kind: 'gate', chance: 70 },
    { kind: 'applyStatus', status: 'sleep', turns: 3 },
    { kind: 'resourceDelta', resource: 'hp', delta: -1 },
  ])
  const poison = rawPoisons.find(({ id }) => id === 551)
  assert.deepEqual(opcode(poison.playerScript), [0x1b, [0, 65529, 0]])
  assert.equal(commands[poison.playerScript + 1].op, 'end')
  assert.deepEqual(poisons.find(({ id }) => id === 551).playerTicks, [{ hpDelta: -7 }])
  for (const [id, operation, effect] of [
    [117, 0x29, 'applyPoison'],
    [87, 0x2b, 'curePoison'],
  ]) {
    const rawItem = rawItems.find((entry) => entry.id === id)
    assert.deepEqual(opcode(rawItem.scriptOnUse), [operation, [0, 551, 0]])
    assert.equal(rawItem.flags.consuming, true)
    assert.equal(rawItem.flags.applyToAll, false)
    assert.deepEqual(items.find((entry) => entry.id === String(id)).use, {
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: effect, poisonId: '551' }],
    })
  }
  await Promise.all([
    verifyAudioSources(root, assetIndex),
    verifyPaintFireSources(root, assetIndex),
  ])
  return {
    enemy: 'enemy-399',
    hp: 30,
    exp: 1,
    cash: 3,
    herb: '99',
    healing: 50,
    cure: '296',
    cureMP: 6,
    mechanismTeams: [...Object.values(mechanismEnemies).map(({ team }) => team), 116, 62],
    sleep: '303',
    poison: 551,
    antidote: '87',
    itemEffects: { teams: [1, 3, 80, 115], rawZeroDamageThrows: sentinelItems.length },
    audioAssets: Object.keys(soundFrames).length,
  }
}
