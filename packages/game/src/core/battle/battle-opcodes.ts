/**
 * M5.B-w2.a:battle-context opcode handler。
 *
 * sdlpal `script.c` 内 100+ opcode 共用 `PAL_InterpretInstruction`,但 battle
 * 上下文(`g_Battle.fInBattle == TRUE`)只跑特定子集 — 对 enemy 的 wScriptOnReady /
 * wScriptOnTurnStart bytecode 解释。
 *
 * 本模块实现 5-7 个核心 battle opcode,event-system runScript 的 raw case 在
 * runtimeMode='battle' 时 dispatch 到这里。其余未具名 opcode 仍走 console.debug
 * skip(D26 兜底)。
 *
 * 处理逻辑:
 *  - 返回 `newIp`:opcode 改了 ip(jump),caller 应跳到返回值
 *  - 返回 undefined:opcode 未消费(caller 走原 skip + ip++)
 *  - 返回 -1:opcode 消费但不改 ip(caller 应 ip++,等价于默认)
 */

import type { BattleCtx } from '../event-system.js'
import { buildStealTimeline } from './anim-timeline.js'
import { startBattleAnim } from './battle-anim-driver.js'
import { resolveObjectMagic, simulateMagic } from './magic-damage.js'

/** SHORT cast(同 formulas.ts 私函)。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

/**
 * D17b:HP-mutate 后 emit 战斗数字弹幕(对照 sdlpal `fight.c:602-716
 * PAL_BattleDisplayStatChange` —— 每次行动后对所有 wPrevHP!=wHealth 的敌/我画数字)。
 *
 * sdlpal:`sDamage = wHealth - wPrevHP`(= after - before),
 *   sDamage < 0(掉血)→ kNumColorBlue,value = before - after;
 *   sDamage > 0(回血)→ kNumColorYellow,value = after - before;
 *   sDamage == 0 → 不画。
 * 用 before/after(钳后实际 HP)算 value —— 与 sdlpal 一致(钳到 0 时显示真实损失,
 *   非原始伤害)。`ctx.bus` 缺省(未注入 / 测试不传)→ 静默 no-op(不抛)。
 */
function emitDamageNum(
  ctx: BattleCtx,
  kind: 'enemy' | 'player',
  idx: number,
  before: number,
  after: number,
): void {
  if (after === before)
    return
  const color = after < before ? 'blue' : 'yellow'
  const value = after < before ? before - after : after - before
  ctx.bus?.emit({ op: 'showDamageNum', target: { kind, idx }, value, color })
}

/**
 * sdlpal `global.c:1254 PAL_IncreaseHPMP` 1:1 port —— 战斗语境作用 ctx.playerRoles.roles[roleId]
 * (= sdlpal `gpGlobals->g.PlayerRoles`,战斗内外**同一份** HP/MP 真源,battle 直接读这份)。
 *
 * 真值要点:
 *  - **仅活人**(`if (rgwHP > 0)`):死人(hp==0)不被 0x1B/0x1C/0x1D 治疗(复活走 0x22)。
 *  - HP += sHP clamp [0, maxHP];MP += sMP clamp [0, maxMP]。
 *  - 返回是否**真改**(over-treatment:已满 / 无变化 → FALSE)→ 上层 g_fScriptSuccess gate。
 */
function increaseBattleHPMP(
  role: { hp: number; mp: number; maxHP: number; maxMP: number },
  sHP: number,
  sMP: number,
): boolean {
  if (role.hp <= 0)
    return false // 仅活人(global.c:1290)
  const origHP = role.hp
  const origMP = role.mp
  role.hp = Math.max(0, Math.min(role.maxHP, role.hp + sHP))
  role.mp = Math.max(0, Math.min(role.maxMP, role.mp + sMP))
  return role.hp !== origHP || role.mp !== origMP
}

/** sdlpal `script.c:1630-1640` 0x0042:simulate magic(PAL_BattleSimulateMagic,fight.c:5300)。 */
const OP_SIMULATE_MAGIC = 0x0042

/** sdlpal `script.c:2007-2014` 0x0066:throw weapon —— 计算 w 后调同一 PAL_BattleSimulateMagic。 */
const OP_THROW_WEAPON = 0x0066

/** sdlpal `script.c:0021` 0x0021:inflict flat damage to enemy(op0!=0 全体,op1=damage)。 */
const OP_INFLICT_DAMAGE = 0x0021

/** sdlpal `script.c:0028` 0x0028:apply poison to enemy(抗性判定 + 去重,op1=poison id)。 */
const OP_APPLY_POISON = 0x0028
/** sdlpal `script.c:1287-1329` 0x002A:战斗 cure enemy poison by kind(op0!=0 全敌 / 否则单敌;清 poisonId==op1)。 */
const OP_CURE_ENEMY_POISON_KIND = 0x002A

/** sdlpal `script.c:0057` 0x0057:set magic baseDamage = casterMP * (op1||8),清 casterMP(酒神)。 */
const OP_SET_MAGIC_DAMAGE_BY_MP = 0x0057

/** sdlpal `script.c:0088` 0x0088:set magic baseDamage = min(cash,5000)*2/5,扣 cash(乾坤一掷)。 */
const OP_SET_MAGIC_DAMAGE_BY_MONEY = 0x0088

/** sdlpal `script.c:005E` 0x005E:jump if enemy 无 op0 种毒 → op1。 */
const OP_JUMP_IF_NO_POISON = 0x005E

/** sdlpal `MAX_POISONS`(每敌最多同时中毒槽数)。 */
const MAX_POISONS = 16

/** sdlpal `script.c:009E` 0x009E:enemy summon(召唤敌人到空槽)。 */
const OP_ENEMY_SUMMON = 0x009E

/** sdlpal `palcommon.h:60` MAX_ENEMIES_IN_TEAM —— 战斗最多 5 敌(0x9E 召唤房间上限)。 */
const MAX_ENEMIES_IN_TEAM = 5

/** sdlpal `script.c:009C` 0x009C:enemy division(仅 1 活敌时分裂)。 */
const OP_ENEMY_DIVISION = 0x009C

/** sdlpal `script.c:009F` 0x009F:enemy transform into another(保留 health)。 */
const OP_ENEMY_TRANSFORM = 0x009F

/** sdlpal `script.c:005B` 0x005B:halve enemy HP(w=health/2+1,cap op0)。 */
const OP_HALVE_ENEMY_HP = 0x005B

/** sdlpal `script.c:0039` 0x0039:drain HP from enemy → caster player(clamp maxHP)。 */
const OP_DRAIN_HP = 0x0039

