import type { Enemy, Item, PlayerRole, PlayerRoles } from '@type-pal/shared'
import type {
  BattleEnemy,
  BattlePlayer,
  BattleState,
} from '../../../../core/battle/battle-state.js'
import { createInitialGameState, type GameState } from '../../../../core/game-state.js'
import { createSeedableRng } from '../../../../core/rng.js'
import type { BattleBgAsset } from '../../../battle/draw-battle-bg.js'

export function role(id: number, patch: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id,
    _name: `角${id}`,
    avatar: 0,
    spriteNumInBattle: id + 1,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
    level: 10,
    maxHP: 200,
    maxMP: 30,
    hp: 200,
    mp: 10,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 30,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 3,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
    ...patch,
  }
}

export function rolesOf(list: PlayerRole[]): PlayerRoles {
  return { roles: list }
}

export function enemy(id: number, health = 50): Enemy {
  return {
    id,
    _name: '敌',
    idleFrames: 0,
    magicFrames: 0,
    attackFrames: 0,
    idleAnimSpeed: 0,
    actWaitFrames: 0,
    yPosOffset: 0,
    attackSound: 0,
    actionSound: 0,
    magicSound: 0,
    deathSound: 0,
    callSound: 0,
    health,
    exp: 1,
    cash: 1,
    level: 1,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 1,
    fleeRate: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1,
    dualMove: 0,
    collectValue: 0,
  }
}

export function battlePlayer(roleId: number): BattlePlayer {
  return {
    roleId,
    prevHp: 200,
    prevMp: 30,
    defending: false,
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
  }
}

export function battleEnemy(source: Enemy): BattleEnemy {
  return {
    e: { ...source },
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
    prevHp: source.health,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
  }
}

export function battleState(
  players: BattlePlayer[],
  enemies: BattleEnemy[],
  patch: Partial<BattleState> = {},
): BattleState {
  return {
    players,
    enemies,
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
    phase: 'selectAction',
    turn: 1,
    selectionStartedForTurn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'hidden',
    menuState: 'main',
    selectedAction: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    uiCursor: 0,
    selectingPlayerIdx: 0,
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
    ...patch,
  }
}

export function battleGs(patch: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState({ x: 0, y: 0, facing: 'down' }),
    mode: 'battle',
    ...patch,
  }
}

export function solidBg(fill: number): BattleBgAsset {
  return { width: 320, height: 200, indices: new Uint8Array(320 * 200).fill(fill) }
}

export function item(id: number): Item {
  return {
    id,
    _name: `物${id}`,
    bitmap: 1,
    price: 1,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: true,
      equipable: false,
      throwable: true,
      consuming: true,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
  }
}

/** 绘制不该偷改的战斗公开状态。 */
export function battleView(state: BattleState) {
  return {
    uiState: state.uiState,
    menuState: state.menuState,
    turn: state.turn,
    selectingPlayerIdx: state.selectingPlayerIdx,
    selectedAction: state.selectedAction,
    introFade: state.introFade ? { ...state.introFade } : null,
    settlementIndex: state.settlement?.index ?? null,
    magicCursor: state.magicSelect?.cursor ?? null,
    itemCursor: state.itemSelect?.cursor ?? null,
    players: state.players.map((player) => ({
      roleId: player.roleId,
      status: { ...player.status },
    })),
    enemies: state.enemies.map((entry) => ({ id: entry.e.id, health: entry.e.health })),
    summonStep: state.battleAnim?.summon?.fadeStep ?? null,
    summonFrame: state.battleAnim?.summon?.frame ?? null,
  }
}
