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
  /** 升级曲线槽位:expTable[i] = 从 level i 升 i+1 所需 exp。属性成长表迁移一阶段时定形。C0 不消费。 */
  leveling?: { expTable: number[] }
  /** 战斗精灵号(F.MKF 系);战斗系统落地时启用。C0 不消费。 */
  battleSpriteNum?: number
}

/** 统一角色定义:名字 / 头像 / 大世界精灵 + 可选战斗数据。 */
export interface ActorDef {
  id: string
  name: TextId
  /** 大世界行走/站立精灵 → sprites 注册表 id。 */
  spriteId: string
  /** 头像立绘号(现引擎预烘 PNG;搬工程资产 = 后续)。 */
  portrait?: number
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
  return isActorEntity(e) ? actorsById[e.actor]?.spriteId : e.sprite
}
