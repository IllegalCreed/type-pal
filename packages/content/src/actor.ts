/**
 * 统一角色定义(C0;设计 docs/phase2/foundation/actor-model-design.md)。
 *
 * ActorDef:NPC 与可入队角色**同一类型**(用户拍板)——名字/头像/精灵一处定义,处处引用。
 * 可战斗/可入队的多带 `battler` 块(普通村民 NPC 不带)。
 * 场景实体(EntityDef)引用 actor(角色实例)或直接引用 sprite(纯静物 prop),二选一。
 *
 * 与 content-schema §9「外观解耦」对齐:spriteId/battleSprite = 基础造型层;
 * 装备驱动的外观覆盖 = 将来加字段(appearanceRules),纯加法。
 */
import type { AssetId } from './asset.js'
import type { EntityDef, TextId } from './index.js'

/**
 * 战斗音效七件套(原版 PlayerRoles rgw*Sound 全量;敌侧对应 EnemySounds)。
 * schema 一次定全(数据地基);演出侧按落地进度消费:attack/weapon/magic 已接
 * (出招/挥击/吟唱帧),critical 等暴击落地、cover/dying/death 等对应演出落地。
 */
export interface BattlerSounds {
  /** 普攻出招(rgwAttackSound,冲锋帧)。 */
  attack?: AssetId
  /** 暴击出招(rgwCriticalSound,替换 attack;暴击未实现,先存数据)。 */
  critical?: AssetId
  /** 兵器命中(rgwWeaponSound,挥击帧 frame9)。 */
  weapon?: AssetId
  /** 施法吟唱(rgwMagicSound,PreMagic 姿势帧 frame5)。 */
  magic?: AssetId
  /** 替挡/格挡(rgwCoverSound)。 */
  cover?: AssetId
  /** 濒死(rgwDyingSound)。 */
  dying?: AssetId
  /** 阵亡(rgwDeathSound)。 */
  death?: AssetId
}

/** 战斗伤亡脚本台词行(原版 showDialog;style = 原版 setDialogStyle*)。 */
export interface CasualtyLine {
  text: TextId
  style: 'bottom' | 'top' | 'narration'
}

/** 伤亡脚本效果(0x1B/0x1C 回满 + 0x30 临时百分比 buff;战内有效,战后清空)。 */
export type CasualtyEffect =
  | { kind: 'heal'; resource: 'hp' | 'mp' }
  | {
      kind: 'tempStatBuff'
      /** 原版 0x30 属性索引:17=attack、18=magic、20=speed、21=luck。 */
      stat: 'attack' | 'magic' | 'speed' | 'luck'
      /** 百分比(原版 operand[1]);delta = 未 buff 运行时值 × percent / 100。 */
      percent: number
    }

/** 伤亡脚本分支(台词有序 + 效果有序)。 */
export interface CasualtyBranch {
  lines: CasualtyLine[]
  effects: CasualtyEffect[]
}

/** 伤亡脚本(原版 OBJECT_PLAYER.scriptOnFriendDeath/scriptOnDying 结构化;无运行时代码特例)。 */
export interface CasualtyScript {
  /** 0x06 顺序概率门:依次掷 r∈[1,100],r ≥ chance 命中该分支(命中即停,不再掷后续门)。 */
  gates: { chance: number; branch: CasualtyBranch }[]
  /** 全部门未命中时的兜底分支。 */
  fallback: CasualtyBranch
}

/** 可战斗数据(可入队/可参战的角色带;普通 NPC 不带)。 */
export interface BattlerSpec {
  baseStats: {
    level: number
    hp: number
    maxHP: number
    mp: number
    maxMP: number
    attack: number
    defense: number
    magicAttack: number
    speed: number
    luck: number
  }
  initialEquipment: Record<string, string>
  initialMagic: string[]
  /** 合体技仙术 id(原版 player-roles cooperativeMagic;战斗「合击」用该角色专属合体技。
   *  发起者取此 id → 全 healthy 队员贡献 HP+攻/法力,合力一击。缺 = 该角色无合体技。 */
  cooperativeMagicSkillId?: string
  /** 守护关系(原版 player-roles rgwCoveredBy,**具名化**存 actor id 不存角色号):此角色
   *  濒死/失能被敌物攻且 7/17 掷中时,由该队友替挡(完全免伤;fight.c:4941-4968)。缺 = 无人护。 */
  coveredBy?: string
  /** 战斗伤亡脚本(原版 OBJECT_PLAYER.scriptOnFriendDeath/scriptOnDying;B11-1)。
   *  队友阵亡 → 死者 coveredBy 援护者跑 friendDeath(台词+临时增益);
   *  自己跌入濒死 → 守护者在队且健康时跑 dying(纯对白)。 */
  casualty?: { friendDeath?: CasualtyScript; dying?: CasualtyScript }
  /** 升级曲线槽位:expTable[i] = 从 level i 升 i+1 所需 exp。属性成长表迁移一阶段时定形。C0 不消费。 */
  leveling?: { expTable: number[] }
  /** 战斗精灵语义定义 id；二进制与动作 ABI 由 BattleSpriteDef 统一解析。 */
  battleSprite: string
  /** 战斗音效(七件套;演出层经 session opts 消费,不进战斗逻辑核)。 */
  sounds?: BattlerSounds
}

/**
 * 头像组(C1)= 一主 + 一组命名表情/形态。对话默认用 default;剧情按名字切表情
 * (愤怒/受伤/十年后…)。资源身份与物理路径由 catalog 解耦。
 */
export interface PortraitSet {
  /** 主头像(对话默认)。 */
  default: AssetId
  /** 命名表情/形态(名字 → 立绘 AssetId);可选。 */
  expressions?: Record<string, AssetId>
}

/** 统一角色定义:名字 / 头像组 / 大世界精灵 + 可选战斗数据。 */
export interface ActorDef {
  id: string
  name: TextId
  /** 大世界行走/站立精灵 → sprites 注册表 id。 */
  spriteId: string
  /** 头像立绘组(主 + 命名表情;C1)。 */
  portraits?: PortraitSet
  /** 战斗/菜单小头像；缺席表示该角色刻意无小头像。 */
  face?: AssetId
  /** 有 = 可入队/可参战(instantiate/buildWorld 消费)。 */
  battler?: BattlerSpec
}

/** 实体是否使用 ActorDef 作为可见外观/身份来源。 */
export function isActorEntity(e: EntityDef): e is EntityDef & { actor: string } {
  return 'actor' in e
}

/** 实体 → 精灵表 id(actor 来源经 actorsById 解析;sprite 来源直取;zone 无外观)。 */
export function resolveEntitySpriteId(
  e: EntityDef,
  actorsById: Record<string, ActorDef>,
): string | undefined {
  if (isActorEntity(e)) return actorsById[e.actor]?.spriteId
  return 'sprite' in e ? e.sprite : undefined // zone:无视觉
}
