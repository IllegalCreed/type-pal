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
 *  - 有 FIRE.MKF 帧数与队员位置时,播放队员聚拢/帧切换/聚气 + 法术特效时间线。
 */

import type { Magic, ObjectMagicView, PlayerRoles } from '@type-pal/shared'
import type { CommandBus } from '../../command-bus.js'
import type { ActionQueueItem } from '../turn-queue.js'
import {
  buildCoopMagicTimeline,
  buildPlayerOffMagicTimeline,
  buildPostMagicTimeline,
  buildPreMagicTimeline,
  buildSummonBrightenTimeline,
  buildSummonGodSequence,
} from '../anim-timeline.js'
import { startBattleAnim } from '../battle-anim-driver.js'
import type { BattleAnimFrame, BattleState } from '../battle-state.js'
import { performAttack } from './attack.js'
import { applyMagicDamage, magicForcesAllTarget, resolveObjectMagic } from '../magic-damage.js'

export interface PerformCoopMagicInput {
  /** DL6:降级普攻的隐藏 exp 写入(fight.c:3756-3757);省略 → 不积(旧 fixture)。 */
  gs?: import('../../game-state.js').GameState
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
  /** healthy<=1 时按 sdlpal 退化成普通攻击;传入后可保留普攻动画/伤害。 */
  actor?: ActionQueueItem
  /** 退化普攻的命中特效帧基号。 */
  battleEffectIndex?: number[]
  /** D17:FIRE.MKF chunk[effect] 帧数 Map(= res.magicSpriteFrameCounts)。有则建合击动画;缺则即时数字(向后兼容)。 */
  magicSpriteFrameCounts?: Map<number, number>
  /** 召唤神精灵帧数 Map(F.MKF chunk = magic.special+10)。summon 型协力用。 */
  summonSpriteFrameCounts?: Map<number, number>
}

/** sdlpal 攻击魔法 4 落点类型(OffMagic / 合击动画支持)。 */
type OffMagicType = 'normal' | 'attackAll' | 'attackWhole' | 'attackField'
function isOffMagicType(t: Magic['type']): t is OffMagicType {
  return t === 'normal' || t === 'attackAll' || t === 'attackWhole' || t === 'attackField'
}

type PendingDamageNums = NonNullable<NonNullable<BattleState['battleAnim']>['pendingDamageNums']>

function attachDamageNumsToFirstFrame(frames: BattleAnimFrame[], pendingNums: PendingDamageNums): boolean {
  if (pendingNums.length === 0) return true
  const first = frames[0]
  if (!first) return false
  first.damageNums = [...(first.damageNums ?? []), ...pendingNums]
  return true
}

/** SHORT cast(同 magic-damage.ts)。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

/** sdlpal `PAL_IsPlayerDying`(fight.c:29-48):hp < min(100, maxHP/5)。 */
function isDying(role: { hp: number, maxHP: number }): boolean {
  return role.hp > 0 && role.hp < Math.min(100, Math.floor(role.maxHP / 5))
}

/** sdlpal `PAL_IsPlayerHealthy`(fight.c:69-76):非濒死 + 无 sleep/confused/silence/paralyzed/puppet。 */
function isHealthy(role: { hp: number, maxHP: number }, status: { sleep?: number, confused?: number, silence?: number, paralyzed?: number, puppet?: number }): boolean {
  if (role.hp <= 0 || isDying(role)) return false
  return (status.sleep ?? 0) === 0 && (status.confused ?? 0) === 0 && (status.silence ?? 0) === 0
    && (status.paralyzed ?? 0) === 0 && (status.puppet ?? 0) === 0
}

