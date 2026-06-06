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

import { type BattleCtx, addPoisonForPlayer, curePlayerPoisonByKind, curePlayerPoisonByLevel } from '../event-system.js'
import type { BattleStatus } from './battle-state.js'
import { getPlayerAttackStrength, getPlayerDefense, getPlayerDexterity, getPlayerMagicStrength, getPlayerPoisonResistance } from '../equip-effect.js'
import { buildPlayerOffMagicTimeline, buildShowMagicAnimTimeline, buildStealTimeline } from './anim-timeline.js'
import { startBattleAnim } from './battle-anim-driver.js'
import { getEnemyBasePos } from './battle-positions.js'
import { resolveObjectMagic, simulateMagic } from './magic-damage.js'

/** SHORT cast(同 formulas.ts 私函)。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

function refreshEnemyBattlePositions(ctx: BattleCtx): void {
  const maxIdx = Math.max(-1, ...ctx.state.enemies.map((enemy, idx) => enemy.defeated ? -1 : idx))
  const count = maxIdx + 1
  ctx.state.enemies.forEach((enemy, idx) => {
    const base = enemy.defeated
      ? undefined
      : getEnemyBasePos(ctx.enemyPos, count, idx, enemy.e.yPosOffset ?? 0)
    if (!base) {
      enemy.pos = undefined
      enemy.posOriginal = undefined
      return
    }
    enemy.posOriginal = { ...base }
    enemy.pos = { ...base }
  })
}

function isActiveEnemy(
  enemy: BattleCtx['state']['enemies'][number] | undefined,
): enemy is BattleCtx['state']['enemies'][number] {
  return !!enemy && !enemy.defeated
}

function isAliveEnemy(enemy: BattleCtx['state']['enemies'][number] | undefined): boolean {
  return isActiveEnemy(enemy) && enemy.e.health > 0
}

function resetEnemySlot(
  slot: BattleCtx['state']['enemies'][number],
  init: Omit<BattleCtx['state']['enemies'][number], 'pos' | 'posOriginal' | 'currentFrame' | 'iColorShift' | 'deathFadeStep'>,
): void {
  slot.e = init.e
  slot.status = init.status
  slot.prevHp = init.prevHp
  slot.maxHealth = init.maxHealth
  slot.scriptOnTurnStart = init.scriptOnTurnStart
  slot.scriptOnBattleEnd = init.scriptOnBattleEnd
  slot.scriptOnReady = init.scriptOnReady
  slot.resistanceToSorcery = init.resistanceToSorcery
  slot.poisons = init.poisons
  slot.defeated = false
  slot.deathFadeStep = undefined
  slot.currentFrame = undefined
  slot.iColorShift = 0
}

/**
 * D17b:HP-mutate 后 emit 战斗数字弹幕(对照 sdlpal `fight.c:602-716
 * PAL_BattleDisplayStatChange` —— 每次行动后对所有 wPrevHP!=wHealth 的敌/我画数字)。
 *
 * sdlpal:`sDamage = wHealth - wPrevHP`(= after - before),
 *   sDamage < 0(掉血)→ kNumColorBlue;sDamage > 0(回血)→ kNumColorYellow;== 0 不画。
 * **显示值关键区分**(sdlpal 故意不对称,2026-06-04 订正旧"钳后真实损失"误判):
 *   - 玩家方打敌人掉血:enemy wHealth 是 WORD,`wHealth -= sDamage` 超杀**下溢不钳**,
 *     DisplayStatChange 用 (SHORT)(wHealth-wPrevHP) → 显示**完整算出伤害**(传 fullDamage)。
 *   - 回血 / 敌方打玩家:sdlpal 钳 maxHP / `if(hp<sDamage)sDamage=hp`(fight.c:5064/4805)→
 *     显示钳后真实 delta(不传 fullDamage)。
 * `ctx.bus` 缺省(未注入 / 测试不传)→ 静默 no-op(不抛)。
 */