/** sdlpal `script.c:005A` 0x005A:halve player HP(wEventObjectID = 目标队员 role)。 */
const OP_HALVE_PLAYER_HP = 0x005A

/** sdlpal `script.c:001B` 0x001B:player HP delta(治疗术 scriptOnSuccess;global.c:1254 PAL_IncreaseHPMP)。 */
const OP_INCREASE_HP = 0x001B

/** sdlpal `script.c:001C` 0x001C:player MP delta(凝神归元 等)。 */
const OP_INCREASE_MP = 0x001C

/** sdlpal `script.c:001D` 0x001D:player HP+MP 双 delta(同 operand[1])。 */
const OP_INCREASE_HP_MP = 0x001D

/** sdlpal `script.c:0022` 0x0022:revive dead player(HP=maxHP*op1/10 + 清状态/毒;还魂咒/赎魂)。 */
const OP_REVIVE_PLAYER = 0x0022

/** sdlpal `script.c:3267` 0x05:Redraw screen — PAL_ClearDialog(TRUE)(清当前对话框,另起新段)。 */
const OP_REDRAW_SCREEN = 0x0005

/** sdlpal `script.c:3428` 0x8E:Restore screen — PAL_ClearDialog(TRUE)(结束/清当前对话框)。 */
const OP_RESTORE_SCREEN = 0x008E

/** sdlpal `script.c:005F` 0x005F:kill player immediately(rgwHP[eventObject]=0)。 */
const OP_KILL_PLAYER = 0x005F

/** sdlpal `script.c:005C` 0x005C:hide party(iHidingTime = -op0)。 */
const OP_HIDE_PARTY = 0x005C

/** sdlpal `script.c:006B` 0x006B:blow away enemies(iBlow = (SHORT)op0)。 */
const OP_BLOW_AWAY = 0x006B

/** sdlpal `script.c:0089` 0x0089:set battle result(BattleResult = op0)。 */
const OP_SET_BATTLE_RESULT = 0x0089

/** sdlpal `script.c:008A` 0x008A:enable auto-battle for next battle(fAutoBattle=TRUE)。 */
const OP_ENABLE_AUTO_BATTLE = 0x008A

/** sdlpal `script.c:0033` 0x0033:collect enemy for items(wCollectValue += enemy.collectValue,否则 jump op0)。 */
const OP_COLLECT_ENEMY = 0x0033

/** sdlpal `script.c:003A` 0x003A:player flee(boss → jump op0,否则 PlayerEscape)。 */
const OP_PLAYER_FLEE = 0x003A

/** sdlpal `script.c:0030` 0x0030:temp +op1% 某 stat(op0=row,梦蛇 等)。 */
const OP_BUFF_PLAYER_STAT_PCT = 0x0030

/** sdlpal `script.c:0031` 0x0031:temp 改战斗精灵(present-only)。 */
const OP_CHANGE_BATTLE_SPRITE = 0x0031

/** sdlpal `script.c:0092` 0x0092:show magic-casting anim(present-only)。 */
const OP_SHOW_MAGIC_ANIM = 0x0092

/** sdlpal `script.c:006A` 0x006A:PAL_BattleStealFromEnemy(target, op0=stealRate)。 */
const OP_STEAL_FROM_ENEMY = 0x006A

/** 0x30 op0(PlayerRoles 结构 WORD row,= PLAYERROLES_ROW)→ PlayerRole stat 字段。 */
const STAT_ROW_FIELD: Record<number, 'attackStrength' | 'magicStrength' | 'defense' | 'dexterity'> = {
  17: 'attackStrength',
  18: 'magicStrength',
  19: 'defense',
  20: 'dexterity',
}

/** sdlpal `script.c:2025-2032` 0x0068:if (g_Battle.fEnemyMoving) jump op0。 */
const OP_JUMP_IF_ENEMY_TURN = 0x0068

/** sdlpal `script.c:2091-2113` 0x0091:if enemy 不是同种里第一个(self_pos>1) jump op0。 */
const OP_JUMP_IF_ENEMY_NOT_FIRST = 0x0091

/** sdlpal `script.c:1983-1993` 0x0064:if enemy.hp * 100 > maxHp * operand[0] → jump operand[1] */
const OP_JUMP_IF_ENEMY_HP_ABOVE = 0x0064

/** sdlpal `script.c:2016-2023` 0x0067:enemy.wMagic = operand[0],wMagicRate = operand[1]||10 */
const OP_ENEMY_USE_MAGIC = 0x0067

/** sdlpal `script.c:1957-1965` 0x0061:if !player_poisoned → jump operand[1] */
const OP_JUMP_IF_PLAYER_NOT_POISONED = 0x0061

/** sdlpal `script.c:相关` 0x0069:enemy escape — set e.health = 0 让外层判 dead 等价处理 */
const OP_ENEMY_ESCAPE = 0x0069

/** sdlpal `script.c:相关` 0x0060:Immediate KO enemy(operand[0] 是 enemy index) */
const OP_ENEMY_IMMEDIATE_KO = 0x0060

interface DispatchResult {
  /** 消费了 opcode → true;未消费 → false(caller 走 raw skip) */
  consumed: boolean
  /** 若 opcode 改了 ip,返回新 ip;否则 undefined caller ip++ */
  newIp?: number
}

/**
 * 派发 battle-context opcode。返回 consumed=false 时 caller 走 raw skip。
 */
