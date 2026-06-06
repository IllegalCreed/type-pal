/**
 * 物理攻击 perform —— M3 T19。
 *
 * 三向路径(implementer verify sdlpal 真值):
 *   - player → enemy   from `reference/sdlpal/fight.c:3625-3635` —— PAL_BattlePlayerPerformAction kBattleActionAttack
 *     str = PAL_GetPlayerAttackStrength(role) = role.attackStrength(已含装备,**无 level 项**,global.c:1757-1764)
 *     def = enemy.wDefense (SHORT) + (enemy.level+6)*4   ← 等级项是**敌方**被打才有
 *     res = enemy.wPhysicalResistance
 *   - enemy → player   from `reference/sdlpal/fight.c:4917-4927` —— PAL_BattleEnemyPerformAction physical
 *     str = (SHORT)enemy.wAttackStrength + (enemy.level+6)*6  (str<0 → str=0)  ← 等级项是**敌方**专属
 *     def = PAL_GetPlayerDefense(role) = role.defense(已含装备,**无 level 项**,global.c:1800-1828)
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
import { calcBaseDamage, calcPhysicalAttackDamage } from '../formulas.js'
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
    // str = PAL_GetPlayerAttackStrength(global.c:1757-1764)= rgwAttackStrength + Σ装备,**无 level 项**
    //   (等级项是敌方专属,fight.c:4917)。role.attackStrength 已 = base+装备(projectRuntimeToBattleRoles
    //   game-state.ts:1279)→ 直接用,绝不再加 (level+6)*6(M3 误套敌方公式的 bug,2026-06-02 审计核源订正)。
    str = asShort(role.attackStrength)
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
    // DualAttack(0x2D 装备/法术授,如玄冥宝刀 / 醉仙望月步)→ 整段群攻做两次(fight.c:3681 for t<(dualAttack?2:1))
    const hits = (state.players[actor.idx]?.status.dualAttack ?? 0) > 0 ? 2 : 1
    const HIT_ORDER = [2, 1, 0, 4, 3] // fight.c:3684 const int index[MAX_ENEMIES_IN_TEAM]
    const roleId = state.players[actor.idx]!.roleId
    const voiceRole = playerRoles.roles[roleId]
    const weaponSound = voiceRole?.weaponSound ?? 0
    const attacker = state.players[actor.idx]
    const hasAnim = !!attacker?.posOriginal
    // sdlpal 群攻每 sweep 各调一次 PAL_BattleShowPlayerAttackAnim(fight.c:3745,在 t-loop 内)→ **每 sweep
    //   一次完整挥砍**(双击 = 两次),各自 i==0 弹该 sweep 伤害数字(PAL_BattleBackupStat 每 swing 后
    //   wPrevHP=wHealth,fight.c:2210/588 → 双击显示两个数字,非一个总和)+ 起手出招声 + 命中武器声各一遍。
    //   故逐 sweep 建挥砍段累加(与单体双击 :220 同构);此前群攻整段只建一次挥砍 + 武器声一遍(user 2026-06-05 报)。
    const segments: BattleAnimFrame[] = []
    const legacyNums: NonNullable<BattleState['battleAnim']>['pendingDamageNums'] = []
    for (let t = 0; t < hits; t++) {
      // 每 sweep crit 重摇、division 重置(fight.c:3683-3688 在 t-loop 内)
      const fCritical = state.rng.rangeInclusive(0, 5) === 0 || bravery > 0
      // M6 出招声(sdlpal fight.c:2058-2071 ShowPlayerAttackAnim 起手,每 sweep 一次):!crit→attackSound,crit→criticalSound。
      //   **改挂时间线 frame.sound**(出招声→swing frame0、武器声→currentFrame=9 帧),由 driver 逐 tick 播 →
      //   双击两 sweep 声音随帧错开各响;此前 loop 内同步 bus.emit voice + playPlayerAttack,两 sweep 同 tick
      //   drain 同 id 重叠成一次(user 2026-06-05 报"群攻双击出招音重叠")。legacy(无 posOriginal)路径仍同步 emit。
      const voice = fCritical ? voiceRole?.criticalSound : voiceRole?.attackSound
      const sweepNums: NonNullable<BattleState['battleAnim']>['pendingDamageNums'] = []
      let division = 1
      for (const slot of HIT_ORDER) {
        const be = state.enemies[slot]
        if (!be || be.e.health <= 0) continue // sdlpal:wObjectID==0 || idx>maxEnemyIndex
        const def = asShort(be.e.defense) + (be.e.level + 6) * 4
        let damage = calcPhysicalAttackDamage(str, def, be.e.physicalResistance)
        if (fCritical) damage *= 3
        damage = damage / division // FLOAT 除(逐敌减半)
        if (damage <= 0) damage = 1
        // sdlpal `wHealth -= (FLOAT)sDamage` → WORD 回写截断(trunc);超杀 WORD 下溢不钳,显示完整算出伤害(钳前扣减)。
        const hpBeforeHit = be.e.health
        const hpAfterUnclamped = Math.trunc(hpBeforeHit - damage)
        be.e.health = Math.max(0, hpAfterUnclamped)
        const dealt = hpBeforeHit - hpAfterUnclamped
        if (dealt > 0) sweepNums.push({ target: { kind: 'enemy', idx: slot }, value: dealt, color: 'blue' })
        division *= 2 // fight.c:3729 命中一个活敌后翻倍
      }
      // M6/D17a:每 sweep 一次挥砍动画 —— sTarget==-1 挥向固定中心 (150,100)(fight.c:2050-2055)。
      //   该 sweep 各掉血敌数字挂其挥砍 i==0 帧(sdlpal DisplayStatChange,fight.c:2209/626-659)。
      if (hasAnim) {
        const swing = buildPlayerAttackTimeline({
          attackerPos: attacker!.posOriginal!,
          attackerIdx: actor.idx,
          targetEnemyPos: { x: 150, y: 100 },
          targetIdx: -1, // 群攻无单体目标 → 跳过单敌染色/抖动
          targetEnemyHeight: 0,
          effectFrameBase: playerEffectFrameBase(battleEffectIndex, voiceRole?.spriteNumInBattle ?? 0),
          damage: 0,
          groupDamageNums: sweepNums,
          attackVoice: voice, // 出招声挂 swing frame0(fight.c:2061-2071)
          weaponSound, // 武器声挂 currentFrame=9 命中帧(fight.c:2124)
        })
        segments.push(...swing)
      } else {
        // legacy(无 posOriginal):无时间线帧承载声音 → 保留同步 emit(出招声 + 武器声 playPlayerAttack)+ 即时数字
        if (voice && voice > 0) bus.emit({ op: 'playSound', soundId: voice })
        bus.emit({ op: 'playPlayerAttack', playerIdx: actor.idx, targetEnemyIdx: -1 })
        legacyNums.push(...sweepNums) // 旧 fixture 无 posOriginal → 即时弹(向后兼容)
      }
    }
    if (hasAnim) {
      if (segments.length > 0) startBattleAnim(state, segments, bus)
    } else {
      for (const dn of legacyNums) bus.emit({ op: 'showDamageNum', ...dn })
    }
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

    const voiceRole = playerRoles.roles[roleId]
    const weaponSound = voiceRole?.weaponSound ?? 0
    const segments: BattleAnimFrame[] = []
    for (let t = 0; t < hits; t++) {
      const base = calcPhysicalAttackDamage(str, def, physRes)
      const mod = applyPlayerAttackModifiers(base, state.rng, roleId, bravery)
      const damage = mod.damage
      // M6 攻击音(sdlpal PAL_BattleShowPlayerAttackAnim 在 dual-attack t-loop 内 fight.c:3673 **每击调一次**):
      //   起手出招声 attackSound(暴击换 criticalSound,fight.c:2065/2069)→ 命中武器声 weaponSound(fight.c:2124)。
      //   **改挂时间线 frame.sound**(出招声→swing frame0,武器声→currentFrame=9 帧),由 driver 逐 tick 播 →
      //   双击两段声音随帧错开各响;此前 loop 内同步 bus.emit voice + playPlayerAttack,两击同 tick drain 同 id
      //   重叠成一次(user 2026-06-05 报"单体双击出招音只响一次")。
      const voice = mod.fCritical ? voiceRole?.criticalSound : voiceRole?.attackSound
      const before = targetEnemy.e.health
      targetEnemy.e.health = Math.max(0, before - damage)
      // sdlpal 玩家打敌人:wHealth 是 WORD,`wHealth -= sDamage`(fight.c:3665)超杀**下溢不钳**,
      //   DisplayStatChange 用 (SHORT)(wHealth-wPrevHP)(fight.c:638)→ 显示**完整算出伤害**,非剩余血。
      //   (敌打玩家才 `if (hp<sDamage) sDamage=hp` 钳剩余血,fight.c:5064 —— 故意不对称。)故 damageNum
      //   用算出的完整 damage,不用钳后 delta;health 仍钳 0 供内部死亡逻辑。
      // 每击建一段攻击时间线(damageNum + 出招/武器声嵌帧);缺 pos(旧 fixture)→ 即时 emit(legacy 同步声音)
      const seg = buildAttackTimeline({
        state,
        actor,
        targetIdx,
        isPlayerTarget: false,
        damage,
        battleEffectIndex,
        playerRoles,
        attackVoice: voice,
        weaponSound,
      })
      if (seg) {
        segments.push(...seg)
      } else {
        // legacy(无 posOriginal):无时间线帧承载声音 → 保留同步 emit(出招声 + 武器声 playPlayerAttack)+ 即时数字
        if (voice && voice > 0) bus.emit({ op: 'playSound', soundId: voice })
        bus.emit({ op: 'playPlayerAttack', playerIdx: actor.idx, targetEnemyIdx: targetIdx })
        bus.emit({ op: 'showDamageNum', target: { kind: 'enemy', idx: targetIdx }, value: damage, color: 'blue' })
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
  // 自动防御闪避和守护 cover 的核心结算已接入;cover 专属跳位/音效表现仍可继续精修。
  const targetRole = playerRoles.roles[state.players[targetIdx]!.roleId]!
  const targetStatus = state.players[targetIdx]!.status

  // B2 c3a/c3b:自动防御闪避 + 守护替挡(fight.c:4936-4985)。fAutoDefend 命中 = 整次物理攻击全免伤
  //   (5052 !fAutoDefend gate 罩住整个伤害块)。
  let fAutoDefend = state.rng.rangeInclusive(0, 16) >= 10 // fight.c:4938 7/17
  const targetDying = isPlayerDying(targetRole.hp, targetRole.maxHP)
  const targetBad = (targetStatus.confused ?? 0) > 0 || (targetStatus.sleep ?? 0) > 0
    || (targetStatus.paralyzed ?? 0) > 0
  // c3b cover(fight.c:4943-4968):坏状态/濒死目标 + fAutoDefend → 查 coveredBy 找健康替挡者
  let iCoverIndex = -1
  if ((targetDying || targetBad) && fAutoDefend) {
    const coveredByRoleId = targetRole.coveredBy ?? 0
    // sdlpal 真值无 w==0 guard:literal 匹配 roleId===coveredBy(0→role0 若在队)
    const coverIdx = state.players.findIndex((p) => p.roleId === coveredByRoleId)
    if (coverIdx >= 0) {
      iCoverIndex = coverIdx
      // 替挡者自身坏状态/濒死 → 挡不了(fight.c:4961-4967)
      const coverer = state.players[coverIdx]!
      const cRole = playerRoles.roles[coverer.roleId]
      const cs = coverer.status
      if (
        isPlayerDying(cRole?.hp ?? 0, cRole?.maxHP ?? 0)
        || (cs.confused ?? 0) > 0 || (cs.sleep ?? 0) > 0 || (cs.paralyzed ?? 0) > 0
      ) {
        iCoverIndex = -1
      }
    }
  }
  // fight.c:4975-4985:无替挡(iCoverIndex==-1)+ 坏状态(混乱/睡眠/麻痹 CLASSIC) → 强制不闪避
  if (iCoverIndex === -1 && targetBad) fAutoDefend = false
  if (fAutoDefend) {
    // 被动格挡(fight.c:5023-5085):不结算伤害(`!fAutoDefend` gate 罩住整个伤害块)。
    //   playEnemyAttack 经 audio 播敌人攻击音(fight.c:4934 wAttackSound);视觉动画走时间线。
    bus.emit({ op: 'playEnemyAttack', enemyIdx: actor.idx, targetPlayerIdx: targetIdx })
    // 修(2026-06-04 user 报"高级草妖普攻只出声、无动作、无受击、无掉血"):此前只 emit 声音 + return,
    //   未建动画 → 玩家看到有声无动画。无替挡(iCoverIndex==-1)的格挡 → 建格挡动画(玩家 frame 3 格挡姿 +
    //   coverSound,敌 lunge 照常,不掉血,fight.c:5025/5052/5082)。
    if (iCoverIndex === -1) {
      const built = buildAttackTimeline({
        state, actor, targetIdx, isPlayerTarget: true, damage: 0,
        battleEffectIndex, playerRoles,
        autoDefend: { coverSound: targetRole.coverSound ?? 0 },
      })
      if (built) {
        startBattleAnim(state, built, bus)
        return
      }
    }
    // iCoverIndex != -1(队友替挡)动画仍留 present hook —— 须目标濒死/坏状态 + 健康替挡者,较少见;
    //   非本次 user 报的"健康角色被动格挡"场景。后续可补 cover 专属动画(coverer 跳位 frame 3)。
    return
  }

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
 * B2 c1b:混乱敌人攻击另一只敌人(sdlpal fight.c:4596-4654 confused 分支)。
 *
 * 真值伤害公式(与普通物理不同,**无 jitter / crit**):
 *   str = (SHORT)attacker.attackStrength + (attacker.level+6)*6   (无 <0 clamp,confused 分支真值)
 *   def = (SHORT)target.defense + (target.level+6)*4
 *   sDamage = CalcBaseDamage(str, def) * 2 / target.physicalResistance
 *   if (sDamage <= 0) sDamage = 1
 *
 * @param state 战斗状态(target 敌 health 会被改)
 * @param attackerIdx 混乱敌 idx(enemies[])
 * @param targetEnemyIdx 被打的友敌 idx(enemies[];decideEnemyAction 已排除自己)
 */
