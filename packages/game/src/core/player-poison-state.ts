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
 *   分别免风险解毒或回血(原版早期 bug,后期已修)。rgPoisonStatus 16 槽/party slot。
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
 * 全槽去重由GAME-PLAYER-POISON-SLOT-COMPACTION-1保留，不复制空槽后的重复施毒。
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
    const previous = gs.rgPoisonStatus[key]
    if (!previous || previous.wPoisonID === 0) {
      // 入口可同步施毒或解毒，必须先占槽；否则嵌套加毒会重用此空位。
      const pending = { wPoisonID: poisonId, wPoisonScript: playerScript }
      gs.rgPoisonStatus[key] = pending
      if (playerScript > 0 && runPoisonEntry) {
        try {
          // 续点属于这份毒记录：压紧时随记录移动，清毒后不再写回槽位。
          pending.wPoisonScript = runPoisonEntry(playerScript)
        } catch (error) {
          // 入口失败只撤销自己的占位，不回滚入口已造成的其它效果。
          for (const [slotKey, poison] of Object.entries(gs.rgPoisonStatus)) {
            if (poison !== pending) continue
            if (slotKey === key && previous) gs.rgPoisonStatus[slotKey] = previous
            else delete gs.rgPoisonStatus[slotKey]
          }
          throw error
        }
      }
      return
    }
  }
}

/**
 * 卸Wear时清该role的level≥99毒，按原顺序前移幸存毒及其脚本续点，再清尾。
 * SDLPal PAL_RemoveEquipmentEffect只读首空槽前的毒；这里扫完16槽，保留解毒孔洞后的有效毒。
 * 这是GAME-PLAYER-POISON-SLOT-COMPACTION-1的明确取舍，不重跑入口或改变角色/队伍归属。
 */
export function removePoisonLevel99(gs: GameState, roleId: number): void {
  const partySlot = partySlotForRole(gs, roleId)
  if (partySlot < 0) return
  let kept = 0
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${partySlot}`
    const ps = gs.rgPoisonStatus[key]
    if (!ps || ps.wPoisonID === 0) continue
    const level = _objectPoisons.get(ps.wPoisonID)?.level ?? 0
    if (level >= 99) continue
    // 保留记录身份，使正在执行的入口能把续点更新到移动后的毒。
    gs.rgPoisonStatus[`${kept}_${partySlot}`] = ps
    kept++
  }
  for (let slot = kept; slot < 16; slot++)
    gs.rgPoisonStatus[`${slot}_${partySlot}`] = { wPoisonID: 0, wPoisonScript: 0 }
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