export function performCoopMagic(input: PerformCoopMagicInput): void {
  const { state, casterIdx, coopObjId, targetIdx, playerRoles, magics, objectMagics, bus, actor, battleEffectIndex, magicSpriteFrameCounts, summonSpriteFrameCounts, gs } = input

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
  // healthy <= 1 → sdlpal 退化普通攻击(fight.c:3374-3378),不是静默 no-op。
  if (contributors.length <= 1) {
    if (actor && !actor.isEnemy) {
      const target = targetIdx === 'all' ? -1 : targetIdx
      performAttack(state, actor, target, bus, playerRoles, battleEffectIndex)
      // DL6:降级走的是**完整** attack case(fight.c:3374-3378 改 ActionType 后从头跑),含
      //   rgAttackExp.wCount++ + rgHealthExp += RandomLong(2,3)(fight.c:3756-3757,RNG 序同)。
      if (gs) {
        const atk = gs.Exp.rgAttackExp[state.players[actor.idx]!.roleId]
        if (atk) atk.wCount = (atk.wCount ?? 0) + 1
        const hp = gs.Exp.rgHealthExp[state.players[actor.idx]!.roleId]
        const roll = state.rng.rangeInclusive(2, 3)
        if (hp) hp.wCount = (hp.wCount ?? 0) + roll
      }
    }
    return
  }

  const emitImmediateCoopSounds = (): void => {
    // M6 合击音 —— sdlpal 合体法术 perform(PAL_BattlePlayerPerformAction kBattleActionCoopMagic,fight.c:3856-3875):
    //   - summon 类:PAL_BattleShowPlayerPreMagicAnim(TRUE)→ CLASSIC 播 rgwMagicSound[caster](fight.c:2377);
    //   - 非 summon:AUDIO_PlaySound(29)(fight.c:3875 fixed);
    //   随后动画播 magic.wSound(效果音)。有时间线时 summon 声音挂帧同步;无资源回落即时播。
    const casterCastSound = magic.type === 'summon'
      ? (playerRoles.roles[state.players[casterIdx]?.roleId ?? -1]?.magicSound ?? 0)
      : 29
    if (casterCastSound > 0) bus.emit({ op: 'playSound', soundId: casterCastSound })
    // M9(2026-06-07 sdlpal 审查):效果音 magic.sound **不**在此即播 —— 改随 OffMagic 起手帧同步
    //   (有动画时 buildCoopMagicTimeline 挂 i===0 帧;无动画回落时下方即时 emit)。原即播比命中特效早 ~0.7s。
  }

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
  // L18:合击群攻同样逐敌掷独立 rngFactor(applyMagicDamage 循环内,fight.c:4015 逐敌调用)。
  const results = applyMagicDamage({
    state,
    target,
    magStr: str,
    magicData: { baseDamage: magic.baseDamage, elemental: magic.elemental },
    minDamage: 1,
  })

  const pendingNums: PendingDamageNums = []
  const hurtEnemies: Array<{ idx: number; pos: { x: number; y: number } }> = []
  // 合击打敌人:wHealth WORD 下溢不钳(fight.c:638),超杀显示**完整算出伤害** r.damage,非剩余血 delta。
  for (const r of results) {
    if (r.hpAfter < r.hpBefore) pendingNums.push({ target: { kind: 'enemy', idx: r.enemyIdx }, value: r.damage, color: 'blue' })
    if (r.hpAfter !== r.hpBefore) {
      const pos = state.enemies[r.enemyIdx]?.posOriginal
      if (pos) hurtEnemies.push({ idx: r.enemyIdx, pos })
    }
  }

  if (magic.type === 'summon') {
    const built = buildAndStartCoopSummonAnim({
      state,
      casterIdx,
      magic,
      magics,
      playerRoles,
      bus,
      pendingNums,
      hurtEnemies,
      magicSpriteFrameCounts,
      summonSpriteFrameCounts,
    })
    if (built) return
    emitImmediateCoopSounds()
  } else {
    emitImmediateCoopSounds()
  }

  // —— 动画:聚拢队形 → 施法 → OffMagic 法术效果 → PostMagic → 滑回(fight.c:3856-4107)。
  //   前置满足(攻击类 magic + 有 FIRE.MKF 帧数 + 发起者有底锚)→ 建链;伤害数字挂 PostMagic 第一帧。
  //   不满足(治疗/召唤类合击 / 无帧数 / 旧 fixture)→ 回落即时数字,向后兼容。
  const n = magicSpriteFrameCounts?.get(magic.effect)
  const casterPos = state.players[casterIdx]?.posOriginal
  if (isOffMagicType(magic.type) && n !== undefined && n > 0 && casterPos) {
    const offType = magic.type
    // 伤害数字延迟到 OffMagic 落完(sdlpal PAL_BattleDisplayStatChange 在 OffMagic 后,fight.c:4045),
    // 再和 PostMagic 第一帧同帧显示。
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
        special: magic.special, // DM9:sLayerOffset(z 排序)—— 漏传致首次施法合击 OffMagic layerOffset 落 0 被敌人遮挡(4cf2258 漏网路径)
        effectTimes: magic.effectTimes, shake: magic.shake, xOffset: magic.xOffset, yOffset: magic.yOffset,
        wave: magic.wave, keepEffect: magic.keepEffect,
        sound: magic.sound, // M9:效果音随 OffMagic 起手帧同步(buildPlayerOffMagicTimeline i===0)
      },
      n,
      targetIdx: offTargetIdx,
      targetEnemyPos: offTargetPos,
      iBlow: state.iBlow,
      baseScreenWave: state.field.screenWave, // L17:战场基础屏波 + magic.wWave 决定 keepEffect<9(battle.c:1563)
      hurtEnemies,
      damageNums: pendingNums,
    })
    startBattleAnim(state, frames, bus)
    return
  }

  // 回落(无动画):D17b 掉血 → blue showDamageNum 即时弹 + M9 效果音即时(无 OffMagic 帧承载)。
  if (magic.sound > 0) bus.emit({ op: 'playSound', soundId: magic.sound })
  for (const dn of pendingNums) {
    bus.emit({ op: 'showDamageNum', target: dn.target, value: dn.value, color: dn.color })
  }
}

