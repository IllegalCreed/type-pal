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

  // —— 群攻(attackAll 武器):player 且 targetIdx<0(=-1 全体)→ 全体活敌 ——
  // sdlpal kBattleActionAttack sTarget==-1 分支(fight.c:3756+)。每敌独立算 def/res。
  if (!actor.isEnemy && targetIdx < 0) {
    state.enemies.forEach((be, i) => {
      if (be.e.health <= 0) return
      const def = asShort(be.e.defense) + (be.e.level + 6) * 4
      let damage = calcPhysicalAttackDamage(str, def, be.e.physicalResistance)
      if (damage <= 0) damage = 1
      const before = be.e.health
      be.e.health = Math.max(0, be.e.health - damage)
      // D17b:敌人掉血 → blue(sdlpal `fight.c:648-651`)。value 用钳后真实 delta。
      bus.emit({
        op: 'showDamageNum',
        target: { kind: 'enemy', idx: i },
        value: before - be.e.health,
        color: 'blue',
      })
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
  } else {
    // player 攻击 enemy
    const enemy = state.enemies[targetIdx]!.e
    def = asShort(enemy.defense) + (enemy.level + 6) * 4
    physRes = enemy.physicalResistance
    isPlayerTarget = false
  }

  // —— 算 damage ——
  let damage: number
  if (actor.isEnemy) {
    // enemy→player:D3 残(str+RandomLong(0,2) / +RandomLong(0,1) / fAutoDefend evade / Protect /=2,
    //   fight.c:4938/5056-5062)归 D27残 / B2,此处保持简版。
    damage = calcPhysicalAttackDamage(str, def, physRes)
    if (damage <= 0) damage = 1
  } else {
    // player→enemy:D3 全套修饰(jitter / crit / 李逍遥 / RandomFloat,fight.c:3636-3663)
    const base = calcPhysicalAttackDamage(str, def, physRes)
    const bravery = state.players[actor.idx]?.status.bravery ?? 0
    const roleId = state.players[actor.idx]!.roleId
    damage = applyPlayerAttackModifiers(base, state.rng, roleId, bravery).damage
  }

  // —— 写回 HP(记 before/after 算钳后真实 delta) ——
  let hpBefore: number
  let hpAfter: number
  if (isPlayerTarget) {
    const role = playerRoles.roles[state.players[targetIdx]!.roleId]!
    hpBefore = role.hp
    role.hp = Math.max(0, role.hp - damage)
    hpAfter = role.hp
  } else {
    hpBefore = state.enemies[targetIdx]!.e.health
    state.enemies[targetIdx]!.e.health = Math.max(0, state.enemies[targetIdx]!.e.health - damage)
    hpAfter = state.enemies[targetIdx]!.e.health
  }

  const dealtDamage = hpBefore - hpAfter

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

  // —— emit 命令(play{Enemy,Player}Attack 留作 present hook;present 当前 no-op)——
  if (actor.isEnemy) {
    bus.emit({ op: 'playEnemyAttack', enemyIdx: actor.idx, targetPlayerIdx: targetIdx })
  } else {
    bus.emit({ op: 'playPlayerAttack', playerIdx: actor.idx, targetEnemyIdx: targetIdx })
  }

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
