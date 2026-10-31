import type { PlayerRole } from '@type-pal/shared'
import {
  makeBattleFieldRecord,
  makeBattleSpellRecord,
  makeEnemyRecord,
  makeRoleRecord,
} from '../../__tests__/battle-records.js'
import { createCommandBus } from '../command-bus.js'
import {
  createInitialGameState,
  loadDefaultGame,
  projectRuntimeToBattleRoles,
} from '../game-state.js'
import { getBattleResources } from './battle-runtime-context.js'
import { type StartBattleInput, startBattle } from './battle-system.js'

/** 测试端的资源准备,不替代任何phase、脚本、奖励或恢复算法。 */
export type BattleLifecycleFixtureOptions = Partial<
  Pick<StartBattleInput, 'commands' | 'levelUpMagic' | 'isBoss' | 'enemyObjects'>
> & {
  partyMembers?: number[]
  role?: Partial<PlayerRole>
  enemyIds?: number[]
  scriptOnTurnStart?: number
  scriptOnBattleEnd?: number
  expGained?: number
  cashGained?: number
}

/** 正式新游戏初始化→投影→开战。返回真实preBattle状态,不偷偷置won或杀敌。 */
export function createBattleLifecycleFixture(options: BattleLifecycleFixtureOptions = {}) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  const baseline = {
    roles: Array.from({ length: 6 }, (_, id) =>
      makeRoleRecord(id, { hp: 300, mp: 10, ...options.role }),
    ),
  }
  loadDefaultGame(gs, baseline)
  gs.partyMembers = options.partyMembers ?? [0]
  const playerRoles = projectRuntimeToBattleRoles(
    gs.PlayerRolesRuntime,
    baseline,
    gs.rgEquipmentEffect,
  )
  const enemyIds = options.enemyIds ?? [100]
  startBattle({
    gs,
    enemyTeamId: 0,
    battleFieldId: 0,
    isBoss: options.isBoss ?? false,
    enemyTeams: [
      {
        id: 0,
        enemies: [
          enemyIds[0] ?? 0xffff,
          enemyIds[1] ?? 0xffff,
          enemyIds[2] ?? 0xffff,
          enemyIds[3] ?? 0xffff,
          enemyIds[4] ?? 0xffff,
        ],
      },
    ],
    enemies: enemyIds.map((id) =>
      makeEnemyRecord({
        id,
        collectValue: 7,
        exp: options.expGained ?? 1,
        cash: options.cashGained ?? 50,
      }),
    ),
    enemyObjects:
      options.enemyObjects ??
      enemyIds.map((id) => ({
        objectIndex: id,
        enemyId: id,
        resistanceToSorcery: 0,
        scriptOnTurnStart: options.scriptOnTurnStart ?? 0,
        scriptOnReady: 0,
        scriptOnBattleEnd: options.scriptOnBattleEnd ?? 0,
      })),
    battleFields: [makeBattleFieldRecord()],
    playerRoles,
    items: [],
    spells: [makeBattleSpellRecord(349, '天师符法'), makeBattleSpellRecord(350, '五气朝元')],
    magics: [],
    commands: options.commands ?? [{ op: 'end', label: 'L_0' }],
    levelUpExp: Array<number>(100).fill(100),
    levelUpMagic: options.levelUpMagic,
    rngSeed: 7,
  })
  const state = gs.battleState
  const resources = getBattleResources(gs)
  if (!state || !resources) throw new Error('startBattle must install state and resources')
  gs.fAutoBattle = true
  return { gs, state, resources, playerRoles, bus: createCommandBus() }
}
