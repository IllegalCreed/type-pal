// 技能数据 ① 层:技能定义。见 docs/phase2/foundation/skill-data-design.md。
// 阶段隔离(D18):纯 content 数据 + 类型,无 reforge/引擎依赖。

/** 消耗。原版 MP 在 magic.costMP;酒/蛊/金钱原版 scriptOnUse 脚本硬编 → 这里显式数据化。 */
export interface SkillCost {
  mp?: number
  stamina?: number // 体力(合体技)
  money?: number // 乾坤一掷耗金钱
  items?: { itemId: string; amount: number }[] // 酒神耗酒 / 巫术耗蛊(依赖 item 系统)
}

/** 作用目标(谁)。从原版 MagicType 拆出的 gameplay 维度(渲染样式归 animation)。 */
export type SkillTarget = 'oneEnemy' | 'allEnemies' | 'oneAlly' | 'allAllies' | 'self'

/** 状态 id(原版 9 种;毒是独立系统 → applyPoison/curePoison)。 */
export type StatusId =
  | 'confused' // 混乱
  | 'paralyzed' // 定身
  | 'sleep' // 睡眠
  | 'silence' // 沉默
  | 'puppet' // 傀儡
  | 'bravery' // 狂暴/神勇
  | 'protect' // 护体
  | 'haste' // 加速
  | 'dualAttack' // 连击/双攻

/** 技能效果 = clean-rewrite 版的原版 scriptOnSuccess opcode 链。每个 variant ≈ 一条效果 opcode。 */
export type SkillEffect =
  | { kind: 'damage'; power: number; elemental: number } // 伤害;elemental 0无/1-5风雷水火土/>5毒,抗性=此×角色 elemResistance
  | { kind: 'healHp'; amount: number } // 0x1B 回 HP
  | { kind: 'healMp'; amount: number } // 0x1C 回 MP
  | { kind: 'revive'; hpPercent: number } // 0x22 复活(回 max×%)
  | { kind: 'applyStatus'; status: StatusId; turns: number } // 0x2D/0x2E(命中由引擎按目标抗性判)
  | { kind: 'removeStatus'; statuses: StatusId[] } // 0x2F 解状态
  | { kind: 'applyPoison'; poisonId: string } // 0x28/0x29 下毒/下蛊
  | { kind: 'curePoison'; maxLevel?: number; poisonId?: string } // 0x2A-0x2C 解毒
  | {
      kind: 'buffStat'
      stat: 'attack' | 'defense' | 'magic' | 'dexterity'
      percent: number
      duration: 'battle' | number // 0x30 临时%增益;寿命=整场战斗 → 'battle'
    }
  | { kind: 'instantKill' } // 0x60 即死(灵葫咒)
  | { kind: 'steal'; rate: number } // 0x6A 偷金钱/道具(飞龙探云手)
  | { kind: 'collectTreasure' } // 0x33 收集敌方宝物(灵葫咒二次)
  | { kind: 'summon'; godId: number } // type=summon 召唤
  | { kind: 'trance'; sprite: number } // type=trance 変身:换战斗精灵(梦蛇);属性提升另走 buffStat

/** 招式动画(presentation,与 gameplay 解耦)。 */
export interface SkillAnimation {
  effectSprite: number // 原 magic.effect(FIRE.MKF 招式精灵)
}

/** 技能定义。自包含:存值,不存原版 magicNumber 子表下标。 */
export interface SkillData {
  id: string // demo = 原版 oid 字符串;当不透明 string(勿 hardcode 语义/算偏移)
  name: string
  desc: string // 原版 scriptDesc(脚本)→ 第二阶段直接存文字
  cost: SkillCost
  usableOutsideBattle: boolean
  target: SkillTarget
  effects: SkillEffect[] // 做什么(有序;核心)。元素属于 damage 效果,不放顶层
  animation: SkillAnimation
  // 扩展口 phase3(注释留形):category/series(议题16 门派分类/体系,技能树 UI)
}

/** 技能数据表(id → SkillData)。去全局化:操作技能的函数收这个类型(显式注入),不再默认吃 DEMO_SKILLS。 */
export type SkillDataMap = Record<string, SkillData>

/** ③ 习得规则:角色模板升到 level 自动习得 skillId(原版 level-up-magic.json)。 */
export interface LevelUpSkill {
  level: number
  skillId: string
}
