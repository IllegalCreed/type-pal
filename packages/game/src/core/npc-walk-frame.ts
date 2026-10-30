/**
 * sdlpal PAL_NPCWalkOneStep 帧推进段(scene.c:880-902)真值:
 *   if (nSpriteFrames > 0)          wCurrentFrameNum = ++f % (nSpriteFrames==3 ? 4 : nSpriteFrames)
 *   else if (nSpriteFramesAuto > 0) wCurrentFrameNum = ++f % nSpriteFramesAuto
 *   else                            (不推帧、**不清零** — 预设姿势帧保留)
 *
 * nSpriteFramesAuto = 装载时回填的精灵总帧数(res.c:295-298,见 game-state hydrate)——
 * nSpriteFrames为0不等于静止：装载时会回填总帧数，供0x87/0x4C的非方向动画使用。
 *
 * M3/L4(2026-06-07 审查):nSpriteFrames∈{1,2} 按各自取模,不硬编码 %4。
 */
export function walkFrameMod(
  nextFrame: number,
  nSpriteFrames: number | undefined,
  nSpriteFramesAuto: number = 0,
): number {
  // undefined = 未 hydrate(测试 fixture / 旧路径)→ 退回标准 4 帧循环(多数 NPC nSpriteFrames=3 → mod 4)
  if (nSpriteFrames === undefined) return nextFrame % 4
  if (nSpriteFrames > 0) return nextFrame % (nSpriteFrames === 3 ? 4 : nSpriteFrames)
  if (nSpriteFramesAuto > 0) return nextFrame % nSpriteFramesAuto
  // 两者皆 0:C 不动 wCurrentFrameNum — 调用方传 nextFrame=cur+1,还原 cur(undefined 起步 clamp 0)
  return Math.max(0, nextFrame - 1)
}