function emitDamageNum(
  ctx: BattleCtx,
  kind: 'enemy' | 'player',
  idx: number,
  before: number,
  after: number,
  /** 掉血时优先显示的完整算出伤害(玩家打敌人 WORD 下溢);省略 → 用钳后 delta(回血/敌打玩家)。 */
  fullDamage?: number,
): void {
  if (after === before)
    return
  const color = after < before ? 'blue' : 'yellow'
  const value = after < before ? (fullDamage ?? before - after) : after - before
  // 顺序修(2026-06-05):有 pendingDamageNums 缓冲(performMagic 施法注入)→ push 延迟到动画时间线播完后;
  //   无缓冲(item/throw/敌回合毒 tick)→ 即时 emit(向后兼容)。对照 sdlpal DisplayStatChange 在动画后(fight.c:4322)。
  if (ctx.pendingDamageNums)
    ctx.pendingDamageNums.push({ target: { kind, idx }, value, color })
  else
    ctx.bus?.emit({ op: 'showDamageNum', target: { kind, idx }, value, color })
}

/**
 * 投掷物 0x42/0x66 SimulateMagic 的 OffMagic 特效(sdlpal PAL_BattleSimulateMagic → PAL_BattleShowPlayerOffMagicAnim,
 * fight.c:5340)。有 ctx.pendingAnimFrames + magicSpriteFrameCounts(performThrowItem 注入)→ 建 FIRE 特效帧
 * (casterIdx=-1,无 caster 帧切换;magic.sound 已挂特效起手帧)push 进缓冲,performThrowItem 接挥臂后一起播。
 * 否则(无投掷动画上下文 / 无 sprite 帧数)→ 把 magic.sound 即时 push pendingSounds(向后兼容,旧行为)。
 */
