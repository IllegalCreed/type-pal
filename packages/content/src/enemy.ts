/**
 * 作者工程的敌人、敌队与战场定义。定义作为遇敌输入，实例生命、当前决策和脚本游标由本场战斗持有。
 * 战斗精灵与音效按稳定资源身份关联。战场环境与敌方站位分别声明。
 */
import type { AssetId } from './asset.js'
import type { ElementVec } from './battle-formulas.js'
import type { AiCond, AiRule } from './enemy-ai.js'
import type {
  BattleChoreographyAction,
  EnemyFallback,
  EnemyHookChannel,
  EnemyHookFlow,
  EnemyOnDefeatedCommand,
} from './enemy-script.js'
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

/** 战斗实例的行动策略与脚本初始值。 */
export interface EnemyAI {
  /** 对随机异常状态判定，0–9 的掷值至少达到此值才能命中。10 抵抗这类判定。 */
  resistanceToSorcery: number
  /**
   * 首条可用且命中的规则决定行动。没有命中时尝试实例的 fallback，最后进入普通攻击。
   */
  rules?: AiRule[]
  /** 源敌表的实例级默认行动；hook 可在战斗内覆盖或清空。 */
  fallback?: EnemyFallback
  /** 敌实例持久游标程序；cursor 只存在当前 BattleState。 */
  hooks?: Partial<Record<EnemyHookChannel, EnemyHookFlow>>
}

/** 遇敌演出的声明；通过战斗宿主执行其支持的动作。 */
export interface BattleChoreography {
  at: 'battleStart' | 'turnStart'
  /** 本场战斗至多触发一次。 */
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
  /** 工程内稳定 ID；原盘迁入的敌人可用源对象编号派生。 */
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
  /** 未指定遭遇专属演出时，可由本敌人提供默认脚本。 */
  choreography?: BattleChoreography[]
  /** 胜利结算时由脚本宿主逐敌执行；变身后的实例保留原脚本属主。 */
  onDefeated?: EnemyOnDefeatedCommand[]
}

/** 敌队；保留原始语义槽与空洞。 */
export interface EnemyTeamDef {
  id: string
  /**
   * 源编队中除 0xFFFF 外的槽位，按原顺序保留；null 表示源 0 空占位。
   * 运行时会把它映射到固定容量 5 的带洞敌槽数组。
   */
  slots: Array<string | null>
}

/** 新建首个战场时使用的默认编号，也是编辑器的项目默认引用。 */
export const DEFAULT_BATTLE_FIELD_ID = 24

/** 战场是遇敌环境定义，由场景默认、明雷实体或开战参数选择。 */
export interface BattleFieldDef {
  /** 战场号(数字稳定 id;SceneDef.battleFieldId/startBattle.fieldId/hostile 同域引用)。 */
  id: number
  /** 显示名(编辑器;缺省显示 id)。 */
  name?: string
  /** 背景图显式资源引用；缺席表示刻意黑底。 */
  background?: AssetId
  screenWave: number
  /** 风、雷、水、火、土五项有限数，作为双方元素伤害的场地修正。 */
  magicEffect: ElementVec
}
