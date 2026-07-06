/**
 * 统一角色定义(C0;设计 docs/phase2/foundation/actor-model-design.md)。
 *
 * ActorDef:NPC 与可入队角色**同一类型**(用户拍板)——名字/头像/精灵一处定义,处处引用。
 * 可战斗/可入队的多带 `battler` 块(普通村民 NPC 不带)。
 * 场景实体(EntityDef)引用 actor(角色实例)或直接引用 sprite(纯静物 prop),二选一。
 *
 * 与 content-schema §9「外观解耦」对齐:spriteId/battleSpriteNum = 基础造型层;
 * 装备驱动的外观覆盖 = 将来加字段(appearanceRules),纯加法。
 */
import type { EntityDef, TextId } from './index.js'

/**
 * 战斗音效七件套(原版 PlayerRoles rgw*Sound 全量;敌侧对应 EnemySounds)。
 * schema 一次定全(数据地基);演出侧按落地进度消费:attack/weapon/magic 已接
 * (出招/挥击/吟唱帧),critical 等暴击落地、cover/dying/death 等对应演出落地。
 */
export interface BattlerSounds {
  /** 普攻出招(rgwAttackSound,冲锋帧)。 */
  attack: number
  /** 暴击出招(rgwCriticalSound,替换 attack;暴击未实现,先存数据)。 */
  critical: number
  /** 兵器命中(rgwWeaponSound,挥击帧 frame9)。 */
  weapon: number
  /** 施法吟唱(rgwMagicSound,PreMagic 姿势帧 frame5)。 */
  magic: number
  /** 替挡/格挡(rgwCoverSound)。 */
  cover: number
  /** 濒死(rgwDyingSound)。 */
  dying: number
  /** 阵亡(rgwDeathSound)。 */
  death: number
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
  /** 升级曲线槽位:expTable[i] = 从 level i 升 i+1 所需 exp。属性成长表迁移一阶段时定形。C0 不消费。 */
  leveling?: { expTable: number[] }
  /** 战斗精灵号(F.MKF 系);战斗系统落地时启用。C0 不消费。 */
  battleSpriteNum?: number
  /** 战斗音效(七件套;演出层经 session opts 消费,不进战斗逻辑核)。 */
  sounds?: BattlerSounds
}

/**
 * 头像组(C1)= 一主 + 一组命名表情/形态。对话默认用 default;剧情按名字切表情
 * (愤怒/受伤/十年后…)。号 = RGM 立绘 chunk(引擎预烘 PNG)。
 */
export interface PortraitSet {
  /** 主头像(对话默认)。 */
  default: number
  /** 命名表情/形态(名字 → 立绘号);可选。 */
  expressions?: Record<string, number>
}

/** 统一角色定义:名字 / 头像组 / 大世界精灵 + 可选战斗数据。 */
export interface ActorDef {
  id: string
  name: TextId
  /** 大世界行走/站立精灵 → sprites 注册表 id。 */
  spriteId: string
  /** 头像立绘组(主 + 命名表情;C1)。 */
  portraits?: PortraitSet
  /** 有 = 可入队/可参战(instantiate/buildWorld 消费)。 */
  battler?: BattlerSpec
}

/** 实体是否为角色实例(actor 引用);false = 纯静物 prop(直接 sprite 引用)。 */
export function isActorEntity(e: EntityDef): e is EntityDef & { actor: string } {
  return 'actor' in e
}

/** 实体 → 精灵表 id(actor 实体经 actorsById 解析;prop 实体直取)。解析不到 undefined。 */
export function resolveEntitySpriteId(
  e: EntityDef,
  actorsById: Record<string, ActorDef>,
): string | undefined {
  if (isActorEntity(e)) return actorsById[e.actor]?.spriteId
  return 'sprite' in e ? e.sprite : undefined // zone:无视觉
}
