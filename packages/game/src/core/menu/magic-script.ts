/**
 * C7(2026-05-29):大世界 magic script 同步 runner —
 * sdlpal `uigame.c:740-861` PAL_RunTriggerScript(scriptOnUse / scriptOnSuccess) 1:1 port。
 *
 * **outside-battle spell 真值实测**(7 个 spell scriptOnSuccess chain 全 opcode hist):
 *  - 0x1B (27) `OP_INCREASE_HP` × 5 次:气疗术 / 观音咒 / 凝神归元 / 元灵归心术 / 五气朝元
 *  - 0x22 (34) `OP_REVIVE_PLAYER` × 2 次:还魂咒 / 赎魂
 *  - **无 showDialog / fade / wait** — 全是纯数据 op,可同步跑
 *
 * 流程(sdlpal uigame.c:740-873 真值):
 *  1. applyToAll 分支:
 *     - PAL_RunTriggerScript(scriptOnUse, 0)  ← currentEventObjectID=0
 *     - if (g_fScriptSuccess) PAL_RunTriggerScript(scriptOnSuccess, 0)
 *     - if (g_fScriptSuccess) caster.MP -= costMP
 *  2. single target 分支(picker 内 Confirm 时):
 *     - PAL_RunTriggerScript(scriptOnUse, targetRole)
 *     - if (g_fScriptSuccess) PAL_RunTriggerScript(scriptOnSuccess, targetRole)
 *     - if (g_fScriptSuccess) caster.MP -= costMP
 *
 * 注:**outside-battle spell scriptOnUse 实测全为 0**(7/7),只跑 scriptOnSuccess + MP 扣。
 * 但本 runner 通用支持 scriptOnUse 非零情况(battle-only spell 真值 chain 含其它 opcode,
 * 但 battle ctx 由 runScript / dispatchBattleOpcode 处理,本 runner 仅大世界用)。
 *
 * sdlpal `g_fScriptSuccess` 真值由特定 opcode 设(eg 0x9C condition check)— outside spell
 * chain 不 hit 这些 opcode,我们 always success=true(等价 sdlpal 默认行为)。
 */

import type { Spell } from '@type-pal/shared'
import type { GameState } from '../game-state.js'
import { getSharedCommands, getSharedLabelMap } from '../event-system.js'

const MAX_PLAYER_ROLES = 6
const SCRIPT_TICK_LIMIT = 256

/** SHORT signed 16-bit cast(sdlpal `(SHORT)operand[N]` 真值)。 */
function signExtendI16(u: number): number {
  return (u & 0x8000) ? u - 0x10000 : u
}

// ── opcode 0x1B / 0x1C / 0x1D 真值(sdlpal script.c:867-950)──────────────────
//
// HP/MP delta:applyToAll=operand[0],delta=SHORT(operand[1]),target=currentEventObjectID
// (single = role id;all = 0xFFFF;0 = single 用 wEventObjectID 默认值)。
// clamp [0, maxHP/maxMP](sdlpal PAL_IncreaseHPMP 等价)。

function applyHPMPDeltaSingle(
  gs: GameState, roleId: number, hpDelta: number, mpDelta: number,
): void {
  const r = gs.PlayerRolesRuntime
  if (hpDelta !== 0) {
    const maxHP = r.rgwMaxHP[roleId] ?? 0
    const cur = r.rgwHP[roleId] ?? 0
    r.rgwHP[roleId] = Math.max(0, Math.min(maxHP, cur + hpDelta))
  }
  if (mpDelta !== 0) {
    const maxMP = r.rgwMaxMP[roleId] ?? 0
    const cur = r.rgwMP[roleId] ?? 0
    r.rgwMP[roleId] = Math.max(0, Math.min(maxMP, cur + mpDelta))
  }
}

function applyHPMPDeltaAll(
  gs: GameState, hpDelta: number, mpDelta: number,
): void {
  for (const role of gs.partyMembers) {
    if ((gs.PlayerRolesRuntime.rgwHP[role] ?? 0) > 0) {
      applyHPMPDeltaSingle(gs, role, hpDelta, mpDelta)
    }
  }
}

