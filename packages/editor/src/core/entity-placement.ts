import type { EntityDef, GridPos, ScriptStage } from '@type-pal/content'

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

/** 实体树只展示稳定表现形态；玩法职责不从资源 id 推断。 */
export function entityShapeLabel(entity: EntityDef): '精灵' | '触发区' {
  return 'zone' in entity ? '触发区' : '精灵'
}
