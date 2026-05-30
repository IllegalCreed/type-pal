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
import { simulateMagic } from './magic-damage.js'

/** SHORT cast(同 formulas.ts 私函)。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

/** sdlpal `script.c:1630-1640` 0x0042:simulate magic(PAL_BattleSimulateMagic,fight.c:5300)。 */
const OP_SIMULATE_MAGIC = 0x0042

/** sdlpal `script.c:2007-2014` 0x0066:throw weapon —— 计算 w 后调同一 PAL_BattleSimulateMagic。 */
const OP_THROW_WEAPON = 0x0066

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
