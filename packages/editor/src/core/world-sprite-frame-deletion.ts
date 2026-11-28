import type { SpriteActionDef, SpriteDef } from '@type-pal/content'
import type { SpriteReplacementProof } from './sprite-commands.js'

export interface WorldSpriteFrameDeletionPlan {
  repairs: NonNullable<SpriteReplacementProof['repairs']>
  consumerSnapshots: NonNullable<SpriteReplacementProof['consumerSnapshots']>
  changes: string[]
}

/**
 * 删任意物理帧时精确重排所有绝对帧号。
 * directional 的四向等长前缀无法靠删单帧保持结构，必须先改布局。
 */
export function planWorldSpriteFrameDeletion(
  consumers: readonly SpriteDef[],
  deletedIndex: number,
  previousFrameCount: number,
): WorldSpriteFrameDeletionPlan {
  if (!Number.isInteger(deletedIndex) || deletedIndex < 0 || deletedIndex >= previousFrameCount)
    throw new Error('待删除的源帧不存在')
  if (previousFrameCount <= 1) throw new Error('源帧容器至少必须保留 1 帧')
  const nextFrameCount = previousFrameCount - 1
  const repairs: NonNullable<SpriteReplacementProof['repairs']> = {}
  const consumerSnapshots: NonNullable<SpriteReplacementProof['consumerSnapshots']> = {}
  const changes: string[] = []

  for (const consumer of consumers) {
    if (consumer.layout.kind === 'directional' && deletedIndex < consumer.layout.framesPerDir * 4)
      throw new Error(
        `帧 #${deletedIndex} 属于“${consumer.label}”的四向行走结构；单独删除会打乱方向分组，请先在布局中调整每向帧数。`,
      )
    consumerSnapshots[consumer.id] = {
      layout: structuredClone(consumer.layout),
      ...(consumer.poses ? { poses: structuredClone(consumer.poses) } : {}),
    }
    const layout: SpriteDef['layout'] =
      consumer.layout.kind === 'loop'
        ? {
            ...consumer.layout,
            frameCount:
              deletedIndex < consumer.layout.frameCount && consumer.layout.frameCount > 1
                ? Math.min(nextFrameCount, consumer.layout.frameCount - 1)
                : Math.min(nextFrameCount, consumer.layout.frameCount),
          }
        : structuredClone(consumer.layout)
    if (
      consumer.layout.kind === 'loop' &&
      layout.kind === 'loop' &&
      layout.frameCount !== consumer.layout.frameCount
    )
      changes.push(
        `${consumer.label}：循环 ${consumer.layout.frameCount} → ${layout.frameCount} 帧`,
      )

    const poses: Record<string, SpriteActionDef> = {}
    for (const [actionId, action] of Object.entries(consumer.poses ?? {})) {
      const retained = action.steps.flatMap((step, position) =>
        step.frame === deletedIndex
          ? []
          : [
              {
                position,
                step: {
                  ...step,
                  frame: step.frame > deletedIndex ? step.frame - 1 : step.frame,
                },
              },
            ],
      )
      if (retained.length) {
        let loopFrom: number | undefined
        if (action.loopFrom !== undefined) {
          const firstLoopStep = retained.findIndex((entry) => entry.position >= action.loopFrom!)
          if (firstLoopStep >= 0) loopFrom = firstLoopStep
        }
        const nextAction: SpriteActionDef = {
          ...action,
          steps: retained.map((entry) => entry.step),
        }
        if (loopFrom === undefined) delete nextAction.loopFrom
        else nextAction.loopFrom = loopFrom
        poses[actionId] = nextAction
        const previousFrames = action.steps.map((step) => step.frame)
        const nextFrames = retained.map((entry) => entry.step.frame)
        if (nextFrames.join(',') !== previousFrames.join(',') || loopFrom !== action.loopFrom)
          changes.push(
            `${consumer.label}·${action.label}：[${previousFrames.join(', ')}] → [${nextFrames.join(', ')}]${action.loopFrom !== undefined && loopFrom === undefined ? '；循环段已移除' : ''}`,
          )
      } else changes.push(`${consumer.label}·${action.label}：动作随唯一帧一起移除`)
    }
    repairs[consumer.id] = {
      layout,
      ...(Object.keys(poses).length ? { poses } : {}),
    }
  }
  return { repairs, consumerSnapshots, changes }
}