function pushThrowOffMagicAnim(ctx: BattleCtx, magicObjId: number, targetIdx: number | undefined): void {
  const tables = ctx.magicTables
  if (!tables) return
  const om = resolveObjectMagic(magicObjId, tables.objectMagics)
  const mg = om ? tables.magics.find(m => m.id === om.magicNumber) : undefined
  if (!mg) return
  const n = ctx.magicSpriteFrameCounts?.get(mg.effect)
  if (ctx.pendingAnimFrames && n !== undefined && n > 0) {
    // OffMagic FIRE 特效帧(magic.sound 由 builder 挂特效起手帧 → 不再 push pendingSounds 防双响)。
    const targetEnemyPos = targetIdx !== undefined ? ctx.state.enemies[targetIdx]?.posOriginal : undefined
    ctx.pendingAnimFrames.push(...buildPlayerOffMagicTimeline({
      casterIdx: -1,
      magic: {
        effect: mg.effect,
        type: mg.type as 'normal' | 'attackAll' | 'attackWhole' | 'attackField',
        speed: mg.speed,
        fireDelay: mg.fireDelay,
        effectTimes: mg.effectTimes,
        shake: mg.shake,
        xOffset: mg.xOffset,
        yOffset: mg.yOffset,
        wave: mg.wave,
        keepEffect: mg.keepEffect,
        sound: mg.sound,
      },
      n,
      targetIdx: targetIdx ?? -1,
      targetEnemyPos,
    }))
  }
  else if (mg.sound > 0 && ctx.gs) {
    // 无投掷动画上下文 → magic.sound 即时(旧行为)。
    (ctx.gs.pendingSounds ??= []).push(mg.sound)
  }
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
/** sdlpal `script.c:1257-1285` 0x0029:apply poison to PLAYER(op0!=0 全队 / 否则 ctx.target;抗性 rng(1,100)>resist 才中)。 */
const OP_POISON_PLAYER = 0x0029
/** sdlpal `script.c:1331-1347` 0x002B:cure PLAYER poison by kind(清 wPoisonID==op1)。 */
const OP_CURE_PLAYER_POISON_KIND = 0x002B
/** sdlpal `script.c:1349-1365` 0x002C:cure PLAYER poison by level(清 level<=op1 的毒,level==99 装备毒不清)。 */
const OP_CURE_PLAYER_POISON_LEVEL = 0x002C
/** sdlpal `script.c:002D` 0x002D:PAL_SetPlayerStatus(role, op0=statusId, op1=duration)。 */
const OP_SET_PLAYER_STATUS = 0x002D
/** sdlpal `script.c:002E` 0x002E:set enemy status(RandomLong(0,9)>resist → rgwStatus[op0]=op1;else jump op2)。 */
const OP_SET_ENEMY_STATUS = 0x002E
/** sdlpal `script.c:002F` 0x002F:PAL_RemovePlayerStatus(role, op0)。 */
const OP_REMOVE_PLAYER_STATUS = 0x002F

/**
 * kStatus 索引(**PAL_CLASSIC** global.h:40-56)→ ts BattleStatus key。
 * CLASSIC:0=Confused 1=Paralyzed 2=Sleep 3=Silence 4=Puppet 5=Bravery 6=Protect 7=Haste 8=DualAttack。
 * (注:CLASSIC index 1 = Paralyzed,**非** Slow;Slow 是 #ifndef PAL_CLASSIC 的 index 1,本 build 无。)
 */
const KSTATUS_KEY: readonly (keyof BattleStatus | undefined)[] = [
  'confused', 'paralyzed', 'sleep', 'silence', 'puppet', 'bravery', 'protect', 'haste', 'dualAttack',
]
/** "坏"状态(confused/paralyzed/sleep/silence):已有(>0)则不刷新(PAL_SetPlayerStatus global.c)。 */
const BAD_STATUS = new Set<keyof BattleStatus>(['confused', 'paralyzed', 'sleep', 'silence'])

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

/** sdlpal `script.c:0031` 0x0031:temp 改战斗精灵。 */
const OP_CHANGE_BATTLE_SPRITE = 0x0031

/** sdlpal `script.c:0092` 0x0092:show magic-casting anim。 */
const OP_SHOW_MAGIC_ANIM = 0x0092

/** sdlpal `script.c:006A` 0x006A:PAL_BattleStealFromEnemy(target, op0=stealRate)。 */
const OP_STEAL_FROM_ENEMY = 0x006A

/**
 * 0x30 op0(PlayerRoles 结构 WORD row,= PLAYERROLES_ROW)→ stat 三件套:
 *   - field:战斗 snapshot(PlayerRole)字段名
 *   - rgw:PlayerRolesRuntime / EquipmentEffectRoles 行字段名(读 base + 写 Extra 槽)
 *   - getter:effective getter(base + Σ rgEquipmentEffect[0..6],含 Extra)recompute snapshot 用
 * row 17 atk / 18 mag / 19 def / 20 dex(sdlpal global.h tagPLAYERROLES)。
 */
const STAT_ROW_BUFF = {
  17: { field: 'attackStrength', rgw: 'rgwAttackStrength', getter: getPlayerAttackStrength },
  18: { field: 'magicStrength', rgw: 'rgwMagicStrength', getter: getPlayerMagicStrength },
  19: { field: 'defense', rgw: 'rgwDefense', getter: getPlayerDefense },
  20: { field: 'dexterity', rgw: 'rgwDexterity', getter: getPlayerDexterity },
} as const

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
/**
 * 战斗 player-poison opcode(0x29/0x2B/0x2C)的目标 roleId 解析。
 * op0!=0 → 全队;否则 ctx.target(player)优先,其次 ctx.caster(self buff)。
 * 绕开 applyRawOpcode 依赖的 eventObjectId —— battle item.ts performItem 不 seed eventObjectId,
 * 致单目标治毒/解毒/施毒 no-op(HIGH#1)。sdlpal fight.c:4390 wEventObjectID = 目标 wPlayerRole。
 */
function resolvePlayerPoisonTargets(ctx: BattleCtx, op0: number): number[] {
  const players = ctx.state.players
  if (op0 !== 0) return players.map(p => p.roleId)
  const sel = ctx.target?.type === 'player' ? ctx.target : ctx.caster?.type === 'player' ? ctx.caster : undefined
  const idx = sel?.idx
  return idx !== undefined && players[idx] ? [players[idx]!.roleId] : []
}

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
        emitDamageNum(ctx, 'enemy', r.enemyIdx, r.hpBefore, r.hpAfter, r.damage) // 玩家方法术打敌:显示完整伤害
      // 投掷物 OffMagic FIRE 特效 + 效果音(sdlpal fight.c:5340 PAL_BattleShowPlayerOffMagicAnim;有投掷动画
      //   上下文 → 建特效帧进 pendingAnimFrames,否则音效即时)。
      pushThrowOffMagicAnim(ctx, operands[0] ?? 0, targetIdx)
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
        emitDamageNum(ctx, 'enemy', r.enemyIdx, r.hpBefore, r.hpAfter, r.damage) // 玩家方法术打敌:显示完整伤害
      // 投掷武器 OffMagic FIRE 特效 + 效果音(同 0x42,fight.c:5340)。
      pushThrowOffMagicAnim(ctx, operands[0] ?? 0, ctx.target?.idx)
      return { consumed: true }
    }

    case OP_INFLICT_DAMAGE: {
      // sdlpal `script.c:0021`:op0!=0 → 全体敌人 health -= op1;否则单体(wEventObjectID=ctx.target)。
      // 梅花镖/银针 scriptOnThrow 真伤害(0x42 是 0 伤害动画 sentinel)。毒系投掷物 + 毒 tick 也用。
      const dmg = operands[1] ?? 0
      if ((operands[0] ?? 0) !== 0) {
        state.enemies.forEach((e, i) => {
          if (!isActiveEnemy(e)) return
          const before = e.e.health
          e.e.health = Math.max(0, e.e.health - dmg)
          emitDamageNum(ctx, 'enemy', i, before, e.e.health, dmg) // 投掷暗器打敌:显示完整 dmg(超杀下溢)
        })
      }
      else {
        const idx = ctx.target?.idx
        const enemy = idx !== undefined ? state.enemies[idx] : undefined
        if (isActiveEnemy(enemy)) {
          const before = enemy.e.health
          enemy.e.health = Math.max(0, enemy.e.health - dmg)
          emitDamageNum(ctx, 'enemy', idx!, before, enemy.e.health, dmg) // 投掷暗器单体打敌:显示完整 dmg
        }
      }
      return { consumed: true }
    }

    case OP_APPLY_POISON: {
      // sdlpal `script.c:0028`:op0!=0 → 全体;否则单体(wEventObjectID=ctx.target)。op1 = poison id。
      // 每目标:RandomLong(0,9) >= resistanceToSorcery 通过 → 若 op1 未在 poisons 且槽未满 → 加
      // { poisonId: op1, scriptEntry }。毒蛇卵/卵/蛊 scriptOnThrow 用。
      // sdlpal `script.c:1213`:施毒当下 `wPoisonScript = PAL_RunTriggerScript(poison.wEnemyScript, 敌idx)`
      //   —— 跑一次入口脚本存返回值(跳过 0x0001 入口 terminator),后续每回合 tick 再推进。
      //   自推进蛊孵化链(食妖虫附→灵蛊)的"九回合"精确计数靠此。缺 commands/runScript(老 caller /
      //   纯状态单测)→ fallback 存原始 enemyScript(差一拍,链晚一回合,仍能炼成)。
      const poisonId = operands[1] ?? 0
      const poison = ctx.objectPoisons?.[poisonId]
      const scriptEntry = poison && poison.id === poisonId ? poison.enemyScript : 0
      const applyTo = (enemyIdx: number): void => {
        const enemy = state.enemies[enemyIdx]
        if (!isActiveEnemy(enemy))
          return
        // 抗性:RandomLong(0,9) >= resistanceToSorcery 才中毒(resist 0 → 总中)
        if (state.rng.rangeInclusive(0, 9) < (enemy.resistanceToSorcery ?? 0))
          return
        const poisons = (enemy.poisons ??= [])
        if (poisons.some(p => p.poisonId === poisonId))
          return // 已中同毒(去重)
        if (poisons.length >= MAX_POISONS)
          return // 槽满
        // 施毒跑一次入口(sdlpal script.c:1213)。需 bus(脚本内 0x21 等 emit 伤害数字)。
        let entry = scriptEntry
        if (scriptEntry > 0 && ctx.commands && ctx.runScript && ctx.bus) {
          entry = ctx.runScript({
            commands: ctx.commands,
            ip: scriptEntry,
            bus: ctx.bus,
            runtimeMode: 'battle',
            battleCtx: {
              state,
              target: { type: 'enemy', idx: enemyIdx },
              gs: ctx.gs,
              bus: ctx.bus,
              commands: ctx.commands,
              runScript: ctx.runScript,
              objectPoisons: ctx.objectPoisons,
            },
          })
        }
        poisons.push({ poisonId, scriptEntry: entry })
      }
      if ((operands[0] ?? 0) !== 0) {
        state.enemies.forEach((enemy, i) => {
          if (isActiveEnemy(enemy)) applyTo(i)
        })
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
      if ((operands[0] ?? 0) !== 0) state.enemies.forEach((enemy, i) => {
        if (isActiveEnemy(enemy)) cure(i)
      })
      else if (ctx.target?.type === 'enemy' && ctx.target.idx !== undefined) cure(ctx.target.idx)
      return { consumed: true }
    }

    case OP_CURE_PLAYER_POISON_KIND: {
      // sdlpal script.c:1331-1347:清队员 wPoisonID==op1 的毒。HIGH#1 修:performItem 不 seed eventObjectId
      //   → applyRawOpcode 单目标 no-op;改由 ctx.target 解析(净衣符64 战斗解单个队员毒)。
      const poisonId = operands[1] ?? 0
      if (ctx.gs)
        for (const roleId of resolvePlayerPoisonTargets(ctx, operands[0] ?? 0))
          curePlayerPoisonByKind(ctx.gs, roleId, poisonId)
      return { consumed: true }
    }

    case OP_CURE_PLAYER_POISON_LEVEL: {
      // sdlpal script.c:1349-1365:清 level<=op1 的毒(level==99 装备毒不清)。HIGH#1 修(ctx.target)。
      //   九节菖蒲89/鬼枯藤129/毒龙胆278 战斗按等级治目标队员毒。
      const maxLevel = operands[1] ?? 0
      if (ctx.gs)
        for (const roleId of resolvePlayerPoisonTargets(ctx, operands[0] ?? 0))
          curePlayerPoisonByLevel(ctx.gs, roleId, maxLevel)
      return { consumed: true }
    }

    case OP_POISON_PLAYER: {
      // sdlpal script.c:1257-1285:抗性 rng(1,100) > poisonResist 才中毒。HIGH#1 修(ctx.target)。
      const poisonId = operands[1] ?? 0
      if (ctx.gs)
        for (const roleId of resolvePlayerPoisonTargets(ctx, operands[0] ?? 0)) {
          if (state.rng.rangeInclusive(1, 100) > getPlayerPoisonResistance(ctx.gs, roleId))
            addPoisonForPlayer(ctx.gs, roleId, poisonId)
        }
      return { consumed: true }
    }

    case OP_SET_PLAYER_STATUS: {
      // sdlpal script.c:002D → PAL_SetPlayerStatus(role, op0=statusId, op1=duration)(global.c)。
      //   坏状态(confused/paralyzed/sleep/silence):已有(>0)不刷新;puppet:仅死人(HP==0)设且更久,
      //   否则 fSuccess=FALSE → g_fScriptSuccess=FALSE;好状态(bravery/protect/dualAttack/haste):仅活人 + 更久。
      //   wEventObjectID = 目标队员:ctx.target(player)优先,否则 ctx.caster(自 buff)。
      const sel = ctx.target?.type === 'player' ? ctx.target : ctx.caster?.type === 'player' ? ctx.caster : undefined
      const player = sel ? state.players[sel.idx] : undefined
      const key = KSTATUS_KEY[operands[0] ?? 0]
      if (player && key) {
        const dur = operands[1] ?? 0
        const cur = player.status[key] ?? 0
        const hp = ctx.playerRoles?.roles[player.roleId]?.hp ?? 0
        if (BAD_STATUS.has(key)) {
          if (cur === 0) player.status[key] = dur
        } else if (key === 'puppet') {
          if (hp === 0) { if (cur < dur) player.status[key] = dur }
          else if (ctx.gs) ctx.gs.fScriptSuccess = false // 活人上 puppet 失败
        } else { // bravery/protect/dualAttack/haste(好状态)
          if (hp !== 0 && cur < dur) player.status[key] = dur
        }
      }
      return { consumed: true }
    }

    case OP_SET_ENEMY_STATUS: {
      // sdlpal script.c:002E(CLASSIC i=9):`RandomLong(0,9) > enemy.wResistanceToSorcery` → rgwStatus[op0]=op1;
      //   else jump op2(失败分支)。wEventObjectID = 目标敌(ctx.target)。
      const sel = ctx.target?.type === 'enemy' ? ctx.target : ctx.caster?.type === 'enemy' ? ctx.caster : undefined
      const enemy = sel ? state.enemies[sel.idx] : undefined
      const key = KSTATUS_KEY[operands[0] ?? 0]
      if (!enemy || !key) return { consumed: true }
      if (state.rng.rangeInclusive(0, 9) > (enemy.resistanceToSorcery ?? 0)) {
        enemy.status[key] = operands[1] ?? 0
        return { consumed: true }
      }
      return { consumed: true, newIp: operands[2] ?? 0 } // 抵抗 → 跳失败分支
    }

    case OP_REMOVE_PLAYER_STATUS: {
      // sdlpal script.c:002F → PAL_RemovePlayerStatus(role, op0)(global.c:2304):status<=999 才清(>=1000
      //   装备永久效果不清;战斗内 status 计数都 <999)。wEventObjectID = ctx.target(player)优先,否则 caster。
      const sel = ctx.target?.type === 'player' ? ctx.target : ctx.caster?.type === 'player' ? ctx.caster : undefined
      const player = sel ? state.players[sel.idx] : undefined
      const key = KSTATUS_KEY[operands[0] ?? 0]
      if (player && key && (player.status[key] ?? 0) <= 999) player.status[key] = 0
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
      // sdlpal `script.c:1406-1427`(PAL_CLASSIC)临时按 % 增益某 stat:
      //   p  = (WORD*)&rgEquipmentEffect[kBodyPartExtra=6];  p1 = (WORD*)&g.PlayerRoles;
      //   p[op0*MAX_ROLES+role] = p1[op0*MAX_ROLES+role] * (SHORT)op1 / 100
      //   —— **只把 bonus 存 Extra 槽**;base 永远取**未 buff** 的 g.PlayerRoles 表(→ 多次不叠加)。
      //   战斗读 effective = base + Σ rgEquipmentEffect[0..6](含 Extra):
      //     · projectRuntimeToBattleRoles 投影时已烤入(战内装备 + 起手 Extra=0)
      //     · 此处 0x30 写 Extra 后,经 getter recompute snapshot 受影响 stat → 战斗 immediately 生效
      //   战末 finalizeBattleCleanup removeEquipmentEffect(role, Extra)(battle-system.ts:2046)清 → 战后消失。
      //   op2==0 → role=wEventObjectID(施法/使用者);else role=op2-1。
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
      const map = STAT_ROW_BUFF[(operands[0] ?? 0) as keyof typeof STAT_ROW_BUFF]
      if (roleId === undefined || !map)
        return { consumed: true } // 未知 row / 无 role → no-op(consumed)
      const gs = ctx.gs
      if (gs) {
        // 真值路径:写 Extra 槽(bonus = trunc(base * SHORT(op1) / 100))+ recompute snapshot
        const base = gs.PlayerRolesRuntime[map.rgw][roleId] ?? 0
        const bonus = Math.trunc(base * asShort(operands[1] ?? 0) / 100)
        const extra = gs.rgEquipmentEffect[6]
        if (extra) extra[map.rgw][roleId] = bonus
        const role = ctx.playerRoles?.roles[roleId]
        if (role) role[map.field] = map.getter(gs, roleId)
      } else if (ctx.playerRoles) {
        // degraded fallback(无 gs;真实 caller performMagic/performItem/performThrowItem 总注入 gs)——
        // 直接 mutate snapshot(老行为,base 取已 buff 值 → 会叠加;仅合成测试无 gs 时走此)。
        const role = ctx.playerRoles.roles[roleId]
        if (role) {
          const b = role[map.field]
          role[map.field] = b + Math.trunc(b * asShort(operands[1] ?? 0) / 100)
        }
      }
      return { consumed: true }
    }

    case OP_CHANGE_BATTLE_SPRITE: {
      // sdlpal `script.c:0031`:rgEquipmentEffect[Extra].rgwSpriteNumInBattle[wEventObjectID] = op0
      //   —— 临时换队员战斗精灵号(梦蛇295 scriptOnUse 变身)。wEventObjectID = 用物品的队员(caster 优先)。
      //   ts:存 BattlePlayer.spriteNumOverride(per-battle;draw-battle-sprites 优先于 role.spriteNumInBattle);
      //   战末 BattleState 清 = sdlpal Extra slot 战末清,语义等价(2026-06-02 D17:此前 present-only no-op)。
      const sel = ctx.caster?.type === 'player' ? ctx.caster : ctx.target?.type === 'player' ? ctx.target : undefined
      const player = sel ? state.players[sel.idx] : undefined
      if (player) player.spriteNumOverride = operands[0] ?? 0
      return { consumed: true }
    }

    case OP_SHOW_MAGIC_ANIM: {
      // sdlpal `script.c:2637-2662 (0x0092)`:仅 fInBattle。op0!=0 → PreMagicAnim(op0-1)+ 该员
      //   wCurrentFrame=6(2646);全队 5 步 iColorShift=i*2 cycle(2649-2656)+ BattleFadeScene。
      //   施法前摇演出(赵灵儿力量觉醒 cutscene,all.json cmd@42319,op=[2,0,0])。
      // cast 特效帧基号 = rgwBattleEffectIndex[battleSprite][0]*10+15(fight.c:2387-2389)。
      const playerOperand = operands[0] ?? 0
      if (playerOperand !== 0 && ctx.bus) {
        const casterIdx = playerOperand - 1
        const caster = state.players[casterIdx]
        if (caster?.posOriginal) {
          const role = ctx.playerRoles?.roles[caster.roleId]
          const battleSpriteId = role?.spriteNumInBattle ?? 0
          const castEffectFrameBase = (ctx.battleEffectIndex?.[battleSpriteId * 2] ?? 0) * 10 + 15
          startBattleAnim(state, buildShowMagicAnimTimeline({
            casterPos: caster.posOriginal,
            casterIdx,
            castEffectFrameBase,
            partyIndices: state.players.map((_, idx) => idx), // 全队(sdlpal j=0..wMaxPartyMemberIndex)
          }), ctx.bus)
        }
      }
      return { consumed: true }
    }

    case OP_STEAL_FROM_ENEMY: {
      // sdlpal `fight.c:5193 PAL_BattleStealFromEnemy(target, stealRate=op0)`:
      //   先播偷窃冲刺动画(pos/delay/colorShift),再跑核心(5253-5297):
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
        // 清战斗内状态(sdlpal script.c:1052-1102 revive 清**所有** kStatus,全 9 项)+ 毒(CurePoisonByLevel 3)。
        const p = state.players[pIdx]
        if (p) {
          p.status = { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0, silence: 0, puppet: 0, bravery: 0, protect: 0, dualAttack: 0 }
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
        if (isActiveEnemy(e) && e.e.id === self.e.id) {
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
      const aliveCount = state.enemies.filter(isAliveEnemy).length
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
      let copiesLeft = w
      for (let i = 0; i < MAX_ENEMIES_IN_TEAM && copiesLeft > 0; i++) {
        const init = {
          e: { ...self.e, health: newHealth },
          status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
          prevHp: newHealth,
          maxHealth: self.maxHealth ?? beforeHealth,
          scriptOnTurnStart: self.scriptOnTurnStart,
          scriptOnBattleEnd: self.scriptOnBattleEnd,
          scriptOnReady: self.scriptOnReady,
          resistanceToSorcery: self.resistanceToSorcery ?? 0,
          poisons: [],
          defeated: false,
        }
        if (state.enemies[i]) {
          if (!state.enemies[i]!.defeated) continue
          resetEnemySlot(state.enemies[i]!, init)
        }
        else {
          state.enemies[i] = init
        }
        copiesLeft--
      }
      refreshEnemyBattlePositions(ctx)
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
      self.defeated = false
      self.deathFadeStep = undefined
      self.currentFrame = 0
      self.iColorShift = 0
      self.maxHealth = base.health
      self.scriptOnTurnStart = eo.scriptOnTurnStart
      self.scriptOnReady = eo.scriptOnReady
      self.scriptOnBattleEnd = eo.scriptOnBattleEnd
      self.resistanceToSorcery = eo.resistanceToSorcery
      refreshEnemyBattlePositions(ctx)
      // M6 变身音(sdlpal script.c:2980 AUDIO_PlaySound(47),变身成功 iColorShift 演出后)。
      if (ctx.gs) (ctx.gs.pendingSounds ??= []).push(47)
      return { consumed: true }
    }

    case OP_ENEMY_SUMMON: {
      // sdlpal `script.c:009E`:召唤 op1 只 op0(对象 id;0/0xFFFF=自身同种)敌人到空槽。
      // 房间不足(< count)**或我方隐身中(iHidingTime>0)**或自身 睡眠/麻痹/混乱 → fail,op2 非 0 则 jump op2。
      //   iHidingTime 检查此前漏(审计 bug:隐身时敌仍可召唤破隐身保护;0x5C hide 已实现,见 line 433)。
      // 成功后等价一次 PAL_BattleMakeScene:按新敌人数刷新所有敌人的 idle 底锚,渲染层再按 enemy.e.id
      // 从预载 battleSprites(`enemy-${id}`)取 ABC.MKF 战斗精灵。
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

      const room = state.enemies.reduce((n, enemy) => n + (enemy.defeated ? 1 : 0), 0)
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

      let left = count
      for (let i = 0; i < state.enemies.length && left > 0; i++) {
        if (!state.enemies[i]?.defeated)
          continue
        resetEnemySlot(state.enemies[i]!, {
          e: { ...base }, // 满血 base stats(sdlpal e = lprgEnemy[enemyID])
          status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
          prevHp: base.health,
          maxHealth: base.health,
          scriptOnTurnStart: onTurnStart,
          scriptOnBattleEnd: onBattleEnd,
          scriptOnReady: onReady,
          resistanceToSorcery: resist,
          poisons: [],
          defeated: false,
        })
        left--
      }
      refreshEnemyBattlePositions(ctx)
      // M6 召唤音(sdlpal script.c:2937 AUDIO_PlaySound(212),召唤成功 BattleMakeScene 后的施法手势音)。
      if (ctx.gs) (ctx.gs.pendingSounds ??= []).push(212)
      return { consumed: true }
    }

    case OP_JUMP_IF_ENEMY_HP_ABOVE: {
      // 0x0064: wEventObjectID = 脚本上下文敌人。玩家对敌施法(灵葫咒384/夺魂 scriptOnSuccess)→ 目标敌 sTarget=ctx.target;
      //   敌自身脚本 → ctx.caster。**审计 bug(同 0x60)**:此前只认 ctx.caster==='enemy' → 玩家施法 caster 是 player →
      //   直接 return 不查 HP → 必跳过失败分支 → 灵葫咒每次必秒杀无血量限制(user 2026-06-05 报)。修:target 优先,其次 caster。
      const sel = ctx.target?.type === 'enemy' ? ctx.target : ctx.caster?.type === 'enemy' ? ctx.caster : undefined
      if (sel === undefined) return { consumed: true }
      const enemy = state.enemies[sel.idx]
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
      // sdlpal `script.c:2035` → PAL_BattleEnemyEscape(battle.c:1399-1434):**先播飞出屏动画**(全活敌往左挪
      //   到出屏)再设 `BattleResult = kBattleResultTerminated`(0)→ 终止整场战斗,无奖励(不掉 exp/cash)。
      //   **审计修**:此前设 enemy.health=0 → 被 postAction 当击杀给了 exp/cash。**D13**:改触发 enemyEscapeAnim
      //   (tickBattleEnemyEscapeAnim 飞出 → phase='fleed' 无奖励),**不**改 health(避免误给 exp)。
      state.enemyEscapeAnim = { step: 0 }
      // M6 敌逃跑音(sdlpal battle.c:1397 AUDIO_PlaySound(45))→ gs.pendingSounds。
      if (ctx.gs) (ctx.gs.pendingSounds ??= []).push(45)
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
