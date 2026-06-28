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

/**
 * demo 技能 —— 李逍遥大世界仙术菜单用的 3 个 outdoor 治疗。
 * 真值核验:name = spells.json._name;costMP/effect = magic.json[spells.json[oid].magicNumber];
 *           usableOutsideBattle = spells.json[oid].flags.usableOutsideBattle;target = magic.type(applyToPlayer→oneAlly)。
 *   oid 296 气疗术  magic#33 type=applyToPlayer costMP=6  effect=27 baseDamage=0
 *   oid 298 凝神归元 magic#34 type=applyToPlayer costMP=18 effect=29 baseDamage=0
 *   oid 299 元灵归心术 magic#51 type=applyToPlayer costMP=40 effect=29 baseDamage=0
 * healHp.amount/desc = 原版 scriptOnSuccess 脚本【一手核验】(events/all.json segments[0].commands[43016/43018/43020],三者均 opcode 0x1B 回HP,operands[1]=75/220/500)。
 * 完整 102 技能 migrate 全量 → phase3。
 */
export const DEMO_SKILLS: Record<string, SkillData> = {
  '296': {
    id: '296',
    name: '气疗术',
    desc: '我方单人HP+75',
    cost: { mp: 6 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 75 }],
    animation: { effectSprite: 27 },
  },
  '298': {
    id: '298',
    name: '凝神归元',
    desc: '我方单人HP+220',
    cost: { mp: 18 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 220 }],
    animation: { effectSprite: 29 },
  },
  '299': {
    id: '299',
    name: '元灵归心术',
    desc: '我方单人HP+500',
    cost: { mp: 40 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 500 }],
    animation: { effectSprite: 29 },
  },
}

/** ③ 习得规则:角色模板升到 level 自动习得 skillId(原版 level-up-magic.json)。 */
export interface LevelUpSkill {
  level: number
  skillId: string
}

/**
 * 升级习得表(content 静态)。真值 = 原版 level-up-magic.json[roleId]。
 * 李逍遥 = roleId 0,原始 [{7,349},{7,313},{7,340},{0,0}(空槽),{30,354}] → 跳空槽。
 *   349 天师符法 / 313 旋风咒 / 340 一阳指 / 354 万蚁蚀象(名 = spells.json._name)。
 * ⚠ 这些是**战斗技能**(均非 outdoor),其完整 SkillData 待 phase3 migrate 全量;
 *   demo 不跑升级逻辑,本表只验证 ③ 层 schema 形状 + 钉住真实数据。
 */
export const LEVEL_UP_SKILLS: Record<string, LevelUpSkill[]> = {
  'li-xiaoyao': [
    { level: 7, skillId: '349' },
    { level: 7, skillId: '313' },
    { level: 7, skillId: '340' },
    { level: 30, skillId: '354' },
  ],
}
