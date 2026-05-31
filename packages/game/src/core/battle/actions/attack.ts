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

import type { Command, Enemy, Item, PlayerRoles } from '@type-pal/shared'
import type { CommandBus } from '../../command-bus.js'
import { getPlayerPoisonResistance } from '../../equip-effect.js'
import type { GameState } from '../../game-state.js'
import { buildEnemyPhysicalTimeline, buildPlayerAttackTimeline } from '../anim-timeline.js'
import { startBattleAnim } from '../battle-anim-driver.js'
import type { BattleAnimFrame, BattleState } from '../battle-state.js'
import { calcPhysicalAttackDamage } from '../formulas.js'
import type { SeedableRng } from '../../rng.js'
import type { RunScriptFn } from './magic.js'
import type { ActionQueueItem } from '../turn-queue.js'

/**
 * 敌人普攻附带等价物品中毒所需上下文(sdlpal fight.c:5139-5146 wAttackEquivItem)。
 * 省略 → 不施加(向后兼容旧 caller / 单测)。
 */
export interface EquivPoisonCtx {
  gs: GameState
  items: Item[]
  commands: Command[]
  runScript: RunScriptFn
}

/**
 * D17a:player 攻击命中特效帧基号 = rgwBattleEffectIndex[battleSpriteId][1] * 3
 * (fight.c:2055-2056)。battleEffectIndex 为 rgwBattleEffectIndex[10][2] flat 20 项;
 * `[sprite][1]` = list[sprite*2 + 1]。表缺 / 越界 → 0(overlay 仍画 chunk10 frame0..2)。
 */
function playerEffectFrameBase(
  battleEffectIndex: number[] | undefined,
  battleSpriteId: number,
): number {
  const v = battleEffectIndex?.[battleSpriteId * 2 + 1] ?? 0
  return v * 3
}

/** PAL_IsPlayerDying(fight.c:47-48):hp < min(100, maxHP/5)。 */
function isPlayerDying(hp: number, maxHp: number): boolean {
  return hp < Math.min(100, Math.floor(maxHp / 5))
}

/** SHORT cast(同 formulas.ts 私函)。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

/**
 * D3 玩家物理攻击伤害修饰(fight.c:3636-3663,**仅 player→enemy**)。
 *
 * 流程严格对齐 sdlpal:
 *   base + RandomLong(1,2)                         // 3637 jitter
 *   if (RandomLong(0,5)==0 || bravery>0) ×3        // 3639-3647 暴击(1/6 或勇敢)
 *   if (role==0 && RandomLong(0,11)==0) ×2         // 3649-3656 李逍遥额外暴击(1/12)
 *   (SHORT)(damage * RandomFloat(1,1.125))          // 3658 末浮动 + SHORT 截断
 *   if (damage<=0) damage=1                          // 3660-3663
 *
 * 注:`RandomLong(0,5)` 即使 bravery>0 也照样消费一次(C `==0 || bravery` 左操作数先求值),
 *     故 RNG 调用序固定为 jitter→crit→(role0)李逍遥→float,测试脚本化 rng 按此序喂值。
 *
 * @returns damage(钳后)+ fCritical(暴击 flag,供 D17 暴击演出;本批仅用 damage)。
 */
