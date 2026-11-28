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

/** Missing orders follow explicit orders. The displayed index is never a persistent reference. */
export function sortedSpriteActions(sprite: SpriteDef | undefined): SortedSpriteAction[] {
  return Object.entries(sprite?.poses ?? {})
    .sort(
      ([leftId, left], [rightId, right]) =>
        (left.order ?? Number.POSITIVE_INFINITY) - (right.order ?? Number.POSITIVE_INFINITY) ||
        left.label.localeCompare(right.label) ||
        leftId.localeCompare(rightId),
    )
    .map(([id, action], index) => ({ id, action, index }))
}

/** 为同一用途定义生成稳定且空闲的预制动作 ID。 */
export function nextSpriteActionId(sprite: SpriteDef): string {
  const ids = new Set(Object.keys(sprite.poses ?? {}))
  if (!ids.has('action')) return 'action'
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `action-${suffix}`
    if (!ids.has(candidate)) return candidate
  }
}

export interface DefaultEntityActionTarget {
  sprite: SpriteDef
  action: SortedSpriteAction
}

/** 按实体的基准外观解析默认动作；绝不借用全项目第一个动作制造悬空组合。 */
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
