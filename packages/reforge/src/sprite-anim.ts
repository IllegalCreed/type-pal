/**
 * 精灵帧下标计算(C0)—— 布局数据化,去 WALK_FRAMES/STEP_CYCLE 硬编码。
 * main.ts(游戏)/ editor SceneCanvas(画布)/ C1 角色模式走路预览 共用,单一真源。
 *
 * 语义源(考证,见 actor-model-design §1):
 * - 大世界通式 = dir * framesPerDir + frame(sdlpal scene.c:262-280 的 dir*nSpriteFrames+iFrame)。
 * - 站立 = 当前朝向第 0 帧(dir*framesPerDir),非独立 idle 片段。
 * - 3 帧行走步序 = [0,1,0,2](scene.c:663 iStepFrameLeader:站/迈左/站/迈右);
 *   4 帧 = [0,1,2,3](sdlpal walkFrames==4 分支,原版数据未用但为真实引擎路径);
 *   其余 n 退化为顺序循环 [0..n-1]。
 * - static 布局无方向恒画 frame 0;loop 布局按壁钟自循环(E5,火把/流水环境动画)。
 */
import type { Facing, SpriteLayout } from '@type-pal/content'

/** 朝向 → 方向序号(格式约定,4 向固定序;非数据)。 */
export const FACING_TO_DIR: Record<Facing, number> = { down: 0, left: 1, up: 2, right: 3 }

/** 按每向帧数推导步序(暂不进数据;要自定义步序时再加字段,加法)。 */
export function deriveStepCycle(framesPerDir: number): number[] {
  if (framesPerDir === 3) return [0, 1, 0, 2]
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

/**
 * loop 布局自循环帧(E5:火把/流水)。壁钟驱动(渲染每帧调,无状态);
 * 帧率暂不进数据(同 deriveStepCycle 哲学:要自定义时再加字段),250ms/帧。
 */
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
  const cycle = deriveStepCycle(layout.framesPerDir)
  const phase = cycle[((step % cycle.length) + cycle.length) % cycle.length] ?? 0
  return actualFrameIndex(FACING_TO_DIR[facing] * layout.framesPerDir + phase, totalFrames)
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