function buildAndStartCoopSummonAnim(input: {
  state: BattleState
  casterIdx: number
  magic: Magic
  magics: Magic[]
  playerRoles: PlayerRoles
  bus: CommandBus
  pendingNums: PendingDamageNums
  hurtEnemies: Array<{ idx: number; pos: { x: number; y: number } }>
  magicSpriteFrameCounts?: Map<number, number>
  summonSpriteFrameCounts?: Map<number, number>
}): boolean {
  const { state, casterIdx, magic, magics, playerRoles, bus, pendingNums, hurtEnemies, magicSpriteFrameCounts, summonSpriteFrameCounts } = input
  if (magic.type !== 'summon') return false

  const summonChunk = magic.special + 10 // F.MKF chunk = wSummonEffect + 10(fight.c:3135)
  const totalFrames = summonSpriteFrameCounts?.get(summonChunk)
  if (totalFrames === undefined || totalFrames <= 0) return false
  const caster = state.players[casterIdx]
  if (!caster?.posOriginal) return false

  const preFrames = buildPreMagicTimeline({
    casterPos: caster.posOriginal,
    casterIdx,
    castEffectFrameBase: 0,
    isSummon: true,
    castSound: playerRoles.roles[caster.roleId]?.magicSound ?? 0,
  })

  const brightenFrames = buildSummonBrightenTimeline(state.players.length)
  // PAL_BattleShowPlayerSummonMagicAnim:召唤 magic.wSound 在召唤正片开始前播;挂首个变亮帧,避免只闻声不见神。
  if (magic.sound > 0 && brightenFrames.length > 0) brightenFrames[0]!.sound = magic.sound

  let offMagicFrames: BattleAnimFrame[] = []
  const secondary = magics.find(m => m.id === magic.effect)
  if (secondary && isOffMagicType(secondary.type)) {
    const n = magicSpriteFrameCounts?.get(secondary.effect)
    if (n !== undefined && n > 0) {
      offMagicFrames = buildPlayerOffMagicTimeline({
        casterIdx: -1,
        magic: {
          effect: secondary.effect,
          type: secondary.type,
          speed: secondary.speed,
          special: secondary.special, // DM9:sLayerOffset(z 排序)—— 漏传致合体二次法术 layerOffset 落 0 被敌人遮挡
          fireDelay: secondary.fireDelay,
          effectTimes: secondary.effectTimes,
          shake: secondary.shake,
          xOffset: secondary.xOffset,
          yOffset: secondary.yOffset,
          wave: secondary.wave,
          keepEffect: secondary.keepEffect,
        },
        n,
        targetIdx: -1,
        iBlow: state.iBlow,
        baseScreenWave: state.field.screenWave, // L17:战场基础屏波 + wWave 决定 keepEffect<9(battle.c:1563)
      })
    }
  }

  const postMagicFrames = buildPostMagicTimeline({ hurtEnemies })
  const numsAttached = attachDamageNumsToFirstFrame(postMagicFrames, pendingNums)

  const godFrames = buildSummonGodSequence({
    spriteKey: `player-${summonChunk}`,
    pos: { x: 240 + asShort(magic.xOffset), y: 165 + asShort(magic.yOffset) },
    bgColorShift: asShort(magic.effectTimes),
    totalFrames,
    frameTimeMs: (magic.speed + 5) * 10,
    offMagicFrames,
    postMagicFrames,
  })

  startBattleAnim(state, [...preFrames, ...brightenFrames, ...godFrames], bus, numsAttached ? undefined : pendingNums)
  if (state.battleAnim) state.battleAnim.hasSummonFade = true
  return true
}
