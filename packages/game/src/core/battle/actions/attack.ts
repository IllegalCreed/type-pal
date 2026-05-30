/**
 * 物理攻击 perform —— M3 T19。
 *
 * 三向路径(implementer verify sdlpal 真值):
 *   - player → enemy   from `reference/sdlpal/fight.c:3625-3635` —— PAL_BattlePlayerPerformAction kBattleActionAttack
 *     str = PAL_GetPlayerAttackStrength(role)  (M3 简化:role.attackStrength as SHORT + (level+6)*6)
 *     def = enemy.wDefense (SHORT) + (level+6)*4
 *     res = enemy.wPhysicalResistance
 *   - enemy → player   from `reference/sdlpal/fight.c:4917-4927` —— PAL_BattleEnemyPerformAction physical
 *     str = (SHORT)enemy.wAttackStrength + (level+6)*6  (str<0 → str=0)
 *     def = PAL_GetPlayerDefense(role)  (M3 简化:role.defense as SHORT + (level+6)*4)
 *     if (player.fDefending) def *= 2
 *     res = 2 (sdlpal 硬编码 2,见 fight.c:4934)
 *
 * 公式都走 calcPhysicalAttackDamage(str, def, res),damage<=0 → damage=1。
 *
 * 注:sdlpal player→enemy 还有 `sDamage += RandomLong(1, 2)`(fight.c:3641)
 *      和 crit / coop 系数,M3 简化为不加 rng jitter / 无 crit。
 */

import type { Enemy, PlayerRoles } from '@type-pal/shared'
import type { CommandBus } from '../../command-bus.js'
import type { BattleState } from '../battle-state.js'
import { calcPhysicalAttackDamage } from '../formulas.js'
import type { ActionQueueItem } from '../turn-queue.js'

/** SHORT cast(同 formulas.ts 私函)。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

/**
 * 执行一次物理攻击(actor 攻击 targetIdx),写回 HP + emit Present 命令。
 *
 * @param state 战斗状态(target HP 会被改)
 * @param actor 当前行动者(isEnemy + idx)
 * @param targetIdx 目标在 players[] 或 enemies[] 的索引(isEnemy 决定语义)
 * @param bus Present 命令通道
 * @param playerRoles PlayerRoles(target/actor 是 player 时去这里查 hp)
 */
export function performAttack(
  state: BattleState,
  actor: ActionQueueItem,
  targetIdx: number,
  bus: CommandBus,
  playerRoles: PlayerRoles,
): void {
  // —— 算 str ——
  let str: number
  let casterLevel: number
  if (actor.isEnemy) {
    const enemy: Enemy = state.enemies[actor.idx]!.e
    str = asShort(enemy.attackStrength) + (enemy.level + 6) * 6
    casterLevel = enemy.level
    if (str < 0)
      str = 0 // sdlpal fight.c:4920
  }
  else {
    const role = playerRoles.roles[state.players[actor.idx]!.roleId]!
    str = asShort(role.attackStrength) + (role.level + 6) * 6
    casterLevel = role.level
  }
  void casterLevel

  // —— 群攻(attackAll 武器):player 且 targetIdx<0(=-1 全体)→ 全体活敌 ——
  // sdlpal kBattleActionAttack sTarget==-1 分支(fight.c:3756+)。每敌独立算 def/res。
  if (!actor.isEnemy && targetIdx < 0) {
    state.enemies.forEach((be) => {
      if (be.e.health <= 0)
        return
      const def = asShort(be.e.defense) + (be.e.level + 6) * 4
      let damage = calcPhysicalAttackDamage(str, def, be.e.physicalResistance)
      if (damage <= 0)
        damage = 1
      be.e.health = Math.max(0, be.e.health - damage)
      bus.emit({ op: 'showDamageNum', x: 0, y: 0, value: damage, color: 'yellow' })
    })
    bus.emit({ op: 'playPlayerAttack', playerIdx: actor.idx, targetEnemyIdx: -1 })
    return
  }

  // —— 算 def + 选择 target HP 句柄 + physRes ——
  let def: number
  let physRes: number
  let isPlayerTarget: boolean

  if (actor.isEnemy) {
    // enemy 攻击 player
    const role = playerRoles.roles[state.players[targetIdx]!.roleId]!
    def = asShort(role.defense) + (role.level + 6) * 4
    if (state.players[targetIdx]!.defending) {
      def *= 2 // sdlpal fight.c:4926 fDefending → def *= 2(不是 dmg /= 2)
    }
    physRes = 2 // sdlpal fight.c:4934 enemy→player 硬编码 res=2
    isPlayerTarget = true
  }
  else {
    // player 攻击 enemy
    const enemy = state.enemies[targetIdx]!.e
    def = asShort(enemy.defense) + (enemy.level + 6) * 4
    physRes = enemy.physicalResistance
    isPlayerTarget = false
  }

  // —— 算 damage ——
  let damage = calcPhysicalAttackDamage(str, def, physRes)
  if (damage <= 0)
    damage = 1 // sdlpal fight.c:3829 / 4943 sDamage<=0 → sDamage=1

  // —— 写回 HP ——
  if (isPlayerTarget) {
    const role = playerRoles.roles[state.players[targetIdx]!.roleId]!
    role.hp = Math.max(0, role.hp - damage)
  }
  else {
    state.enemies[targetIdx]!.e.health = Math.max(0, state.enemies[targetIdx]!.e.health - damage)
  }

  // —— emit 命令 ——
  if (actor.isEnemy) {
    bus.emit({ op: 'playEnemyAttack', enemyIdx: actor.idx, targetPlayerIdx: targetIdx })
  }
  else {
    bus.emit({ op: 'playPlayerAttack', playerIdx: actor.idx, targetEnemyIdx: targetIdx })
  }
  bus.emit({ op: 'showDamageNum', x: 0, y: 0, value: damage, color: 'yellow' })
}
