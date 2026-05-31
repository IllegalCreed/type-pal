/**
 * 协力合击(kBattleActionCoopMagic)—— sdlpal `fight.c:3856-4043`(PAL_CLASSIC)。
 *
 * 装备改变合击法术:`wObject = PAL_GetPlayerCooperativeMagic(role)`(装备 override 已在
 * projectRuntimeToBattleRoles 经 rgwCooperativeMagic 末非 0 槽 override 投影进 role.cooperativeMagic;
 * 选单 confirmMainAction case 2 取此 id 作 action.actionId)。
 *
 * 结算真值(CLASSIC):
 *  - contributors = 所有 **healthy** 队员(fight.c:3370 coopContributors[i] = PAL_IsPlayerHealthy);
 *    healthy 人数 <= 1 → 退化普通攻击(选单 validity 已门控,执行端防御)。
 *  - **HP 代价**(非 MP!):每个 contributor `role.hp -= magic.costMP`,<=0 钳 1(fight.c:3961-3967)。
 *  - str = Σ(PAL_GetPlayerAttackStrength + PAL_GetPlayerMagicStrength) over contributors，再 `/4`
 *    (fight.c:3982-3995)。D14 投影后 role.attackStrength/magicStrength 即 effective(含装备)。
 *  - 伤害 = PAL_CalcMagicDamage(str, ...),`sDamage<=0 → 1`(minDamage=1,fight.c:4018/4037)。
 *    目标:applyToAll(magic.type 或 flag)→ 全体;否则单体 action.target。
 *  - present 动画(队员聚拢/帧切换/聚气)= D17 跳过(同其它战斗动画)。
 */

import type { Magic, ObjectMagicView, PlayerRoles } from '@type-pal/shared'
import type { CommandBus } from '../../command-bus.js'
import type { BattleState } from '../battle-state.js'
import { applyMagicDamage, magicForcesAllTarget, resolveObjectMagic } from '../magic-damage.js'

export interface PerformCoopMagicInput {
  state: BattleState
  /** 发起合击的队员 slot 索引(state.players)。 */
  casterIdx: number
  /** 合击 magic object id = role.cooperativeMagic(装备 override 后)。 */
  coopObjId: number
  /** 目标 enemy 索引;-1 / 'all' = 全体。 */
  targetIdx: number | 'all'
  playerRoles: PlayerRoles
  magics: Magic[]
  objectMagics: ObjectMagicView[]
  bus: CommandBus
}

/** SHORT cast(同 magic-damage.ts)。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

/** sdlpal `PAL_IsPlayerDying`(global.c):hp>0 且 hp < max(1, maxHP/5)。 */
function isDying(role: { hp: number, maxHP: number }): boolean {
  return role.hp > 0 && role.hp < Math.max(1, Math.floor(role.maxHP / 5))
}

/** sdlpal `PAL_IsPlayerHealthy`(fight.c:69-76):非濒死 + 无 sleep/confused/silence/paralyzed/puppet。 */
function isHealthy(role: { hp: number, maxHP: number }, status: { sleep?: number, confused?: number, silence?: number, paralyzed?: number, puppet?: number }): boolean {
  if (role.hp <= 0 || isDying(role)) return false
  return (status.sleep ?? 0) === 0 && (status.confused ?? 0) === 0 && (status.silence ?? 0) === 0
    && (status.paralyzed ?? 0) === 0 && (status.puppet ?? 0) === 0
}

export function performCoopMagic(input: PerformCoopMagicInput): void {
  const { state, coopObjId, targetIdx, playerRoles, magics, objectMagics, bus } = input

  // 解析合击 magic object → magicNumber → magic(sdlpal fight.c:3860-3861)。
  const objMagic = resolveObjectMagic(coopObjId, objectMagics)
  if (!objMagic) return
  const magic = magics.find(m => m.id === objMagic.magicNumber)
  if (!magic) return

  // contributors = 所有 healthy 队员(fight.c:3367-3373 coopContributors[i] = PAL_IsPlayerHealthy)。
  const contributors: number[] = []
  state.players.forEach((p, i) => {
    const role = playerRoles.roles[p.roleId]
    if (role && isHealthy(role, p.status)) contributors.push(i)
  })
  // healthy <= 1 → sdlpal 退化普通攻击(fight.c:3374-3378);执行端防御:no-op(选单 validity 已门控)。
  if (contributors.length <= 1) return

  // HP 代价(**非 MP**):每个 contributor role.hp -= magic.costMP,<=0 钳 1(fight.c:3961-3967)。
  for (const i of contributors) {
    const role = playerRoles.roles[state.players[i]!.roleId]!
    role.hp -= magic.costMP
    if (role.hp <= 0) role.hp = 1
  }

  // str = Σ(PAL_GetPlayerAttackStrength + PAL_GetPlayerMagicStrength) over contributors / 4
  //   (fight.c:3982-3995)。D14 投影后 role.attackStrength/magicStrength = effective(含装备)。
  let str = 0
  for (const i of contributors) {
    const role = playerRoles.roles[state.players[i]!.roleId]!
    str += asShort(role.attackStrength) + asShort(role.magicStrength)
  }
  str = Math.trunc(str / 4)

  // 目标:applyToAll(magic.type 或 object flag,fight.c:3401)→ 全体;否则单体。
  const target: number | 'all'
    = (targetIdx === 'all' || targetIdx === -1 || magicForcesAllTarget(magic.type) || objMagic.flags.applyToAll)
      ? 'all'
      : targetIdx

  // 伤害:PAL_CalcMagicDamage(str, ...),sDamage<=0 → 1(minDamage=1,fight.c:4018/4037)。
  const rngFactor = 1 + state.rng.next() * 0.1 // sdlpal RandomFloat(10,11)/10
  const results = applyMagicDamage({
    state,
    target,
    magStr: str,
    magicData: { baseDamage: magic.baseDamage, elemental: magic.elemental },
    rngFactor,
    minDamage: 1,
  })

  // D17b:掉血 → blue showDamageNum(present 动画 = D17 跳过,直接 emit 数字)。
  for (const r of results) {
    if (r.hpAfter < r.hpBefore) {
      bus.emit({ op: 'showDamageNum', target: { kind: 'enemy', idx: r.enemyIdx }, value: r.hpBefore - r.hpAfter, color: 'blue' })
    }
  }
}
