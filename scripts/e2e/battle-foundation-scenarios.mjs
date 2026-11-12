import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const roles = {
  'li-xiaoyao': 0,
  'wu-hou': 3,
  anu: 4,
}
const random = { algorithm: 'mulberry32', seed: 1729 }
const copy = (value) => structuredClone(value)

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
    players: members.map(({ id, hp, maxHP, level }, slot) => ({
      id,
      slot,
      hp,
      maxHP,
      mp: 100,
      maxMP: 100,
      level,
      exp: 0,
      statuses: {},
    })),
    enemies: Array.from({ length: 5 }, (_, slot) =>
      enemies[slot]
        ? {
            ...enemies[slot],
            hp: enemyHP,
            maxHP: enemyHP,
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
          members.map(({ id, hp, maxHP, level, attack, defense, speed }) => [
            roles[id],
            {
              level,
              hp,
              maxHP,
              mp: 100,
              maxMP: 100,
              attackStrength: attack,
              defense,
              magicStrength: 50,
              dexterity: speed,
              fleeRate: 30,
            },
          ]),
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
          members: members.map(({ id: actorId, hp, maxHP, level, attack, defense, speed }) => ({
            actorId,
            stats: {
              level,
              maxHP,
              maxMP: 100,
              attack,
              defense,
              magicAttack: 50,
              speed,
              luck: 30,
            },
            equipment: {},
            skills: { kind: 'replace', ids: [] },
            hp: { kind: 'value', value: hp },
            mp: { kind: 'full' },
          })),
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

const mechanismEnemies = {
  lantern: { id: 'lantern-a', team: 1, object: 399, raw: 2, hp: 30, exp: 1, cash: 3 },
  weasel: { id: 'sickle-weasel', team: 294, object: 414, raw: 17, hp: 710, exp: 110, cash: 220 },
  tree: { id: 'half-tree-demon', team: 204, object: 507, raw: 108, hp: 800, exp: 135, cash: 60 },
  worm: { id: 'bloodworm', team: 115, object: 406, raw: 9, hp: 310, exp: 14, cash: 9 },
}
const hero = 'li-xiaoyao'
const anu = 'anu'
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
  const scenario = defineSetup({
    id,
    title,
    seed,
    members,
    inventory,
    team: enemy.team,
    enemyHP: enemy.hp,
    enemies: [{ id: enemy.id, slot: 0, templateId: `enemy-${enemy.object}` }],
  })
  const state = copy(scenario.expected.start)
  const actions = []
  const rounds = []
  const step = (command, apply = keepState, facts = {}) => {
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
      player.statuses = {}
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

const soundAsset = (id) => `sound.pal.${String(id).padStart(3, '0')}`
const rawSoundPath = (id) => `data/extracted/sounds/${id}.wav`
const projectSoundPath = (id) => `assets/migrated/sounds/${String(id).padStart(3, '0')}.wav`
const soundFrames = {
  1: 4869,
  2: 5075,
  4: 11775,
  8: 6045,
  9: 6982,
  15: 12200,
  19: 7695,
  23: 13351,
  28: 13408,
  32: 20700,
  37: 4102,
  38: 12378,
  40: 5869,
  50: 14593,
  92: 6983,
  94: 3121,
  126: 10165,
  138: 41746,
  169: 36112,
  185: 6605,
  216: 27640,
  247: 35018,
  265: 9627,
  352: 9077,
  357: 8958,
  368: 6370,
  369: 3514,
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
}

function attachAudioOracle(scenario) {
  const byAction = audioCues[scenario.id]
  assert.equal(byAction?.length, scenario.expected.actions.length, `audio actions: ${scenario.id}`)
  scenario.expected.audioCues = byAction.flatMap((cues, actionIndex) =>
    cues.map(([kind, id]) => ({ actionIndex, kind, assetId: soundAsset(id) })),
  )
  scenario.expected.audioSourceFrames = Object.fromEntries(
    byAction.flatMap((cues) => cues.map(([, id]) => [soundAsset(id), soundFrames[id]])),
  )
  return scenario
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
  ].map(attachAudioOracle),
)

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

/** Bind the raw/author JSON, face pixels and WAVs used by the independent comparisons. */
export async function battleFoundationInputSources(root) {
  const paths = [
    'data/extracted/images/ui/frame-48.png',
    'projects/pal/assets/migrated/faces/li-xiaoyao.png',
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
    events,
    skills,
    rawItems,
    rawPoisons,
    poisons,
    assetIndex,
    rawRoles,
    actors,
  ] = await Promise.all([
    json('data/extracted/data/enemy-teams.json'),
    json('data/extracted/data/enemies.json'),
    json('projects/pal/content/enemies.json'),
    json('projects/pal/content/enemy-teams.json'),
    json('projects/pal/content/items.json'),
    json('data/extracted/data/spells.json'),
    json('data/extracted/data/magic.json'),
    json('data/extracted/events/all.json'),
    json('projects/pal/content/skills.json'),
    json('data/extracted/data/items.json'),
    json('data/extracted/data/object-poisons.json'),
    json('projects/pal/content/poisons.json'),
    json('projects/pal/assets/index.json'),
    json('data/extracted/data/player-roles.json'),
    json('projects/pal/content/actors.json'),
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
  const weaselSpell = rawSpells.find(({ id }) => id === 339)
  assert.equal(weaselSpell.flags.applyToAll, false)
  assert.deepEqual([weaselSpell.scriptOnUse, weaselSpell.scriptOnSuccess], [0, 0])
  const weaselMagic = rawMagic.find(({ id }) => id === weaselSpell.magicNumber)
  assert.deepEqual([weaselMagic.baseDamage, weaselMagic.elemental], [150, 0])
  assert.deepEqual(skills.skills.find(({ id }) => id === '339').effects, [
    { kind: 'damage', power: 150, elemental: 0 },
  ])
  const sleepSpell = rawSpells.find(({ id }) => id === 303)
  assert.equal(sleepSpell.scriptOnSuccess, 43085)
  assert.equal(rawMagic.find(({ id }) => id === sleepSpell.magicNumber).baseDamage, 64537)
  const opcode = (ip) => [commands[ip].opcode, commands[ip].operands]
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
  await verifyAudioSources(root, assetIndex)
  return {
    enemy: 'enemy-399',
    hp: 30,
    exp: 1,
    cash: 3,
    herb: '99',
    healing: 50,
    cure: '296',
    cureMP: 6,
    mechanismTeams: Object.values(mechanismEnemies).map(({ team }) => team),
    sleep: '303',
    poison: 551,
    antidote: '87',
    audioAssets: Object.keys(soundFrames).length,
  }
}
