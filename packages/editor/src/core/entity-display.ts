import type { ActorDef, EntityBase, Locale } from '@type-pal/content'
import { lookupText } from '@type-pal/content'

type NamedEntity = Pick<EntityBase, 'id' | 'label'> & { actor?: string }

/** 唯一作者显示解析：实例名称 > 关联人物名称 > 稳定ID；不从共享精灵推定身份。 */
export function entityDisplayName(
  entity: NamedEntity,
  actors: Readonly<Record<string, ActorDef>> = {},
  locale: Locale = {},
): string {
  if (entity.label) return entity.label
  const actor = entity.actor ? actors[entity.actor] : undefined
  return actor ? lookupText(actor.name, locale) : entity.id
}

/** 引用/选项/图例保留次要ID，避免同名实例混淆；选择值始终是entity.id。 */
export function entityDisplayLabel(
  entity: NamedEntity,
  actors: Readonly<Record<string, ActorDef>> = {},
  locale: Locale = {},
): string {
  const name = entityDisplayName(entity, actors, locale)
  return name === entity.id ? name : `${name} · ${entity.id}`
}
