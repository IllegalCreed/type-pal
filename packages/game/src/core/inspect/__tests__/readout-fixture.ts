// Fresh projection inputs. These synthetic name/script tables are not original-resource or script-execution claims.
import type { Enemy, Item, ObjectPoisonView, PlayerRoles } from '@type-pal/shared'
import {
  makeEnemyRecord as makeEnemy,
  makeRoleRecord as makeRole,
} from '../../../__tests__/battle-records.js'
import { makeBattle } from '../../../__tests__/coverage85-glm-game/harness.js'
import type { BattleState } from '../../battle/battle-state.js'
import {
  createInitialGameState,
  type GameState,
  hydratePlayerRolesRuntime,
} from '../../game-state.js'
import { createSeedableRng } from '../../rng.js'
export const POISON_ID = 551
export const inspectionPoisons: ObjectPoisonView[] = [
  { id: POISON_ID, level: 3, color: 0, playerScript: 0, enemyScript: 4242 },
]
export const inspectionNames: readonly Item[] = [
  {
    id: POISON_ID,
    _name: '毒蛇卵',
    bitmap: 0,
    price: 0,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
  },
]
export function makeBattleReadoutState(enemy: Partial<Enemy> = {}): GameState {
  const { gs, state, playerRoles } = makeBattle({
    roles: [
      makeRole(0, {
        _name: '李逍遥',
        level: 10,
        hp: 100,
        maxHP: 120,
        mp: 50,
        maxMP: 60,
        attackStrength: 30,
        magicStrength: 40,
        defense: 12,
        dexterity: 18,
        fleeRate: 7,
        poisonResistance: 8,
      }),
    ],
    enemies: [
      makeEnemy({
        id: 100,
        _name: '飞贼',
        health: 42,
        level: 3,
        attackStrength: 10,
        magicStrength: 0,
        defense: 5,
        dexterity: 8,
        fleeRate: 1,
        exp: 20,
        cash: 15,
        physicalResistance: 0,
        ...enemy,
      }),
    ],
  })
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, playerRoles)
  gs.mode = 'battle'
  gs.PlayerRolesRuntime.rgwElementalResistance[0]![0] = 5
  gs.PlayerRolesRuntime.rgwElementalResistance[2]![0] = 5
  gs.PlayerRolesRuntime.rgwElementalResistance[4]![0] = 5
  gs.Exp.rgPrimaryExp[0]!.wExp = 250
  for (const key of [
    'rgAttackExp',
    'rgMagicPowerExp',
    'rgDefenseExp',
    'rgDexterityExp',
    'rgFleeExp',
  ] as const)
    gs.Exp[key][0]!.wLevel = 10
  state.players[0]!.status.dualAttack = 32760
  state.players[0]!.status.sleep = 3
  state.enemies[0]!.maxHealth = 60
  state.enemies[0]!.prevHp = 60
  state.field = {
    id: 7,
    screenWave: 0,
    magicEffect: { wind: 1, thunder: 0, water: 0, fire: -2, earth: 0 },
  }
  return gs
}
export const makeExploreState = (): GameState =>
  createInitialGameState({ x: 0, y: 0, facing: 'down' })
export function makeInspectionRoles(): PlayerRoles {
  return {
    roles: [
      makeRole(0, {
        _name: '李逍遥',
        maxHP: 120,
        maxMP: 60,
        hp: 100,
        mp: 50,
        attackStrength: 30,
        magicStrength: 40,
        defense: 12,
        dexterity: 18,
        fleeRate: 7,
        poisonResistance: 8,
        walkFrames: 3,
      }),
      makeRole(1, {
        _name: '赵灵儿',
        level: 9,
        maxHP: 90,
        maxMP: 80,
        hp: 88,
        mp: 70,
        attackStrength: 20,
        magicStrength: 50,
        defense: 10,
        dexterity: 22,
        fleeRate: 6,
        poisonResistance: 4,
        walkFrames: 3,
      }),
    ],
  }
}
// Typed projection state; tests deliberately exercise missing battle slots without claiming normal startBattle output.
export function makeInspectionBattle(
  players: BattleState['players'],
  enemies: BattleState['enemies'],
  isBoss: boolean,
): BattleState {
  return {
    players,
    enemies,
    field: {
      id: 7,
      screenWave: 2,
      magicEffect: { wind: 1, thunder: 0, water: 0, fire: -2, earth: 0 },
    },
    isBoss,
    phase: 'selectAction',
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'wait',
    menuState: 'main',
    selectedAction: 0,
    uiCursor: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
  }
}
export const ZERO_STATUS = { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 }
export function makeSingleEnemyBattle(
  enemyOverrides: Partial<Enemy>,
  runtimeOverrides?: Omit<Partial<BattleState['enemies'][number]>, 'status'> & {
    status?: Partial<BattleState['enemies'][number]['status']>
  },
) {
  const enemy = makeEnemy({
    id: 100,
    _name: '飞贼',
    idleFrames: 3,
    magicFrames: 2,
    attackFrames: 3,
    idleAnimSpeed: 6,
    health: 42,
    exp: 20,
    cash: 15,
    level: 3,
    attackStrength: 10,
    magicStrength: 0,
    defense: 5,
    dexterity: 8,
    fleeRate: 1,
    physicalResistance: 0,
    ...enemyOverrides,
  })
  const { status, ...rest } = runtimeOverrides ?? {}
  return makeInspectionBattle(
    [{ roleId: 0, prevHp: 100, prevMp: 50, defending: false, status: { ...ZERO_STATUS } }],
    [
      {
        e: enemy,
        status: { ...ZERO_STATUS, ...status },
        prevHp: 42,
        scriptOnTurnStart: 0,
        scriptOnBattleEnd: 0,
        scriptOnReady: 0,
        poisons: [],
        resistanceToSorcery: 4,
        ...rest,
      },
    ],
    false,
  )
}
export function makeInspectionState(battle?: BattleState) {
  const gs = createInitialGameState({ x: 100, y: 200, facing: 'down' })
  gs.partyMembers = [0, 1]
  const runtime = gs.PlayerRolesRuntime
  runtime.rgwLevel[0] = 10
  runtime.rgwLevel[1] = 9
  runtime.rgwHP[0] = 100
  runtime.rgwMaxHP[0] = 120
  runtime.rgwMP[0] = 50
  runtime.rgwMaxMP[0] = 60
  runtime.rgwHP[1] = 88
  runtime.rgwMaxHP[1] = 90
  runtime.rgwMP[1] = 70
  runtime.rgwMaxMP[1] = 80
  runtime.rgwElementalResistance[0]![0] = 5
  runtime.rgwPoisonResistance[0] = 8
  gs.Exp.rgPrimaryExp[0]!.wExp = 250
  gs.Exp.rgAttackExp[0]!.wExp = 40
  gs.Exp.rgAttackExp[0]!.wLevel = 3
  gs.Exp.rgAttackExp[0]!.wCount = 12
  if (battle) {
    gs.mode = 'battle'
    gs.battleState = battle
  }
  return gs
}
