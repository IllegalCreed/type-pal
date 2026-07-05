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
  | {
      kind: 'gate'
      /** 概率门(1-100;原版 0x6):掷骰失败 → 终止其余效果(原版 fail 分支显「无任何效果」)。 */
      chance?: number
      /** HP 阈值门(原版 0x64):目标当前 HP% > 此值 → 终止(灵葫咒"处决"条件)。 */
      hpAtMostPercent?: number
      /** 抗性掷门(原版 0x2E turns=0 的空状态掷,夺魂):按目标灵抗判定,失败 → 终止。 */
      magicResist?: boolean
    } // 顺序门:effects 有序,门失败截断其后 —— 与原版脚本 jump-on-fail 同构(M1c-2)
  | { kind: 'instantKill' } // 0x60 即死(灵葫咒)
  | { kind: 'steal'; rate: number } // 0x6A 偷金钱/道具(飞龙探云手)
  | { kind: 'collectTreasure' } // 0x33 收集敌方宝物(灵葫咒二次)
  // type=summon 召唤;speed=神将现身段帧速(召唤 magic 自己的 wSpeed);tint=背景染色量
  // (召唤 magic **自己的** wEffectTimes SHORT,fight.c:3145 → sBackgroundColorShift;负=调暗
  // (风神-1/武神-2),正=调亮(雪妖/火神+5)。animation 整段 = 二次法术的动画参数,其
  // effectTimes 是二次特效循环数,与染色无关 —— 两字段曾混淆)。
  // sound=召唤自身音(召唤 magic 自己的 wSound,301-349 段神将威严音;变亮首帧播一次,
  // WIN95 语义 fight.c:3112 + 一阶段 9ab63b6d;二级法术段 fSummon 不重复播音 —— 曾漏迁
  // 致武神/天剑全程静默、剑神只闻二级刀剑声)。
  | { kind: 'summon'; godId: number; speed?: number; tint?: number; sound?: number }
  | { kind: 'trance'; sprite: number } // type=trance 変身:换战斗精灵(梦蛇);属性提升另走 buffStat

/** 招式动画(presentation,与 gameplay 解耦)。播放参数 = 原版 MAGIC 表考证(M4d-2b)。 */
export interface SkillAnimation {
  effectSprite: number // 原 magic.effect(FIRE.MKF 招式精灵)
  /** 特效落点模式(原 magic.type 的 presentation 面;heal/trance 等非攻击型 = normal 落目标)。 */
  placement?: 'normal' | 'attackAll' | 'attackWhole' | 'attackField'
  /** 落点偏移(原 wXOffset/wYOffset)。 */
  xOffset?: number
  yOffset?: number
  /** 帧时长 = (speed+5)×10ms(原 wSpeed)。 */
  speed?: number
  /** 帧循环起点(原 wFireDelay)。 */
  fireDelay?: number
  /** 循环次数(原 wEffectTimes;总帧 = (n−fireDelay)×effectTimes + n + shake)。 */
  effectTimes?: number
  /** 末尾震屏帧数(原 wShake)。 */
  shake?: number
  /** 屏幕波幅叠加(原 wWave;演出期叠在战场常驻波上,fight.c:2666;原版仅 4 条法术非零)。 */
  wave?: number
  /** 法术效果音(原 wSound;(i−fireDelay)%n==0 帧循环播)。 */
  sound?: number
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
