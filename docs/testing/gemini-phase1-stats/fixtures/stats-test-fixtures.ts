import type {
  BattleField,
  Enemy,
  Item,
  ItemFlags,
  ObjectPoisonView,
  PlayerRole,
  PlayerRoles,
} from '@type-pal/shared'
import type {
  BattleEnemy,
  BattlePlayer,
  BattleStatus,
} from '../../../../packages/game/src/core/battle/battle-state.js'
import {
  createInitialEquipmentEffect,
  createInitialGameState,
  type GameState,
} from '../../../../packages/game/src/core/game-state.js'

export function makeFreshGameState(): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0]
  gs.rgEquipmentEffect = createInitialEquipmentEffect()

  // 6 个角色的基础属性默认填充
  gs.PlayerRolesRuntime.rgwLevel = [10, 12, 15, 14, 8, 16]
  gs.PlayerRolesRuntime.rgwMaxHP = [100, 120, 150, 140, 90, 160]
  gs.PlayerRolesRuntime.rgwMaxMP = [50, 60, 40, 80, 70, 50]
  gs.PlayerRolesRuntime.rgwHP = [100, 120, 150, 140, 90, 160]
  gs.PlayerRolesRuntime.rgwMP = [50, 60, 40, 80, 70, 50]
  gs.PlayerRolesRuntime.rgwAttackStrength = [30, 25, 45, 20, 15, 35]
  gs.PlayerRolesRuntime.rgwMagicStrength = [20, 40, 10, 50, 30, 25]
  gs.PlayerRolesRuntime.rgwDefense = [15, 12, 25, 14, 10, 18]
  gs.PlayerRolesRuntime.rgwDexterity = [18, 16, 22, 14, 25, 20]
  gs.PlayerRolesRuntime.rgwFleeRate = [10, 8, 12, 6, 15, 9]
  gs.PlayerRolesRuntime.rgwPoisonResistance = [5, 10, 0, 20, 15, 5]
  gs.PlayerRolesRuntime.rgwElementalResistance = [
    [5, 0, 0, 0, 0, 0], // 风
    [0, 5, 0, 0, 0, 0], // 雷
    [0, 0, 5, 0, 0, 0], // 水
    [0, 0, 0, 5, 0, 0], // 火
    [0, 0, 0, 0, 5, 0], // 土
  ]

  for (let role = 0; role < 6; role++) {
    gs.rgPlayerStatus[role] = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  }

  return gs
}

export function makePlayerRole(overrides?: Partial<PlayerRole>): PlayerRole {
  return {
    id: 0,
    _name: '李逍遥',
    avatar: 1,
    spriteNumInBattle: 1,
    spriteNum: 1,
    name: 36,
    attackAll: 0,
    level: 10,
    maxHP: 100,
    maxMP: 50,
    hp: 100,
    mp: 50,
    attackStrength: 30,
    magicStrength: 20,
    defense: 15,
    dexterity: 18,
    fleeRate: 10,
    poisonResistance: 5,
    elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 3,
    attackSound: -1,
    weaponSound: -1,
    criticalSound: -1,
    magicSound: -1,
    deathSound: -1,
    ...overrides,
  }
}

export function makePlayerRoles(rolesList?: PlayerRole[]): PlayerRoles {
  return {
    roles: rolesList ?? [
      makePlayerRole({ id: 0, _name: '李逍遥' }),
      makePlayerRole({ id: 1, _name: '赵灵儿' }),
      makePlayerRole({ id: 2, _name: '林月如' }),
      makePlayerRole({ id: 3, _name: '巫后' }),
      makePlayerRole({ id: 4, _name: '阿奴' }),
      makePlayerRole({ id: 5, _name: '盖罗娇' }),
    ],
  }
}

export function makeEnemy(overrides?: Partial<Enemy>): Enemy {
  return {
    id: 100,
    _name: '苗兵',
    idleFrames: 2,
    magicFrames: 2,
    attackFrames: 2,
    idleAnimSpeed: 2,
    actWaitFrames: 4,
    yPosOffset: 0,
    attackSound: 0,
    actionSound: 0,
    magicSound: 0,
    deathSound: 0,
    callSound: 0,
    health: 60,
    exp: 25,
    cash: 18,
    level: 4,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 22,
    magicStrength: 10,
    defense: 12,
    dexterity: 14,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 2,
    dualMove: 0,
    collectValue: 0,
    ...overrides,
  }
}

export function makeBattleStatus(overrides?: Partial<BattleStatus>): BattleStatus {
  return {
    sleep: 0,
    paralyzed: 0,
    confused: 0,
    haste: 0,
    slow: 0,
    silence: 0,
    puppet: 0,
    bravery: 0,
    protect: 0,
    dualAttack: 0,
    ...overrides,
  }
}

export function makeBattlePlayer(overrides?: Partial<BattlePlayer>): BattlePlayer {
  return {
    roleId: 0,
    prevHp: 100,
    prevMp: 50,
    defending: false,
    status: makeBattleStatus(),
    ...overrides,
  }
}

export function makeBattleEnemy(overrides?: Partial<BattleEnemy>): BattleEnemy {
  return {
    e: makeEnemy(),
    status: makeBattleStatus(),
    prevHp: 60,
    maxHealth: 60,
    defeated: false,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
    resistanceToSorcery: 0,
    poisons: [],
    ...overrides,
  }
}

export function makeBattleField(overrides?: Partial<BattleField>): BattleField {
  return {
    id: 1,
    screenWave: 0,
    magicEffect: {
      wind: 0,
      thunder: 0,
      water: 0,
      fire: 0,
      earth: 0,
    },
    ...overrides,
  }
}

export function makeItemFlags(overrides?: Partial<ItemFlags>): ItemFlags {
  return {
    usable: false,
    equipable: true,
    throwable: false,
    consuming: false,
    applyToAll: false,
    sellable: true,
    equipableBy: [true, true, true, true, true, true],
    ...overrides,
  }
}

export function makeItem(overrides?: Partial<Item>): Item {
  return {
    id: 100,
    _name: '测试装备',
    bitmap: 1,
    price: 100,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: makeItemFlags(),
    ...overrides,
  }
}

export function makeObjectPoison(overrides?: Partial<ObjectPoisonView>): ObjectPoisonView {
  return {
    id: 550,
    level: 1,
    color: 0,
    playerScript: 0,
    enemyScript: 0,
    ...overrides,
  }
}
