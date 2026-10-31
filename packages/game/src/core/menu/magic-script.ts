/**
 * 第一阶段大世界法术的同步子集，不是完整剧情解释器。
 * 顺序参照 SDLPal PAL_MagicMenu：先 scriptOnUse，成功才执行 scriptOnSuccess；
 * 脚本进度写回当前 GameState 的 OBJECT overlay，不修改共享 Spell 资源。
 * menu-driver 持有目标选择、施法者和 MP 成本；本模块只运行脚本并返回成功标志。
 *
 * 旧 CODE90 资源核验中的七种大世界法术 use 入口均为 0，success 链只含数值／复活；
 * 这是该版本的资源记录，不是所有新脚本的输入约束，非零 use 阶段仍须按序执行。
 * 未支持的 raw 静默跳过，具名非 raw 警告后跳过；入口／跳转无效、越界或超步时失败，
 * 已执行的副作用保留，不做事务回滚。战斗脚本由独立的 battle runner 持有。
 */

import type { Spell } from '@type-pal/shared'
import type { GameState } from '../game-state.js'
import { getMagicScriptEntry, setMagicScriptEntry } from '../object-script-state.js'
import { curePlayerPoisonByLevel } from '../player-poison-state.js'
import { getGlobalCommands, getGlobalLabelMap } from '../script-catalog.js'

const SCRIPT_TICK_LIMIT = 256

/** SHORT 有符号转换；入参是提取器提供的无符号 WORD（0–65535）。 */
function signExtendI16(u: number): number {
  return u & 0x8000 ? u - 0x10000 : u
}

// ── opcode 0x1B / 0x1C / 0x1D 真值(sdlpal script.c:867-950)──────────────────
//
// HP/MP delta:applyToAll=operand[0],delta=SHORT(operand[1]),target=currentEventObjectID
// (single = role id;all = 0xFFFF;0 = single 用 wEventObjectID 默认值)。
// clamp [0, maxHP/maxMP](sdlpal PAL_IncreaseHPMP 等价)。

// 参照 PAL_IncreaseHPMP(global.c:1254-1330)的活人、上下限和变化判定。
// TS 使用数值钳制，不复制 C 的 WORD/SHORT 回绕；扩展数值域的保真不在本片验收范围。
//   返回是否真发生变化(= sdlpal fSuccess):
//   - 仅活人(hp>0)生效 —— 死人不抬血(否则成廉价复活,global.c:1287)。
//   - clamp [0, max] 后 origHP==newHP && origMP==newMP → false("Avoid over treatment",global.c:1324)。
//   上层据此设 g_fScriptSuccess,决定是否扣 MP(满血/死人施法不扣 MP)。
function applyHPMPDeltaSingle(
  gs: GameState,
  roleId: number,
  hpDelta: number,
  mpDelta: number,
): boolean {
  const r = gs.PlayerRolesRuntime
  if ((r.rgwHP[roleId] ?? 0) <= 0) return false // 仅活人
  const origHP = r.rgwHP[roleId] ?? 0
  const origMP = r.rgwMP[roleId] ?? 0
  if (hpDelta !== 0) {
    const maxHP = r.rgwMaxHP[roleId] ?? 0
    r.rgwHP[roleId] = Math.max(0, Math.min(maxHP, origHP + hpDelta))
  }
  if (mpDelta !== 0) {
    const maxMP = r.rgwMaxMP[roleId] ?? 0
    r.rgwMP[roleId] = Math.max(0, Math.min(maxMP, origMP + mpDelta))
  }
  return (r.rgwHP[roleId] ?? 0) !== origHP || (r.rgwMP[roleId] ?? 0) !== origMP
}

/** 遍历队伍逐个调 applyHPMPDeltaSingle(已含仅活人);返回是否至少一个真变化。 */
function applyHPMPDeltaAll(gs: GameState, hpDelta: number, mpDelta: number): boolean {
  let any = false
  for (const role of gs.partyMembers) {
    if (applyHPMPDeltaSingle(gs, role, hpDelta, mpDelta)) any = true
  }
  return any
}

