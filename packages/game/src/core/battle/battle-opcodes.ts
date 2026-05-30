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
import { resolveObjectMagic, simulateMagic } from './magic-damage.js'

/** SHORT cast(同 formulas.ts 私函)。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

/** sdlpal `script.c:1630-1640` 0x0042:simulate magic(PAL_BattleSimulateMagic,fight.c:5300)。 */
const OP_SIMULATE_MAGIC = 0x0042

/** sdlpal `script.c:2007-2014` 0x0066:throw weapon —— 计算 w 后调同一 PAL_BattleSimulateMagic。 */
const OP_THROW_WEAPON = 0x0066

/** sdlpal `script.c:0021` 0x0021:inflict flat damage to enemy(op0!=0 全体,op1=damage)。 */
const OP_INFLICT_DAMAGE = 0x0021

/** sdlpal `script.c:0028` 0x0028:apply poison to enemy(抗性判定 + 去重,op1=poison id)。 */
const OP_APPLY_POISON = 0x0028

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

/** sdlpal `script.c:005B` 0x005B:halve enemy HP(w=health/2+1,cap op0)。 */
const OP_HALVE_ENEMY_HP = 0x005B

/** sdlpal `script.c:0039` 0x0039:drain HP from enemy → caster player(clamp maxHP)。 */
const OP_DRAIN_HP = 0x0039

/** sdlpal `script.c:005A` 0x005A:halve player HP(wEventObjectID = 目标队员 role)。 */
const OP_HALVE_PLAYER_HP = 0x005A

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

      simulateMagic({
        state,
        magicObjId: operands[0] ?? 0,
        magStr: operands[1] ?? 0,
        targetIdx,
        objectMagics: tables.objectMagics,
        magics: tables.magics,
        rngFactor: 1 + state.rng.next() * 0.1, // sdlpal RandomFloat(10,11)/10
      })
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

      simulateMagic({
        state,
        magicObjId: operands[0] ?? 0,
        magStr: w,
        targetIdx: ctx.target?.idx, // sdlpal:sTarget = (SHORT)wEventObjectID
        objectMagics: tables.objectMagics,
        magics: tables.magics,
        rngFactor: 1 + state.rng.next() * 0.1,
      })
      return { consumed: true }
    }

    case OP_INFLICT_DAMAGE: {
      // sdlpal `script.c:0021`:op0!=0 → 全体敌人 health -= op1;否则单体(wEventObjectID=ctx.target)。
      // 梅花镖/银针 scriptOnThrow 真伤害(0x42 是 0 伤害动画 sentinel)。毒系投掷物 + 毒 tick 也用。
      const dmg = operands[1] ?? 0
      if ((operands[0] ?? 0) !== 0) {
        for (const e of state.enemies)
          e.e.health = Math.max(0, e.e.health - dmg)
      }
      else {
        const idx = ctx.target?.idx
        const enemy = idx !== undefined ? state.enemies[idx] : undefined
        if (enemy)
          enemy.e.health = Math.max(0, enemy.e.health - dmg)
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
      enemy.e.health = Math.max(0, enemy.e.health - w)
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
        if (role)
          role.hp = Math.floor(role.hp / 2)
      }
      return { consumed: true }
    }

    case OP_DRAIN_HP: {
      // sdlpal `script.c:0039`:enemy.wHealth -= op0; movingPlayer.HP += op0(clamp maxHP)。
      // 吸星锁 scriptOnThrow:enemy = ctx.target;movingPlayer = caster。
      const amount = operands[0] ?? 0
      const idx = ctx.target?.idx
      if (idx !== undefined) {
        const enemy = state.enemies[idx]
        if (enemy)
          enemy.e.health = Math.max(0, enemy.e.health - amount)
      }
      if (ctx.caster?.type === 'player' && ctx.playerRoles) {
        const roleId = state.players[ctx.caster.idx]?.roleId
        const role = roleId !== undefined ? ctx.playerRoles.roles[roleId] : undefined
        if (role)
          role.hp = Math.min(role.maxHP, role.hp + amount)
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

    case OP_ENEMY_SUMMON: {
      // sdlpal `script.c:009E`:召唤 op1 只 op0(对象 id;0/0xFFFF=自身同种)敌人到空槽。
      // 房间不足(< count)或自身 睡眠/麻痹/混乱 → fail,op2 非 0 则 jump op2(失败分支)。
      // (动画帧 + iHidingTime(0x5C 未做)略。)注:召唤兽渲染需 present 层加载其 battle sprite,
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
      if (room < count || disabled)
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
          status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
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
      // sdlpal:(currentHp * 100 > maxHp * operand[0])
      // 我们 BattleEnemy.e.health = current(战中改),e.health 初值即 maxHp 缺乏;
      // 用 prevHp 当 maxHp 近似(简化;sdlpal 真值用 gpGlobals->g.lprgEnemy[id].wHealth)
      const cur = enemy.e.health
      const max = enemy.prevHp || cur
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
      // 0x0061: 简版 — 我们没 poison status apply 真做,默认"未中毒",直接 jump。
      // sdlpal 真值:遍历 rgPoisonStatus[player] 查任何 poison existence。
      return { consumed: true, newIp: operands[1] ?? 0 }
    }

    case OP_ENEMY_ESCAPE: {
      // 0x0069: enemy escape — health 设 0 等价(外层判 dead 处理 + 不掉战利品)
      if (ctx.caster?.type !== 'enemy') return { consumed: true }
      const enemy = state.enemies[ctx.caster.idx]
      if (enemy) enemy.e.health = 0
      return { consumed: true }
    }

    case OP_ENEMY_IMMEDIATE_KO: {
      // 0x0060: KO operand[0] 指定 enemy(default = self caster)
      const targetIdx = (operands[0] ?? 0) === 0xFFFF
        ? (ctx.caster?.type === 'enemy' ? ctx.caster.idx : 0)
        : (operands[0] ?? 0)
      const enemy = state.enemies[targetIdx]
      if (enemy) enemy.e.health = 0
      return { consumed: true }
    }

    default:
      return { consumed: false }
  }
}
