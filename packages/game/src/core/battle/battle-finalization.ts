import { removeEquipmentEffect } from '../equip-effect.js'
import { curePlayerPoisonByLevel } from '../event-system.js'
import {
  type BattleOutcome,
  type GameState,
  resumePostBattleScript,
  writeBackBattleRolesToRuntime,
} from '../game-state.js'
import type { BattleResources } from './battle-runtime-context.js'
import { clearBattleRuntimeContext } from './battle-runtime-context.js'
import type { BattleState } from './battle-state.js'

/** lost / fled / watchdog 终态写回；胜利由结算 owner 完成后调用公共 cleanup。 */
export function finalizeBattle(
  gs: GameState,
  state: BattleState,
  resources: BattleResources,
  forced: boolean,
): void {
  state.battleDialogQueue = undefined

  // 战败不伪复活；HP/MP 先回写，真正恢复由死亡脚本的 0x4E 读档完成。
  writeBackBattleRolesToRuntime(resources.playerRoles, gs.PlayerRolesRuntime, gs.partyMembers)
  finalizeBattleCleanup(
    gs,
    forced
      ? 'won'
      : state.phase === 'lost'
        ? 'lost'
        : state.terminatedByEnemyEscape
          ? 'terminated'
          : 'fled',
  )
}

/** won/lost/fled/watchdog 共用的战斗资源释放与事件脚本接回顺序。 */
export function finalizeBattleCleanup(gs: GameState, outcome: BattleOutcome): void {
  // battle.c:1822-1830：≤999 的临时状态战后清除，装备授予的 >999 状态保留。
  for (const row of Object.values(gs.rgPlayerStatus)) {
    for (let i = 0; i < row.length; i++) {
      if ((row[i] ?? 0) <= 999) row[i] = 0
    }
  }

  // PAL_CurePoisonByLevel(...,3) + kBodyPartExtra，清持久毒和本场临时装备效果。
  const kBodyPartExtra = 6
  for (const roleId of gs.partyMembers) {
    curePlayerPoisonByLevel(gs, roleId, 3)
    removeEquipmentEffect(gs, roleId, kBodyPartExtra)
  }

  gs.fAutoBattle = false
  gs.dialogBox = undefined
  gs.dialogBoxKept = undefined
  gs.shakeTime = 0
  gs.shakeLevel = 0

  // battle.c:1853-1855：恢复进战斗前的屏波，而不是归零或保留战场波。
  gs.wScreenWave = gs.battleState?.prevWaveLevel ?? 0
  gs.sWaveProgression = gs.battleState?.prevWaveProgression ?? 0
  gs.mode = 'explore'
  gs.battleState = undefined
  clearBattleRuntimeContext(gs)

  // 0x07 触发的战斗在所有资源释放后接回触发脚本；dev/无 resume 场景保持 explore。
  resumePostBattleScript(gs, outcome)
}
