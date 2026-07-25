import {
  type ActorDef,
  type AmbienceDef,
  type AssetCatalogV1,
  type BattleSpriteDef,
  type ItemData,
  type Locale,
  lookupText,
  type MapIndexV1,
  type ScriptIndexV1,
  type SkillData,
  type SpriteDef,
} from '@type-pal/content'

/**
 * 脚本参数中可直接落到一等 content 定义的稳定引用。
 *
 * 不含场景实体、敌队号、角色槽位等没有独立名称表的历史/实例引用；那些必须在 UI 中
 * 明说其来源，不能伪装成可搜索的“名称（ID）”。
 */
export type ScriptReferenceKind =
  | 'item'
  | 'skill'
  | 'actor'
  | 'sprite'
  | 'battleSprite'
  | 'ambience'
  | 'map'
  | 'asset'
  | 'authorScript'

export const SCRIPT_REFERENCE_KIND_LABEL: Readonly<Record<ScriptReferenceKind, string>> = {
  item: '物品',
  skill: '仙术',
  actor: '角色',
  sprite: '大世界精灵',
  battleSprite: '战斗精灵',
  ambience: '氛围',
  map: '地图',
  asset: '资源',
  authorScript: '作者脚本',
}

export interface ScriptReferenceCatalogInput {
  locale: Locale
  items: readonly ItemData[]
  skills: readonly SkillData[]
  actors: readonly ActorDef[]
  sprites: readonly SpriteDef[]
  battleSprites: readonly BattleSpriteDef[]
  ambiences: readonly AmbienceDef[]
  mapIndex: MapIndexV1
  assetCatalog: AssetCatalogV1
  scriptIndex?: ScriptIndexV1
  /** canonical v5 作者共享脚本；提供时替代 legacy ScriptIndexV1.library。 */
  authorScripts?: readonly ScriptReferenceChoice[]
}

/** 与 UI 搜索控件兼容的最小选择项；core 不依赖任何 UI 组件。 */
export interface ScriptReferenceChoice {
  id: string
  name: string
}

export interface ScriptReferenceCatalog {
  /** 可直接喂给名称/ID 搜索框的选项；永远不暴露未登记的迁移内部脚本。 */
  choices(kind: ScriptReferenceKind): readonly ScriptReferenceChoice[]
  /** 作者可读的稳定引用；悬空值必须醒目，不能退回只显示裸 ID。 */
  label(kind: ScriptReferenceKind, id: string): string
  /** 供调用点判断是否有一等定义，避免把缺失值当作可跳转目标。 */
  has(kind: ScriptReferenceKind, id: string): boolean
}

type NamedDefinition = { id: string; name: string }

function textName(textId: string, locale: Locale): string {
  return lookupText(textId, locale)
}

function orderedChoices(definitions: readonly NamedDefinition[]): ScriptReferenceChoice[] {
  const names = new Map<string, string>()
  for (const definition of definitions) {
    if (definition.id && definition.name.trim()) names.set(definition.id, definition.name.trim())
  }
  return [...names]
    .map(([id, name]) => ({ id, name }))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name, 'zh-CN') || left.id.localeCompare(right.id),
    )
}

/**
 * 统一脚本编辑中的“有名称的一等定义”解析。
 *
 * 这只是 UI 查询目录，不持有状态也不写 content：所有保存字段仍是原本的稳定 ID。
 */
export function createScriptReferenceCatalog(
  input: ScriptReferenceCatalogInput,
): ScriptReferenceCatalog {
  const source: Readonly<Record<ScriptReferenceKind, readonly ScriptReferenceChoice[]>> = {
    item: orderedChoices(input.items),
    skill: orderedChoices(input.skills),
    actor: orderedChoices(
      input.actors.map((actor) => ({ id: actor.id, name: textName(actor.name, input.locale) })),
    ),
    sprite: orderedChoices(input.sprites.map((sprite) => ({ id: sprite.id, name: sprite.label }))),
    battleSprite: orderedChoices(
      input.battleSprites.map((sprite) => ({ id: sprite.id, name: sprite.label })),
    ),
    ambience: orderedChoices(input.ambiences),
    map: orderedChoices(input.mapIndex.maps),
    asset: orderedChoices(
      Object.entries(input.assetCatalog.assets).map(([id, asset]) => ({
        id,
        // 资源无 label 时 path 是唯一的可读定位；绝不把 AssetId 伪装成名称。
        name: asset.label?.trim() || asset.path,
      })),
    ),
    // library 才是一等、作者可编辑的共享脚本目录；迁移/内部块不在这里泄漏为可选目标。
    authorScript: orderedChoices(
      input.authorScripts ??
        Object.entries(input.scriptIndex?.library ?? {}).map(([id, script]) => ({
          id,
          name: script.name,
        })),
    ),
  }
  const byKind = {} as Record<ScriptReferenceKind, ReadonlyMap<string, string>>
  for (const kind of Object.keys(source) as ScriptReferenceKind[])
    byKind[kind] = new Map(source[kind].map((choice) => [choice.id, choice.name]))

  return {
    choices: (kind) => source[kind],
    has: (kind, id) => byKind[kind].has(id),
    label: (kind, id) => {
      const name = byKind[kind].get(id)
      return name ? `${name}（${id}）` : `⚠ 未知${SCRIPT_REFERENCE_KIND_LABEL[kind]}（${id}）`
    },
  }
}
