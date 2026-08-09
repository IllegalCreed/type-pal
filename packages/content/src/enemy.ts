/**
 * 敌人定义（M4a/M4c）—— enemies.json(154 stats) + enemy-objects.json(153 AI 指针) 合并层。
 * 类比 ActorDef→battler:一个 EnemyDef 是一种可战斗的敌人（stats + 动画 + 音效 + AI）。
 *
 * 设计:battle-model-m4-design.md §4 + enemy-ai-design.md(M4c)。战斗效果复用 SkillEffect,
 * 故 EnemyDef 不含效果定义。M4c 分层(2026-07-04 用户定调):
 * - ai.rules = **战斗策略**(条件规则列表,enemy-ai.ts 求值;默认 = 原版行为)
 * - choreography = **剧情演出借战斗舞台**(嘲讽/剧情逃跑,事件 Command 词汇,M4c-2 执行)
 */
import type { AssetId } from './asset.js'
import type { ElementVec } from './battle-formulas.js'
import type { AiCond, AiRule } from './enemy-ai.js'
import type {
  BattleChoreographyAction,
  EnemyFallback,
  EnemyHookChannel,
  EnemyHookFlow,
  EnemyOnDefeatedCommandV10,
} from './enemy-script-v10.js'
import type { TextId } from './index.js'
import type { Command } from './script.js'

/** 敌人属性（enemies.json 的战斗数值 + 奖励）。 */
export interface EnemyStats {
  /** 最大 = 初始 HP。 */
  health: number
  level: number
  /** 击败奖励。 */
  exp: number
  cash: number
  /** 物攻/魔攻/防御/敏捷。 */
  attackStrength: number
  magicStrength: number
  defense: number
  dexterity: number
  /** 玩家逃跑成功率修正（越高越难逃）。 */
  fleeRate: number
  /** 物理抗性除数（calcPhysicalAttackDamage;0=不抗）。 */
  physicalResistance: number
  /** 毒抗（喂 calcMagicDamage）。 */
  poisonResistance: number
  /** 5 元素抗性。 */
  elemResistance: ElementVec
  /** 每回合行动两次。 */
  dualMove: boolean
  /** 收妖值（0 = 不可收）。 */
  collectValue: number
}

/** 敌人 AI(M4c:条件规则列表,enemy-ai.ts 求值)。 */
export interface EnemyAI {
  /** 异常状态抗性 0-10（0x2E:rng(0,9) >= 此 → 命中；10 = 完全免疫）。 */
  resistanceToSorcery: number
  /**
   * 战斗策略规则(act:首条命中即本回合行动;无命中/缺省 = 普攻)。
   * 原版 fallback(magic+magicRate)由迁移器翻成 [chance] cast + 兜底 attack。
   */
  rules?: AiRule[]
  /** 源敌表的实例级默认行动；hook 可在战斗内覆盖或清空。 */
  fallback?: EnemyFallback
  /** 敌实例持久游标程序；cursor 只存在当前 BattleState。 */
  hooks?: Partial<Record<EnemyHookChannel, EnemyHookFlow>>
}

/** 战斗演出钩子(剧情借战斗舞台,**不是 AI**;M4c-2 执行)。 */
export interface BattleChoreography {
  at: 'battleStart' | 'turnStart'
  /** 整场一次(boss 嘲讽只说一遍;原版 advance 返回值语义)。 */
  once?: boolean
  when?: AiCond
  /** battle context 的穷尽动作集；不得偷渡通用世界命令。 */
  body: BattleChoreographyAction[]
}

/** 敌人音效；字段缺席表示无声。 */
export interface EnemySounds {
  attack?: AssetId
  action?: AssetId
  magic?: AssetId
  death?: AssetId
  call?: AssetId
  /** 原 PAL 负 magicSound 的干净语义：播放施法音，但抑制本次技能特效音。 */
  suppressMagicEffectSound?: boolean
}

export interface EnemyDef {
  /** 稳定 id（enemy-<objectIndex>）。 */
  id: string
  /** 名字 textId。 */
  name: TextId
  /** 敌人 profile 的 BattleSpriteDef.id。 */
  battleSprite: string
  /** 战场落点 y 偏移；属于敌人实例语义，不属于可共享精灵定义。 */
  yPosOffset: number
  stats: EnemyStats
  ai: EnemyAI
  sounds: EnemySounds
  /** 偷取物品（飞龙探云手目标;可选）。 */
  steal?: { itemId: string; count: number }
  /** 物攻附带物品效果 + 概率（如喷毒;可选）。 */
  attackEquivItem?: { itemId: string; rate: number }
  /** 剧情演出钩子(M4c-2 执行;蛇女嘲讽逃跑等)。 */
  choreography?: BattleChoreography[]
  /** 战后剧情(scriptOnBattleEnd 翻译:胜利结算时逐敌跑;canonical v5 上下文子集)。 */
  onDefeated?: EnemyOnDefeatedCommandV10[]
}

/** contentVersion 9 的显式历史 choreography；只允许升级器/历史 guard 消费。 */
export interface LegacyBattleChoreographyV9 extends Omit<BattleChoreography, 'body'> {
  body: Command[]
}

/** contentVersion 9 的显式历史敌人形状；current loader 不得消费。 */
export interface LegacyEnemyDefV9 extends Omit<EnemyDef, 'choreography' | 'onDefeated'> {
  choreography?: LegacyBattleChoreographyV9[]
  onDefeated?: Command[]
}

/** contentVersion 11 的历史敌队形状；只允许升级边界消费。 */
export interface LegacyEnemyTeamDefV11 {
  id: string
  /** v11 压紧后的敌人 id 列表（最多 5）。 */
  members: string[]
}

/** 敌队（contentVersion 12；保留原始语义槽与空洞）。 */
export interface EnemyTeamDef {
  id: string
  /**
   * 源编队中除 0xFFFF 外的槽位，按原顺序保留；null 表示源 0 空占位。
   * 运行时会把它映射到固定容量 5 的带洞敌槽数组。
   */
  slots: Array<string | null>
}

/** 战场（battle-fields.json;D24 三层化后为一等 content 域,编辑器战场页管理）。 */
export interface BattleFieldDef {
  /** 战场号(数字稳定 id;SceneDef.battleFieldId/startBattle.fieldId/hostile 同域引用)。 */
  id: number
  /** 显示名(编辑器;缺省显示 id)。 */
  name?: string
  /** 背景图显式资源引用；缺席表示刻意黑底。 */
  background?: AssetId
  screenWave: number
  /** 5 元素战场加成（-10..+10,喂 calcMagicDamage.fieldEffect）。 */
  magicEffect: ElementVec
}
