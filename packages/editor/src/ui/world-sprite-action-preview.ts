import type { SpriteDef } from '@type-pal/content'
import { deriveStepCycle, INDEXED_RLE_MAX_FRAME_SLOTS } from '@type-pal/reforge'
import type { SemanticFrameGroup, SemanticFrameRow } from './SpriteFrameWorkbench.js'

const DIRECTION_LABELS = ['下', '左', '上', '右'] as const

/** Missing orders follow explicit orders; stable action IDs break ties in the source workspace. */
export function orderedWorldSpriteActions(definition: SpriteDef) {
  return Object.entries(definition.poses ?? {}).sort(
    ([leftId, left], [rightId, right]) =>
      (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
      leftId.localeCompare(rightId),
  )
}

/** 大世界精灵资源库与引用预览共用的语义动作真值。 */
export function worldSpriteSemanticGroups(
  consumers: readonly SpriteDef[],
  actualFrameCount: number,
  activeDefinitionId?: string,
  activeActionId?: string,
): SemanticFrameGroup[] {
  return consumers.map((consumer) => {
    const rows: SemanticFrameRow[] = []
    if (consumer.layout.kind === 'directional') {
      const count = consumer.layout.framesPerDir
      for (let direction = 0; direction < 4; direction++) {
        const base = direction * count
        const previewCount =
          count * 4 > INDEXED_RLE_MAX_FRAME_SLOTS
            ? Math.min(count, Math.max(0, actualFrameCount - base))
            : count
        const frames = Array.from({ length: previewCount }, (_, index) => base + index)
        rows.push({
          id: `${consumer.id}:direction:${direction}`,
          label: `${DIRECTION_LABELS[direction]} · 行走`,
          frames,
          playbackFrames:
            count === 3 ? deriveStepCycle(count).map((index) => base + index) : frames,
          loopFrom: 0,
          frameMs: 100,
          note: `#${base} 为站立帧`,
        })
      }
    } else if (consumer.layout.kind === 'loop') {
      const declared = consumer.layout.frameCount
      const length = declared > INDEXED_RLE_MAX_FRAME_SLOTS ? actualFrameCount : declared
      const frames = Array.from({ length }, (_, index) => index)
      rows.push({
        id: `${consumer.id}:loop`,
        label: '自动循环',
        frames,
        playbackFrames: frames,
        loopFrom: 0,
        frameMs: Math.max(1, consumer.layout.ticksPerFrame ?? 1) * 250,
      })
    } else {
      rows.push({
        id: `${consumer.id}:static`,
        label: '默认显示',
        frames: [0],
        note: '默认使用 #0；场景脚本可切换到同一源容器中的其它帧',
      })
    }
    for (const [actionId, action] of orderedWorldSpriteActions(consumer)) {
      rows.push({
        id: `${consumer.id}:action:${actionId}`,
        label: action.label,
        actionId,
        active: consumer.id === activeDefinitionId && actionId === activeActionId,
        frames: action.steps.map((step) => step.frame),
        playbackSteps: action.steps.map((step) => ({
          frame: step.frame,
          holdMs: step.durationMs,
        })),
        loopFrom: action.loopFrom,
        note:
          action.loopFrom === undefined
            ? `单次动作 · ${action.steps.length} 步`
            : `循环动作 · 第 ${action.loopFrom + 1} 步开始循环`,
      })
    }
    return {
      id: consumer.id,
      label: consumer.label,
      typeLabel:
        consumer.layout.kind === 'directional'
          ? '四向'
          : consumer.layout.kind === 'loop'
            ? '自动循环'
            : '默认定格',
      active: consumer.id === activeDefinitionId,
      rows,
    }
  })
}
