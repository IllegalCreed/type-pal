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

/**
 * role 是否中毒(sdlpal PAL_IsPlayerPoisonedByKind / ByLevel(role,0) 等价)。
 * poisonKind 给定 → 只看该种毒(ByKind,不看等级);省略 → ByLevel(role,0):
 *   忽略 level>=99 的装备伪毒(寿葫芦 HP/MP 回补等),对齐 sdlpal global.c:1669-1675。
 *   否则装寿葫芦时这些伪毒会被当"中毒",令毒龙胆/九阴散的 0x61"没中毒就秒杀"误判为有毒 →
 *   白嫖解毒+回满血(原版早期 bug,后期已修)。rgPoisonStatus 16 槽/role。
 */
export function isPlayerPoisoned(gs: GameState, roleId: number, poisonKind?: number): boolean {
  for (let slot = 0; slot < 16; slot++) {
    const p = gs.rgPoisonStatus[`${slot}_${roleId}`]
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

/** sdlpal PAL_CurePoisonByKind(global.c:1936-1955)— roleId × poisonId 清 0。 */
export function curePlayerPoisonByKind(gs: GameState, roleId: number, poisonId: number): void {
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${roleId}`
    const ps = gs.rgPoisonStatus[key]
    if (ps && ps.wPoisonID === poisonId) {
      gs.rgPoisonStatus[key] = { wPoisonID: 0, wPoisonScript: 0 }
    }
  }
}

/**
 * sdlpal `PAL_AddPoisonForPlayer`(global.c:1459-1505):去重(已有同毒 skip)+ 首空槽加,
 * wPoisonScript = PAL_RunTriggerScript(obj.wPlayerScript, role) 的返回值;caller 注入 runner 时
 * 施毒当下跑一次入口脚本。**不含**抗性 gate —— gate 在调用方(0x29 / 敌普攻 attackEquivItem),
 * sdlpal 真值同此分工。战斗内(0x29 battle ctx)与大世界 / 装备 scriptOnEquip(寿葫芦)共用。
 */
export function addPoisonForPlayer(
  gs: GameState,
  roleId: number,
  poisonId: number,
  runPoisonEntry?: (playerScriptIp: number) => number,
): void {
  const playerScript = _objectPoisons.get(poisonId)?.playerScript ?? 0
  // 去重:已有同毒 → skip
  for (let slot = 0; slot < 16; slot++) {
    if (gs.rgPoisonStatus[`${slot}_${roleId}`]?.wPoisonID === poisonId) return
  }
  // 首空槽加
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${roleId}`
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
 * sdlpal `PAL_RemoveEquipmentEffect` Wear 分支(global.c:1413-1454):清该 role 的 level≥99 毒
 * (level<99 保留)。卸 Wear 装备(如寿葫芦)时调 —— 装备授的常驻"毒"(回血/诅咒)随卸下消失。
 */
export function removePoisonLevel99(gs: GameState, roleId: number): void {
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${roleId}`
    const ps = gs.rgPoisonStatus[key]
    if (!ps || ps.wPoisonID === 0) continue
    const level = _objectPoisons.get(ps.wPoisonID)?.level ?? 0
    if (level >= 99) gs.rgPoisonStatus[key] = { wPoisonID: 0, wPoisonScript: 0 }
  }
}

/** sdlpal PAL_CurePoisonByLevel(global.c:1567-1614)— 该毒 wPoisonLevel <= maxLevel 就清 0(**无** level==99 例外)。
 *  用注入的 _objectPoisons 取真 level(2026-05-31 plumb;此前简版全清)。装备毒(level 99)靠 cure 物品 maxLevel
 *  都是 1-3(九节菖蒲 2 / 鬼枯藤 2 / 毒龙胆 3)< 99 自然不被清;装备毒由 removePoisonLevel99(卸装备)清。
 *  2026-06-02 review:旧 `level!==99` 守卫 + 注释("sdlpal 跳过 level 99")偏离 sdlpal —— 那是
 *  PAL_RemoveEquipmentEffect(global.c:1440)的行为,不是本函数;已删守卫对齐真值(行为对真物品不变)。 */
export function curePlayerPoisonByLevel(gs: GameState, roleId: number, maxLevel: number): void {
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${roleId}`
    const ps = gs.rgPoisonStatus[key]
    if (!ps || ps.wPoisonID === 0) continue
    const level = _objectPoisons.get(ps.wPoisonID)?.level ?? 0
    if (level <= maxLevel) {
      gs.rgPoisonStatus[key] = { wPoisonID: 0, wPoisonScript: 0 }
    }
  }
}
