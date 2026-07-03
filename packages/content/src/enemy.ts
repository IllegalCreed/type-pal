/**
 * 敌人定义（M4a）—— enemies.json(154 stats) + enemy-objects.json(153 AI 指针) 合并层。
 * 类比 ActorDef→battler:一个 EnemyDef 是一种可战斗的敌人（stats + 动画 + 音效 + AI）。
 *
 * 设计:battle-model-m4-design.md §4。战斗效果（伤害/状态/毒）复用 SkillEffect（§5.1），
 * 故 EnemyDef 不含效果定义,只含 stats + fallback-AI 参数。敌人 AI 脚本（scriptOnReady 等）
 * 是 M4c 的活,届时加 `aiScript?` 字段（战斗命令 stages）。
 */
import type { ElementVec } from './battle-formulas.js'
import type { TextId } from './index.js'

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

/** fallback AI 参数（无脚本敌人的默认行为;enemies.json + enemy-objects.json）。 */
export interface EnemyAI {
  /** 默认法术 id（0 = 只物攻）。 */
  magic: number
  /** 施法概率 0-10（rng(0,9) < magicRate 时施法）。 */
  magicRate: number
  /** 异常状态抗性 0-9（0x2E:rng(0,9) >= 此 → 命中;≥ 跟原版后期修复,非 sdlpal buggy >）。 */
  resistanceToSorcery: number
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
}

/** 敌队（一场战斗的敌人组合;原版 enemy team 表,M4 迁移）。 */
export interface EnemyTeamDef {
  id: string
  /** 敌人 id 列表（最多 5;落点由 formations[数量-1] 定）。 */
  members: string[]
}

/** 战场（battle-fields.json:元素加成 + 抖屏）。 */
export interface BattleFieldDef {
  id: string
  screenWave: number
  /** 5 元素战场加成（-10..+10,喂 calcMagicDamage.fieldEffect）。 */
  magicEffect: ElementVec
}