// ── opcode 0x22 OP_REVIVE_PLAYER 真值(sdlpal script.c:1052-1102)────────────
//
// HP==0 时复活 HP=maxHP*operand[1]/10 + cure poison level <= 3;
// 状态只清<=999,保留>999装备授予效果(global.c::PAL_RemovePlayerStatus)。
// applyToAll=operand[0]。
//
// **关键真值**(sdlpal script.c:1099 / 1077):没有目标实际复活时设
// `g_fScriptSuccess = FALSE` — 上层 uigame.c:818-822 `if (g_fScriptSuccess) MP -=`
// 不扣 MP。即:战斗外用还魂咒选活人 / 全队都活时,ts 端也应不扣 MP。
//
// returns true = 至少 1 个 target 真被复活(g_fScriptSuccess=TRUE)
function revivePlayerSingle(gs: GameState, roleId: number, ratioTenths: number): boolean {
  const cur = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
  const maxHP = gs.PlayerRolesRuntime.rgwMaxHP[roleId] ?? 0
  if (cur === 0) {
    gs.PlayerRolesRuntime.rgwHP[roleId] = Math.floor((maxHP * ratioTenths) / 10)
    curePlayerPoisonByLevel(gs, roleId, 3)
    const statuses = gs.rgPlayerStatus[roleId]
    if (statuses)
      for (let index = 0; index < statuses.length; index++)
        if ((statuses[index] ?? 0) <= 999) statuses[index] = 0
    return true
  }
  return false
}

/** sdlpal script.c:1056-1080 真值:全队遍历,只要 1 个 HP=0 被复活就 success;全活 → success=false。 */
function revivePlayerAll(gs: GameState, ratioTenths: number): boolean {
  let anyRevived = false
  for (const role of gs.partyMembers) {
    if (revivePlayerSingle(gs, role, ratioTenths)) anyRevived = true
  }
  return anyRevived
}

// ── 主 runner ───────────────────────────────────────────────────────────────

/**
 * 同步消费 magic script chain。
 * @param scriptId scriptOnUse 或 scriptOnSuccess id(从 spell.scriptOnUse / scriptOnSuccess)
 * @param targetRoleIdOrAll 0xFFFF=applyToAll;else=单个 target role id
 * @returns 同步子集成功标志；无效目录或超步返回 false。
 */
export function runMagicScriptSync(
  gs: GameState,
  scriptId: number,
  targetRoleIdOrAll: number,
): boolean {
  return runMagicScriptWithEntry(gs, scriptId, targetRoleIdOrAll).success
}