export function performEnemyConfusedAttack(
  state: BattleState,
  attackerIdx: number,
  targetEnemyIdx: number,
  bus: CommandBus,
): void {
  const attacker = state.enemies[attackerIdx]?.e
  const target = state.enemies[targetEnemyIdx]
  if (!attacker || !target || target.e.health <= 0) return

  const str = asShort(attacker.attackStrength) + (attacker.level + 6) * 6
  const def = asShort(target.e.defense) + (target.e.level + 6) * 4
  const base2 = calcBaseDamage(str, def) * 2
  let damage = target.e.physicalResistance !== 0 ? Math.trunc(base2 / target.e.physicalResistance) : base2
  if (damage <= 0) damage = 1

  const before = target.e.health
  target.e.health = Math.max(0, before - damage)
  bus.emit({
    op: 'showDamageNum',
    target: { kind: 'enemy', idx: targetEnemyIdx },
    value: before - target.e.health,
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
  /** 敌→我 被动格挡(fAutoDefend):玩家 frame 3 格挡姿 + coverSound,不结算伤害(fight.c:5023-5085)。 */
  autoDefend?: { coverSound: number }
  /** M6 出招声(attackSound/criticalSound,fight.c:2061-2071;player→enemy 用,挂 swing frame0)。 */
  attackVoice?: number
  /** M6 武器声(weaponSound,fight.c:2124;player→enemy 用,挂 currentFrame=9 命中帧)。 */
  weaponSound?: number
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
      attackVoice: input.attackVoice,
      weaponSound: input.weaponSound,
    })
  }

  if (actor.isEnemy && isPlayerTarget) {
    // enemy → player(fight.c:4910-5149 physical 分支)。cover / autoDefend 结算在上游已完成,
    // 这里构造普通敌方物攻时间线。
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
        // M6 敌方物攻中段/命中音(fight.c:5003 wActionSound / 5084 wCallSound;frame.sound 帧同步播)。
        actionSound: enemyFighter.e.actionSound,
        callSound: enemyFighter.e.callSound,
      },
      damage,
      targetDied: hp === 0,
      targetDying: isPlayerDying(hp, maxHp),
      autoDefend: input.autoDefend !== undefined,
      coverSound: input.autoDefend?.coverSound ?? 0,
    })
  }

  return undefined
}
