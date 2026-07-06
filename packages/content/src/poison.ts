/**
 * 毒系统数据模型(P2·数据化 DoT,非字节码脚本 —— 见 docs/phase2/poison-system-design.md)。
 *
 * 毒 ≠ BattleStatus 字段,是独立 {poisonId, tickIndex} 列表:每回合跑当前 tick、**指针推进**。
 * 敌我两套 tick(同毒效果不同);到序列尾重复末项,或 selfCure 移除该毒(三尸蛊暴扣后自除)。
 * DoT 数值 = game-mechanics.md §885-994 逐回合实测(不走原版字节码,清洁重写)。
 *
 * **递进毒**天然可表达 —— ticks 是**序列**、指针每回合前进:如三尸蛊 [0,−1,−2,−3,−200] 就是
 * 逐回合递增伤害。固定毒 = 单元素(重复);递进毒 = 多元素;到尾 clamp 末项或 selfCure。
 */

/** 单回合毒效果(脚本反汇编成数据:玩家 0x1B / 敌 0x21 扣血;无影毒 0x5B 半血;末尾 0x2A/2B 自解)。 */
export interface PoisonTick {
  /** 每回合扣血(玩家 0x1B / 敌 0x21;负值扣、正值极罕见)。 */
  hpDelta?: number
  /** 每回合扣蓝(负值;当前无扣蓝毒药,留给未来内容 —— 毒系统能力保留)。 */
  mpDelta?: number
  /** 无影毒 0x5B 一次性:扣 = min(halveHp, 当前HP/2+1)。 */
  halveHp?: number
  /** 到期给玩家一件道具(养蛊:食妖虫附→灵蛊、碧血蚕附→碧血蚕;寄生 9 回合后产出)。 */
  grantItem?: string
  /** 末回合自解(三尸蛊暴扣后自除;寄生到期;移除本毒)。 */
  selfCure?: boolean
}

/**
 * 毒的可解度(替代原版「等级」魔数 —— level 从不代表毒的威力,只被解毒判定当分级键用,
 * 是省空间的下标式身份。clean 版用语义明确的可解度分层):
 * - common:常规毒(赤/尸/瘴/毒丝),灵血咒/九节菖蒲即解。
 * - severe:六大毒(三尸蛊等),仅复活类(连带 ≤ severe)或相克可解。
 * - incurable:无影毒(谁都不解)、寄生毒(食妖虫/碧血蚕,只能撑到期自产道具)。
 */
export type PoisonCurability = 'common' | 'severe' | 'incurable'

/** 可解度分层排序(cure 力 ≥ 毒可解度秩 才能解;incurable 无 cure 可及)。 */
export const POISON_CURE_RANK: Record<PoisonCurability, number> = {
  common: 0,
  severe: 1,
  incurable: 2,
}

/** 毒定义(object-poisons.json + 一阶段实测逐回合值)。 */
export interface PoisonDef {
  /** 毒 object id(551 赤毒…560 金蚕蛊 / 137 无影毒 / 561-562 寄生)。 */
  id: number
  /** 显示名(状态页显示当前所中毒名)。 */
  name: string
  /** 可解度(语义分层,替代原版 level 魔数;解毒判定按此,不再比数字)。 */
  curability: PoisonCurability
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

/** cure 力(maxTier)能否解掉某毒(可解度秩 ≤ cure 秩)。 */
export function poisonCurableBy(def: Pick<PoisonDef, 'curability'>, maxTier: PoisonCurability): boolean {
  return POISON_CURE_RANK[def.curability] <= POISON_CURE_RANK[maxTier]
}