function applyPlayerAttackModifiers(
  base: number,
  rng: SeedableRng,
  roleId: number,
  bravery: number,
): { damage: number; fCritical: boolean } {
  let damage = base + rng.rangeInclusive(1, 2)
  let fCritical = false
  if (rng.rangeInclusive(0, 5) === 0 || bravery > 0) {
    damage *= 3
    fCritical = true
  }
  if (roleId === 0 && rng.rangeInclusive(0, 11) === 0) {
    damage *= 2
    fCritical = true
  }
  damage = asShort(Math.trunc(damage * rng.rangeFloat(1, 1.125)))
  if (damage <= 0) damage = 1
  return { damage, fCritical }
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
  /**
   * D17a:rgwBattleEffectIndex[10][2] flat(player 攻击命中特效帧基号用);
   * 省略 → effectFrameBase=0(overlay 仍指 chunk10 frame 0..2)。
   */
  battleEffectIndex?: number[],
  /** 敌普攻 equivItem 中毒上下文(fight.c:5139);省略 → 不施加。 */
  equivPoison?: EquivPoisonCtx,
): void {
  // —— 算 str ——
  let str: number
  let casterLevel: number
  if (actor.isEnemy) {
    const enemy: Enemy = state.enemies[actor.idx]!.e
    str = asShort(enemy.attackStrength) + (enemy.level + 6) * 6
    casterLevel = enemy.level
    if (str < 0) str = 0 // sdlpal fight.c:4920
  } else {
    const role = playerRoles.roles[state.players[actor.idx]!.roleId]!
    str = asShort(role.attackStrength) + (role.level + 6) * 6
    casterLevel = role.level
  }
  void casterLevel

  // —— 群攻(attackAll 武器):player 且 targetIdx<0(=-1 全体)——
  // sdlpal kBattleActionAttack sTarget==-1 分支(fight.c:3681-3748):
  //   - fCritical 整轮摇一次(RandomLong(0,5)==0 || bravery)→ 全敌 ×3
  //   - 命中序固定 index[]={2,1,0,4,3}(fight.c:3684)
  //   - division 初 1,每命中一个活敌后 *=2(逐敌减半;首敌全额)
  //   - **无** jitter / RandomFloat(真值即如此,区别于单体)
  if (!actor.isEnemy && targetIdx < 0) {
    const bravery = state.players[actor.idx]?.status.bravery ?? 0
    // DualAttack(0x2D 装备授,如玄冥宝刀)→ 整段群攻做两次(fight.c:3681 for t<(dualAttack?2:1))
    const hits = (state.players[actor.idx]?.status.dualAttack ?? 0) > 0 ? 2 : 1
    const HIT_ORDER = [2, 1, 0, 4, 3] // fight.c:3684 const int index[MAX_ENEMIES_IN_TEAM]
    for (let t = 0; t < hits; t++) {
      // 每轮 crit 重摇、division 重置(fight.c:3683-3688 在 t-loop 内)
      const fCritical = state.rng.rangeInclusive(0, 5) === 0 || bravery > 0
      let division = 1
      for (const slot of HIT_ORDER) {
        const be = state.enemies[slot]
        if (!be || be.e.health <= 0) continue // sdlpal:wObjectID==0 || idx>maxEnemyIndex
        const def = asShort(be.e.defense) + (be.e.level + 6) * 4
        let damage = calcPhysicalAttackDamage(str, def, be.e.physicalResistance)
        if (fCritical) damage *= 3
        damage = damage / division // FLOAT 除(逐敌减半)
        if (damage <= 0) damage = 1
        const before = be.e.health
        // sdlpal `wHealth -= (FLOAT)sDamage` → WORD 回写截断(trunc),等价 floor(health - dmg)
        be.e.health = Math.max(0, Math.trunc(be.e.health - damage))
        // D17b:敌人掉血 → blue(sdlpal `fight.c:648-651`)。value 用钳后真实 delta。
        bus.emit({
          op: 'showDamageNum',
          target: { kind: 'enemy', idx: slot },
          value: before - be.e.health,
          color: 'blue',
        })
        division *= 2 // fight.c:3729 命中一个活敌后翻倍
      }
    }
    bus.emit({ op: 'playPlayerAttack', playerIdx: actor.idx, targetEnemyIdx: -1 })
    return
  }

  // —— player → enemy 单体(含 DualAttack 双击,fight.c:3618-3674)——
  // sdlpal kBattleActionAttack sTarget!=-1 分支,外层 for t<(dualAttack?2:1) 把整套
  // 伤害(jitter/crit/李逍遥/RandomFloat)+ 攻击动画做两次(仙女剑等武器)。
  if (!actor.isEnemy) {
    const targetEnemy = state.enemies[targetIdx]!
    const bravery = state.players[actor.idx]?.status.bravery ?? 0
    const roleId = state.players[actor.idx]!.roleId
    const hits = (state.players[actor.idx]?.status.dualAttack ?? 0) > 0 ? 2 : 1
    const def = asShort(targetEnemy.e.defense) + (targetEnemy.e.level + 6) * 4
    const physRes = targetEnemy.e.physicalResistance

    bus.emit({ op: 'playPlayerAttack', playerIdx: actor.idx, targetEnemyIdx: targetIdx })

    const segments: BattleAnimFrame[] = []
    for (let t = 0; t < hits; t++) {
      const base = calcPhysicalAttackDamage(str, def, physRes)
      const damage = applyPlayerAttackModifiers(base, state.rng, roleId, bravery).damage
      const before = targetEnemy.e.health
      targetEnemy.e.health = Math.max(0, before - damage)
      const dealt = before - targetEnemy.e.health
      // 每击建一段攻击时间线(damageNum 嵌帧);缺 pos(旧 fixture)→ 即时 emit
      const seg = buildAttackTimeline({
        state,
        actor,
        targetIdx,
        isPlayerTarget: false,
        damage: dealt,
        battleEffectIndex,
        playerRoles,
      })
      if (seg) {
        segments.push(...seg)
      } else {
        bus.emit({ op: 'showDamageNum', target: { kind: 'enemy', idx: targetIdx }, value: dealt, color: 'blue' })
      }
    }
    if (segments.length > 0) startBattleAnim(state, segments, bus)
    return
  }

  // —— 以下仅 enemy → player(player→enemy 已在上方分支处理)——
  // B2 c2:sdlpal fight.c:4924-4929 + 5056-5075 真值:
  //   def = PAL_GetPlayerDefense(基础+装备防,**无 level 项**,global.c:1821-1826),fDefending→×2
  //   physRes 硬编码 2;sDamage = CalcPhysical(str+RandomLong(0,2), def, 2) + RandomLong(0,1);
  //   Protect→sDamage/=2(5059-5062 truthy);<=0→1。
  // 残(c3):fAutoDefend evade(7/17 全免)+ 守护 cover。
  const targetRole = playerRoles.roles[state.players[targetIdx]!.roleId]!
  let def = asShort(targetRole.defense)
  if (state.players[targetIdx]!.defending) def *= 2
  const physRes = 2
  const isPlayerTarget = true

  // str + RandomLong(0,2) 在 CalcPhysical 入参内(fight.c:5056)
  let damage = calcPhysicalAttackDamage(str + state.rng.rangeInclusive(0, 2), def, physRes)
  damage += state.rng.rangeInclusive(0, 1) // fight.c:5057
  if ((state.players[targetIdx]!.status.protect ?? 0) > 0) {
    damage = Math.trunc(damage / 2) // fight.c:5059-5062 Protect 减半
  }
  if (damage <= 0) damage = 1 // fight.c:5069-5072

  // —— 写回 player HP(记 before/after 算钳后真实 delta)——
  const hpBefore = targetRole.hp
  targetRole.hp = Math.max(0, targetRole.hp - damage)
  const dealtDamage = hpBefore - targetRole.hp

  // —— 敌人普通攻击附带等价物品中毒(sdlpal fight.c:5139-5146)——
  //   敌→我 命中后:`attackEquivItemRate >= RandomLong(1,10)` && `poisonResistance < RandomLong(1,100)`
  //   → 跑 rgObject[attackEquivItem].item.wScriptOnUse(wEventObjectID = 被打队员 role)。该毒物品脚本是
  //   0x29 单体毒(毒蛇卵→毒551 / 尸腐肉→552 / 缠魂丝→554 …29 个敌人:蜜蜂/僵尸/蜘蛛/瘟神等)。
  if (actor.isEnemy && isPlayerTarget && equivPoison) {
    const enemy = state.enemies[actor.idx]!.e
    const equivId = enemy.attackEquivItem ?? 0
    const rate = enemy.attackEquivItemRate ?? 0
    const roleId = state.players[targetIdx]!.roleId
    if (
      equivId !== 0
      && rate >= state.rng.rangeInclusive(1, 10)
      && getPlayerPoisonResistance(equivPoison.gs, roleId) < state.rng.rangeInclusive(1, 100)
    ) {
      const scriptOnUse = equivPoison.items.find((it) => it.id === equivId)?.scriptOnUse ?? 0
      if (scriptOnUse > 0) {
        equivPoison.runScript({
          commands: equivPoison.commands,
          ip: scriptOnUse,
          bus,
          runtimeMode: 'battle',
          eventObjectId: roleId, // wEventObjectID = 被打队员 → 脚本 0x29 单体毒之
          battleCtx: { state, target: { type: 'player', idx: targetIdx }, gs: equivPoison.gs },
        })
      }
    }
  }

  // —— emit 命令(playEnemyAttack 留作 present hook;present 当前 no-op)——
  bus.emit({ op: 'playEnemyAttack', enemyIdx: actor.idx, targetPlayerIdx: targetIdx })

  // —— D17a:建物理攻击/受击动画时间线(damageNum 由时间线 i==0 / 命中帧 emit)——
  // 缺 fighter render-state pos(旧 fixture)→ 不建时间线,直接即时 emit showDamageNum
  // (向后兼容:tickPerformAction 见 state.battleAnim 仍 undefined → currentActionIndex++)。
  const built = buildAttackTimeline({
    state,
    actor,
    targetIdx,
    isPlayerTarget,
    damage: dealtDamage,
    battleEffectIndex,
    playerRoles,
  })
  if (built) {
    startBattleAnim(state, built, bus)
    return
  }

  // D17b:target 掉血 → blue(sdlpal `fight.c:648-651/678-681`,sDamage<0)。value 用钳后 delta。
  bus.emit({
    op: 'showDamageNum',
    target: { kind: isPlayerTarget ? 'player' : 'enemy', idx: targetIdx },
    value: dealtDamage,
    color: 'blue',
  })
}

