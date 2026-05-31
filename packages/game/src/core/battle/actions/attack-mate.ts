/**
 * AttackMate —— 混乱队员攻击随机活友军(B1 / D8)。
 *
 * 1:1 port `reference/sdlpal/fight.c:3760-3853`(PAL_BattlePlayerPerformAction
 * kBattleActionAttackMate,PAL_CLASSIC 分支):
 *   1. 检查是否有其他活友军(3768-3779);无 → 不攻击(Pass,3781 do 不进)。
 *   2. 随机活友军目标(3786-3789):do sTarget = RandomLong(0, wMaxPartyMemberIndex)
 *      while (sTarget == self || HP[sTarget] == 0)。
 *   3. str = PAL_GetPlayerAttackStrength(caster);def = PAL_GetPlayerDefense(target),
 *      target 防御中 → def *= 2(3814-3817)。
 *   4. sDamage = PAL_CalcPhysicalAttackDamage(str, def, 2)(res 硬编码 2,3819);
 *      target Protect>0 → /=2(3820-3823);<=0 → 1(3825-3828);clamp 到 target HP(3830-3833)。
 *   5. target HP -= sDamage(3835)。
 *
 * 注:str/def 沿用 attack.ts 同一简化(asShort(stat) + (level+6)*K,K=6 攻 / 4 防);
 * **走入位移 / 受击精灵帧动画属 D17/B5 演出残留**,本函数只做伤害结算 + showDamageNum 弹幕(蓝)。
 */

import type { PlayerRoles } from '@type-pal/shared'
import type { CommandBus } from '../../command-bus.js'
import type { BattleState } from '../battle-state.js'
import { calcPhysicalAttackDamage } from '../formulas.js'

/** SHORT cast(同 attack.ts / formulas.ts 私函)。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

/**
 * 执行混乱队员的 AttackMate。caster/target 都是 players[] 索引。
 * 无活友军 → no-op(Pass)。target HP 写回 playerRoles.roles[roleId]。
 */
export function performAttackMate(
  state: BattleState,
  casterIdx: number,
  bus: CommandBus,
  playerRoles: PlayerRoles,
): void {
  const maxIdx = state.players.length - 1 // = sdlpal wMaxPartyMemberIndex
  const hpOf = (idx: number): number => playerRoles.roles[state.players[idx]!.roleId]?.hp ?? 0

  // 1. 是否有其他活友军(fight.c:3768-3779)
  let anyAlive = false
  for (let i = 0; i <= maxIdx; i++) {
    if (i !== casterIdx && hpOf(i) > 0) {
      anyAlive = true
      break
    }
  }
  if (!anyAlive) return // 无活友军 → Pass(fight.c:3781 do-while 不进)

  // 2. 随机活友军目标(fight.c:3786-3789):do RandomLong(0,maxIdx) while(self || HP==0)
  let target: number
  do {
    target = state.rng.rangeInclusive(0, maxIdx)
  } while (target === casterIdx || hpOf(target) === 0)

  // 3. str(攻者)/ def(目标,防御×2)
  const casterRole = playerRoles.roles[state.players[casterIdx]!.roleId]!
  const targetRole = playerRoles.roles[state.players[target]!.roleId]!
  const str = asShort(casterRole.attackStrength) + (casterRole.level + 6) * 6
  let def = asShort(targetRole.defense) + (targetRole.level + 6) * 4
  if (state.players[target]!.defending) def *= 2 // fight.c:3814-3817

  // 4. 伤害:res=2;Protect /=2;<=0→1;clamp 到目标 HP
  let damage = calcPhysicalAttackDamage(str, def, 2) // fight.c:3819
  if ((state.players[target]!.status.protect ?? 0) > 0) damage = Math.floor(damage / 2) // fight.c:3820-3823
  if (damage <= 0) damage = 1 // fight.c:3825-3828
  const before = targetRole.hp
  if (damage > before) damage = before // fight.c:3830-3833 clamp

  // 5. 扣血 + 蓝色掉血弹幕(present 受击精灵动画属 B5 残留)
  targetRole.hp = before - damage
  bus.emit({ op: 'showDamageNum', target: { kind: 'player', idx: target }, value: damage, color: 'blue' })
}
