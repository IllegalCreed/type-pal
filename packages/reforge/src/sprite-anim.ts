import type { Facing, SpriteLayout } from '@type-pal/content'

/** 朝向 → 方向序号(格式约定,4 向固定序;非数据)。 */
export const FACING_TO_DIR: Record<Facing, number> = { down: 0, left: 1, up: 2, right: 3 }

const THREE_FRAME_WALK_CYCLE = [0, 1, 0, 2] as const

/** 编辑器用步序生成预览帧。三帧点阵的站姿位于两个步相之间。 */
export function deriveStepCycle(framesPerDir: number): number[] {
  if (framesPerDir === 3) return [...THREE_FRAME_WALK_CYCLE]
  return Array.from({ length: Math.max(1, framesPerDir) }, (_, i) => i)
}

export interface WalkAnimationState {
  walking: boolean
  stepFrame: number
}

/** 声明布局只能产生候选下标；真正取帧必须以已解码帧数收口，历史布局债统一回退首帧。 */
export function actualFrameIndex(index: number, totalFrames?: number): number {
  if (totalFrames === undefined) return index
  if (!Number.isInteger(index) || index < 0 || index >= totalFrames) return 0
  return index
}

/** 剧情接管/停步：切回站立，并按 sdlpal scene.c:773-774 归整起步相位。 */
export function settleWalkAnimation(state: WalkAnimationState): WalkAnimationState {
  return { walking: false, stepFrame: (state.stepFrame & 2) ^ 2 }
}

/** 站立帧下标:directional → dir*framesPerDir;static/loop → 0。 */
export function idleFrameIndex(layout: SpriteLayout, facing: Facing, totalFrames?: number): number {
  if (layout.kind !== 'directional') return 0
  return actualFrameIndex(FACING_TO_DIR[facing] * layout.framesPerDir, totalFrames)
}

/** 环境动画依调用者时钟循环。可用长度同时受声明帧数与已解码帧数限制。 */
export function loopFrameIndex(
  layout: SpriteLayout,
  nowMs: number,
  totalFrames: number = layout.kind === 'loop' ? layout.frameCount : 1,
  msPerFrame = 250,
): number {
  if (layout.kind !== 'loop') return 0
  const n = Math.max(1, Math.min(layout.frameCount, totalFrames))
  return Math.floor(nowMs / msPerFrame) % n
}

/** 行走帧下标:directional → dir*framesPerDir + stepCycle[step];非 directional 同站立。 */
export function walkFrameIndex(
  layout: SpriteLayout,
  facing: Facing,
  step: number,
  totalFrames?: number,
): number {
  if (layout.kind !== 'directional') return 0
  const { framesPerDir } = layout
  const cycle = framesPerDir === 3 ? THREE_FRAME_WALK_CYCLE : undefined
  const cycleLength = cycle?.length ?? Math.max(1, Math.trunc(framesPerDir))
  // The sequential cycle is implicit. Imported declarations can far exceed decoded capacity.
  const offset = Number.isInteger(step) ? step % cycleLength : 0
  const index = offset < 0 ? offset + cycleLength : offset
  const phase = cycle ? (cycle[index] ?? 0) : index
  return actualFrameIndex(FACING_TO_DIR[facing] * framesPerDir + phase, totalFrames)
}

/**
 * 动画计数帧下标(animEntity 0x87 / 实体走位共用一个计数):
 * - directional → 同 walkFrameIndex(朝向组内步序循环);
 * - static → **整条帧带顺序平推** anim % 帧数(原版 0x87 语义 = wFrame++ 循环全帧,
 *   与方向组无关 —— 钓鱼老翁/跳绳小孩这类原地动画 NPC 的帧带就是动画本身)。
 *   ⚠ 帧带重标注后 static 布局曾只会落 walkFrameIndex→恒 0,全场原地动画冻结
 *   (2026-07-05 作者报「自动播放动画帧的精灵全变静态」),此函数即修复。
 * - loop 布局不经此函数(渲染端壁钟自循环优先,见 main.ts render)。
 */
export function animFrameIndex(
  layout: SpriteLayout,
  facing: Facing,
  anim: number,
  totalFrames: number,
): number {
  if (layout.kind === 'directional') return walkFrameIndex(layout, facing, anim, totalFrames)
  const n = Math.max(1, totalFrames)
  return ((anim % n) + n) % n
}
