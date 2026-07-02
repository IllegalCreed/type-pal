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
 * - static/loop 布局无方向:C0 恒画 frame 0(loop 的自循环播放留后续小片)。
 */
import type { Facing, SpriteLayout } from '@type-pal/content'

/** 朝向 → 方向序号(格式约定,4 向固定序;非数据)。 */
export const FACING_TO_DIR: Record<Facing, number> = { down: 0, left: 1, up: 2, right: 3 }

/** 按每向帧数推导步序(暂不进数据;要自定义步序时再加字段,加法)。 */
export function deriveStepCycle(framesPerDir: number): number[] {
  if (framesPerDir === 3) return [0, 1, 0, 2]
  return Array.from({ length: Math.max(1, framesPerDir) }, (_, i) => i)
}

/** 站立帧下标:directional → dir*framesPerDir;static/loop → 0。 */
export function idleFrameIndex(layout: SpriteLayout, facing: Facing): number {
  if (layout.kind !== 'directional') return 0
  return FACING_TO_DIR[facing] * layout.framesPerDir
}

/** 行走帧下标:directional → dir*framesPerDir + stepCycle[step];非 directional 同站立。 */
export function walkFrameIndex(layout: SpriteLayout, facing: Facing, step: number): number {
  if (layout.kind !== 'directional') return 0
  const cycle = deriveStepCycle(layout.framesPerDir)
  const phase = cycle[((step % cycle.length) + cycle.length) % cycle.length] ?? 0
  return FACING_TO_DIR[facing] * layout.framesPerDir + phase
}
