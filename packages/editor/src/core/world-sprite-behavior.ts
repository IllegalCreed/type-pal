import { type ActorDef, resolveEntitySpriteId, type SpriteDef } from '@type-pal/content'
import type { EditorState } from './edit-session.js'
import type { ProjectReferenceEdge } from './project-reference.js'
import {
  DEFAULT_PREVIEW_HOLD_MS,
  previewAutomaticSpriteFrames,
  type SpriteAutomaticScriptPreview,
} from './sprite-script-frame-preview.js'
import type { SpritePreviewEntity } from './sprite-script-preview-projection.js'

export type {
  SpriteAutomaticScriptPreview,
  SpriteAutomaticScriptPreviewVariant,
  SpriteTimedFrame,
} from './sprite-script-frame-preview.js'
export {
  type CanonicalSpritePreviewState,
  projectCanonicalSharedScriptPreviewChunk,
  projectCanonicalSpritePreviewState,
  SCRIPT_PREVIEW_SHARED_CHUNK,
} from './sprite-script-preview-projection.js'

export interface SpriteReferenceBehavior {
  label: string
  detail: string
  kind: 'default' | 'directional' | 'layout-loop' | 'script' | 'reference'
  /** 只在能安全解释实例 auto 脚本时提供；随机路径不会伪装成唯一循环。 */
  preview?: SpriteAutomaticScriptPreview
}

/** 编辑器 UI 的实例行为位置；不是内容删除保护/保存门使用的持久引用边。 */
export interface SpriteAutomaticScriptInstanceSite {
  spriteId: string
  sceneId: string
  entityId: string
  site: string
  where: string
  via: 'direct' | 'actor'
}

function referencedSceneEntity(state: EditorState, reference: ProjectReferenceEdge) {
  const owner = reference.source.owner
  const sceneId =
    owner.kind === 'scene-entity' || owner.kind === 'scene-page' ? owner.sceneId : undefined
  const entityId =
    owner.kind === 'scene-entity' || owner.kind === 'scene-page' ? owner.entityId : undefined
  if (!sceneId || !entityId) return undefined
  return state.scenes
    .find((scene) => scene.id === sceneId)
    ?.entities.find((candidate) => candidate.id === entityId)
}

function actorsById(state: Pick<EditorState, 'actors'>): Record<string, ActorDef> {
  return Object.fromEntries(state.actors.map((actor) => [actor.id, actor] as const))
}

/** Automatic behavior selected for the initial page, with a navigable site for actor and sprite instances. */
export function collectAutomaticScriptSpriteInstanceSites(
  state: Pick<EditorState, 'actors' | 'scenes'>,
): SpriteAutomaticScriptInstanceSite[] {
  const actors = actorsById(state)
  const sites: SpriteAutomaticScriptInstanceSite[] = []
  state.scenes.forEach((scene, sceneIndex) => {
    scene.entities.forEach((entity, entityIndex) => {
      // EditorState 的壳层场景在当前投影前后可能短暂保留
      // `page.auto = behaviorId`。只有旧壳层 `{ stages }` 才能作为预览脚本读取。
      if ((entity.pages?.[0]?.auto?.stages?.length ?? 0) === 0) return
      const sprite = resolveEntitySpriteId(entity, actors)
      if (!sprite) return
      sites.push({
        spriteId: sprite,
        sceneId: scene.id,
        entityId: entity.id,
        where:
          'actor' in entity
            ? `scenes[${sceneIndex}].entities[${entityIndex}].actor(${entity.actor}) → actors.spriteId`
            : `scenes[${sceneIndex}].entities[${entityIndex}].sprite`,
        site: `scene:${scene.id}:entity:${entity.id}`,
        via: 'actor' in entity ? 'actor' : 'direct',
      })
    })
  })
  return sites
}