/**
 * D17a:为单体物理攻击/受击建动画时间线。返回 frames(非空)→ 调用方 startBattleAnim;
 * 返回 undefined → fighter render-state 缺(旧 fixture)/ 群攻路径 → 走即时 emit。
 */
function buildAttackTimeline(input: {
  state: BattleState
  actor: ActionQueueItem
  targetIdx: number
  isPlayerTarget: boolean
  damage: number
  battleEffectIndex: number[] | undefined
  playerRoles: PlayerRoles
}): BattleAnimFrame[] | undefined {
  const { state, actor, targetIdx, isPlayerTarget, damage, battleEffectIndex, playerRoles } = input

  if (!actor.isEnemy && !isPlayerTarget) {
    // player → enemy(fight.c:2008-2263)
    const attacker = state.players[actor.idx]
    const targetEnemy = state.enemies[targetIdx]
    if (!attacker?.posOriginal || !targetEnemy?.posOriginal) return undefined
    const role = playerRoles.roles[attacker.roleId]
    const battleSpriteId = role?.spriteNumInBattle ?? 0
    return buildPlayerAttackTimeline({
      attackerPos: attacker.posOriginal,
      attackerIdx: actor.idx,
      targetEnemyPos: targetEnemy.posOriginal,
      targetIdx,
      // core 无 sprite 资源 → enemy_h=0(overlay Y 仅退化 +10;present 可后续精修)
      targetEnemyHeight: 0,
      effectFrameBase: playerEffectFrameBase(battleEffectIndex, battleSpriteId),
      damage,
    })
  }

  if (actor.isEnemy && isPlayerTarget) {
    // enemy → player(fight.c:4910-5149 physical 分支,无 cover / autoDefend 简化)
    const enemyFighter = state.enemies[actor.idx]
    const targetPlayer = state.players[targetIdx]
    if (!enemyFighter?.posOriginal || !targetPlayer?.posOriginal) return undefined
    const role = playerRoles.roles[targetPlayer.roleId]
    const hp = role?.hp ?? 0
    const maxHp = role?.maxHP ?? 0
    return buildEnemyPhysicalTimeline({
      enemyPos: enemyFighter.posOriginal,
      enemyIdx: actor.idx,
      targetPlayerPos: targetPlayer.posOriginal,
      targetIdx,
      enemy: {
        magicFrames: enemyFighter.e.magicFrames,
        attackFrames: enemyFighter.e.attackFrames,
        actWaitFrames: enemyFighter.e.actWaitFrames,
        idleFrames: enemyFighter.e.idleFrames,
      },
      damage,
      targetDied: hp === 0,
      targetDying: isPlayerDying(hp, maxHp),
    })
  }

  return undefined
}