export function dispatchBattleOpcode(
  opcode: number,
  operands: readonly number[],
  ctx: BattleCtx,
): DispatchResult {
  const state = ctx.state

  switch (opcode) {
    case OP_SIMULATE_MAGIC: {
      // sdlpal `script.c:1630-1640` + PAL_BattleSimulateMagic(`fight.c:5300-5400`):
      //   op0 = magic object id;op1 = baseDamage 操作数(投掷符/卵=0)= 当 magStr;
      //   op2 = target+1(`i = (SHORT)op2 - 1; if (i<0) i = wEventObjectID`)。
      // 主要由投掷物 scriptOnThrow 用(符/镖/卵/蛊)。
      const tables = ctx.magicTables
      if (!tables)
        return { consumed: true } // 未注入 magic 表 → no-op(防御,避免静默错算)

      const op2 = operands[2] ?? 0
      const i = asShort(op2) - 1
      // i>=0 → 显式目标 op2-1;否则 eventObjectID(simulateMagic 内再 <0 → 自动选敌)
      const targetIdx = i >= 0 ? i : ctx.target?.idx

      const results = simulateMagic({
        state,
        magicObjId: operands[0] ?? 0,
        magStr: operands[1] ?? 0,
        targetIdx,
        objectMagics: tables.objectMagics,
        magics: tables.magics,
        rngFactor: 1 + state.rng.next() * 0.1, // sdlpal RandomFloat(10,11)/10
      })
      for (const r of results)
        emitDamageNum(ctx, 'enemy', r.enemyIdx, r.hpBefore, r.hpAfter)
      return { consumed: true }
    }

    case OP_THROW_WEAPON: {
      // sdlpal `script.c:2007-2014`:
      //   w = op1*5 + PAL_GetPlayerAttackStrength(movingPlayer) * RandomLong(0,3);
      //   PAL_BattleSimulateMagic((SHORT)wEventObjectID, op0, w)。
      // 32 个可投掷武器(长鞭/木剑/铁剑/仙女剑/越女剑…)的 scriptOnThrow 用。
      const tables = ctx.magicTables
      if (!tables)
        return { consumed: true }

      // attackStrength = PAL_GetPlayerAttackStrength(movingPlayer = caster);装备加成略(同 attack.ts)
      let attackStr = 0
      if (ctx.caster?.type === 'player' && ctx.playerRoles) {
        const roleId = state.players[ctx.caster.idx]?.roleId
        const role = roleId !== undefined ? ctx.playerRoles.roles[roleId] : undefined
        if (role)
          attackStr = asShort(role.attackStrength)
      }
      const w = (operands[1] ?? 0) * 5 + attackStr * state.rng.rangeInclusive(0, 3)

      const results = simulateMagic({
        state,
        magicObjId: operands[0] ?? 0,
        magStr: w,
        targetIdx: ctx.target?.idx, // sdlpal:sTarget = (SHORT)wEventObjectID
        objectMagics: tables.objectMagics,
        magics: tables.magics,
        rngFactor: 1 + state.rng.next() * 0.1,
      })
      for (const r of results)
        emitDamageNum(ctx, 'enemy', r.enemyIdx, r.hpBefore, r.hpAfter)
      return { consumed: true }
    }

    case OP_INFLICT_DAMAGE: {
      // sdlpal `script.c:0021`:op0!=0 → 全体敌人 health -= op1;否则单体(wEventObjectID=ctx.target)。
      // 梅花镖/银针 scriptOnThrow 真伤害(0x42 是 0 伤害动画 sentinel)。毒系投掷物 + 毒 tick 也用。
      const dmg = operands[1] ?? 0
      if ((operands[0] ?? 0) !== 0) {
        state.enemies.forEach((e, i) => {
          const before = e.e.health
          e.e.health = Math.max(0, e.e.health - dmg)
          emitDamageNum(ctx, 'enemy', i, before, e.e.health)
        })
      }
      else {
        const idx = ctx.target?.idx
        const enemy = idx !== undefined ? state.enemies[idx] : undefined
        if (enemy) {
          const before = enemy.e.health
          enemy.e.health = Math.max(0, enemy.e.health - dmg)
          emitDamageNum(ctx, 'enemy', idx!, before, enemy.e.health)
        }
      }
      return { consumed: true }
    }

    case OP_APPLY_POISON: {
      // sdlpal `script.c:0028`:op0!=0 → 全体;否则单体(wEventObjectID=ctx.target)。op1 = poison id。
      // 每目标:RandomLong(0,9) >= resistanceToSorcery 通过 → 若 op1 未在 poisons 且槽未满 → 加
      // { poisonId: op1, scriptEntry: objectPoisons[op1].enemyScript }(scriptEntry 每回合 tick 跑)。
      // 毒蛇卵/卵/蛊 scriptOnThrow 用。注:sdlpal 立即跑一次 wEnemyScript,ts 改由 postAction tick 跑
      //(差一拍,总伤害近似)。
      const poisonId = operands[1] ?? 0
      const poison = ctx.objectPoisons?.[poisonId]
      const scriptEntry = poison && poison.id === poisonId ? poison.enemyScript : 0
      const applyTo = (enemyIdx: number): void => {
        const enemy = state.enemies[enemyIdx]
        if (!enemy)
          return
        // 抗性:RandomLong(0,9) >= resistanceToSorcery 才中毒(resist 0 → 总中)
        if (state.rng.rangeInclusive(0, 9) < (enemy.resistanceToSorcery ?? 0))
          return
        const poisons = (enemy.poisons ??= [])
        if (poisons.some(p => p.poisonId === poisonId))
          return // 已中同毒(去重)
        if (poisons.length >= MAX_POISONS)
          return // 槽满
        poisons.push({ poisonId, scriptEntry })
      }
      if ((operands[0] ?? 0) !== 0) {
        state.enemies.forEach((_, i) => applyTo(i))
      }
      else if (ctx.target?.idx !== undefined) {
        applyTo(ctx.target.idx)
      }
      return { consumed: true }
    }

    case OP_CURE_ENEMY_POISON_KIND: {
      // sdlpal `script.c:1287-1329`:op0!=0 → 全敌;否则单敌(ctx.target)。遍历毒槽清 poisonId==op1。
      const poisonId = operands[1] ?? 0
      const cure = (enemyIdx: number): void => {
        const enemy = state.enemies[enemyIdx]
        if (enemy?.poisons) enemy.poisons = enemy.poisons.filter((p) => p.poisonId !== poisonId)
      }
      if ((operands[0] ?? 0) !== 0) state.enemies.forEach((_, i) => cure(i))
      else if (ctx.target?.type === 'enemy' && ctx.target.idx !== undefined) cure(ctx.target.idx)
      return { consumed: true }
    }

    case OP_JUMP_IF_NO_POISON: {
      // sdlpal `script.c:005E`:遍历敌人(wEventObjectID)毒槽,若无 op0 种毒 → jump op1。
      // wEventObjectID = 被作用敌人:throw 时 ctx.target;敌人自身脚本/毒 tick 时 caster。
      const idx = ctx.target?.idx ?? (ctx.caster?.type === 'enemy' ? ctx.caster.idx : undefined)
      const enemy = idx !== undefined ? state.enemies[idx] : undefined
      const has = enemy?.poisons?.some(p => p.poisonId === (operands[0] ?? 0)) ?? false
      if (!has)
        return { consumed: true, newIp: operands[1] ?? 0 }
      return { consumed: true }
    }

    case OP_SET_MAGIC_DAMAGE_BY_MP: {
      // sdlpal `script.c:0057`:i = op1?op1:8; magic[rgObject[op0].magic.magicNumber].wBaseDamage
      //   = casterMP * i; casterMP = 0。caster = wEventObjectID = 施法队员。酒神 scriptOnUse。
      // 之后 performMagic 的 E1 inline 伤害读这个新 baseDamage 结算。
      const tables = ctx.magicTables
      const objMagic = tables ? resolveObjectMagic(operands[0] ?? 0, tables.objectMagics) : undefined
      const magic = objMagic ? tables!.magics.find(m => m.id === objMagic.magicNumber) : undefined
      if (!magic)
        return { consumed: true }
      const i = (operands[1] ?? 0) === 0 ? 8 : (operands[1] ?? 0)
      let role
      if (ctx.caster?.type === 'player' && ctx.playerRoles) {
        const roleId = state.players[ctx.caster.idx]?.roleId
        role = roleId !== undefined ? ctx.playerRoles.roles[roleId] : undefined
      }
      magic.baseDamage = (role?.mp ?? 0) * i
      if (role)
        role.mp = 0
      return { consumed: true }
    }

    case OP_SET_MAGIC_DAMAGE_BY_MONEY: {
      // sdlpal `script.c:0088`:i = min(dwCash, 5000); dwCash -= i;
      //   magic[..].wBaseDamage = i * 2 / 5。乾坤一掷 scriptOnUse。之后 E1 读新 baseDamage。
      const tables = ctx.magicTables
      const objMagic = tables ? resolveObjectMagic(operands[0] ?? 0, tables.objectMagics) : undefined
      const magic = objMagic ? tables!.magics.find(m => m.id === objMagic.magicNumber) : undefined
      if (!magic || !ctx.gs)
        return { consumed: true }
      const i = Math.min(ctx.gs.dwCash, 5000)
      ctx.gs.dwCash -= i
      magic.baseDamage = Math.floor((i * 2) / 5)
      return { consumed: true }
    }

    case OP_HALVE_ENEMY_HP: {
      // sdlpal `script.c:005B`:w = enemy.wHealth/2 + 1; if (w > op0) w = op0; wHealth -= w。
      // 无影毒 scriptOnThrow:wEventObjectID = 被掷敌人 = ctx.target。
      const idx = ctx.target?.idx
      if (idx === undefined)
        return { consumed: true }
      const enemy = state.enemies[idx]
      if (!enemy)
        return { consumed: true }
      let w = Math.floor(enemy.e.health / 2) + 1
      const cap = operands[0] ?? 0
      if (w > cap)
        w = cap
      const before = enemy.e.health
      enemy.e.health = Math.max(0, enemy.e.health - w)
      emitDamageNum(ctx, 'enemy', idx, before, enemy.e.health)
      return { consumed: true }
    }

    case OP_KILL_PLAYER: {
      // sdlpal `script.c:005F`:rgwHP[wEventObjectID] = 0。target 队员(退回 caster)。
      const sel = ctx.target?.type === 'player'
        ? ctx.target
        : (ctx.caster?.type === 'player' ? ctx.caster : undefined)
      if (sel && ctx.playerRoles) {
        const roleId = state.players[sel.idx]?.roleId
        const role = roleId !== undefined ? ctx.playerRoles.roles[roleId] : undefined
        if (role) {
          const before = role.hp
          role.hp = 0
          emitDamageNum(ctx, 'player', sel.idx, before, role.hp)
        }
      }
      return { consumed: true }
    }

    case OP_HIDE_PARTY: {
      // sdlpal `script.c:005C`:g_Battle.iHidingTime = -(INT)op0。
      state.iHidingTime = -(operands[0] ?? 0)
      return { consumed: true }
    }

    case OP_BLOW_AWAY: {
      // sdlpal `script.c:006B`:g_Battle.iBlow = (SHORT)op0。(present 消费位移击退;本层存值。)
      state.iBlow = asShort(operands[0] ?? 0)
      return { consumed: true }
    }

    case OP_SET_BATTLE_RESULT: {
      // sdlpal `script.c:0089`:g_Battle.BattleResult = op0。
      // battle.h:3=Won / 1=Lost / 0xFFFF=Fleed / 0=Terminated(结束无奖励)/ 1000+=OnGoing(不改)。
      const r = operands[0] ?? 0
      if (r === 3)
        state.phase = 'won'
      else if (r === 1)
        state.phase = 'lost'
      else if (r === 0xFFFF || r === 0)
        state.phase = 'fleed'
      // 1000+(ongoing / pause)不改 phase
      return { consumed: true }
    }

    case OP_ENABLE_AUTO_BATTLE: {
      // sdlpal `script.c:008A`:gpGlobals->fAutoBattle = TRUE。(消费方 auto-pick 未做。)
      if (ctx.gs)
        ctx.gs.fAutoBattle = true
      return { consumed: true }
    }

    case OP_COLLECT_ENEMY: {
      // sdlpal `script.c:0033`:if (enemy.wCollectValue != 0) gpGlobals->wCollectValue += it;
      //   else jump op0(无可收集 → 失败分支)。enemy = wEventObjectID(ctx.target / caster)。
      const idx = ctx.target?.idx ?? (ctx.caster?.type === 'enemy' ? ctx.caster.idx : undefined)
      const enemy = idx !== undefined ? state.enemies[idx] : undefined
      const cv = enemy?.e.collectValue ?? 0
      if (cv !== 0) {
        if (ctx.gs)
          ctx.gs.wCollectValue += cv
        return { consumed: true }
      }
      return { consumed: true, newIp: operands[0] ?? 0 }
    }

    case OP_PLAYER_FLEE: {
      // sdlpal `script.c:003A`:if (fIsBoss) jump op0; else PAL_BattlePlayerEscape()。
      if (state.isBoss)
        return { consumed: true, newIp: operands[0] ?? 0 }
      state.phase = 'fleed'
      return { consumed: true }
    }

    case OP_BUFF_PLAYER_STAT_PCT: {
      // sdlpal `script.c:0030`:临时按 % 增益某 stat。
      //   p[Extra][op0*MAX+role] = p1[PlayerRoles][op0*MAX+role] * (SHORT)op1 / 100
      //   即 Extra slot = base*op1/100,装备 getter 合成后 effective = base + base*op1/100。
      //   op2==0 → role=wEventObjectID(施法/使用者);else role=op2-1。
      // ts:battle 直接读 role stat(不走 equip-effect getter,D14 残)→ 直接把 effective 值写回
      //   role.{stat}(= base + trunc(base*op1/100)),functional in battle。
      // **残**:sdlpal 用 per-battle Extra slot,战斗末清;ts mutate role 会持久(多次使用叠加)。
      //   忠实需 per-battle temp-buff 模型 + 战斗末 reset(同 D14 残)。
      if (!ctx.playerRoles)
        return { consumed: true }
      const op2 = operands[2] ?? 0
      let roleId: number | undefined
      if (op2 > 0) {
        roleId = op2 - 1
      } else {
        const sel = ctx.caster?.type === 'player'
          ? ctx.caster
          : (ctx.target?.type === 'player' ? ctx.target : undefined)
        roleId = sel ? state.players[sel.idx]?.roleId : undefined
      }
      const role = roleId !== undefined ? ctx.playerRoles.roles[roleId] : undefined
      const field = STAT_ROW_FIELD[operands[0] ?? 0]
      if (role && field) {
        const base = role[field]
        role[field] = base + Math.trunc(base * asShort(operands[1] ?? 0) / 100)
      }
      return { consumed: true }
    }

    case OP_CHANGE_BATTLE_SPRITE: {
      // sdlpal `script.c:0031`:rgEquipmentEffect[Extra].rgwSpriteNumInBattle[wEventObjectID] = op0
      //   —— 临时替换队员战斗精灵号(present-only)。
      // present-battle 当前只画 idle frame[0] 静态精灵(D17 演出 stub)→ 本逻辑层 no-op,
      //   待 present 精灵替换实现后接线。
      return { consumed: true }
    }

    case OP_SHOW_MAGIC_ANIM: {
      // sdlpal `script.c:0092`:PAL_BattleShowPlayerPreMagicAnim + 全队 iColorShift 渐变 cycle
      //   —— 纯施法前摇动画(present-only)。
      // present-battle 跳过所有战斗动画(D17)→ no-op。
      return { consumed: true }
    }

    case OP_STEAL_FROM_ENEMY: {
      // sdlpal `fight.c:5193 PAL_BattleStealFromEnemy(target, stealRate=op0)`:
      //   大段是偷窃动画(pos/delay/colorShift)→ present-only 跳过(D17)。核心(5253-5297):
      //   if (enemy.nStealItem > 0 && (RandomLong(0,10) <= stealRate || stealRate==0)):
      //     wStealItem==0 → 偷钱:c = nStealItem / RandomLong(2,3); nStealItem-=c; dwCash+=c
      //     else          → 偷物:nStealItem--; AddItem(wStealItem,1)
      //   ts:nStealItem=enemy.e.stealItemCount(per-battle copy,偷一次减一次);wStealItem=stealItem。
      //   偷得提示 dialog(PAL_ShowDialogText)是 present 层 → 跳过。
      const idx = ctx.target?.idx
      const enemy = idx !== undefined ? state.enemies[idx] : undefined
      if (!enemy || !ctx.gs)
        return { consumed: true }
      // 偷窃动画(fight.c:5218-5246):caster=偷窃队员,冲到敌前 5 步 + 敌闪白。
      const casterIdx = ctx.caster?.type === 'player' ? ctx.caster.idx : undefined
      if (ctx.bus && casterIdx !== undefined && idx !== undefined && enemy.posOriginal) {
        startBattleAnim(state, buildStealTimeline(casterIdx, idx, enemy.posOriginal), ctx.bus)
      }
      const stealRate = operands[0] ?? 0
      // sdlpal && 左短路:nStealItem<=0 时不抽 RandomLong
      if ((enemy.e.stealItemCount ?? 0) > 0) {
        const roll = state.rng.rangeInclusive(0, 10) // RandomLong(0,10)
        if (roll <= stealRate || stealRate === 0) {
          if ((enemy.e.stealItem ?? 0) === 0) {
            // 偷钱:c = nStealItem / RandomLong(2,3)(整除)
            const c = Math.trunc(enemy.e.stealItemCount / state.rng.rangeInclusive(2, 3))
            enemy.e.stealItemCount -= c
            ctx.gs.dwCash += c
            // 偷取成功提示 —— CLASSIC 真值 fight.c:5267-5296 `PAL_StartDialog(kDialogCenterWindow)
            //   + PAL_ShowDialogText`(**非 banner**;banner 那条在 `#ifndef PAL_CLASSIC` text.c:1671)。
            //   推 battleDialogQueue narration(= kDialogCenterWindow 居中单行阴影框,跟大世界"获得XX"
            //   同一 UI,drawNarrationDialog)。`@` toggle 红(text.c:1504-1516);WORD34 获得 / WORD10 文钱。
            //   tickBattleDialog 的 `!battleAnim` 守卫让此框在偷窃冲刺动画播完后才显示(对齐 sdlpal
            //   先 5218-5251 动画后 5288-5296 对话)。
            state.battleDialogQueue ??= []
            state.battleDialogQueue.push({ text: `@获得 @${c} @文钱@`, style: 'narration', clearBefore: true })
          } else {
            // 偷物:nStealItem--; AddItem(wStealItem,1)
            enemy.e.stealItemCount--
            const itemId = enemy.e.stealItem
            const entry = ctx.gs.inventory.find((e) => e.itemId === itemId)
            if (entry)
              entry.count = Math.min(99, entry.count + 1)
            else
              ctx.gs.inventory.push({ itemId, count: 1 })
            // 偷取成功提示居中框"获得 物品名"(同偷钱;sdlpal "%ls@%ls@" → 获得 默认色 + 物品名红)。
            const name = ctx.items?.find((it) => it.id === itemId)?._name ?? '道具'
            state.battleDialogQueue ??= []
            state.battleDialogQueue.push({ text: `获得@${name}@`, style: 'narration', clearBefore: true })
          }
        }
      }
      return { consumed: true }
    }

    case OP_HALVE_PLAYER_HP: {
      // sdlpal `script.c:005A`:rgwHP[wEventObjectID] /= 2。wEventObjectID = 目标队员 role。
      // 无影毒 scriptOnUse(使用 → 目标队员 HP 减半)。target=队员;无 player target 退回 caster。
      // 注:无影毒-use 的可达性待 item **队员**目标路由(performBattleAction 现强制 item→enemy
      // 目标),handler 本身正确就绪。
      const sel = ctx.target?.type === 'player'
        ? ctx.target
        : (ctx.caster?.type === 'player' ? ctx.caster : undefined)
      if (sel && ctx.playerRoles) {
        const roleId = state.players[sel.idx]?.roleId
        const role = roleId !== undefined ? ctx.playerRoles.roles[roleId] : undefined
        if (role) {
          const before = role.hp
          role.hp = Math.floor(role.hp / 2)
          emitDamageNum(ctx, 'player', sel.idx, before, role.hp)
        }
      }
      return { consumed: true }
    }

    case OP_INCREASE_HP:
    case OP_INCREASE_MP:
    case OP_INCREASE_HP_MP: {
      // sdlpal `script.c:867-950` + `global.c:1254 PAL_IncreaseHPMP`:player HP/MP delta。
      //   战斗语境写 ctx.playerRoles(= sdlpal gpGlobals->g.PlayerRoles,战内外同一份 HP 真源)。
      // 治疗法术 scriptOnSuccess 跑(气疗术=0x1B / 凝神归元=0x1C / …);performMagic 现已在
      //   scriptOnUse 后跑 scriptOnSuccess(fight.c:4221),故本 handler 在战斗里可达。
      //
      // 目标(script.c:871/884):operand[0]!=0 → 全体队员;否则 wEventObjectID = target 队员
      //   (治疗 magic 的 scriptOnSuccess 用 w = action.sTarget 的 wPlayerRole → ctx.target;退回 caster)。
      // delta = (SHORT)operand[1]。仅活人 + clamp(increaseBattleHPMP)。
      if (!ctx.playerRoles)
        return { consumed: true }
      const applyAll = (operands[0] ?? 0) !== 0
      const delta = asShort(operands[1] ?? 0)
      const doHp = opcode === OP_INCREASE_HP || opcode === OP_INCREASE_HP_MP
      const doMp = opcode === OP_INCREASE_MP || opcode === OP_INCREASE_HP_MP
      let targetPlayerIdxs: number[]
      if (applyAll) {
        targetPlayerIdxs = state.players.map((_, i) => i)
      }
      else {
        const sel = ctx.target?.type === 'player'
          ? ctx.target
          : (ctx.caster?.type === 'player' ? ctx.caster : undefined)
        targetPlayerIdxs = sel ? [sel.idx] : []
      }
      let anyChanged = false
      for (const pIdx of targetPlayerIdxs) {
        const roleId = state.players[pIdx]?.roleId
        const role = roleId !== undefined ? ctx.playerRoles.roles[roleId] : undefined
        if (!role)
          continue
        const beforeHp = role.hp
        const beforeMp = role.mp
        if (increaseBattleHPMP(role, doHp ? delta : 0, doMp ? delta : 0))
          anyChanged = true
        // sdlpal PAL_BattleDisplayStatChange(fight.c:602-712):HP 变化 → yellow(回)/blue(损);
        //   MP **仅增**(sDamage>0)→ cyan(704-709 "Only show MP increasing",减 MP 不画)。
        if (doHp)
          emitDamageNum(ctx, 'player', pIdx, beforeHp, role.hp)
        if (doMp && role.mp > beforeMp)
          ctx.bus?.emit({ op: 'showDamageNum', target: { kind: 'player', idx: pIdx }, value: role.mp - beforeMp, color: 'cyan' })
      }
      // g_fScriptSuccess(script.c:871-892):0x1B applyAll → = anyChanged(873 先 FALSE,880 任一改 TRUE);
      //   单体 → 仅 !changed FALSE(889)。0x1C/0x1D:applyAll 不动,单体 !changed → FALSE(916/944)。
      if (ctx.gs) {
        if (opcode === OP_INCREASE_HP && applyAll)
          ctx.gs.fScriptSuccess = anyChanged
        else if (!applyAll && !anyChanged)
          ctx.gs.fScriptSuccess = false
      }
      return { consumed: true }
    }

    case OP_REVIVE_PLAYER: {
      // sdlpal `script.c:1052-1102`:revive。operand[0]!=0 → 全体;否则 wEventObjectID = target 队员。
      //   仅 HP==0 者:rgwHP = maxHP * operand[1] / 10;CurePoisonByLevel(role,3) + 清所有 status。
      //   g_fScriptSuccess:applyAll → 任一复活 TRUE(否则 1061 FALSE);单体 → 活着的 → FALSE(1099)。
      // 战斗语境:写 ctx.playerRoles.roles[roleId].hp + 清 state.players[pIdx].status(战内状态)
      //   + 清 gs.rgPoisonStatus 该 role 毒(同 C7 runner revivePlayerSingle 简版,D15 残)。
      if (!ctx.playerRoles)
        return { consumed: true }
      const applyAll = (operands[0] ?? 0) !== 0
      const ratioTenths = operands[1] ?? 0
      const reviveOne = (pIdx: number): boolean => {
        const roleId = state.players[pIdx]?.roleId
        const role = roleId !== undefined ? ctx.playerRoles!.roles[roleId] : undefined
        if (!role || role.hp !== 0)
          return false
        role.hp = Math.floor((role.maxHP * ratioTenths) / 10)
        // 清战斗内状态(kStatusAll 移除)+ 毒(CurePoisonByLevel 3 → 简版全清,D15 残)。
        const p = state.players[pIdx]
        if (p) {
          p.status.sleep = 0
          p.status.paralyzed = 0
          p.status.confused = 0
          p.status.haste = 0
          p.status.slow = 0
        }
        if (ctx.gs && roleId !== undefined) {
          for (let slot = 0; slot < MAX_POISONS; slot++) {
            const key = `${slot}_${roleId}`
            if (ctx.gs.rgPoisonStatus[key])
              ctx.gs.rgPoisonStatus[key] = { wPoisonID: 0, wPoisonScript: 0 }
          }
        }
        emitDamageNum(ctx, 'player', pIdx, 0, role.hp) // 复活回血 → yellow
        return true
      }
      let anyRevived = false
      if (applyAll) {
        state.players.forEach((_, i) => {
          if (reviveOne(i))
            anyRevived = true
        })
        if (ctx.gs)
          ctx.gs.fScriptSuccess = anyRevived
      }
      else {
        const sel = ctx.target?.type === 'player'
          ? ctx.target
          : (ctx.caster?.type === 'player' ? ctx.caster : undefined)
        const revived = sel ? reviveOne(sel.idx) : false
        if (ctx.gs && !revived)
          ctx.gs.fScriptSuccess = false
      }
      return { consumed: true }
    }

    case OP_REDRAW_SCREEN:
    case OP_RESTORE_SCREEN: {
      // sdlpal `script.c:3267 / 3428` PAL_ClearDialog(TRUE):清当前对话框。战斗里标记下条
      //   showDialog 入队时 clearBefore(另起新框 / 结束当前对话段)。纯渲染 op,无其它副作用。
      state.battleDialogPendingClear = true
      return { consumed: true }
    }

    case OP_DRAIN_HP: {
      // sdlpal `script.c:0039`:enemy.wHealth -= op0; movingPlayer.HP += op0(clamp maxHP)。
      // 吸星锁 scriptOnThrow:enemy = ctx.target;movingPlayer = caster。
      const amount = operands[0] ?? 0
      const idx = ctx.target?.idx
      if (idx !== undefined) {
        const enemy = state.enemies[idx]
        if (enemy) {
          const before = enemy.e.health
          enemy.e.health = Math.max(0, enemy.e.health - amount)
          emitDamageNum(ctx, 'enemy', idx, before, enemy.e.health)
        }
      }
      if (ctx.caster?.type === 'player' && ctx.playerRoles) {
        const roleId = state.players[ctx.caster.idx]?.roleId
        const role = roleId !== undefined ? ctx.playerRoles.roles[roleId] : undefined
        if (role) {
          const before = role.hp
          role.hp = Math.min(role.maxHP, role.hp + amount)
          // 回血 → yellow(sDamage>0),与受伤 blue 区分。
          emitDamageNum(ctx, 'player', ctx.caster.idx, before, role.hp)
        }
      }
      return { consumed: true }
    }

    case OP_JUMP_IF_ENEMY_TURN: {
      // sdlpal `script.c:2025`:if (g_Battle.fEnemyMoving) wScriptEntry = op0-1。
      // fEnemyMoving ≈ 当前行动者是敌人 —— 法术 scriptOnSuccess 在敌人施法时跑则 caster=enemy。
      if (ctx.caster?.type === 'enemy')
        return { consumed: true, newIp: operands[0] ?? 0 }
      return { consumed: true }
    }

    case OP_JUMP_IF_ENEMY_NOT_FIRST: {
      // sdlpal `script.c:2091`:数同 wObjectID 的敌人,自己排第几(self_pos);self_pos>1 → jump op0。
      // 用途:让"同种敌人组"的脚本只在**第一个**身上跑(其余 jump 到 end / 跳过)。
      // ts:同种 = 同 e.id(enemies.json id = wEnemyID,同种敌人共享)。
      if (ctx.caster?.type !== 'enemy')
        return { consumed: true }
      const self = state.enemies[ctx.caster.idx]
      if (!self)
        return { consumed: true }
      let count = 0
      let selfPos = 0
      state.enemies.forEach((e, i) => {
        if (e.e.id === self.e.id) {
          count++
          if (i === ctx.caster!.idx)
            selfPos = count
        }
      })
      if (selfPos > 1)
        return { consumed: true, newIp: operands[0] ?? 0 }
      return { consumed: true }
    }

    case OP_ENEMY_DIVISION: {
      // sdlpal `script.c:009C`:仅当**恰 1 活敌**且 self.health>1 才分裂成 op0+1 份,
      //   各 floor((self.health + w)/(w+1));不满足 → op1≠0 jump op1。
      if (ctx.caster?.type !== 'enemy')
        return { consumed: true }
      const self = state.enemies[ctx.caster.idx]
      if (!self)
        return { consumed: true }
      const aliveCount = state.enemies.filter(e => e.e.health > 0).length
      if (aliveCount !== 1 || self.e.health <= 1) {
        const failJump = operands[1] ?? 0
        return failJump !== 0 ? { consumed: true, newIp: failJump } : { consumed: true }
      }
      let w = operands[0] ?? 0
      if (w === 0)
        w = 1
      const x = w + 1
      const newHealth = Math.floor((self.e.health + w) / x)
      const beforeHealth = self.e.health
      self.e.health = newHealth
      // sdlpal 0x9C 在 enemy AI 脚本里跑,被 PAL_BattleBackupStat/DisplayStatChange(fight.c:1614/1665)
      //   夹住 → 原敌 HP 下降触发 wPrevHP!=wHealth → 画 blue 数字(新副本不画:backup 在它们存在前)。
      emitDamageNum(ctx, 'enemy', ctx.caster.idx, beforeHealth, newHealth)
      const copies = Math.min(w, MAX_ENEMIES_IN_TEAM - state.enemies.length)
      for (let k = 0; k < copies; k++) {
        state.enemies.push({
          e: { ...self.e, health: newHealth },
          status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
          prevHp: newHealth,
          scriptOnTurnStart: self.scriptOnTurnStart,
          scriptOnBattleEnd: self.scriptOnBattleEnd,
          scriptOnReady: self.scriptOnReady,
          resistanceToSorcery: self.resistanceToSorcery ?? 0,
          poisons: [],
        })
      }
      return { consumed: true }
    }

    case OP_ENEMY_TRANSFORM: {
      // sdlpal `script.c:009F`:iHidingTime<=0 且 self 非 睡眠/麻痹/混乱 → self 变身成 op0
      //   (新 enemy object 的 stats,**保留当前 health**)。否则 no-op。
      if (ctx.caster?.type !== 'enemy')
        return { consumed: true }
      const self = state.enemies[ctx.caster.idx]
      const tables = ctx.summonTables
      if (!self || !tables)
        return { consumed: true }
      const hiding = (state.iHidingTime ?? 0) > 0
      const disabled = (self.status.sleep ?? 0) > 0 || (self.status.paralyzed ?? 0) > 0 || (self.status.confused ?? 0) > 0
      if (hiding || disabled)
        return { consumed: true }
      const eo = tables.enemyObjects.find(o => o.objectIndex === (operands[0] ?? 0))
      if (!eo)
        return { consumed: true }
      const base = tables.enemies.find(e => e.id === eo.enemyId)
      if (!base)
        return { consumed: true }
      const keepHealth = self.e.health
      self.e = { ...base, health: keepHealth }
      self.scriptOnTurnStart = eo.scriptOnTurnStart
      self.scriptOnReady = eo.scriptOnReady
      self.scriptOnBattleEnd = eo.scriptOnBattleEnd
      self.resistanceToSorcery = eo.resistanceToSorcery
      return { consumed: true }
    }

    case OP_ENEMY_SUMMON: {
      // sdlpal `script.c:009E`:召唤 op1 只 op0(对象 id;0/0xFFFF=自身同种)敌人到空槽。
      // 房间不足(< count)**或我方隐身中(iHidingTime>0)**或自身 睡眠/麻痹/混乱 → fail,op2 非 0 则 jump op2。
      //   iHidingTime 检查此前漏(审计 bug:隐身时敌仍可召唤破隐身保护;0x5C hide 已实现,见 line 433)。
      // 注:召唤兽渲染需 present 层加载其 battle sprite,
      // 本 handler 只做 logic(加 BattleEnemy → 它会行动/受击);sprite 加载留 present follow-up。
      const tables = ctx.summonTables
      if (!tables || ctx.caster?.type !== 'enemy')
        return { consumed: true }
      const self = state.enemies[ctx.caster.idx]
      if (!self)
        return { consumed: true }

      const w = operands[0] ?? 0
      let count = asShort(operands[1] ?? 0)
      if (count <= 0)
        count = 1
      const failJump = operands[2] ?? 0

      const room = MAX_ENEMIES_IN_TEAM - state.enemies.length
      const disabled = (self.status.sleep ?? 0) > 0 || (self.status.paralyzed ?? 0) > 0 || (self.status.confused ?? 0) > 0
      const hiding = (state.iHidingTime ?? 0) > 0 // sdlpal:我方隐身中不可召唤(对齐 0x9F)
      if (room < count || hiding || disabled)
        return failJump !== 0 ? { consumed: true, newIp: failJump } : { consumed: true }

      // 解析召唤兽:w=0/0xFFFF → 自身同种;否则 enemyObjects[objectIndex==w] → enemyId/scripts/抗性。
      let enemyId: number
      let onTurnStart: number
      let onReady: number
      let onBattleEnd: number
      let resist: number
      if (w === 0 || w === 0xFFFF) {
        enemyId = self.e.id
        onTurnStart = self.scriptOnTurnStart
        onReady = self.scriptOnReady
        onBattleEnd = self.scriptOnBattleEnd
        resist = self.resistanceToSorcery ?? 0
      }
      else {
        const eo = tables.enemyObjects.find(o => o.objectIndex === w)
        if (!eo)
          return { consumed: true }
        enemyId = eo.enemyId
        onTurnStart = eo.scriptOnTurnStart
        onReady = eo.scriptOnReady
        onBattleEnd = eo.scriptOnBattleEnd
        resist = eo.resistanceToSorcery
      }
      const base = tables.enemies.find(e => e.id === enemyId)
      if (!base)
        return { consumed: true }

      for (let k = 0; k < count; k++) {
        state.enemies.push({
          e: { ...base }, // 满血 base stats(sdlpal e = lprgEnemy[enemyID])
          status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
          prevHp: base.health,
          scriptOnTurnStart: onTurnStart,
          scriptOnBattleEnd: onBattleEnd,
          scriptOnReady: onReady,
          resistanceToSorcery: resist,
          poisons: [],
        })
      }
      return { consumed: true }
    }

    case OP_JUMP_IF_ENEMY_HP_ABOVE: {
      // 0x0064: 真值用 wEventObjectID 拿 caster enemy;我们 caster.idx 等价。
      if (ctx.caster?.type !== 'enemy') return { consumed: true }
      const enemy = state.enemies[ctx.caster.idx]
      if (!enemy) return { consumed: true }
      // sdlpal `script.c:1989`:(currentHp * 100 > maxHp * operand[0]) → jump operand[1]。
      // maxHp = sdlpal `gpGlobals->g.lprgEnemy[id].wHealth`(满血,战中不变)= BattleEnemy.maxHealth
      //   (createBattleState 设 = 创建时 e.health)。旧实现用逐回合更新的 prevHp 近似 → 受伤后失真,已修。
      const cur = enemy.e.health
      const max = enemy.maxHealth ?? enemy.prevHp ?? cur
      const pct = operands[0] ?? 0
      if (cur * 100 > max * pct) {
        // jump operand[1] - 1?sdlpal: wScriptEntry = operand[1] - 1;外层 wScriptEntry++ 抵消。
        // 我们 caller 不抵消 — 直接 ip = operand[1]。
        return { consumed: true, newIp: operands[1] ?? 0 }
      }
      return { consumed: true }
    }

    case OP_ENEMY_USE_MAGIC: {
      // 0x0067: enemy.wMagic = operand[0]; wMagicRate = operand[1] ? operand[1] : 10
      if (ctx.caster?.type !== 'enemy') return { consumed: true }
      const enemy = state.enemies[ctx.caster.idx]
      if (!enemy) return { consumed: true }
      enemy.e.magic = operands[0] ?? 0
      enemy.e.magicRate = (operands[1] ?? 0) === 0 ? 10 : (operands[1] ?? 0)
      return { consumed: true }
    }

    case OP_JUMP_IF_PLAYER_NOT_POISONED: {
      // sdlpal script.c:1957-1965:`if (!PAL_IsPlayerPoisonedByLevel(wEventObjectID, 0)) wScriptEntry = operand[0]-1`。
      //   **跳转目标 = operand[0]**(此前误用 operand[1]),且**恒跳**(此前未查毒)—— 2026-05-31 审计修。
      //   wEventObjectID = 目标队员 role:ctx.target(player)优先,否则 ctx.caster(player)。
      const sel = ctx.target?.type === 'player' ? ctx.target : ctx.caster?.type === 'player' ? ctx.caster : undefined
      const roleId = sel ? state.players[sel.idx]?.roleId : undefined
      let poisoned = false
      if (ctx.gs && roleId !== undefined) {
        for (let slot = 0; slot < 16; slot++) {
          if ((ctx.gs.rgPoisonStatus[`${slot}_${roleId}`]?.wPoisonID ?? 0) !== 0) { poisoned = true; break }
        }
      }
      // 未中毒 → jump operand[0];已中毒 → ip++(不跳)
      return poisoned ? { consumed: true } : { consumed: true, newIp: operands[0] ?? 0 }
    }

    case OP_ENEMY_ESCAPE: {
      // sdlpal `script.c:2035` → PAL_BattleEnemyEscape(battle.c:1376):播逃跑动画 + 设
      //   `BattleResult = kBattleResultTerminated`(0)→ **终止整场战斗,无奖励**(全队不掉 exp/cash)。
      //   **审计修**:此前设 enemy.health=0 → 被 postAction 当击杀**给了 exp/cash**(注释"不掉战利品"是错的)。
      //   改对齐 0x89 的 Terminated 映射 → phase='fleed'(结束无奖励)。逃跑动画属 present 演出,略。
      state.phase = 'fleed'
      return { consumed: true }
    }

    case OP_ENEMY_IMMEDIATE_KO: {
      // sdlpal `script.c:1950`:`rgEnemy[wEventObjectID].wHealth = 0`(**无 operand**;wEventObjectID = 脚本上下文)。
      //   夺魂(304)/灵葫咒(384)scriptOnSuccess 的 wEventObjectID = 目标敌人(sTarget)→ ctx.target;
      //   敌自身脚本 → ctx.caster。**审计 bug**:此前用 operand[0](真实数据恒 0 → 恒 KO enemy[0],夺魂/灵葫咒失效)。
      const sel = ctx.target?.type === 'enemy' ? ctx.target : ctx.caster?.type === 'enemy' ? ctx.caster : undefined
      const targetIdx = sel?.idx
      const enemy = targetIdx !== undefined ? state.enemies[targetIdx] : undefined
      if (enemy && targetIdx !== undefined) {
        // wHealth=0(掉血)→ PAL_BattleDisplayStatChange 画 blue 数字。
        const before = enemy.e.health
        enemy.e.health = 0
        emitDamageNum(ctx, 'enemy', targetIdx, before, enemy.e.health)
      }
      return { consumed: true }
    }

    default:
      return { consumed: false }
  }
}
