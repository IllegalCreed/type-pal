import type { EntityBase, EntityRef, HostileBehavior, SceneDef } from './index.js'
import type {
  AuthorCommandV5,
  EntityBehaviorsV5,
  EntityPageV5,
  SceneHooksV5,
} from './script-v5.js'

export interface HostileBehaviorV5 extends Omit<HostileBehavior, 'onLose'> {
  onLose?: 'gameOver' | AuthorCommandV5[]
}

export interface EntityBaseV5 extends Omit<EntityBase, 'pages' | 'hostile'> {
  behaviors?: EntityBehaviorsV5
  pages?: EntityPageV5[]
  initialPage?: string
  hostile?: HostileBehaviorV5
}

export type EntityDefV5 = EntityBaseV5 & EntityRef

export interface SceneDefV5 extends Omit<SceneDef, 'entities' | 'onEnter' | 'onTeleport'> {
  entities: EntityDefV5[]
  hooks?: SceneHooksV5
}
