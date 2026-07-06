/**
 * 毒系统数据模型(P2·数据化 DoT,非字节码脚本 —— 见 docs/phase2/poison-system-design.md)。
 *
 * 毒 ≠ BattleStatus 字段,是独立 {poisonId, tickIndex} 列表:每回合跑当前 tick、指针推进。
 * 敌我两套 tick(同毒效果不同);到序列尾重复末项,或 selfCure 移除该毒(三尸蛊暴扣后自除)。
 * DoT 数值 = game-mechanics.md §885-994 逐回合实测(不走原版字节码,清洁重写)。
 */

/** 单回合毒效果(脚本反汇编成数据:玩家 0x1B / 敌 0x21 扣血;无影毒 0x5B 半血;末尾 0x2A/2B 自解)。 */
export interface PoisonTick {
  /** 每回合血变(负=扣,正=回补伪毒)。 */
  hpDelta?: number
  /** 无影毒 0x5B 一次性:扣 = min(halveHp, 当前HP/2+1)。 */
  halveHp?: number
  /** 末回合自解(三尸蛊暴扣后自除;移除本毒)。 */
  selfCure?: boolean
}

/** 毒定义(object-poisons.json + 一阶段实测逐回合值)。 */
export interface PoisonDef {
  /** 毒 object id(551 赤毒…560 金蚕蛊 / 137 无影毒 / 563-564 伪毒)。 */
  id: number
  /** 显示名(状态页显示当前所中毒名)。 */
  name: string
  /** 解毒分级键:0-2 常规 / 3 六大毒 / 173 无影毒(无解)/ 99 伪毒(不算中毒)。 */
  level: number
  /** 状态页头像染色(wColor;0 = 不染)。 */
  color: number
  /** 玩家中毒逐回合序列(指针推进;缺 = 无 DoT)。 */
  playerTicks?: PoisonTick[]
  /** 敌人中毒逐回合序列。 */
  enemyTicks?: PoisonTick[]
}

/** 战斗单位身上一条活跃毒(tickIndex = 脚本指针的数据化)。 */
export interface ActivePoison {
  poisonId: number
  tickIndex: number
}

/**
 * level ≥ 99 的毒是「伪毒」(寿葫芦 HP/MP 回补等装备正面效果),原版 IsPoisonedByLevel
 * 忽略 → **不算中毒**(毒龙胆/九阴散 0x61「没中毒就秒杀」对它豁免;原版后期修复,一阶段已跟)。
 */
export function isRealPoison(def: Pick<PoisonDef, 'level'>): boolean {
  return def.level < 99
}
