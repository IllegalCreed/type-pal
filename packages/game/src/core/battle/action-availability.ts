import type { PlayerRoles } from '@type-pal/shared'
import type { BattleState } from './battle-state.js'
import { isPlayerHealthy } from './player-condition.js'

/**
 * port sdlpal `PAL_BattleUIIsActionValid`(uibattle.c:271-341,PAL_CLASSIC 分支):
 *   有效队员上下文内，0攻击/3杂项 → 恒 valid;1法术 → 非 silence;2合击 → 本人 healthy 且 healthy 人数 > 1。
 */
export function isBattleActionValid(
  state: Pick<BattleState, 'selectingPlayerIdx' | 'players'>,
  action: number,
  playerRoles: PlayerRoles,
): boolean {
  const playerIdx = state.selectingPlayerIdx
  if (playerIdx === undefined) return false
  const player = state.players[playerIdx]
  const role = player ? playerRoles.roles[player.roleId] : undefined
  if (!player || !role) return false
  switch (action) {
    case 0:
    case 3:
      return true
    case 1: // magic — silence 时不可
      return (player.status.silence ?? 0) === 0
    case 2: {
      // coopmagic(CLASSIC):本人 healthy 且 healthy 人数 > 1
      if (state.players.length <= 1) return false // wMaxPartyMemberIndex==0
      let healthy = 0
      state.players.forEach((p) => {
        const r = playerRoles.roles[p.roleId]
        if (r && isPlayerHealthy(r, p.status)) healthy++
      })
      return isPlayerHealthy(role, player.status) && healthy > 1
    }
    default:
      return true
  }
}
