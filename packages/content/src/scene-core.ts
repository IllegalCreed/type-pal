import type {
  BaseAuthorCommand,
  BaseEntityBehaviors,
  BaseEntityPage,
  BaseSceneHooks,
} from './author-script-core.js'
import type { EntityBase, EntityRef, SceneDef } from './index.js'

/** JSON 仍以 number 表示；所有入口由 current scene validator 校验正安全整数。 */
export type PositiveSafeInt = number

export type HostileVictoryPolicy =
  | { kind: 'hide'; ticks: PositiveSafeInt }
  | { kind: 'remove' }
  | { kind: 'remain' }

export type HostilePlayerFleePolicy =
  | { kind: 'suspend'; ticks: PositiveSafeInt }
  | { kind: 'remain' }

/** 当前作者/运行态共用的 hostile 领域形状；不存在 respawnSeconds 兼容字段。 */
export interface BaseHostileBehavior {
  enemyTeamId: string
  battleFieldId?: number
  /** 有值时每个世界拍开始按严格小于此格数接敌。省略时沿用相邻接触。 */
  preStepEncounterRange?: number
  chase?: {
    range: number
    speed: number
    floating?: boolean
    /** 显式 world-step 每个合格世界拍按 speed / 8 格移动，感知距离严格小于 range。 */
    cadence?: 'world-step'
  }
  onLose?: 'gameOver' | BaseAuthorCommand[]
  onVictory: HostileVictoryPolicy
  onPlayerFlee: HostilePlayerFleePolicy
}

export interface BaseSceneEntity extends Omit<EntityBase, 'pages' | 'hostile'> {
  behaviors?: BaseEntityBehaviors
  pages?: BaseEntityPage[]
  initialPage?: string
  hostile?: BaseHostileBehavior
}

export type BaseSceneEntityDef = BaseSceneEntity & EntityRef

export interface BaseSceneDef extends Omit<SceneDef, 'entities' | 'onEnter' | 'onTeleport'> {
  entities: BaseSceneEntityDef[]
  hooks?: BaseSceneHooks
}