function describeAutomaticEntityBehavior(
  state: EditorState,
  entity: SpritePreviewEntity,
  definition: SpriteDef,
  actualFrameCount?: number,
): SpriteReferenceBehavior | undefined {
  const auto = entity.pages?.[0]?.auto
  if (!auto?.stages?.length) return undefined
  const preview = previewAutomaticSpriteFrames(state, entity, definition, actualFrameCount)
  if (preview?.kind === 'once')
    return {
      kind: 'script',
      label: '自动脚本一次执行',
      detail: `执行 ${preview.steps.map((step) => `#${step.frame}`).join(' → ')} 后完成，不循环`,
      preview,
    }
  if (preview?.kind === 'cycle') {
    const cycle = preview.cycle.map((step) => step.frame)
    const intro = preview.intro.map((step) => step.frame)
    const implicit = preview.mode === 'implicit'
    const timed = preview.cycle.some((step) => step.holdMs !== DEFAULT_PREVIEW_HOLD_MS)
    return {
      kind: 'script',
      label: implicit ? '自动脚本逐帧循环' : timed ? '自动脚本定时循环' : '自动脚本切帧',
      detail: implicit
        ? `animEntity 每次推进一帧，循环 ${cycle.map((frame) => `#${frame}`).join(' → ')}；实际速度以实例脚本为准`
        : intro.length
          ? `启动 ${intro.map((frame) => `#${frame}`).join(' → ')} 后循环 ${cycle.map((frame) => `#${frame}`).join(' → ')}；速度与分支以脚本为准`
          : `检测到 ${cycle.map((frame) => `#${frame}`).join(' → ')}；速度与分支以脚本为准`,
      preview,
    }
  }
  if (preview?.kind === 'variants')
    return {
      kind: 'script',
      label: preview.variants.length === 1 ? '自动脚本部分帧序' : '自动脚本随机切帧',
      detail:
        preview.variants.length === 1
          ? preview.note
          : `${preview.variants.length} 条可能路径；${preview.note}`,
      preview,
    }
  if (preview?.kind === 'unavailable')
    return {
      kind: 'script',
      label: '自动行为脚本',
      detail: preview.reason,
      preview,
    }
  return {
    kind: 'script',
    label: '自动行为脚本',
    detail: '移动、显隐或帧切换由这个场景实例的脚本决定',
    preview: {
      kind: 'unavailable',
      reason: '脚本含无法安全展开的控制流或副作用',
    },
  }
}

/**
 * 引用面板的实例行为摘要。这里只读取既有布局/场景脚本，不写入新的分类数据。
 * 无法证明具体帧序时保守显示“自动行为脚本”，不把源帧容器臆断成循环动画。
 */
export function describeSpriteReferenceBehavior(
  state: EditorState,
  reference: ProjectReferenceEdge,
  definition: SpriteDef,
  actualFrameCount?: number,
): SpriteReferenceBehavior {
  const entity = referencedSceneEntity(state, reference)
  if (entity) {
    const automatic = describeAutomaticEntityBehavior(state, entity, definition, actualFrameCount)
    if (automatic) return automatic
    if (definition.layout.kind === 'loop')
      return {
        kind: 'layout-loop',
        label: '用途自动循环',
        detail: `默认循环 #0–#${Math.max(0, definition.layout.frameCount - 1)}`,
      }
    if (definition.layout.kind === 'directional')
      return {
        kind: 'directional',
        label: '四向场景实例',
        detail: `初始朝向 ${entity.facing ?? 'down'}；移动时按四向帧带播放`,
      }
    return {
      kind: 'default',
      label: '默认定格',
      detail: '默认显示 #0；剧情脚本仍可临时切换同容器中的其它帧',
    }
  }
  if (reference.source.owner.kind === 'actor')
    return { kind: 'reference', label: '角色基础外观', detail: '角色实例通过此用途取得大世界外观' }
  if (
    reference.source.owner.kind === 'script-owner' ||
    reference.source.owner.kind === 'script-chunk' ||
    reference.source.owner.kind === 'shared-script'
  )
    return { kind: 'script', label: '剧情脚本引用', detail: '脚本可在运行时切换到此用途定义' }
  if (reference.source.owner.kind === 'runtime-world')
    return {
      kind: 'reference',
      label: '运行态外观',
      detail: reference.detail ?? '世界状态正在引用此用途定义',
    }
  return {
    kind: 'reference',
    label: '内容引用',
    detail: reference.detail ?? '由对应内容对象使用此用途定义',
  }
}
