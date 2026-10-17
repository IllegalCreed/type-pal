/** 玩家毒定义与毒槽操作；入口脚本由调用方传入，同步顺序保持。 */
import type { GameState } from './game-state.js'

// ── 毒 OBJECT 表注入(0x29 apply-player 取 wPlayerScript / cure-by-level 取真 level)──
//   ObjectPoisonView{id,level,color,playerScript,enemyScript};id→数据。applyRawOpcode(大世界 + 战斗
//   fall-through)的 0x29 / curePlayerPoisonByLevel 用。未注入(旧测试)→ 空 Map,playerScript=0/level=0 退化。
let _objectPoisons = new Map<
  number,
  { level: number; color: number; playerScript: number; enemyScript: number }
>()

export function setObjectPoisons(
  poisons: ReadonlyArray<{
    id: number
    level: number
    color: number
    playerScript: number
    enemyScript: number
  }>,
): void {
  _objectPoisons = new Map(
    poisons.map((p) => [
      p.id,
      { level: p.level, color: p.color, playerScript: p.playerScript, enemyScript: p.enemyScript },
    ]),
  )
}

/** SDLPal玩家毒函数先把role映射队伍位置;离队角色返回,不以roleId代替槽位。 */
export function partySlotForRole(gs: GameState, roleId: number): number {
  return gs.partyMembers.indexOf(roleId)
}

/**
 * role是否中毒:有效非零毒ID查ByKind,省略毒ID查ByLevel(role,0)。
 * poisonKind给定只看该种非零毒ID,不看等级;省略时:
 *   忽略 level>=99 的装备伪毒(寿葫芦 HP/MP 回补等),对齐 sdlpal global.c:1669-1675。
 *   否则装寿葫芦时这些伪毒会被当"中毒",令毒龙胆/九阴散的 0x61"没中毒就秒杀"误判为有毒 →
 *   白嫖解毒+回满血(原版早期 bug,后期已修)。rgPoisonStatus 16 槽/party slot。
 */
export function isPlayerPoisoned(gs: GameState, roleId: number, poisonKind?: number): boolean {
  const partySlot = partySlotForRole(gs, roleId)
  if (partySlot < 0) return false
  for (let slot = 0; slot < 16; slot++) {
    const p = gs.rgPoisonStatus[`${slot}_${partySlot}`]
    if (!p || p.wPoisonID === 0) continue
    if (poisonKind !== undefined) {
      // ByKind:只查指定毒 id(0x60),不看等级
      if (p.wPoisonID === poisonKind) return true
      continue
    }
    // ByLevel(role, 0):level>=99 的装备伪毒不算"中毒"
    if ((_objectPoisons.get(p.wPoisonID)?.level ?? 0) >= 99) continue
    return true // level >= wMinLevel(=0) 恒真
  }
  return false
}

/** SDLPal PAL_CurePoisonByKind(global.c:1520-1564):roleId 映射队伍位置后,清指定毒的 ID/script。 */
export function curePlayerPoisonByKind(gs: GameState, roleId: number, poisonId: number): void {
  const partySlot = partySlotForRole(gs, roleId)
  if (partySlot < 0) return
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${partySlot}`
    const ps = gs.rgPoisonStatus[key]
    if (ps && ps.wPoisonID === poisonId) {
      gs.rgPoisonStatus[key] = { wPoisonID: 0, wPoisonScript: 0 }
    }
  }
}

/**
 * 参考SDLPal `PAL_AddPoisonForPlayer`(global.c:1459-1517):首空槽加毒,
 * wPoisonScript = PAL_RunTriggerScript(obj.wPlayerScript, role) 的返回值;caller 注入 runner 时
 * 施毒当下跑一次入口脚本。**不含**抗性 gate —— gate 在调用方(0x29 / 敌普攻 attackEquivItem),
 * SDLPal同此分工。战斗内(0x29 battle ctx)与大世界 / 装备 scriptOnEquip(寿葫芦)共用。
 * 本实现先遍历全部16槽去重;C只查首空槽之前的重复项,有孔洞时不保证等价。
 * 此差异与Wear压缩一并待GAME-PLAYER-POISON-SLOT-COMPACTION-1裁决,不在此改变既有行为。
 */
export function addPoisonForPlayer(
  gs: GameState,
  roleId: number,
  poisonId: number,
  runPoisonEntry?: (playerScriptIp: number) => number,
): void {
  const partySlot = partySlotForRole(gs, roleId)
  if (partySlot < 0) return
  const playerScript = _objectPoisons.get(poisonId)?.playerScript ?? 0
  // 去重:已有同毒 → skip
  for (let slot = 0; slot < 16; slot++) {
    if (gs.rgPoisonStatus[`${slot}_${partySlot}`]?.wPoisonID === poisonId) return
  }
  // 首空槽加
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${partySlot}`
    if (!gs.rgPoisonStatus[key] || gs.rgPoisonStatus[key]!.wPoisonID === 0) {
      // M12(2026-06-07 sdlpal 审查):C global.c:1515 落槽时 `wPoisonScript =
      //   PAL_RunTriggerScript(playerScript, role)` —— 施毒当下跑一次入口脚本(立即生效入口效果 +
      //   跳过 0x0001 terminator),存返回的 next entry 供后续每回合 tick。无 runner 的旧 caller
      //   fallback 存原始入口 ip(向后兼容)。
      const entry = playerScript > 0 && runPoisonEntry ? runPoisonEntry(playerScript) : playerScript
      gs.rgPoisonStatus[key] = { wPoisonID: poisonId, wPoisonScript: entry }
      return
    }
  }
}

/**
 * 卸Wear时清该role的level≥99毒,保留其它毒的原槽位。
 * SDLPal PAL_RemoveEquipmentEffect(global.c:1413-1454)会在首空槽前筛选低级毒并前移、清尾;
 * 本实现遍历全部16槽且不压缩。GAME-PLAYER-POISON-SLOT-COMPACTION-1待裁决此差异。
 */
export function removePoisonLevel99(gs: GameState, roleId: number): void {
  const partySlot = partySlotForRole(gs, roleId)
  if (partySlot < 0) return
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${partySlot}`
    const ps = gs.rgPoisonStatus[key]
    if (!ps || ps.wPoisonID === 0) continue
    const level = _objectPoisons.get(ps.wPoisonID)?.level ?? 0
    if (level >= 99) gs.rgPoisonStatus[key] = { wPoisonID: 0, wPoisonScript: 0 }
  }
}

/**
 * SDLPal PAL_CurePoisonByLevel(global.c:1567-1614):用注入的毒等级判断level<=maxLevel并清ID/script。
 * 没有level==99例外;阈值低于99才自然保留装备毒。复活/战后清理caller传3,
 * 卸Wear的level≥99清理由removePoisonLevel99负责,不能把两种清理条件混用。
 */
export function curePlayerPoisonByLevel(gs: GameState, roleId: number, maxLevel: number): void {
  const partySlot = partySlotForRole(gs, roleId)
  if (partySlot < 0) return
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${partySlot}`
    const ps = gs.rgPoisonStatus[key]
    if (!ps || ps.wPoisonID === 0) continue
    const level = _objectPoisons.get(ps.wPoisonID)?.level ?? 0
    if (level <= maxLevel) {
      gs.rgPoisonStatus[key] = { wPoisonID: 0, wPoisonScript: 0 }
    }
  }
}
