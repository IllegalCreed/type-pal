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
import { buildCoopMagicTimeline } from '../anim-timeline.js'
import { startBattleAnim } from '../battle-anim-driver.js'
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
  /** D17:FIRE.MKF chunk[effect] 帧数 Map(= res.magicSpriteFrameCounts)。有则建合击动画;缺则即时数字(向后兼容)。 */
  magicSpriteFrameCounts?: Map<number, number>
}

/** sdlpal 攻击魔法 4 落点类型(OffMagic / 合击动画支持)。 */
type OffMagicType = 'normal' | 'attackAll' | 'attackWhole' | 'attackField'
function isOffMagicType(t: Magic['type']): t is OffMagicType {
  return t === 'normal' || t === 'attackAll' || t === 'attackWhole' || t === 'attackField'
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
  const { state, casterIdx, coopObjId, targetIdx, playerRoles, magics, objectMagics, bus, magicSpriteFrameCounts } = input

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

  // M6 合击音 —— sdlpal 合体法术 perform(PAL_BattlePlayerPerformAction kBattleActionCoopMagic,fight.c:3856-3875):
  //   - summon 类:PAL_BattleShowPlayerPreMagicAnim(TRUE)→ CLASSIC 播 rgwMagicSound[caster](fight.c:2377);
  //   - 非 summon:AUDIO_PlaySound(29)(fight.c:3875 fixed);
  //   随后动画播 magic.wSound(效果音)。**修正(2026-06-03):summon 此前误用固定 28(物品演出音)**,
  //   应为施法角色自己的 magicSound。
  const casterCastSound = magic.type === 'summon'
    ? (playerRoles.roles[state.players[casterIdx]?.roleId ?? -1]?.magicSound ?? 0)
    : 29
  if (casterCastSound > 0) bus.emit({ op: 'playSound', soundId: casterCastSound })
  if (magic.sound > 0) bus.emit({ op: 'playSound', soundId: magic.sound })

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

  // —— 动画:聚拢队形 → 施法 → OffMagic 法术效果 → 滑回(fight.c:3856-4107)。
  //   前置满足(攻击类 magic + 有 FIRE.MKF 帧数 + 发起者有底锚)→ 建链;伤害数字延迟到特效落完才弹(pendingNums)。
  //   不满足(治疗/召唤类合击 / 无帧数 / 旧 fixture)→ 回落即时数字,向后兼容。
  const n = magicSpriteFrameCounts?.get(magic.effect)
  const casterPos = state.players[casterIdx]?.posOriginal
  if (isOffMagicType(magic.type) && n !== undefined && n > 0 && casterPos) {
    const offType = magic.type
    // 伤害数字延迟到 OffMagic 落完(sdlpal PAL_BattleDisplayStatChange 在 OffMagic 后,fight.c:4045)。
    const pendingNums: NonNullable<BattleState['battleAnim']>['pendingDamageNums'] = []
    const hurtEnemies: Array<{ idx: number; pos: { x: number; y: number } }> = []
    // 合击打敌人:wHealth WORD 下溢不钳(fight.c:638),超杀显示**完整算出伤害** r.damage,非剩余血 delta。
    for (const r of results) {
      if (r.hpAfter < r.hpBefore) pendingNums.push({ target: { kind: 'enemy', idx: r.enemyIdx }, value: r.damage, color: 'blue' })
      if (r.hpAfter !== r.hpBefore) {
        const pos = state.enemies[r.enemyIdx]?.posOriginal
        if (pos) hurtEnemies.push({ idx: r.enemyIdx, pos })
      }
    }
    // OffMagic 落点:normal → 单体目标 idle 底锚;全体类型 → -1(落点表)。
    let offTargetIdx = -1
    let offTargetPos: { x: number; y: number } | undefined
    if (offType === 'normal' && typeof target === 'number') {
      offTargetIdx = target
      offTargetPos = state.enemies[target]?.posOriginal
    }
    const frames = buildCoopMagicTimeline({
      casterIdx,
      partySize: state.players.length,
      contributorIdxs: contributors,
      originalPositions: state.players.map(p => p.posOriginal),
      magic: {
        effect: magic.effect, type: offType, speed: magic.speed, fireDelay: magic.fireDelay,
        effectTimes: magic.effectTimes, shake: magic.shake, xOffset: magic.xOffset, yOffset: magic.yOffset,
      },
      n,
      targetIdx: offTargetIdx,
      targetEnemyPos: offTargetPos,
      iBlow: state.iBlow,
      hurtEnemies,
    })
    startBattleAnim(state, frames, bus, pendingNums)
    return
  }

  // 回落(无动画):D17b 掉血 → blue showDamageNum 即时弹。
  for (const r of results) {
    if (r.hpAfter < r.hpBefore) {
      bus.emit({ op: 'showDamageNum', target: { kind: 'enemy', idx: r.enemyIdx }, value: r.damage, color: 'blue' })
    }
  }
}
