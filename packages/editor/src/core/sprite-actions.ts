import {
  type ActorDef,
  type EntityDef,
  resolveEntitySpriteId,
  type SpriteActionDef,
  type SpriteDef,
} from '@type-pal/content'

export interface SortedSpriteAction {
  id: string
  action: SpriteActionDef
  /** 只供 UI 展示；稳定引用始终使用 id。 */
  index: number
}

/** 动作显示顺序的唯一编辑器实现；显示编号不得进入持久引用。 */
export function sortedSpriteActions(sprite: SpriteDef | undefined): SortedSpriteAction[] {
  return Object.entries(sprite?.poses ?? {})
    .sort(
      ([leftId, left], [rightId, right]) =>
        (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
        left.label.localeCompare(right.label) ||
        leftId.localeCompare(rightId),
    )
    .map(([id, action], index) => ({ id, action, index }))
}

export interface DefaultEntityActionTarget {
  sprite: SpriteDef
  action: SortedSpriteAction
}

/** 按实体的基准外观解析默认动作；绝不借用全工程第一个动作制造悬空组合。 */
export function defaultActionTargetForEntity(
  entity: EntityDef | undefined,
  actors: Readonly<Record<string, ActorDef>>,
  sprites: readonly SpriteDef[],
): DefaultEntityActionTarget | undefined {
  if (!entity) return undefined
  const spriteId = resolveEntitySpriteId(entity, actors)
  const sprite = sprites.find((entry) => entry.id === spriteId)
  const action = sortedSpriteActions(sprite)[0]
  return sprite && action ? { sprite, action } : undefined
}