// ── opcode 0x22 OP_REVIVE_PLAYER 真值(sdlpal script.c:1052-1102)────────────
//
// HP==0 时复活 HP=maxHP*operand[1]/10 + cure poison level <= 3 + clear all status。
// applyToAll=operand[0]。
//
// **关键真值**(sdlpal script.c:1099 / 1077):无活 target 复活时设
// `g_fScriptSuccess = FALSE` — 上层 uigame.c:818-822 `if (g_fScriptSuccess) MP -=`
// 不扣 MP。即:战斗外用还魂咒选活人 / 全队都活时,ts 端也应不扣 MP。
//
// returns true = 至少 1 个 target 真被复活(g_fScriptSuccess=TRUE)
function revivePlayerSingle(gs: GameState, roleId: number, ratioTenths: number): boolean {
  const cur = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
  const maxHP = gs.PlayerRolesRuntime.rgwMaxHP[roleId] ?? 0
  if (cur === 0) {
    gs.PlayerRolesRuntime.rgwHP[roleId] = Math.floor(maxHP * ratioTenths / 10)
    // poison level<=3 清:简版,M5 poison 字段在 status 模型(D15 ✗)
    // 整组 D15 做时一并改;目前 cure 完整 poison(rgPoisonStatus sparse)
    for (let slot = 0; slot < 16; slot++) {
      const key = `${slot}_${roleId}`
      if (gs.rgPoisonStatus[key]) {
        gs.rgPoisonStatus[key] = { wPoisonID: 0, wPoisonScript: 0 }
      }
    }
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
 * @returns success(等价 sdlpal `g_fScriptSuccess`)
 */
export function runMagicScriptSync(
  gs: GameState,
  scriptId: number,
  targetRoleIdOrAll: number,
): boolean {
  if (scriptId === 0) return true // sdlpal 真值:scriptOnUse=0 视为 success (skip)
  const labelMap = getSharedLabelMap()
  const ip0 = labelMap[`L_${scriptId}`]
  if (ip0 === undefined) {
    console.warn(`runMagicScriptSync: L_${scriptId} 不在 shared.json labelMap`)
    return false
  }
  const cmds = getSharedCommands()
  let ip = ip0
  let step = 0
  // sdlpal `g_fScriptSuccess` 真值 — 默认 TRUE,特定 opcode(0x22 选活人时)设 FALSE。
  // runner 返回值含 success 让 caller(dispatcher)决定是否扣 MP(sdlpal uigame.c:818-822)。
  let scriptSuccess = true

  while (step++ < SCRIPT_TICK_LIMIT) {
    if (ip < 0 || ip >= cmds.length) {
      console.warn(`runMagicScriptSync: ip ${ip} 越界`)
      return false
    }
    const cmd = cmds[ip]!

    if (cmd.op === 'end') return scriptSuccess
    if (cmd.op === 'goto') {
      const t = labelMap[cmd.to]
      if (t === undefined) {
        console.warn(`runMagicScriptSync: goto label ${cmd.to} 不在 labelMap`)
        return false
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

    const [a, b, _c] = cmd.operands as [number, number, number]
    const applyAll = (a ?? 0) !== 0
    const delta = signExtendI16(b ?? 0)

    switch (cmd.opcode) {
      case 0x1B: {
        // OP_INCREASE_HP — sdlpal script.c:867-894
        if (applyAll) applyHPMPDeltaAll(gs, delta, 0)
        else if (targetRoleIdOrAll !== 0xFFFF) applyHPMPDeltaSingle(gs, targetRoleIdOrAll, delta, 0)
        break
      }
      case 0x1C: {
        // OP_INCREASE_MP — sdlpal script.c:896-921
        if (applyAll) applyHPMPDeltaAll(gs, 0, delta)
        else if (targetRoleIdOrAll !== 0xFFFF) applyHPMPDeltaSingle(gs, targetRoleIdOrAll, 0, delta)
        break
      }
      case 0x1D: {
        // OP_INCREASE_HP_MP — sdlpal script.c:923-950(HP+MP 同 delta)
        if (applyAll) applyHPMPDeltaAll(gs, delta, delta)
        else if (targetRoleIdOrAll !== 0xFFFF) applyHPMPDeltaSingle(gs, targetRoleIdOrAll, delta, delta)
        break
      }
      case 0x22: {
        // OP_REVIVE_PLAYER — sdlpal script.c:1052-1102
        // operand[0]=applyToAll,operand[1]=ratio*10 (1=10%, 10=100%)
        //
        // **关键真值**(sdlpal script.c:1099 / 1077):无活 target 复活时设
        // `g_fScriptSuccess = FALSE` — 上层 uigame.c:818-822 `if (g_fScriptSuccess)`
        // 不扣 MP。即:战斗外用还魂咒选活人 → 不扣 MP(user 2026-05-29 提醒:
        // BattleWon 已 auto-revive 半 HP,大世界几乎无死人)。
        const ratioTenths = b ?? 0
        let revivedAny: boolean
        if (applyAll) revivedAny = revivePlayerAll(gs, ratioTenths)
        else if (targetRoleIdOrAll !== 0xFFFF) revivedAny = revivePlayerSingle(gs, targetRoleIdOrAll, ratioTenths)
        else revivedAny = false
        if (!revivedAny) scriptSuccess = false
        break
      }
      default:
        // 其它 opcode(eg 0x17 等装备 effect、0x19/0x1A 等永久 stat 改)
        // outside-battle spell 真值实测不 hit 这些;log skip
        console.debug(
          `runMagicScriptSync: opcode 0x${cmd.opcode.toString(16)} ip=${ip} `
          + `op=${JSON.stringify(cmd.operands)} — skip(outside-battle spell 不应 hit)`,
        )
    }

    ip++
  }
  console.warn(`runMagicScriptSync: SCRIPT_TICK_LIMIT 超出 — 死循环?`)
  return false
}

/**
 * 跑完整 magic cast 流程(sdlpal uigame.c:740-873 真值)。
 * - scriptOnUse(=0 时 skip)
 * - success → scriptOnSuccess
 * - success → caster.MP -= costMP(由 caller 检 MP 是否 >= costMP 再调)
 *
 * @returns success — caller 据此决定是否扣 MP + 是否退 picker(MP 不足)
 */
export function castOverworldMagic(
  gs: GameState,
  spell: Spell,
  costMP: number,
  casterRoleId: number,
  targetIdOrAll: number,
): boolean {
  void costMP // dispatcher 负责扣 MP — runner 只跑 script
  void casterRoleId

  // 1. scriptOnUse(可能 = 0,runMagicScriptSync 直接 return true skip)
  const sidUse = (spell as { scriptOnUse?: number }).scriptOnUse ?? 0
  const useOk = runMagicScriptSync(gs, sidUse, targetIdOrAll)
  if (!useOk) return false

  // 2. scriptOnSuccess
  const sidSuccess = (spell as { scriptOnSuccess?: number }).scriptOnSuccess ?? 0
  return runMagicScriptSync(gs, sidSuccess, targetIdOrAll)
}

// roleId max check helper(防越界)
void MAX_PLAYER_ROLES
