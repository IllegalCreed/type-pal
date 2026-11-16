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

export type HostileVictoryTransition = 'direct' | 'fade'

export function checkOptionalHostileVictoryTransition(
  value: unknown,
  path: string,
): asserts value is HostileVictoryTransition | undefined {
  if (value !== undefined && value !== 'direct' && value !== 'fade')
    throw new Error(`${path}: 期望 direct|fade`)
}

export type HostilePlayerFleePolicy =
  | { kind: 'suspend'; ticks: PositiveSafeInt }
  | { kind: 'remain' }

/** 当前作者/运行态共用的 hostile 领域形状；不存在 respawnSeconds 兼容字段。 */
export interface BaseHostileBehavior {
  enemyTeamId: string
  battleFieldId?: number
  chase?: { range: number; speed: number; floating?: boolean }
  onLose?: 'gameOver' | BaseAuthorCommand[]
  onVictory: HostileVictoryPolicy
  /** 胜利后回场演出，省略时使用工程设定。 */
  victoryTransition?: HostileVictoryTransition
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
