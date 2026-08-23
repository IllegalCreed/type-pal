import type {
  AuthorSceneDef,
  BaseSceneEntityDef,
  EntityDef,
  GridPos,
  ScriptStage,
  TriggerActivation,
} from '@type-pal/content'

export type EntityPlacementMode = 'actor' | 'sprite' | 'touch-zone' | 'interact-zone'

export type EntityPlacement =
  | { mode: 'actor'; actorId: string }
  | { mode: 'sprite'; spriteId: string }
  | { mode: 'touch-zone'; range: number }
  | { mode: 'interact-zone'; range: number }

export const DEFAULT_ZONE_RANGE = {
  touch: 0,
  interact: 1,
} as const

/** 当前作者页的实际触发半径；交互触发至少覆盖面对面的 1 格，与运行时 findTrigger 同义。 */
export function effectiveTriggerRange(activation: TriggerActivation | undefined): number {
  if (!activation) return 0
  return Math.max(activation.range ?? 0, activation.on === 'interact' ? 1 : 0)
}

/** 场景目录的紧凑触发摘要；范围展示实际生效值，避免显式 interact=0 误导作者。 */
export function triggerActivationSummary(activation: TriggerActivation | undefined): string {
  if (!activation) return '未启用'
  return `${activation.on === 'interact' ? '交互' : '触碰'} · ${effectiveTriggerRange(activation)} 格`
}

/** 只有当前页同时绑定触发行为与静态激活条件时，运行时才会投影可触发区域。 */
export function activePageTriggerActivation(
  page:
    | {
        trigger?: string
        triggerActivation?: TriggerActivation
      }
    | undefined,
): TriggerActivation | undefined {
  return page?.trigger ? page.triggerActivation : undefined
}

/** CreateScriptSourceCommand 与放置 zone 共用的合法空脚本起点。 */
export function createEmptyScriptStages(): ScriptStage[] {
  return [{ body: [] }]
}

function normalizeRange(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback
}

/** 四种作者放置模式统一收口为现有 EntityRef，不引入编辑器私有数据形状。 */
export function createPlacedEntity(
  id: string,
  pos: GridPos,
  placement: EntityPlacement,
): EntityDef {
  const base = { id, pos: structuredClone(pos) }
  if (placement.mode === 'actor') return { ...base, actor: placement.actorId }
  if (placement.mode === 'sprite') return { ...base, sprite: placement.spriteId }

  const on = placement.mode === 'touch-zone' ? 'touch' : 'interact'
  const fallback = DEFAULT_ZONE_RANGE[on]
  return {
    ...base,
    zone: true,
    pages: [
      {
        trigger: {
          on,
          range: normalizeRange(placement.range, fallback),
          stages: createEmptyScriptStages(),
        },
      },
    ],
  }
}

/**
 * 放置动作对应的 current canonical 实体。主会话保留即时渲染投影，脚本会话持有唯一作者页与行为真值；
 * 两者必须由 EditorHistoryCoordinator 成对提交，保存边界才能无损合并。
 */
export function createCanonicalPlacedEntity(
  id: string,
  pos: GridPos,
  placement: EntityPlacement,
): AuthorSceneDef['entities'][number] {
  const base = { id, pos: structuredClone(pos) }
  if (placement.mode === 'actor') return { ...base, actor: placement.actorId }
  if (placement.mode === 'sprite') return { ...base, sprite: placement.spriteId }

  const on = placement.mode === 'touch-zone' ? 'touch' : 'interact'
  const range = normalizeRange(placement.range, DEFAULT_ZONE_RANGE[on])
  return {
    ...base,
    zone: true,
    behaviors: {
      trigger: {
        default: {
          label: '默认触发行为',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'initial',
            stages: [{ id: 'initial', body: [] }],
          },
        },
      },
    },
    pages: [
      {
        id: 'default',
        label: '默认模式',
        trigger: 'default',
        triggerActivation: { on, range },
      },
    ],
    initialPage: 'default',
  }
}

/** 实体树展示作者来源；玩法职责仍不得从 actor/sprite/zone 推断。 */
export function entityShapeLabel(entity: EntityDef): '预制人物' | '自定义实体' | '触发区' {
  if ('actor' in entity) return '预制人物'
  return 'zone' in entity ? '触发区' : '自定义实体'
}
