/**
 * 敌人定义（M4a/M4c）—— enemies.json(154 stats) + enemy-objects.json(153 AI 指针) 合并层。
 * 类比 ActorDef→battler:一个 EnemyDef 是一种可战斗的敌人（stats + 动画 + 音效 + AI）。
 *
 * 设计:battle-model-m4-design.md §4 + enemy-ai-design.md(M4c)。战斗效果复用 SkillEffect,
 * 故 EnemyDef 不含效果定义。M4c 分层(2026-07-04 用户定调):
 * - ai.rules = **战斗策略**(条件规则列表,enemy-ai.ts 求值;默认 = 原版行为)
 * - choreography = **剧情演出借战斗舞台**(嘲讽/剧情逃跑,事件 Command 词汇,M4c-2 执行)
 */
import type { ElementVec } from './battle-formulas.js'
import type { AiCond, AiRule } from './enemy-ai.js'
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
  /** 异常状态抗性 0-9（0x2E:rng(0,9) >= 此 → 命中;≥ 跟原版后期修复,非 sdlpal buggy >）。 */
  resistanceToSorcery: number
  /**
   * 战斗策略规则(act:首条命中即本回合行动;无命中/缺省 = 普攻)。
   * 原版 fallback(magic+magicRate)由迁移器翻成 [chance] cast + 兜底 attack。
   */
  rules?: AiRule[]
}

/** 战斗演出钩子(剧情借战斗舞台,**不是 AI**;M4c-2 执行)。 */
export interface BattleChoreography {
  at: 'battleStart' | 'turnStart'
  /** 整场一次(boss 嘲讽只说一遍;原版 advance 返回值语义)。 */
  once?: boolean
  when?: AiCond
  /** 事件 Command 词汇(dialog/wait/…;战斗对话条播放,少量战斗专用命令后续增)。 */
  body: Command[]
}

/** 战斗动画帧数 + 播放参数（enemies.json;帧位图从 RLE 解,非此）。 */
export interface EnemyAnim {
  idleFrames: number
  magicFrames: number
  attackFrames: number
  /** idle 轮播速度（tick/帧）。 */
  idleAnimSpeed: number
  /** 行动前摇帧。 */
  actWaitFrames: number
  /** 战斗精灵 y 落点偏移。 */
  yPosOffset: number
}

/** 敌人音效（SFX 号;0 = 无）。 */
export interface EnemySounds {
  attack: number
  action: number
  magic: number
  death: number
  call: number
}

export interface EnemyDef {
  /** 稳定 id（enemy-<objectIndex>）。 */
  id: string
  /** 名字 textId。 */
  name: TextId
  /** 战斗精灵 RLE chunk（enemyId → battle-sprite/enemy/N.rle）。 */
  spriteNum: number
  stats: EnemyStats
  ai: EnemyAI
  anim: EnemyAnim
  sounds: EnemySounds
  /** 偷取物品（飞龙探云手目标;可选）。 */
  steal?: { itemId: string; count: number }
  /** 物攻附带物品效果 + 概率（如喷毒;可选）。 */
  attackEquivItem?: { itemId: string; rate: number }
  /** 剧情演出钩子(M4c-2 执行;蛇女嘲讽逃跑等)。 */
  choreography?: BattleChoreography[]
  /** 战后剧情(scriptOnBattleEnd 翻译:胜利结算时逐敌跑;事件 Command 词汇)。 */
  onDefeated?: Command[]
}

/** 敌队（一场战斗的敌人组合;原版 enemy team 表,M4 迁移）。 */
export interface EnemyTeamDef {
  id: string
  /** 敌人 id 列表（最多 5;落点由 formations[数量-1] 定）。 */
  members: string[]
}

/** 战场（battle-fields.json;D24 三层化后为一等 content 域,编辑器战场页管理）。 */
export interface BattleFieldDef {
  /** 战场号(数字稳定 id;SceneDef.battleFieldId/startBattle.fieldId/hostile 同域引用)。 */
  id: number
  /** 显示名(编辑器;缺省显示 id)。 */
  name?: string
  /** 背景图显式引用(相对 images 根;缺省 = 惯例路径 battle/bg/<id 三位零填充>.png)。 */
  bg?: string
  screenWave: number
  /** 5 元素战场加成（-10..+10,喂 calcMagicDamage.fieldEffect）。 */
  magicEffect: ElementVec
}