function runMagicScriptWithEntry(
  gs: GameState,
  scriptId: number,
  targetRoleIdOrAll: number,
): { success: boolean; nextEntry: number } {
  if (scriptId === 0) return { success: true, nextEntry: 0 } // sdlpal 真值:scriptOnUse=0 视为 success (skip)
  // P2#5:法术脚本是全局 entry → 全局数组 + 全局 labelMap(identity)。
  const labelMap = getGlobalLabelMap()
  const ip0 = labelMap[`L_${scriptId}`]
  if (ip0 === undefined) {
    console.warn(`runMagicScriptSync: L_${scriptId} 不在全局 labelMap`)
    return { success: false, nextEntry: scriptId }
  }
  const cmds = getGlobalCommands()
  let ip = ip0
  let step = 0
  // sdlpal `g_fScriptSuccess` 真值 — 默认 TRUE,特定 opcode(0x22 选活人时)设 FALSE。
  // runner 返回值含 success 让 caller(dispatcher)决定是否扣 MP(sdlpal uigame.c:818-822)。
  let scriptSuccess = true

  while (step++ < SCRIPT_TICK_LIMIT) {
    if (ip < 0 || ip >= cmds.length) {
      console.warn(`runMagicScriptSync: ip ${ip} 越界`)
      return { success: false, nextEntry: scriptId }
    }
    const cmd = cmds[ip]!

    if (cmd.op === 'end') {
      const nextEntry = cmd.advance
        ? ip + 1
        : cmd.reset && cmd.resetTo !== undefined
          ? (labelMap[`L_${cmd.resetTo}`] ?? scriptId)
          : scriptId
      return { success: scriptSuccess, nextEntry }
    }
    if (cmd.op === 'goto') {
      const t = labelMap[cmd.to]
      if (t === undefined) {
        console.warn(`runMagicScriptSync: goto label ${cmd.to} 不在 labelMap`)
        return { success: false, nextEntry: scriptId }
      }
      ip = t
      continue
    }
    if (cmd.op !== 'raw') {
      // 反编译已具名 op(showDialog 等)— outside spell 实测无,撞到 skip + warn
      console.warn(`runMagicScriptSync: 撞到 non-raw op '${cmd.op}' ip=${ip} — skip`)
      ip++
      continue
    }

    const [a, b] = cmd.operands
    const applyAll = (a ?? 0) !== 0
    const delta = signExtendI16(b ?? 0)

    switch (cmd.opcode) {
      case 0x1b: {
        // OP_INCREASE_HP — sdlpal script.c:867-894
        // all 分支(C:871-883):g_fScriptSuccess=FALSE 起,任一 PAL_IncreaseHPMP 成功 → TRUE。
        // single 分支(C:889-892):失败(死人/无变化)→ g_fScriptSuccess=FALSE。
        if (applyAll) scriptSuccess = applyHPMPDeltaAll(gs, delta, 0)
        else if (targetRoleIdOrAll !== 0xffff) {
          if (!applyHPMPDeltaSingle(gs, targetRoleIdOrAll, delta, 0)) scriptSuccess = false
        }
        break
      }
      case 0x1c: {
        // OP_INCREASE_MP — sdlpal script.c:896-921
        // all 分支(C:900-910)**不碰** g_fScriptSuccess;single 分支(C:916-919)失败 → FALSE。
        if (applyAll) applyHPMPDeltaAll(gs, 0, delta)
        else if (targetRoleIdOrAll !== 0xffff) {
          if (!applyHPMPDeltaSingle(gs, targetRoleIdOrAll, 0, delta)) scriptSuccess = false
        }
        break
      }
      case 0x1d: {
        // OP_INCREASE_HP_MP — sdlpal script.c:923-950(HP+MP 同 delta)
        // all 分支(C:927-938)**不碰** g_fScriptSuccess;single 分支(C:944-947)失败 → FALSE。
        if (applyAll) applyHPMPDeltaAll(gs, delta, delta)
        else if (targetRoleIdOrAll !== 0xffff) {
          if (!applyHPMPDeltaSingle(gs, targetRoleIdOrAll, delta, delta)) scriptSuccess = false
        }
        break
      }
      case 0x22: {
        // OP_REVIVE_PLAYER — sdlpal script.c:1052-1102
        // operand[0]=applyToAll,operand[1]=ratio*10 (1=10%, 10=100%)
        //
        // **关键真值**(sdlpal script.c:1099 / 1077):没有目标实际复活时设
        // `g_fScriptSuccess = FALSE` — 上层 uigame.c:818-822 `if (g_fScriptSuccess)`
        // 不扣 MP。即:战斗外用还魂咒选活人 → 不扣 MP(user 2026-05-29 提醒:
        // BattleWon 已 auto-revive 半 HP,大世界几乎无死人)。
        const ratioTenths = b ?? 0
        let revivedAny: boolean
        if (applyAll) revivedAny = revivePlayerAll(gs, ratioTenths)
        else if (targetRoleIdOrAll !== 0xffff)
          revivedAny = revivePlayerSingle(gs, targetRoleIdOrAll, ratioTenths)
        else revivedAny = false
        if (!revivedAny) scriptSuccess = false
        break
      }
      default:
      // 其它 opcode(eg 0x17 等装备 effect、0x19/0x1A 等永久 stat 改)
      // 当前同步法术子集不消费这些 raw opcode，保持既有静默跳过策略。
    }

    ip++
  }
  console.warn(`runMagicScriptSync: SCRIPT_TICK_LIMIT 超出 — 死循环?`)
  return { success: false, nextEntry: scriptId }
}

/**
 * 跑施法的两个同步脚本阶段;选择目标/检查MP/扣成本由menu-driver持有。
 * - scriptOnUse(=0 时 skip)
 * - success → scriptOnSuccess
 * - 返回success后由caller扣MP,再更新法术列表/目标picker
 *
 * @returns 两脚本阶段是否成功；MP 成本与 picker 退出条件由 caller 判定。
 */
export function castOverworldMagic(gs: GameState, spell: Spell, targetIdOrAll: number): boolean {
  // 1. scriptOnUse(可能 = 0,runMagicScriptSync 直接 return true skip)
  const sidUse = getMagicScriptEntry(gs, spell, 'scriptOnUse')
  const use = runMagicScriptWithEntry(gs, sidUse, targetIdOrAll)
  setMagicScriptEntry(gs, spell, 'scriptOnUse', use.nextEntry)
  if (!use.success) return false

  // 2. scriptOnSuccess
  const sidSuccess = getMagicScriptEntry(gs, spell, 'scriptOnSuccess')
  const success = runMagicScriptWithEntry(gs, sidSuccess, targetIdOrAll)
  setMagicScriptEntry(gs, spell, 'scriptOnSuccess', success.nextEntry)
  return success.success
}
