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
 * 注:str/def 沿用 PAL_GetPlayerAttackStrength / PAL_GetPlayerDefense:base + 装备,无 level 项。
 * 走入位移已通过 buildAttackMateTimeline 接入;受击音效/精灵帧仍可继续精修。
 */

import type { PlayerRoles } from '@type-pal/shared'
import type { CommandBus } from '../../command-bus.js'
import { buildAttackMateTimeline } from '../anim-timeline.js'
import { startBattleAnim } from '../battle-anim-driver.js'
import type { BattleState } from '../battle-state.js'
import { calcPhysicalAttackDamage } from '../formulas.js'

/** SHORT cast(同 attack.ts / formulas.ts 私函)。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

/**
 * 执行混乱队员对**友军**的物理攻击。caster/target 都是 players[] 索引。
 * `forcedTarget` 给定(原版混乱随机目标命中友军时,由 resolveConfusedAttack 选定)→ 打该友军;
 * 省略 → 自行随机选活友军(sdlpal AttackMate fight.c:3786-3789;无活友军 → no-op Pass)。
 * target HP 写回 playerRoles.roles[roleId]。
 */
export function performAttackMate(
  state: BattleState,
  casterIdx: number,
  bus: CommandBus,
  playerRoles: PlayerRoles,
  forcedTarget?: number,
): void {
  const maxIdx = state.players.length - 1 // = sdlpal wMaxPartyMemberIndex
  const hpOf = (idx: number): number => playerRoles.roles[state.players[idx]!.roleId]?.hp ?? 0

  let target: number
  if (forcedTarget !== undefined && forcedTarget !== casterIdx && hpOf(forcedTarget) > 0) {
    target = forcedTarget // 原版混乱随机目标已选定该友军
  } else {
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
    do {
      target = state.rng.rangeInclusive(0, maxIdx)
    } while (target === casterIdx || hpOf(target) === 0)
  }

  // 3. str(攻者)/ def(目标,防御×2)。**P0 一致修(2026-06-02)**:sdlpal fight.c:3833-3834 用
  //    PAL_GetPlayerAttackStrength / PAL_GetPlayerDefense(global.c:1757/1800 = base+装备,**无 level 项**);
  //    role 已投影含装备 = getter,故 str=role.attackStrength / def=role.defense,不加 `(level+6)*K`
  //    (此前误套敌方公式 → attack.ts/magic-damage P0#1/#3 已删,attack-mate 漏,此处补)。
  const casterRole = playerRoles.roles[state.players[casterIdx]!.roleId]!
  const targetRole = playerRoles.roles[state.players[target]!.roleId]!
  const str = asShort(casterRole.attackStrength)
  let def = asShort(targetRole.defense)
  if (state.players[target]!.defending) def *= 2 // fight.c:3814-3817

  // 4. 伤害:res=2;Protect /=2;<=0→1;clamp 到目标 HP
  let damage = calcPhysicalAttackDamage(str, def, 2) // fight.c:3819
  if ((state.players[target]!.status.protect ?? 0) > 0) damage = Math.floor(damage / 2) // fight.c:3820-3823
  if (damage <= 0) damage = 1 // fight.c:3825-3828
  const before = targetRole.hp
  if (damage > before) damage = before // fight.c:3830-3833 clamp

  // 5. 扣血(数字延迟到演出后,见下)
  targetRole.hp = before - damage
  // M6 武器声(sdlpal fight.c:3810 AUDIO_PlaySound(rgwWeaponSound[role]);混乱/迷惑下打友军是强制物理,
  //   只播武器声,无起手/暴击声)。经 bus playSound → bootstrap 战斗 drain 播。
  if (casterRole.weaponSound > 0) bus.emit({ op: 'playSound', soundId: casterRole.weaponSound })

  // 6. D8(2026-06-02):走入精灵动画(fight.c:3791-3858)。caster/target posOriginal 底锚;缺锚 → 跳过(纯逻辑)。
  // DM15:伤害数字经 pendingDamageNums 延迟到演出完(fight.c:3845 DisplayStatChange 在走入 frame8 →
  //   frame9 命中 → 击退 → 闪白**之后**)——修"数字先蹦、角色才跑过去打"(5eb5050 投掷同类残留)。
  //   无动画锚(旧 fixture)→ 保留即时 emit。
  const dmgNum = {
    target: { kind: 'player' as const, idx: target },
    value: damage,
    color: 'blue' as const,
  }
  const casterPos = state.players[casterIdx]!.posOriginal
  const targetPos = state.players[target]!.posOriginal
  if (casterPos && targetPos) {
    startBattleAnim(
      state,
      buildAttackMateTimeline({ casterIdx, casterPos, targetIdx: target, targetPos }),
      bus,
      [dmgNum],
    )
    if (state.battleAnim) state.battleAnim.updateEnemyGesture = true // DM11:玩家动作链(fight.c:3807 Delay TRUE)
  } else {
    bus.emit({ op: 'showDamageNum', ...dmgNum })
  }
}
